import { db, pool } from './db';
import { products } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function initProductsTable() {
  console.log('Checking if products table exists...');
  
  try {
    // Check if products table exists
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'products'
      );
    `);
    
    const tableExists = result.rows[0].exists;
    
    if (!tableExists) {
      console.log('Creating products table...');
      
      // Create products table using the schema definition
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          product_code TEXT NOT NULL UNIQUE,
          product_type TEXT NOT NULL,
          hs_code TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          entity_id INTEGER NOT NULL
        );
      `);
      
      console.log('Products table created successfully');
    } else {
      console.log('Products table already exists');
    }
  } catch (error) {
    console.error('Error initializing products table:', error);
  }
}

export default initProductsTable;