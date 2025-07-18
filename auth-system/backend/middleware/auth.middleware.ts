import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt';
import { Role, AuthOptions } from '../../shared/types';

// Extension de l'interface Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: Role;
        companyId?: string;
        isPaid: boolean;
        name?: string;
        forcePasswordChange?: boolean;
      };
    }
  }
}

/**
 * Middleware d'authentification
 * Vérifie le JWT et attache l'utilisateur à la requête
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({ error: 'Token d\'authentification requis' });
    }

    // Vérifier le token et attacher l'utilisateur à la requête
    const decodedToken = verifyToken(token);
    req.user = decodedToken;
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentification échouée' });
  }
};

/**
 * Factory pour créer un middleware de garde de rôle
 * Restreint l'accès basé sur le rôle utilisateur
 */
export const roleGuard = (allowedRoles: Role[], options: AuthOptions = {}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentification requise' });
    }

    // Les SUPER admins ont toujours accès si leur rôle est autorisé
    if (req.user.role === Role.SUPER && allowedRoles.includes(Role.SUPER)) {
      return next();
    }

    // Vérifier si le rôle de l'utilisateur est autorisé
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permissions insuffisantes' });
    }

    // Vérifier le statut payé si nécessaire
    if (!options.bypassPaidCheck && req.user.role === Role.ADMIN && !req.user.isPaid) {
      return res.status(403).json({ error: 'Compte non payé - accès restreint' });
    }

    next();
  };
};

/**
 * Middleware de garde d'entreprise
 * S'assure que les utilisateurs ne peuvent accéder qu'aux ressources de leur entreprise
 */
export const companyGuard = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  // Les utilisateurs SUPER peuvent accéder à toutes les entreprises
  if (req.user.role === Role.SUPER) {
    return next();
  }

  const companyId = req.params.companyId || req.body.companyId || req.params.cid;
  
  // Pas d'ID d'entreprise dans la requête
  if (!companyId) {
    if (req.user.role === Role.ADMIN || req.user.role === Role.SUB) {
      // Pour les admins, continuer (sera géré par d'autres middlewares si nécessaire)
      return next();
    }
    return res.status(400).json({ error: 'ID d\'entreprise requis' });
  }

  // Pas d'ID d'entreprise dans l'objet utilisateur
  if (!req.user.companyId) {
    return res.status(403).json({ error: 'Aucune entreprise associée à ce compte' });
  }

  // Vérifier si l'utilisateur appartient à l'entreprise demandée
  if (req.user.companyId !== companyId) {
    return res.status(403).json({ error: 'Accès refusé à cette ressource d\'entreprise' });
  }

  next();
};

/**
 * Middleware optionnel d'authentification
 * Attache l'utilisateur à la requête s'il est authentifié, sinon continue
 */
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      const decodedToken = verifyToken(token);
      req.user = decodedToken;
    }
    
    next();
  } catch (error) {
    // Ignorer les erreurs d'authentification et continuer
    next();
  }
}; 