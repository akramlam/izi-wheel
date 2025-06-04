import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, apiClient } from '../lib/api';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { toast } from '../hooks/use-toast';
import { Loader2, Mail, Phone, Calendar, User, AlertCircle, RefreshCw } from 'lucide-react';
import { TimedConfetti } from '../components/magicui/timedConfetti';
import Wheel from '../components/wheel/Wheel';
import type { WheelConfig } from '../components/wheel/types';
import PlayerForm, { FormField, PlayerFormData } from '../components/PlayerForm';

// Define types
type WheelData = {
  id: string;
  name: string;
  formSchema: any;
  slots: {
    id: string;
    label: string;
    color: string;
    weight: number;
    isWinning: boolean;
    position?: number;
  }[];
  socialNetwork?: string;
  redirectUrl?: string;
  redirectText?: string;
  playLimit?: string;
};

type PlayResponse = {
  play: {
    id: string;
    result: 'WIN' | 'LOSE';
    prize?: {
      pin: string;
      qrLink: string;
    };
  };
  slot: {
    label: string;
  };
};

// Mapping input types to icons
const inputIcons: Record<string, React.ReactNode> = {
  name: <User className="h-4 w-4 text-gray-400" />,
  email: <Mail className="h-4 w-4 text-gray-400" />,
  phone: <Phone className="h-4 w-4 text-gray-400" />,
  birthDate: <Calendar className="h-4 w-4 text-gray-400" />,
};

// Brand colors
const BRAND = {
  primaryGradient: '#a25afd',   // Violet
  secondaryGradient: '#6366f1', // Indigo
  backgroundGradient: 'linear-gradient(to bottom right, rgb(216, 180, 254), rgb(224, 231, 255))'
};

// Confetti colors
const CONFETTI_COLORS = [BRAND.primaryGradient, BRAND.secondaryGradient, '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff'];

