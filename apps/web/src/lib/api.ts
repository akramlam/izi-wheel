import axios from 'axios';

// Get the API URL from environment variables or use a default
const API_URL = import.meta.env.VITE_API_URL || 'https://api.izikado.fr';

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
    if (!data.companyId) {
      console.error('Cannot create user: Missing companyId');
      return Promise.reject(new Error('Missing companyId'));
    }
    
    try {
      // Ensure all required fields are present for the inviteUser endpoint
      const payload = {
        name: data.name || '',  // Name is optional but should be included
        email: data.email,      // Email is required
        role: data.role || 'SUB', // Role is required and must be ADMIN or SUB
        isActive: data.isActive !== undefined ? data.isActive : true
      };
      
      console.log(`Creating user for company ${data.companyId}:`, payload);
      
      // This endpoint actually calls the inviteUser controller function
      const response = await apiClient.post(`/companies/${data.companyId}/users`, payload);
      
      // Log success response
      console.log(`User created successfully for ${data.email}:`, response.data);
      
      return response;
    } catch (error: any) {
      console.error('Error in createUser API function:', error);
      
      // Add more context to the error
      if (error.response && error.response.data) {
        console.error('Server response:', error.response.data);
        
        // Enhance error message with server details if available
        const serverError = error.response.data.error || 'Unknown server error';
        error.message = `API Error: ${serverError}`;
      }
      
      return Promise.reject(error);
    }
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
    try {
      // Add logging for debugging
      console.log(`getPublicWheel called with companyId: ${companyId}, wheelId: ${wheelId}`);
      
      // Validate the inputs
      if (!wheelId) {
        console.error('No wheelId provided to getPublicWheel');
        throw new Error('Wheel ID is required');
      }

      // Special case for 'company' in the URL path
      if (companyId === 'company') {
        console.log('Using direct wheel access for "company" path parameter');
        try {
          // Use the direct wheel endpoint without company ID
          const response = await apiClient.get(`/public/wheels/${wheelId}`);
          console.log('Response received from direct wheel endpoint:', response.status);
          return response;
        } catch (directError) {
          console.error('Error using direct wheel access:', directError);
          // Fall through to the standard approach
        }
      }

      // Validate the companyId - if it's not a UUID, use a fallback
      const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId);
      
      if (!isValidUuid) {
        // If the companyId is invalid, try to get a valid company ID
        console.warn(`Invalid companyId format: "${companyId}". Attempting to get a valid company ID.`);
        
        try {
          // Try to get a valid company ID from localStorage or the API
          const validCompanyId = await getValidCompanyId();
          
          if (validCompanyId) {
            console.log(`Using valid companyId: ${validCompanyId}`);
            
            try {
              const response = await apiClient.get(`/public/companies/${validCompanyId}/wheels/${wheelId}`);
              console.log('Response received using valid companyId:', response.status);
              
              if (!response.data || !response.data.wheel) {
                console.error('No wheel data in response using valid companyId:', response);
                throw new Error('No wheel data returned from API');
              }
              
              return response;
            } catch (companyError) {
              console.error('Error using valid companyId:', companyError);
              // Fall through to the fallback approach
            }
          }
        } catch (e) {
          console.error('Error getting valid companyId:', e);
        }
      }
      
      // If the companyId is valid, use the standard endpoint
      console.log(`Making standard request to /public/companies/${companyId}/wheels/${wheelId}`);
      const response = await apiClient.get(`/public/companies/${companyId}/wheels/${wheelId}`);
      
      if (!response.data || !response.data.wheel) {
        console.error('No wheel data in response from standard endpoint:', response);
        throw new Error('No wheel data returned from API');
      }
      
      console.log(`Successfully retrieved wheel data with ${response.data.wheel.slots?.length || 0} slots`);
      return response;
    } catch (error) {
      console.error('Error in getPublicWheel:', error);
      throw error;
    }
  },
  
  spinWheel: async (companyId: string, wheelId: string, data: { lead: Record<string, string> }) => {
    // Validate data before sending
    if (!data || !data.lead || Object.keys(data.lead).length === 0) {
      console.error('Invalid lead data for wheel spin:', data);
      throw new Error('Invalid lead data for wheel spin');
    }
    
    // Check if companyId is "company" (special case from URL)
    if (companyId === 'company') {
      console.warn('Using special "company" ID. Trying to get valid company ID from localStorage...');
      
      try {
        // Try to get a valid company ID from localStorage
        const storedCompanyId = localStorage.getItem('companyId');
        
        if (storedCompanyId && storedCompanyId !== 'null') {
          console.log(`Using company ID from localStorage: ${storedCompanyId}`);
          companyId = storedCompanyId;
        } else {
          // If no valid company ID in localStorage, use direct wheel endpoint
          console.warn('No valid company ID found in localStorage. Using direct wheel endpoint.');
          return apiClient.post(`/public/wheels/${wheelId}/spin`, data);
        }
      } catch (e) {
        console.error('Error handling company ID:', e);
        // Fallback to direct wheel endpoint
        return apiClient.post(`/public/wheels/${wheelId}/spin`, data);
      }
    }
    
    // Log the request being made
    console.log('Sending wheel spin request:', {
      url: `/public/companies/${companyId}/wheels/${wheelId}/spin`,
      data: data
    });
    
    // Check if companyId is valid UUID (if not 'company' which we handled above)
    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId);
    
    if (!isValidUuid) {
      // If companyId is invalid, use the direct wheel endpoint
      console.warn(`Invalid companyId: "${companyId}". Using direct wheel endpoint.`);
      return apiClient.post(`/public/wheels/${wheelId}/spin`, data);
    }
    
    try {
      const response = await apiClient.post(`/public/companies/${companyId}/wheels/${wheelId}/spin`, data);
      
      // Add a cache-busting parameter to QR code URL if it exists
      if (response.data?.play?.prize?.qrLink) {
        const qrLink = response.data.play.prize.qrLink;
        
        // Ensure the URL is absolute
        let fullQrLink = qrLink;
        if (!qrLink.startsWith('http://') && !qrLink.startsWith('https://')) {
          const baseUrl = API_URL;
          fullQrLink = `${baseUrl}${qrLink.startsWith('/') ? '' : '/'}${qrLink}`;
        }
        
        // Add a cache-busting parameter
        const cacheBuster = `t=${Date.now()}`;
        response.data.play.prize.qrLink = fullQrLink.includes('?') 
          ? `${fullQrLink}&${cacheBuster}` 
          : `${fullQrLink}${cacheBuster}`;
        
        console.log('Processed QR link:', response.data.play.prize.qrLink);
      } else if (response.data?.play?.result === 'WIN') {
        console.warn('Winning result but no QR link provided in response');
      }
      
      return response;
    } catch (error) {
      console.error('Error in spinWheel:', error);
      throw error;
    }
  },
  
  getPrizeDetails: async (playId: string) => {
    console.log('Fetching prize details for play ID:', playId);
    if (!playId) {
      console.error('No play ID provided');
      throw new Error('Identifiant de jeu manquant. Veuillez réessayer.');
    }
    
    // Validate if this is a real UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(playId)) {
      console.error('Invalid UUID format for play ID:', playId);
      throw new Error('Format d\'identifiant invalide. Impossible de récupérer les détails du prix.');
    }
    
    try {
      console.log('Making API request to /public/plays/' + playId);
      const result = await apiClient.get(`/public/plays/${playId}`);
      console.log('Prize details fetched successfully:', result.data);
      return result;
    } catch (error: any) {
      console.error('Error fetching prize details:', error);
      
      // Enhance the error message for better debugging
      if (error.response?.status === 400) {
        console.error('Bad Request (400) when fetching prize - Play ID might be invalid:', playId);
        throw new Error('Identifiant de jeu invalide. Impossible de récupérer les détails du prix.');
      } else if (error.response?.status === 404) {
        console.error('Not Found (404) when fetching prize - Play ID does not exist:', playId);
        throw new Error('Ce lot n\'existe pas ou a déjà été récupéré.');
      } else {
        throw new Error('Erreur lors de la récupération des détails du prix. Veuillez réessayer plus tard.');
      }
    }
  },
  
  debugPlayId: async (playId: string) => {
    console.log('Running diagnostics for play ID:', playId);
    
    if (!playId) {
      throw new Error('No play ID provided for diagnostics');
    }
    
    try {
      const response = await apiClient.get(`/public/debug/plays/${playId}`);
      console.log('Debug information received:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error in play ID diagnostics:', error);
      throw error;
    }
  },
  
  redeemPrize: async (playId: string, data: { pin: string }) => {
    console.log('Attempting to redeem prize for play ID:', playId);
    if (!playId || playId.startsWith('tmp-') || playId.startsWith('fallback-')) {
      console.error('Invalid play ID format. Cannot redeem prize for temporary ID:', playId);
      throw new Error('Ce lot ne peut pas être récupéré avec un identifiant temporaire.');
    }
    
    try {
      const result = await apiClient.post(`/public/plays/${playId}/redeem`, data);
      console.log('Prize redeemed successfully:', result.data);
      return result;
    } catch (error: any) {
      console.error('Error redeeming prize:', error);
      throw error;
    }
  },
  
  // Add a new function to fix wheels
  fixWheel: async (wheelId: string) => {
    const response = await apiClient.post(`/wheels/${wheelId}/fix`);
    return response;
  },
}; 
