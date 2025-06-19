import { pgTable, text, serial, integer, boolean, timestamp, json, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  avatar: text("avatar"),
  phoneNumber: text("phone_number"),
  role: text("role").default("user"), // 'user', 'admin', 'platformAdmin'
  createdAt: timestamp("created_at").defaultNow(),
  trialStartDate: timestamp("trial_start_date").defaultNow(),
  trialEndDate: timestamp("trial_end_date"),
  subscriptionStatus: text("subscription_status").default("trial"), // 'trial', 'licensed'
  entityId: integer("entity_id"), // Reference to the entity this user belongs to
  registrationStatus: text("registration_status").default("approved"), // 'pending', 'approved', 'rejected'
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  fullName: true,
  phoneNumber: true,
  role: true,
  entityId: true,
});

// OTP verification
export const otpCodes = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull(),
  code: text("code").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").default(false),
});

export const insertOtpSchema = createInsertSchema(otpCodes).pick({
  phoneNumber: true,
  code: true,
  expiresAt: true,
});

export const usersRelations = relations(users, ({ many }) => ({
  otpCodes: many(otpCodes),
}));

export const otpCodesRelations = relations(otpCodes, ({ one }) => ({
  user: one(users, {
    fields: [otpCodes.phoneNumber],
    references: [users.phoneNumber],
  }),
}));

// Suppliers
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  partnerType: text("partner_type").notNull(),
  partnerRole: text("partner_role").notNull(),
  partnerRoleName: text("partner_role_name").notNull(),
  domain: text("domain"),
  website: text("website"),
  registrationType: text("registration_type"),
  category: text("category"),
  incorporationDate: timestamp("incorporation_date"),
  businessRegistration: text("business_registration"),
  businessAddress: text("business_address"),
  
  // Address fields
  addressType: text("address_type"),
  addressLine1: text("address_line1"),
  street: text("street"),
  city: text("city"),
  state: text("state"),
  country: text("country").notNull(),
  pinCode: text("pin_code"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  
  // Contact fields
  contactName: text("contact_name"),
  contactTitle: text("contact_title"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  designation: text("designation"),
  email: text("email"),
  secondaryEmail: text("secondary_email"),
  mobileNumber: text("mobile_number"),
  phoneNumber: text("phone_number"),
  
  // System fields
  status: text("status").notNull().default("pending"),
  riskLevel: text("risk_level").default("low"),
  riskScore: integer("risk_score").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertSupplierSchema = createInsertSchema(suppliers)
  .omit({ id: true, createdAt: true, lastUpdated: true })
  .extend({
    // Make some fields optional for the API
    riskLevel: z.string().optional(),
    riskScore: z.number().optional(),
    status: z.string().optional().default("pending"),
    
    // Required form fields from Add New Supplier
    name: z.string().min(1, "Company name is required"),
    businessRegistration: z.string().optional(),
    country: z.string().min(1, "Country is required"),
    businessAddress: z.string().optional(),
    contactName: z.string().min(1, "Primary contact name is required"),
    email: z.string().email("Valid email is required"),
    phoneNumber: z.string().min(1, "Phone number is required"),
    
    // Additional validations
    website: z.string().url().optional(),
  });

// Declarations
export const declarations = pgTable("declarations", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "inbound" or "outbound"
  supplierId: integer("supplier_id").notNull(),
  customerId: integer("customer_id"), // For outbound declarations
  productName: text("product_name").notNull(),
  productDescription: text("product_description"),
  hsnCode: text("hsn_code"),
  quantity: integer("quantity"),
  unit: text("unit"),
  status: text("status").notNull().default("pending"), // "approved", "review", "rejected", "pending"
  riskLevel: text("risk_level").notNull().default("medium"), // "low", "medium", "high"
  geojsonData: json("geojson_data"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow(),
  industry: text("industry"),
  rmId: text("rm_id"),
  eudrReferenceNumber: text("eudr_reference_number"),
  eudrVerificationNumber: text("eudr_verification_number"),
  previousReferenceNumber: text("previous_reference_number"),
  euReferenceNumbers: text("eu_reference_numbers"), // JSON string storing multiple reference number pairs
  ddsStatus: text("dds_status"),
  complianceStatus: text("compliance_status"),
});

export const insertDeclarationSchema = createInsertSchema(declarations).pick({
  type: true,
  supplierId: true,
  customerId: true,  // Added customerId for outbound declarations
  productName: true,
  productDescription: true,
  hsnCode: true,
  quantity: true,
  unit: true,
  status: true,
  riskLevel: true,
  geojsonData: true,
  startDate: true,
  endDate: true,
  createdBy: true,
  industry: true,
  rmId: true,
  eudrReferenceNumber: true,
  eudrVerificationNumber: true,
  previousReferenceNumber: true,
  euReferenceNumbers: true,
  ddsStatus: true,
  complianceStatus: true,
});

// Documents
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  supplierId: integer("supplier_id").notNull(),
  status: text("status").notNull(),
  uploadedBy: integer("uploaded_by").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  documentType: text("document_type").notNull(),
  filePath: text("file_path"),
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  title: true,
  supplierId: true,
  status: true,
  uploadedBy: true,
  documentType: true,
  filePath: true,
  expiresAt: true,
});

