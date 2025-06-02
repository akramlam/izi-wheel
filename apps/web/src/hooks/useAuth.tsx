import { useContext } from 'react';
import { AuthContext, User } from '../contexts/AuthContext';

interface AuthHook {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  register: (email: string, password: string) => Promise<void>;
}

export const useAuth = (): AuthHook => {
  return useContext(AuthContext);
}; 