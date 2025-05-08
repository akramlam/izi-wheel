import axios from 'axios';

// Get the API URL from environment variables or use a default
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create an Axios instance with default config
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

// API wrapper functions for common operations
export const api = {
  // Wheels
  getWheels: async () => {
    const companyId = localStorage.getItem('companyId');
    return apiClient.get(`/companies/${companyId}/wheels`);
  },
  
  getWheel: async (wheelId: string) => {
    const companyId = localStorage.getItem('companyId');
    return apiClient.get(`/companies/${companyId}/wheels/${wheelId}`);
  },
  
  createWheel: async (data: any) => {
    const companyId = localStorage.getItem('companyId');
    return apiClient.post(`/companies/${companyId}/wheels`, data);
  },
  
  updateWheel: async (wheelId: string, data: any) => {
    const companyId = localStorage.getItem('companyId');
    return apiClient.put(`/companies/${companyId}/wheels/${wheelId}`, data);
  },
  
  deleteWheel: async (wheelId: string) => {
    const companyId = localStorage.getItem('companyId');
    return apiClient.delete(`/companies/${companyId}/wheels/${wheelId}`);
  },
  
  // Slots
  getSlots: async (wheelId: string) => {
    const companyId = localStorage.getItem('companyId');
    return apiClient.get(`/companies/${companyId}/wheels/${wheelId}/slots`);
  },
  
  createSlot: async (wheelId: string, data: any) => {
    const companyId = localStorage.getItem('companyId');
    return apiClient.post(`/companies/${companyId}/wheels/${wheelId}/slots`, data);
  },
  
  updateSlot: async (wheelId: string, slotId: string, data: any) => {
    const companyId = localStorage.getItem('companyId');
    return apiClient.put(`/companies/${companyId}/wheels/${wheelId}/slots/${slotId}`, data);
  },
  
  deleteSlot: async (wheelId: string, slotId: string) => {
    const companyId = localStorage.getItem('companyId');
    return apiClient.delete(`/companies/${companyId}/wheels/${wheelId}/slots/${slotId}`);
  },
  
  bulkUpdateSlots: async (wheelId: string, data: any[]) => {
    const companyId = localStorage.getItem('companyId');
    return apiClient.post(`/companies/${companyId}/wheels/${wheelId}/slots/bulk`, data);
  },
  
  // Play history
  getPlayHistory: async (wheelId: string) => {
    const companyId = localStorage.getItem('companyId');
    return apiClient.get(`/companies/${companyId}/wheels/${wheelId}/play/history`);
  },
  
  // Companies (for SUPER admin)
  getCompanies: async () => {
    return apiClient.get('/companies');
  },
  
  createCompany: async (data: any) => {
    return apiClient.post('/companies', data);
  },
  
  updateCompany: async (companyId: string, data: any) => {
    return apiClient.put(`/companies/${companyId}`, data);
  },
  
  deleteCompany: async (companyId: string) => {
    return apiClient.delete(`/companies/${companyId}`);
  },
  
  // Sub-admins
  getSubAdmins: async () => {
    const companyId = localStorage.getItem('companyId');
    return apiClient.get(`/companies/${companyId}/users`);
  },
  
  createSubAdmin: async (data: any) => {
    const companyId = localStorage.getItem('companyId');
    return apiClient.post(`/companies/${companyId}/users`, data);
  },
  
  updateSubAdmin: async (userId: string, data: any) => {
    const companyId = localStorage.getItem('companyId');
    return apiClient.put(`/companies/${companyId}/users/${userId}`, data);
  },
  
  deleteSubAdmin: async (userId: string) => {
    const companyId = localStorage.getItem('companyId');
    return apiClient.delete(`/companies/${companyId}/users/${userId}`);
  },
}; 