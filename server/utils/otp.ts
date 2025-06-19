import { db } from "../db";
import { otpCodes, insertOtpSchema } from "@shared/schema";
import { eq, and, lt } from "drizzle-orm";
import crypto from 'crypto';
import { z } from 'zod';

// Function to generate a random 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Function to create an OTP record in the database
export async function createOTP(phoneNumber: string) {
  try {
    // Delete any existing OTPs for this phone number
    await db.delete(otpCodes).where(eq(otpCodes.phoneNumber, phoneNumber));
    
    // Generate a new OTP
    const code = generateOTP();
    
    // Set expiration time (5 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);
    
    // Create a new OTP record
    const newOTP = await db.insert(otpCodes).values({
      phoneNumber,
      code,
      expiresAt,
    }).returning();
    
    return { success: true, code };
  } catch (error) {
    console.error("Error creating OTP:", error);
    return { success: false, error: "Failed to create OTP" };
  }
}

// Function to verify an OTP
export async function verifyOTP(phoneNumber: string, code: string) {
  try {
    const now = new Date();
    
    // Find the OTP record
    const otpRecord = await db.select().from(otpCodes).where(
      and(
        eq(otpCodes.phoneNumber, phoneNumber),
        eq(otpCodes.code, code)
      )
    ).limit(1);
    
    // Check if the OTP is expired
    if (otpRecord.length > 0 && now > otpRecord[0].expiresAt) {
      return { 
        success: false, 
        error: "OTP has expired" 
      };
    }
    
    if (otpRecord.length === 0) {
      return { 
        success: false, 
        error: "Invalid or expired OTP" 
      };
    }
    
    // Mark OTP as verified
    await db.update(otpCodes)
      .set({ verified: true })
      .where(eq(otpCodes.id, otpRecord[0].id));
    
    return { success: true };
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return { success: false, error: "Failed to verify OTP" };
  }
}

// Validations
export const sendOtpSchema = z.object({
  phoneNumber: z.string().min(8, "Valid phone number is required"),
});

export const verifyOtpSchema = z.object({
  phoneNumber: z.string().min(8, "Valid phone number is required"),
  code: z.string().length(6, "OTP code must be 6 digits"),
});