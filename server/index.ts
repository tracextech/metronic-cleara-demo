import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { dbStorage } from "./database-storage";
// Remove the sqlite import
import * as schemaObj from "../shared/schema";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { db, pool } from "./db";
import { spawn } from "child_process";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Initialize database schema (preserve existing data)
    log("Ensuring database schema exists...");
    
    // Only create tables if they don't exist - never drop existing data
    const ensureSchema = async () => {
      try {
        // Check if core tables exist
        const { rows } = await pool.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name IN ('users', 'suppliers', 'declarations')
        `);
        
        if (rows.length === 0) {
          log("Creating new database schema...");
          const query = `
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            full_name TEXT,
            avatar TEXT,
            phone_number TEXT,
            role TEXT DEFAULT 'user',
            created_at TIMESTAMP DEFAULT NOW(),
            trial_start_date TIMESTAMP DEFAULT NOW(),
            trial_end_date TIMESTAMP,
            subscription_status TEXT DEFAULT 'trial',
            entity_id INTEGER,
            registration_status TEXT DEFAULT 'approved'
          );
          
          CREATE TABLE IF NOT EXISTS suppliers (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            partner_type TEXT NOT NULL,
            partner_role TEXT NOT NULL,
            partner_role_name TEXT NOT NULL,
            domain TEXT,
            website TEXT,
            registration_type TEXT,
            category TEXT,
            incorporation_date TIMESTAMP,
            address_type TEXT,
            address_line1 TEXT,
            address_line2 TEXT,
            city TEXT,
            state TEXT,
            postal_code TEXT,
            country TEXT,
            business_registration TEXT,
            business_address TEXT,
            contact_name TEXT,
            phone_number TEXT,
            email TEXT,
            contact_person TEXT,
            registration_number TEXT,
            products TEXT,
            products_list TEXT[],
            compliance_score INTEGER DEFAULT 50,
            risk_level TEXT DEFAULT 'medium',
            risk_score INTEGER DEFAULT 50,
            status TEXT DEFAULT 'pending',
            last_updated TIMESTAMP DEFAULT NOW()
          );
          
          CREATE TABLE IF NOT EXISTS declarations (
            id SERIAL PRIMARY KEY,
            type TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT NOW(),
            last_updated TIMESTAMP DEFAULT NOW(),
            supplier_id INTEGER REFERENCES suppliers(id),
            customer_id INTEGER,
            product_name TEXT NOT NULL,
            product_description TEXT,
            hsn_code TEXT,
            quantity DECIMAL,
            unit TEXT,
            rm_id TEXT,
            trader_name TEXT,
            trader_address TEXT,
            trader_country TEXT,
            country_of_production TEXT,
            geo_location TEXT,
            verification_reference TEXT,
            eudr_reference TEXT,
            inspection_reference TEXT,
            compliance_status TEXT
          );
          
          CREATE TABLE IF NOT EXISTS documents (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            size INTEGER,
            upload_path TEXT,
            uploaded_at TIMESTAMP DEFAULT NOW(),
            supplier_id INTEGER REFERENCES suppliers(id),
            customer_id INTEGER,
            declaration_id INTEGER REFERENCES declarations(id)
          );
          
          CREATE TABLE IF NOT EXISTS activities (
            id SERIAL PRIMARY KEY,
            type TEXT NOT NULL,
            description TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT NOW(),
            user_id INTEGER,
            supplier_id INTEGER REFERENCES suppliers(id),
            customer_id INTEGER,
            declaration_id INTEGER REFERENCES declarations(id)
          );
          
          CREATE TABLE IF NOT EXISTS tasks (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'pending',
            priority TEXT DEFAULT 'medium',
            assigned_to INTEGER,
            due_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            supplier_id INTEGER REFERENCES suppliers(id),
            customer_id INTEGER,
            declaration_id INTEGER REFERENCES declarations(id)
          );
          
          CREATE TABLE IF NOT EXISTS risk_categories (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            severity TEXT DEFAULT 'medium',
            created_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE TABLE IF NOT EXISTS compliance_metrics (
            id SERIAL PRIMARY KEY,
            overall_score INTEGER DEFAULT 0,
            supplier_compliance INTEGER DEFAULT 0,
            document_completeness INTEGER DEFAULT 0,
            risk_assessment INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE TABLE IF NOT EXISTS saqs (
            id SERIAL PRIMARY KEY,
            supplier_id INTEGER REFERENCES suppliers(id),
            customer_id INTEGER,
            title TEXT NOT NULL,
            description TEXT,
            questions JSONB,
            responses JSONB,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            due_date TIMESTAMP
          );
          
          CREATE TABLE IF NOT EXISTS customers (
            id SERIAL PRIMARY KEY,
            type TEXT NOT NULL,
            company_name TEXT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            display_name TEXT,
            email TEXT NOT NULL,
            work_phone TEXT,
            mobile_phone TEXT,
            billing_attention TEXT,
            billing_country TEXT NOT NULL,
            billing_address_line1 TEXT NOT NULL,
            billing_address_line2 TEXT,
            billing_city TEXT NOT NULL,
            billing_state TEXT NOT NULL,
            billing_postal_code TEXT NOT NULL,
            same_as_billing BOOLEAN DEFAULT TRUE,
            shipping_attention TEXT,
            shipping_country TEXT,
            shipping_address_line1 TEXT,
            shipping_address_line2 TEXT,
            shipping_city TEXT,
            shipping_state TEXT,
            shipping_postal_code TEXT,
            gst_treatment TEXT,
            place_of_supply TEXT,
            pan TEXT,
            tax_preference TEXT DEFAULT 'taxable',
            currency TEXT DEFAULT 'USD',
            payment_terms TEXT DEFAULT 'dueOnReceipt',
            enable_portal BOOLEAN DEFAULT FALSE,
            portal_language TEXT DEFAULT 'english',
            registration_number TEXT,
            compliance_score INTEGER DEFAULT 50,
            risk_level TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE TABLE IF NOT EXISTS entities (
            id SERIAL PRIMARY KEY,
            company_name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            phone_number TEXT,
            business_registration TEXT,
            business_address TEXT,
            contact_name TEXT,
            registration_status TEXT DEFAULT 'pending',
            status TEXT DEFAULT 'freeTrial',
            trial_start_date TIMESTAMP DEFAULT NOW(),
            trial_end_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE TABLE IF NOT EXISTS entity_modules (
            id SERIAL PRIMARY KEY,
            entity_id INTEGER UNIQUE REFERENCES entities(id),
            supplier_management BOOLEAN DEFAULT TRUE,
            declarations BOOLEAN DEFAULT TRUE,
            document_management BOOLEAN DEFAULT TRUE,
            risk_assessment BOOLEAN DEFAULT TRUE,
            reporting BOOLEAN DEFAULT TRUE,
            compliance_tracking BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE TABLE IF NOT EXISTS invitations (
            id SERIAL PRIMARY KEY,
            entity_id INTEGER REFERENCES entities(id),
            email TEXT NOT NULL,
            token TEXT UNIQUE NOT NULL,
            status TEXT DEFAULT 'pending',
            invited_by TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            expires_at TIMESTAMP NOT NULL
          );
          
          CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            hsn_code TEXT,
            category TEXT,
            origin_country TEXT,
            risk_level TEXT DEFAULT 'medium',
            compliance_requirements JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE TABLE IF NOT EXISTS otp_codes (
            id SERIAL PRIMARY KEY,
            phone_number TEXT NOT NULL,
            code TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            expires_at TIMESTAMP NOT NULL,
            verified BOOLEAN DEFAULT FALSE
          );
        `;
          
          await pool.query(query);
          log("Schema created successfully");
        } else {
          log("Database schema already exists, preserving existing data");
        }
        return true;
      } catch (error) {
        console.error("Error ensuring schema:", error);
        return false;
      }
    };
    
    await ensureSchema();
    
    // Initialize database with seed data
    await dbStorage.init();
    
    const server = await registerRoutes(app);

    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      await setupVite(app, server);
    }
  
    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
      
      // Start map microservice with persistent monitoring
      const startMapService = () => {
        const mapService = spawn('node', ['server.js'], {
          cwd: './map-service',
          stdio: ['inherit', 'pipe', 'pipe'],
          detached: false
        });
        
        mapService.stdout?.on('data', (data) => {
          console.log(`[map-service] ${data.toString().trim()}`);
        });
        
        mapService.stderr?.on('data', (data) => {
          console.error(`[map-service] ERROR: ${data.toString().trim()}`);
        });
        
        mapService.on('error', (err) => {
          console.error(`[map-service] Failed to start: ${err}`);
          setTimeout(startMapService, 3000);
        });
        
        mapService.on('close', (code, signal) => {
          console.log(`[map-service] Process exited with code ${code}, signal ${signal}`);
          if (code !== 0 && code !== null) {
            console.log(`[map-service] Restarting in 3 seconds...`);
            setTimeout(startMapService, 3000);
          }
        });
        
        return mapService;
      };
      
      setTimeout(() => {
        startMapService();
        log(`map microservice monitoring started`);
      }, 1000);
      
      // Health check for map service
      setInterval(async () => {
        try {
          const response = await fetch('http://localhost:3001/health');
          if (!response.ok) {
            console.log(`[map-service] Health check failed, service may need restart`);
          }
        } catch (error) {
          console.log(`[map-service] Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }, 15000);
    });
  } catch (error) {
    console.error("Error during startup:", error);
    process.exit(1);
  }
})();