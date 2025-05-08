import jwt, { Secret } from 'jsonwebtoken';
import { User, Role } from '@prisma/client';

// Interface for JWT payload
interface JwtPayload {
  id: string;
  email: string;
  role: Role;
  companyId?: string;
}

// Get secret from environment
const JWT_SECRET: Secret = process.env.JWT_SECRET || 'default-dev-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate a JWT token for a user
 */
export const generateToken = (user: User): string => {
  const payload: JwtPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    companyId: user.companyId || undefined,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verify a JWT token
 */
export const verifyToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}; 