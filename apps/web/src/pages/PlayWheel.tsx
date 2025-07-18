import { useState, useEffect, useCallback, useRef, useReducer } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, apiClient } from '../lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { toast } from '../hooks/use-toast';
import { AlertCircle, Loader2, RefreshCw, Users, Mail, Phone, Calendar, User } from 'lucide-react';
import { TimedConfetti } from '../components/magicui/timedConfetti';
import Wheel from '../components/wheel/Wheel';
import type { WheelConfig } from '../components/wheel/types';
import PlayerForm, { FormField, PlayerFormData } from '../components/PlayerForm';
import { Input } from '../components/ui/input';
import { detectAndLinkPhoneNumbers } from '../utils/phoneUtils';

// TypeScript declaration for window property
declare global {
  interface Window {
    fallbackTimeout?: NodeJS.Timeout | null;
    immediateFallback?: NodeJS.Timeout | null;
  }
}

// Define improved types
interface FormSchema {
  fields?: FormField[];
  [key: string]: any;
}

interface WheelSlot {
  id: string;
  label: string;
  color: string;
  weight: number;
  isWinning: boolean;
  position?: number;
}

interface Prize {
  pin: string;
  qrLink: string;
}

interface PlayData {
  id: string;
  result: 'WIN' | 'LOSE';
  prize?: Prize;
}

type WheelData = {
  id: string;
  name: string;
  formSchema: FormSchema | null;
  slots: WheelSlot[];
  socialNetwork?: string;
  redirectUrl?: string;
  redirectText?: string;
  playLimit?: string;
  gameRules?: string;
  footerText?: string;
  mainTitle?: string;
  bannerImage?: string;
  backgroundImage?: string;
};

type PlayResponse = {
  play: PlayData;
  slot: {
    id: string;
    label: string;
  };
};

// State management with useReducer
type UserFlowState = 'initial' | 'completedSocial' | 'spinning' | 'won' | 'claimed';
type CurrentStep = 'initial' | 'social' | 'spinWheel' | 'showPrize' | 'claimForm';

interface AppState {
  formData: Record<string, string>;
  mustSpin: boolean;
  prizeIndex: number;
  showResultModal: boolean;
  spinResult: PlayResponse | null;
  formFields: FormField[];
  wheelConfig: WheelConfig;
  showConfetti: boolean;
  showSocialRedirect: boolean;
  hasCompletedSocialAction: boolean;
  isLoading: boolean;
  showClaimForm: boolean;
  currentStep: CurrentStep;
  claimFormData: Record<string, string>;
  showThankyouMessage: boolean;
  userFlowState: UserFlowState;
  showRulesModal: boolean;
}

type AppAction =
  | { type: 'SET_FORM_DATA'; payload: Record<string, string> }
  | { type: 'SET_MUST_SPIN'; payload: boolean }
  | { type: 'SET_PRIZE_INDEX'; payload: number }
  | { type: 'SET_SHOW_RESULT_MODAL'; payload: boolean }
  | { type: 'SET_SPIN_RESULT'; payload: PlayResponse | null }
  | { type: 'SET_FORM_FIELDS'; payload: FormField[] }
  | { type: 'SET_WHEEL_CONFIG'; payload: WheelConfig }
  | { type: 'SET_SHOW_CONFETTI'; payload: boolean }
  | { type: 'SET_SHOW_SOCIAL_REDIRECT'; payload: boolean }
  | { type: 'SET_HAS_COMPLETED_SOCIAL_ACTION'; payload: boolean }
  | { type: 'SET_IS_LOADING'; payload: boolean }
  | { type: 'SET_SHOW_CLAIM_FORM'; payload: boolean }
  | { type: 'SET_CURRENT_STEP'; payload: CurrentStep }
  | { type: 'SET_CLAIM_FORM_DATA'; payload: Record<string, string> }
  | { type: 'SET_SHOW_THANKYOU_MESSAGE'; payload: boolean }
  | { type: 'SET_USER_FLOW_STATE'; payload: UserFlowState }
  | { type: 'SET_SHOW_RULES_MODAL'; payload: boolean }
  | { type: 'RESET_WHEEL_STATE' };

const initialState: AppState = {
  formData: {},
  mustSpin: false,
  prizeIndex: 0,
  showResultModal: false,
  spinResult: null,
  formFields: [],
  wheelConfig: {
    segments: [],
    spinDurationMin: 5,
    spinDurationMax: 8,
    sounds: {
      tick: true,
      win: true,
    },
    hapticFeedback: true,
  },
  showConfetti: false,
  showSocialRedirect: false,
  hasCompletedSocialAction: false,
  isLoading: false,
  showClaimForm: false,
  currentStep: 'initial',
  claimFormData: {},
  showThankyouMessage: false,
  userFlowState: 'initial',
  showRulesModal: false,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_FORM_DATA':
      return { ...state, formData: action.payload };
    case 'SET_MUST_SPIN':
      return { ...state, mustSpin: action.payload };
    case 'SET_PRIZE_INDEX':
      return { ...state, prizeIndex: action.payload };
    case 'SET_SHOW_RESULT_MODAL':
      return { ...state, showResultModal: action.payload };
    case 'SET_SPIN_RESULT':
      return { ...state, spinResult: action.payload };
    case 'SET_FORM_FIELDS':
      return { ...state, formFields: action.payload };
    case 'SET_WHEEL_CONFIG':
      return { ...state, wheelConfig: action.payload };
    case 'SET_SHOW_CONFETTI':
      return { ...state, showConfetti: action.payload };
    case 'SET_SHOW_SOCIAL_REDIRECT':
      return { ...state, showSocialRedirect: action.payload };
    case 'SET_HAS_COMPLETED_SOCIAL_ACTION':
      return { ...state, hasCompletedSocialAction: action.payload };
    case 'SET_IS_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_SHOW_CLAIM_FORM':
      return { ...state, showClaimForm: action.payload };
    case 'SET_CURRENT_STEP':
      return { ...state, currentStep: action.payload };
    case 'SET_CLAIM_FORM_DATA':
      return { ...state, claimFormData: action.payload };
    case 'SET_SHOW_THANKYOU_MESSAGE':
      return { ...state, showThankyouMessage: action.payload };
    case 'SET_USER_FLOW_STATE':
      return { ...state, userFlowState: action.payload };
    case 'SET_SHOW_RULES_MODAL':
      return { ...state, showRulesModal: action.payload };
    case 'RESET_WHEEL_STATE':
      return {
        ...state,
        mustSpin: false,
        spinResult: null,
        showConfetti: false,
        showResultModal: false,
        showClaimForm: false,
        showThankyouMessage: false,
        currentStep: 'spinWheel',
        userFlowState: 'completedSocial',
      };
    default:
      return state;
  }
}

// Mapping input types to icons
const inputIcons: Record<string, React.ReactNode> = {
  name: <User className="h-4 w-4 text-gray-400" />,
  email: <Mail className="h-4 w-4 text-gray-400" />,
  phone: <Phone className="h-4 w-4 text-gray-400" />,
};

// Brand colors
const BRAND = {
  primaryGradient: '#a25afd', // Violet
  secondaryGradient: '#6366f1', // Indigo
  backgroundGradient: 'linear-gradient(to bottom right, rgb(216, 180, 254), rgb(224, 231, 255))',
};

// Confetti colors
const CONFETTI_COLORS = [
  BRAND.primaryGradient,
  BRAND.secondaryGradient,
  '#ff5e7e',
  '#88ff5a',
  '#fcff42',
  '#ffa62d',
  '#ff36ff',
];

