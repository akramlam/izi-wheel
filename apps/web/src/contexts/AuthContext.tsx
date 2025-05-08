import { createContext, useEffect, useState, ReactNode } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api';

interface User {
  id: string;
  email: string;
  role: string;
  companyId: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  logout: () => {},
  isAuthenticated: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete apiClient.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check if token is valid on startup
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // Set the token in axios headers
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Verify token by making a request to a protected endpoint
        const response = await apiClient.get('/auth/me');
        setUser(response.data.user);
        if (response.data.user?.companyId) {
          localStorage.setItem('companyId', response.data.user.companyId);
        } else {
          localStorage.removeItem('companyId');
        }
      } catch (error) {
        console.error('Token validation error:', error);
        // Token is invalid, clear it
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { user, token } = response.data;

      // Store the token in localStorage
      localStorage.setItem('token', token);
      setToken(token);
      setUser(user);
      // Store companyId in localStorage for API calls
      if (user.companyId) {
        localStorage.setItem('companyId', user.companyId);
      } else {
        localStorage.removeItem('companyId');
      }

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.error || 'Login failed');
      }
      throw new Error('Something went wrong');
    }
  };

  const logout = () => {
    // Remove token from localStorage
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    navigate('/login');
    // Remove companyId from localStorage on logout
    localStorage.removeItem('companyId');
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        token, 
        isLoading, 
        login, 
        logout, 
        isAuthenticated: !!user 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 