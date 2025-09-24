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
import { Loader2, Users } from 'lucide-react';
import { TimedConfetti } from '../components/magicui/timedConfetti';
import Wheel from '../components/wheel/Wheel';
import type { WheelConfig, WheelSpinResult } from '../components/wheel/types';
import PlayerForm, { FormField, PlayerFormData } from '../components/PlayerForm';
import { Input } from '../components/ui/input';
import { detectAndLinkPhoneNumbers } from '../utils/phoneUtils';
import { runWheelAlignmentTests } from '../components/wheel/Wheel.test';
import { applyStableSorting } from '../utils/slot-utils';

// Import refactored components and utilities
import { SocialRedirectDialog } from '../components/play-wheel/SocialRedirectDialog';
import { ErrorDisplay } from '../components/play-wheel/ErrorDisplay';
import { initialState, appReducer } from '../components/play-wheel/state';
import { BRAND, CONFETTI_COLORS, inputIcons } from '../components/play-wheel/constants';
import { resolvePrizeFromResponse, updateSpinResultWithPointer } from '../components/play-wheel/prizeResolution';
import type {
  WheelData,
  PlayResponse,
  AppState,
  AppAction,
  WheelSlot,
  FormSchema
} from '../components/play-wheel/types';

const PlayWheel = () => {
  const { companyId, wheelId } = useParams<{ companyId: string; wheelId: string }>();
  const navigate = useNavigate();

  console.log('[DEBUG] PlayWheel render - Route params:', { companyId, wheelId });
  console.log('[DEBUG] Current URL:', window.location.href);

  // Run alignment math tests in development
  useEffect(() => {
    if (import.meta.env.DEV) {
      runWheelAlignmentTests();
    }
  }, []);

  // Component state using reducer
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Wheel data query
  const { data: wheelData, isLoading, error } = useQuery<{ wheel: WheelData }>({
    queryKey: ['publicWheel', companyId, wheelId],
    queryFn: () => {
      const effectiveCompanyId = companyId && companyId !== 'undefined' ? companyId : 'company';

      console.log(`[DEBUG] Fetching wheel data for companyId: ${effectiveCompanyId}, wheelId: ${wheelId}`);
      return api.getPublicWheel(effectiveCompanyId, wheelId);
    },
    enabled: !!wheelId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      console.error(`Query attempt ${failureCount + 1} failed:`, error);
      return failureCount < 3;
    },
  });

  // Play wheel mutation
  const playWheelMutation = useMutation<PlayResponse, Error, { leadInfo?: any }>({
    mutationFn: async ({ leadInfo }) => {
      const url = companyId && companyId !== 'undefined'
        ? `/public/${companyId}/wheels/${wheelId}/play`
        : `/public/company/wheels/${wheelId}/play`;

      console.log(`[DEBUG] Playing wheel at: ${url}`);
      return api.post(url, { leadInfo });
    },
  });

  // Wheel configuration
  const wheelConfig: WheelConfig | null = wheelData?.wheel ? {
    segments: applyStableSorting(wheelData.wheel.slots).map(slot => ({
      id: slot.id,
      label: slot.label,
      color: slot.color,
      isWinning: slot.isWinning,
      position: slot.position ?? undefined,
    })),
  } : null;

  // Handle spin complete
  const handleSpinComplete = useCallback((result: WheelSpinResult) => {
    const segments = wheelConfig?.segments || [];

    if (!state.spinResult) {
      console.warn('⚠️ No spin result available during wheel completion');
      return;
    }

    console.log('🎯 Wheel spin completed:', {
      wheelResultIndex: result.winningIndex,
      segmentCount: segments.length,
      backendResult: state.spinResult
    });

    // Use the new prize resolution utility to sync with pointer position
    const updatedResult = updateSpinResultWithPointer(
      state.spinResult,
      result.winningIndex,
      segments
    );

    // Update state with synchronized result
    dispatch({ type: 'SET_SPIN_RESULT', payload: updatedResult });
    dispatch({ type: 'SET_PRIZE_INDEX', payload: result.winningIndex });
    dispatch({ type: 'SET_MUST_SPIN', payload: false });
    dispatch({ type: 'SET_SHOW_CONFETTI', payload: true });
    dispatch({ type: 'SET_SHOW_RESULT_MODAL', payload: true });
    dispatch({ type: 'SET_CURRENT_STEP', payload: 'showPrize' });
  }, [wheelConfig?.segments, state.spinResult]);

  // Handle play wheel
  const handlePlayWheel = useCallback(async (leadInfo?: any) => {
    if (!wheelConfig) {
      console.error('❌ Cannot play wheel: wheel config not available');
      return;
    }

    dispatch({ type: 'SET_IS_LOADING', payload: true });

    try {
      console.log('🎯 Starting wheel play...');
      const data = await playWheelMutation.mutateAsync({ leadInfo });

      console.log('🎯 Play wheel response:', data);

      // Resolve prize using the new utility
      const { resolvedPrizeIndex, normalizedResult } = resolvePrizeFromResponse({
        data,
        segments: wheelConfig.segments
      });

      console.log('🎯 Prize resolved:', { resolvedPrizeIndex, result: data.play.result });

      // Set spin result and start wheel animation
      dispatch({ type: 'SET_SPIN_RESULT', payload: normalizedResult });
      dispatch({ type: 'SET_PRIZE_INDEX', payload: resolvedPrizeIndex });
      dispatch({ type: 'SET_MUST_SPIN', payload: true });

    } catch (error) {
      console.error('❌ Play wheel error:', error);

      if (error instanceof Error && error.message.includes('Play limit exceeded')) {
        toast({
          title: 'Limite atteinte',
          description: 'Vous avez atteint la limite de jeu pour cette roue.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erreur',
          description: 'Impossible de jouer à la roue. Veuillez réessayer.',
          variant: 'destructive',
        });
      }
    } finally {
      dispatch({ type: 'SET_IS_LOADING', payload: false });
    }
  }, [wheelConfig, playWheelMutation]);

  // Handle social action completion
  const handleSocialActionComplete = useCallback(() => {
    dispatch({ type: 'SET_HAS_COMPLETED_SOCIAL_ACTION', payload: true });
    dispatch({ type: 'SET_SHOW_SOCIAL_REDIRECT', payload: false });
    dispatch({ type: 'SET_USER_FLOW_STATE', payload: 'completedSocial' });
    dispatch({ type: 'SET_CURRENT_STEP', payload: 'spinWheel' });
  }, []);

  // Handle claim form submission
  const handleClaimFormSubmit = useCallback(async (formData: PlayerFormData) => {
    dispatch({ type: 'SET_CLAIM_FORM_DATA', payload: formData });
    dispatch({ type: 'SET_SHOW_CLAIM_FORM', payload: false });
    dispatch({ type: 'SET_SHOW_THANKYOU_MESSAGE', payload: true });
    dispatch({ type: 'SET_CURRENT_STEP', payload: 'claimForm' });

    // Show success message
    toast({
      title: 'Succès !',
      description: 'Vos informations ont été enregistrées avec succès.',
    });
  }, []);

  // Effect for social redirect
  useEffect(() => {
    if (wheelData?.wheel?.socialNetwork && !state.hasCompletedSocialAction) {
      dispatch({ type: 'SET_SHOW_SOCIAL_REDIRECT', payload: true });
      dispatch({ type: 'SET_CURRENT_STEP', payload: 'social' });
    }
  }, [wheelData?.wheel?.socialNetwork, state.hasCompletedSocialAction]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return <ErrorDisplay error={error} />;
  }

  // No wheel data
  if (!wheelData?.wheel) {
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
  const resolvedWinningLabel = state.spinResult?.resolvedSegment?.label ?? state.spinResult?.slot.label ?? '';

  return (
    <div
      className="min-h-screen w-full relative flex flex-col"
      style={{
        background: wheel.backgroundImage
          ? `url(${wheel.backgroundImage}) center/cover no-repeat`
          : BRAND.backgroundGradient
      }}
    >
      {/* Banner */}
      {wheel.bannerImage && (
        <div className="w-full h-32 md:h-48 bg-gray-200 flex items-center justify-center overflow-hidden">
          <img
            src={wheel.bannerImage}
            alt="Banner"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-4xl mx-auto text-center">
          {/* Title */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-5xl font-bold text-gray-800 mb-4">
              {wheel.mainTitle || wheel.name}
            </h1>

            {/* Game rules */}
            {wheel.gameRules && (
              <div className="max-w-2xl mx-auto">
                <p className="text-lg text-gray-600 leading-relaxed">
                  {wheel.gameRules}
                </p>
                <Button
                  variant="link"
                  onClick={() => dispatch({ type: 'SET_SHOW_RULES_MODAL', payload: true })}
                  className="mt-2 text-indigo-600 hover:text-indigo-800"
                >
                  Voir les règles complètes
                </Button>
              </div>
            )}
          </div>

          {/* Wheel */}
          <div className="mb-8">
            {wheelConfig && (
              <Wheel
                config={wheelConfig}
                mustSpin={state.mustSpin}
                prizeIndex={state.prizeIndex}
                onSpinComplete={handleSpinComplete}
              />
            )}
          </div>

          {/* Action buttons */}
          <div className="space-y-4">
            {state.currentStep === 'spinWheel' && (
              <Button
                onClick={() => handlePlayWheel()}
                disabled={state.isLoading || state.mustSpin}
                className="px-8 py-3 text-lg font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
              >
                {state.isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Chargement...
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
                className="text-sm text-gray-500 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: detectAndLinkPhoneNumbers(wheel.footerText)
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modals and dialogs */}
      <SocialRedirectDialog
        open={state.showSocialRedirect}
        onClose={handleSocialActionComplete}
        network={wheel.socialNetwork}
        redirectUrl={wheel.redirectUrl}
        redirectText={wheel.redirectText}
      />

      {/* Result modal */}
      <Dialog open={state.showResultModal} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">
              {state.spinResult?.play.result === 'WIN' ? 'Félicitations ! 🎉' : 'Pas de chance cette fois !'}
            </DialogTitle>
            <DialogDescription className="text-center text-lg mt-4">
              {state.spinResult?.play.result === 'WIN'
                ? `Vous avez gagné : ${resolvedWinningLabel}`
                : 'Tentez votre chance une autre fois !'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-6">
            {state.spinResult?.play.result === 'WIN' && state.spinResult.play.prize && (
              <div className="text-center space-y-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="font-semibold text-green-800">Votre code PIN :</p>
                  <p className="text-2xl font-mono font-bold text-green-900 mt-2">
                    {state.spinResult.play.prize.pin}
                  </p>
                </div>

                <Button
                  onClick={() => dispatch({ type: 'SET_SHOW_CLAIM_FORM', payload: true })}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500"
                >
                  Réclamer mon prix
                </Button>
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => {
                dispatch({ type: 'RESET_WHEEL_STATE' });
                dispatch({ type: 'SET_SHOW_RESULT_MODAL', payload: false });
              }}
              className="w-full"
            >
              Rejouer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Claim form modal */}
      <Dialog open={state.showClaimForm} onOpenChange={() => dispatch({ type: 'SET_SHOW_CLAIM_FORM', payload: false })}>
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

      {/* Rules modal */}
      <Dialog open={state.showRulesModal} onOpenChange={(open) => dispatch({ type: 'SET_SHOW_RULES_MODAL', payload: open })}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Règles du jeu</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {wheel.gameRules}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confetti */}
      {state.showConfetti && (
        <TimedConfetti
          particleCount={100}
          colors={CONFETTI_COLORS}
          duration={3000}
          onComplete={() => dispatch({ type: 'SET_SHOW_CONFETTI', payload: false })}
        />
      )}

      {/* Debug info in development */}
      {import.meta.env.DEV && (
        <div className="fixed bottom-4 left-4 bg-black bg-opacity-50 text-white p-2 rounded text-xs">
          <div>Step: {state.currentStep}</div>
          <div>Prize Index: {state.prizeIndex}</div>
          <div>Must Spin: {state.mustSpin ? 'Yes' : 'No'}</div>
          <div id="social-debug-info"></div>
        </div>
      )}
    </div>
  );
};

export default PlayWheel;