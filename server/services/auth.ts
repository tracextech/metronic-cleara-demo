import crypto from 'crypto';

/**
 * Hash a password using a secure method
 * In a production app, you would use bcrypt here
 */
export async function hashPassword(password: string): Promise<string> {
  // Generate a random salt
  const salt = crypto.randomBytes(16).toString('hex');
  
  // Hash the password with the salt
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  
  // Return the salt and hash, joined with a delimiter
  return `${salt}:${hash}`;
}

/**
 * Compare a plaintext password with a stored hash
 * In a production app, you would use bcrypt.compare here
 */
export async function comparePassword(plaintext: string, stored: string): Promise<boolean> {
  // Split the stored string to get the salt and hash
  const [salt, storedHash] = stored.split(':');
  
  // Hash the plaintext with the same salt
  const hash = crypto.pbkdf2Sync(plaintext, salt, 1000, 64, 'sha512').toString('hex');
  
  // Compare the hashes
  return storedHash === hash;
}