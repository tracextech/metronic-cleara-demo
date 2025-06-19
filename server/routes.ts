import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertUserSchema, insertSupplierSchema, insertDocumentSchema, insertTaskSchema, insertDeclarationSchema, insertSaqSchema, insertCustomerSchema, insertProductSchema, insertRoleSchema } from "@shared/schema";
import { db, pool } from "./db";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import MemoryStore from "memorystore";
import { hashPassword, comparePassword } from "./services/auth";
import { verifySupplierActivationToken, markTokenAsUsed } from "./utils/tokens";
import { createOTP, verifyOTP, sendOtpSchema, verifyOtpSchema } from "./utils/otp";
import axios from "axios";

// EU member states for automatic EU supplier detection
const EU_COUNTRIES = [
  "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czech Republic", "Czechia",
  "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary", 
  "Ireland", "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta", "Netherlands", 
  "Poland", "Portugal", "Romania", "Slovakia", "Slovenia", "Spain", "Sweden"
];

// Check if a country is in the EU
function isEUCountry(country: string): boolean {
  if (!country) return false;
  const normalizedCountry = country.toLowerCase().trim();
  return EU_COUNTRIES.some(euCountry => 
    euCountry.toLowerCase() === normalizedCountry || 
    normalizedCountry.includes(euCountry.toLowerCase())
  );
}

