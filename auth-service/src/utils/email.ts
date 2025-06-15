import nodemailer from "nodemailer";
import { logger } from "./logger";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendWelcomeEmail = async (
  email: string,
  firstName: string,
  preferredLanguage: string = "en"
): Promise<void> => {
  try {
    const subject =
      preferredLanguage === "en" ? "Welcome to Dzinza!" : "Mauya ku Dzinza!";
    const text = `Hello ${firstName}, welcome to Dzinza genealogy platform!`;

    await transporter.sendMail({
      from: process.env.FROM_EMAIL || "noreply@dzinza.com",
      to: email,
      subject,
      text,
    });

    logger.info("Welcome email sent successfully", { email });
  } catch (error) {
    logger.error("Failed to send welcome email", { email, error });
    throw error;
  }
};

export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string
): Promise<void> => {
  try {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await transporter.sendMail({
      from: process.env.FROM_EMAIL || "noreply@dzinza.com",
      to: email,
      subject: "Password Reset Request",
      text: `Click the following link to reset your password: ${resetLink}`,
    });

    logger.info("Password reset email sent successfully", { email });
  } catch (error) {
    logger.error("Failed to send password reset email", { email, error });
    throw error;
  }
};

export const sendEmailVerificationEmail = async (
  email: string,
  verificationToken: string
): Promise<void> => {
  try {
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    await transporter.sendMail({
      from: process.env.FROM_EMAIL || "noreply@dzinza.com",
      to: email,
      subject: "Email Verification",
      text: `Click the following link to verify your email: ${verificationLink}`,
    });

    logger.info("Email verification sent successfully", { email });
  } catch (error) {
    logger.error("Failed to send email verification", { email, error });
    throw error;
  }
};