// Activities
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  userId: integer("user_id").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  metadata: json("metadata"),
});

export const insertActivitySchema = createInsertSchema(activities).pick({
  type: true,
  description: true,
  userId: true,
  entityType: true,
  entityId: true,
  metadata: true,
});

// Tasks
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  assignedTo: integer("assigned_to").notNull(),
  dueDate: timestamp("due_date"),
  status: text("status").notNull().default("pending"),
  priority: text("priority").notNull().default("medium"),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasks).pick({
  title: true,
  description: true,
  assignedTo: true,
  dueDate: true,
  status: true,
  priority: true,
});

// Risk Assessment Categories
export const riskCategories = pgTable("risk_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  score: integer("score").notNull(),
  color: text("color").notNull(),
});

export const insertRiskCategorySchema = createInsertSchema(riskCategories).pick({
  name: true,
  score: true,
  color: true,
});

// Compliance Metrics
export const complianceMetrics = pgTable("compliance_metrics", {
  id: serial("id").primaryKey(),
  date: timestamp("date").defaultNow(),
  overallCompliance: integer("overall_compliance").notNull(),
  documentStatus: integer("document_status").notNull(),
  supplierCompliance: integer("supplier_compliance").notNull(),
  riskLevel: text("risk_level").notNull(),
  issuesDetected: integer("issues_detected").notNull(),
});

