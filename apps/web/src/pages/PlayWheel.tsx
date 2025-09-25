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
  console.log('🎯 Modal states:', { showResultModal, mustSpin, isLoading });

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
    console.log('🎯 Wheel spin completed:', result);
    console.log('🎯 Available slots:', validSlots.map((slot, i) => `${i}: ${slot.label}`));
    console.log('🎯 Current spinResult:', spinResult);

    // The result.pointerIndex should match the expected prizeIndex
    console.log('🎯 Spin result alignment:', {
      pointerIndex: result.pointerIndex,
      expectedIndex: result.expectedIndex,
      isAligned: result.isAligned,
      actualSlotAtPointer: validSlots[result.pointerIndex]?.label,
      expectedSlotAtPointer: validSlots[result.expectedIndex]?.label
    });

    // Verify alignment
    if (!result.isAligned) {
      console.error('❌ WHEEL ALIGNMENT MISMATCH!', {
        expected: result.expectedIndex,
        actual: result.pointerIndex,
        expectedSlot: validSlots[result.expectedIndex]?.label,
        actualSlot: validSlots[result.pointerIndex]?.label
      });
    } else {
      console.log('✅ Wheel alignment correct');
    }

    setMustSpin(false);

    // Always show the modal regardless of spinResult timing
    console.log('🎯 Setting showResultModal to true');
    setShowResultModal(true);

    // Show confetti if we have spin result and it's a win
    if (spinResult?.play.result === 'WIN') {
      console.log('🎉 Setting confetti to true');
      setShowConfetti(true);
    }
  }, [spinResult, validSlots]);

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
      className="min-h-screen w-full relative"
      style={{
        background: wheel.backgroundImage
          ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${wheel.backgroundImage}) center/cover no-repeat`
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Banner - show if bannerImage exists, otherwise show default banner area */}
      {(wheel.bannerImage || wheel.mainTitle) && (
        <div className="w-full h-24 md:h-32 bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-sm flex items-center justify-center overflow-hidden">
          {wheel.bannerImage ? (
            <img
              src={wheel.bannerImage}
              alt="Banner"
              className="w-full h-full object-cover"
              onError={(e) => {
                console.log('Banner image failed to load, showing default');
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="text-center">
              <h2 className="text-xl md:text-2xl font-bold text-white/90">
                {wheel.mainTitle || wheel.name || 'Roue de la Fortune'}
              </h2>
            </div>
          )}
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col items-center justify-start py-8 px-4 md:px-8">
        <div className="w-full max-w-4xl mx-auto text-center">
          {/* Main Title - only show if not already in banner */}
          {!wheel.bannerImage && (wheel.mainTitle || wheel.name) && (
            <div className="mb-6">
              <h1 className="text-2xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
                {wheel.mainTitle || wheel.name}
              </h1>
            </div>
          )}

          {/* Game rules - display prominently above wheel (only if it's actual text, not a URL) */}
          {wheel.gameRules && !wheel.gameRules.startsWith('http') && wheel.gameRules.trim().length > 0 && (
            <div className="mb-6 max-w-2xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <p className="text-base md:text-lg text-white/95 leading-relaxed">
                  {wheel.gameRules}
                </p>
              </div>
            </div>
          )}

          {/* Wheel */}
          <div className="mb-6 flex justify-center">
            <div className="w-full max-w-lg">
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
          </div>

          {/* Action buttons */}
          <div className="space-y-4">
            {showSocialRedirect ? (
              <div className="text-center space-y-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <p className="text-white mb-3">
                    {wheel.redirectText || 'Veuillez effectuer l\'action sociale pour continuer.'}
                  </p>
                  <Button
                    onClick={() => {
                      if (wheel.redirectUrl) {
                        window.open(wheel.redirectUrl, '_blank');
                      }
                      setTimeout(handleSocialComplete, 2000);
                    }}
                    className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500"
                  >
                    Continuer
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={handlePlayWheel}
                disabled={isLoading || mustSpin}
                className="px-8 py-3 text-lg font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-lg"
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

            {/* Debug button - remove after testing */}
            <Button
              onClick={() => {
                console.log('🎯 Manual modal trigger');
                setShowResultModal(true);
              }}
              variant="secondary"
              size="sm"
            >
              Test Modal
            </Button>
          </div>

          {/* Footer text */}
          {wheel.footerText && (
            <div className="mt-8 max-w-2xl mx-auto">
              <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                <p
                  className="text-sm md:text-base text-white/85 leading-relaxed text-center"
                  dangerouslySetInnerHTML={{
                    __html: detectAndLinkPhoneNumbers(wheel.footerText)
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Social redirect is now handled inline above */}

      {/* Result modal */}
      <Dialog open={showResultModal} onOpenChange={setShowResultModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">
              {spinResult?.play.result === 'WIN' ? 'Félicitations ! 🎉' : 'Résultat'}
            </DialogTitle>
            <DialogDescription className="text-center text-lg mt-4">
              {spinResult ? (
                spinResult.play.result === 'WIN'
                  ? `Vous avez gagné : ${winningLabel}`
                  : 'Pas de chance cette fois !'
              ) : (
                'Résultat en cours de traitement...'
              )}
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

            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={handleReplay}
                className="flex-1"
              >
                Rejouer
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowResultModal(false)}
                className="flex-1"
              >
                Fermer
              </Button>
            </div>
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