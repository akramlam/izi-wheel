import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from '../hooks/use-toast';

type PrizeDetails = {
  id: string;
  pin: string;
  status: 'PENDING' | 'REDEEMED';
  prize: {
    label: string;
    description?: string;
  };
  lead: Record<string, string>;
};

const RedeemPrize = () => {
  const { playId } = useParams<{ playId: string }>();
  const [pinCode, setPinCode] = useState('');
  const [redemptionStatus, setRedemptionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Fetch prize details
  const { 
    data: prizeDetails, 
    isLoading, 
    error,
    refetch 
  } = useQuery<PrizeDetails>({
    queryKey: ['prize', playId],
    queryFn: async () => {
      const response = await api.getPrizeDetails(playId || '');
      return response.data;
    },
    enabled: !!playId,
  });

  // Redeem prize mutation
  const { mutate: redeemPrize, isPending: isRedeeming } = useMutation({
    mutationFn: async () => {
      const response = await api.redeemPrize(playId || '', { pin: pinCode });
      return response.data;
    },
    onSuccess: () => {
      setRedemptionStatus('success');
      toast({
        title: 'Lot récupéré !',
        description: 'Votre lot a été récupéré avec succès.',
        variant: 'default',
      });
      refetch(); // Refresh prize details to show updated status
    },
    onError: (error) => {
      setRedemptionStatus('error');
      toast({
        title: 'Échec de la récupération',
        description: 'Le code PIN que vous avez saisi est incorrect ou le lot a déjà été récupéré.',
        variant: 'destructive',
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    redeemPrize();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <span className="ml-2 text-lg">Chargement des détails du lot...</span>
      </div>
    );
  }

  if (error || !prizeDetails) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="mb-4 h-16 w-16 text-red-500" />
        <h1 className="mb-4 text-2xl font-bold text-red-600">Lot introuvable</h1>
        <p className="mb-6 text-gray-600">
          Désolé, nous n'avons pas pu trouver ce lot ou il n'existe pas.
        </p>
        <Button onClick={() => window.location.href = '/'}>
          Retour à l'accueil
        </Button>
      </div>
    );
  }

  const isAlreadyRedeemed = prizeDetails.status === 'REDEEMED';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-indigo-50 to-white p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Récupération de lot</CardTitle>
          <CardDescription>
            {isAlreadyRedeemed 
              ? 'Ce lot a déjà été récupéré' 
              : 'Entrez votre code PIN pour récupérer votre lot'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Prize Information */}
          <div className="rounded-lg bg-indigo-50 p-4 text-center">
            <h3 className="mb-1 text-lg font-medium text-gray-700">Votre lot</h3>
            <p className="text-2xl font-bold text-indigo-600">{prizeDetails.prize.label}</p>
            {prizeDetails.prize.description && (
              <p className="mt-2 text-sm text-gray-600">{prizeDetails.prize.description}</p>
            )}
          </div>

          {/* Lead Information */}
          <div>
            <h3 className="mb-2 font-medium text-gray-700">Vos informations</h3>
            <div className="space-y-1 rounded-md border border-gray-200 bg-white p-3 text-sm">
              {Object.entries(prizeDetails.lead).map(([key, value]) => (
                <div key={key} className="grid grid-cols-3 gap-2">
                  <span className="font-medium text-gray-500">{key.charAt(0).toUpperCase() + key.slice(1)}:</span>
                  <span className="col-span-2 text-gray-800">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Redemption Status */}
          {isAlreadyRedeemed ? (
            <div className="flex flex-col items-center justify-center rounded-md bg-green-50 p-6 text-center">
              <CheckCircle className="mb-2 h-12 w-12 text-green-500" />
              <h3 className="text-xl font-medium text-green-600">Lot déjà récupéré</h3>
              <p className="mt-2 text-gray-600">Ce lot a été récupéré avec succès.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pin">Code PIN</Label>
                <Input
                  id="pin"
                  type="text"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  placeholder="Entrez votre code PIN"
                  required
                  className="text-center text-xl tracking-wider"
                  maxLength={6}
                />
              </div>
              
              <Button 
                type="submit"
                className="w-full"
                disabled={isRedeeming || !pinCode.trim()}
              >
                {isRedeeming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Récupération en cours...
                  </>
                ) : (
                  'Récupérer le lot'
                )}
              </Button>
            </form>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-center">
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/'}
            className="mt-2"
          >
            Retour à l'accueil
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default RedeemPrize; 