import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

/**
 * Cryptographic utility functions
 * Provides secure hashing and token generation
 */

const scryptAsync = promisify(scrypt);

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Generate a secure random string (URL-safe)
 */
export function generateSecureString(length: number = 32): string {
  return randomBytes(length)
    .toString('base64url')
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, length);
}

/**
 * Hash a string using scrypt (more secure than bcrypt for some use cases)
 */
export async function hashString(input: string, salt?: string): Promise<{ hash: string; salt: string }> {
  const actualSalt = salt || randomBytes(16).toString('hex');
  const hash = (await scryptAsync(input, actualSalt, 64)) as Buffer;
  
  return {
    hash: hash.toString('hex'),
    salt: actualSalt,
  };
}

/**
 * Verify a string against a hash
 */
export async function verifyHash(input: string, hash: string, salt: string): Promise<boolean> {
  const { hash: inputHash } = await hashString(input, salt);
  return inputHash === hash;
}

/**
 * Generate a time-based one-time password secret
 */
export function generateTOTPSecret(): string {
  return randomBytes(20).toString('base64');
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}