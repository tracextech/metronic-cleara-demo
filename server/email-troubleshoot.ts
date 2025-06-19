import { MailService } from '@sendgrid/mail';

/**
 * Email Troubleshooting Tool for SendGrid
 * 
 * This script bypasses our normal email sending code and uses the SendGrid API directly
 * to help identify issues with email delivery.
 */

// Initialize SendGrid mail service
const mailService = new MailService();

// Check if API key is available
if (!process.env.SENDGRID_API_KEY) {
  console.error('Error: SENDGRID_API_KEY environment variable is not set');
  process.exit(1);
}

mailService.setApiKey(process.env.SENDGRID_API_KEY);

async function sendDiagnosticEmail() {
  try {
    // Get the recipient email from command line args or use default
    const args = process.argv.slice(2);
    const recipientEmail = args[0] || 'app.testing@tracextech.com';
    
    // Create a unique ID for this test
    const testId = Math.random().toString(36).substring(2, 10);
    const timestamp = new Date().toISOString();
    
    console.log(`Sending diagnostic email directly to ${recipientEmail}`);
    console.log(`Test ID: ${testId}`);
    console.log('Timestamp:', timestamp);
    
    // Send directly through SendGrid, bypassing our wrapper
    const msg = {
      to: recipientEmail,
      from: {
        email: 'app.testing@tracextech.com',
        name: 'EUDR Compliance Diagnostic'
      },
      subject: `DIAGNOSTIC EMAIL - ID: ${testId} - ${timestamp}`,
      text: `This is a diagnostic email sent directly through SendGrid API.
Test ID: ${testId}
Timestamp: ${timestamp}

If you're receiving this email but not the regular system emails, there may be an issue with the email sending code in the application.

This test bypasses the normal email sending flow to help diagnose delivery issues.`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #FF6B35; padding: 20px; text-align: center; color: white;">
          <h1 style="margin: 0;">EMAIL DIAGNOSTIC TEST</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e9e9e9; border-top: none;">
          <p>This is a diagnostic email sent directly through SendGrid API.</p>
          <p><strong>Test ID:</strong> ${testId}</p>
          <p><strong>Timestamp:</strong> ${timestamp}</p>
          <p><strong>Important:</strong> If you're receiving this email but not the regular system emails, there may be an issue with the email sending code in the application.</p>
          <p>This test bypasses the normal email sending flow to help diagnose delivery issues.</p>
        </div>
      </div>
      `,
      trackingSettings: {
        clickTracking: {
          enable: true,
          enableText: true
        },
        openTracking: {
          enable: true
        }
      },
      mailSettings: {
        sandboxMode: {
          enable: false
        }
      },
      headers: {
        'X-Priority': '1',
        'X-Diagnostic-Test': 'true',
        'X-Test-ID': testId
      }
    };
    
    const response = await mailService.send(msg);
    
    console.log('SendGrid API Response:', response[0].statusCode);
    console.log('Email sent successfully! Check your inbox and spam folder.');
    console.log('If you still don\'t receive this email, there may be an issue with your SendGrid account settings or sender verification.');
    
  } catch (error: any) {
    console.error('Error sending diagnostic email:');
    
    if (error.response) {
      console.error('Error Status Code:', error.response.statusCode);
      console.error('Error Body:', error.response.body);
      console.error('Error Headers:', error.response.headers);
    } else {
      console.error(error);
    }
  }
}

// Execute the diagnostic test
sendDiagnosticEmail();