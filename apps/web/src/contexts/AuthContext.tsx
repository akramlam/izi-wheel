import { createContext, useEffect, useState, ReactNode } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api';

// Define user type
export type User = {
  id: string;
  email: string;
  role: string;
  companyId?: string;
  isPaid: boolean;
  name?: string;
  forcePasswordChange?: boolean;
};

// Define the auth context type
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

// Create the context with default values
export const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  logout: () => {},
  register: async () => {},
  refreshUser: async () => {},
  isAuthenticated: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Debugging function
  const debugLog = (message: string, data?: any) => {
  };

  // Configure axios defaults
  useEffect(() => {
    debugLog('Setting up axios defaults with token', token ? 'present' : 'absent');
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete apiClient.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Safe logout that always clears state
  const logout = () => {
    debugLog('Logging out user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('companyId');
    setToken(null);
    setUser(null);
    delete apiClient.defaults.headers.common['Authorization'];
    // Redirect to the correct login page based on last known role
    try {
      const storedUserRaw = localStorage.getItem('user');
      const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;
      const role = storedUser?.role || user?.role;
      if (role === 'SUPER') {
        navigate('/superadmin-login');
      } else {
        navigate('/admin-login');
      }
    } catch {
      // Fallback
      navigate('/admin-login');
    }
  };

  // Check if token is valid on startup
  useEffect(() => {
    const verifyToken = async () => {
      debugLog('Starting token verification');
      
      if (!token) {
        debugLog('No token found, skipping verification');
        setIsLoading(false);
        return;
      }

      try {
        // Set the token in axios headers
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        debugLog('Sending auth verification request');
        
        // Verify token by making a request to a protected endpoint
        const response = await apiClient.get('/auth/me');
        
        debugLog('Auth verification response received', response.status);
        
        // Handle empty responses (204 No Content)
        if (!response.data || !response.data.user) {
          debugLog('No user data in response, checking localStorage');
          
          // Try to use stored user data if available
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              debugLog('Using stored user data', parsedUser.email);
              
              setUser(parsedUser);
              
              // If user has forcePasswordChange flag, redirect to change password page
              if (parsedUser.forcePasswordChange && window.location.pathname !== '/change-password') {
                debugLog('Force password change required, redirecting');
                navigate('/change-password');
              }
            } catch (e) {
              debugLog('Failed to parse stored user, logging out', e);
              logout();
            }
          } else {
            debugLog('No stored user data, logging out');
            logout();
          }
        } else {
          debugLog('Setting user from response', response.data.user.email);
          setUser(response.data.user);
          
          // Store user in localStorage for reference
          localStorage.setItem('user', JSON.stringify(response.data.user));
          
          // Store companyId separately if available
          if (response.data.user.companyId) {
            localStorage.setItem('companyId', response.data.user.companyId);
          }
          
          // If user has forcePasswordChange flag, redirect to change password page
          if (response.data.user.forcePasswordChange && window.location.pathname !== '/change-password') {
            debugLog('Force password change required, redirecting');
            navigate('/change-password');
          }
        }
      } catch (error) {
        debugLog('Token verification failed', error);
        // Clear invalid token
        logout();
      } finally {
        debugLog('Finishing token verification, setting isLoading to false');
        setIsLoading(false);
      }
    };

    // Always set a timeout to exit loading state after a reasonable delay
    const timeout = setTimeout(() => {
      if (isLoading) {
        debugLog('Verification timeout reached, forcing loading state to end');
        setIsLoading(false);
      }
    }, 5000); // 5 second timeout

    verifyToken();
    
    return () => clearTimeout(timeout);
  }, [token, navigate]);

  const refreshUser = async () => {
    debugLog('Refreshing user data');
    
    try {
      const response = await apiClient.get('/auth/me');
      if (response.data && response.data.user) {
        debugLog('User data refreshed successfully', response.data.user.email);
        setUser(response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      } else {
        debugLog('refreshUser: Auth endpoint returned no user data');
      }
    } catch (error) {
      debugLog('Failed to refresh user data', error);
    }
  };

  const login = async (email: string, password: string) => {
    debugLog('Attempting login', email);
    
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      debugLog('Login successful');
      
      const { user, token } = response.data;

      // Store the token and user in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Store companyId separately if available
      if (user.companyId) {
        localStorage.setItem('companyId', user.companyId);
      }
      
      setToken(token);
      setUser(user);
      
      // If user has forcePasswordChange flag, redirect to change password page
      if (user.forcePasswordChange) {
        debugLog('Force password change required, redirecting');
        navigate('/change-password');
        return;
      }
      
      // Otherwise, redirect to dashboard
      debugLog('Redirecting to dashboard');
      navigate('/dashboard');
    } catch (error) {
      debugLog('Login failed', error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.error || 'Login failed');
      }
      throw new Error('Something went wrong');
    }
  };

  const register = async (email: string, password: string) => {
    debugLog('Attempting registration', email);
    
    try {
      const response = await apiClient.post('/auth/register', { email, password });
      debugLog('Registration successful');
      
      // Store the token and user in localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setToken(response.data.token);
      setUser(response.data.user);
      
      // Otherwise, redirect to dashboard
      debugLog('Redirecting to dashboard');
      navigate('/dashboard');
    } catch (error) {
      debugLog('Registration failed', error);
      throw new Error('Something went wrong');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        register,
        refreshUser,
        isAuthenticated: !!user,
      }}
    >
      {!isLoading && children}
    </AuthContext.Provider>
  );
}; 