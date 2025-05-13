import jwt, { Secret } from 'jsonwebtoken';
import { User, Role } from '@prisma/client';

// Interface for JWT payload
interface JwtPayload {
  id: string;
  email: string;
  role: Role;
  companyId?: string;
  isPaid: boolean;
  name?: string;
  forcePasswordChange?: boolean;
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
    isPaid: user.isPaid,
    name: user.name,
    forcePasswordChange: user.forcePasswordChange,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

/**
 * Verify a JWT token
 */
export const verifyToken = (token: string): JwtPayload => {
  try {
    console.log('[JWT] Verifying token');
    
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    
    console.log('[JWT] Token verified for user:', decoded.email);
    
    // Validate payload structure
    const requiredFields = ['id', 'email', 'role'];
    for (const field of requiredFields) {
      if (!decoded[field as keyof JwtPayload]) {
        console.error(`[JWT] Invalid token payload: missing ${field}`);
        throw new Error(`Invalid token payload: missing ${field}`);
      }
    }
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      console.error('[JWT] Token verification failed:', error.message);
    } else if (error instanceof jwt.TokenExpiredError) {
      console.error('[JWT] Token has expired');
    } else {
      console.error('[JWT] Token verification error:', error);
    }
    throw error;
  }
}; 