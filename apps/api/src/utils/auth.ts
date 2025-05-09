import * as crypto from 'crypto';

/**
 * Hash a password using SHA-256
 * Note: This is not recommended for production use, but works for development
 */
export const hashPassword = async (password: string): Promise<string> => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

/**
 * Compare a password with a hash
 */
export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  const hashedInput = await hashPassword(password);
  return hashedInput === hashedPassword;
};

/**
 * Generate a random password for user invitations
 * Creates a password with 8-12 characters including letters, numbers, and special characters
 */
export const generateRandomPassword = (): string => {
  const length = Math.floor(Math.random() * 5) + 8; // Random length between 8-12
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_-+=';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  
  return password;
}; 