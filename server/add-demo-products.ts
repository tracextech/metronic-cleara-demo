import { pool } from './db';
import { format } from 'date-fns';

/**
 * Add demo products to the database
 */
async function addDemoProducts() {
  console.log('Adding demo products...');
  
  // Check if products already exist using direct SQL
  try {
    const { rows } = await pool.query('SELECT COUNT(*) FROM products');
    const count = parseInt(rows[0].count);
    
    if (count > 0) {
      console.log(`Found ${count} existing products in the database`);
      return;
    }
    
    // Create demo products with different types
    const demoProducts = [
      // Raw Materials
      {
        name: 'Palm Kernel',
        productCode: 'RM-PK-001',
        productType: 'raw_material',
        hsCode: '1511.10.00',
        entityId: 1
      },
      {
        name: 'Cocoa Beans',
        productCode: 'RM-CB-002',
        productType: 'raw_material',
        hsCode: '1801.00.00',
        entityId: 1
      },
      {
        name: 'Natural Rubber',
        productCode: 'RM-NR-003',
        productType: 'raw_material',
        hsCode: '4001.21.00',
        entityId: 1
      },
      {
        name: 'Coffee Beans (Unroasted)',
        productCode: 'RM-COF-004',
        productType: 'raw_material',
        hsCode: '0901.11.00',
        entityId: 1
      },
      {
        name: 'Timber (Teak Wood)',
        productCode: 'RM-TW-005',
        productType: 'raw_material',
        hsCode: '4403.49.00',
        entityId: 1
      },
      
      // Semi-Finished Goods
      {
        name: 'Refined Palm Oil',
        productCode: 'SF-RPO-001',
        productType: 'semi_finished_good',
        hsCode: '1511.90.10',
        entityId: 1
      },
      {
        name: 'Cocoa Butter',
        productCode: 'SF-CB-002',
        productType: 'semi_finished_good',
        hsCode: '1804.00.00',
        entityId: 1
      },
      {
        name: 'Rubber Sheets',
        productCode: 'SF-RS-003',
        productType: 'semi_finished_good',
        hsCode: '4001.22.00',
        entityId: 1
      },
      {
        name: 'Roasted Coffee Beans',
        productCode: 'SF-RCB-004',
        productType: 'semi_finished_good',
        hsCode: '0901.21.00',
        entityId: 1
      },
      {
        name: 'Processed Teak Planks',
        productCode: 'SF-PTP-005',
        productType: 'semi_finished_good',
        hsCode: '4407.29.00',
        entityId: 1
      },
      
      // Finished Goods
      {
        name: 'Cooking Oil (Bottled)',
        productCode: 'FG-CO-001',
        productType: 'finished_good',
        hsCode: '1516.20.00',
        entityId: 1
      },
      {
        name: 'Chocolate Bars',
        productCode: 'FG-CHO-002',
        productType: 'finished_good',
        hsCode: '1806.32.00',
        entityId: 1
      },
      {
        name: 'Tires',
        productCode: 'FG-TIR-003',
        productType: 'finished_good',
        hsCode: '4011.10.00',
        entityId: 1
      },
      {
        name: 'Packaged Coffee',
        productCode: 'FG-PCF-004',
        productType: 'finished_good',
        hsCode: '0901.22.00',
        entityId: 1
      },
      {
        name: 'Wooden Furniture',
        productCode: 'FG-WF-005',
        productType: 'finished_good',
        hsCode: '9403.60.00',
        entityId: 1
      }
    ];
    
    // Insert products into database using direct SQL
    for (const product of demoProducts) {
      const query = `
        INSERT INTO products (
          name, 
          product_code, 
          product_type, 
          hs_code, 
          entity_id,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `;
      
      const values = [
        product.name,
        product.productCode,
        product.productType,
        product.hsCode,
        product.entityId
      ];
      
      await pool.query(query, values);
    }
    
    console.log(`Successfully added ${demoProducts.length} demo products`);
  } catch (error) {
    console.error('Error adding demo products:', error);
    throw error;
  }
}

export default addDemoProducts;