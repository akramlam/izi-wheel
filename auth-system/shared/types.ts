// Rôles utilisateur
export enum Role {
  SUPER = 'SUPER',
  ADMIN = 'ADMIN',
  SUB = 'SUB',
  USER = 'USER'
}

// Interface utilisateur
export interface User {
  id: string;
  email: string;
  role: Role;
  companyId?: string;
  isPaid: boolean;
  name?: string;
  forcePasswordChange?: boolean;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Payload JWT
export interface JwtPayload {
  id: string;
  email: string;
  role: Role;
  companyId?: string;
  isPaid: boolean;
  name?: string;
  forcePasswordChange?: boolean;
}

// Réponse de connexion
export interface LoginResponse {
  user: User;
  token: string;
}

// Contexte d'authentification
export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

// Options pour les middlewares
export interface AuthOptions {
  bypassPaidCheck?: boolean;
  requireCompanyId?: boolean;
}

// Schémas de validation
export interface LoginSchema {
  email: string;
  password: string;
}

export interface RegisterSchema {
  email: string;
  password: string;
  role?: Role;
  companyId?: string;
  name?: string;
}

export interface ChangePasswordSchema {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordSchema {
  email: string;
}

export interface ResetPasswordSchema {
  token: string;
  newPassword: string;
} 