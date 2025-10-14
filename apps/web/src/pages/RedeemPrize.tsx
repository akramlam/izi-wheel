import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface PlayDetails {
  id: string;
  wheelId: string;
  result: 'WIN' | 'LOSE';
  prize?: {
    label: string;
    description?: string;
  };
  redemptionStatus: 'PENDING' | 'REDEEMED';
  claimedAt?: string;
  redeemedAt?: string;
  leadInfo?: any;
}

export default function RedeemPrize() {
  const { playId } = useParams<{ playId: string }>();
  const { toast } = useToast();

  const [claimData, setClaimData] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: ''
  });

  const [pinCode, setPinCode] = useState('');

  // Fetch play details
  const { data: playDetails, isLoading, error, refetch } = useQuery<PlayDetails>({
    queryKey: ['playDetails', playId],
    queryFn: async () => {
      if (!playId) throw new Error('Play ID is required');
      const response = await api.getPlayDetails(playId);
      return response.data;
    },
    enabled: !!playId,
    retry: 1
  });

  // Claim mutation
  const claimMutation = useMutation({
    mutationFn: async () => {
      if (!playId) throw new Error('Play ID is required');
      const response = await api.claimPrize(playId, claimData);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'Success!',
        description: 'Prize claimed! Check your email for the PIN.',
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to claim prize',
        variant: 'destructive'
      });
    }
  });

  // Redeem mutation
  const redeemMutation = useMutation({
    mutationFn: async () => {
      if (!playId || !pinCode) throw new Error('Play ID and PIN are required');
      const response = await api.redeemPrize(playId, pinCode);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'Success!',
        description: 'Prize redeemed successfully!',
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to redeem prize',
        variant: 'destructive'
      });
    }
  });

  const handleClaimSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!claimData.name || !claimData.email) {
      toast({
        title: 'Missing information',
        description: 'Please provide at least name and email',
        variant: 'destructive'
      });
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(claimData.email)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address',
        variant: 'destructive'
      });
      return;
    }

    claimMutation.mutate();
  };

  const handleRedeemSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!pinCode || pinCode.length !== 8) {
      toast({
        title: 'Invalid PIN',
        description: 'Please enter an 8-digit PIN',
        variant: 'destructive'
      });
      return;
    }

    if (!/^\d{8}$/.test(pinCode)) {
      toast({
        title: 'Invalid format',
        description: 'PIN must contain only digits',
        variant: 'destructive'
      });
      return;
    }

    redeemMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !playDetails) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="mb-4 h-16 w-16 text-red-500 mx-auto" />
          <h1 className="mb-4 text-2xl font-bold text-red-600">Prize Not Found</h1>
          <p className="text-gray-600 mb-6">
            Unable to find this prize or it may not exist.
          </p>
        </div>
      </div>
    );
  }

  // State 1: Prize not claimed yet
  if (playDetails.result === 'WIN' && !playDetails.claimedAt) {
    return (
      <div className="container max-w-md mx-auto px-4 py-10">
        <Card className="border-2 border-indigo-100 shadow-lg">
          <CardHeader className="text-center bg-gradient-to-r from-indigo-50 to-pink-50">
            <CardTitle className="text-2xl text-indigo-700">Reclamez votre Cadeau</CardTitle>
            <CardDescription>
              Felicitation! Vous avez gagnez : <span className="font-bold text-pink-600">{playDetails.prize?.label}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {playDetails.prize?.description && (
              <p className="mb-6 text-gray-600 text-center italic">
                {playDetails.prize.description}
              </p>
            )}

            <form onSubmit={handleClaimSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom complet *</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Votre Nom complet"
                    value={claimData.name}
                    onChange={(e) => setClaimData({ ...claimData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    value={claimData.email}
                    onChange={(e) => setClaimData({ ...claimData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Numero (optionnel)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Votre numero de telephone"
                    value={claimData.phone}
                    onChange={(e) => setClaimData({ ...claimData, phone: e.target.value })}
                  />
                </div>


                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-indigo-500 to-pink-500"
                  disabled={claimMutation.isPending}
                >
                  {claimMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Retrait en cours...
                    </>
                  ) : (
                    'Reclamez votre cadeau'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // State 2: Prize claimed, waiting for redemption
  if (playDetails.result === 'WIN' && playDetails.claimedAt && playDetails.redemptionStatus === 'PENDING') {
    return (
      <div className="container max-w-md mx-auto px-4 py-10">
        <Card className="border-2 border-green-100 shadow-lg">
          <CardHeader className="text-center bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="text-2xl text-green-700">🎉 Prize Claimed!</CardTitle>
            <CardDescription>
              Your prize: <span className="font-bold text-emerald-600">{playDetails.prize?.label}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 text-center font-medium">
                ✅ Your prize has been claimed successfully!
              </p>
              <p className="text-sm text-green-700 text-center mt-2">
                You should have received an email with your PIN.
              </p>
            </div>

            {playDetails.prize?.description && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 text-center italic">
                  {playDetails.prize.description}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h3 className="font-medium text-amber-800 mb-2 text-center">📍 How to redeem:</h3>
                <ol className="text-sm text-amber-700 space-y-1">
                  <li>1. Visit the store</li>
                  <li>2. Show this screen or your email</li>
                  <li>3. Give your PIN to the merchant</li>
                  <li>4. Enjoy your prize! 🎉</li>
                </ol>
              </div>

              <form onSubmit={handleRedeemSubmit}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pin">Enter PIN to Redeem (8 digits)</Label>
                    <Input
                      id="pin"
                      type="text"
                      inputMode="numeric"
                      maxLength={8}
                      value={pinCode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                        setPinCode(value);
                      }}
                      placeholder="12345678"
                      className="text-center text-lg font-mono tracking-wider"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500"
                    disabled={redeemMutation.isPending || pinCode.length !== 8}
                  >
                    {redeemMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Redeeming...
                      </>
                    ) : (
                      'Redeem Prize'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // State 3: Prize redeemed
  if (playDetails.redemptionStatus === 'REDEEMED') {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="text-center">
          <CheckCircle className="mb-4 h-16 w-16 text-green-500 mx-auto" />
          <h1 className="mb-4 text-2xl font-bold text-green-600">Prize Redeemed!</h1>
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg max-w-md">
            <p className="text-green-800 font-medium">{playDetails.prize?.label}</p>
            {playDetails.redeemedAt && (
              <p className="text-green-700 text-sm mt-2">
                Redeemed on: {new Date(playDetails.redeemedAt).toLocaleDateString()}
              </p>
            )}
          </div>
          <p className="text-gray-600 mb-6">
            This prize has already been redeemed.
          </p>
          <Button onClick={() => window.location.href = `/play/${playDetails.wheelId}`}>
            Retour à la roue
          </Button>
        </div>
      </div>
    );
  }

  // State 4: Not a winning play
  return (
    <div className="flex h-screen items-center justify-center p-4">
      <div className="text-center">
        <AlertCircle className="mb-4 h-16 w-16 text-gray-400 mx-auto" />
        <h1 className="mb-4 text-2xl font-bold text-gray-700">No Prize</h1>
        <p className="text-gray-600 mb-6">
          This play did not result in a prize.
        </p>
        <Button onClick={() => window.location.href = `/play/${playDetails.wheelId}`}>
          Retour à la roue
        </Button>
      </div>
    </div>
  );
}
