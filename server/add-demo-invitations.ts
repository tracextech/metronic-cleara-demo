import { pool } from './db';
import { randomUUID } from 'crypto';
import { addDays, format } from 'date-fns';

/**
 * Add demo invitations to the database
 */
async function addDemoInvitations() {
  console.log('Adding demo invitations...');
  
  // Check if invitations already exist using direct SQL
  try {
    const { rows } = await pool.query('SELECT COUNT(*) FROM invitations');
    const count = parseInt(rows[0].count);
    
    if (count > 0) {
      console.log(`Found ${count} existing invitations in the database`);
      return;
    }
    
    // Create demo invitations with different statuses
    const demoInvitations = [
      {
        email: 'john.smith@acmetrading.com',
        name: 'John Smith (Acme Trading Co.)',
        token: randomUUID(),
        status: 'pending',
        invitedBy: 1, // Admin user ID
        expiresAt: addDays(new Date(), 14),
      },
      {
        email: 'sarah.johnson@greenforest.org',
        name: 'Sarah Johnson (Green Forest Industries)',
        token: randomUUID(),
        status: 'accepted',
        invitedBy: 1,
        expiresAt: addDays(new Date(), 4),
      },
      {
        email: 'michael.wong@pacificimports.com',
        name: 'Michael Wong (Pacific Imports Ltd.)',
        token: randomUUID(),
        status: 'pending',
        invitedBy: 1,
        expiresAt: addDays(new Date(), 12),
      },
      {
        email: 'emily.rodriguez@globalfoods.com',
        name: 'Emily Rodriguez (Global Foods Corporation)',
        token: randomUUID(),
        status: 'pending',
        invitedBy: 1,
        expiresAt: addDays(new Date(), 13),
      },
      {
        email: 'david.kumar@ecoforest.com',
        name: 'David Kumar (EcoForest Sustainable Products)',
        token: randomUUID(),
        status: 'expired',
        invitedBy: 1,
        expiresAt: addDays(new Date(), -6),
      }
    ];
    
    // Insert invitations into database
    for (const invitation of demoInvitations) {
      const query = `
        INSERT INTO invitations (
          email, 
          name, 
          token, 
          status,
          invited_by, 
          created_at, 
          expires_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)
      `;
      
      const values = [
        invitation.email,
        invitation.name,
        invitation.token,
        invitation.status,
        invitation.invitedBy,
        format(invitation.expiresAt, 'yyyy-MM-dd HH:mm:ss')
      ];
      
      await pool.query(query, values);
    }
    
    // Update license status for some invitations
    try {
      // First check if the column exists
      const { rows: columnCheck } = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'invitations' AND column_name = 'license_status'
      `);
      
      // If the license_status column exists, update the values
      if (columnCheck && columnCheck.length > 0) {
        await pool.query(`
          UPDATE invitations 
          SET license_status = 'licensed' 
          WHERE email IN ('sarah.johnson@greenforest.org', 'emily.rodriguez@globalfoods.com')
        `);
        console.log("License status updated for selected invitations");
      } else {
        console.log("license_status column does not exist yet - skipping update");
      }
    } catch (error) {
      console.error("Error updating license status:", error);
    }
    
    console.log(`Successfully added ${demoInvitations.length} demo invitations`);
  } catch (error) {
    console.error('Error adding demo invitations:', error);
    throw error;
  }
}

export default addDemoInvitations;