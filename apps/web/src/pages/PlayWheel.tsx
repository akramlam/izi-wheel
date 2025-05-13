import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { toast } from '../hooks/use-toast';
import { Loader2, Mail, Phone, Calendar, User } from 'lucide-react';
import { Confetti } from '../components/magicui/confetti';
import Wheel from '../components/wheel/Wheel';
import type { WheelConfig } from '../components/wheel/types';

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
  }[];
};

type FormField = {
  name: string;
  label: string;
  type: string;
  required: boolean;
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
};

// Confetti colors
const CONFETTI_COLORS = [BRAND.primaryGradient, BRAND.secondaryGradient, '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff'];

const PlayWheel = () => {
  const { companyId, wheelId } = useParams<{ companyId: string; wheelId: string }>();
  const navigate = useNavigate();
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

  // Fetch wheel data
  const { data: wheelData, isLoading: isLoadingWheel, error: wheelError } = useQuery<WheelData>({
    queryKey: ['wheel', companyId, wheelId],
    queryFn: async () => {
      try {
        const response = await api.getPublicWheel(companyId || '', wheelId || '');
        return response.data.wheel;
      } catch (error) {
        console.error('Error fetching wheel data:', error);
        throw error;
      }
    },
    enabled: !!companyId && !!wheelId,
  });

  // Prepare wheel data when loaded
  useEffect(() => {
    if (wheelData) {
      // Ensure we have valid slot data, even if the wheel has no slots
      if (!wheelData.slots || wheelData.slots.length === 0) {
        return;
      }
      
      // Set wheel colors and prepare segments configuration
      const segments = wheelData.slots.map(slot => ({
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

      // Extract form fields from formSchema
      const fields: FormField[] = [];
      if (wheelData.formSchema) {
        if (Array.isArray(wheelData.formSchema.fields)) {
          // If formSchema has a fields array
          fields.push(...wheelData.formSchema.fields);
        } else if (typeof wheelData.formSchema === 'object') {
          // If formSchema is directly defining fields
          const defaultFields = [
            { name: 'name', label: 'Name', type: 'text', required: true },
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'phone', label: 'Phone', type: 'tel', required: false },
            { name: 'birthDate', label: 'Birth Date', type: 'date', required: false }
          ];
          fields.push(...defaultFields);
        }
      }
      setFormFields(fields);
    }
  }, [wheelData]);

  // Spin wheel mutation
  const { mutate: spinWheel, isPending: isSpinning } = useMutation({
    mutationFn: async () => {
      const response = await api.spinWheel(companyId || '', wheelId || '', { lead: formData });
      return response.data;
    },
    onSuccess: (data) => {
      if (!wheelData || !wheelData.slots || wheelData.slots.length === 0) return;
      // Find corresponding slot index
      let slotIndex = wheelData.slots.findIndex((slot) => slot.label === data.slot.label);
      if (slotIndex === -1) slotIndex = 0;
      
      setPrizeIndex(slotIndex);
      setSpinResult(data);
      setMustSpin(true);
      
      // Show result after wheel stops spinning
      setTimeout(() => {
        setShowResultModal(true);
        if (data.play.result === 'WIN') {
          setShowConfetti(true);
        }
      }, 5500); // Slightly longer than spin duration
    },
    onError: (error) => {
      console.error('Error spinning wheel:', error);
      toast({
        title: 'Error',
        description: 'Failed to spin the wheel. Please try again.',
        variant: 'destructive'
      });
    }
  });

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const missingFields = formFields
      .filter(field => field.required && !formData[field.name])
      .map(field => field.label);
    
    if (missingFields.length > 0) {
      toast({
        title: 'Missing information',
        description: `Please fill in the following fields: ${missingFields.join(', ')}`,
        variant: 'destructive'
      });
      return;
    }
    
    // Spin the wheel!
    spinWheel();
  };

  const handleStopSpinning = () => {
    setMustSpin(false);
  };

  // Handle QR code download
  const handleDownloadQR = () => {
    if (spinResult?.play?.prize?.qrLink) {
      const link = document.createElement('a');
      link.href = spinResult.play.prize.qrLink;
      link.download = `prize-qr-${spinResult.play.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
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
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-100 overflow-x-hidden animate-gradient-x p-4">
      {/* Logo */}
      <h1 className="text-4xl font-extrabold text-indigo-700 drop-shadow-lg mb-8 flex items-center gap-2">
        <span className="text-pink-500">IZI</span> Wheel
      </h1>
      
      {/* Confetti (only shown on win) */}
      {showConfetti && (
        <Confetti
          options={{
            particleCount: 160,
            angle: 90,
            spread: 120,
            colors: CONFETTI_COLORS,
            shapes: ["star", "circle", "square"],
          }}
          className="!fixed inset-0 z-[300] pointer-events-none"
        />
      )}
      
      {/* Main Content */}
      <div className="w-full max-w-md mx-auto bg-white bg-opacity-90 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden">
        {formFields.length > 0 && !mustSpin ? (
          // Form View
          <div className="p-6">
            <h2 className="text-2xl font-semibold text-center text-indigo-700 mb-6">
              Entrez vos coordonnées
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formFields.map((field) => (
                <div key={field.name} className="space-y-1">
                  <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
                    {field.label}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      {inputIcons[field.name] || null}
                    </div>
                    <input
                      type={field.type}
                      id={field.name}
                      name={field.name}
                      value={formData[field.name] || ''}
                      onChange={handleFormChange}
                      required={field.required}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-white bg-opacity-70 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                      placeholder={field.label}
                    />
                  </div>
                </div>
              ))}
              <Button
                type="submit"
                className="w-full mt-6 py-4 bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all duration-300"
                disabled={isSpinning}
              >
                {isSpinning ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Tourner la roue !'
                )}
              </Button>
            </form>
          </div>
        ) : (
          // Wheel View
          <div className="relative p-6 flex flex-col items-center justify-center">
            <Wheel
              config={wheelConfig}
              isSpinning={mustSpin}
              prizeIndex={prizeIndex}
              onSpin={() => {
                if (!mustSpin) setMustSpin(true);
              }}
            />
            
            {/* Only show back button if appropriate */}
            {!mustSpin && (
              <button
                onClick={() => setMustSpin(false)}
                className="mt-4 text-indigo-600 hover:text-indigo-800 font-medium"
              >
                ← Return to form
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Prize Result Modal */}
      <Dialog open={showResultModal} onOpenChange={setShowResultModal}>
        <DialogContent className="bg-white bg-opacity-95 backdrop-blur-md rounded-xl shadow-2xl border-0 max-w-md p-0 overflow-hidden">
          <div className={`p-6 ${spinResult?.play.result === 'WIN' ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-slate-600 to-slate-800'}`}>
            <DialogTitle className="text-white text-2xl font-bold text-center">
              {spinResult?.play.result === 'WIN' ? '🎉 You Won!' : 'Better Luck Next Time'}
            </DialogTitle>
          </div>
          <div className="p-6">
            <DialogDescription className="text-center text-lg mb-4">
              {spinResult?.slot.label}
            </DialogDescription>
            
            {spinResult?.play.result === 'WIN' && spinResult.play.prize && (
              <div className="flex flex-col items-center space-y-4 my-4">
                <div className="bg-gray-100 rounded-lg p-4 w-full text-center">
                  <p className="text-sm text-gray-500 mb-1">Your Prize PIN</p>
                  <p className="text-3xl font-mono font-bold tracking-wider">{spinResult.play.prize.pin}</p>
                </div>
                
                {spinResult.play.prize.qrLink && (
                  <div className="mt-4 text-center">
                    <img 
                      src={spinResult.play.prize.qrLink} 
                      alt="Prize QR Code" 
                      className="w-48 h-48 mx-auto mb-2"
                    />
                    <Button 
                      onClick={handleDownloadQR}
                      variant="outline" 
                      className="mt-2 text-indigo-600 border-indigo-300"
                    >
                      Download QR
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-center mt-6">
              <Button 
                onClick={() => {
                  setShowResultModal(false);
                  setShowConfetti(false);
                  // Reset for another spin
                  setTimeout(() => {
                    setMustSpin(false);
                    setFormData({});
                  }, 500);
                }}
                className="px-8 py-2 bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-semibold rounded-lg"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlayWheel; 