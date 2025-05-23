import axios from 'axios';

// Get the API URL from environment variables or use a default
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Create an Axios instance with default config
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token in all requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor for handling errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle expired tokens
    if (error.response && error.response.status === 401) {
      // If not already on the login page, we can redirect or clear token
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Helper to get a valid companyId from localStorage
async function getValidCompanyId() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const storedCompanyId = localStorage.getItem('companyId');
    
    // If SUPER admin without a valid companyId, fetch one from the server
    if (user.role === 'SUPER' && (!storedCompanyId || storedCompanyId === 'null')) {
      try {
        const response = await apiClient.get('/companies/validate-access');
        const { companyId } = response.data;
        if (companyId) {
          localStorage.setItem('companyId', companyId);
          return companyId;
        }
      } catch (error) {
        console.error('Failed to get valid company ID for super admin:', error);
        throw new Error("Aucun ID d'entreprise trouvé. Veuillez vous reconnecter.");
      }
    }
    
    // For regular users or if we already have a valid companyId
    if (!storedCompanyId || storedCompanyId === 'null') {
      // Try to validate the company access
      try {
        const response = await apiClient.get('/companies/validate-access');
        const { companyId } = response.data;
        if (companyId) {
          localStorage.setItem('companyId', companyId);
          return companyId;
        }
      } catch (error) {
        console.error('Failed to validate company access:', error);
        throw new Error("Aucun ID d'entreprise trouvé. Veuillez vous reconnecter.");
      }
    }
    
    return storedCompanyId;
  } catch (error) {
    console.error('Error getting valid company ID:', error);
    throw new Error("Aucun ID d'entreprise trouvé. Veuillez vous reconnecter.");
  }
}