const SessionStore = MemoryStore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || "eudr-compliance-app-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' },
    store: new SessionStore({ checkPeriod: 86400000 }) // Cleanup expired sessions every 24h
  }));
  
  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Configure passport local strategy
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return done(null, false, { message: "Invalid username" });
      }
      
      // Verify password using secure hash comparison
      const passwordMatch = await comparePassword(password, user.password);
      if (!passwordMatch) {
        return done(null, false, { message: "Invalid password" });
      }
      
      // Remove password before sending to client
      const { password: _, ...userWithoutPassword } = user;
      return done(null, userWithoutPassword);
    } catch (error) {
      return done(error);
    }
  }));
  
  // Serialize user for session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });
  
  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      
      // Remove password before sending to client
      const { password: _, ...userWithoutPassword } = user;
      done(null, userWithoutPassword);
    } catch (error) {
      done(error);
    }
  });
  
  // Authentication middleware
  const isAuthenticated = (req: Request, res: Response, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };
  
  // Auth routes
  app.post("/api/auth/login", passport.authenticate("local"), (req, res) => {
    res.json(req.user);
  });
  
  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      res.json({ success: true });
    });
  });
  
  app.get("/api/auth/user", (req, res) => {
    if (req.user) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });
  
  // OTP - Send a one-time password to the phone number
  app.post("/api/auth/otp/send", async (req, res) => {
    try {
      // Validate phone number
      const parsedInput = sendOtpSchema.safeParse(req.body);
      if (!parsedInput.success) {
        return res.status(400).json({
          message: "Invalid input",
          errors: parsedInput.error.errors
        });
      }

      // Generate and store OTP
      const result = await createOTP(parsedInput.data.phoneNumber);
      
      if (!result.success) {
        return res.status(500).json({ message: result.error });
      }
      
      // In a production environment, this would send an SMS
      // For this demo, we'll return the OTP directly (only in dev/test)
      if (process.env.NODE_ENV !== 'production') {
        console.log(`OTP for ${parsedInput.data.phoneNumber}: ${result.code}`);
      }
      
      return res.status(200).json({ 
        message: "OTP sent successfully",
        phoneNumber: parsedInput.data.phoneNumber,
        // Only return the code in development mode
        code: process.env.NODE_ENV !== 'production' ? result.code : undefined
      });
    } catch (error) {
      console.error("OTP send error:", error);
      res.status(500).json({ message: "Failed to send OTP" });
    }
  });
  
  // OTP - Verify a one-time password
  app.post("/api/auth/otp/verify", async (req, res) => {
    try {
      // Validate input
      const parsedInput = verifyOtpSchema.safeParse(req.body);
      if (!parsedInput.success) {
        return res.status(400).json({
          message: "Invalid input",
          errors: parsedInput.error.errors
        });
      }
      
      // Verify the OTP
      const result = await verifyOTP(parsedInput.data.phoneNumber, parsedInput.data.code);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      return res.status(200).json({ 
        message: "Phone number verified successfully",
        verified: true
      });
    } catch (error) {
      console.error("OTP verification error:", error);
      res.status(500).json({ message: "Failed to verify OTP" });
    }
  });
  
  app.post("/api/auth/register", async (req, res) => {
    try {
      // Extend the user schema with additional registration fields
      const registrationSchema = insertUserSchema.extend({
        companyName: z.string().optional(),
        industry: z.string().optional(),
        complianceFocus: z.array(z.string()).optional()
      });
      
      const userInput = registrationSchema.parse(req.body);
      
      // Extract the extended fields that don't belong to the user schema
      const { companyName, industry, complianceFocus, ...userDataOnly } = userInput;
      
      // Check if username already exists
      const existingUsername = await storage.getUserByUsername(userDataOnly.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }
      
      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(userDataOnly.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }
      
      // Hash the password
      const hashedPassword = await hashPassword(userDataOnly.password);
      
      // Create user with hashed password
      const newUser = await storage.createUser({
        ...userDataOnly,
        password: hashedPassword
      });
      
      // Create corresponding entity for Platform Admin to manage
      const companyNameToUse = companyName || `${userDataOnly.fullName || userDataOnly.username}'s Company`;
      const entity = await storage.createEntity({
        name: companyNameToUse,
        email: userDataOnly.email,
        phone: '',
        website: '',
        country: '',
        address: '',
        registrationNumber: '',
        taxId: '',
        status: 'freeTrial', // Set initial status to free trial
        registrationStatus: 'approved', // Auto-approve self-registrations
      });
      
      // Create default trial modules for this entity (all enabled)
      await storage.updateEntityModules(entity.id, {
        supplierOnboarding: true,
        customerOnboarding: true,
        eudrDeclaration: true,
        supplierAssessment: true
      });
      
      // Create activity record
      await storage.createActivity({
        type: "registration",
        description: `New self-registration: ${companyNameToUse}`,
        userId: 1, // Admin user ID
        entityId: entity.id,
        entityType: "entity"
      });
      
      // Remove password before sending response
      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json({
        ...userWithoutPassword,
        companyName,
        industry,
        complianceFocus
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  });
  
  // Supplier Activation Routes
  app.get("/api/supplier-activation/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({ 
          valid: false,
          message: "Token is required" 
        });
      }
      
      // Verify token
      const verificationResult = await verifySupplierActivationToken(token);
      
      if (!verificationResult.valid) {
        return res.status(400).json({
          valid: false,
          message: verificationResult.message || "Invalid token"
        });
      }
      
      // Return only necessary supplier info and token status
      const { supplier } = verificationResult;
      
      res.json({
        valid: true,
        supplier: {
          id: supplier.id,
          name: supplier.name,
          email: supplier.email,
          firstName: supplier.firstName,
          lastName: supplier.lastName
        },
        token: verificationResult.tokenData.id
      });
    } catch (error) {
      console.error("Error verifying activation token:", error);
      res.status(500).json({ 
        valid: false,
        message: "Server error while verifying token" 
      });
    }
  });
  
  app.post("/api/supplier-activation/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { password, confirmPassword } = req.body;
      
      // Basic validation
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }
      
      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }
      
      if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
      }
      
      // Verify token
      const verificationResult = await verifySupplierActivationToken(token);
      
      if (!verificationResult.valid) {
        return res.status(400).json({ message: verificationResult.message || "Invalid token" });
      }
      
      const { tokenData, supplier } = verificationResult;
      
      // Generate a username based on email or name
      const username = tokenData.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Check if username already exists and append numbers if needed
      let finalUsername = username;
      let counter = 1;
      let existingUser = await storage.getUserByUsername(finalUsername);
      
      while (existingUser) {
        finalUsername = `${username}${counter}`;
        counter++;
        existingUser = await storage.getUserByUsername(finalUsername);
      }
      
      // Create a new user for the supplier contact
      const hashedPassword = await hashPassword(password);
      
      const newUser = await storage.createUser({
        username: finalUsername,
        password: hashedPassword,
        email: tokenData.email,
        fullName: tokenData.firstName && tokenData.lastName 
          ? `${tokenData.firstName} ${tokenData.lastName}` 
          : null,
        role: "user"
      });
      
      // Mark token as used
      await markTokenAsUsed(tokenData.id);
      
      // Create activity record
      await storage.createActivity({
        type: "supplier",
        description: `Supplier contact activated for ${supplier.name}`,
        userId: newUser.id,
        entityType: "supplier",
        entityId: supplier.id
      });
      
      // Remove password before sending response
      const { password: _, ...userWithoutPassword } = newUser;
      
      // Auto-login the user by establishing a session
      req.login(userWithoutPassword, (err) => {
        if (err) {
          console.error("Error logging in after activation:", err);
          return res.status(500).json({ message: "Error during automatic login" });
        }
        
        res.status(201).json({
          message: "Account activated successfully",
          user: userWithoutPassword
        });
      });
    } catch (error) {
      console.error("Error activating supplier account:", error);
      res.status(500).json({ message: "Server error during activation" });
    }
  });
  
  // Dashboard data routes
  app.get("/api/dashboard", async (req, res) => {
    try {
      console.log("Fetching dashboard data...");
      
      // Fetch each piece of data separately to isolate any issues
      let currentMetrics, riskCategories, recentActivities, upcomingTasks, suppliers;
      
      try {
        currentMetrics = await storage.getCurrentComplianceMetrics();
        console.log("Current metrics:", currentMetrics ? "found" : "not found");
      } catch (e) {
        console.error("Error fetching metrics:", e);
        currentMetrics = null;
      }
      
      try {
        riskCategories = await storage.listRiskCategories();
        console.log("Risk categories:", riskCategories?.length || 0);
      } catch (e) {
        console.error("Error fetching risk categories:", e);
        riskCategories = [];
      }
      
      try {
        recentActivities = await storage.listRecentActivities(4);
        console.log("Recent activities:", recentActivities?.length || 0);
      } catch (e) {
        console.error("Error fetching activities:", e);
        recentActivities = [];
      }
      
      try {
        upcomingTasks = await storage.listUpcomingTasks(4);
        console.log("Upcoming tasks:", upcomingTasks?.length || 0);
      } catch (e) {
        console.error("Error fetching tasks:", e);
        upcomingTasks = [];
      }
      
      try {
        suppliers = await storage.listSuppliers();
        console.log("Suppliers:", suppliers?.length || 0);
      } catch (e) {
        console.error("Error fetching suppliers:", e);
        suppliers = [];
      }
      
      // Construct response object with fallbacks for any missing data
      const responseData = {
        metrics: currentMetrics || {
          overallCompliance: 75,
          documentStatus: 80,
          supplierCompliance: 70,
          riskLevel: "Medium",
          issuesDetected: 12,
          date: new Date()
        },
        riskCategories: riskCategories || [],
        recentActivities: recentActivities || [],
        upcomingTasks: upcomingTasks || [],
        suppliers: (suppliers || []).slice(0, 4) // Limit to 4 suppliers for dashboard
      };
      
      console.log("Dashboard data prepared successfully");
      res.json(responseData);
    } catch (error) {
      console.error("Error in dashboard endpoint:", error);
      res.status(500).json({ message: "Error fetching dashboard data" });
    }
  });
  
  // Compliance history data for chart
  app.get("/api/compliance/history", async (req, res) => {
    try {
      const months = parseInt(req.query.months as string) || 6;
      const history = await storage.getComplianceHistory(months);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Error fetching compliance history" });
    }
  });
  
  // Supplier routes
  app.get("/api/suppliers", async (req, res) => {
    try {
      const suppliers = await storage.listSuppliers();
      res.json(suppliers);
    } catch (error) {
      res.status(500).json({ message: "Error fetching suppliers" });
    }
  });
  
  app.get("/api/suppliers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const supplier = await storage.getSupplier(id);
      
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      
      res.json(supplier);
    } catch (error) {
      res.status(500).json({ message: "Error fetching supplier" });
    }
  });
  
  app.get("/api/suppliers/stats", async (req, res) => {
    try {
      // Count suppliers by status
      const suppliers = await storage.listSuppliers();
      const total = suppliers.length;
      const active = suppliers.filter(s => s.status === 'active').length;
      const inactive = suppliers.filter(s => s.status === 'inactive').length;
      const pending = suppliers.filter(s => s.status === 'pending').length;
      
      res.json({
        total,
        active,
        inactive,
        pending
      });
    } catch (error) {
      console.error("Error fetching supplier stats:", error);
      res.status(500).json({ message: "Error fetching supplier statistics" });
    }
  });
  
  app.patch("/api/suppliers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const supplierInput = insertSupplierSchema.partial().parse(req.body);
      
      const supplier = await storage.getSupplier(id);
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      
      const updatedSupplier = await storage.updateSupplier(id, supplierInput);
      
      // Create activity record
      await storage.createActivity({
        type: "supplier",
        description: `Supplier ${supplier.name} was updated`,
        userId: 1, // Would use req.user.id in a real app
        entityType: "supplier",
        entityId: id,
        metadata: null
      });
      
      res.json(updatedSupplier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        console.error("Error updating supplier:", error);
        res.status(500).json({ message: "Error updating supplier" });
      }
    }
  });
  
  app.post("/api/suppliers", async (req, res) => {
    try {
      console.log("Creating supplier with data:", req.body);
      
      // Manually construct the supplier object with the fields we need
      const supplierInput: any = {
        name: req.body.name,
        partnerType: req.body.partnerType || "supplier",
        partnerRole: req.body.partnerRole || "supplier",
        partnerRoleName: req.body.partnerRoleName || "supplier",
        country: req.body.country,
        email: req.body.email,
        status: req.body.status || "pending",
      };
      
      // Handle special fields specifically for the simplified form
      if (req.body.contactName) {
        supplierInput.contactName = req.body.contactName;
      }
      
      if (req.body.phoneNumber) {
        supplierInput.phoneNumber = req.body.phoneNumber;
      }
      
      if (req.body.businessRegistration) {
        supplierInput.businessRegistration = req.body.businessRegistration;
      }
      
      if (req.body.businessAddress) {
        supplierInput.businessAddress = req.body.businessAddress;
        supplierInput.addressLine1 = req.body.businessAddress; // For compatibility
      }
      
      console.log("Processed supplier input:", supplierInput);
      
      // Create the supplier using direct DB insert to avoid schema validation issues
      const [supplier] = await db.insert(schema.suppliers).values(supplierInput).returning();
      
      // Create activity record
      await storage.createActivity({
        type: "supplier",
        description: `New supplier ${supplier.name} was added`,
        userId: 1, // Mock user ID
        entityType: "supplier",
        entityId: supplier.id,
        metadata: null
      });
      
      // If email is provided, send activation link
      if (supplier.email) {
        try {
          const { createSupplierActivationToken } = await import('./utils/tokens');
          const { sendEmail, generateSupplierActivationEmail } = await import('./utils/email');
          
          console.log(`Creating activation token for supplier ${supplier.name} (${supplier.email})`);
          
          // Generate and store activation token
          const token = await createSupplierActivationToken(
            supplier.id,
            supplier.email,
            supplier.firstName || undefined,
            supplier.lastName || undefined
          );
          
          console.log(`Token created: ${token.substring(0, 6)}...`);
          
          // Generate activation link
          const baseUrl = `${req.protocol}://${req.get('host')}`;
          const activationLink = `${baseUrl}/activate-supplier/${token}`;
          
          // Create email content
          const contactName = supplier.firstName 
            ? `${supplier.firstName} ${supplier.lastName || ''}`
            : 'Supplier Contact';
          
          const emailContent = generateSupplierActivationEmail(
            supplier.name,
            contactName,
            activationLink
          );
          
          console.log(`Preparing to send email for supplier ${supplier.name}`);
          
          // Add a delay before sending email (to prevent rate limiting)
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Send activation email
          const emailResult = await sendEmail({
            to: supplier.email,
            from: {
              email: 'app.testing@tracextech.com', // Using a verified sender in SendGrid
              name: 'EUDR Compliance Platform'
            },
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text
          });
          
          if (emailResult) {
            console.log(`Activation email sent to ${supplier.email} for supplier ${supplier.name}`);
          } else {
            console.error(`Failed to send activation email for supplier ${supplier.name} to ${supplier.email}`);
          }
        } catch (emailError) {
          console.error('Failed to send activation email:', emailError);
          console.error('Error details:', emailError);
          // Continue with the response, don't fail the request if email fails
        }
      }
      
      res.status(201).json(supplier);
    } catch (error) {
      console.error("Detailed error creating supplier:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        res.status(500).json({ message: "Error creating supplier", details: error.message });
      }
    }
  });
  
  // Bulk upload suppliers
  app.post("/api/suppliers/bulk", async (req, res) => {
    try {
      // In a real application, this would process the uploaded file
      // For demo, we'll add a few suppliers randomly
      const randomSuppliers = [
        {
          name: "Global Timber Co.",
          email: "contact@globaltimber.com",
          phone: "+1 555-123-4567",
          country: "Canada",
          city: "Vancouver",
          status: "active",
          industry: "Timber",
          products: "Wood, Pulp",
          certifications: ["FSC", "PEFC"]
        },
        {
          name: "EcoRubber Solutions",
          email: "info@ecorubber.com",
          phone: "+60 3-1234-5678",
          country: "Malaysia",
          city: "Kuala Lumpur",
          status: "active",
          industry: "Agriculture",
          products: "Rubber Wood, Sustainable Rubber",
          certifications: ["EUDR"]
        },
        {
          name: "AsiaRubber Plantations",
          email: "support@asiarubber.com",
          phone: "+66 2-345-6789",
          country: "Thailand",
          city: "Bangkok", 
          status: "active",
          industry: "Agriculture",
          products: "Natural Rubber, Latex",
          certifications: ["ISO 14001"]
        }
      ];
      
      const suppliers = [];
      
      for (const supplierData of randomSuppliers) {
        const supplier = await storage.createSupplier({
          name: supplierData.name,
          email: supplierData.email,
          mobileNumber: supplierData.phone,
          country: supplierData.country,
          city: supplierData.city,
          postalCode: null,
          address: null,
          website: null,
          notes: null,
          products: supplierData.products,
          status: supplierData.status
        });
        
        suppliers.push(supplier);
        
        // Create activity for each supplier
        await storage.createActivity({
          type: "supplier",
          description: `New supplier ${supplier.name} was added via bulk upload`,
          userId: 1, // Mock user ID
          entityType: "supplier",
          entityId: supplier.id,
          metadata: null
        });
      }
      
      res.status(201).json({ 
        success: true, 
        message: `${suppliers.length} suppliers imported successfully`,
        suppliers
      });
    } catch (error) {
      console.error("Error in bulk upload:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error processing bulk upload" 
      });
    }
  });
  
  // Invite suppliers
  app.post("/api/suppliers/invite", async (req, res) => {
    try {
      const { emails, message } = req.body;
      
      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: "No email addresses provided" 
        });
      }
      
      // In a real application, this would send invitation emails
      // For demo, we'll just log the emails and return success
      console.log(`Sending invitations to ${emails.length} suppliers`);
      console.log(`Custom message: ${message || 'None'}`);
      
      // Add activity for the invitation
      await storage.createActivity({
        type: "invitation",
        description: `Sent invitations to ${emails.length} suppliers`,
        userId: 1, // Mock user ID
        entityType: "supplier",
        entityId: null,
        metadata: { emailCount: emails.length }
      });
      
      res.status(200).json({ 
        success: true, 
        message: `Invitations sent to ${emails.length} suppliers`,
        emails
      });
    } catch (error) {
      console.error("Error sending invitations:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error sending invitations" 
      });
    }
  });
  
  app.put("/api/suppliers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const supplierInput = insertSupplierSchema.partial().parse(req.body);
      
      const updatedSupplier = await storage.updateSupplier(id, supplierInput);
      
      if (!updatedSupplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      
      // Create activity record
      await storage.createActivity({
        type: "supplier",
        description: `Supplier ${updatedSupplier.name} was updated`,
        userId: 1, // Mock user ID
        entityType: "supplier",
        entityId: updatedSupplier.id,
        metadata: null
      });
      
      res.json(updatedSupplier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        res.status(500).json({ message: "Error updating supplier" });
      }
    }
  });
  
  // Document routes
  app.get("/api/documents", async (req, res) => {
    try {
      const documents = await storage.listDocuments();
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Error fetching documents" });
    }
  });
  
  app.get("/api/suppliers/:id/documents", async (req, res) => {
    try {
      const supplierId = parseInt(req.params.id);
      const documents = await storage.listDocumentsBySupplier(supplierId);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Error fetching supplier documents" });
    }
  });
  
  app.post("/api/documents", async (req, res) => {
    try {
      const documentInput = insertDocumentSchema.parse(req.body);
      
      // Set uploaded by to mock user
      documentInput.uploadedBy = 1;
      
      const document = await storage.createDocument(documentInput);
      
      // Create activity record
      await storage.createActivity({
        type: "document",
        description: `Document ${document.title} was uploaded`,
        userId: 1, // Mock user ID
        entityType: "document",
        entityId: document.id,
        metadata: null
      });
      
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        res.status(500).json({ message: "Error creating document" });
      }
    }
  });
  
  // Task routes
  app.get("/api/tasks", async (req, res) => {
    try {
      const userId = 1; // Mock user ID
      const tasks = await storage.listTasksByAssignee(userId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Error fetching tasks" });
    }
  });
  
  app.post("/api/tasks", async (req, res) => {
    try {
      const taskInput = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(taskInput);
      
      // Create activity record
      await storage.createActivity({
        type: "task",
        description: `New task "${task.title}" was created`,
        userId: 1, // Mock user ID
        entityType: "task",
        entityId: task.id,
        metadata: null
      });
      
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        res.status(500).json({ message: "Error creating task" });
      }
    }
  });
  
  app.put("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const taskInput = insertTaskSchema.partial().extend({
        completed: z.boolean().optional()
      }).parse(req.body);
      
      const updatedTask = await storage.updateTask(id, taskInput);
      
      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Create activity for task completion
      if (taskInput.completed && updatedTask.completed) {
        await storage.createActivity({
          type: "task",
          description: `Task "${updatedTask.title}" was completed`,
          userId: 1, // Mock user ID
          entityType: "task",
          entityId: updatedTask.id,
          metadata: null
        });
      }
      
      res.json(updatedTask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        res.status(500).json({ message: "Error updating task" });
      }
    }
  });
  
  // Activities routes
  app.get("/api/activities", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const activities = await storage.listRecentActivities(limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Error fetching activities" });
    }
  });
  
  // Declaration routes
  app.get("/api/declarations/stats", async (req, res) => {
    try {
      const stats = await storage.getDeclarationStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Error fetching declaration statistics" });
    }
  });
  
  app.get("/api/declarations", async (req, res) => {
    try {
      const type = req.query.type as string || "all"; // "inbound", "outbound", "eu_filed" or "all"
      console.log("Fetching declarations with type:", type);
      
      const declarations = await storage.listDeclarations(type);
      
      // Load all suppliers to get their names
      const suppliers = await storage.listSuppliers();
      
      // Load all customers to get their names
      const customers = await storage.listCustomers();
      
      // Create a map of supplier IDs to supplier names for quick lookup
      const supplierMap = new Map();
      suppliers.forEach(supplier => {
        supplierMap.set(supplier.id, supplier.name);
      });
      
      // Create a map of customer IDs to customer names for quick lookup
      const customerMap = new Map();
      customers.forEach(customer => {
        const displayName = customer.displayName || 
                           (customer.companyName || `${customer.firstName} ${customer.lastName}`);
        customerMap.set(customer.id, displayName);
      });
      
      // Add appropriate partner names to declarations based on type
      const enhancedDeclarations = declarations.map(declaration => {
        if (declaration.type === "inbound") {
          return {
            ...declaration,
            supplier: supplierMap.get(declaration.supplierId) || `Supplier ${declaration.supplierId}`,
            partnerName: supplierMap.get(declaration.supplierId) || `Supplier ${declaration.supplierId}`,
            partnerType: "supplier"
          };
        } else if (declaration.type === "eu_filed") {
          // For EU filed declarations, include both the original declaration reference
          // and any EU specific fields
          const referencedDeclaration = declaration.declarationId ? 
            declarations.find(d => d.id === declaration.declarationId) : null;
          
          return {
            ...declaration,
            // Include the original declaration data if available
            originalSupplier: referencedDeclaration ? 
              (supplierMap.get(referencedDeclaration.supplierId) || `Supplier ${referencedDeclaration.supplierId}`) : 
              null,
            // Add EU specific fields
            eudrReference: declaration.eudrReference || `EUDR-${declaration.id}`,
            verificationReference: declaration.verificationReference || `VER-${declaration.id}`,
            inspectionReference: declaration.inspectionReference || `REF-${declaration.id}`,
            // By default, use traderName from form submission
            partnerName: declaration.traderName || "EU Trade Operator",
            partnerType: "eu_operator"
          };
        } else {
          // For outbound declarations, use customer name
          const customerId = declaration.customerId || (declaration.id % 4 + 1); // Fallback for existing data
          return {
            ...declaration,
            supplier: supplierMap.get(declaration.supplierId) || `Supplier ${declaration.supplierId}`,
            customer: customerMap.get(customerId) || `Customer ${customerId}`,
            partnerName: customerMap.get(customerId) || `Customer ${customerId}`,
            partnerType: "customer",
            customerId: customerId
          };
        }
      });
      
      res.json(enhancedDeclarations);
    } catch (error) {
      console.error("Error fetching declarations:", error);
      res.status(500).json({ message: "Error fetching declarations" });
    }
  });

  app.get("/api/declarations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const declaration = await storage.getDeclaration(id);
      
      if (!declaration) {
        return res.status(404).json({ message: "Declaration not found" });
      }
      
      if (declaration.type === "inbound") {
        // Get supplier information for inbound declarations
        const supplier = await storage.getSupplier(declaration.supplierId);
        
        // Add supplier name to declaration
        const declarationWithSupplier = {
          ...declaration,
          supplier: supplier ? supplier.name : `Supplier ${declaration.supplierId}`,
          partnerName: supplier ? supplier.name : `Supplier ${declaration.supplierId}`,
          partnerType: "supplier"
        };
        
        return res.json(declarationWithSupplier);
      } else {
        // For outbound declarations, get customer information
        const customerId = declaration.customerId || (declaration.id % 4 + 1); // Fallback for existing data
        const customer = await storage.getCustomer(customerId);
        
        const customerName = customer ? 
          (customer.displayName || customer.companyName || `${customer.firstName} ${customer.lastName}`) : 
          `Customer ${customerId}`;

        // Get supplier information too for completeness
        const supplier = await storage.getSupplier(declaration.supplierId);
        const supplierName = supplier ? supplier.name : `Supplier ${declaration.supplierId}`;
        
        // Add customer name to declaration
        const enhancedDeclaration = {
          ...declaration,
          supplier: supplierName,
          customer: customerName,
          partnerName: customerName, // Using partnerName field for consistent UI
          partnerType: "customer",
          customerPONumber: declaration.id % 2 === 0 ? `PO-${10000 + declaration.id}` : null,
          soNumber: declaration.id % 2 === 0 ? `SO-${20000 + declaration.id}` : null,
          shipmentNumber: declaration.id % 2 === 0 ? `SHM-${30000 + declaration.id}` : null,
          customerId: customerId,
          documents: [
            "Compliance Certificate.pdf",
            "Origin Documentation.pdf",
            declaration.id % 2 === 0 ? "Shipment Manifest.pdf" : null
          ].filter(Boolean),
          hasGeoJSON: !!declaration.geojsonData
        };
        
        return res.json(enhancedDeclaration);
      }
    } catch (error) {
      console.error("Error fetching declaration:", error);
      res.status(500).json({ message: "Error fetching declaration" });
    }
  });

  app.post("/api/declarations", async (req, res) => {
    try {
      // Log the incoming request for debugging
      console.log("Declaration submission payload:", JSON.stringify(req.body, null, 2));
      
      // Handle EU filed declarations differently
      if (req.body.type === "eu_filed") {
        const sanitizedBody: any = {
          type: "eu_filed",
          supplierId: req.body.supplierId ? Number(req.body.supplierId) : 1,
          productName: req.body.products && req.body.products.length > 0 
            ? req.body.products.map((p: any) => p.name).join(", ")
            : "EU Filed Declaration",
          status: String(req.body.status || "pending"),
          riskLevel: "low", // Default risk level for EU filed declarations
          // Store the EU specific fields as additional data
          eudrReference: req.body.eudrReference,
          verificationReference: req.body.verificationReference,
          inspectionReference: req.body.inspectionReference,
          traderName: req.body.traderName,
          traderCountry: req.body.traderCountry,
          vatCode: req.body.vatCode,
          countryOfActivity: req.body.countryOfActivity,
          countryOfEntry: req.body.countryOfEntry,
          additionalInfo: req.body.additionalInfo,
          declarationId: req.body.declarationId ? Number(req.body.declarationId) : undefined,
          activityType: req.body.activityType,
          reference: req.body.reference,
          submittedBy: req.body.submittedBy || "Current User",
          submittedAt: req.body.submittedAt || new Date().toISOString(),
          createdBy: 1, // Always set this to 1 for consistency
        };
        
        console.log("Creating EU filed declaration:", sanitizedBody);
        
        // Create the declaration directly since it has special fields beyond the schema
        const declaration = await storage.createDeclaration(sanitizedBody);
        
        // Create activity record
        await storage.createActivity({
          type: "declaration",
          description: `New EU filed declaration with reference "${sanitizedBody.eudrReference}" was submitted`,
          userId: 1, // Mock user ID
          entityType: "declaration",
          entityId: declaration.id,
          metadata: null
        });
        
        return res.status(201).json(declaration);
      }
      
      // Handle outbound declarations that are based on existing declarations
      if (req.body.type === "outbound" && req.body.basedOnDeclarationIds && Array.isArray(req.body.basedOnDeclarationIds)) {
        const basedOnIds = req.body.basedOnDeclarationIds;
        
        // Check if frontend provided custom product data (user selected different products)
        const hasCustomProductData = req.body.hasProductOverride || req.body.productName || (req.body.items && req.body.items.length > 0);
        
        console.log("Checking for custom product data:", {
          hasProductOverride: req.body.hasProductOverride,
          productName: req.body.productName,
          itemsLength: req.body.items?.length,
          hasCustomProductData
        });
        
        // Get declarations data to extract product information
        if (basedOnIds.length > 0) {
          try {
            // Fetch all referenced declarations
            const sourceDeclarations = await Promise.all(
              basedOnIds.map((id: any) => storage.getDeclaration(Number(id)))
            );
            
            // Filter out null results and extract product names
            const validDeclarations = sourceDeclarations.filter(d => d !== null);
            
            if (validDeclarations.length > 0) {
              // Use the first valid declaration as the primary source
              const primaryDeclaration = validDeclarations[0];
              
              let productName, hsnCode, quantity, unit, industry;
              
              if (hasCustomProductData) {
                // Use frontend-provided product data (user selected different products)
                if (req.body.items && req.body.items.length > 0) {
                  const items = req.body.items;
                  const productNames = items.map((item: any) => item.productName).filter(Boolean);
                  productName = productNames.slice(0, 3).join(", ") + (productNames.length > 3 ? ` and ${productNames.length - 3} more` : "");
                  hsnCode = items[0]?.hsnCode || primaryDeclaration.hsnCode;
                  quantity = items.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0);
                  unit = items[0]?.unit || primaryDeclaration.unit;
                } else {
                  productName = req.body.productName;
                  hsnCode = req.body.hsnCode || primaryDeclaration.hsnCode;
                  quantity = req.body.quantity || primaryDeclaration.quantity;
                  unit = req.body.unit || primaryDeclaration.unit;
                }
                industry = productName; // Use selected product name as industry
              } else {
                // When no custom product data is provided, use the first source declaration's data
                // but try to extract meaningful product information
                productName = primaryDeclaration.productName || "Outbound Product";
                hsnCode = primaryDeclaration.hsnCode;
                quantity = validDeclarations.reduce((sum, d) => sum + (d.quantity || 0), 0);
                unit = primaryDeclaration.unit;
                industry = productName;
              }
              
              // Create outbound declaration based on the source declaration data
              const sanitizedBody: any = {
                type: "outbound",
                supplierId: Number(req.body.supplierId || primaryDeclaration.supplierId || 1),
                productName: productName,
                productDescription: primaryDeclaration.productDescription,
                hsnCode: hsnCode,
                quantity: quantity,
                unit: unit,
                status: String(req.body.status || "pending"),
                riskLevel: primaryDeclaration.riskLevel || "medium",
                industry: industry, // Use product name as industry for display
                createdBy: 1,
                customerId: req.body.customerId ? Number(req.body.customerId) : undefined,
              };
              
              console.log("Sanitized payload (based on existing):", JSON.stringify(sanitizedBody, null, 2));
              
              const declarationInput = insertDeclarationSchema.parse(sanitizedBody);
              const declaration = await storage.createDeclaration(declarationInput);
              
              // Create activity record
              const activityDescription = hasCustomProductData 
                ? `New outbound declaration created with custom products: ${productName}`
                : `New outbound declaration based on ${validDeclarations.length} existing declaration(s) was created with products: ${productName}`;
              
              await storage.createActivity({
                type: "declaration",
                description: activityDescription,
                userId: 1,
                entityType: "declaration",
                entityId: declaration.id,
                metadata: null
              });
              
              return res.status(201).json(declaration);
            }
          } catch (error) {
            console.error("Error fetching source declarations:", error);
            // Fall through to regular handling if there's an error
          }
        }
      }
      
      // Handle regular inbound/outbound declarations
      const sanitizedBody: any = {
        type: String(req.body.type || ""),
        supplierId: Number(req.body.supplierId || 1),
        productName: String(req.body.productName || ""),
        productDescription: req.body.productDescription ? String(req.body.productDescription) : undefined,
        hsnCode: req.body.hsnCode ? String(req.body.hsnCode) : undefined,
        quantity: req.body.quantity !== undefined ? Number(req.body.quantity) : undefined,
        unit: req.body.unit ? String(req.body.unit) : undefined,
        status: String(req.body.status || "pending"),
        riskLevel: String(req.body.riskLevel || "medium"),
        geojsonData: req.body.geojsonData || undefined,
        startDate: req.body.startDate || undefined,
        endDate: req.body.endDate || undefined,
        createdBy: 1, // Always set this to 1 for consistency
        industry: req.body.industry ? String(req.body.industry) : undefined,
        rmId: req.body.rmId ? String(req.body.rmId) : undefined
      };

      // Handle EU reference numbers for EU suppliers
      if (req.body.referenceNumberPairs && Array.isArray(req.body.referenceNumberPairs)) {
        const validPairs = req.body.referenceNumberPairs.filter((pair: any) => 
          (pair.referenceNumber && pair.referenceNumber.trim()) || 
          (pair.verificationNumber && pair.verificationNumber.trim())
        );
        
        if (validPairs.length > 0) {
          // Store as JSON string in the database
          sanitizedBody.euReferenceNumbers = JSON.stringify(validPairs);
          console.log("EU Reference Numbers added:", validPairs);
        }
      }
      
      // Add customerId for outbound declarations
      if (sanitizedBody.type === "outbound" && req.body.customerId) {
        sanitizedBody.customerId = Number(req.body.customerId);
      }
      
      console.log("Sanitized payload:", JSON.stringify(sanitizedBody, null, 2));
      
      const declarationInput = insertDeclarationSchema.parse(sanitizedBody);
      
      // Extract product names from items if they exist
      if (req.body.items && Array.isArray(req.body.items) && req.body.items.length > 0) {
        // If productName is not already set, use product names from items
        if (!declarationInput.productName) {
          // Join the first 3 product names with commas
          const productNames = req.body.items
            .filter((item: any) => item.productName)
            .map((item: any) => item.productName)
            .slice(0, 3);
            
          if (productNames.length > 0) {
            declarationInput.productName = productNames.join(", ");
            
            // If there are more than 3 products, add "and more"
            if (req.body.items.length > 3) {
              declarationInput.productName += ` and ${req.body.items.length - 3} more`;
            }
          }
        }
      }
      
      // Note: We don't need to store the supplier name anymore
      // as we now include it in the API response from supplier data
      
      const declaration = await storage.createDeclaration(declarationInput);
      
      // Create activity record
      await storage.createActivity({
        type: "declaration",
        description: `New ${declaration.type} declaration for product "${declaration.productName || 'Unknown'}" was created`,
        userId: 1, // Mock user ID
        entityType: "declaration",
        entityId: declaration.id,
        metadata: null
      });
      
      res.status(201).json(declaration);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error details:", JSON.stringify(error.errors, null, 2));
        console.error("Failed declaration payload:", JSON.stringify(req.body, null, 2));
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        console.error("Error creating declaration:", error);
        res.status(500).json({ message: "Error creating declaration" });
      }
    }
  });

  app.put("/api/declarations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const declarationInput = insertDeclarationSchema.partial().parse(req.body);
      
      const updatedDeclaration = await storage.updateDeclaration(id, declarationInput);
      
      if (!updatedDeclaration) {
        return res.status(404).json({ message: "Declaration not found" });
      }
      
      // Create activity record
      await storage.createActivity({
        type: "declaration",
        description: `Declaration for product "${updatedDeclaration.productName}" was updated`,
        userId: 1, // Mock user ID
        entityType: "declaration",
        entityId: updatedDeclaration.id,
        metadata: null
      });
      
      res.json(updatedDeclaration);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        res.status(500).json({ message: "Error updating declaration" });
      }
    }
  });

  // PATCH endpoint specifically for declaration updates like RM ID
  app.patch("/api/declarations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const declarationInput = insertDeclarationSchema.partial().parse(req.body);
      
      const updatedDeclaration = await storage.updateDeclaration(id, declarationInput);
      
      if (!updatedDeclaration) {
        return res.status(404).json({ message: "Declaration not found" });
      }
      
      // Create activity record for RM ID updates if that's what was updated
      const activityDescription = req.body.rmId !== undefined
        ? `RM ID was updated for declaration "${updatedDeclaration.productName}"`
        : `Declaration for product "${updatedDeclaration.productName}" was updated`;
      
      await storage.createActivity({
        type: "declaration",
        description: activityDescription,
        userId: 1, // Mock user ID
        entityType: "declaration",
        entityId: updatedDeclaration.id,
        metadata: null
      });
      
      res.json(updatedDeclaration);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        res.status(500).json({ message: "Error updating declaration" });
      }
    }
  });

  // Customer routes are now implemented below with real data

  // Risk categories routes
  app.get("/api/risk-categories", async (req, res) => {
    try {
      const categories = await storage.listRiskCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Error fetching risk categories" });
    }
  });
  
  // Customer routes
  app.get("/api/customers", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const customers = await storage.listCustomers(status);
      res.json(customers);
    } catch (error) {
      res.status(500).json({ message: "Error fetching customers" });
    }
  });

  app.get("/api/customers/stats", async (req, res) => {
    try {
      const stats = await storage.getCustomerStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Error fetching customer statistics" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomer(id);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      res.json(customer);
    } catch (error) {
      res.status(500).json({ message: "Error fetching customer" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const customerInput = insertCustomerSchema.parse(req.body);
      
      // Check if customer with email exists
      const existingCustomer = await storage.getCustomerByEmail(customerInput.email);
      if (existingCustomer) {
        return res.status(400).json({ message: "Customer with this email already exists" });
      }
      
      const customer = await storage.createCustomer(customerInput);
      
      // Log activity for customer creation
      await storage.createActivity({
        type: "customer",
        description: `New customer ${customer.displayName || customer.companyName || `${customer.firstName} ${customer.lastName}`} created`,
        userId: 1, // Assuming admin user
        entityType: "customer",
        entityId: customer.id,
        metadata: null
      });
      
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        console.error("Error creating customer:", error);
        res.status(500).json({ message: "Error creating customer" });
      }
    }
  });
  
  app.patch("/api/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customerInput = insertCustomerSchema.partial().parse(req.body);
      
      const updatedCustomer = await storage.updateCustomer(id, customerInput);
      
      if (!updatedCustomer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      // Log activity for customer update
      await storage.createActivity({
        type: "customer",
        description: `Customer ${updatedCustomer.displayName || updatedCustomer.companyName || `${updatedCustomer.firstName} ${updatedCustomer.lastName}`} information updated`,
        userId: 1, // Assuming admin user
        entityType: "customer",
        entityId: updatedCustomer.id,
        metadata: null
      });
      
      res.json(updatedCustomer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        console.error("Error updating customer:", error);
        res.status(500).json({ message: "Error updating customer" });
      }
    }
  });
  
  app.get("/api/customers/:id/declarations", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const declarations = await storage.listDeclarationsByCustomer(customerId);
      res.json(declarations);
    } catch (error) {
      res.status(500).json({ message: "Error fetching customer declarations" });
    }
  });
  
  app.get("/api/customers/:id/documents", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const documents = await storage.listDocumentsByCustomer(customerId);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Error fetching customer documents" });
    }
  });

  // SAQ routes
  app.get("/api/supplier/:id/saqs", async (req, res) => {
    try {
      const supplierId = parseInt(req.params.id);
      const status = req.query.status as string;
      const saqs = await storage.listSaqsBySupplier(supplierId, status);
      res.json(saqs);
    } catch (error) {
      res.status(500).json({ message: "Error fetching SAQs" });
    }
  });
  
  app.get("/api/supplier/:id/saqs/stats", async (req, res) => {
    try {
      const supplierId = parseInt(req.params.id);
      const stats = await storage.getSaqStats(supplierId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Error fetching SAQ statistics" });
    }
  });
  
  app.get("/api/saqs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const saq = await storage.getSaq(id);
      
      if (!saq) {
        return res.status(404).json({ message: "SAQ not found" });
      }
      
      res.json(saq);
    } catch (error) {
      res.status(500).json({ message: "Error fetching SAQ" });
    }
  });
  
  app.post("/api/saqs", async (req, res) => {
    try {
      const saqInput = insertSaqSchema.parse(req.body);
      const saq = await storage.createSaq(saqInput);
      
      // Create activity record
      await storage.createActivity({
        type: "saq",
        description: `New SAQ "${saq.title}" was created for supplier #${saq.supplierId}`,
        userId: 1, // Mock user ID
        entityType: "saq",
        entityId: saq.id,
        metadata: null
      });
      
      res.status(201).json(saq);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        res.status(500).json({ message: "Error creating SAQ" });
      }
    }
  });
  
  app.put("/api/saqs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const saqInput = insertSaqSchema.partial().parse(req.body);
      
      const updatedSaq = await storage.updateSaq(id, saqInput);
      
      if (!updatedSaq) {
        return res.status(404).json({ message: "SAQ not found" });
      }
      
      // Create activity for SAQ completion if status changed to completed
      if (saqInput.status === "completed") {
        await storage.createActivity({
          type: "saq",
          description: `SAQ "${updatedSaq.title}" was completed by supplier #${updatedSaq.supplierId}`,
          userId: 1, // Mock user ID
          entityType: "saq",
          entityId: updatedSaq.id,
          metadata: null
        });
      }
      
      res.json(updatedSaq);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        res.status(500).json({ message: "Error updating SAQ" });
      }
    }
  });
  
  // Endpoint to update RM IDs for declarations
  app.patch("/api/declarations/:id/rm-id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { rmId } = req.body;
      
      if (!rmId) {
        return res.status(400).json({ message: "RM ID is required" });
      }
      
      const declaration = await storage.getDeclaration(id);
      if (!declaration) {
        return res.status(404).json({ message: "Declaration not found" });
      }
      
      const updated = await storage.updateDeclaration(id, { rmId });
      
      if (updated) {
        // Log the activity
        await storage.createActivity({
          type: "updated",
          entityType: "declaration",
          entityId: id,
          description: `Updated RM ID to '${rmId}'`,
          userId: 1, // Use actual user ID when available
        });
        
        res.json(updated);
      } else {
        res.status(500).json({ message: "Error updating declaration" });
      }
    } catch (error) {
      console.error('Error updating RM ID:', error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Endpoint to bulk update RM IDs for multiple declarations
  app.patch("/api/declarations/bulk-update-rm-ids", async (req, res) => {
    try {
      const { updates } = req.body;
      
      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ message: "Invalid updates format" });
      }
      
      const results = [];
      for (const update of updates) {
        const { id, rmId } = update;
        
        if (!id || !rmId) {
          results.push({ id, success: false, message: "Missing id or rmId" });
          continue;
        }
        
        const declaration = await storage.getDeclaration(id);
        if (!declaration) {
          results.push({ id, success: false, message: "Declaration not found" });
          continue;
        }
        
        const updated = await storage.updateDeclaration(id, { rmId });
        
        if (updated) {
          // Log the activity
          await storage.createActivity({
            type: "updated",
            entityType: "declaration",
            entityId: id,
            description: `Updated RM ID to '${rmId}'`,
            userId: 1, // Use actual user ID when available
          });
          
          results.push({ id, success: true });
        } else {
          results.push({ id, success: false, message: "Error updating declaration" });
        }
      }
      
      res.json({ results });
    } catch (error) {
      console.error('Error bulk updating RM IDs:', error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Endpoint to download product list Excel template
  app.post("/api/declarations/product-list-template", async (req, res) => {
    try {
      // In a real-world scenario, we'd use a library like exceljs to generate
      // an Excel file dynamically based on the request data.
      // For this demo, we'll serve a pre-made Excel file.
      
      const products = req.body.products || [];
      
      // Log for debugging
      console.log(`Generating product list template for ${products.length} products`);
      
      // Send the static Excel file
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="Product List.xlsx"');
      
      // Serve the pre-made Excel file
      const path = require('path');
      const fs = require('fs');
      const filePath = path.join(__dirname, 'assets', 'Product List.xlsx');
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.error('Excel template file not found at path:', filePath);
        return res.status(404).json({ message: "Template file not found" });
      }
      
      // Stream the file to the client
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Error generating Excel template:', error);
      res.status(500).json({ message: "Error generating Excel template" });
    }
  });
  
  // Entity management routes (Platform Admin)
  // Product routes
  app.get("/api/products", async (req, res) => {
    try {
      const productType = req.query.type as string | undefined;
      const entityId = req.query.entityId 
        ? parseInt(req.query.entityId as string) 
        : undefined;
      
      const products = await storage.listProducts(productType, entityId);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Error fetching products" });
    }
  });

  // Product search endpoint for typeahead
  app.get("/api/products/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query || query.trim().length < 2) {
        return res.json([]);
      }
      
      const products = await storage.searchProducts(query);
      res.json(products);
    } catch (error) {
      console.error("Error searching products:", error);
      res.status(500).json({ message: "Error searching products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Error fetching product" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      
      // Create activity record
      await storage.createActivity({
        type: "product",
        description: `New product "${product.name}" was added`,
        userId: 1, // Default user ID
      });
      
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid product data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating product" });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      const updateData = req.body;
      const updatedProduct = await storage.updateProduct(productId, updateData);
      
      // Create activity record
      await storage.createActivity({
        type: "product",
        description: `Product "${product.name}" was updated`,
        userId: 1, // Default user ID
      });
      
      res.json(updatedProduct);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Error updating product" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      const success = await storage.deleteProduct(productId);
      
      if (success) {
        // Create activity record
        await storage.createActivity({
          type: "product",
          description: `Product "${product.name}" was deleted`,
          userId: 1, // Default user ID
        });
        
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete product" });
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Error deleting product" });
    }
  });

  app.get("/api/entities", async (req, res) => {
    try {
      const { status, registrationStatus } = req.query;
      const entities = await storage.listEntities(
        status as string, 
        registrationStatus as string
      );
      res.json(entities);
    } catch (error) {
      console.error("Error fetching entities:", error);
      res.status(500).json({ error: "Failed to fetch entities" });
    }
  });
  
  app.get("/api/entities/stats", async (req, res) => {
    try {
      const stats = await storage.getEntityStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching entity stats:", error);
      res.status(500).json({ error: "Failed to fetch entity stats" });
    }
  });
  
  app.get("/api/entities/:id", async (req, res) => {
    try {
      const entityId = parseInt(req.params.id);
      const entity = await storage.getEntity(entityId);
      
      if (!entity) {
        return res.status(404).json({ error: "Entity not found" });
      }
      
      // Get the modules for this entity
      const modules = await storage.getEntityModules(entityId);
      
      res.json({ 
        ...entity, 
        modules 
      });
    } catch (error) {
      console.error(`Error fetching entity ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to fetch entity" });
    }
  });
  
  app.post("/api/entities", async (req, res) => {
    try {
      const entity = await storage.createEntity(req.body);
      
      // Create activity record
      await storage.createActivity({
        type: "entity",
        description: `Entity ${entity.name} was created`,
        userId: 1, // Admin user
        entityId: entity.id,
        entityType: "entity"
      });
      
      res.status(201).json(entity);
    } catch (error) {
      console.error("Error creating entity:", error);
      res.status(500).json({ error: "Failed to create entity" });
    }
  });
  
  app.patch("/api/entities/:id", async (req, res) => {
    try {
      const entityId = parseInt(req.params.id);
      const updatedEntity = await storage.updateEntity(entityId, req.body);
      
      if (!updatedEntity) {
        return res.status(404).json({ error: "Entity not found" });
      }
      
      // Create activity record for status change
      if (req.body.status) {
        await storage.createActivity({
          type: "entity",
          description: `Entity ${updatedEntity.name} status changed to ${req.body.status}`,
          userId: 1, // Admin user
          entityId: updatedEntity.id,
          entityType: "entity"
        });
      }
      
      // Create activity record for registration status change
      if (req.body.registrationStatus) {
        await storage.createActivity({
          type: "entity",
          description: `Entity ${updatedEntity.name} registration ${req.body.registrationStatus}`,
          userId: 1, // Admin user
          entityId: updatedEntity.id,
          entityType: "entity"
        });
      }
      
      res.json(updatedEntity);
    } catch (error) {
      console.error(`Error updating entity ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to update entity" });
    }
  });
  
  app.get("/api/entities/:id/modules", async (req, res) => {
    try {
      const entityId = parseInt(req.params.id);
      const modules = await storage.getEntityModules(entityId);
      
      if (!modules) {
        return res.status(404).json({ error: "Modules not found for this entity" });
      }
      
      res.json(modules);
    } catch (error) {
      console.error(`Error fetching modules for entity ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to fetch entity modules" });
    }
  });
  
  app.patch("/api/entities/:id/modules", async (req, res) => {
    try {
      const entityId = parseInt(req.params.id);
      const updatedModules = await storage.updateEntityModules(entityId, req.body);
      
      if (!updatedModules) {
        return res.status(404).json({ error: "Modules not found for this entity" });
      }
      
      const entity = await storage.getEntity(entityId);
      
      // Create activity record
      await storage.createActivity({
        type: "entity",
        description: `Modules updated for ${entity?.name || 'entity'}`,
        userId: 1, // Admin user
        entityId: entityId,
        entityType: "entity"
      });
      
      res.json(updatedModules);
    } catch (error) {
      console.error(`Error updating modules for entity ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to update entity modules" });
    }
  });
  
  // Invitation management routes
  app.get("/api/invitations", async (req, res) => {
    try {
      const { status } = req.query;
      
      console.log("Fetching invitations, status filter:", status);
      
      // Include license_status field
      let sqlQuery;
      try {
        // First check if the license_status column exists
        const checkColumn = await pool.query(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = 'invitations' AND column_name = 'license_status'
        `);
        
        // Build query based on whether the column exists
        // Get all column names from the invitations table
        const { rows: tableColumns } = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'invitations'
        `);
        
        // Extract column names into an array
        const availableColumns = tableColumns.map((col: any) => col.column_name);
        
        // Build a dynamic query based on available columns
        let queryColumns = 'id, email, name, token, status, invited_by as "invitedBy", created_at as "createdAt", expires_at as "expiresAt"';
        
        // Add license_status column if it exists
        if (availableColumns.includes('license_status')) {
          queryColumns += ', license_status as "licenseStatus"';
        }
        
        // Add full_name column if it exists
        if (availableColumns.includes('full_name')) {
          queryColumns += ', full_name as "fullName"';
        }
        
        // Construct the final query
        sqlQuery = status 
          ? `SELECT ${queryColumns} FROM invitations WHERE status = $1`
          : `SELECT ${queryColumns} FROM invitations`;
      } catch (error) {
        console.error("Error checking column existence:", error);
        // Fallback to basic query without optional columns
        sqlQuery = status 
          ? `SELECT id, email, name, token, status, invited_by as "invitedBy", 
              created_at as "createdAt", expires_at as "expiresAt"
              FROM invitations WHERE status = $1`
          : `SELECT id, email, name, token, status, invited_by as "invitedBy", 
              created_at as "createdAt", expires_at as "expiresAt" 
              FROM invitations`;
      }
      
      // Execute the query with proper error handling
      let result;
      try {
        console.log("Executing SQL query using direct pool connection");
        
        if (status) {
          const { rows } = await pool.query(sqlQuery, [status as string]);
          result = rows;
          console.log(`Query returned ${result.length} invitations with status ${status}`);
        } else {
          const { rows } = await pool.query(sqlQuery);
          result = rows;
          console.log(`Query returned ${result.length} invitations (all statuses)`);
        }
      } catch (sqlError: any) {
        console.error("SQL error:", sqlError);
        throw new Error(`Database query failed: ${sqlError.message}`);
      }
      
      // Process the results to add any missing properties expected by the frontend
      const invitations = result.map((invitation: any) => {
        // Add client-friendly properties
        return {
          ...invitation,
          fullName: invitation.fullName || "", // Use existing value or empty string
          licenseStatus: invitation.licenseStatus || "free" // Default to 'free' if not set
        };
      });
      
      // Return the processed invitations
      res.json(invitations);
    } catch (error: any) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ error: `Failed to fetch invitations: ${error.message}` });
    }
  });
  
  app.post("/api/invitations", async (req, res) => {
    try {
      const { email, name, expiryDate } = req.body;
      
      // Validate required fields - name field now contains combined contact+company names
      if (!email || !name || !expiryDate) {
        return res.status(400).json({ 
          error: "Missing required fields. Email, Name, and Expiry Date are required."
        });
      }
      
      // Parse expiryDate and validate
      let expiresAt;
      try {
        expiresAt = new Date(expiryDate);
        // Validation: must be a future date
        if (expiresAt <= new Date()) {
          return res.status(400).json({ error: "Expiry date must be in the future" });
        }
      } catch (e) {
        return res.status(400).json({ error: "Invalid date format for expiryDate" });
      }
      
      // Generate random token
      const token = `invitation-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      
      const invitation = await storage.createInvitation({
        email,
        name,
        fullName,
        status: "pending",
        token,
        invitedBy: 1, // Admin user
        expiresAt,
      });
      
      // Create activity record
      await storage.createActivity({
        type: "invitation",
        description: `Invitation sent to ${invitation.email} (${invitation.fullName}) for ${invitation.name}`,
        userId: 1, // Admin user
        entityType: "invitation",
        entityId: invitation.id
      });
      
      res.status(201).json(invitation);
    } catch (error) {
      console.error("Error creating invitation:", error);
      res.status(500).json({ error: "Failed to create invitation" });
    }
  });
  
  app.patch("/api/invitations/:id", async (req, res) => {
    try {
      const invitationId = parseInt(req.params.id);
      const updatedInvitation = await storage.updateInvitation(invitationId, req.body);
      
      if (!updatedInvitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }
      
      // Create activity record
      if (req.body.status) {
        await storage.createActivity({
          type: "invitation",
          description: `Invitation to ${updatedInvitation.email} ${req.body.status}`,
          userId: 1, // Admin user
          entityType: "invitation",
          entityId: updatedInvitation.id
        });
      }
      
      res.json(updatedInvitation);
    } catch (error) {
      console.error(`Error updating invitation ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to update invitation" });
    }
  });

  // Role management API endpoints
  app.get("/api/roles", async (req, res) => {
    try {
      const entityId = req.query.entityId ? parseInt(req.query.entityId as string) : 1;
      const roles = await storage.listRoles(entityId);
      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ message: "Error fetching roles" });
    }
  });

  app.get("/api/roles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const role = await storage.getRole(id);
      
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }
      
      res.json(role);
    } catch (error) {
      console.error("Error fetching role:", error);
      res.status(500).json({ message: "Error fetching role" });
    }
  });

  app.post("/api/roles", async (req, res) => {
    try {
      const roleInput = insertRoleSchema.parse(req.body);
      
      // Check if role name already exists for this entity
      const existingRole = await storage.getRoleByName(roleInput.name, roleInput.entityId);
      if (existingRole) {
        return res.status(400).json({ message: "Role name already exists" });
      }
      
      const role = await storage.createRole(roleInput);
      
      // Create activity record
      await storage.createActivity({
        type: "role",
        description: `New role "${role.name}" was created`,
        userId: 1, // Mock user ID
        entityType: "role",
        entityId: role.id,
        metadata: null
      });
      
      res.status(201).json(role);
    } catch (error) {
      console.error("Error creating role:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        res.status(500).json({ message: "Error creating role" });
      }
    }
  });

  app.put("/api/roles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const roleInput = insertRoleSchema.partial().parse(req.body);
      
      // Check if role name already exists for this entity (excluding current role)
      if (roleInput.name && roleInput.entityId) {
        const existingRole = await storage.getRoleByName(roleInput.name, roleInput.entityId);
        if (existingRole && existingRole.id !== id) {
          return res.status(400).json({ message: "Role name already exists" });
        }
      }
      
      const updatedRole = await storage.updateRole(id, roleInput);
      
      if (!updatedRole) {
        return res.status(404).json({ message: "Role not found" });
      }
      
      // Create activity record
      await storage.createActivity({
        type: "role",
        description: `Role "${updatedRole.name}" was updated`,
        userId: 1, // Mock user ID
        entityType: "role",
        entityId: updatedRole.id,
        metadata: null
      });
      
      res.json(updatedRole);
    } catch (error) {
      console.error("Error updating role:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        res.status(500).json({ message: "Error updating role" });
      }
    }
  });

  app.delete("/api/roles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const role = await storage.getRole(id);
      
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }
      
      const success = await storage.deleteRole(id);
      
      if (success) {
        // Create activity record
        await storage.createActivity({
          type: "role",
          description: `Role "${role.name}" was deleted`,
          userId: 1, // Mock user ID
          entityType: "role",
          entityId: role.id,
          metadata: null
        });
        
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete role" });
      }
    } catch (error) {
      console.error("Error deleting role:", error);
      res.status(500).json({ message: "Error deleting role" });
    }
  });

  // Map proxy route to resolve browser security issues
  app.get('/api/map-proxy', async (req, res) => {
    try {
      const response = await axios.get('http://localhost:3001/map-service', {
        timeout: 5000,
        responseType: 'text'
      });
      res.set({
        'Content-Type': 'text/html',
        'X-Frame-Options': 'SAMEORIGIN',
        'Content-Security-Policy': "frame-ancestors 'self'"
      });
      res.send(response.data);
    } catch (error) {
      console.error('Map proxy error:', error);
      res.status(503).send(`
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Map Service Loading</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 2s linear infinite; margin: 20px auto; }
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
          </head>
          <body>
            <h2>Map Service Starting</h2>
            <div class="spinner"></div>
            <p>The interactive map is initializing. Please wait...</p>
            <button onclick="window.location.reload()">Retry</button>
            <script>
              setTimeout(() => window.location.reload(), 5000);
            </script>
          </body>
        </html>
      `);
    }
  });

  // GeoJSON data proxy for map service
  app.post('/api/map-geojson', async (req, res) => {
    try {
      const response = await axios.post('http://localhost:3001/api/geojson', req.body, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });
      res.json(response.data);
    } catch (error) {
      console.error('GeoJSON proxy error:', error);
      res.status(503).json({ error: 'Map service unavailable' });
    }
  });
  
  const httpServer = createServer(app);
  
  return httpServer;
}
