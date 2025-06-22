/**
 * Validation utility functions
 * Provides common validation helpers
 */

/**
 * Check if a string is a valid email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if a string is a valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a string is a valid UUID
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Check if a string is a valid phone number
 */
export function isValidPhoneNumber(phone: string): boolean {
  // E.164 format
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s()-]/g, ''));
}

/**
 * Check if a string is a valid JSON
 */
export function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Check password strength
 */
export function checkPasswordStrength(password: string): {
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;
  
  if (password.length >= 8) score++;
  else feedback.push('Password should be at least 8 characters long');
  
  if (password.length >= 12) score++;
  
  if (/[a-z]/.test(password)) score++;
  else feedback.push('Password should contain lowercase letters');
  
  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Password should contain uppercase letters');
  
  if (/[0-9]/.test(password)) score++;
  else feedback.push('Password should contain numbers');
  
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  else feedback.push('Password should contain special characters');
  
  return { score, feedback };
}

/**
 * Validate environment variables
 */
export function validateEnvVar(_name: string, value: string | undefined, type: 'string' | 'number' | 'boolean' | 'url'): boolean {
  if (!value) return false;
  
  switch (type) {
    case 'string':
      return value.length > 0;
    case 'number':
      return !isNaN(Number(value));
    case 'boolean':
      return value === 'true' || value === 'false';
    case 'url':
      return isValidUrl(value);
    default:
      return false;
  }
}