// Add a new component for the social network redirection dialog
const SocialRedirectDialog = ({ 
  open, 
  onClose, 
  network, 
  redirectUrl, 
  redirectText 
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
    console.log('SocialRedirectDialog rendered with open state:', open);
    console.log('SocialRedirectDialog network:', network);
    console.log('Redirect URL:', redirectUrl);
    
    // Add detailed debugging in development mode
    if (import.meta.env.DEV) {
      const debugElement = document.getElementById('social-debug-info');
      if (debugElement) {
        debugElement.textContent = `Network: ${network || 'none'}, URL: ${redirectUrl || 'none'}, Open: ${open}`;
      }
    }
  }, [open, network, redirectUrl]);

  const getNetworkIcon = () => {
    console.log('Getting icon for network:', network);
    
    switch (network) {
      case 'GOOGLE':
        return (
          <svg className="h-16 w-16 mb-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
            <path d="M12 11h8.88c.08.53.12 1.06.12 1.6 0 4.41-3.16 7.55-7.55 7.55-4.41 0-8-3.59-8-8s3.59-8 8-8c2.07 0 3.92.8 5.37 2.11l-2.19 2.11C15.17 7.4 13.65 6.95 12 6.95c-2.76 0-5 2.24-5 5s2.24 5 5 5c2.64 0 4.41-1.54 4.8-3.95H12v-2z"/>
          </svg>
        );
      case 'INSTAGRAM':
        return (
          <svg className="h-16 w-16 mb-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
            <path d="M12 2c-2.716 0-3.056.011-4.123.06-1.064.048-1.791.218-2.427.465a4.9 4.9 0 0 0-1.77 1.153A4.9 4.9 0 0 0 2.525 5.45c-.247.636-.417 1.363-.465 2.427C2.011 8.944 2 9.284 2 12s.011 3.056.06 4.123c.048 1.064.218 1.791.465 2.427a4.9 4.9 0 0 0 1.153 1.77 4.9 4.9 0 0 0 1.77 1.153c.636.247 1.363.417 2.427.465 1.067.048 1.407.06 4.123.06s3.056-.011 4.123-.06c1.064-.048 1.791-.218 2.427-.465a4.9 4.9 0 0 0 1.77-1.153 4.9 4.9 0 0 0 1.153-1.77c.247-.636.417-1.363.465-2.427.048-1.067.06-1.407.06-4.123s-.011-3.056-.06-4.123c-.048-1.064-.218-1.791-.465-2.427a4.9 4.9 0 0 0-1.153-1.77 4.9 4.9 0 0 0-1.77-1.153c-.636-.247-1.363-.417-2.427-.465C15.056 2.011 14.716 2 12 2zm0 1.802c2.67 0 2.986.01 4.04.058.976.045 1.505.207 1.858.344.466.182.8.399 1.15.748.35.35.566.684.748 1.15.137.353.3.882.344 1.857.048 1.055.058 1.37.058 4.041 0 2.67-.01 2.986-.058 4.04-.045.976-.207 1.505-.344 1.858a3.1 3.1 0 0 1-.748 1.15c-.35.35-.684.566-1.15.748-.353.137-.882.3-1.857.344-1.054.048-1.37.058-4.041.058-2.67 0-2.987-.01-4.04-.058-.976-.045-1.505-.207-1.858-.344a3.1 3.1 0 0 1-1.15-.748 3.1 3.1 0 0 1-.748-1.15c-.137-.353-.3-.882-.344-1.857-.048-1.055-.058-1.37-.058-4.041 0-2.67.01-2.986.058-4.04.045-.976.207-1.505.344-1.858.182-.466.399-.8.748-1.15.35-.35.684-.566 1.15-.748.353-.137.882-.3 1.857-.344 1.055-.048 1.37-.058 4.041-.058zm0 3.063a5.135 5.135 0 1 0 0 10.27 5.135 5.135 0 0 0 0-10.27zm0 8.468a3.333 3.333 0 1 1 0-6.666 3.333 3.333 0 0 1 0 6.666zm6.538-8.671a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0z"/>
          </svg>
        );
      case 'TIKTOK':
        return (
          <svg className="h-16 w-16 mb-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
            <path d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.59-1.16-2.59-2.5a2.592 2.592 0 0 1 4.3-1.96V10.3a5.636 5.636 0 0 0-1.71-.26c-3.09 0-5.59 2.5-5.59 5.59s2.5 5.59 5.59 5.59 5.59-2.5 5.59-5.59V7.73c.99.79 2.22 1.25 3.59 1.25v-3.1c0-.02-2.44-.06-2.44-.06Z"/>
          </svg>
        );
      case 'FACEBOOK':
        return (
          <svg className="h-16 w-16 mb-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
            <path d="M20.007 3H3.993A.993.993 0 0 0 3 3.993v16.014c0 .549.444.993.993.993h8.621v-6.97h-2.347v-2.716h2.347V9.309c0-2.325 1.42-3.591 3.494-3.591.993 0 1.847.074 2.096.107v2.43h-1.438c-1.128 0-1.346.537-1.346 1.324v1.734h2.69l-.35 2.717h-2.34V21h4.587a.993.993 0 0 0 .993-.993V3.993A.993.993 0 0 0 20.007 3z"/>
          </svg>
        );
      default:
        // If we don't have a specific icon, show a generic one
        return (
          <svg className="h-16 w-16 mb-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 14h2v2h-2v-2zm0-10h2v8h-2V6z"/>
          </svg>
        );
    }
  };

  const handleRedirect = () => {
    if (redirectUrl) {
      window.open(redirectUrl, '_blank');
    }
    onClose();
  };

  const getTitle = () => {
    switch (network) {
      case 'GOOGLE':
        return 'LAISSEZ NOUS UN AVIS';
      case 'INSTAGRAM':
      case 'TIKTOK':
      case 'FACEBOOK':
      case 'SNAPCHAT':
        return 'SUIVEZ-NOUS SUR NOS RÉSEAUX';
      default:
        return 'SUIVEZ-NOUS';
    }
  };

  const getButtonText = () => {
    switch (network) {
      case 'GOOGLE':
        return 'Noter sur Google';
      case 'INSTAGRAM':
        return 'Suivre sur Instagram';
      case 'TIKTOK':
        return 'Suivre sur TikTok';
      case 'FACEBOOK':
        return 'Suivre sur Facebook';
      case 'SNAPCHAT':
        return 'Suivre sur Snapchat';
      default:
        return 'Continuer';
    }
  };

  const getInstructions = () => {
    switch (network) {
      case 'GOOGLE':
        return (
          <div className="flex flex-col space-y-4 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white">1</div>
              <span>Laissez un avis sur Google</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white">2</div>
              <span>Revenez sur cette page</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white">3</div>
              <span>Tournez la roue !</span>
            </div>
          </div>
        );
      case 'INSTAGRAM':
      case 'TIKTOK':
      case 'FACEBOOK':
      case 'SNAPCHAT':
        return (
          <div className="flex flex-col space-y-4 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white">1</div>
              <span>Suivez-nous sur {network.charAt(0) + network.slice(1).toLowerCase().replace('_', ' ')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white">2</div>
              <span>Revenez sur cette page</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white">3</div>
              <span>Tournez la roue !</span>
            </div>
          </div>
        );
      default:
        // Show generic instructions if network type is unknown
        return (
          <div className="flex flex-col space-y-4 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white">1</div>
              <span>Suivez-nous sur nos réseaux sociaux</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white">2</div>
              <span>Revenez sur cette page</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white">3</div>
              <span>Tournez la roue !</span>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
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
          <p className="text-center mb-6">{redirectText || 'Vous allez être redirigé vers notre page.'}</p>
          {getInstructions()}
          <Button 
            className="w-full mt-6 bg-gradient-to-r from-indigo-500 to-purple-500"
            onClick={handleRedirect}
          >
            {getButtonText()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const PlayWheel = () => {
  const { companyId, wheelId } = useParams<{ companyId: string; wheelId: string }>();
  const navigate = useNavigate();
  
  // Add debug logging for route parameters
  useEffect(() => {
    console.log('PlayWheel mounted with params:', { companyId, wheelId });
    console.log('Current URL:', window.location.href);
    console.log('Route match debug:', { 
      isCompany: companyId === 'company',
      companyIdType: typeof companyId,
      wheelIdType: typeof wheelId
    });
  }, [companyId, wheelId]);
  
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeIndex, setPrizeIndex] = useState(0);
  const [showResultModal, setShowResultModal] = useState(false);
  const [wheelColors, setWheelColors] = useState<string[]>([]);
  const [spinResult, setSpinResult] = useState<PlayResponse | null>(null);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [wheelConfig, setWheelConfig] = useState<WheelConfig>({
    segments: [],
    spinDurationMin: 3,
    spinDurationMax: 6,
    sounds: {
      tick: true,
      win: true
    },
    hapticFeedback: true
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSocialRedirect, setShowSocialRedirect] = useState(false);
  const [hasCompletedSocialAction, setHasCompletedSocialAction] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [currentStep, setCurrentStep] = useState<'initial' | 'socialRedirect' | 'spinWheel' | 'showPrize' | 'claimForm'>('initial');
  const [claimFormData, setClaimFormData] = useState<Record<string, string>>({});
  const [showThankyouMessage, setShowThankyouMessage] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [userFlowState, setUserFlowState] = useState<'initial' | 'completedSocial' | 'spinning' | 'won' | 'claimed'>('initial');
  const retryCount = useRef<number>(0);

  // Add a confetti ref to control it
  const confettiRef = useRef<any>(null);

  // Fetch wheel data
  const { data: wheelData, isLoading: isLoadingWheel, error: wheelError, refetch } = useQuery<WheelData>({
    queryKey: ['wheel', companyId, wheelId],
    queryFn: async () => {
      try {
        console.log(`Fetching wheel data for companyId: ${companyId}, wheelId: ${wheelId}`);
        
        // Special handling for "company" in the URL path
        if (companyId === 'company') {
          console.log('Detected "company" in URL path, using special company route');
          try {
            // Use the special company route
            const directResponse = await apiClient.get(`/public/company/${wheelId}`);
            if (directResponse.data && directResponse.data.wheel) {
              console.log('Successfully fetched wheel data via company route');
              return directResponse.data.wheel;
            }
          } catch (directError) {
            console.error('Error fetching wheel via company route:', directError);
            // Continue to standard flow
          }
        }
        
        const response = await api.getPublicWheel(companyId || '', wheelId || '');
        
        if (!response.data || !response.data.wheel) {
          console.error('API returned no wheel data:', response);
          throw new Error('No wheel data returned from API');
        }
        
        console.log('Wheel data received:', response.data.wheel);
        
        // Check if slots are present
        if (!response.data.wheel.slots || response.data.wheel.slots.length === 0) {
          console.warn('Wheel has no slots!');
        } else {
          console.log(`Wheel has ${response.data.wheel.slots.length} slots`);
        }
        
        return response.data.wheel;
      } catch (error) {
        console.error('Error fetching wheel data:', error);
        setDebugInfo(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
      }
    },
    enabled: !!companyId && !!wheelId,
    retry: 3,
    retryDelay: attempt => Math.min(attempt > 1 ? 2000 : 1000, 30 * 1000),
    staleTime: 30000, // Data is fresh for 30 seconds
  });

  // Prepare wheel data when loaded
  useEffect(() => {
    if (wheelData) {
      console.log('PlayWheel.tsx: Processing wheelData for UI', JSON.parse(JSON.stringify(wheelData)));
      console.log('PlayWheel.tsx: Raw wheelData.slots from API:', wheelData.slots.map(s => ({id: s.id, label: s.label, position: s.position })));
      
      // Log social network configuration for debugging
      if (wheelData.socialNetwork) {
        console.log(`Wheel has social network configured: ${wheelData.socialNetwork}`);
        console.log('Redirect URL:', wheelData.redirectUrl);
      } else {
        console.log('No social network configured for this wheel');
      }
      
      // Ensure we have valid slot data, even if the wheel has no properly configured slots
      if (!wheelData.slots || wheelData.slots.length === 0) {
        console.warn('No slots found in wheel data, creating default configuration');
        
        // Create default slots if none exist
        const defaultSlots = [
          { id: 'default-1', label: 'Prix 1', color: '#FF6384', weight: 34, isWinning: true, position: 0 },
          { id: 'default-2', label: 'Prix 2', color: '#36A2EB', weight: 33, isWinning: false, position: 1 },
          { id: 'default-3', label: 'Prix 3', color: '#FFCE56', weight: 33, isWinning: false, position: 2 }
        ];
        
        // Use default slots for display purposes
        const segments = defaultSlots.map(slot => ({
        label: slot.label,
        color: slot.color || (slot.isWinning ? '#28a745' : '#dc3545'),
        isWinning: slot.isWinning
      }));
      
      setWheelConfig({
        ...wheelConfig,
        segments,
        colors: {
          primaryGradient: BRAND.primaryGradient,
          secondaryGradient: BRAND.secondaryGradient
        }
      });
        
        setDebugInfo('Using default wheel configuration as no slots were found');
      } else {
        console.log(`Processing ${wheelData.slots.length} slots`);
        
        // Ensure slots have position values
        const sortedSlots = [...wheelData.slots].sort((a, b) => 
          (a.position !== undefined ? a.position : 999) - (b.position !== undefined ? b.position : 999)
        );
        console.log('PlayWheel.tsx: Sorted frontend slots for wheel config:', sortedSlots.map(s => ({id: s.id, label: s.label, position: s.position })));
        
        // Check if any slot is marked as winning
        const hasWinningSlot = sortedSlots.some(slot => slot.isWinning);
        
        // Make the first slot winning if none are winning
        if (!hasWinningSlot && sortedSlots.length > 0) {
          sortedSlots[0].isWinning = true;
          console.log('No winning slot found, marking first slot as winning');
        }
        
        // Set wheel colors and prepare segments configuration
        const segments = sortedSlots.map(slot => ({
          id: slot.id,
          label: slot.label,
          color: slot.color || (slot.isWinning ? '#28a745' : '#dc3545'),
          isWinning: slot.isWinning
        }));
        
        console.log('Setting wheel configuration with segments:', segments);
        
        setWheelConfig({
          ...wheelConfig,
          segments,
          colors: {
            primaryGradient: BRAND.primaryGradient,
            secondaryGradient: BRAND.secondaryGradient
          }
        });
        
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
            { name: 'name', label: 'Nom', type: 'text', required: true },
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'phone', label: 'Téléphone', type: 'tel', required: false },
            { name: 'birthDate', label: 'Date de naissance', type: 'date', required: false }
          ];
          fields.push(...defaultFields);
        }
      }
      setFormFields(fields);
    }
  }, [wheelData]);

  // Handle the initial button click to start the process
  const handleStartProcess = () => {
    // Log the current wheel data and social network settings for debugging
    console.log('Starting process with wheel data:', wheelData);
    console.log('Social network configured:', wheelData?.socialNetwork);
    
    // Check if social network is configured
    if (wheelData?.socialNetwork && wheelData?.socialNetwork !== 'NONE') {
      console.log('Social network detected, showing redirect dialog:', wheelData.socialNetwork);
      setCurrentStep('socialRedirect');
      setShowSocialRedirect(true);
      
      // Debug info to confirm social popup is triggered
      setDebugInfo(`Showing social popup for: ${wheelData.socialNetwork}`);
    } else {
      // If no social network, go directly to spin
      console.log('No social network configured, proceeding directly to spin');
      setCurrentStep('spinWheel');
      setUserFlowState('completedSocial'); // Skip social step if not required
      setDebugInfo('No social network configured, ready to spin');
    }
  };

  // Handle social redirect close
  const handleSocialRedirectClose = () => {
    console.log('Social redirect closed, user should now be ready to spin the wheel');
    setShowSocialRedirect(false);
    setHasCompletedSocialAction(true);
    setUserFlowState('completedSocial');
    setCurrentStep('spinWheel');
    
    // After closing the social popup, the user should now be able to spin the wheel
    // but we don't automatically spin it - they must click the button again
    setDebugInfo('Social action completed. Click "Tourner la roue" to spin!');
  };

  // Handle actual wheel spin after social action
  const handleSpinWithoutSocial = () => {
    // Initial lead data (will be updated later with full form)
    const initialLead = {
      session_id: `session_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    
    setFormData(initialLead);
    spinWheel();
  };

  // Modify handleSpinClick to follow the flow diagram
  const handleSpinClick = () => {
    // Only allow spin if social action is completed or not required
    if (currentStep === 'spinWheel' && (userFlowState === 'completedSocial' || !wheelData?.socialNetwork || wheelData?.socialNetwork === 'NONE')) {
      console.log('User clicked to spin the wheel after completing social action');
      setUserFlowState('spinning');
      handleSpinWithoutSocial();
    } else if (currentStep === 'initial') {
      // If we're at the initial step, start the process
      handleStartProcess();
    }
  };

  // Spin wheel mutation
  const { mutate: spinWheel, isPending: isSpinning } = useMutation({
    mutationFn: async () => {
      // For initial spin, use minimal data
      const response = await api.spinWheel(companyId || '', wheelId || '', { 
        lead: formData
      });
      return response.data;
    },
    onSuccess: (data) => {
      // wheelConfig.segments is the source of truth for visual indexing.
      // It's derived from wheelData.slots, sorted by position.
      if (!wheelConfig.segments || wheelConfig.segments.length === 0) {
        console.error("CRITICAL: PlayWheel.tsx - wheelConfig.segments is empty or undefined during spinWheel onSuccess.");
        toast({ title: "Erreur Roue", description: "Configuration de la roue invalide.", variant: "destructive"});
        // Potentially reset state or disable further interaction
        setUserFlowState('initial'); // Reset flow
        return;
      }
      if (!data || !data.slot || !data.slot.id) {
        console.error("CRITICAL: PlayWheel.tsx - Backend spinWheel response missing slot data or slot.id.");
        
        // Try to use the first slot as a fallback if we have wheel data
        if (wheelConfig.segments && wheelConfig.segments.length > 0) {
          console.log("Using fallback slot (first segment) due to missing slot data in response");
          // Create a modified data object with the first segment as the slot
          const fallbackData = {
            ...data,
            slot: {
              id: wheelConfig.segments[0].id,
              label: wheelConfig.segments[0].label
            }
          };
          
          // Continue processing with the fallback data
          handleSpinResultWithData(fallbackData);
          return;
        }
        
        // If we can't create a fallback, show error and reset
        toast({ title: "Erreur Serveur", description: "Réponse du serveur invalide.", variant: "destructive"});
        setUserFlowState('initial'); // Reset flow
        return;
      }
      
      // If we have valid data, process it normally
      handleSpinResultWithData(data);
    },
    onError: (error: any) => {
      console.error('Error spinning wheel:', error);
      toast({
        title: 'Error',
        description: 'Failed to spin the wheel. Please try again.',
        variant: 'destructive'
      });
      setCurrentStep('initial');
      setUserFlowState('initial');
    }
  });

  // Helper function to handle spin result data
  const handleSpinResultWithData = (data: any) => {
    // Logs from previous step (can be kept for debugging if needed)
    console.log('PlayWheel.tsx: spinWheel onSuccess - Backend response data:', JSON.parse(JSON.stringify(data)));
    console.log('PlayWheel.tsx: spinWheel onSuccess - Frontend wheelConfig.segments for visual wheel:', wheelConfig.segments.map(s => ({id: s.id, label: s.label})));

    // Find the index of the winning slot ID within the wheelConfig.segments array
    let prizeIndexFound = wheelConfig.segments.findIndex(segment => segment.id === data.slot.id);

    if (prizeIndexFound === -1) {
      console.error("CRITICAL: PlayWheel.tsx - Winning slot ID from backend NOT FOUND in frontend wheelConfig.segments!", {
        backendSlotId: data.slot.id,
        backendSlotLabel: data.slot.label,
        frontendSegmentsForVisualWheel: wheelConfig.segments.map(s => ({id: s.id, label: s.label})),
        originalFrontendSlotsUnsorted: wheelData?.slots?.map(s => ({id: s.id, label: s.label, position: s.position})) || "wheelData.slots not available"
      });
      
      toast({
        title: "Affichage désynchronisé",
        description: "Le prix gagné est correct (voir popup), mais l'affichage de la roue est désynchronisé. Contactez le support si cela persiste.",
        variant: "default",
        duration: 15000, // Longer duration for this important warning
      });
      
      // Fallback: The wheel will visually spin to segment 0.
      // The popup (from setSpinResult(data)) will show the CORRECT prize.
      setPrizeIndex(0); 
    } else {
      setPrizeIndex(prizeIndexFound);
    }
    
    setSpinResult(data); // This determines the popup content and is based on direct backend data.
    setMustSpin(true); // Trigger the visual spin
    
    // Show result modal after wheel stops spinning
    setTimeout(() => {
      setShowResultModal(true);
      if (data.play.result === 'WIN') {
        // Reset retry counter for QR code loading
        retryCount.current = 0;
        
        // Show confetti with a clear timeout
        setShowConfetti(true);
        setUserFlowState('won');
        
        // Stop confetti after 8 seconds
        setTimeout(() => {
          // Only hide confetti if we're still in the same flow
          if (userFlowState === 'won') {
            setShowConfetti(false);
          }
        }, 8000);
      }
      
      // After showing result, set next step to claim form if won
      if (data.play.result === 'WIN') {
        setCurrentStep('showPrize');
      } else {
        setCurrentStep('initial');
      }
    }, 5500); // Slightly longer than spin duration
  };

  // Handle result modal close and transition to next flow step
  const handleResultModalClose = () => {
    // Stop the confetti immediately when closing the modal
    setShowConfetti(false);
    setShowResultModal(false);
    
    // If user won and is in the showPrize step, show the claim form
    if (spinResult?.play.result === 'WIN' && currentStep === 'showPrize') {
      console.log('User won prize, showing claim form');
      setCurrentStep('claimForm');
      setShowClaimForm(true);
    } else {
      // Otherwise reset to initial state
      console.log('Resetting to initial state');
      setCurrentStep('initial');
      setUserFlowState('initial');
    }
  };

  // Handle claim form submission
  const handleClaimFormSubmit = (data: PlayerFormData) => {
    console.log('Claim form submitted:', data);
    
    // Stop confetti immediately
    setShowConfetti(false);
    
    // Store the claim data
    setClaimFormData({
      name: data.name,
      email: data.email,
      phone: data.phone || '',
      birthDate: data.birthDate || '',
      playId: spinResult?.play.id || '',
      prize: spinResult?.slot.label || '',
      timestamp: new Date().toISOString()
    });
    
    // Set user flow to claimed
    setUserFlowState('claimed');
    
    // Call API to update lead info if needed
    if (spinResult?.play.id) {
      // Here you would normally update the play record with complete user info
      // For now, just show thank you message
      setShowClaimForm(false);
      setShowThankyouMessage(true);
      
      // Show thank you message for 3 seconds then reset
      setTimeout(() => {
        setShowResultModal(false);
        setShowThankyouMessage(false);
        setCurrentStep('initial');
        // Reset states to allow playing again
        setMustSpin(false);
        setSpinResult(null);
        setShowConfetti(false);
        setUserFlowState('initial');
      }, 3000);
    }
  };

  // Get QR code URL with cache busting
  const getQRCodeUrl = () => {
    // Safety check - if spinResult or prize doesn't exist
    if (!spinResult || !spinResult.play || !spinResult.play.prize) {
      console.error('No valid spin result available for QR code');
      
      // Return a fallback "no QR" image
      return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMWYxZjEiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIyMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgYWxpZ25tZW50LWJhc2VsaW5lPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzeXN0ZW0tdWksIHNhbnMtc2VyaWYiIGZpbGw9IiM5OTkiPlBhcyBkZSBRUjwvdGV4dD48L3N2Zz4=';
    }
    
    // We know prize is defined at this point
    const prize = spinResult.play.prize;
    
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
      const text = `https://roue.izikado.fr/redeem/${spinResult.play.id}`;
      return `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(text)}&choe=UTF-8`;
    }
    
    // Fallback - if somehow we have a prize but no QR or PIN (should not happen)
    console.error('No QR code URL available');
    return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMWYxZjEiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIyMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgYWxpZ25tZW50LWJhc2VsaW5lPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzeXN0ZW0tdWksIHNhbnMtc2VyaWYiIGZpbGw9IiM5OTkiPlBhcyBkZSBRUjwvdGV4dD48L3N2Zz4=';
  };

  // Handle QR code image download
  const handleDownloadQR = () => {
    // Safety check for valid spinResult
    if (!spinResult || !spinResult.play || !spinResult.play.prize) {
      toast({
        title: 'Erreur',
        description: 'Impossible de télécharger le code QR. Données de prix manquantes.',
        variant: 'destructive'
      });
      return;
    }
    
    let qrUrl;
    
    // If there's a QR link in the prize, use it
    if (spinResult.play.prize.qrLink) {
      qrUrl = getQRCodeUrl();
    } 
    // Otherwise, if there's a PIN, generate a QR code
    else if (spinResult.play.prize.pin) {
      const pin = spinResult.play.prize.pin;
      const prizeInfo = `Prize: ${spinResult.slot.label}, PIN: ${pin}`;
      const encodedPrizeInfo = encodeURIComponent(prizeInfo);
      
      // Use Google Charts API for QR code generation
      qrUrl = `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodedPrizeInfo}&choe=UTF-8`;
    }
    else {
      toast({
        title: 'Erreur',
        description: 'Aucune information de prix disponible pour générer un QR code.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = qrUrl;
      link.download = `prix-${spinResult.slot.label.replace(/\s+/g, '-').toLowerCase()}.png`;
      
      // Append to the body, click, and remove
      document.body.appendChild(link);
      link.click();
      
      // Small delay before removing the element
      setTimeout(() => {
      document.body.removeChild(link);
      }, 100);
      
      toast({
        title: 'Téléchargement démarré',
        description: 'Le code QR a été téléchargé.'
      });
    } catch (error) {
      console.error('Error downloading QR code:', error);
      
      // Fallback: open in new tab
      window.open(qrUrl, '_blank');
      
      toast({
        title: 'Téléchargement alternatif',
        description: 'Cliquez avec le bouton droit sur l\'image et sélectionnez "Enregistrer sous..."'
      });
    }
  };

  // Update the fixWheel function to call the API
  const fixWheel = async () => {
    try {
      setIsLoading(true);
      
      try {
        // Try to fix wheel via API
        await api.fixWheel(wheelId || '');
        
        // Refetch wheel data
        refetch();
      } catch (apiError) {
        console.warn('Could not fix wheel via API, using client-side fix:', apiError);
        
        // Get the slots
        let slots = [];
        if (wheelData?.slots && wheelData.slots.length > 0) {
          // Use existing slots
          slots = wheelData.slots.map((slot, index) => ({
            id: slot.id,
            label: slot.label,
            color: slot.color || (index === 0 ? '#FF6384' : index === 1 ? '#36A2EB' : '#FFCE56'),
            position: index,
            isWinning: index === 0 // Make first slot winning
          }));
        } else {
          // Create default slots
          slots = [
            { label: 'Prix 1', color: '#FF6384', weight: 34, isWinning: true, position: 0 },
            { label: 'Prix 2', color: '#36A2EB', weight: 33, isWinning: false, position: 1 },
            { label: 'Prix 3', color: '#FFCE56', weight: 33, isWinning: false, position: 2 }
          ];
        }
        
        // Update wheel config
        setWheelConfig({
          ...wheelConfig,
          segments: slots.map(slot => ({
            label: slot.label,
            color: slot.color,
            isWinning: slot.isWinning
          })),
          colors: {
            primaryGradient: BRAND.primaryGradient,
            secondaryGradient: BRAND.secondaryGradient
          }
        });
      }
      
      // Show success message
      toast({
        title: "Roue corrigée",
        description: "La configuration de la roue a été corrigée.",
        variant: "default"
      });
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fixing wheel:', error);
      toast({
        title: "Erreur",
        description: "Impossible de corriger la roue.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  // Add a new method to force reload the wheel data
  const handleRefreshWheel = () => {
    console.log('Manually refreshing wheel data...');
    setDebugInfo('Refreshing wheel data...');
    refetch().then(() => {
      setDebugInfo('Wheel data refreshed successfully');
      toast({
        title: 'Données actualisées',
        description: 'Les données de la roue ont été rechargées.',
      });
    }).catch(error => {
      setDebugInfo(`Failed to refresh: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: 'Erreur',
        description: 'Impossible de recharger les données. Veuillez réessayer.',
        variant: 'destructive'
      });
    });
  };

  // Retry loading QR code if it fails initially
  const handleQRLoadError = (attempt: number) => {
    // ... existing code ...
  };

  if (isLoadingWheel) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-100">
        <h1 className="text-3xl font-bold text-indigo-700 mb-8">IZI Wheel</h1>
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
        <p className="mt-4 text-lg text-gray-700">Loading the wheel...</p>
      </div>
    );
  }

  if (wheelError || !wheelData) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-100 p-6">
        <h1 className="text-3xl font-bold text-indigo-700 mb-8">Oops!</h1>
        <div className="p-6 bg-white bg-opacity-90 backdrop-blur-md rounded-xl shadow-xl max-w-md w-full">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Something went wrong</h2>
          <p className="text-gray-600 mb-6">We couldn't load the wheel. Please try again later or contact support.</p>
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
          <p className="text-gray-600 mb-6">The wheel is not properly configured. Please contact the administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-4" style={{ backgroundColor: BRAND.backgroundGradient }}>
      {/* Logo */}
      <h1 className="text-4xl font-extrabold text-indigo-700 drop-shadow-lg mb-4 flex items-center gap-2">
        <span className="text-pink-500">IZI</span> Wheel
      </h1>
      
      {/* Debug info (only in development) */}
      {import.meta.env.DEV && debugInfo && (
        <div className="fixed bottom-4 left-4 bg-gray-800 text-white p-2 rounded-md text-xs max-w-xs opacity-75 z-50">
          <div className="font-mono">{debugInfo}</div>
        </div>
      )}
      
      {/* Social network debug info (only in dev mode) */}
      {import.meta.env.DEV && wheelData?.socialNetwork && (
        <div className="fixed top-4 right-4 bg-blue-800 text-white p-2 rounded-md text-xs max-w-xs opacity-75 z-50">
          <div className="font-mono">Social: {wheelData.socialNetwork}</div>
        </div>
      )}
      
      {/* Confetti (only shown on win) */}
      <TimedConfetti 
        key={`confetti-${showConfetti ? 'active' : 'inactive'}-${Date.now()}`}
        isActive={showConfetti} 
        duration={8000}
          options={{
            particleCount: 160,
            angle: 90,
            spread: 120,
            colors: CONFETTI_COLORS,
          shapes: ["star", "circle", "square"]
        }}
      />
      
      {/* Social redirect dialog */}
      {currentStep === 'socialRedirect' && (
        <SocialRedirectDialog
          open={showSocialRedirect}
          onClose={handleSocialRedirectClose}
          network={wheelData?.socialNetwork}
          redirectUrl={wheelData?.redirectUrl}
          redirectText={wheelData?.redirectText}
        />
      )}
      
      {/* Claim Form Dialog */}
      {showClaimForm && (
        <Dialog open={showClaimForm} onOpenChange={setShowClaimForm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-center">Récupérez votre lot !</DialogTitle>
              <DialogDescription className="text-center">
                Remplissez ce formulaire pour recevoir votre cadeau.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <PlayerForm 
                fields={formFields}
                onSubmit={handleClaimFormSubmit}
                isSubmitting={false}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Thank You Message */}
      {showThankyouMessage && (
        <Dialog open={showThankyouMessage} onOpenChange={setShowThankyouMessage}>
          <DialogContent className="max-w-sm text-center">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-emerald-600">Merci !</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-700 mb-4">
                Votre lot vous sera envoyé par email très prochainement.
              </p>
              <Button onClick={() => setShowThankyouMessage(false)}>Fermer</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Main Content Card - This will be centered by the parent flex container */}
      <div className="w-full max-w-xl bg-white bg-opacity-90 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden my-4">
        {/* <div className="w-full max-w-md bg-white bg-opacity-90 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden my-4"> */}
        {isLoadingWheel ? (
          // Loading state
          <div className="p-6 flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
            <p className="ml-2 text-gray-600">Chargement de la roue...</p>
          </div>
        ) : wheelError ? (
          // Error state with refresh button
          <div className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Erreur de chargement</h2>
            <p className="text-gray-600 mb-6">Impossible de charger les données de la roue.</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={handleRefreshWheel} variant="default" className="flex items-center gap-2">
                <RefreshCw size={16} />
                Rafraîchir
              </Button>
              <Button onClick={() => navigate(-1)} variant="outline">Retour</Button>
            </div>
          </div>
        ) : !wheelData ? (
          // Wheel not found state
          <div className="p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Roue introuvable</h2>
            <p className="text-gray-600 mb-6">Cette roue n'existe pas ou a été supprimée.</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={handleRefreshWheel} variant="default" className="flex items-center gap-2">
                <RefreshCw size={16} />
                Réessayer
              </Button>
              <Button onClick={() => navigate(-1)} variant="outline">Retour</Button>
            </div>
          </div>
        ) : wheelConfig.segments.length === 0 ? (
          // Wheel has no segments configuration
          <div className="p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">La roue n'est pas configurée</h2>
            <p className="text-gray-600 mb-6">Aucune option n'est disponible pour cette roue.</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={handleRefreshWheel} variant="default" className="flex items-center gap-2">
                <RefreshCw size={16} />
                Actualiser
              </Button>
              <Button onClick={fixWheel} variant="default">Corriger la roue</Button>
              <Button onClick={() => navigate(-1)} variant="outline">Retour</Button>
            </div>
          </div>
        ) : currentStep === 'initial' ? (
          // Initial state with start button
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">{wheelData.name || "Tentez votre chance"}</h2>
            <p className="text-gray-600 mb-8">Cliquez sur le bouton ci-dessous pour tenter de gagner un lot.</p>
            
            <Button 
              onClick={handleStartProcess}
              className="px-10 py-6 text-xl bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white font-bold rounded-xl shadow-xl transition-all duration-300"
            >
              Tourner la roue
            </Button>
          </div>
        ) : currentStep === 'spinWheel' ? (
          // Wheel View - needs a spin button if social is completed
          <div className="relative p-8 flex flex-col items-center justify-start">
            {/* Use a fixed size container with manual transform to adjust wheel position */}
            <div className="relative w-[492px] h-[560px] mx-auto flex items-center justify-center">
              <Wheel
                config={wheelConfig}
                isSpinning={mustSpin}
                prizeIndex={prizeIndex}
                onSpin={handleSpinClick}
                showSpinButton={false} // The main button is now handled below
              />
            </div>
            
            {/* Spin button and message area, appears below the wheel */}
            {!mustSpin && userFlowState === 'completedSocial' && (
              <div className="mt-6 w-full flex flex-col items-center">
                <Button 
                  onClick={handleSpinClick}
                  className="px-10 py-4 text-xl bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white font-bold rounded-xl shadow-xl transition-all duration-300"
                  disabled={isSpinning}
                >
                  {isSpinning ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Spinning...
                    </>
                  ) : (
                    'Tourner la roue !'
                  )}
                </Button>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-blue-700 text-center max-w-xs w-full">
                  <p>Vous pouvez maintenant tourner la roue pour tenter de gagner un lot !</p>
                </div>
              </div>
            )}
            
            {/* Message if waiting for social action (should ideally not happen here if flow is correct) */}
            {userFlowState !== 'completedSocial' && !mustSpin && wheelData?.socialNetwork && wheelData.socialNetwork !== 'NONE' && (
                 <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-yellow-700 text-center max-w-xs w-full">
                    <p>Veuillez d\'abord compléter l\'action sociale.</p>
                </div>
            )}
          </div>
        ) : (
          // Fallback
          <div className="p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Étape en cours...</h2>
            <Button onClick={() => setCurrentStep('initial')} variant="outline">Recommencer</Button>
          </div>
        )}
        {/* </div> */}
      </div>
      
      {/* Prize Result Modal */}
      <Dialog open={showResultModal} onOpenChange={handleResultModalClose}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader className={`${spinResult?.play.result === 'WIN' ? 'bg-emerald-500' : 'bg-gray-500'} -mt-6 -mx-6 p-4 rounded-t-lg`}>
            <DialogTitle className="text-2xl font-bold text-white flex items-center justify-center">
              {spinResult?.play.result === 'WIN' ? (
                <>
                  <span className="animate-bounce inline-block mr-2">🎉</span>
                  <span>Vous avez gagné !</span>
                </>
              ) : (
                <>
                  <span className="mr-2">😔</span>
                  <span>Pas de chance cette fois</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            {spinResult?.slot.label && (
              <h3 className="text-xl font-medium mb-4">{spinResult.slot.label}</h3>
            )}
            
            {spinResult?.play.result === 'WIN' && spinResult.play.prize?.pin && (
              <div className="mb-8">
                <p className="text-sm text-gray-500 mb-1">Votre code PIN</p>
                <div className="text-3xl font-mono font-bold tracking-widest bg-gray-100 py-2 rounded">
                  {spinResult.play.prize.pin}
                </div>
          </div>
            )}
            
            {spinResult?.play.result === 'WIN' && spinResult.play.prize?.qrLink && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">Code QR du lot</p>
                <div className="flex justify-center bg-white p-1 border rounded mx-auto" style={{ maxWidth: '200px' }}>
                  <img 
                    src={getQRCodeUrl()}
                    alt="Prize QR Code"
                    className="w-full h-auto"
                    onError={(e) => {
                      // If image fails to load, try to reload with a different approach
                      const target = e.target as HTMLImageElement;
                      const currentSrc = target.src;
                      
                      // Prevent infinite retry loops
                      if (currentSrc.includes('retry=true') || retryCount.current > 2) {
                        console.error('QR code image failed to load after multiple retries');
                        setDebugInfo('QR code image failed to load after multiple retries');
                        return;
                      }
                      
                      retryCount.current += 1;
                      
                      // Try a different approach - use Google Charts API directly
                      if (spinResult && spinResult.play) {
                        const text = `${window.location.origin}/redeem/${spinResult.play.id}`;
                        const retryUrl = `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(text)}&choe=UTF-8&retry=true`;
                        
                        console.log('QR code image failed to load, retrying with Google Charts API');
                        setDebugInfo(`Retrying QR load: ${retryUrl}`);
                        
                        // Update the image source
                        target.src = retryUrl;
                      }
                    }}
                  />
                </div>
                
                    <Button 
                  className="mt-4 w-full"
                  variant="outline"
                      onClick={handleDownloadQR}
                    >
                  Télécharger le QR
                    </Button>
              </div>
            )}
            
            {spinResult?.play.result === 'WIN' && (
              <Button 
                className="w-full mt-6 bg-gradient-to-r from-indigo-500 to-pink-500"
                onClick={() => {
                  setShowResultModal(false);
                  setCurrentStep('claimForm');
                  setShowClaimForm(true);
                }}
              >
                Récupérer mon lot
              </Button>
            )}
          </div>
          
          <Button variant="outline" onClick={handleResultModalClose}>
            {spinResult?.play.result === 'WIN' ? 'Plus tard' : 'Fermer'}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlayWheel; 