export const insertComplianceMetricSchema = createInsertSchema(complianceMetrics).pick({
  overallCompliance: true,
  documentStatus: true,
  supplierCompliance: true,
  riskLevel: true,
  issuesDetected: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

export type Declaration = typeof declarations.$inferSelect;
export type InsertDeclaration = z.infer<typeof insertDeclarationSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type RiskCategory = typeof riskCategories.$inferSelect;
export type InsertRiskCategory = z.infer<typeof insertRiskCategorySchema>;

export type ComplianceMetric = typeof complianceMetrics.$inferSelect;
export type InsertComplianceMetric = z.infer<typeof insertComplianceMetricSchema>;

// Self-Assessment Questionnaires (SAQs)
export const saqs = pgTable("saqs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  customerId: integer("customer_id").notNull(),
  supplierId: integer("supplier_id").notNull(),
  status: text("status").notNull(), // "pending", "in-progress", "completed"
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  completedAt: timestamp("completed_at"),
  score: integer("score"),
  answers: json("answers"), // Store answers as JSON
});

export const insertSaqSchema = createInsertSchema(saqs).pick({
  title: true,
  description: true,
  customerId: true,
  supplierId: true,
  status: true,
  completedAt: true,
  score: true,
  answers: true,
});

export type Saq = typeof saqs.$inferSelect;
export type InsertSaq = z.infer<typeof insertSaqSchema>;

// Customer schema - simplified version
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  companyName: text("company_name"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  displayName: text("display_name"),
  email: text("email").notNull(),
  workPhone: text("work_phone"),
  mobilePhone: text("mobile_phone"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCustomerSchema = createInsertSchema(customers).pick({
  type: true,
  companyName: true,
  firstName: true,
  lastName: true,
  displayName: true,
  email: true,
  workPhone: true,
  mobilePhone: true,
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

// Entities (companies registered in the platform)
export const entities = pgTable("entities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  website: text("website"),
  country: text("country"),
  address: text("address"),
  registrationNumber: text("registration_number"),
  taxId: text("tax_id"),
  status: text("status").notNull().default("freeTrial"), // 'freeTrial', 'licensed'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  trialStartDate: timestamp("trial_start_date").defaultNow(),
  trialEndDate: timestamp("trial_end_date"),
  registrationStatus: text("registration_status").default("pending"), // 'pending', 'approved', 'rejected'
  invitedBy: integer("invited_by"), // ID of the user who invited this entity
  rejectionReason: text("rejection_reason"),
});

export const insertEntitySchema = createInsertSchema(entities)
  .omit({ id: true, createdAt: true, updatedAt: true, trialStartDate: true, trialEndDate: true })
  .extend({
    email: z.string().email(),
    website: z.string().url().optional(),
  });

// Entity Feature Modules
export const entityModules = pgTable("entity_modules", {
  id: serial("id").primaryKey(),
  entityId: integer("entity_id").notNull(),
  supplierOnboarding: boolean("supplier_onboarding").default(false),
  customerOnboarding: boolean("customer_onboarding").default(false),
  eudrDeclaration: boolean("eudr_declaration").default(false),
  supplierAssessment: boolean("supplier_assessment").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEntityModuleSchema = createInsertSchema(entityModules)
  .omit({ id: true, createdAt: true, updatedAt: true });

// Entity Invitations
export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),      // Company Name
  fullName: text("full_name"),       // Contact's Full Name (optional to support existing data)
  token: text("token").notNull().unique(),
  status: text("status").default("pending"), // 'pending', 'accepted', 'expired'
  licenseStatus: text("license_status").default("free").notNull(), // 'free', 'licensed'
  invitedBy: integer("invited_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const insertInvitationSchema = createInsertSchema(invitations)
  .omit({ id: true, createdAt: true });

export type Entity = typeof entities.$inferSelect;
export type InsertEntity = z.infer<typeof insertEntitySchema>;

export type EntityModule = typeof entityModules.$inferSelect;
export type InsertEntityModule = z.infer<typeof insertEntityModuleSchema>;

export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;

// Supplier Activation Tokens
export const supplierActivationTokens = pgTable("supplier_activation_tokens", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").notNull(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
});

export const insertActivationTokenSchema = createInsertSchema(supplierActivationTokens)
  .omit({ id: true, createdAt: true });

export type SupplierActivationToken = typeof supplierActivationTokens.$inferSelect;
export type InsertSupplierActivationToken = z.infer<typeof insertActivationTokenSchema>;

// Products
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  productCode: text("product_code").notNull().unique(),
  productType: text("product_type").notNull(), // 'raw_material', 'semi_finished_good', 'finished_good'
  hsCode: text("hs_code"),
  createdAt: timestamp("created_at").defaultNow(),
  entityId: integer("entity_id").notNull(), // Reference to the entity this product belongs to
});

export const insertProductSchema = createInsertSchema(products)
  .omit({ id: true, createdAt: true });

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

// Roles and Permissions
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  permissions: json("permissions").notNull(), // JSON object storing all permissions
  entityId: integer("entity_id").notNull(), // Reference to the entity this role belongs to
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isActive: boolean("is_active").default(true),
});

export const insertRoleSchema = createInsertSchema(roles)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;
