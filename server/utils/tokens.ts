import crypto from 'crypto';
import { storage } from '../storage';
import { InsertSupplierActivationToken, SupplierActivationToken, Supplier } from '@shared/schema';

/**
 * Generate a secure random token for supplier activation
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Create a supplier activation token and store it in the database
 */
export async function createSupplierActivationToken(
  supplierId: number,
  email: string,
  firstName?: string,
  lastName?: string,
  expiresIn: number = 72 // hours
): Promise<string> {
  const token = generateSecureToken();
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setHours(expiresAt.getHours() + expiresIn);

  const tokenData: InsertSupplierActivationToken = {
    token,
    supplierId,
    email,
    firstName: firstName || null,
    lastName: lastName || null,
    expiresAt,
    used: false
  };

  await storage.createActivationToken(tokenData);
  return token;
}

/**
 * Verify if a supplier activation token is valid
 */
export async function verifySupplierActivationToken(token: string): Promise<{
  valid: boolean;
  message?: string;
  tokenData?: SupplierActivationToken;
  supplier?: Supplier;
}> {
  // Find the token in the database
  const tokenData = await storage.getActivationTokenByToken(token);

  if (!tokenData) {
    return { valid: false, message: "Token not found" };
  }

  // Check if token is already used
  if (tokenData.used) {
    return { valid: false, message: "Token has already been used" };
  }

  // Check if token is expired
  if (new Date() > tokenData.expiresAt) {
    return { valid: false, message: "Token has expired" };
  }

  // Get supplier details
  const supplier = await storage.getSupplier(tokenData.supplierId);
  if (!supplier) {
    return { valid: false, message: "Supplier not found" };
  }

  return {
    valid: true,
    tokenData,
    supplier
  };
}

/**
 * Mark a supplier activation token as used
 */
export async function markTokenAsUsed(tokenId: number): Promise<boolean> {
  try {
    return await storage.markActivationTokenAsUsed(tokenId);
  } catch (error) {
    console.error('Error marking token as used:', error);
    return false;
  }
}