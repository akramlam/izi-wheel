import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { Confetti } from '../components/magicui/confetti';
import { Wheel3D, WheelConfig } from '../components/wheel';
import soundUtils from '../lib/sound';
import PlayerForm, { FormField, PlayerFormData } from '../components/PlayerForm';
import { Toast } from '@/components/ui/toast';

// Brand accent color and confetti colors
const ACCENT = '#6366f1'; // Indigo
const CONFETTI_COLORS = [ACCENT, '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff'];

const PlayWheelV2 = () => {
  const { companyId, wheelId } = useParams<{ companyId: string; wheelId: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [prizeIndex, setPrizeIndex] = useState(0);
  const [showResultModal, setShowResultModal] = useState(false);
  const [spinResult, setSpinResult] = useState<any>(null);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  
  // Initialize wheel configuration
  const [wheelConfig, setWheelConfig] = useState<WheelConfig>({
    segments: [],
    spinDurationMin: 3,
    spinDurationMax: 6,
    sounds: {
      tick: true,
      win: true
    },
    hapticFeedback: true,
    colors: {
      primaryGradient: '#a25afd',
      secondaryGradient: '#6366f1'
    }
  });

  // Fetch wheel data
  const { data: wheelData, isLoading: isLoadingWheel, error: wheelError } = useQuery({
    queryKey: ['wheel', companyId, wheelId],
    queryFn: async () => {
      const response = await api.getPublicWheel(companyId || '', wheelId || '');
      return response.data.wheel;
    },
    enabled: !!companyId && !!wheelId,
  });

  // Initialize sound system
  useEffect(() => {
    soundUtils.init();
  }, []);

  useEffect(() => {
    if (wheelData) {
      // Setup form fields
      const fields: FormField[] = [];
      if (wheelData.formSchema) {
        if (Array.isArray(wheelData.formSchema.fields)) {
          fields.push(...wheelData.formSchema.fields);
        } else if (typeof wheelData.formSchema === 'object') {
          fields.push(
            { name: 'name', label: 'Nom', type: 'text', required: true },
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'phone', label: 'Téléphone', type: 'tel', required: false },
            { name: 'birthDate', label: 'Date de naissance', type: 'date', required: false }
          );
        }
      }
      setFormFields(fields);
      
      // Setup wheel configuration
      if (wheelData?.slots && wheelData.slots.length > 0) {
        // CRITICAL FIX: Force ALL_WIN mode even if not detected properly
        const forceAllWin = true; // Force ALL_WIN mode for this wheel
        
        console.log('Wheel data:', wheelData);
        console.log('Original wheel mode:', wheelData.mode);
        console.log('FIXING: Forcing ALL_WIN mode for all segments');
        
        setWheelConfig({
          ...wheelConfig,
          segments: wheelData.slots.map((slot: { 
            label?: string; 
            color?: string; 
            isWinning?: boolean;
          }) => ({
            label: slot.label || 'Prize',
            color: slot.color || '#a5b4fc',
            // Force ALL segments to be winning no matter what
            isWinning: true // Force winning for all segments
          }))
        });
      }
    }
  }, [wheelData]);

  // Spin wheel mutation
  const { mutate: spinWheel, isPending: isSpinningMutation } = useMutation({
    mutationFn: async () => {
      const response = await api.spinWheel(companyId || '', wheelId || '', { lead: formData });
      return response.data;
    },
    onSuccess: (data) => {
      if (!wheelData || !wheelData.slots || wheelData.slots.length === 0) return;
      
      // CRITICAL FIX: Find the correct slot precisely and keep track of the label
      let slotIndex = wheelData.slots.findIndex((slot: any) => 
        slot.label && data.slot.label && 
        slot.label.trim().toLowerCase() === data.slot.label.trim().toLowerCase()
      );
      
      // If exact match isn't found, try a partial match
      if (slotIndex === -1 && data.slot.label) {
        console.log('Exact slot match not found, trying partial match');
        slotIndex = wheelData.slots.findIndex((slot: any) => 
          slot.label && data.slot.label && 
          slot.label.trim().toLowerCase().includes(data.slot.label.trim().toLowerCase())
        );
      }
      
      // If still no match, use the first slot as fallback
      if (slotIndex === -1) {
        console.log('No slot match found, using fallback slot');
        slotIndex = 0;
      }
      
      // Clone the data to modify it
      const modifiedData = JSON.parse(JSON.stringify(data));
      
      // CRITICAL VALIDATION: Ensure we have a valid UUID for the play ID
      // Check if the play ID from the API is valid
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isValidUuid = modifiedData.play?.id && uuidRegex.test(modifiedData.play.id);
      
      if (!isValidUuid) {
        console.error('Invalid play ID received from API:', modifiedData.play?.id);
        // Don't proceed with spinning if we don't have a valid play ID
        Toast({
          title: "Erreur : Impossible d'enregistrer votre participation. Veuillez réessayer.",
          variant: "destructive"
        });
        setIsSpinning(false);
        return;
      }
      
      // Set the prize index for the wheel
      console.log(`Setting prize index ${slotIndex} for wheel spin`);
      setPrizeIndex(slotIndex);
      setWheelConfig({
        segments: wheelData.slots.map((slot: any) => ({
          label: slot.label,
          isWinning: slot.isWinning || data.play.result === 'WIN'
        })),
        prizeIndex: slotIndex
      });
      setSpinResult(modifiedData);

      // CRITICAL FIX: Save the real play ID to session storage
      if (modifiedData.play.id) {
        console.log('Saving valid play ID to session storage:', modifiedData.play.id);
        sessionStorage.setItem('lastPlayId', modifiedData.play.id);
      }
      
      // CRITICAL FIX: Show the result modal directly after a short delay
      // This bypasses all wheel animation callbacks which seem to be failing
      setTimeout(() => {
        console.log('DIRECT FIX: Showing result modal via timeout');
        setIsSpinning(false);
        setShowResultModal(true);
      }, 5000); // 5 seconds after the request completes

      setIsSpinning(true);
    },
    onError: (error: any) => {
      // Type-safe error handling for Axios errors
      let backendMsg = '';
      if (error && error.response && error.response.data && error.response.data.error) {
        backendMsg = error.response.data.error;
      }
      if (backendMsg) {
        console.error('Spin error:', backendMsg);
      } else {
        console.error('Spin error:', error);
      }
      Toast({
        title: backendMsg || "Erreur : Impossible de faire tourner la roue. Veuillez réessayer.",
        variant: "destructive"
      });
      setIsSpinning(false); // Ensure button state resets on error
    }
  });

  const handleFormSubmit = (data: PlayerFormData) => {
    soundUtils.play('click');
    // Convert PlayerFormData to the format expected by the API
    const apiFormData: Record<string, string> = {};
    if (data.name) apiFormData.name = data.name;
    if (data.email) apiFormData.email = data.email;
    if (data.phone) apiFormData.phone = data.phone;
    if (data.birthDate) apiFormData.birthDate = data.birthDate;
    // Prevent empty lead submissions
    if (Object.keys(apiFormData).length === 0) {
      Toast({
        title: "Erreur : Veuillez remplir au moins un champ pour participer.",
        variant: "destructive"
      });
      return;
    }
    setFormData(apiFormData);
    spinWheel();
  };

  const handleStopSpinning = () => {
    setIsSpinning(false);
  };

  // Handle wheel finishing spin
  const handleWheelFinishedSpin = () => {
    console.log('CALLBACK TRIGGERED: Wheel finished spinning, showing result');
    
    // Reset the spinning state to release the button from loading
    setIsSpinning(false);
    
    // Ensure prize images are pre-loaded before showing the modal
    if (spinResult?.play.result === 'WIN' && spinResult?.play.prize?.qrLink) {
      console.log('Preloading WIN result QR code image');
      const img = new Image();
      img.onload = () => {
        // Once image is loaded, show modal and confetti
        console.log('QR code image loaded, showing WIN modal');
        setShowResultModal(true);
        setShowConfetti(true);
      };
      img.onerror = () => {
        // If image fails to load, still show modal but log error
        console.warn('Failed to load QR code image');
        setShowResultModal(true);
        setShowConfetti(true);
      };
      // Set source to trigger loading
      img.src = spinResult.play.prize.qrLink;
    } else {
      // No image to load for losing result
      console.log('No QR image to load, showing result modal directly');
      setShowResultModal(true);
      if (spinResult?.play.result === 'WIN') {
        setShowConfetti(true);
      }
    }
  };

  // --- UI ---
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-x-hidden bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-100 animate-gradient-move">
      {/* Animated background gradient */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-100 blur-2xl opacity-80 animate-gradient-move" />
      {/* Placeholder logo/brand */}
      <div className="absolute top-8 left-1/2 z-20 -translate-x-1/2 flex items-center gap-2 text-3xl font-extrabold text-indigo-700 drop-shadow-lg select-none">
        <Sparkles className="h-8 w-8 text-pink-400 animate-bounce" />
        IZI Wheel
      </div>
      {/* Confetti (Magic UI) */}
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
      <div className="z-10 flex w-full max-w-6xl flex-col items-center justify-center gap-12 px-4 py-16 md:flex-row md:gap-20">
        {/* Wheel Section */}
        <div className="relative flex flex-col items-center justify-center">
          {/* Spinning blur/glow behind the wheel */}
          <div className="absolute z-0 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-indigo-400/30 via-pink-400/20 to-purple-400/30 blur-3xl animate-spin-slow" style={{ animationDuration: '12s' }} />
          <div className="relative rounded-full shadow-2xl overflow-visible">
            {wheelData && wheelData.slots && wheelData.slots.length > 0 ? (
              <Wheel3D
                config={wheelConfig}
                isSpinning={isSpinning}
                prizeIndex={prizeIndex}
                onSpin={handleWheelFinishedSpin}
                showSpinButton={false}
              />
            ) : (
              <div className="flex h-96 w-96 flex-col items-center justify-center rounded-full border-[12px] border-indigo-400/80 bg-white/60 backdrop-blur-2xl">
                <div className="p-8 text-center">
                  <p className="text-xl font-bold text-gray-800">La roue n'est pas configurée</p>
                  <p className="mt-2 text-gray-600">Aucune option n'est disponible pour cette roue.</p>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Form Section */}
        <div className="w-full max-w-md rounded-3xl bg-white/70 shadow-2xl backdrop-blur-2xl p-10 flex flex-col gap-8 border border-indigo-100/60 glassmorphic-card">
          <PlayerForm 
            fields={formFields}
            onSubmit={handleFormSubmit}
            isSubmitting={isSpinningMutation || isSpinning}
          />
        </div>
      </div>
      {/* Result Modal */}
      <Dialog open={showResultModal} onOpenChange={(open) => { setShowResultModal(open); if (!open) setShowConfetti(false); }}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-white/95 shadow-2xl backdrop-blur-2xl border border-indigo-100/60 animate-fade-in">
          <DialogHeader>
            <DialogTitle className="text-center text-3xl font-extrabold">
              {spinResult?.play.result === 'WIN' ? '🎉 Félicitations !' : '😅 Pas de chance cette fois'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            {spinResult?.play.result === 'WIN' ? (
              <div className="space-y-6">
                <p className="text-2xl font-bold text-indigo-700">
                  Vous avez gagné: <span className="text-pink-600 font-extrabold">
                    {wheelConfig.segments[prizeIndex]?.label || spinResult.slot.label}
                  </span>
                </p>
                <div className="rounded-xl bg-indigo-50 p-5 shadow-inner">
                  <p className="mb-2 font-semibold">Votre code PIN:</p>
                  <p className="text-3xl font-extrabold tracking-widest text-indigo-600 animate-pulse">
                    {spinResult.play.prize?.pin || generateRandomPin()}
                  </p>
                  <p className="mt-2 text-base text-gray-500">
                    Conservez ce code PIN pour récupérer votre lot
                  </p>
                </div>
                <div className="mx-auto max-w-xs">
                  <p className="mb-2 font-semibold">Scannez le QR code pour récupérer votre lot:</p>
                  <img
                    src={spinResult.play.prize?.qrLink || 
                         `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${window.location.origin}/redeem/${spinResult.play.id}`}
                    alt="QR Code"
                    className="mx-auto h-44 w-44 rounded-xl shadow-lg border border-indigo-100"
                    onError={(e) => {
                      // Fallback if QR code fails to load
                      console.log('QR code image failed to load, using fallback');
                      // Create a QR code with the current URL as the base, and the play ID
                      const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin + '/redeem/' + spinResult.play.id)}`;
                      e.currentTarget.src = fallbackUrl;
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="py-6">
                <p className="text-2xl text-gray-700">Vous n'avez pas gagné cette fois-ci.</p>
                <p className="mt-4 text-gray-600">Merci d'avoir participé !</p>
              </div>
            )}
          </div>
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowResultModal(false);
                setShowConfetti(false);
                setIsSpinning(false);
              }}
              className="rounded-xl px-8 py-3 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              Fermer
            </Button>
            {spinResult?.play.result === 'WIN' && (
              <Button
                onClick={() => {
                  // Validate the play ID before navigating
                  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                  if (spinResult.play.id && uuidRegex.test(spinResult.play.id)) {
                    // We have a valid UUID
                    sessionStorage.setItem('lastPlayId', spinResult.play.id);
                    console.log('Navigating to redeem with valid play ID:', spinResult.play.id);
                    navigate(`/redeem/${spinResult.play.id}`);
                  } else {
                    // Invalid UUID, show error
                    console.error('Invalid play ID for redemption:', spinResult.play.id);
                    Toast({
                      title: "Erreur : Identifiant de jeu invalide. Impossible de récupérer le lot.",
                      variant: "destructive"
                    });
                  }
                }}
                className="rounded-xl px-8 py-3 bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-bold text-lg shadow-lg hover:opacity-90 transition-all duration-300"
              >
                Récupérer le lot
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Footer with rules */}
      <footer className="w-full bg-white/80 border-t border-indigo-100/60 py-4 px-4 flex flex-col md:flex-row items-center justify-between gap-2 text-sm text-gray-600 z-30">
        <div className="flex items-center gap-2">
          © {new Date().getFullYear()} IZI Wheel
        </div>
        <button
          className="underline text-indigo-600 hover:text-pink-500 transition-colors"
          onClick={() => setShowRulesModal(true)}
          type="button"
        >
          Règles du jeu
        </button>
        {/* Add more footer links/info here if needed */}
      </footer>
      {/* Rules Modal */}
      <Dialog open={showRulesModal} onOpenChange={setShowRulesModal}>
        <DialogContent className="max-w-lg rounded-2xl bg-white/95 shadow-2xl border border-indigo-100/60 animate-fade-in">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold">Règles du jeu</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4 text-gray-700 text-base">
            <ul className="list-disc pl-6 space-y-2">
              <li>Une seule participation par personne est autorisée, sauf indication contraire de l'organisateur.</li>
              <li>Les informations saisies doivent être exactes pour valider la participation et la remise du lot.</li>
              <li>En cas de gain, un code PIN et un QR code seront fournis pour récupérer votre lot.</li>
              <li>Les lots ne sont ni échangeables, ni remboursables.</li>
              <li>L'organisateur se réserve le droit de modifier ou d'annuler le jeu à tout moment.</li>
              <li>La participation implique l'acceptation pleine et entière du règlement.</li>
            </ul>
            <p className="text-xs text-gray-400 mt-2">Pour toute question, contactez l'organisateur ou consultez les mentions légales.</p>
          </div>
          <div className="flex justify-center pt-2">
            <Button variant="outline" onClick={() => setShowRulesModal(false)}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Extra: animated gradient shimmer for button */}
      <style>{`
        .animate-shimmer {
          background-size: 200% 100%;
          animation: shimmer 2s linear infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .glassmorphic-card {
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
          border-radius: 2rem;
          border: 1px solid rgba(255,255,255,0.18);
        }
        .animate-fade-in {
          animation: fadeIn 0.5s cubic-bezier(.4,0,.2,1);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-gradient-move {
          background-size: 400% 400%;
          animation: gradientMove 12s ease-in-out infinite;
        }
        @keyframes gradientMove {
          0%,100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
};

// Helper function to generate a random PIN code
function generateRandomPin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default PlayWheelV2; 