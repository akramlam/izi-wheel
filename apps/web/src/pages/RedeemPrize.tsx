import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Loader2, CheckCircle, AlertCircle, Home, User, Mail, Phone } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"

// import PrizeDebugger from '../components/PrizeDebugger';

type PrizeDetails = {
  id: string;
  pin: string;
  status: 'PENDING' | 'CLAIMED' | 'REDEEMED';
  prize: {
    label: string;
    description?: string;
  };
  lead: Record<string, string>;
};

const RedeemPrize = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { playId: urlPlayId } = useParams<{ playId: string }>();
  const [pinCode, setPinCode] = useState('');
  const [redemptionStatus, setRedemptionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [effectivePlayId, setEffectivePlayId] = useState<string | undefined>(urlPlayId);
  const [isIdValid, setIsIdValid] = useState<boolean>(false);
  
  // Form data for claiming
  const [claimData, setClaimData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  
  // Validate UUID format
  useEffect(() => {
    let id = urlPlayId;
    
    // If no URL playId, try to get from session storage
    if (!id) {
      id = sessionStorage.getItem('lastPlayId') || undefined;
      if (id) {
        setEffectivePlayId(id);
      }
    }
    
    // Validate UUID format
    if (id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isValid = uuidRegex.test(id);
      setIsIdValid(isValid);
      
      if (!isValid) {
        toast({
          title: "Format invalide",
          description: "L'identifiant du jeu n'est pas dans un format valide.",
          variant: "destructive"
        });
      }
    } else {
      setIsIdValid(false);
    }
  }, [urlPlayId, toast]);

  // Fetch prize details only if we have a valid ID
  const { 
    data: prizeDetails, 
    isLoading, 
    error,
    refetch 
  } = useQuery<PrizeDetails>({
    queryKey: ['prize', effectivePlayId],
    queryFn: async () => {
      try {
        const response = await api.getPrizeDetails(effectivePlayId || '');
        return response.data;
      } catch (err) {
        throw err;
      }
    },
    enabled: !!effectivePlayId && isIdValid,
    retry: 1, // Only retry once to avoid overwhelming with failed requests
  });

  // Claim the prize (first step)
  const { mutate: claimPrize, isPending: isClaiming } = useMutation({
    mutationFn: async () => {
      if (!effectivePlayId || !claimData.name || !claimData.email) {
        throw new Error('Informations manquantes');
      }
      const response = await api.claimPrize(effectivePlayId, claimData);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Succès!",
        description: "Votre lot a été réclamé! Vous allez recevoir un email avec les détails.",
      });
      // Refetch prize details to show updated status
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la réclamation du lot",
        variant: "destructive"
      });
    }
  });

  // Redeem the prize
  const { mutate: redeemPrize, isPending: isRedeeming } = useMutation({
    mutationFn: async () => {
      if (!effectivePlayId || !pinCode) {
        throw new Error('ID de jeu ou code PIN manquant');
      }
      const response = await api.redeemPrize(effectivePlayId, { pin: pinCode });
      return response.data;
    },
    onSuccess: () => {
      setRedemptionStatus('success');
      toast({
        title: "Succès!",
        description: "Votre lot a été récupéré avec succès!",
      });
      // Refetch prize details to show updated status
      refetch();
    },
    onError: (error: any) => {
      setRedemptionStatus('error');
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la récupération du lot",
        variant: "destructive"
      });
    }
  });

  const handleClaimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!claimData.name || !claimData.email) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez remplir au moins le nom et l'email",
        variant: "destructive"
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(claimData.email)) {
      toast({
        title: "Email invalide",
        description: "Veuillez entrer une adresse email valide",
        variant: "destructive"
      });
      return;
    }
    
    claimPrize();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Improved validation for PIN code
    if (!pinCode || pinCode.length < 6) {
      toast({
        title: "Code PIN invalide",
        description: "Veuillez entrer un code PIN à 6 chiffres",
        variant: "destructive"
      });
      return;
    }

    // PIN format validation (check if it contains only digits)
    if (!/^\d+$/.test(pinCode)) {
      toast({
        title: "Format incorrect",
        description: "Le code PIN doit contenir uniquement des chiffres",
        variant: "destructive"
      });
      return;
    }
    
    // Continue with redeeming the prize
    redeemPrize();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-4" />
        <p className="text-lg text-gray-600">Chargement des détails du lot...</p>
      </div>
    );
  }

  // Error state - show friendly error message
  if (error || !isIdValid || !prizeDetails) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Désolé, nous n\'avons pas pu trouver ce lot ou il n\'existe pas.';
    
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="mb-4 h-16 w-16 text-red-500" />
        <h1 className="mb-4 text-2xl font-bold text-red-600">Lot introuvable</h1>
        <p className="mb-6 text-gray-600 max-w-md">
          {!isIdValid 
            ? 'L\'identifiant fourni n\'est pas valide. Veuillez vérifier le lien ou scanner à nouveau le QR code.' 
            : errorMessage
          }
        </p>
        <Button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2"
        >
          <Home size={16} />
          Retour à l'accueil
        </Button>
      </div>
    );
  }

  // Already redeemed prize
  if (prizeDetails.status === 'REDEEMED') {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4 text-center">
        <CheckCircle className="mb-4 h-16 w-16 text-green-500" />
        <h1 className="mb-4 text-2xl font-bold text-green-600">Lot déjà récupéré</h1>
        <p className="mb-6 text-gray-600">
          Ce lot a déjà été récupéré. Chaque lot ne peut être récupéré qu'une seule fois.
        </p>
        <Button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2"
        >
          <Home size={16} />
          Retour à l'accueil
        </Button>
      </div>
    );
  }

  // Main content - pending claim (first step)
  if (prizeDetails.status === 'PENDING') {
    return (
      <div className="container max-w-md mx-auto px-4 py-10">
        <Card className="border-2 border-indigo-100 shadow-lg">
          <CardHeader className="text-center bg-gradient-to-r from-indigo-50 to-pink-50 rounded-t-lg">
            <CardTitle className="text-2xl text-indigo-700">Réclamez votre lot</CardTitle>
            <CardDescription>
              Félicitations! Vous avez gagné: <span className="font-bold text-pink-600">{prizeDetails.prize.label}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {prizeDetails.prize.description && (
              <p className="mb-6 text-gray-600 text-center italic">
                {prizeDetails.prize.description}
              </p>
            )}
            <form onSubmit={handleClaimSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom complet *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Votre nom complet"
                      value={claimData.name}
                      onChange={(e) => setClaimData({...claimData, name: e.target.value})}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={claimData.email}
                      onChange={(e) => setClaimData({...claimData, email: e.target.value})}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone (optionnel)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Votre numéro de téléphone"
                      value={claimData.phone}
                      onChange={(e) => setClaimData({...claimData, phone: e.target.value})}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="pt-2">
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-indigo-500 to-pink-500 hover:opacity-90"
                    disabled={isClaiming || !claimData.name || !claimData.email}
                  >
                    {isClaiming ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Réclamation en cours...
                      </>
                    ) : (
                      "Réclamer le lot"
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col text-xs text-gray-500 text-center">
            <p>Code de lot: {prizeDetails.id}</p>
            <p className="mt-1">Remplissez vos informations pour réclamer votre lot.</p>
          </CardFooter>
        </Card>
        
        {/* <PrizeDebugger playId={effectivePlayId || ''} /> */}
      </div>
    );
  }

  // Main content - claimed, waiting for PIN redemption (second step)
  if (prizeDetails.status === 'CLAIMED') {
    return (
      <div className="container max-w-md mx-auto px-4 py-10">
        <Card className="border-2 border-green-100 shadow-lg">
          <CardHeader className="text-center bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
            <CardTitle className="text-2xl text-green-700">Récupérer votre lot</CardTitle>
            <CardDescription>
              Lot réclamé: <span className="font-bold text-emerald-600">{prizeDetails.prize.label}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 text-center">
                ✅ Votre lot a été réclamé avec succès!<br/>
                Vous devriez avoir reçu un email avec les détails.
              </p>
            </div>
            
            {prizeDetails.prize.description && (
              <p className="mb-6 text-gray-600 text-center italic">
                {prizeDetails.prize.description}
              </p>
            )}
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pin">Entrez votre code PIN</Label>
                  <InputOTP 
                    maxLength={6} 
                    value={pinCode} 
                    onChange={setPinCode}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <div className="pt-2">
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90"
                    disabled={isRedeeming || pinCode.length < 6}
                  >
                    {isRedeeming ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Récupération en cours...
                      </>
                    ) : (
                      "Récupérer le lot"
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col text-xs text-gray-500 text-center">
            <p>Code de lot: {prizeDetails.id}</p>
            <p className="mt-1">Entrez le code PIN reçu par email pour récupérer votre lot.</p>
          </CardFooter>
        </Card>
        
        {/* <PrizeDebugger playId={effectivePlayId || ''} /> */}
      </div>
    );
  }

  // Main content - pending redemption (original code for backward compatibility)
  return (
    <div className="container max-w-md mx-auto px-4 py-10">
      <Card className="border-2 border-indigo-100 shadow-lg">
        <CardHeader className="text-center bg-gradient-to-r from-indigo-50 to-pink-50 rounded-t-lg">
          <CardTitle className="text-2xl text-indigo-700">Récupérer votre lot</CardTitle>
          <CardDescription>
            Félicitations! Vous avez gagné: <span className="font-bold text-pink-600">{prizeDetails.prize.label}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {prizeDetails.prize.description && (
            <p className="mb-6 text-gray-600 text-center italic">
              {prizeDetails.prize.description}
            </p>
          )}
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pin">Entrez votre code PIN</Label>
                <InputOTP 
                  maxLength={6} 
                  value={pinCode} 
                  onChange={setPinCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <div className="pt-2">
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-indigo-500 to-pink-500 hover:opacity-90"
                  disabled={isRedeeming || pinCode.length < 6}
                >
                  {isRedeeming ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Récupération en cours...
                    </>
                  ) : (
                    "Récupérer le lot"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col text-xs text-gray-500 text-center">
          <p>Code de lot: {prizeDetails.id}</p>
          <p className="mt-1">Entrez le code PIN qui vous a été fourni pour récupérer votre lot.</p>
        </CardFooter>
      </Card>
      
      {/* <PrizeDebugger playId={effectivePlayId || ''} /> */}
    </div>
  );
};

export default RedeemPrize; 