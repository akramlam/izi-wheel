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

// Entreprises Service
export const entreprisesService = {
  getEntreprises: async () => {
    try {
      const response = await apiClient.get('/companies');
      // The old code expects response.data.companies
      // Adjust if your backend returns a different structure (e.g., response.companies or just response as array)
      if (response && response.data && Array.isArray(response.data.companies)) {
        return response.data.companies;
      } else if (Array.isArray(response)) { // If backend returns array directly
        return response;
      }
      console.warn("Unexpected response structure for getEntreprises:", response);
      return []; 
    } catch (error) {
      console.error("Failed to fetch entreprises:", error);
      // Fallback to mock data for now, or rethrow
      // For now, let's return an empty array on error to avoid breaking UI that expects an array
      return [
        { id: "demo-company-id", name: "Demo Company (Fallback)", logo: "", metric: 1265, trend: 15.03, color: "bg-green-500", isActive: true, plan: 'BASIC', maxWheels: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ];
    }
  },

  getCompanyDetail: async (companyId: string) => {
    try {
      return await apiClient.get(`/companies/${companyId}`);
    } catch (error) {
      console.error(`Failed to fetch company detail for ${companyId}:`, error);
        const mockLeads = [
        { date: "12/09/2025", heure: "12:53", prenom: "Rayan", telephone: "+33 6 12 34 56 78", mail: "test@gmail.com" },
      ];
      return {
        id: companyId,
        name: `Company ${companyId} (Fallback)`,
          metric: 1943,
          trend: -0.03,
          color: "bg-red-500",
          leads: mockLeads,
        isActive: true,
        plan: 'BASIC',
        maxWheels: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
  },

  createEntreprise: async (entrepriseData: any) => {
    try {
      // The old SuperAdmin code sends 'admins' array in payload.
      // Ensure your 'entrepriseData' includes this if needed.
      // Example payload: { name: 'New Co', isActive: true, plan: 'PREMIUM', maxWheels: 5, admins: [{name: 'Admin', email: 'a@b.c', role: 'ADMIN'}] }
      return await apiClient.post('/companies', entrepriseData);
    } catch (error) {
      console.error("Failed to create entreprise:", error);
      throw error; 
    }
  },

  updateEntreprise: async (id: string, entrepriseData: any) => {
    try {
      // Example payload: { name: 'Updated Co', isActive: false, plan: 'BASIC', maxWheels: 2 }
      return await apiClient.patch(`/companies/${id}/plan`, entrepriseData);
    } catch (error) {
      console.error(`Failed to update entreprise ${id}:`, error);
      throw error; 
    }
  },

  deleteEntreprise: async (id: string) => {
    try {
      return await apiClient.delete(`/companies/${id}`);
    } catch (error) {
      console.error(`Failed to delete entreprise ${id}:`, error);
      throw error; 
    }
  },
};

//statistic service
export const statistiqueService = {
  getKPIData: async () => {
    return await apiClient.get('/stats');
  },
  
};