// Add a new component for the social network redirection dialog
const SocialRedirectDialog = ({
  open,
  onClose,
  network,
  redirectUrl,
  redirectText,
}: {
  open: boolean;
  onClose: () => void;
  network?: string;
  redirectUrl?: string;
  redirectText?: string;
}) => {
  const navigate = useNavigate();

  // Debug network info on render
  useEffect(() => {
    // Add detailed debugging in development mode
    if (import.meta.env.DEV) {
      const debugElement = document.getElementById('social-debug-info');
      if (debugElement) {
        debugElement.textContent = `Network: ${network || 'none'}, URL: ${redirectUrl || 'none'}, Open: ${open}`;
      }
    }
  }, [open, network, redirectUrl]);

  const getNetworkIcon = () => {
    switch (network?.toLowerCase()) {
      case 'google':
        return (
          <svg
            className="h-16 w-16 mb-4"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
          >
            <path d="M12 11h8.88c.08.53.12 1.06.12 1.6 0 4.41-3.16 7.55-7.55 7.55-4.41 0-8-3.59-8-8s3.59-8 8-8c2.07 0 3.92.8 5.37 2.11l-2.19 2.11C15.17 7.4 13.65 6.95 12 6.95c-2.76 0-5 2.24-5 5s2.24 5 5 5c2.64 0 4.41-1.54 4.8-3.95H12v-2z" />
          </svg>
        );
      case 'instagram':
        return (
          <svg
            className="h-16 w-16 mb-4"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
          >
            <path d="M12 2c-2.716 0-3.056.011-4.123.06-1.064.048-1.791.218-2.427.465a4.9 4.9 0 0 0-1.77 1.153A4.9 4.9 0 0 0 2.525 5.45c-.247.636-.417 1.363-.465 2.427C2.011 8.944 2 9.284 2 12s.011 3.056.06 4.123c.048 1.064.218 1.791.465 2.427a4.9 4.9 0 0 0 1.153 1.77 4.9 4.9 0 0 0 1.77 1.153c.636.247 1.363.417 2.427.465 1.067.048 1.407.06 4.123.06s3.056-.011 4.123-.06c1.064-.048 1.791-.218 2.427-.465a4.9 4.9 0 0 0 1.77-1.153 4.9 4.9 0 0 0 1.153-1.77c.247-.636.417-1.363.465-2.427.048-1.067.06-1.407.06-4.123s-.011-3.056-.06-4.123c-.048-1.064-.218-1.791-.465-2.427a4.9 4.9 0 0 0-1.153-1.77 4.9 4.9 0 0 0-1.77-1.153c-.636-.247-1.363-.417-2.427-.465C15.056 2.011 14.716 2 12 2zm0 1.802c2.67 0 2.986.01 4.04.058.976.045 1.505.207 1.858.344.466.182.8.399 1.15.748.35.35.566.684.748 1.15.137.353.3.882.344 1.857.048 1.055.058 1.37.058 4.041 0 2.67-.01 2.986-.058 4.04-.045.976-.207 1.505-.344 1.858a3.1 3.1 0 0 1-.748 1.15c-.35.35-.684.566-1.15.748-.353.137-.882.3-1.857.344-1.054.048-1.37.058-4.041.058-2.67 0-2.987-.01-4.04-.058-.976-.045-1.505-.207-1.858-.344a3.1 3.1 0 0 1-1.15-.748 3.1 3.1 0 0 1-.748-1.15c-.137-.353-.3-.882-.344-1.857-.048-1.055-.058-1.37-.058-4.041 0-2.67.01-2.986.058-4.04.045-.976.207-1.505.344-1.858.182-.466.399-.8.748-1.15.35-.35.684-.566 1.15-.748.353-.137.882-.3 1.857-.344 1.055-.048 1.37-.058 4.041-.058zm0 3.063a5.135 5.135 0 1 0 0 10.27 5.135 5.135 0 0 0 0-10.27zm0 8.468a3.333 3.333 0 1 1 0-6.666 3.333 3.333 0 0 1 0 6.666zm6.538-8.671a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0z" />
          </svg>
        );
      case 'tiktok':
        return (
          <svg
            className="h-16 w-16 mb-4"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
          >
            <path d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.59-1.16-2.59-2.5a2.592 2.592 0 0 1 4.3-1.96V10.3a5.636 5.636 0 0 0-1.71-.26c-3.09 0-5.59 2.5-5.59 5.59s2.5 5.59 5.59 5.59 5.59-2.5 5.59-5.59V7.73c.99.79 2.22 1.25 3.59 1.25v-3.1c0-.02-2.44-.06-2.44-.06Z" />
          </svg>
        );
      case 'facebook':
        return (
          <svg
            className="h-16 w-16 mb-4"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
          >
            <path d="M20.007 3H3.993A.993.993 0 0 0 3 3.993v16.014c0 .549.444.993.993.993h8.621v-6.97h-2.347v-2.716h2.347V9.309c0-2.325 1.42-3.591 3.494-3.591.993 0 1.847.074 2.096.107v2.43h-1.438c-1.128 0-1.346.537-1.346 1.324v1.734h2.69l-.35 2.717h-2.34V21h4.587a.993.993 0 0 0 .993-.993V3.993A.993.993 0 0 0 20.007 3z" />
          </svg>
        );
      default:
        // If we don't have a specific icon, show a generic one
        return (
          <svg
            className="h-16 w-16 mb-4"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
          >
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 14h2v2h-2v-2zm0-10h2v8h-2V6z" />
          </svg>
        );
    }
  };

  const handleRedirect = () => {
    if (redirectUrl) {
      window.open(redirectUrl, '_blank');
    }
  };

  const getTitle = () => {
    switch (network?.toLowerCase()) {
      case 'google':
        return 'LAISSEZ NOUS UN AVIS';
      case 'instagram':
      case 'tiktok':
      case 'facebook':
      case 'snapchat':
        return 'SUIVEZ-NOUS SUR NOS RÉSEAUX';
      default:
        return 'SUIVEZ-NOUS';
    }
  };

  const getButtonText = () => {
    switch (network?.toLowerCase()) {
      case 'google':
        return 'Noter sur Google';
      case 'instagram':
        return 'Suivre sur Instagram';
      case 'tiktok':
        return 'Suivre sur TikTok';
      case 'facebook':
        return 'Suivre sur Facebook';
      case 'snapchat':
        return 'Suivre sur Snapchat';
      default:
        return 'Continuer';
    }
  };

  const getInstructions = () => {
    switch (network?.toLowerCase()) {
      case 'google':
        return (
          <div className="flex flex-col space-y-4 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                1
              </div>
              <span>Laissez un avis sur Google</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                2
              </div>
              <span>Revenez sur cette page</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                3
              </div>
              <span>Tournez la roue !</span>
            </div>
          </div>
        );
      case 'instagram':
      case 'tiktok':
      case 'facebook':
      case 'snapchat':
        return (
          <div className="flex flex-col space-y-4 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                1
              </div>
              <span>
                Suivez-nous sur{' '}
                {network.charAt(0) + network.slice(1).toLowerCase().replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                2
              </div>
              <span>Revenez sur cette page</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                3
              </div>
              <span>Tournez la roue !</span>
            </div>
          </div>
        );
      default:
        // Show generic instructions if network type is unknown
        return (
          <div className="flex flex-col space-y-4 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                1
              </div>
              <span>Suivez-nous sur nos réseaux sociaux</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                2
              </div>
              <span>Revenez sur cette page</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                3
              </div>
              <span>Tournez la roue !</span>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">{getTitle()}</DialogTitle>

          {/* Debug indicator in development mode */}
          {import.meta.env.DEV && (
            <div className="text-xs text-blue-600 mt-1 text-center">
              Network: {network || 'none'}
            </div>
          )}
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-6">
          {getNetworkIcon()}
          <p className="text-center mb-6">
            {redirectText || 'Vous allez être redirigé vers notre page.'}
          </p>
          {getInstructions()}
          <Button
            className="w-full mt-6 bg-gradient-to-r from-indigo-500 to-purple-500"
            onClick={() => {
              handleRedirect();
              // Call onClose after the redirect to allow the user to proceed
              onClose();
            }}
          >
            {getButtonText()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Add error display component
const ErrorDisplay = ({ error }: { error: any }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md flex flex-col items-center space-y-4">
      <div className="flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
        <AlertCircle className="h-8 w-8 text-red-600" />
      </div>
      <h2 className="text-xl font-bold text-gray-900">Something went wrong</h2>
      <p className="text-gray-500 text-center">
        We couldn't load the wheel. Please try again later or contact support.
      </p>
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="text-sm text-blue-500 hover:text-blue-700"
      >
        {showDetails ? 'Hide' : 'Show'} technical details
      </button>

      {showDetails && (
        <div className="w-full bg-gray-100 p-4 rounded text-left overflow-auto text-xs">
          <p>
            <strong>Error:</strong> {error?.message || String(error)}
          </p>
          <p>
            <strong>URL:</strong> {window.location.href}
          </p>
        </div>
      )}

      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Try Again
      </button>
    </div>
  );
};

const PlayWheel = () => {
  const { companyId, wheelId } = useParams<{ companyId: string; wheelId: string }>();
  const navigate = useNavigate();

  console.log('[DEBUG] PlayWheel render - Route params:', { companyId, wheelId });
  console.log('[DEBUG] Current URL:', window.location.href);

  // Directly compute effective parameters
  const getEffectiveParams = () => {
    // Special handling for the /play/company/:wheelId route pattern
    const url = new URL(window.location.href);
    const pathParts = url.pathname.split('/').filter(Boolean);

    console.log('[DEBUG] URL path parts:', pathParts);

    // Check if we're on the /play/company/:wheelId route
    if (pathParts.length >= 3 && pathParts[0] === 'play' && pathParts[1] === 'company') {
      const actualWheelId = pathParts[2];
      console.log('[DEBUG] Detected company route, wheelId:', actualWheelId);
      return {
        companyId: 'company',
        wheelId: actualWheelId,
      };
    }

    // Use normal route params
    console.log('[DEBUG] Using normal route params:', { companyId, wheelId });
    return {
      companyId,
      wheelId,
    };
  };

  const effectiveParams = getEffectiveParams();
  console.log('[DEBUG] Effective params:', effectiveParams);

  const [state, dispatch] = useReducer(appReducer, initialState);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const retryCount = useRef<number>(0);

  // Add a confetti ref to control it
  const confettiRef = useRef<any>(null);

  // Fetch wheel data
  const {
    data: wheelData,
    isLoading: isLoadingWheel,
    error: wheelError,
    refetch,
  } = useQuery<WheelData>({
    queryKey: ['wheel', effectiveParams.companyId, effectiveParams.wheelId],
    queryFn: async () => {
      console.log('[DEBUG] useQuery queryFn called with params:', effectiveParams);
      try {
        const effectiveCompanyId = effectiveParams.companyId;
        const effectiveWheelId = effectiveParams.wheelId;

        console.log('[DEBUG] Making API call with:', { effectiveCompanyId, effectiveWheelId });

        if (!effectiveCompanyId || !effectiveWheelId) {
          console.error('[DEBUG] Missing required parameters:', {
            effectiveCompanyId,
            effectiveWheelId,
          });
          throw new Error('Missing required parameters: companyId and wheelId');
        }

        // Special handling for "company" in the URL path
        if (effectiveCompanyId === 'company') {
          // Make a direct fetch call to the proper API endpoint
          const apiUrl = import.meta.env.VITE_API_URL || 'https://api.izikado.fr';
          const directUrl = `${apiUrl}/public/company/${effectiveWheelId}`;

          console.log('[DEBUG] Making company API call to:', directUrl);

          const response = await fetch(directUrl);

          console.log('[DEBUG] Company API response status:', response.status);

          if (!response.ok) {
            console.error('[DEBUG] Company API call failed:', response.status, response.statusText);
            throw new Error(`API call failed with status: ${response.status}`);
          }

          const data = await response.json();
          console.log('[DEBUG] Company API response data:', data);

          if (data && data.wheel) {
            console.log('[DEBUG] Successfully got wheel data:', data.wheel);
            return data.wheel;
          } else {
            console.error('[DEBUG] No wheel data in company response');
            throw new Error('No wheel data in response');
          }
        }

        // Standard approach for other routes
        console.log('[DEBUG] Making standard API call');
        const response = await api.getPublicWheel(effectiveCompanyId, effectiveWheelId);

        console.log('[DEBUG] Standard API response:', response);

        if (!response.data || !response.data.wheel) {
          console.error('[DEBUG] No wheel data in standard response');
          throw new Error('No wheel data returned from API');
        }

        console.log('[DEBUG] Successfully got wheel data from standard API:', response.data.wheel);
        return response.data.wheel;
      } catch (error) {
        console.error('[DEBUG] useQuery error:', error);
        throw error;
      }
    },
    enabled: !!(effectiveParams.companyId && effectiveParams.wheelId),
    retry: 3,
    retryDelay: (attempt) => Math.min(attempt > 1 ? 2000 : 1000, 30 * 1000),
    staleTime: 30000, // Data is fresh for 30 seconds
  });

  console.log('[DEBUG] useQuery state:', {
    isLoadingWheel,
    hasWheelData: !!wheelData,
    wheelError: wheelError?.message,
    queryEnabled: !!(effectiveParams.companyId && effectiveParams.wheelId),
  });

  // Prepare wheel data when loaded
  useEffect(() => {
    console.log('[DEBUG] wheelData useEffect triggered, wheelData:', !!wheelData);
    if (wheelData) {
      // Log social network configuration for debugging
      if (wheelData.socialNetwork) {
      } else {
      }

      // Ensure we have valid slot data, even if the wheel has no properly configured slots
      if (!wheelData.slots || wheelData.slots.length === 0) {
        // Create default slots if none exist
        const defaultSlots = [
          {
            id: 'default-1',
            label: 'Prix 1',
            color: '#FF6384',
            weight: 34,
            isWinning: true,
            position: 0,
          },
          {
            id: 'default-2',
            label: 'Prix 2',
            color: '#36A2EB',
            weight: 33,
            isWinning: false,
            position: 1,
          },
          {
            id: 'default-3',
            label: 'Prix 3',
            color: '#FFCE56',
            weight: 33,
            isWinning: false,
            position: 2,
          },
        ];

        // Use default slots for display purposes
        const segments = defaultSlots.map((slot) => ({
          label: slot.label,
          color: slot.color || (slot.isWinning ? '#28a745' : '#dc3545'),
          isWinning: slot.isWinning,
        }));

        dispatch({ type: 'SET_WHEEL_CONFIG', payload: {
          ...state.wheelConfig,
          segments,
          colors: {
            primaryGradient: BRAND.primaryGradient,
            secondaryGradient: BRAND.secondaryGradient,
          },
        } });
      } else {
        // Ensure slots have position values with STABLE sorting
        const sortedSlots = [...wheelData.slots].sort(
          (a: WheelData['slots'][0], b: WheelData['slots'][0]) => {
            const posA = a.position !== undefined ? a.position : 999;
            const posB = b.position !== undefined ? b.position : 999;
            
            // If positions are equal, use slot ID as stable tiebreaker
            if (posA === posB) {
              return a.id.localeCompare(b.id);
            }
            
            return posA - posB;
          }
        );

        // Check if any slot is marked as winning
        const hasWinningSlot = sortedSlots.some((slot) => slot.isWinning);

        // Make the first slot winning if none are winning
        if (!hasWinningSlot && sortedSlots.length > 0) {
          sortedSlots[0].isWinning = true;
        }

        // Set wheel colors and prepare segments configuration
        const segments = sortedSlots.map((slot) => ({
          id: slot.id,
          label: slot.label,
          color: slot.color || (slot.isWinning ? '#28a745' : '#dc3545'),
          isWinning: slot.isWinning,
        }));

        dispatch({ type: 'SET_WHEEL_CONFIG', payload: {
          ...state.wheelConfig,
          segments,
          colors: {
            primaryGradient: BRAND.primaryGradient,
            secondaryGradient: BRAND.secondaryGradient,
          },
        } });

        // setDebugInfo(`Loaded ${segments.length} wheel segments successfully`);
      }

      // Extract form fields from formSchema
      const fields: FormField[] = [];
      if (wheelData.formSchema) {
        if (Array.isArray(wheelData.formSchema.fields)) {
          // If formSchema has a fields array
          fields.push(...wheelData.formSchema.fields);
        } else if (typeof wheelData.formSchema === 'object') {
          // If formSchema is directly defining fields
          const defaultFields = [
            { name: 'name', label: 'Prénom', type: 'text', required: true },
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'phone', label: 'Téléphone', type: 'tel', required: false },
          ];
          fields.push(...defaultFields);
        }
      }
      dispatch({ type: 'SET_FORM_FIELDS', payload: fields });

      // Initialize state based on social network requirement
      if (wheelData.socialNetwork && wheelData.socialNetwork !== 'NONE') {
        console.log('[DEBUG] Social network required, setting state to initial');
        dispatch({ type: 'SET_USER_FLOW_STATE', payload: 'initial' });
        dispatch({ type: 'SET_CURRENT_STEP', payload: 'initial' });
      } else {
        console.log('[DEBUG] No social network required, setting state to spinWheel');
        dispatch({ type: 'SET_USER_FLOW_STATE', payload: 'completedSocial' });
        dispatch({ type: 'SET_CURRENT_STEP', payload: 'spinWheel' });
      }
    }
  }, [wheelData]); // 🔥 CRITICAL FIX: Remove state.wheelConfig from dependency array to prevent infinite loop

  // Modify the handleStartProcess function
  const handleStartProcess = () => {
    // When button is clicked first time and social network is configured,
    // show the social popup immediately
    if (state.currentStep === 'initial') {
      if (wheelData?.socialNetwork && wheelData?.socialNetwork !== 'NONE') {
        // Show social popup immediately on first button click
        dispatch({ type: 'SET_CURRENT_STEP', payload: 'social' });
        dispatch({ type: 'SET_SHOW_SOCIAL_REDIRECT', payload: true });
      } else {
        // If no social network, proceed directly to allow spinning
        dispatch({ type: 'SET_CURRENT_STEP', payload: 'spinWheel' });
        dispatch({ type: 'SET_USER_FLOW_STATE', payload: 'completedSocial' });

        // Proceed with spinning
        handleSpinClick();
      }
      return;
    }

    // If we've shown the social prompt and user has completed the action,
    // now we can actually spin the wheel
    if (state.currentStep === 'spinWheel' && state.userFlowState === 'completedSocial') {
      // Proceed with spinning
      handleSpinClick();
    }
  };

  // Handle social redirect close
  const handleSocialRedirectClose = () => {
    dispatch({ type: 'SET_SHOW_SOCIAL_REDIRECT', payload: false });
    dispatch({ type: 'SET_HAS_COMPLETED_SOCIAL_ACTION', payload: true });
    dispatch({ type: 'SET_USER_FLOW_STATE', payload: 'completedSocial' });
    dispatch({ type: 'SET_CURRENT_STEP', payload: 'spinWheel' });
  };

  // Handle actual wheel spin after social action
  const handleSpinWithoutSocial = () => {
    // Initial lead data (will be updated later with full form)
    const initialLead = {
      session_id: `session_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    dispatch({ type: 'SET_FORM_DATA', payload: initialLead });
    spinWheel();
  };

  // Modify handleSpinClick to follow the flow diagram
  const handleSpinClick = () => {
    // Check if we need to show social popup first
    if (
      state.currentStep === 'initial' &&
      wheelData?.socialNetwork &&
      wheelData?.socialNetwork !== 'NONE'
    ) {
      // Show social popup when user first tries to spin
      dispatch({ type: 'SET_SHOW_SOCIAL_REDIRECT', payload: true });
      dispatch({ type: 'SET_CURRENT_STEP', payload: 'social' });
    } else if (
      state.currentStep === 'spinWheel' &&
      state.userFlowState === 'initial' &&
      wheelData?.socialNetwork &&
      wheelData?.socialNetwork !== 'NONE'
    ) {
      // Show social popup when user tries to spin and social action is required
      dispatch({ type: 'SET_SHOW_SOCIAL_REDIRECT', payload: true });
      dispatch({ type: 'SET_CURRENT_STEP', payload: 'social' });
    } else if (
      state.currentStep === 'spinWheel' &&
      (state.userFlowState === 'completedSocial' ||
        !wheelData?.socialNetwork ||
        wheelData?.socialNetwork === 'NONE')
    ) {
      // Only allow spin if social action is completed or not required
      dispatch({ type: 'SET_USER_FLOW_STATE', payload: 'spinning' });
      handleSpinWithoutSocial();
    } else if (
      state.currentStep === 'initial' &&
      (!wheelData?.socialNetwork || wheelData?.socialNetwork === 'NONE')
    ) {
      // If no social required, go directly to spin
      dispatch({ type: 'SET_USER_FLOW_STATE', payload: 'completedSocial' });
      dispatch({ type: 'SET_CURRENT_STEP', payload: 'spinWheel' });
      dispatch({ type: 'SET_USER_FLOW_STATE', payload: 'spinning' });
      handleSpinWithoutSocial();
    }
  };

  // Spin wheel mutation
  const { mutate: spinWheel, isPending: isSpinning } = useMutation({
    mutationFn: async () => {
      // For initial spin, use minimal data
      const response = await api.spinWheel(
        effectiveParams.companyId || '',
        effectiveParams.wheelId || '',
        {
          lead: state.formData,
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      // wheelConfig.segments is the source of truth for visual indexing.
      // It's derived from wheelData.slots, sorted by position.
      if (!state.wheelConfig.segments || state.wheelConfig.segments.length === 0) {
        toast({
          title: 'Erreur Roue',
          description: 'Configuration de la roue invalide.',
          variant: 'destructive',
        });
        // Potentially reset state or disable further interaction
        dispatch({ type: 'SET_USER_FLOW_STATE', payload: 'completedSocial' }); // Reset flow
        return;
      }
      if (!data || !data.slot || !data.slot.id) {
        // Try to use the first slot as a fallback if we have wheel data
        if (state.wheelConfig.segments && state.wheelConfig.segments.length > 0) {
          // Create a modified data object with the first segment as the slot
          const fallbackData = {
            ...data,
            slot: {
              id: state.wheelConfig.segments[0].id,
              label: state.wheelConfig.segments[0].label,
            },
          };

          // Continue processing with the fallback data
          handleSpinResultWithData(fallbackData);
          return;
        }

        // If we can't create a fallback, show error and reset
        toast({
          title: 'Erreur Serveur',
          description: 'Réponse du serveur invalide.',
          variant: 'destructive',
        });
        dispatch({ type: 'SET_USER_FLOW_STATE', payload: 'completedSocial' }); // Reset flow
        return;
      }

      // If we have valid data, process it normally
      handleSpinResultWithData(data);
    },
    onError: (error: any) => {
      console.error('Error spinning wheel:', error);

      // Type-safe error handling for Axios errors
      let backendMsg = '';
      let errorCode = '';
      let playLimit = '';

      if (error && error.response && error.response.data) {
        backendMsg = error.response.data.error || '';
        errorCode = error.response.data.code || '';
        playLimit = error.response.data.playLimit || '';
      }

      // Handle specific play limit errors
      if (error.response?.status === 429 && errorCode === 'PLAY_LIMIT_EXCEEDED') {
        let limitMessage = '';
        if (playLimit === 'ONCE_PER_DAY') {
          limitMessage = "Vous avez déjà joué aujourd'hui. Vous pourrez rejouer demain !";
        } else if (playLimit === 'ONCE_PER_MONTH') {
          limitMessage = 'Vous avez déjà joué ce mois-ci. Vous pourrez rejouer le mois prochain !';
        } else {
          limitMessage = backendMsg || 'Limite de jeu atteinte. Veuillez réessayer plus tard.';
        }

        toast({
          title: 'Limite de jeu atteinte',
          description: limitMessage,
          variant: 'destructive',
          duration: 5000,
        });
      } else {
        // Handle other errors
        toast({
          title: 'Error',
          description: backendMsg || 'Failed to spin the wheel. Please try again.',
          variant: 'destructive',
        });
      }

      dispatch({ type: 'SET_CURRENT_STEP', payload: 'spinWheel' });
      dispatch({ type: 'SET_USER_FLOW_STATE', payload: 'completedSocial' });
    },
  });

  // Helper function to handle spin result data
  const handleSpinResultWithData = (data: any) => {
    console.log('🎯 PlayWheel: Backend response data:', JSON.parse(JSON.stringify(data)));

    // 🔥 CRITICAL FIX: Use backend's prizeIndex directly instead of calculating our own
    // The backend already calculated the correct index using the same stable sorting logic
    let prizeIndexToUse = 0; // Default fallback
    
    if (data.prizeIndex !== undefined && data.prizeIndex !== null && data.prizeIndex >= 0) {
      // Backend provided the correct index - use it directly
      prizeIndexToUse = data.prizeIndex;
      console.log('✅ Using backend prizeIndex:', prizeIndexToUse);
    } else if (data.slot && data.slot.id) {
      // Fallback: try to find by slot ID (old logic)
      const foundIndex = state.wheelConfig.segments.findIndex(segment => segment.id === data.slot.id);
      if (foundIndex !== -1) {
        prizeIndexToUse = foundIndex;
        console.log('✅ Found prizeIndex via slot ID:', prizeIndexToUse);
      } else {
        // Last resort: try to find by label
        const labelIndex = state.wheelConfig.segments.findIndex(segment => segment.label === data.slot.label);
        if (labelIndex !== -1) {
          prizeIndexToUse = labelIndex;
          console.log('✅ Found prizeIndex via label:', prizeIndexToUse);
        } else {
          console.log('⚠️ Could not find matching segment, using fallback index 0');
          prizeIndexToUse = 0;
        }
      }
    }

    console.log('🎯 Final prizeIndex to use:', prizeIndexToUse);
    dispatch({ type: 'SET_SPIN_RESULT', payload: data });
    dispatch({ type: 'SET_PRIZE_INDEX', payload: prizeIndexToUse });
    dispatch({ type: 'SET_MUST_SPIN', payload: true });

    // 🔥 SIMPLIFIED TIMEOUT MECHANISM: Only one timeout that triggers the result
    // Clear any existing timeouts first
    if (window.fallbackTimeout) {
      clearTimeout(window.fallbackTimeout);
      window.fallbackTimeout = null;
    }
    if (window.immediateFallback) {
      clearTimeout(window.immediateFallback);
      window.immediateFallback = null;
    }

    // Set a single, reliable timeout that will trigger the result
    // This acts as both the expected completion time and the fallback
    const completionTimeout = setTimeout(() => {
      console.log('⚡ Timeout triggered - showing result');
      dispatch({ type: 'SET_MUST_SPIN', payload: false });
      dispatch({ type: 'SET_SHOW_RESULT_MODAL', payload: true });
      
      if (data?.play.result === 'WIN') {
        dispatch({ type: 'SET_SHOW_CONFETTI', payload: true });
        dispatch({ type: 'SET_USER_FLOW_STATE', payload: 'won' });
        dispatch({ type: 'SET_CURRENT_STEP', payload: 'showPrize' });
      } else {
        dispatch({ type: 'SET_CURRENT_STEP', payload: 'spinWheel' });
      }
    }, 8000); // 8 seconds should be enough for most wheel animations

    // Store the timeout reference
    window.fallbackTimeout = completionTimeout;
  };

  // Debug effect to monitor mustSpin state changes
  useEffect(() => {
    console.log('🎯 mustSpin state changed to:', state.mustSpin);
  }, [state.mustSpin]);

  // Debug effect to monitor showResultModal state changes
  useEffect(() => {
    console.log('🎯 showResultModal state changed to:', state.showResultModal);
  }, [state.showResultModal]);

  // Cleanup effect to clear any remaining timeouts when component unmounts
  useEffect(() => {
    return () => {
      // Clear any remaining timeouts on unmount
      if (window.fallbackTimeout) {
        clearTimeout(window.fallbackTimeout);
        window.fallbackTimeout = null;
      }
      if (window.immediateFallback) {
        clearTimeout(window.immediateFallback);
        window.immediateFallback = null;
      }
    };
  }, []);

  // Handle wheel finishing spin - called by wheel component when animation completes
  const handleWheelFinishedSpin = () => {
    console.log('✅ WHEEL CALLBACK: Wheel finished spinning');

    // 🔥 CRITICAL FIX: Clear the fallback timeout since the wheel callback worked properly
    if (window.fallbackTimeout) {
      clearTimeout(window.fallbackTimeout);
      window.fallbackTimeout = null;
      console.log('✅ Cleared fallback timeout - wheel callback worked properly');
    }

    // Reset the spinning state immediately
    dispatch({ type: 'SET_MUST_SPIN', payload: false });

    // Show result modal immediately since wheel has finished spinning
    dispatch({ type: 'SET_SHOW_RESULT_MODAL', payload: true });
    console.log('✅ Result modal triggered by wheel callback');

    if (state.spinResult?.play.result === 'WIN') {
      // Reset retry counter for QR code loading
      retryCount.current = 0;

      // Show confetti for wins
      dispatch({ type: 'SET_SHOW_CONFETTI', payload: true });
      dispatch({ type: 'SET_USER_FLOW_STATE', payload: 'won' });
      dispatch({ type: 'SET_CURRENT_STEP', payload: 'showPrize' });
      console.log('✅ Set up winning result flow');

      // Stop confetti after 8 seconds
      setTimeout(() => {
        if (state.userFlowState === 'won') {
          dispatch({ type: 'SET_SHOW_CONFETTI', payload: false });
        }
      }, 8000);
    } else {
      // For losing results, reset to spin state
      dispatch({ type: 'SET_CURRENT_STEP', payload: 'spinWheel' });
      console.log('✅ Set up losing result flow');
    }
  };

  // Handle result modal close and transition to next flow step
  const handleResultModalClose = () => {
    // Stop the confetti immediately when closing the modal
    dispatch({ type: 'SET_SHOW_CONFETTI', payload: false });
    dispatch({ type: 'SET_SHOW_RESULT_MODAL', payload: false });

    // If user won and is in the showPrize step, show the claim form
    if (state.spinResult?.play.result === 'WIN' && state.currentStep === 'showPrize') {
      dispatch({ type: 'SET_CURRENT_STEP', payload: 'claimForm' });
      dispatch({ type: 'SET_SHOW_CLAIM_FORM', payload: true });
    } else {
      // Otherwise reset to initial state

      dispatch({ type: 'SET_CURRENT_STEP', payload: 'spinWheel' });
      dispatch({ type: 'SET_USER_FLOW_STATE', payload: 'completedSocial' });
    }
  };

  // Handle claim form submission
  const handleClaimFormSubmit = async (data: PlayerFormData) => {
    // Stop confetti immediately
    dispatch({ type: 'SET_SHOW_CONFETTI', payload: false });

    // Store the claim data
    dispatch({ type: 'SET_CLAIM_FORM_DATA', payload: {
      name: data.name,
      email: data.email,
      phone: data.phone || '',
      playId: state.spinResult?.play.id || '',
      prize: state.spinResult?.slot.label || '',
      timestamp: new Date().toISOString(),
    } });

    // Call API to claim the prize and send email
    if (state.spinResult?.play.id) {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://api.izikado.fr';
        const response = await fetch(`${apiBaseUrl}/public/plays/${state.spinResult.play.id}/claim`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            phone: data.phone || undefined,
          }),
        });

        if (response.ok) {
          const result = await response.json();

          // Set user flow to claimed
          dispatch({ type: 'SET_USER_FLOW_STATE', payload: 'claimed' });
          dispatch({ type: 'SET_SHOW_CLAIM_FORM', payload: false });
          dispatch({ type: 'SET_SHOW_THANKYOU_MESSAGE', payload: true });

          toast({
            title: 'Prix réclamé avec succès !',
            description: 'Vous recevrez un email avec les détails de votre prix.',
          });
        } else {
          const error = await response.json();

          toast({
            title: 'Erreur',
            description: error.error || 'Impossible de réclamer le prix. Veuillez réessayer.',
            variant: 'destructive',
          });
          return; // Don't proceed if API call failed
        }
      } catch (error) {
        toast({
          title: 'Erreur de connexion',
          description: 'Impossible de contacter le serveur. Veuillez vérifier votre connexion.',
          variant: 'destructive',
        });
        return; // Don't proceed if API call failed
      }

      // Show thank you message for 3 seconds then reset
      setTimeout(() => {
        dispatch({ type: 'SET_SHOW_RESULT_MODAL', payload: false });
        dispatch({ type: 'SET_SHOW_THANKYOU_MESSAGE', payload: false });
        dispatch({ type: 'SET_CURRENT_STEP', payload: 'spinWheel' });
        // Reset states to allow playing again
        dispatch({ type: 'SET_MUST_SPIN', payload: false });
        dispatch({ type: 'SET_SPIN_RESULT', payload: null });
        dispatch({ type: 'SET_SHOW_CONFETTI', payload: false });
        dispatch({ type: 'SET_USER_FLOW_STATE', payload: 'completedSocial' });
      }, 3000);
    }
  };

  // Get QR code URL with cache busting
  const getQRCodeUrl = () => {
    // Safety check - if spinResult or prize doesn't exist
    if (!state.spinResult || !state.spinResult.play || !state.spinResult.play.prize) {
      // Return a fallback "no QR" image
      return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMWYxZjEiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIyMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgYWxpZ25tZW50LWJhc2VsaW5lPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzeXN0ZW0tdWksIHNhbnMtc2VyaWYiIGZpbGw9IiM5OTkiPlBhcyBkZSBRUjwvdGV4dD48L3N2Zz4=';
    }

    // We know prize is defined at this point
    const prize = state.spinResult.play.prize;

    // If we have a qrLink from the API, use it directly with cache busting
    if (prize.qrLink) {
      // Check if the QR link is already a data URL
      if (prize.qrLink.startsWith('data:')) {
        return prize.qrLink;
      }

      // Check if the QR link is already a full URL
      if (prize.qrLink.startsWith('http')) {
        // Add cache busting parameter to the URL
        const cacheBuster = `t=${Date.now()}`;
        const separator = prize.qrLink.includes('?') ? '&' : '?';
        return `${prize.qrLink}${separator}${cacheBuster}`;
      }

      // Otherwise, it's a relative URL - append to API base URL
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://api.izikado.fr';
      const qrUrl = new URL(prize.qrLink, apiBaseUrl).toString();
      const cacheBuster = `t=${Date.now()}`;
      const separator = qrUrl.includes('?') ? '&' : '?';
      return `${qrUrl}${separator}${cacheBuster}`;
    }

    // If we have a PIN but no QR link, create a fallback QR code
    if (prize.pin) {
      // Use Google Charts API for QR code generation
      const text = `https://roue.izikado.fr/redeem/${state.spinResult.play.id}`;
      return `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(text)}&choe=UTF-8`;
    }

    // Fallback - if somehow we have a prize but no QR or PIN (should not happen)

    return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMWYxZjEiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIyMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgYWxpZ25tZW50LWJhc2VsaW5lPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzeXN0ZW0tdWksIHNhbnMtc2VyaWYiIGZpbGw9IiM5OTkiPlBhcyBkZSBRUjwvdGV4dD48L3N2Zz4=';
  };

  // Handle QR code image download
  const handleDownloadQR = () => {
    // Safety check for valid spinResult
    if (!state.spinResult || !state.spinResult.play || !state.spinResult.play.prize) {
      toast({
        title: 'Erreur',
        description: 'Impossible de télécharger le code QR. Données de prix manquantes.',
        variant: 'destructive',
      });
      return;
    }

    let qrUrl;

    // If there's a QR link in the prize, use it
    if (state.spinResult.play.prize.qrLink) {
      qrUrl = getQRCodeUrl();
    }
    // Otherwise, if there's a PIN, generate a QR code
    else if (state.spinResult.play.prize.pin) {
      const pin = state.spinResult.play.prize.pin;
      const prizeInfo = `Prize: ${state.spinResult.slot.label}, PIN: ${pin}`;
      const encodedPrizeInfo = encodeURIComponent(prizeInfo);

      // Use Google Charts API for QR code generation
      qrUrl = `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodedPrizeInfo}&choe=UTF-8`;
    } else {
      toast({
        title: 'Erreur',
        description: 'Aucune information de prix disponible pour générer un QR code.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = qrUrl;
      link.download = `prix-${state.spinResult.slot.label.replace(/\s+/g, '-').toLowerCase()}.png`;

      // Append to the body, click, and remove
      document.body.appendChild(link);
      link.click();

      // Small delay before removing the element
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);

      toast({
        title: 'Téléchargement démarré',
        description: 'Le code QR a été téléchargé.',
      });
    } catch (error) {
      // Fallback: open in new tab
      window.open(qrUrl, '_blank');

      toast({
        title: 'Téléchargement alternatif',
        description:
          'Cliquez avec le bouton droit sur l\'image et sélectionnez "Enregistrer sous..."',
      });
    }
  };

  // Update the fixWheel function to call the API
  const fixWheel = async () => {
    try {
      dispatch({ type: 'SET_IS_LOADING', payload: true });

      try {
        // Try to fix wheel via API
        await api.fixWheel(effectiveParams.wheelId || '');

        // Refetch wheel data
        refetch();
      } catch (apiError) {
        // Get the slots
        let slots = [];
        if (wheelData?.slots && wheelData.slots.length > 0) {
          // Use existing slots
          slots = wheelData.slots.map((slot, index) => ({
            id: slot.id,
            label: slot.label,
            color: slot.color || (index === 0 ? '#FF6384' : index === 1 ? '#36A2EB' : '#FFCE56'),
            position: index,
            isWinning: index === 0, // Make first slot winning
          }));
        } else {
          // Create default slots
          slots = [
            { label: 'Prix 1', color: '#FF6384', weight: 34, isWinning: true, position: 0 },
            { label: 'Prix 2', color: '#36A2EB', weight: 33, isWinning: false, position: 1 },
            { label: 'Prix 3', color: '#FFCE56', weight: 33, isWinning: false, position: 2 },
          ];
        }

        // Update wheel config
        dispatch({ type: 'SET_WHEEL_CONFIG', payload: {
          ...state.wheelConfig,
          segments: slots.map((slot) => ({
            label: slot.label,
            color: slot.color,
            isWinning: slot.isWinning,
          })),
          colors: {
            primaryGradient: BRAND.primaryGradient,
            secondaryGradient: BRAND.secondaryGradient,
          },
        } });
      }

      // Show success message
      toast({
        title: 'Roue corrigée',
        description: 'La configuration de la roue a été corrigée.',
        variant: 'default',
      });

      dispatch({ type: 'SET_IS_LOADING', payload: false });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de corriger la roue.',
        variant: 'destructive',
      });
      dispatch({ type: 'SET_IS_LOADING', payload: false });
    }
  };

  // Add a new method to force reload the wheel data
  const handleRefreshWheel = () => {
    refetch()
      .then(() => {
        toast({
          title: 'Données actualisées',
          description: 'Les données de la roue ont été rechargées.',
        });
      })
      .catch((error) => {
        toast({
          title: 'Erreur',
          description: 'Impossible de recharger les données. Veuillez réessayer.',
          variant: 'destructive',
        });
      });
  };

  // Retry loading QR code if it fails initially
  const handleQRLoadError = (attempt: number) => {
    // ... existing code ...
    console.log('[DEBUG] handleQRLoadError triggered, attempt:', attempt);
    
  };

  // Initialize user flow state on wheel load
  useEffect(() => {
    console.log('[DEBUG] wheelData useEffect triggered, wheelData:', !!wheelData);
    if (wheelData && wheelData.socialNetwork && wheelData.socialNetwork !== 'NONE') {
      console.log('[DEBUG] Setting userFlowState to initial (social required)');
      // Don't show social popup immediately - let user click spin first
      dispatch({ type: 'SET_USER_FLOW_STATE', payload: 'initial' });
      dispatch({ type: 'SET_CURRENT_STEP', payload: 'spinWheel' }); // Show the wheel, but require social action before spinning
    } else if (wheelData) {
      console.log('[DEBUG] Setting userFlowState to completedSocial (no social required)');
      dispatch({ type: 'SET_USER_FLOW_STATE', payload: 'completedSocial' });
      dispatch({ type: 'SET_CURRENT_STEP', payload: 'spinWheel' }); // Show the wheel and allow spinning
    }
  }, [wheelData]);

  console.log('[DEBUG] Render state check:', {
    isLoadingWheel,
    hasWheelError: !!wheelError,
    hasWheelData: !!wheelData,
  });

  if (isLoadingWheel) {
    console.log('[DEBUG] Showing loading screen - isLoadingWheel is true');
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-100">
        <h1 className="text-3xl font-bold text-indigo-700 mb-8">IZI Kado</h1>
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
        <p className="mt-4 text-lg text-gray-700">Loading the wheel...</p>
      </div>
    );
  }

  if (wheelError) {
    console.log('[DEBUG] Showing error screen - wheelError:', wheelError);
    return <ErrorDisplay error={wheelError} />;
  }

  if (!wheelData) {
    console.log('[DEBUG] Showing no data screen - wheelData is null/undefined');
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-100 p-6">
        <h1 className="text-3xl font-bold text-indigo-700 mb-8">Oops!</h1>
        <div className="p-6 bg-white bg-opacity-90 backdrop-blur-md rounded-xl shadow-xl max-w-md w-full">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Something went wrong</h2>
          <p className="text-gray-600 mb-6">
            We couldn't load the wheel. Please try again later or contact support.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="w-full bg-gradient-to-r from-indigo-500 to-pink-500"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!wheelData.slots || wheelData.slots.length === 0) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-100 p-6">
        <h1 className="text-3xl font-bold text-indigo-700 mb-8">No Wheel Configuration</h1>
        <div className="p-6 bg-white bg-opacity-90 backdrop-blur-md rounded-xl shadow-xl max-w-md w-full">
          <p className="text-gray-600 mb-6">
            The wheel is not properly configured. Please contact the administrator.
          </p>
        </div>
      </div>
    );
  }

  console.log('[DEBUG] Rendering main wheel component with data:', {
    hasWheelData: !!wheelData,
    slotsCount: wheelData?.slots?.length || 0,
    currentStep: state.currentStep,
    userFlowState: state.userFlowState,
    socialNetwork: wheelData?.socialNetwork,
    bannerImage: wheelData?.bannerImage,
    backgroundImage: wheelData?.backgroundImage,
  });

  return (
    <div
      className="wheel-page-container play-wheel-page min-h-screen w-full overflow-x-hidden flex flex-col bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-100"
      style={{
        backgroundImage: wheelData?.backgroundImage
          ? `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url(${wheelData.backgroundImage})`
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        // 🎯 SCROLLBAR EARTHQUAKE FIX - Prevent layout shifts
        overflowY: 'auto',
        scrollbarGutter: 'stable',
        minHeight: '100vh',
        position: 'relative',
      }}
    >
      {/* Banner Image */}
      {wheelData?.bannerImage && (
        <div className="w-full relative z-10">
          <img
            src={wheelData.bannerImage}
            alt="Banner"
            className="w-full h-24 sm:h-32 md:h-40 lg:h-48 object-cover shadow-lg"
            style={{
              transform: 'none',
              willChange: 'auto',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
            onError={(e) => {
              console.log('[DEBUG] Banner image failed to load:', wheelData.bannerImage);
              // Hide the image if it fails to load
              e.currentTarget.style.display = 'none';
            }}
            onLoad={() => {
              console.log('[DEBUG] Banner image loaded successfully:', wheelData.bannerImage);
            }}
          />
        </div>
      )}

      {/* Logo - Mobile responsive */}
      {wheelData && (
        <div className="w-full flex justify-center px-2 py-2 sm:py-4">
          <h1 className="text-base sm:text-xl md:text-2xl lg:text-3xl font-extrabold text-center bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-indigo-600 max-w-full break-words px-2 drop-shadow-lg">
            {wheelData.mainTitle && wheelData.mainTitle.trim() !== ''
              ? wheelData.mainTitle
              : 'IZI Kado'}
          </h1>
        </div>
      )}

      {/* Social network debug info (only in dev mode) */}
      {import.meta.env.DEV && wheelData?.socialNetwork && (
        <div className="fixed top-2 right-2 sm:top-4 sm:right-4 bg-blue-800 text-white p-2 rounded-md text-xs max-w-[200px] opacity-75 z-50">
          <div className="font-mono">Social: {wheelData.socialNetwork}</div>
        </div>
      )}

      {/* Confetti (only shown on win) */}
      {/* {showConfetti && (
        <TimedConfetti
          key="confetti-active"
          isActive={true}
          duration={8000}
          options={{
            particleCount: 160,
            angle: 90,
            spread: 120,
            colors: CONFETTI_COLORS,
            shapes: ['star', 'circle', 'square'],
          }}
        />
      )} */}

      {/* {showConfetti && (
        <TimedConfetti
          // key="confetti-active"
          isActive={true}
          duration={8000}
          options={{
            particleCount: 160,
            angle: 90,
            spread: 120,
            origin: { x: 0.5, y: 0.3 },
            gravity: 1,
            decay: 0.9,
            ticks: 200,
            colors: CONFETTI_COLORS,
            shapes: ['star', 'circle', 'square'],
          }}  
        />
      )} */}

      {/* Social redirect dialog */}
      <SocialRedirectDialog
        open={state.showSocialRedirect}
        onClose={handleSocialRedirectClose}
        network={wheelData?.socialNetwork}
        redirectUrl={wheelData?.redirectUrl}
        redirectText={wheelData?.redirectText}
      />

      {/* Claim Form Dialog */}
      <Dialog open={state.showClaimForm} onOpenChange={() => dispatch({ type: 'SET_SHOW_CLAIM_FORM', payload: false })}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold text-center">
              Récupérer votre prix
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base text-center">
              Veuillez remplir vos informations pour récupérer votre prix.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
            {state.formFields.map((field) => (
              <div key={field.name} className="space-y-1 sm:space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  {inputIcons[field.type]}
                  <input
                    type={field.type}
                    value={state.claimFormData[field.name] || ''}
                    onChange={(e) => {
                      let value = e.target.value;
                      // For phone field, only allow digits and limit to 10 characters
                      if (field.name === 'phone') {
                        value = value.replace(/\D/g, '').slice(0, 10);
                      }
                      dispatch({ type: 'SET_CLAIM_FORM_DATA', payload: {
                        ...state.claimFormData,
                        [field.name]: value,
                      } });
                    }}
                    className="w-full pl-8 sm:pl-10 pr-3 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
                    placeholder={`Votre ${field.label.toLowerCase()}`}
                    required={field.required}
                    {...(field.name === 'phone' ? {
                      maxLength: 10,
                      inputMode: 'numeric' as const,
                      pattern: '[0-9]*'
                    } : {})}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-2 sm:gap-3 pt-2 sm:pt-4">
            <Button
              onClick={() => {
                // Convert claimFormData to PlayerFormData format
                const playerData: PlayerFormData = {
                  name: state.claimFormData.name || '',
                  email: state.claimFormData.email || '',
                  phone: state.claimFormData.phone,
                };
                handleClaimFormSubmit(playerData);
              }}
              disabled={state.isLoading}
              className="flex-1 text-sm sm:text-base"
            >
              {state.isLoading ? 'Récupération en cours...' : 'Récupérer mon prix'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Prize Result Modal - Mobile responsive */}
      <Dialog open={state.showResultModal} onOpenChange={(open) => {
        // Only allow closing if it's a losing result
        if (!open && state.spinResult?.play.result === 'WIN') {
          // Prevent closing for winning results - user must claim prize
          return;
        }
        dispatch({ type: 'SET_SHOW_RESULT_MODAL', payload: open });
      }}>
        <DialogContent 
          className="w-[calc(100vw-2rem)] max-w-lg mx-auto"
        >
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-bold text-center">
              {state.spinResult?.play.result === 'WIN' ? '🎉 Félicitations !' : '😔 Dommage !'}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 sm:py-6 text-center space-y-3 sm:space-y-4">
            {state.spinResult?.play.result === 'WIN' ? (
              <>
                <p className="text-base sm:text-lg text-gray-700 mb-4">
                  Vous avez gagné : <strong>{state.spinResult.slot.label}</strong>
                </p>
                <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                  <p className="text-sm sm:text-base text-blue-800 font-medium">
                    🎉 Félicitations ! Cliquez sur "Récupérer mon prix" pour recevoir vos codes de récupération par email.
                  </p>
                </div>
              </>
            ) : (
              <p className="text-base sm:text-lg text-gray-700">
                Vous n'avez pas gagné cette fois. Bonne chance pour la prochaine !
              </p>
            )}
          </div>

          <div className="flex gap-2 sm:gap-3 justify-center">
            {state.spinResult?.play.result === 'WIN' ? (
              <Button
                onClick={() => {
                  dispatch({ type: 'SET_SHOW_RESULT_MODAL', payload: false });
                  dispatch({ type: 'SET_SHOW_CLAIM_FORM', payload: true });
                }}
                className="flex-2 text-sm sm:text-base"
              >
                Récupérer mon prix
              </Button>
            ) : (
              <Button
                onClick={() => dispatch({ type: 'SET_SHOW_RESULT_MODAL', payload: false })}
                className="flex-2 text-sm sm:text-base"
              >
                Fermer
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Thank You Modal - Mobile responsive */}
      <Dialog open={state.showThankyouMessage} onOpenChange={() => dispatch({ type: 'SET_SHOW_THANKYOU_MESSAGE', payload: false })}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold text-center">Merci !</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-sm sm:text-base text-gray-700">
              Vos informations ont été envoyées avec succès. Vous devriez recevoir un e-mail de
              confirmation sous peu.
            </p>
          </div>
          <Button
            onClick={() => dispatch({ type: 'SET_SHOW_THANKYOU_MESSAGE', payload: false })}
            className="w-full text-sm sm:text-base"
          >
            Fermer
          </Button>
        </DialogContent>
      </Dialog>

      {/* Rules Modal - Mobile responsive */}
      <Dialog open={state.showRulesModal} onOpenChange={() => dispatch({ type: 'SET_SHOW_RULES_MODAL', payload: false })}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg rounded-2xl bg-white/95 shadow-2xl border border-indigo-100/60">
          <DialogHeader>
            <DialogTitle className="text-center text-base sm:text-lg md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-pink-600">
              Règles du jeu
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 sm:py-4 space-y-3 sm:space-y-4 text-gray-700 text-xs sm:text-sm md:text-base max-h-[60vh] overflow-y-auto">
            {wheelData?.gameRules ? (
              <div className="whitespace-pre-wrap">{wheelData.gameRules}</div>
            ) : (
              <ul className="list-disc pl-4 sm:pl-6 space-y-1.5 sm:space-y-2">
                <li>
                  Une seule participation par personne est autorisée, sauf indication contraire de
                  l'organisateur.
                </li>
                <li>
                  Les informations saisies doivent être exactes pour valider la participation et la
                  remise du lot.
                </li>
                <li>
                  En cas de gain, un code PIN et un lien direct seront fournis pour récupérer votre lot.
                </li>
                <li>Les lots ne sont ni échangeables, ni remboursables.</li>
                <li>
                  L'organisateur se réserve le droit de modifier ou d'annuler le jeu à tout moment.
                </li>
                <li>La participation implique l'acceptation pleine et entière du règlement.</li>
              </ul>
            )}
            <p className="text-xs text-gray-400 mt-2">
              Pour toute question, contactez l'organisateur ou consultez les mentions légales.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content - Improved mobile responsive container */}
      <div className="flex-1 w-full flex flex-col items-center justify-center px-2 py-2 min-h-0">
        {isLoadingWheel ? (
          // Loading state
          <div className="p-4 sm:p-6 flex items-center justify-center">
            <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-indigo-600" />
            <p className="ml-2 text-sm sm:text-base text-gray-600">Chargement de la roue...</p>
          </div>
        ) : wheelError ? (
          // Error state with refresh button
          <div className="p-4 sm:p-6 text-center max-w-sm">
            <AlertCircle className="h-8 w-8 sm:h-10 sm:w-10 text-red-500 mx-auto mb-3" />
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">
              Erreur de chargement
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Impossible de charger les données de la roue.
            </p>
            <div className="flex flex-col gap-2 justify-center">
              <Button
                onClick={handleRefreshWheel}
                variant="default"
                className="flex items-center justify-center gap-2 text-sm"
              >
                <RefreshCw size={14} />
                Rafraîchir
              </Button>
              <Button onClick={() => navigate(-1)} variant="outline" className="text-sm">
                Retour
              </Button>
            </div>
          </div>
        ) : !wheelData ? (
          // Wheel not found state
          <div className="p-4 sm:p-6 text-center max-w-sm">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">
              Roue introuvable
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Cette roue n'existe pas ou a été supprimée.
            </p>
            <div className="flex flex-col gap-2 justify-center">
              <Button
                onClick={handleRefreshWheel}
                variant="default"
                className="flex items-center justify-center gap-2 text-sm"
              >
                <RefreshCw size={14} />
                Réessayer
              </Button>
              <Button onClick={() => navigate(-1)} variant="outline" className="text-sm">
                Retour
              </Button>
            </div>
          </div>
        ) : state.wheelConfig.segments.length === 0 ? (
          // Wheel has no segments configuration
          <div className="p-4 sm:p-6 text-center max-w-sm">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">
              La roue n'est pas configurée
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Aucune option n'est disponible pour cette roue.
            </p>
            <div className="flex flex-col gap-2 justify-center">
              <Button
                onClick={handleRefreshWheel}
                variant="default"
                className="flex items-center justify-center gap-2 text-sm"
              >
                <RefreshCw size={14} />
                Actualiser
              </Button>
              <Button onClick={fixWheel} variant="default" className="text-sm">
                Corriger la roue
              </Button>
              <Button onClick={() => navigate(-1)} variant="outline" className="text-sm">
                Retour
              </Button>
            </div>
          </div>
        ) : state.currentStep === 'spinWheel' ? (
          // Wheel View - Responsive mobile wheel container
          <div className="wheel-content-area w-full flex flex-col items-center justify-center space-y-4 px-4">
            {/* Responsive wheel container that adapts to screen size and fills available space */}
            <div className="responsive-wheel-container wheel-container relative w-full max-w-[95vw] sm:max-w-[80vw] md:max-w-[70vw] lg:max-w-[60vw] xl:max-w-[800px] mx-auto flex items-center justify-center">
              <Wheel
                config={state.wheelConfig}
                isSpinning={state.mustSpin}
                prizeIndex={state.prizeIndex}
                onSpin={handleWheelFinishedSpin}
                showSpinButton={false} // The main button is now handled below
              />
            </div>

            {/* Spin button and message area - Mobile responsive */}
            {!state.mustSpin && state.userFlowState === 'completedSocial' && (
              <div className="w-full max-w-[90vw] sm:max-w-[400px] md:max-w-[500px] flex flex-col items-center space-y-3">
                <p className="text-sm sm:text-base text-indigo-700 font-medium text-center px-4 py-2 bg-white/50 rounded-full">
                  Vous pouvez maintenant tenter de gagner
                </p>
                <Button
                  onClick={handleSpinClick}
                  className="w-full px-6 py-3 text-base sm:text-lg bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white font-bold rounded-xl shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
                  disabled={isSpinning}
                >
                  {isSpinning ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span>Rotation en cours...</span>
                    </>
                  ) : (
                    'Tourner la roue !'
                  )}
                </Button>
              </div>
            )}
            {/* Initial button when social action is required first */}
            {!state.mustSpin && state.userFlowState === 'initial' && (
              <div className="w-full max-w-[90vw] sm:max-w-[400px] md:max-w-[500px] flex flex-col items-center space-y-3">
                <p className="text-sm sm:text-base text-indigo-700 font-medium text-center px-4 py-2 bg-white/50 rounded-full">
                  Tentez votre chance de gagner !
                </p>
                <Button
                  onClick={handleSpinClick}
                  className="w-full px-6 py-3 text-base sm:text-lg bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white font-bold rounded-xl shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
                  disabled={isSpinning}
                >
                  Tourner la roue !
                </Button>
              </div>
            )}
          </div>
        ) : state.currentStep === 'initial' && (!wheelData?.socialNetwork || wheelData?.socialNetwork === 'NONE') ? (
          // Show wheel immediately if no social network is required
          <div className="wheel-content-area w-full flex flex-col items-center justify-center space-y-4 px-4">
            <div className="responsive-wheel-container wheel-container relative w-full max-w-[95vw] sm:max-w-[80vw] md:max-w-[70vw] lg:max-w-[60vw] xl:max-w-[800px] mx-auto flex items-center justify-center">
              <Wheel
                config={state.wheelConfig}
                isSpinning={state.mustSpin}
                prizeIndex={state.prizeIndex}
                onSpin={handleWheelFinishedSpin}
                showSpinButton={false}
              />
            </div>
            {!state.mustSpin && (
              <div className="w-full max-w-[90vw] sm:max-w-[400px] md:max-w-[500px] flex flex-col items-center space-y-3">
                <p className="text-sm sm:text-base text-indigo-700 font-medium text-center px-4 py-2 bg-white/50 rounded-full">
                  Tentez votre chance de gagner !
                </p>
                <Button
                  onClick={handleSpinClick}
                  className="w-full px-6 py-3 text-base sm:text-lg bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white font-bold rounded-xl shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
                  disabled={isSpinning}
                >
                  Tourner la roue !
                </Button>
              </div>
            )}
          </div>
        ) : (
          // Loading or processing state
          ((() => {
            console.log(
              '[DEBUG] Rendering loading/processing state - currentStep:',
              state.currentStep,
              'userFlowState:',
              state.userFlowState
            );
            return null;
          })(),
          (
            <div className="p-4 sm:p-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-3" />
              <p className="text-sm sm:text-base text-gray-600">Traitement en cours...</p>
            </div>
          ))
        )}
      </div>

      {/* Footer - Mobile responsive */}
      <footer className="w-full bg-white/80 border-t border-indigo-100/60 py-2 sm:py-3 px-2 sm:px-4 flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-2 text-xs text-gray-600 z-30 mt-auto">
        <div className="flex items-center justify-center text-center break-words">
          {wheelData?.footerText ? (
            <span className="max-w-full">{detectAndLinkPhoneNumbers(wheelData.footerText)}</span>
          ) : (
            <span>© {new Date().getFullYear()} IZI Kado</span>
          )}
        </div>
        <button
          className="underline text-indigo-600 hover:text-pink-500 transition-colors whitespace-nowrap flex-shrink-0"
          onClick={() => dispatch({ type: 'SET_SHOW_RULES_MODAL', payload: true })}
          type="button"
        >
          Règles du jeu
        </button>
      </footer>
    </div>
  );
};

export default PlayWheel;
