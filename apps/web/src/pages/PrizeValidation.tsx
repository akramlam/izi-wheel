import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Loader2, Search, CheckCircle, Clock, XCircle, QrCode } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface Play {
  id: string;
  result: 'WIN' | 'LOSE';
  createdAt: string;
  claimedAt?: string;
  redeemedAt?: string;
  redemptionStatus: 'PENDING' | 'REDEEMED';
  pin?: string;
  slot: {
    label: string;
    description?: string;
  };
  wheel: {
    name: string;
  };
  leadInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export default function PrizeValidation() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'pin' | 'email'>('pin');

  // Note: This is a placeholder. You'll need to implement the backend endpoint
  // GET /api/plays/search?pin=XXX or ?email=XXX
  const { data: plays, isLoading, refetch } = useQuery<Play[]>({
    queryKey: ['prizeValidation', searchQuery, searchType],
    queryFn: async () => {
      if (!searchQuery) return [];

      // TODO: Implement backend search endpoint
      // For now, returning empty array
      // const response = await api.searchPlays(searchQuery, searchType);
      // return response.data;

      toast({
        title: 'Not implemented',
        description: 'Prize search endpoint needs to be implemented in the backend',
        variant: 'destructive'
      });
      return [];
    },
    enabled: false // Disabled until backend is ready
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast({
        title: 'Recherche vide',
        description: 'Veuillez entrer un code PIN ou un email',
        variant: 'destructive'
      });
      return;
    }
    refetch();
  };

  const handleValidate = async (playId: string) => {
    try {
      // This would use the existing redeem endpoint
      toast({
        title: 'Validation en cours',
        description: 'Cette fonctionnalité nécessite le code PIN du client'
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de valider le cadeau',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Validation des Cadeaux</h1>
        <p className="text-gray-600">
          Recherchez et validez les cadeaux gagnés par vos clients
        </p>
      </div>

      {/* Search Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Rechercher un Cadeau</CardTitle>
          <CardDescription>
            Recherchez par code PIN ou email du client
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="flex gap-2">
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value as 'pin' | 'email')}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="pin">Code PIN</option>
                  <option value="email">Email</option>
                </select>
                <Input
                  type={searchType === 'pin' ? 'text' : 'email'}
                  placeholder={searchType === 'pin' ? 'Entrez le code PIN (8 chiffres)' : 'Entrez l\'email du client'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  maxLength={searchType === 'pin' ? 8 : undefined}
                />
              </div>
            </div>
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recherche...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Rechercher
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card - Backend Not Implemented */}
      <Card className="mb-6 border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">
                Fonctionnalité en développement
              </h3>
              <p className="mt-2 text-sm text-amber-700">
                Cette page nécessite l'implémentation d'endpoints backend supplémentaires :
              </p>
              <ul className="mt-2 text-sm text-amber-700 list-disc list-inside">
                <li>GET /api/plays/search - Pour rechercher les cadeaux</li>
                <li>Backend devra filtrer par PIN ou email</li>
                <li>Intégrer avec le système de validation existant</li>
              </ul>
              <p className="mt-2 text-sm text-amber-700">
                En attendant, utilisez le lien direct de récupération : <code className="bg-amber-100 px-1 py-0.5 rounded">/redeem/:playId?admin=true</code>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alternative: QR Code Scanner Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <QrCode className="mr-2 h-5 w-5" />
            Validation par QR Code
          </CardTitle>
          <CardDescription>
            Méthode recommandée pour les commerçants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Pour valider un cadeau, demandez au client de :
            </p>
            <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
              <li>Présenter le QR code reçu par email</li>
              <li>Scanner le QR code avec votre smartphone</li>
              <li>Cela ouvrira automatiquement la page de validation</li>
              <li>Vérifier le code PIN du client</li>
              <li>Cliquer sur "Valider la récupération du cadeau"</li>
            </ol>

            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-800 mb-2">
                💡 Astuce
              </p>
              <p className="text-sm text-blue-700">
                Le lien de validation contient déjà toutes les informations nécessaires.
                Vous n'avez qu'à scanner le QR code du client et suivre les instructions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {plays && plays.length > 0 && (
        <div className="mt-6 space-y-4">
          <h2 className="text-xl font-semibold">Résultats de la recherche</h2>
          {plays.map((play) => (
            <Card key={play.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">{play.slot.label}</h3>
                    <p className="text-sm text-gray-600">{play.wheel.name}</p>
                    {play.leadInfo && (
                      <div className="text-sm">
                        <p><strong>Client:</strong> {play.leadInfo.name}</p>
                        <p><strong>Email:</strong> {play.leadInfo.email}</p>
                        {play.leadInfo.phone && <p><strong>Téléphone:</strong> {play.leadInfo.phone}</p>}
                      </div>
                    )}
                    {play.pin && (
                      <p className="text-sm">
                        <strong>Code PIN:</strong> <span className="font-mono">{play.pin}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {play.redemptionStatus === 'REDEEMED' ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="h-5 w-5 mr-1" />
                        <span className="text-sm">Validé</span>
                      </div>
                    ) : play.claimedAt ? (
                      <Button onClick={() => handleValidate(play.id)}>
                        Valider
                      </Button>
                    ) : (
                      <div className="flex items-center text-amber-600">
                        <Clock className="h-5 w-5 mr-1" />
                        <span className="text-sm">Non réclamé</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
