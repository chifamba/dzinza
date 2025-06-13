import nodemailer from 'nodemailer';
import { logger } from './logger';

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@dzinza.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * Send welcome email to new users
 */
export const sendWelcomeEmail = async (
  email: string, 
  firstName: string, 
  verificationToken?: string
): Promise<void> => {
  try {
    const verificationLink = verificationToken 
      ? `${FRONTEND_URL}/verify-email?token=${verificationToken}`
      : null;

    const mailOptions = {
      from: FROM_EMAIL,
      to: email,
      subject: 'Welcome to Dzinza - Your Genealogy Journey Begins!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Welcome to Dzinza, ${firstName}!</h1>
          
          <p>We're excited to have you join our community of family history enthusiasts. 
          Dzinza is your gateway to discovering, preserving, and sharing your family's unique story.</p>
          
          <h2>What you can do with Dzinza:</h2>
          <ul>
            <li>🌳 Build interactive family trees</li>
            <li>📸 Preserve family photos and documents</li>
            <li>🧬 Connect with DNA matches</li>
            <li>📚 Search historical records</li>
            <li>👥 Collaborate with family members</li>
          </ul>
          
          ${verificationLink ? `
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Verify Your Email Address</h3>
              <p>To complete your registration, please verify your email address:</p>
              <a href="${verificationLink}" 
                 style="background: #2563eb; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                Verify Email Address
              </a>
            </div>
          ` : ''}
          
          <p>If you have any questions, our support team is here to help at 
          <a href="mailto:support@dzinza.com">support@dzinza.com</a></p>
          
          <p>Happy researching!<br>
          The Dzinza Team</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #6b7280;">
            This email was sent to ${email}. If you didn't create an account with Dzinza, 
            please ignore this email.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    logger.info('Welcome email sent successfully', { email });

  } catch (error) {
    logger.error('Error sending welcome email:', error, { email });
    throw new Error('Failed to send welcome email');
  }
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (
  email: string, 
  firstName: string, 
  resetToken: string
): Promise<void> => {
  try {
    const resetLink = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: FROM_EMAIL,
      to: email,
      subject: 'Reset Your Dzinza Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Password Reset Request</h1>
          
          <p>Hello ${firstName},</p>
          
          <p>We received a request to reset your password for your Dzinza account. 
          If you made this request, click the button below to reset your password:</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <a href="${resetLink}" 
               style="background: #dc2626; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p><strong>This link will expire in 1 hour for security reasons.</strong></p>
          
          <p>If you didn't request a password reset, please ignore this email. 
          Your password will remain unchanged.</p>
          
          <p>For security, this reset link can only be used once.</p>
          
          <p>If you're having trouble with the button above, copy and paste this URL into your browser:</p>
          <p style="word-break: break-all; font-size: 12px; color: #6b7280;">${resetLink}</p>
          
          <p>Best regards,<br>
          The Dzinza Security Team</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #6b7280;">
            This email was sent to ${email}. If you didn't request this password reset, 
            please contact our support team immediately.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    logger.info('Password reset email sent successfully', { email });

  } catch (error) {
    logger.error('Error sending password reset email:', error, { email });
    throw new Error('Failed to send password reset email');
  }
};

/**
 * Send email verification email
 */
export const sendEmailVerificationEmail = async (
  email: string, 
  firstName: string, 
  verificationToken: string
): Promise<void> => {
  try {
    const verificationLink = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const mailOptions = {
      from: FROM_EMAIL,
      to: email,
      subject: 'Verify Your Dzinza Email Address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Verify Your Email Address</h1>
          
          <p>Hello ${firstName},</p>
          
          <p>Thank you for registering with Dzinza! To complete your account setup, 
          please verify your email address by clicking the button below:</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <a href="${verificationLink}" 
               style="background: #059669; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          
          <p><strong>This verification link will expire in 24 hours.</strong></p>
          
          <p>Once verified, you'll have full access to all Dzinza features including:</p>
          <ul>
            <li>Building your family tree</li>
            <li>Uploading and managing photos</li>
            <li>Connecting with potential relatives</li>
            <li>Accessing historical records</li>
          </ul>
          
          <p>If you're having trouble with the button above, copy and paste this URL into your browser:</p>
          <p style="word-break: break-all; font-size: 12px; color: #6b7280;">${verificationLink}</p>
          
          <p>Welcome to the Dzinza family!<br>
          The Dzinza Team</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #6b7280;">
            This email was sent to ${email}. If you didn't create an account with Dzinza, 
            please ignore this email.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    logger.info('Email verification sent successfully', { email });

  } catch (error) {
    logger.error('Error sending email verification:', error, { email });
    throw new Error('Failed to send email verification');
  }
};
