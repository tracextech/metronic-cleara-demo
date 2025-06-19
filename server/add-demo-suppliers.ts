import { db } from './db';
import { suppliers } from '@shared/schema';

/**
 * Add demo suppliers to the database
 */
async function addDemoSuppliers() {
  try {
    // Check if suppliers already exist
    const existingSuppliers = await db.select({ count: db.fn.count() }).from(suppliers);
    const count = Number(existingSuppliers[0].count);
    console.log(`Found ${count} existing suppliers in the database`);
    
    if (count > 0) {
      console.log("Suppliers already exist, skipping demo data");
      return;
    }
    
    // Generate demo suppliers
    const demoSuppliers = [
      {
        name: "Acme Agriculture Inc.",
        partnerType: "supplier",
        partnerRole: "supplier",
        partnerRoleName: "supplier",
        country: "United States",
        email: "contact@acmeagriculture.com",
        contactName: "John Williams",
        phoneNumber: "+14155552671",
        status: "active"
      },
      {
        name: "Eco Farms Ltd",
        partnerType: "supplier",
        partnerRole: "supplier",
        partnerRoleName: "supplier",
        country: "Ghana",
        email: "info@ecofarms.com",
        contactName: "David Mensah",
        phoneNumber: "+233501234567",
        status: "active"
      },
      {
        name: "Green World Trading",
        partnerType: "supplier",
        partnerRole: "supplier",
        partnerRoleName: "supplier",
        country: "Brazil",
        email: "contact@greenworldtrading.com",
        contactName: "Carlos Silva",
        phoneNumber: "+5511987654321",
        status: "pending"
      },
      {
        name: "Natural Produce Co.",
        partnerType: "supplier",
        partnerRole: "supplier",
        partnerRoleName: "supplier",
        country: "Indonesia",
        email: "sales@naturalproduce.co.id",
        contactName: "Dewi Sari",
        phoneNumber: "+62215551234",
        status: "pending"
      },
      {
        name: "Sustainable Farms Group",
        partnerType: "supplier",
        partnerRole: "supplier",
        partnerRoleName: "supplier",
        country: "Colombia",
        email: "info@sustainablefarms.co",
        contactName: "Maria Rodriguez",
        phoneNumber: "+573105556789",
        status: "inactive"
      }
    ];
    
    // Insert demo suppliers
    const result = await db.insert(suppliers).values(demoSuppliers);
    
    console.log(`Successfully added ${demoSuppliers.length} demo suppliers`);
    return demoSuppliers.length;
  } catch (error) {
    console.error("Error adding demo suppliers:", error);
    return 0;
  }
}

export default addDemoSuppliers;