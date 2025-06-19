import { sendEmail } from './utils/email';

/**
 * Send a test email to verify SendGrid integration
 */
async function sendTestEmail() {
  // Get an email address from the command line if provided
  const args = process.argv.slice(2);
  const recipientEmail = args[0] || 'app.testing@tracextech.com';
  
  console.log(`Sending test email to ${recipientEmail}...`);
  
  // Generate a unique subject for easy filtering
  const timestamp = new Date().toISOString();
  const uniqueId = Math.random().toString(36).substring(2, 8);
  
  const result = await sendEmail({
    to: recipientEmail,
    from: {
      email: 'app.testing@tracextech.com',
      name: 'EUDR Compliance Platform'
    },
    subject: `Test Email from EUDR Platform - ID: ${uniqueId} - ${timestamp}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4F46E5; padding: 20px; text-align: center; color: white;">
          <h1 style="margin: 0;">EUDR Compliance Platform</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e9e9e9; border-top: none;">
          <p>Hello,</p>
          <p>This is a test email to verify that the SendGrid integration is working properly.</p>
          <p>If you're receiving this, the email service is configured correctly!</p>
          <p><strong>Test ID:</strong> ${uniqueId}</p>
          <p><strong>Time of sending:</strong> ${new Date().toLocaleString()}</p>
          <p>Best regards,<br>The EUDR Compliance Platform Team</p>
        </div>
        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          <p>This is an automated test message, please do not reply to this email.</p>
          <p>© ${new Date().getFullYear()} EUDR Compliance Platform</p>
        </div>
      </div>
    `,
    text: `This is a test email to verify that the SendGrid integration is working properly. Test ID: ${uniqueId}. If you're receiving this, the email service is configured correctly! Time of sending: ${new Date().toLocaleString()}`
  });
  
  if (result) {
    console.log('Test email sent successfully!');
  } else {
    console.error('Failed to send test email.');
  }
}

// Run the test
sendTestEmail().catch(error => {
  console.error('Error running test:', error);
});