// API wrapper functions for common operations
export const api = {
  // Auth
  login: async (email: string, password: string) => {
    return apiClient.post('/auth/login', { email, password });
  },
  
  register: async (userData: any) => {
    return apiClient.post('/auth/register', userData);
  },
  
  changePassword: async (data: { currentPassword: string, newPassword: string }) => {
    return apiClient.post('/auth/change-password', data);
  },
  
  getProfile: async () => {
    return apiClient.get('/auth/me');
  },
  
  getValidCompanyId: async () => {
    return apiClient.get('/companies/validate-access');
  },
  
  // Wheels
  getWheels: async () => {
    const companyId = await getValidCompanyId();
    if (!companyId) return { data: [] };
    return apiClient.get(`/companies/${companyId}/wheels`);
  },
  
  getWheel: async (wheelId: string) => {
    const companyId = await getValidCompanyId();
    if (!companyId) return { data: null };
    return apiClient.get(`/companies/${companyId}/wheels/${wheelId}`);
  },
  
  createWheel: async (data: any) => {
    const companyId = await getValidCompanyId();
    if (!companyId) return { data: null };
    return apiClient.post(`/companies/${companyId}/wheels`, data);
  },
  
  updateWheel: async (wheelId: string, data: any) => {
    const companyId = await getValidCompanyId();
    if (!companyId) return { data: null };
    return apiClient.put(`/companies/${companyId}/wheels/${wheelId}`, data);
  },
  
  deleteWheel: async (wheelId: string) => {
    const companyId = await getValidCompanyId();
    if (!companyId) return { data: null };
    return apiClient.delete(`/companies/${companyId}/wheels/${wheelId}`);
  },
  
  // Slots
  getSlots: async (wheelId: string) => {
    const companyId = await getValidCompanyId();
    if (!companyId) return { data: [] };
    return apiClient.get(`/companies/${companyId}/wheels/${wheelId}/slots`);
  },
  
  createSlot: async (wheelId: string, data: any) => {
    const companyId = await getValidCompanyId();
    if (!companyId) return { data: null };
    return apiClient.post(`/companies/${companyId}/wheels/${wheelId}/slots`, data);
  },
  
  updateSlot: async (wheelId: string, slotId: string, data: any) => {
    const companyId = await getValidCompanyId();
    if (!companyId) return { data: null };
    return apiClient.put(`/companies/${companyId}/wheels/${wheelId}/slots/${slotId}`, data);
  },
  
  deleteSlot: async (wheelId: string, slotId: string) => {
    const companyId = await getValidCompanyId();
    if (!companyId) return { data: null };
    return apiClient.delete(`/companies/${companyId}/wheels/${wheelId}/slots/${slotId}`);
  },
  
  bulkUpdateSlots: async (wheelId: string, data: any[]) => {
    const companyId = await getValidCompanyId();
    if (!companyId) return { data: null };
    return apiClient.post(`/companies/${companyId}/wheels/${wheelId}/slots/bulk`, data);
  },
  
  // Play history
  getPlayHistory: async (wheelId: string) => {
    const companyId = await getValidCompanyId();
    if (!companyId) return { data: [] };
    return apiClient.get(`/companies/${companyId}/wheels/${wheelId}/play/history`);
  },
  
  // Companies (for SUPER admin)
  getAllCompanies: async () => {
    return apiClient.get('/companies');
  },
  
  getCompany: async (companyId: string) => {
    return apiClient.get(`/companies/${companyId}`);
  },
  
  createCompany: async (data: any) => {
    return apiClient.post('/companies', data);
  },
  
  updateCompany: async (companyId: string, data: any) => {
    return apiClient.patch(`/companies/${companyId}/plan`, data);
  },
  
  deleteCompany: async (companyId: string) => {
    return apiClient.delete(`/companies/${companyId}`);
  },
  
  // Users & Sub-admins
  getCompanyUsers: async (companyId: string) => {
    if (!companyId) return { data: [] };
    return apiClient.get(`/companies/${companyId}/users`);
  },
  
  createUser: async (data: any) => {
    if (!data.companyId) return { data: null };
    return apiClient.post(`/companies/${data.companyId}/users`, {
      name: data.name,
      email: data.email,
      isActive: data.isActive,
      role: data.role,
    });
  },
  
  updateUser: async (userId: string, data: any) => {
    const companyId = await getValidCompanyId();
    if (!companyId) return { data: null };
    return apiClient.put(`/companies/${companyId}/users/${userId}`, data);
  },
  
  deleteUser: async (userId: string) => {
    const companyId = await getValidCompanyId();
    if (!companyId) return { data: null };
    return apiClient.delete(`/companies/${companyId}/users/${userId}`);
  },
  
  resetUserPassword: async (userId: string, data: { password: string }) => {
    const companyId = await getValidCompanyId();
    if (!companyId) return { data: null };
    return apiClient.put(`/companies/${companyId}/users/${userId}/reset-password`, data);
  },
  
  // Statistics & Analytics
  getCompanyStatistics: async (companyId: string, params: { range: string }) => {
    if (!companyId) return { data: null };
    return apiClient.get(`/companies/${companyId}/statistics`, { params });
  },
  
  getWheelStatistics: async (wheelId: string, params: { range: string }) => {
    const companyId = await getValidCompanyId();
    if (!companyId) return { data: null };
    return apiClient.get(`/companies/${companyId}/wheels/${wheelId}/statistics`, { params });
  },
  
  exportPlayData: async (wheelId: string, params: { format: 'csv' | 'json', range: string }) => {
    const companyId = await getValidCompanyId();
    if (!companyId) return { data: null };
    return apiClient.get(`/companies/${companyId}/wheels/${wheelId}/export`, { 
      params,
      responseType: params.format === 'csv' ? 'blob' : 'json',
    });
  },
  
  // Public wheel endpoints
  getPublicWheel: async (companyId: string, wheelId: string) => {
    return apiClient.get(`/public/companies/${companyId}/wheels/${wheelId}`);
  },
  
  spinWheel: async (companyId: string, wheelId: string, data: { lead: Record<string, string> }) => {
    return apiClient.post(`/public/companies/${companyId}/wheels/${wheelId}/spin`, data);
  },
  
  getPrizeDetails: async (playId: string) => {
    return apiClient.get(`/public/plays/${playId}`);
  },
  
  redeemPrize: async (playId: string, data: { pin: string }) => {
    return apiClient.post(`/public/plays/${playId}/redeem`, data);
  },
}; 