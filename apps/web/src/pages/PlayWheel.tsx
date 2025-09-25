import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { toast } from '../hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { TimedConfetti } from '../components/magicui/timedConfetti';
import Wheel from '../components/wheel/Wheel';
import type { WheelConfig, WheelSpinResult } from '../components/wheel/types';
import PlayerForm, { PlayerFormData } from '../components/PlayerForm';
import { detectAndLinkPhoneNumbers } from '../utils/phoneUtils';

// Simple, clean types
interface WheelSlot {
  id: string;
  label: string;
  color: string;
  isWinning: boolean;
  position?: number;
}

interface WheelData {
  id: string;
  name: string;
  mainTitle?: string;
  gameRules?: string;
  footerText?: string;
  bannerImage?: string;
  backgroundImage?: string;
  socialNetwork?: string;
  redirectUrl?: string;
  redirectText?: string;
  formSchema?: {
    fields: any[];
  };
  slots: WheelSlot[];
}

interface PlayResponse {
  play: {
    id: string;
    result: 'WIN' | 'LOSE';
    prize?: {
      pin: string;
      qrLink: string;
    };
  };
  slot: {
    id: string;
    label: string;
    position?: number;
  };
}

const PlayWheel = () => {
  const { companyId, wheelId } = useParams<{ companyId: string; wheelId: string }>();

  // State management
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeIndex, setPrizeIndex] = useState(0);
  const [showResultModal, setShowResultModal] = useState(false);
  const [spinResult, setSpinResult] = useState<PlayResponse | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSocialRedirect, setShowSocialRedirect] = useState(false);
  const [hasCompletedSocial, setHasCompletedSocial] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  console.log('PlayWheel params:', { companyId, wheelId });

  // Wheel data query
  const { data: wheelData, isLoading: wheelLoading, error } = useQuery<{ wheel: WheelData }>({
    queryKey: ['publicWheel', companyId, wheelId],
    queryFn: async () => {
      console.log('Fetching wheel data...');
      const effectiveCompanyId = companyId || 'company';
      const response = await api.getPublicWheel(effectiveCompanyId, wheelId!);
      return response.data;
    },
    enabled: !!wheelId,
    retry: 2,
  });

  // Play wheel mutation
  const playWheelMutation = useMutation<PlayResponse, Error, any>({
    mutationFn: async (leadInfo) => {
      console.log('Playing wheel...');
      const effectiveCompanyId = companyId || 'company';
      const response = await api.spinWheel(effectiveCompanyId, wheelId!, { lead: leadInfo || {} });
      return response.data;
    },
  });

  // Sort slots by position for consistent wheel display
  const sortedSlots = wheelData?.wheel?.slots?.sort((a, b) => {
    const posA = a.position ?? 999;
    const posB = b.position ?? 999;
    if (posA === posB) {
      return a.id.localeCompare(b.id);
    }
    return posA - posB;
  }) || [];

  // Ensure we have at least some default slots to prevent empty wheel
  const validSlots = sortedSlots.length > 0 ? sortedSlots : [
    { id: 'default-1', label: 'Prix 1', color: '#FF6384', isWinning: true, position: 0 },
    { id: 'default-2', label: 'Prix 2', color: '#36A2EB', isWinning: false, position: 1 },
    { id: 'default-3', label: 'Prix 3', color: '#FFCE56', isWinning: false, position: 2 },
  ];

  // Wheel configuration
  const wheelConfig: WheelConfig | null = wheelData?.wheel ? {
    segments: validSlots.map(slot => ({
      id: slot.id,
      label: slot.label,
      color: slot.color,
      isWinning: slot.isWinning,
      position: slot.position,
    })),
    spinDurationMin: 3,
    spinDurationMax: 6,
    sounds: {
      tick: true,
      win: true,
    },
    hapticFeedback: true,
  } : null;

  // Handle spin complete
  const handleSpinComplete = useCallback((result: WheelSpinResult) => {
    console.log('Wheel spin completed:', result);

    if (!spinResult) {
      console.warn('No spin result available');
      return;
    }

    // The result.pointerIndex should match the expected prizeIndex
    console.log('Spin result alignment:', {
      pointerIndex: result.pointerIndex,
      expectedIndex: result.expectedIndex,
      isAligned: result.isAligned
    });

    setMustSpin(false);
    setShowConfetti(spinResult.play.result === 'WIN');
    setShowResultModal(true);
  }, [spinResult]);

  // Handle play wheel
  const handlePlayWheel = useCallback(async () => {
    if (!wheelConfig || isLoading) return;

    setIsLoading(true);
    try {
      console.log('Starting wheel play...');
      const result = await playWheelMutation.mutateAsync({});

      console.log('Play result:', result);
      setSpinResult(result);

      // Find the prize index based on the winning slot
      let targetIndex = 0;
      if (result.slot?.id) {
        const foundIndex = validSlots.findIndex(slot => slot.id === result.slot.id);
        if (foundIndex !== -1) {
          targetIndex = foundIndex;
        }
      }

      console.log('Setting prize index to:', targetIndex);
      setPrizeIndex(targetIndex);
      setMustSpin(true);

    } catch (error) {
      console.error('Play wheel error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de jouer à la roue. Veuillez réessayer.',
        variant: 'destructive',
      });
      setMustSpin(false);
    } finally {
      setIsLoading(false);
    }
  }, [wheelConfig, playWheelMutation, validSlots, isLoading, toast]);

  // Social redirect effect
  useEffect(() => {
    if (wheelData?.wheel?.socialNetwork && !hasCompletedSocial) {
      setShowSocialRedirect(true);
    }
  }, [wheelData?.wheel?.socialNetwork, hasCompletedSocial]);

  // Handle social completion
  const handleSocialComplete = () => {
    setHasCompletedSocial(true);
    setShowSocialRedirect(false);
  };

  // Handle claim form
  const handleClaimFormSubmit = async (formData: PlayerFormData) => {
    setShowClaimForm(false);
    toast({
      title: 'Succès !',
      description: 'Vos informations ont été enregistrées avec succès.',
    });
  };

  // Handle replay
  const handleReplay = () => {
    setShowResultModal(false);
    setSpinResult(null);
    setShowConfetti(false);
    setMustSpin(false);
    setPrizeIndex(0);
    setIsLoading(false);
  };

  // Loading state
  if (wheelLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 text-red-600">Erreur</h2>
          <p className="text-gray-600">Impossible de charger la roue. Veuillez réessayer.</p>
        </div>
      </div>
    );
  }

  // No wheel data
  if (!wheelData?.wheel) {
    console.log('Wheel data:', wheelData);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Roue non trouvée</h2>
          <p className="text-gray-500">Cette roue n'existe pas ou n'est plus disponible.</p>
        </div>
      </div>
    );
  }

  const { wheel } = wheelData;
  const winningLabel = spinResult?.slot?.label || '';

  return (
    <div
      className="min-h-screen w-full relative flex flex-col"
      style={{
        background: wheel.backgroundImage
          ? `url(${wheel.backgroundImage}) center/cover no-repeat`
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}
    >
      {/* Banner */}
      {wheel.bannerImage && (
        <div className="w-full h-32 md:h-48 bg-gray-200 flex items-center justify-center overflow-hidden">
          <img
            src={wheel.bannerImage}
            alt="Banner"
            className="w-full h-full object-cover"
            onError={(e) => {
              console.log('Banner image failed to load');
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-4xl mx-auto text-center">
          {/* Title */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
              {wheel.mainTitle || wheel.name || 'Roue de la Fortune'}
            </h1>

            {/* Game rules */}
            {wheel.gameRules && (
              <div className="max-w-2xl mx-auto">
                <p className="text-lg text-white/90 leading-relaxed">
                  {wheel.gameRules}
                </p>
              </div>
            )}
          </div>

          {/* Wheel */}
          <div className="mb-8">
            {wheelConfig && (
              <Wheel
                config={wheelConfig}
                isSpinning={mustSpin}
                prizeIndex={prizeIndex}
                onSpin={() => setMustSpin(false)}
                onSpinComplete={handleSpinComplete}
              />
            )}
          </div>

          {/* Action buttons */}
          <div className="space-y-4">
            {!showSocialRedirect && (
              <Button
                onClick={handlePlayWheel}
                disabled={isLoading || mustSpin}
                className="px-8 py-3 text-lg font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
              >
                {isLoading || mustSpin ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {mustSpin ? 'En cours...' : 'Chargement...'}
                  </>
                ) : (
                  'Tourner la roue'
                )}
              </Button>
            )}
          </div>

          {/* Footer text */}
          {wheel.footerText && (
            <div className="mt-12 max-w-2xl mx-auto">
              <p
                className="text-sm text-white/70 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: detectAndLinkPhoneNumbers(wheel.footerText)
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Social redirect dialog */}
      <Dialog open={showSocialRedirect} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Action requise</DialogTitle>
            <DialogDescription>
              {wheel.redirectText || 'Veuillez effectuer l\'action sociale pour continuer.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-6">
            <Button
              onClick={() => {
                if (wheel.redirectUrl) {
                  window.open(wheel.redirectUrl, '_blank');
                }
                setTimeout(handleSocialComplete, 2000);
              }}
              className="w-full"
            >
              Continuer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Result modal */}
      <Dialog open={showResultModal} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">
              {spinResult?.play.result === 'WIN' ? 'Félicitations ! 🎉' : 'Pas de chance cette fois !'}
            </DialogTitle>
            <DialogDescription className="text-center text-lg mt-4">
              {spinResult?.play.result === 'WIN'
                ? `Vous avez gagné : ${winningLabel}`
                : 'Tentez votre chance une autre fois !'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-6">
            {spinResult?.play.result === 'WIN' && spinResult.play.prize && (
              <div className="text-center space-y-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="font-semibold text-green-800">Votre code PIN :</p>
                  <p className="text-2xl font-mono font-bold text-green-900 mt-2">
                    {spinResult.play.prize.pin}
                  </p>
                </div>

                <Button
                  onClick={() => setShowClaimForm(true)}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500"
                >
                  Réclamer mon prix
                </Button>
              </div>
            )}

            <Button
              variant="outline"
              onClick={handleReplay}
              className="w-full"
            >
              Rejouer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Claim form modal */}
      <Dialog open={showClaimForm} onOpenChange={setShowClaimForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Réclamez votre prix</DialogTitle>
            <DialogDescription>
              Veuillez remplir les informations suivantes pour réclamer votre prix.
            </DialogDescription>
          </DialogHeader>

          {wheel.formSchema?.fields && (
            <PlayerForm
              fields={wheel.formSchema.fields}
              onSubmit={handleClaimFormSubmit}
              isLoading={false}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confetti */}
      {showConfetti && (
        <TimedConfetti
          particleCount={100}
          colors={['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A']}
          duration={3000}
          onComplete={() => setShowConfetti(false)}
        />
      )}
    </div>
  );
};

export default PlayWheel;