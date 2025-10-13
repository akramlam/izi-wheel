"use client";

import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { Wheel } from 'react-custom-roulette';

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
  mainTitle?: string;
  gameRules?: string;
  footerText?: string;
  bannerImage?: string;
  backgroundImage?: string;
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

  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [hasSocialVerified, setHasSocialVerified] = useState(false);

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

      setSpinResult(data);
      setPrizeNumber(data.prizeIndex); // Set the winning index
      setMustSpin(true); // Start the spin animation
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

  // Handle spin complete
  const handleStopSpinning = () => {
    setMustSpin(false);
    setShowResultModal(true);
  };

  // Handle play button click
  const handlePlay = () => {
    if (mustSpin || spinMutation.isPending) return;

    // Check if social media verification is required
    if (wheel?.socialNetwork && wheel?.redirectUrl && !hasSocialVerified) {
      setShowSocialModal(true);
      return;
    }

    // Reset states
    setShowResultModal(false);

    // Initiate spin
    spinMutation.mutate();
  };

  // Handle social media redirect
  const handleSocialRedirect = () => {
    if (wheel?.redirectUrl) {
      window.open(wheel.redirectUrl, '_blank');
      setHasSocialVerified(true);
      setShowSocialModal(false);
    }
  };

  // Handle close result modal
  const handleCloseModal = () => {
    setShowResultModal(false);
    setSpinResult(null);
  };

  const wheel = wheelResponse?.wheel as WheelData | undefined;
  const slots = (wheelResponse?.slots || []) as Slot[];

  // Convert slots to wheel data format
  const wheelData = useMemo(() => {
    return slots.map(slot => ({
      option: slot.label,
      style: {
        backgroundColor: slot.color || '#FF6384',
        textColor: '#ffffff'
      }
    }));
  }, [slots]);

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

  if (!wheelResponse || !wheel || !slots.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Wheel not found</h2>
          <p className="text-gray-600">This wheel does not exist or is no longer available.</p>
        </div>
      </div>
    );
  }

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
          <div className="mb-6 flex justify-center items-center">
            <div className="flex justify-center items-center" style={{ width: '500px', height: '500px' }}>
              {wheelData.length > 0 && (
                <Wheel
                  mustStartSpinning={mustSpin}
                  prizeNumber={prizeNumber}
                  data={wheelData}
                  onStopSpinning={handleStopSpinning}
                  backgroundColors={['#3e3e3e', '#df3428']}
                  textColors={['#ffffff']}
                  fontSize={16}
                  outerBorderColor="#f2f2f2"
                  outerBorderWidth={10}
                  innerBorderColor="#f2f2f2"
                  innerBorderWidth={0}
                  innerRadius={0}
                  radiusLineColor="#f2f2f2"
                  radiusLineWidth={1}
                  perpendicularText={false}
                  textDistance={60}
                />
              )}
            </div>
          </div>

          {/* Play button */}
          <div className="space-y-4">
            <Button
              onClick={handlePlay}
              disabled={mustSpin || spinMutation.isPending}
              className="px-8 py-3 text-lg font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-lg"
            >
              {mustSpin || spinMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {mustSpin ? 'Spinning...' : 'Loading...'}
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

      {/* Social Media Verification Modal */}
      {showSocialModal && wheel?.socialNetwork && wheel?.redirectUrl && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn"
          onClick={() => setShowSocialModal(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-center mb-4">
              📱 Follow Us First!
            </h2>

            <p className="text-center text-gray-700 mb-6">
              {wheel.redirectText || `To spin the wheel, please follow us on ${wheel.socialNetwork} first!`}
            </p>

            <div className="flex gap-2">
              <Button
                onClick={() => setShowSocialModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSocialRedirect}
                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
              >
                Follow on {wheel.socialNetwork}
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              After following, come back and click "Spin the Wheel" again!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
