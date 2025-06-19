import { eq, and, asc, desc, isNull, gte, lte, like, sql } from "drizzle-orm";
import { db, pool } from "./db";
import * as schema from "@shared/schema";
import {
  User,
  InsertUser,
  Supplier,
  InsertSupplier,
  Declaration,
  InsertDeclaration,
  Document,
  InsertDocument,
  Activity,
  InsertActivity,
  Task,
  InsertTask,
  RiskCategory,
  InsertRiskCategory,
  ComplianceMetric,
  InsertComplianceMetric,
  Product,
  InsertProduct,
  Saq,
  InsertSaq,
  Customer,
  InsertCustomer,
  Entity,
  InsertEntity,
  EntityModule,
  InsertEntityModule,
  Invitation,
  InsertInvitation,
  SupplierActivationToken,
  InsertSupplierActivationToken,
  Role,
  InsertRole,
} from "@shared/schema";
import { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // User management
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(schema.users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(schema.users)
      .set(updateData)
      .where(eq(schema.users.id, id))
      .returning();
    return updatedUser;
  }

  async listUsers(): Promise<User[]> {
    return await db.select().from(schema.users);
  }

  // Supplier management
  async getSupplier(id: number): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(schema.suppliers).where(eq(schema.suppliers.id, id));
    return supplier;
  }

  async createSupplier(insertSupplier: InsertSupplier): Promise<Supplier> {
    const [supplier] = await db.insert(schema.suppliers).values(insertSupplier).returning();
    return supplier;
  }

  async updateSupplier(id: number, updateData: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const [updatedSupplier] = await db
      .update(schema.suppliers)
      .set(updateData)
      .where(eq(schema.suppliers.id, id))
      .returning();
    return updatedSupplier;
  }

  async listSuppliers(status?: string): Promise<Supplier[]> {
    // Select all the columns including contact_name and phone_number
    const selectColumns = {
      id: schema.suppliers.id,
      name: schema.suppliers.name,
      partnerType: schema.suppliers.partnerType,
      partnerRole: schema.suppliers.partnerRole,
      partnerRoleName: schema.suppliers.partnerRoleName,
      country: schema.suppliers.country,
      email: schema.suppliers.email,
      firstName: schema.suppliers.firstName,
      lastName: schema.suppliers.lastName,
      mobileNumber: schema.suppliers.mobileNumber,
      contactName: schema.suppliers.contactName,
      phoneNumber: schema.suppliers.phoneNumber,
      status: schema.suppliers.status,
      createdAt: schema.suppliers.createdAt
    };

    if (status) {
      return await db
        .select(selectColumns)
        .from(schema.suppliers)
        .where(eq(schema.suppliers.status, status))
        .orderBy(desc(schema.suppliers.id));
    }
    return await db.select(selectColumns).from(schema.suppliers).orderBy(desc(schema.suppliers.id));
  }

  // Declaration management
  async getDeclaration(id: number): Promise<Declaration | undefined> {
    const [declaration] = await db.select().from(schema.declarations).where(eq(schema.declarations.id, id));
    return declaration;
  }

  async createDeclaration(insertDeclaration: InsertDeclaration): Promise<Declaration> {
    const [declaration] = await db.insert(schema.declarations).values(insertDeclaration).returning();
    return declaration;
  }

  async updateDeclaration(id: number, updateData: Partial<InsertDeclaration>): Promise<Declaration | undefined> {
    const [updatedDeclaration] = await db
      .update(schema.declarations)
      .set(updateData)
      .where(eq(schema.declarations.id, id))
      .returning();
    return updatedDeclaration;
  }

  async listDeclarationsBySupplier(supplierId: number): Promise<Declaration[]> {
    return await db
      .select()
      .from(schema.declarations)
      .where(eq(schema.declarations.supplierId, supplierId));
  }

  async listDeclarationsByType(type: string): Promise<Declaration[]> {
    return await db
      .select()
      .from(schema.declarations)
      .where(eq(schema.declarations.type, type));
  }

  async listDeclarations(): Promise<Declaration[]> {
    return await db.select().from(schema.declarations);
  }

  // Document management
  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(schema.documents).where(eq(schema.documents.id, id));
    return document;
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const [document] = await db.insert(schema.documents).values(insertDocument).returning();
    return document;
  }

  async updateDocument(id: number, updateData: Partial<InsertDocument>): Promise<Document | undefined> {
    const [updatedDocument] = await db
      .update(schema.documents)
      .set(updateData)
      .where(eq(schema.documents.id, id))
      .returning();
    return updatedDocument;
  }

  async listDocumentsBySupplier(supplierId: number): Promise<Document[]> {
    return await db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.supplierId, supplierId));
  }

  async listDocuments(): Promise<Document[]> {
    return await db.select().from(schema.documents);
  }

  // Activity tracking
  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [createdActivity] = await db.insert(schema.activities).values(activity).returning();
    return createdActivity;
  }

  async listRecentActivities(limit: number): Promise<Activity[]> {
    return await db
      .select()
      .from(schema.activities)
      .orderBy(desc(schema.activities.timestamp))
      .limit(limit);
  }

  // Task management
  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, id));
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [createdTask] = await db.insert(schema.tasks).values(task).returning();
    return createdTask;
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined> {
    const [updatedTask] = await db
      .update(schema.tasks)
      .set(task)
      .where(eq(schema.tasks.id, id))
      .returning();
    return updatedTask;
  }

  async listTasksByAssignee(userId: number): Promise<Task[]> {
    return await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.assignedTo, userId));
  }

  async listUpcomingTasks(limit: number): Promise<Task[]> {
    const now = new Date();
    return await db
      .select()
      .from(schema.tasks)
      .where(
        and(
          eq(schema.tasks.completed, false),
          gte(schema.tasks.dueDate, now)
        )
      )
      .orderBy(asc(schema.tasks.dueDate))
      .limit(limit);
  }

  // Risk categories
  async getRiskCategory(id: number): Promise<RiskCategory | undefined> {
    const [category] = await db.select().from(schema.riskCategories).where(eq(schema.riskCategories.id, id));
    return category;
  }

  async createRiskCategory(category: InsertRiskCategory): Promise<RiskCategory> {
    const [createdCategory] = await db.insert(schema.riskCategories).values(category).returning();
    return createdCategory;
  }

  async listRiskCategories(): Promise<RiskCategory[]> {
    return await db.select().from(schema.riskCategories);
  }

  // Compliance metrics
  async getCurrentComplianceMetrics(): Promise<ComplianceMetric | undefined> {
    const [metric] = await db
      .select()
      .from(schema.complianceMetrics)
      .orderBy(desc(schema.complianceMetrics.date))
      .limit(1);
    return metric;
  }

  async createComplianceMetrics(metrics: InsertComplianceMetric): Promise<ComplianceMetric> {
    const [createdMetric] = await db.insert(schema.complianceMetrics).values(metrics).returning();
    return createdMetric;
  }

  async getComplianceHistory(months: number): Promise<ComplianceMetric[]> {
    const now = new Date();
    const startDate = new Date();
    startDate.setMonth(now.getMonth() - months);

    return await db
      .select()
      .from(schema.complianceMetrics)
      .where(
        and(
          gte(schema.complianceMetrics.date, startDate),
          lte(schema.complianceMetrics.date, now)
        )
      )
      .orderBy(asc(schema.complianceMetrics.date));
  }

  // Self-Assessment Questionnaires (SAQs)
  async getSaq(id: number): Promise<Saq | undefined> {
    const [saq] = await db.select().from(schema.saqs).where(eq(schema.saqs.id, id));
    return saq;
  }

  async createSaq(saq: InsertSaq): Promise<Saq> {
    const [createdSaq] = await db.insert(schema.saqs).values({
      ...saq,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return createdSaq;
  }

  async updateSaq(id: number, updateData: Partial<InsertSaq>): Promise<Saq | undefined> {
    const [updatedSaq] = await db
      .update(schema.saqs)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(schema.saqs.id, id))
      .returning();
    return updatedSaq;
  }

  async listSaqsBySupplier(supplierId: number, status?: string): Promise<Saq[]> {
    if (status) {
      return await db
        .select()
        .from(schema.saqs)
        .where(
          and(
            eq(schema.saqs.supplierId, supplierId),
            eq(schema.saqs.status, status)
          )
        );
    }
    return await db
      .select()
      .from(schema.saqs)
      .where(eq(schema.saqs.supplierId, supplierId));
  }

  async listSaqsByCustomer(customerId: number): Promise<Saq[]> {
    return await db
      .select()
      .from(schema.saqs)
      .where(eq(schema.saqs.customerId, customerId));
  }

  async getSaqStats(supplierId: number): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  }> {
    const saqs = await db
      .select()
      .from(schema.saqs)
      .where(eq(schema.saqs.supplierId, supplierId));

    return {
      total: saqs.length,
      pending: saqs.filter((saq) => saq.status === "pending").length,
      inProgress: saqs.filter((saq) => saq.status === "in-progress").length,
      completed: saqs.filter((saq) => saq.status === "completed").length,
    };
  }

  // Entity management
  async getEntity(id: number): Promise<Entity | undefined> {
    const [entity] = await db.select().from(schema.entities).where(eq(schema.entities.id, id));
    return entity;
  }

  async getEntityByEmail(email: string): Promise<Entity | undefined> {
    const [entity] = await db.select().from(schema.entities).where(eq(schema.entities.email, email));
    return entity;
  }

  async createEntity(insertEntity: InsertEntity): Promise<Entity> {
    // Set trial end date to 15 days from now
    const now = new Date();
    const trialEndDate = new Date(now);
    trialEndDate.setDate(trialEndDate.getDate() + 15);

    const [entity] = await db.insert(schema.entities).values({
      ...insertEntity,
      trialStartDate: now,
      trialEndDate: trialEndDate,
    }).returning();

    return entity;
  }

  async updateEntity(id: number, updateData: Partial<InsertEntity>): Promise<Entity | undefined> {
    const [updatedEntity] = await db
      .update(schema.entities)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(schema.entities.id, id))
      .returning();
    return updatedEntity;
  }

  async listEntities(status?: string, registrationStatus?: string): Promise<Entity[]> {
    if (status && registrationStatus) {
      return await db
        .select()
        .from(schema.entities)
        .where(
          and(
            eq(schema.entities.status, status),
            eq(schema.entities.registrationStatus, registrationStatus)
          )
        );
    } else if (status) {
      return await db
        .select()
        .from(schema.entities)
        .where(eq(schema.entities.status, status));
    } else if (registrationStatus) {
      return await db
        .select()
        .from(schema.entities)
        .where(eq(schema.entities.registrationStatus, registrationStatus));
    }
    return await db.select().from(schema.entities);
  }

  async getEntityStats(): Promise<{
    total: number;
    freeTrial: number;
    licensed: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    const entities = await db.select().from(schema.entities);

    return {
      total: entities.length,
      freeTrial: entities.filter((e) => e.status === "freeTrial").length,
      licensed: entities.filter((e) => e.status === "licensed").length,
      pending: entities.filter((e) => e.registrationStatus === "pending").length,
      approved: entities.filter((e) => e.registrationStatus === "approved").length,
      rejected: entities.filter((e) => e.registrationStatus === "rejected").length,
    };
  }

  // Entity modules management
  async getEntityModules(entityId: number): Promise<EntityModule | undefined> {
    const [module] = await db
      .select()
      .from(schema.entityModules)
      .where(eq(schema.entityModules.entityId, entityId));
    return module;
  }

  async createEntityModules(modules: InsertEntityModule): Promise<EntityModule> {
    const [entityModule] = await db
      .insert(schema.entityModules)
      .values(modules)
      .returning();
    return entityModule;
  }

  async updateEntityModules(entityId: number, updateData: Partial<InsertEntityModule>): Promise<EntityModule | undefined> {
    // First check if modules exist for this entity
    const [existingModule] = await db
      .select()
      .from(schema.entityModules)
      .where(eq(schema.entityModules.entityId, entityId));

    if (!existingModule) {
      // Create if doesn't exist
      return this.createEntityModules({
        entityId,
        ...updateData
      });
    }

    // Update if exists
    const [updatedModule] = await db
      .update(schema.entityModules)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(schema.entityModules.entityId, entityId))
      .returning();
    return updatedModule;
  }

  // Invitation management
  async getInvitation(id: number): Promise<Invitation | undefined> {
    const [invitation] = await db
      .select()
      .from(schema.invitations)
      .where(eq(schema.invitations.id, id));
    return invitation;
  }

  async getInvitationByToken(token: string): Promise<Invitation | undefined> {
    const [invitation] = await db
      .select()
      .from(schema.invitations)
      .where(eq(schema.invitations.token, token));
    return invitation;
  }

  async getInvitationByEmail(email: string): Promise<Invitation | undefined> {
    const [invitation] = await db
      .select()
      .from(schema.invitations)
      .where(eq(schema.invitations.email, email));
    return invitation;
  }

  async createInvitation(insertInvitation: InsertInvitation): Promise<Invitation> {
    // If expiresAt is not set, default to 7 days from now
    const expiresAt = insertInvitation.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [invitation] = await db
      .insert(schema.invitations)
      .values({
        ...insertInvitation,
        expiresAt,
      })
      .returning();
    return invitation;
  }

  async updateInvitation(id: number, updateData: Partial<InsertInvitation>): Promise<Invitation | undefined> {
    const [updatedInvitation] = await db
      .update(schema.invitations)
      .set(updateData)
      .where(eq(schema.invitations.id, id))
      .returning();
    return updatedInvitation;
  }

  async listInvitations(status?: string): Promise<Invitation[]> {
    if (status) {
      return await db
        .select()
        .from(schema.invitations)
        .where(eq(schema.invitations.status, status));
    }
    return await db.select().from(schema.invitations);
  }

  // Customer management
  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.id, id));
    return customer;
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const [customer] = await db
      .insert(schema.customers)
      .values(insertCustomer)
      .returning();
    return customer;
  }

  async updateCustomer(id: number, updateData: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [updatedCustomer] = await db
      .update(schema.customers)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(schema.customers.id, id))
      .returning();
    return updatedCustomer;
  }

  async listCustomers(type?: string): Promise<Customer[]> {
    if (type) {
      return await db
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.type, type));
    }
    return await db.select().from(schema.customers);
  }
  
  async getCustomerStats(): Promise<{
    total: number;
    business: number;
    individual: number;
  }> {
    const customers = await db.select().from(schema.customers);
    
    return {
      total: customers.length,
      business: customers.filter(c => c.type === "business").length,
      individual: customers.filter(c => c.type === "individual").length
    };
  }
  
  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    const [customer] = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.email, email));
      
    return customer;
  }
  
  async listDeclarationsByCustomer(customerId: number): Promise<Declaration[]> {
    return await db
      .select()
      .from(schema.declarations)
      .where(eq(schema.declarations.customerId, customerId))
      .orderBy(desc(schema.declarations.createdAt));
  }
  
  async listDocumentsByCustomer(customerId: number): Promise<Document[]> {
    // Since the Document schema doesn't have a customerId field directly,
    // we would need to add a join with declarations or another relation table
    // For now, we'll return an empty array to satisfy the interface
    return [];
  }
  
  async getDeclarationStats(): Promise<{
    total: number;
    inbound: number;
    outbound: number;
    approved: number;
    pending: number;
    review: number;
    rejected: number;
  }> {
    const declarations = await db.select().from(schema.declarations);
    
    return {
      total: declarations.length,
      inbound: declarations.filter(d => d.type === "inbound").length,
      outbound: declarations.filter(d => d.type === "outbound").length,
      approved: declarations.filter(d => d.status === "approved").length,
      pending: declarations.filter(d => d.status === "pending").length,
      review: declarations.filter(d => d.status === "review").length,
      rejected: declarations.filter(d => d.status === "rejected").length
    };
  }

  // In a real implementation, we'd use connect-pg-simple for the session store
  // Supplier Activation Tokens
  async createActivationToken(token: InsertSupplierActivationToken): Promise<SupplierActivationToken> {
    const [createdToken] = await db.insert(schema.supplierActivationTokens).values(token).returning();
    return createdToken;
  }

  async getActivationTokenByToken(token: string): Promise<SupplierActivationToken | undefined> {
    const [tokenData] = await db
      .select()
      .from(schema.supplierActivationTokens)
      .where(eq(schema.supplierActivationTokens.token, token));
    return tokenData;
  }

  async markActivationTokenAsUsed(id: number): Promise<boolean> {
    try {
      await db
        .update(schema.supplierActivationTokens)
        .set({ used: true })
        .where(eq(schema.supplierActivationTokens.id, id));
      return true;
    } catch (error) {
      console.error('Error marking token as used:', error);
      return false;
    }
  }

  // Product methods
  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(schema.products).where(eq(schema.products.id, id));
    return product;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db.insert(schema.products).values(insertProduct).returning();
    return product;
  }

  async updateProduct(id: number, updateData: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updatedProduct] = await db
      .update(schema.products)
      .set(updateData)
      .where(eq(schema.products.id, id))
      .returning();
    
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const [deletedProduct] = await db
      .delete(schema.products)
      .where(eq(schema.products.id, id))
      .returning();
    
    return !!deletedProduct;
  }

  async listProducts(productType?: string, entityId?: number): Promise<Product[]> {
    // Start with a simple query
    if (productType && entityId) {
      return await db.select()
        .from(schema.products)
        .where(and(
          eq(schema.products.productType, productType),
          eq(schema.products.entityId, entityId)
        ))
        .orderBy(desc(schema.products.createdAt));
    } else if (productType) {
      return await db.select()
        .from(schema.products)
        .where(eq(schema.products.productType, productType))
        .orderBy(desc(schema.products.createdAt));
    } else if (entityId) {
      return await db.select()
        .from(schema.products)
        .where(eq(schema.products.entityId, entityId))
        .orderBy(desc(schema.products.createdAt));
    } else {
      return await db.select()
        .from(schema.products)
        .orderBy(desc(schema.products.createdAt));
    }
  }

  // For now, we'll keep it simple with a session property
  sessionStore = {
    all: async (callback: (err: any, sessions: any) => void) => { callback(null, {}); },
    destroy: async (sid: string, callback: (err: any) => void) => { callback(null); },
    clear: async (callback: (err: any) => void) => { callback(null); },
    length: async (callback: (err: any, length: number) => void) => { callback(null, 0); },
    get: async (sid: string, callback: (err: any, session: any) => void) => { callback(null, null); },
    set: async (sid: string, session: any, callback: (err: any) => void) => { callback(null); },
    touch: async (sid: string, session: any, callback: (err: any) => void) => { callback(null); },
  };

  // Init function to create database tables and seed data
  async init() {
    console.log("Initializing database tables and seed data");

    try {
      // If there are no users, create an admin user
      const users = await db.select().from(schema.users);
      if (users.length === 0) {
        await db.insert(schema.users).values({
          username: "admin",
          password: "admin123", // In a real app, this would be hashed
          email: "admin@tracex.com",
          role: "platform_admin",
          fullName: "Platform Admin",
          phoneNumber: null, // Add phoneNumber field with null value for existing users
        });

        // Add a user persona for EU Operator
        await db.insert(schema.users).values({
          username: "euoperator",
          password: "password123",
          email: "eu.operator@example.com",
          role: "user",
          fullName: "EU Operator",
          phoneNumber: null, // Add phoneNumber field with null value for existing users
        });

        console.log("Created admin user");
      }

      // Create some risk categories if none exist
      const categories = await db.select().from(schema.riskCategories);
      if (categories.length === 0) {
        const riskCategorySeed = [
          { name: "High Risk - Immediate Action", score: 75, color: "red" },
          { name: "Medium Risk - Monitoring Required", score: 50, color: "amber" },
          { name: "Low Risk - Regular Review", score: 25, color: "yellow" },
          { name: "Compliant - No Action", score: 10, color: "green" },
        ];

        for (const category of riskCategorySeed) {
          await this.createRiskCategory(category);
        }
        console.log("Created risk categories");
      }

      // Add initial compliance metrics if none exist
      const metrics = await db.select().from(schema.complianceMetrics);
      if (metrics.length === 0) {
        // Create 6 months of mock compliance metrics
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 6);

        for (let i = 0; i <= 6; i++) {
          const date = new Date(startDate);
          date.setMonth(date.getMonth() + i);

          // Gradually improve compliance over time (for demo)
          const baseCompliance = 60 + (i * 3);
          const variance = Math.floor(Math.random() * 10) - 5; // random -5 to +5

          await db.insert(schema.complianceMetrics).values({
            date,
            overallCompliance: Math.min(100, baseCompliance + variance),
            documentStatus: Math.min(100, baseCompliance + variance + 5),
            supplierCompliance: Math.min(100, baseCompliance + variance - 5),
            riskLevel: i < 3 ? "Medium" : "Low",
            issuesDetected: 20 - (i * 2),
          });
        }
        console.log("Created compliance metrics history");
      }

      // Add demo entities if none exist
      const entities = await db.select().from(schema.entities);
      if (entities.length === 0) {
        // Demo entities
        const entitySeed = [
          {
            name: "Compliance Corp International",
            email: "info@compliance-corp.example",
            phone: "+15551234567",
            website: "https://compliance-corp.example",
            country: "United States",
            address: "123 Compliance Ave, New York, NY 10001",
            registrationNumber: "US789456123",
            taxId: "TAX-987654321",
            status: "licensed",
            registrationStatus: "approved",
          },
          {
            name: "EcoTech Solutions GmbH",
            email: "contact@ecotech.example",
            phone: "+49301234567",
            website: "https://ecotech.example",
            country: "Germany",
            address: "Berliner Str. 45, 10115 Berlin",
            registrationNumber: "DE123456789",
            taxId: "VAT-DE987654321",
            status: "freeTrial",
            registrationStatus: "approved",
          },
          {
            name: "Green Supply Chain Ltd",
            email: "info@greensupply.example",
            phone: "+44201234567",
            website: "https://greensupply.example",
            country: "United Kingdom",
            address: "45 Green St, London EC1M 6BY",
            registrationNumber: "UK456789123",
            taxId: "VAT-GB123456789",
            status: "freeTrial",
            registrationStatus: "pending",
          }
        ];

        for (const entity of entitySeed) {
          const createdEntity = await this.createEntity(entity);

          // For the licensed entity, enable all modules
          if (entity.status === "licensed") {
            await this.createEntityModules({
              entityId: createdEntity.id,
              supplierOnboarding: true,
              customerOnboarding: true,
              eudrDeclaration: true,
              supplierAssessment: true,
            });
          } else {
            // For free trial entities, enable basic modules
            await this.createEntityModules({
              entityId: createdEntity.id,
              supplierOnboarding: true,
              customerOnboarding: false,
              eudrDeclaration: true,
              supplierAssessment: false,
            });
          }
        }
        console.log("Created demo entities");
      }

      // Add demo invitations
      try {
        console.log("Checking for existing invitations...");
        // Use direct SQL to avoid full schema selection with potentially missing columns
        const { rows } = await pool.query('SELECT COUNT(*) FROM invitations');
        const invitationCount = parseInt(rows[0].count);
        console.log(`Found ${invitationCount} existing invitations in the database`);
        
        // If no invitations exist, add demo data
        if (invitationCount === 0) {
          // Import and run the demo invitations script
          // Use dynamic import for ES modules compatibility
          const { default: addDemoInvitations } = await import('./add-demo-invitations');
          await addDemoInvitations();
        }
      } catch (error) {
        console.error("Error checking or adding invitations:", error);
      }
      
      // Add demo products
      try {
        // Import and run the demo products script
        const { default: addDemoProducts } = await import('./add-demo-products');
        await addDemoProducts();
      } catch (error) {
        console.error("Error adding demo products:", error);
      }

      // Add demo SAQs for suppliers
      try {
        console.log("Checking for existing SAQs...");
        const existingSaqs = await db.select().from(schema.saqs);
        console.log(`Found ${existingSaqs.length} existing SAQs in the database`);
        
        if (existingSaqs.length === 0) {
          console.log("Adding demo SAQs...");
          await this.createDemoSaqs();
        }
      } catch (error) {
        console.error("Error checking or adding SAQs:", error);
      }

      // Skip adding demo suppliers - we already added them via direct SQL

      console.log("Database initialization complete");
    } catch (error) {
      console.error("Error initializing database:", error);
    }
  }

  private async createDemoSaqs() {
    try {
      // Get existing suppliers and customers for SAQ assignment
      const suppliers = await db.select().from(schema.suppliers).limit(5);
      const customers = await db.select().from(schema.customers).limit(3);

      if (suppliers.length === 0 || customers.length === 0) {
        console.log("No suppliers or customers found, skipping SAQ creation");
        return;
      }

      const saqTemplates = [
        {
          title: "EUDR Compliance Assessment",
          description: "Comprehensive assessment for European Union Deforestation Regulation compliance covering supply chain traceability and due diligence requirements.",
          status: "completed",
          score: 85,
          answers: {
            "supply_chain_mapping": "Yes",
            "traceability_documentation": "Comprehensive documentation available",
            "risk_assessment_conducted": "Yes",
            "due_diligence_procedures": "Implemented and regularly reviewed",
            "certification_status": "FSC and PEFC certified",
            "geographic_origin_tracking": "GPS coordinates available for all sources",
            "supplier_verification": "Annual third-party audits conducted"
          }
        },
        {
          title: "Sustainability and Environmental Impact",
          description: "Assessment of environmental practices, sustainability initiatives, and carbon footprint reduction measures in the supply chain.",
          status: "in-progress",
          score: 72,
          answers: {
            "carbon_footprint_measurement": "Yes, measured quarterly",
            "renewable_energy_usage": "60% renewable energy in operations",
            "waste_reduction_programs": "Zero waste to landfill achieved",
            "water_conservation": "Implemented water recycling systems",
            "biodiversity_protection": "Active reforestation programs"
          }
        },
        {
          title: "Quality Management System",
          description: "Evaluation of quality control processes, certifications, and continuous improvement practices.",
          status: "completed",
          score: 92,
          answers: {
            "iso_certification": "ISO 9001:2015 certified",
            "quality_control_procedures": "Statistical process control implemented",
            "customer_satisfaction": "Net Promoter Score: 8.5/10",
            "continuous_improvement": "Lean Six Sigma methodologies",
            "corrective_action_process": "Root cause analysis protocol"
          }
        },
        {
          title: "Supply Chain Risk Assessment",
          description: "Comprehensive evaluation of supply chain risks including operational, financial, and regulatory risks.",
          status: "pending",
          score: null,
          answers: {}
        },
        {
          title: "Labor Rights and Social Responsibility",
          description: "Assessment of labor practices, worker safety, fair wages, and community engagement initiatives.",
          status: "in-progress",
          score: 78,
          answers: {
            "fair_labor_practices": "ILO standards compliance verified",
            "worker_safety_programs": "Zero accident policy implemented",
            "wage_equity": "Living wage standards met",
            "community_engagement": "Local hiring: 85% of workforce",
            "diversity_inclusion": "Gender parity achieved in management"
          }
        },
        {
          title: "Data Security and Privacy",
          description: "Evaluation of information security measures, data protection policies, and cybersecurity practices.",
          status: "completed",
          score: 88,
          answers: {
            "iso_27001_certification": "Yes, certified",
            "data_encryption": "AES-256 encryption for all data",
            "access_controls": "Multi-factor authentication required",
            "incident_response": "24/7 SOC monitoring",
            "privacy_compliance": "GDPR and CCPA compliant"
          }
        },
        {
          title: "Financial Stability Assessment",
          description: "Review of financial health, creditworthiness, and business continuity planning.",
          status: "completed",
          score: 81,
          answers: {
            "credit_rating": "A+ rating maintained",
            "financial_audits": "Annual independent audits",
            "business_continuity": "Disaster recovery plan tested quarterly",
            "insurance_coverage": "Comprehensive liability coverage",
            "cash_flow_management": "Positive cash flow for 5+ years"
          }
        },
        {
          title: "Innovation and Technology Adoption",
          description: "Assessment of technological capabilities, innovation processes, and digital transformation initiatives.",
          status: "in-progress",
          score: 75,
          answers: {
            "digital_transformation": "50% processes digitalized",
            "automation_level": "Robotic process automation implemented",
            "innovation_investment": "5% of revenue invested in R&D",
            "technology_partnerships": "Strategic partnerships with tech leaders"
          }
        }
      ];

      // Create SAQs by distributing templates across suppliers and customers
      let saqCount = 0;
      for (let i = 0; i < saqTemplates.length; i++) {
        const template = saqTemplates[i];
        const supplier = suppliers[i % suppliers.length];
        const customer = customers[i % customers.length];

        const daysAgo = Math.floor(Math.random() * 30) + 1;
        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - daysAgo);

        const updatedAt = new Date(createdAt);
        if (template.status !== "pending") {
          updatedAt.setDate(updatedAt.getDate() + Math.floor(Math.random() * 10) + 1);
        }

        let completedAt = null;
        if (template.status === "completed") {
          completedAt = new Date(updatedAt);
          completedAt.setDate(completedAt.getDate() + Math.floor(Math.random() * 5) + 1);
        }

        await db.insert(schema.saqs).values({
          title: template.title,
          description: template.description,
          customerId: customer.id,
          supplierId: supplier.id,
          status: template.status,
          createdAt,
          updatedAt,
          completedAt,
          score: template.score,
          answers: template.answers,
        });

        saqCount++;
      }

      console.log(`Created ${saqCount} demo SAQs`);
    } catch (error) {
      console.error("Error creating demo SAQs:", error);
    }
  }

  // Role management methods
  async getRole(id: number): Promise<Role | undefined> {
    const [role] = await db.select().from(schema.roles).where(eq(schema.roles.id, id));
    return role;
  }

  async createRole(role: InsertRole): Promise<Role> {
    const [newRole] = await db.insert(schema.roles).values(role).returning();
    return newRole;
  }

  async updateRole(id: number, role: Partial<InsertRole>): Promise<Role | undefined> {
    const [updatedRole] = await db
      .update(schema.roles)
      .set({ ...role, updatedAt: new Date() })
      .where(eq(schema.roles.id, id))
      .returning();
    return updatedRole;
  }

  async deleteRole(id: number): Promise<boolean> {
    const result = await db.delete(schema.roles).where(eq(schema.roles.id, id));
    return result.rowCount > 0;
  }

  async listRoles(entityId: number): Promise<Role[]> {
    return await db
      .select()
      .from(schema.roles)
      .where(eq(schema.roles.entityId, entityId))
      .orderBy(asc(schema.roles.name));
  }

  async getRoleByName(name: string, entityId: number): Promise<Role | undefined> {
    const [role] = await db
      .select()
      .from(schema.roles)
      .where(and(eq(schema.roles.name, name), eq(schema.roles.entityId, entityId)));
    return role;
  }

  // Export/Import methods
  async getAllSuppliers(): Promise<Supplier[]> {
    return await db.select().from(schema.suppliers).orderBy(asc(schema.suppliers.name));
  }

  async getAllDeclarations(): Promise<Declaration[]> {
    return await db.select().from(schema.declarations).orderBy(desc(schema.declarations.createdAt));
  }

  async getAllDocuments(): Promise<Document[]> {
    return await db.select().from(schema.documents).orderBy(desc(schema.documents.uploadedAt));
  }

  async getAllSAQs(): Promise<Saq[]> {
    return await db.select().from(schema.saqs).orderBy(desc(schema.saqs.createdAt));
  }

  async getAllActivities(): Promise<Activity[]> {
    return await db.select().from(schema.activities).orderBy(desc(schema.activities.timestamp));
  }

  async getAllCustomers(): Promise<Customer[]> {
    return await db.select().from(schema.customers).orderBy(asc(schema.customers.firstName));
  }

  async getAllComplianceMetrics(): Promise<ComplianceMetric[]> {
    return await db.select().from(schema.complianceMetrics).orderBy(desc(schema.complianceMetrics.date));
  }

  async getAllRiskCategories(): Promise<RiskCategory[]> {
    return await db.select().from(schema.riskCategories).orderBy(asc(schema.riskCategories.name));
  }

  async getDeclarationByProductAndSupplier(productName: string, supplierId: number): Promise<Declaration | undefined> {
    const [declaration] = await db
      .select()
      .from(schema.declarations)
      .where(and(
        eq(schema.declarations.productName, productName),
        eq(schema.declarations.supplierId, supplierId)
      ));
    return declaration;
  }

  async getSupplierByEmail(email: string): Promise<Supplier | undefined> {
    const [supplier] = await db
      .select()
      .from(schema.suppliers)
      .where(eq(schema.suppliers.email, email));
    return supplier;
  }

  async createSAQ(saq: InsertSaq): Promise<Saq> {
    const [newSaq] = await db.insert(schema.saqs).values({
      ...saq,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return newSaq;
  }

  // Product management
  async searchProducts(query: string): Promise<Product[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }
    
    const searchTerm = `%${query.trim().toLowerCase()}%`;
    return await db
      .select()
      .from(schema.products)
      .where(
        sql`LOWER(${schema.products.name}) LIKE ${searchTerm}`
      )
      .limit(10)
      .orderBy(asc(schema.products.name));
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, id));
    return product;
  }
}

export const dbStorage = new DatabaseStorage();