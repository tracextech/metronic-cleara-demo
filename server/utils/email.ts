import { MailService } from '@sendgrid/mail';
import type { MailDataRequired } from '@sendgrid/mail';

// Initialize SendGrid mail service
const mailService = new MailService();

// Check if API key is available
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

// Verified sender domain
const VERIFIED_SENDER = 'app.testing@tracextech.com';
const DEFAULT_PLATFORM_NAME = 'EUDR Compliance Platform';

interface EmailParams {
  to: string;
  from: string | { email: string; name: string };
  subject: string;
  text?: string;
  html: string;
}

/**
 * Send an email using SendGrid
 */
export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.error('SendGrid API key is not set');
      return false;
    }
    
    // Override recipient email in non-production environment
    // Use 'app.testing@tracextech.com' as the recipient unless explicitly in production mode
    const isProduction = process.env.NODE_ENV === 'production';
    const recipientEmail = isProduction ? params.to : 'app.testing@tracextech.com';
    
    const originalTo = params.to;
    
    // Log email attempt
    const fromDisplay = typeof params.from === 'string' 
      ? params.from 
      : `${params.from.name} <${params.from.email}>`;
    console.log(`Attempting to send email from ${fromDisplay} to ${recipientEmail} (original: ${originalTo})`);
    console.log(`Subject: ${params.subject}`);
    
    try {
      // Create a more complete mail data object with better deliverability settings
      const mailData: MailDataRequired = {
        to: recipientEmail,
        from: params.from,
        subject: params.subject,
        text: params.text,
        html: params.html,
        // Minimal settings for better compatibility
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true }
        },
        mailSettings: {
          sandboxMode: { enable: false }
        },
        // Using only standard headers that won't cause SMTP issues
        headers: {
          'X-Entity-ID': `eudr-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
        },
      };
      
      await mailService.send(mailData);
      
      console.log(`Email sent to ${recipientEmail} (original recipient: ${originalTo})`);
      return true;
    } catch (sendError: any) {
      console.error('SendGrid send error details:');
      
      if (sendError.response) {
        console.error('Error status code:', sendError.response.statusCode);
        console.error('Error body:', sendError.response.body);
        console.error('Error headers:', sendError.response.headers);
      } else {
        console.error('Error without response:', sendError);
      }
      
      throw sendError; // Re-throw for outer catch
    }
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

/**
 * Send a supplier activation email
 */
export async function sendSupplierActivationEmail(
  email: string,
  supplierName: string,
  contactName: string | null,
  activationToken: string,
  platformName: string = 'EUDR Compliance Platform'
): Promise<boolean> {
  const baseUrl = process.env.BASE_URL || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  const activationLink = `${baseUrl}/activate-supplier/${activationToken}`;
  
  const greeting = contactName 
    ? `Hello ${contactName}`
    : 'Hello';
    
  // Generate a unique email ID for tracking
  const emailId = `act-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  
  const emailHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Account Activation - ${platformName}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; line-height: 1.6;">
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0;">
        <div style="background-color: #4F46E5; padding: 24px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px;">${platformName}</h1>
        </div>
        <div style="padding: 24px; background-color: #ffffff;">
          <p style="margin-top: 0;">${greeting},</p>
          <p>You have been added as a primary contact for <strong>${supplierName}</strong> on the ${platformName}.</p>
          <p>To activate your account and set your password, please click the button below:</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${activationLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Activate Account</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all;"><a href="${activationLink}" style="color: #4F46E5;">${activationLink}</a></p>
          <p><strong>Important:</strong> This link will expire in 72 hours.</p>
          <p>If you did not expect this invitation, please ignore this email.</p>
          <div style="margin-top: 24px;">
            <p style="margin-bottom: 4px;">Best regards,</p>
            <p style="margin-top: 0;">The ${platformName} Team</p>
          </div>
        </div>
        <div style="background-color: #f5f5f5; padding: 16px; text-align: center; font-size: 12px; color: #666;">
          <p style="margin: 0;">Email ID: ${emailId}</p>
          <p style="margin: 4px 0 0 0;">This is an automated message, please do not reply to this email.</p>
          <p style="margin: 4px 0 0 0;">&copy; ${new Date().getFullYear()} ${platformName}</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  // Generate plain text version with better formatting
  const plainText = `
Account Activation - ${platformName}

${greeting},

You have been added as a primary contact for ${supplierName} on the ${platformName}.

To activate your account and set your password, please visit:
${activationLink}

IMPORTANT: This link will expire in 72 hours.

If you did not expect this invitation, please ignore this email.

Best regards,
The ${platformName} Team

Email ID: ${emailId}
This is an automated message, please do not reply to this email.
© ${new Date().getFullYear()} ${platformName}
  `.trim();
  
  return await sendEmail({
    to: email,
    from: {
      email: 'app.testing@tracextech.com', // Using a verified sender in SendGrid
      name: platformName
    },
    subject: `${supplierName} - Activate Your Account on ${platformName}`,
    html: emailHtml,
    text: plainText
  });
}

/**
 * Generate email HTML for supplier activation
 */
export function generateSupplierActivationEmail(
  supplierName: string,
  contactName: string | null,
  activationLink: string,
  platformName: string = 'EUDR Compliance Platform'
): { 
  subject: string;
  html: string;
  text: string;
} {
  const greeting = contactName 
    ? `Hello ${contactName}`
    : 'Hello';

  // Generate a unique email ID for tracking
  const emailId = `act-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  
  const emailHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Account Activation - ${platformName}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; line-height: 1.6;">
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0;">
        <div style="background-color: #4F46E5; padding: 24px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px;">${platformName}</h1>
        </div>
        <div style="padding: 24px; background-color: #ffffff;">
          <p style="margin-top: 0;">${greeting},</p>
          <p>You have been added as a primary contact for <strong>${supplierName}</strong> on the ${platformName}.</p>
          <p>To activate your account and set your password, please click the button below:</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${activationLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Activate Account</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all;"><a href="${activationLink}" style="color: #4F46E5;">${activationLink}</a></p>
          <p><strong>Important:</strong> This link will expire in 72 hours.</p>
          <p>If you did not expect this invitation, please ignore this email.</p>
          <div style="margin-top: 24px;">
            <p style="margin-bottom: 4px;">Best regards,</p>
            <p style="margin-top: 0;">The ${platformName} Team</p>
          </div>
        </div>
        <div style="background-color: #f5f5f5; padding: 16px; text-align: center; font-size: 12px; color: #666;">
          <p style="margin: 0;">Email ID: ${emailId}</p>
          <p style="margin: 4px 0 0 0;">This is an automated message, please do not reply to this email.</p>
          <p style="margin: 4px 0 0 0;">&copy; ${new Date().getFullYear()} ${platformName}</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  // Generate plain text version with better formatting
  const plainText = `
Account Activation - ${platformName}

${greeting},

You have been added as a primary contact for ${supplierName} on the ${platformName}.

To activate your account and set your password, please visit:
${activationLink}

IMPORTANT: This link will expire in 72 hours.

If you did not expect this invitation, please ignore this email.

Best regards,
The ${platformName} Team

Email ID: ${emailId}
This is an automated message, please do not reply to this email.
© ${new Date().getFullYear()} ${platformName}
  `.trim();
  
  return {
    subject: `${supplierName} - Activate Your Account on ${platformName}`,
    html: emailHtml,
    text: plainText
  };
}