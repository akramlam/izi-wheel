import { useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import Wheel from '../components/wheel/Wheel';
import { sortSlots } from '../utils/slotSorter';
import type { WheelConfig, WheelSpinResult } from '../components/wheel/types';

interface Slot {
  id: string;
  label: string;
  color: string;
  position: number;
  description?: string;
}

interface WheelData {
  id: string;
  name: string;
  mode: string;
  playLimit: string;
  mainTitle?: string;
  gameRules?: string;
  footerText?: string;
  bannerImage?: string;
  backgroundImage?: string;
  formSchema?: any;
  socialNetwork?: string;
  redirectUrl?: string;
  redirectText?: string;
}

interface SpinResult {
  play: {
    id: string;
    result: 'WIN' | 'LOSE';
    prize?: {
      pin: string;
      qrCodeData: string;
    };
  };
  slot: {
    id: string;
    label: string;
  };
  prizeIndex: number;
}

export default function PlayWheel() {
  const { wheelId } = useParams<{ wheelId: string }>();
  const { toast } = useToast();

  const [isSpinning, setIsSpinning] = useState(false);
  const [prizeIndex, setPrizeIndex] = useState(0);
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [pendingResult, setPendingResult] = useState<SpinResult | null>(null);

  // Fetch wheel data
  const { data: wheelResponse, isLoading, error } = useQuery({
    queryKey: ['publicWheel', wheelId],
    queryFn: async () => {
      if (!wheelId) throw new Error('Wheel ID is required');
      const response = await api.getPublicWheel(wheelId);
      return response.data;
    },
    enabled: !!wheelId,
    retry: 2
  });

  // Spin mutation
  const spinMutation = useMutation({
    mutationFn: async () => {
      if (!wheelId) throw new Error('Wheel ID is required');
      const response = await api.spinWheel(wheelId);
      return response.data;
    },
    onSuccess: (data: SpinResult) => {
      console.log('🎯 Spin result received:', data);

      // Store the result but don't show modal yet
      setPendingResult(data);
      setSpinResult(data);
      setPrizeIndex(data.prizeIndex);

      // Start spinning animation
      setIsSpinning(true);
    },
    onError: (error: any) => {
      console.error('Spin error:', error);

      const errorMessage = error.response?.data?.error || 'Failed to spin wheel';

      if (error.response?.status === 429) {
        toast({
          title: 'Play limit reached',
          description: error.response.data.error || 'Please try again later',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        });
      }
    }
  });

  // Handle spin complete - memoized to prevent recreation
  const handleSpinComplete = useCallback((_result: WheelSpinResult) => {
    console.log('🎯 Spin animation complete');

    // Stop spinning state
    setIsSpinning(false);

    // Show modal after a small delay to ensure smooth transition
    setTimeout(() => {
      if (pendingResult || spinResult) {
        setShowResultModal(true);
      }
    }, 300);
  }, [pendingResult, spinResult]);

  // Handle play button click
  const handlePlay = () => {
    if (isSpinning || spinMutation.isPending) return;

    // Reset states
    setShowResultModal(false);
    setPendingResult(null);

    // Initiate spin
    spinMutation.mutate();
  };

  // Handle close result modal
  const handleCloseModal = () => {
    setShowResultModal(false);
    setSpinResult(null);
    setPendingResult(null);
  };

  // Extract wheel data early for useMemo - hooks must be called in same order every render
  const wheel = wheelResponse?.wheel as WheelData | undefined;
  const slots = (wheelResponse?.slots || []) as Slot[];

  // Compute sorted slots - CRITICAL: must match backend sorting exactly
  const sortedSlots = useMemo(() => {
    if (!slots || slots.length === 0) return [];

    // Use the same sorting algorithm as backend
    const sorted = sortSlots(slots);

    console.log('🎯 Frontend sorted slots:', sorted.map((s, idx) => ({
      index: idx,
      id: s.id,
      label: s.label,
      position: s.position
    })));

    return sorted;
  }, [slots]);

  // Now handle loading, error, and validation states
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-700">Unable to load wheel. Please try again.</p>
        </div>
      </div>
    );
  }

  // Validation
  if (!wheelResponse || !wheel || !sortedSlots.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Wheel not found</h2>
          <p className="text-gray-600">This wheel does not exist or is no longer available.</p>
        </div>
      </div>
    );
  }

  // Build wheel config
  const wheelConfig: WheelConfig = {
    segments: sortedSlots.map((slot) => ({
      id: slot.id,
      label: slot.label,
      color: slot.color || '#FF6384',
      position: slot.position
    })),
    spinDurationMin: 3,
    spinDurationMax: 6,
    sounds: {
      tick: true,
      win: true
    },
    hapticFeedback: true
  };

  const backgroundStyle = wheel.backgroundImage
    ? {
        background: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${wheel.backgroundImage}) center/cover no-repeat`,
        backgroundAttachment: 'fixed'
      }
    : {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      };

  return (
    <div className="min-h-screen w-full relative" style={backgroundStyle}>
      {/* Banner */}
      {(wheel.bannerImage || wheel.mainTitle) && (
        <div className="w-full h-24 md:h-32 bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-sm flex items-center justify-center">
          {wheel.bannerImage ? (
            <img
              src={wheel.bannerImage}
              alt="Banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <h1 className="text-2xl md:text-4xl font-bold text-white">
              {wheel.mainTitle || wheel.name}
            </h1>
          )}
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col items-center justify-start py-8 px-4 md:px-8">
        <div className="w-full max-w-4xl mx-auto text-center">
          {/* Title if no banner */}
          {!wheel.bannerImage && (wheel.mainTitle || wheel.name) && (
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-6 drop-shadow-lg">
              {wheel.mainTitle || wheel.name}
            </h1>
          )}

          {/* Game rules */}
          {wheel.gameRules && !wheel.gameRules.startsWith('http') && (
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
              <Wheel
                config={wheelConfig}
                isSpinning={isSpinning}
                prizeIndex={prizeIndex}
                onSpin={() => {}} // Empty handler, we control spinning state
                onSpinComplete={handleSpinComplete}
              />
            </div>
          </div>

          {/* Play button */}
          <div className="space-y-4">
            <Button
              onClick={handlePlay}
              disabled={isSpinning || spinMutation.isPending}
              className="px-8 py-3 text-lg font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-lg"
            >
              {isSpinning || spinMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {isSpinning ? 'Spinning...' : 'Loading...'}
                </>
              ) : (
                'Spin the Wheel'
              )}
            </Button>
          </div>

          {/* Footer text */}
          {wheel.footerText && (
            <div className="mt-8 max-w-2xl mx-auto">
              <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                <p className="text-sm md:text-base text-white/85 leading-relaxed">
                  {wheel.footerText}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Result Modal */}
      {showResultModal && spinResult && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-center mb-4">
              {spinResult.play.result === 'WIN' ? '🎉 Congratulations!' : '😊 Better Luck Next Time!'}
            </h2>

            <p className="text-center text-lg mb-6">
              {spinResult.play.result === 'WIN'
                ? `You won: ${spinResult.slot.label}!`
                : 'Thanks for playing!'}
            </p>

            {spinResult.play.result === 'WIN' && spinResult.play.prize && (
              <div className="space-y-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-800 mb-2">Your PIN Code:</p>
                  <p className="text-2xl font-mono font-bold text-green-900 text-center">
                    {spinResult.play.prize.pin}
                  </p>
                </div>

                {spinResult.play.prize.qrCodeData && (
                  <div className="flex justify-center">
                    <img
                      src={spinResult.play.prize.qrCodeData}
                      alt="QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                )}

                <p className="text-sm text-gray-600 text-center">
                  Save this PIN or scan the QR code to redeem your prize!
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleCloseModal}
                variant="outline"
                className="flex-1"
              >
                Close
              </Button>
              {spinResult.play.result === 'WIN' && (
                <Button
                  onClick={() => {
                    window.open(`/redeem/${spinResult.play.id}`, '_blank');
                  }}
                  className="flex-1"
                >
                  Redeem Now
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
