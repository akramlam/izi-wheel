/**
 * Utility function to extract meaningful error messages from API responses
 * @param error - The error object from axios or other sources
 * @param defaultMessage - Default message to show if no specific error is found
 * @returns A user-friendly error message
 */
export const extractErrorMessage = (error: any, defaultMessage: string = 'Une erreur est survenue. Veuillez réessayer.'): string => {
  // Handle null/undefined errors
  if (!error) {
    return defaultMessage;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Handle axios error responses
  if (error.response && error.response.data) {
    const data = error.response.data;
    
    // Check for common error fields
    if (data.error) {
      return data.error;
    }
    if (data.message) {
      return data.message;
    }
    if (data.details) {
      return data.details;
    }
    
    // Handle validation errors
    if (data.errors && Array.isArray(data.errors)) {
      return data.errors.join(', ');
    }
  }

  // Handle direct error messages
  if (error.message && typeof error.message === 'string') {
    return error.message;
  }

  // Handle network errors
  if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
    return 'Erreur de connexion. Vérifiez votre connexion internet.';
  }

  // Handle timeout errors
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return 'La requête a expiré. Veuillez réessayer.';
  }

  // Handle specific HTTP status codes
  if (error.response?.status) {
    switch (error.response.status) {
      case 401:
        return 'Accès non autorisé. Veuillez vous reconnecter.';
      case 403:
        return 'Permissions insuffisantes pour cette action.';
      case 404:
        return 'Ressource non trouvée.';
      case 409:
        return 'Conflit détecté. Cette ressource existe déjà.';
      case 422:
        return 'Données invalides. Vérifiez vos informations.';
      case 429:
        return 'Trop de requêtes. Veuillez patienter avant de réessayer.';
      case 500:
        return 'Erreur serveur. Veuillez réessayer plus tard.';
      case 502:
      case 503:
      case 504:
        return 'Service temporairement indisponible. Veuillez réessayer plus tard.';
      default:
        return defaultMessage;
    }
  }

  // Fallback to default message
  return defaultMessage;
};

/**
 * Specialized error handler for permission-related errors
 * @param error - The error object
 * @returns A user-friendly permission error message
 */
export const extractPermissionError = (error: any): string => {
  const message = extractErrorMessage(error, 'Permissions insuffisantes.');
  
  // Check for common permission-related keywords
  if (message.toLowerCase().includes('insufficient permissions') || 
      message.toLowerCase().includes('permissions insuffisantes') ||
      message.toLowerCase().includes('not authorized') ||
      message.toLowerCase().includes('access denied') ||
      message.toLowerCase().includes('forbidden')) {
    return 'Permissions insuffisantes pour accéder à cette ressource.';
  }
  
  return message;
};

/**
 * Toast helper with automatic error message extraction
 * @param toast - The toast function from useToast
 * @param error - The error object
 * @param title - Optional custom title
 * @param defaultMessage - Optional default message
 */
export const showErrorToast = (
  toast: any, 
  error: any, 
  title: string = 'Erreur', 
  defaultMessage?: string
) => {
  const errorMessage = extractErrorMessage(error, defaultMessage);
  
  toast({
    variant: 'destructive',
    title,
    description: errorMessage,
  });
}; 