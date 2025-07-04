import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Loader2, CheckCircle, AlertCircle, Home, User, Mail, Phone, ShieldCheck, Store, RefreshCw } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth';

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
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { playId: urlPlayId } = useParams<{ playId: string }>();
  const [pinCode, setPinCode] = useState('');
  const [redemptionStatus, setRedemptionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [effectivePlayId, setEffectivePlayId] = useState<string | undefined>(urlPlayId);
  const [isIdValid, setIsIdValid] = useState<boolean>(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  // Check if this is admin validation mode
  const isAdminMode = searchParams.get('admin') === 'true' || (user && ['ADMIN', 'SUB', 'SUPER'].includes(user.role));
  
  // Form data for claiming
  const [claimData, setClaimData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  
  // Validate UUID format and add debugging
  useEffect(() => {
    let id = urlPlayId;
    
    // Add debug information
    const debugLines = [
      `URL Play ID: ${id || 'not provided'}`,
      `Current URL: ${window.location.href}`,
      `Admin mode: ${isAdminMode}`,
      `User role: ${user?.role || 'not authenticated'}`
    ];
    
    // If no URL playId, try to get from session storage
    if (!id) {
      id = sessionStorage.getItem('lastPlayId') || undefined;
      if (id) {
        setEffectivePlayId(id);
        debugLines.push(`Using session storage Play ID: ${id}`);
      } else {
        debugLines.push('No Play ID in session storage');
      }
    }
    
    // Validate UUID format
    if (id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isValid = uuidRegex.test(id);
      setIsIdValid(isValid);
      
      debugLines.push(`UUID format valid: ${isValid}`);
      
      if (!isValid) {
        toast({
          title: "Format invalide",
          description: "L'identifiant du jeu n'est pas dans un format valide.",
          variant: "destructive"
        });
      }
    } else {
      setIsIdValid(false);
      debugLines.push('No valid Play ID found');
    }
    
    setDebugInfo(debugLines.join('\n'));
  }, [urlPlayId, toast, isAdminMode, user]);

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

  // Validate the prize for restaurant admin
  const { mutate: validatePrizeForAdmin, isPending: isValidating } = useMutation({
    mutationFn: async () => {
      if (!effectivePlayId) {
        throw new Error('ID de jeu manquant');
      }
      
      // For admin validation, we use the redeem endpoint with the stored PIN
      if (!prizeDetails?.pin) {
        throw new Error('Code PIN manquant pour la validation');
      }
      
      const response = await api.redeemPrize(effectivePlayId, { pin: prizeDetails.pin });
      return response.data;
    },
    onSuccess: () => {
      setRedemptionStatus('success');
      toast({
        title: "✅ Cadeau validé!",
        description: "Le cadeau a été marqué comme récupéré avec succès.",
      });
      // Refetch prize details to show updated status
      refetch();
    },
    onError: (error: any) => {
      setRedemptionStatus('error');
      toast({
        title: "Erreur de validation",
        description: error.message || "Erreur lors de la validation du cadeau",
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
    
    // Updated validation for PIN code - now supports 6-10 digits
    if (!pinCode || pinCode.length < 6 || pinCode.length > 10) {
      toast({
        title: "Code PIN invalide",
        description: "Veuillez entrer un code PIN de 6 à 10 chiffres",
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
        
        {/* Debug Information */}
        <details className="mb-6 max-w-lg">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
            Informations de débogage (cliquez pour afficher)
          </summary>
          <div className="mt-2 p-3 bg-gray-100 rounded text-xs text-left font-mono whitespace-pre-wrap">
            {debugInfo}
            {error && (
              <>
                {'\n\nErreur détaillée:'}
                {'\n'}{error instanceof Error ? error.message : String(error)}
                {error instanceof Error && error.stack && (
                  <>
                    {'\n\nStack trace:'}
                    {'\n'}{error.stack}
                  </>
                )}
              </>
            )}
          </div>
        </details>
        
        <div className="space-y-2">
          <Button 
            onClick={() => navigate(isAdminMode ? '/prizes' : '/')}
            className="flex items-center gap-2"
          >
            <Home size={16} />
            {isAdminMode ? 'Retour à la validation' : 'Retour à l\'accueil'}
          </Button>
          
          {isAdminMode && (
            <Button 
              variant="outline"
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 ml-2"
            >
              <RefreshCw size={16} />
              Recharger la page
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Admin validation interface
  if (isAdminMode && prizeDetails) {
    // Already redeemed prize - admin view
    if (prizeDetails.status === 'REDEEMED') {
      return (
        <div className="flex h-screen flex-col items-center justify-center p-4 text-center">
          <CheckCircle className="mb-4 h-16 w-16 text-green-500" />
          <h1 className="mb-4 text-2xl font-bold text-green-600">Cadeau déjà récupéré</h1>
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg max-w-md">
            <p className="text-green-800 font-medium">{prizeDetails.prize.label}</p>
            {prizeDetails.lead?.name && (
              <p className="text-green-700 text-sm mt-2">
                Client: {prizeDetails.lead.name}
                {prizeDetails.lead.email && ` (${prizeDetails.lead.email})`}
              </p>
            )}
          </div>
          <p className="mb-6 text-gray-600">
            Ce cadeau a déjà été validé et récupéré.
          </p>
          <Button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <Home size={16} />
            Retour au dashboard
          </Button>
        </div>
      );
    }

    // Prize ready for validation - admin view
    if (prizeDetails.status === 'CLAIMED') {
      return (
        <div className="container max-w-md mx-auto px-4 py-10">
          <Card className="border-2 border-blue-100 shadow-lg">
            <CardHeader className="text-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
              <div className="flex justify-center mb-2">
                <Store className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl text-blue-700">Validation Restaurateur</CardTitle>
              <CardDescription>
                Cadeau à valider: <span className="font-bold text-indigo-600">{prizeDetails.prize.label}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {prizeDetails.prize.description && (
                <p className="mb-4 text-gray-600 text-center italic">
                  {prizeDetails.prize.description}
                </p>
              )}
              
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-2">Informations client :</h3>
                {prizeDetails.lead?.name && (
                  <p className="text-blue-700 text-sm">
                    <User className="inline w-4 h-4 mr-1" />
                    {prizeDetails.lead.name}
                  </p>
                )}
                {prizeDetails.lead?.email && (
                  <p className="text-blue-700 text-sm">
                    <Mail className="inline w-4 h-4 mr-1" />
                    {prizeDetails.lead.email}
                  </p>
                )}
                {prizeDetails.lead?.phone && (
                  <p className="text-blue-700 text-sm">
                    <Phone className="inline w-4 h-4 mr-1" />
                    {prizeDetails.lead.phone}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 text-center">
                    ⚠️ Vérifiez que le client présente bien ce QR code avant de valider
                  </p>
                </div>
                
                <Button 
                  onClick={() => validatePrizeForAdmin()}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90"
                  disabled={isValidating}
                  size="lg"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Validation en cours...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="mr-2 h-5 w-5" />
                      Valider la récupération du cadeau
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col text-xs text-gray-500 text-center">
              <p>Code de lot: {prizeDetails.id}</p>
              <p className="mt-1">Interface de validation pour les restaurateurs</p>
            </CardFooter>
          </Card>
        </div>
      );
    }

    // Prize not yet claimed - admin view
    if (prizeDetails.status === 'PENDING') {
      return (
        <div className="flex h-screen flex-col items-center justify-center p-4 text-center">
          <AlertCircle className="mb-4 h-16 w-16 text-orange-500" />
          <h1 className="mb-4 text-2xl font-bold text-orange-600">Cadeau non réclamé</h1>
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg max-w-md">
            <p className="text-orange-800 font-medium">{prizeDetails.prize.label}</p>
          </div>
          <p className="mb-6 text-gray-600">
            Ce cadeau n'a pas encore été réclamé par le client. Le client doit d'abord remplir ses informations.
          </p>
          <Button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <Home size={16} />
            Retour au dashboard
          </Button>
        </div>
      );
    }
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
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      placeholder="Votre numéro de téléphone"
                      value={claimData.phone}
                      onChange={(e) => {
                        // Only allow digits and limit to 10 characters
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setClaimData({...claimData, phone: value});
                      }}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-gray-500">Maximum 10 chiffres</p>
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

  // Main content - claimed, waiting for redemption (user view)
  if (prizeDetails.status === 'CLAIMED') {
    return (
      <div className="container max-w-md mx-auto px-4 py-10">
        <Card className="border-2 border-green-100 shadow-lg">
          <CardHeader className="text-center bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
            <CardTitle className="text-2xl text-green-700">🎉 Prix réclamé !</CardTitle>
            <CardDescription>
              Votre lot: <span className="font-bold text-emerald-600">{prizeDetails.prize.label}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 text-center font-medium">
                ✅ Votre lot a été réclamé avec succès!
              </p>
              <p className="text-sm text-green-700 text-center mt-2">
                Vous avez reçu un email avec votre code PIN.
              </p>
            </div>
            
            {prizeDetails.prize.description && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 text-center italic">
                  {prizeDetails.prize.description}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h3 className="font-medium text-amber-800 mb-2 text-center">📍 Comment récupérer votre prix :</h3>
                <ol className="text-sm text-amber-700 space-y-1">
                  <li>1. Rendez-vous au point de vente</li>
                  <li>2. Montrez cet écran ou votre email</li>
                  <li>3. Donnez votre code PIN au commerçant</li>
                  <li>4. Profitez de votre prix ! 🎉</li>
                </ol>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-600 text-center">
                  <strong>Code de référence:</strong> {prizeDetails.id}
                </p>
                <p className="text-xs text-gray-500 text-center mt-1">
                  Statut: En attente de récupération
                </p>
              </div>

              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Actualiser le statut
              </Button>
            </div>
          </CardContent>
          <CardFooter className="text-xs text-gray-500 text-center">
            <p>Gardez cette page ou votre email pour récupérer votre prix.</p>
          </CardFooter>
        </Card>
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
                <Label htmlFor="pin">Entrez votre code PIN (6-10 chiffres)</Label>
                <Input
                  id="pin"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  minLength={6}
                  value={pinCode}
                  onChange={(e) => {
                    // Only allow digits and limit to 10 characters
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setPinCode(value);
                  }}
                  placeholder="Entrez votre code PIN"
                  className="text-center text-lg font-mono tracking-wider"
                />
                <p className="text-xs text-gray-500 text-center">
                  Le code PIN contient entre 6 et 10 chiffres
                </p>
              </div>
              <div className="pt-2">
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-indigo-500 to-pink-500 hover:opacity-90"
                  disabled={isRedeeming || pinCode.length < 6 || pinCode.length > 10}
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