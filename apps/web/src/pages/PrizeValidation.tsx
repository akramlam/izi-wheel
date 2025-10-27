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

  const { data: plays, isLoading, refetch } = useQuery<Play[]>({
    queryKey: ['prizeValidation', searchQuery, searchType],
    queryFn: async () => {
      if (!searchQuery) return [];

      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const companyId = localStorage.getItem('companyId');

        const params: { pin?: string; email?: string; companyId?: string } = {};

        if (searchType === 'pin') {
          params.pin = searchQuery;
        } else {
          params.email = searchQuery;
        }

        // Only add companyId for non-SUPER users
        if (user.role !== 'SUPER' && companyId) {
          params.companyId = companyId;
        }

        const response = await api.searchPlays(params);
        return response.data;
      } catch (error: any) {
        toast({
          title: 'Erreur',
          description: error.response?.data?.error || 'Impossible de rechercher les cadeaux',
          variant: 'destructive'
        });
        return [];
      }
    },
    enabled: false // Only execute when explicitly called
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
      // Redirect to the redemption page for this play
      window.location.href = `/redeem/${playId}?admin=true`;
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ouvrir la page de validation',
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

      {/* QR Code Scanner Info */}
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
