import * as jwt from 'jsonwebtoken';
import { User, Role, JwtPayload } from '../../shared/types';

// Configuration JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Parse la durée d'expiration du token
 */
function parseExpiresIn(timeStr: string): number {
  const unit = timeStr.charAt(timeStr.length - 1);
  const value = parseInt(timeStr.substring(0, timeStr.length - 1), 10);
  if (isNaN(value)) return 60 * 60 * 24 * 7; // 7 jours par défaut

  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 60 * 60 * 24;
    default: return value;
  }
}

/**
 * Génère un token JWT pour un utilisateur
 */
export const generateToken = (user: User): string => {
  const payload: JwtPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
    isPaid: user.isPaid,
    name: user.name,
    forcePasswordChange: user.forcePasswordChange,
  };

  const signOptions: jwt.SignOptions = {
    expiresIn: parseExpiresIn(JWT_EXPIRES_IN),
    algorithm: 'HS256'
  };

  return jwt.sign(payload, JWT_SECRET, signOptions);
};

/**
 * Vérifie un token JWT
 */
export const verifyToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    
    // Valider la structure du payload
    const requiredFields = ['id', 'email', 'role'];
    for (const field of requiredFields) {
      if (!decoded[field as keyof JwtPayload]) {
        throw new Error(`Token invalide: champ ${field} manquant`);
      }
    }
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Token invalide');
    } else if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expiré');
    } else {
      throw new Error('Erreur de vérification du token');
    }
  }
};

/**
 * Extrait le token du header Authorization
 */
export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.split(' ')[1] || null;
}; 