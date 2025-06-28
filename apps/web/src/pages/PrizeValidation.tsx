import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  QrCode,
  Gift,
  CheckCircle2,
  Clock,
  Award,
  User,
  Mail,
  Phone,
  ShieldCheck,
  Store,
  Search,
  Loader2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { api } from '../lib/api';

interface PrizeRecord {
  id: string;
  pin: string;
  status: 'PENDING' | 'CLAIMED' | 'REDEEMED';
  prize: {
    label: string;
    description?: string;
  };
  lead: {
    name?: string;
    email?: string;
    phone?: string;
  };
  createdAt: string;
  claimedAt?: string;
  redeemedAt?: string;
  wheel: {
    name: string;
  };
}

const PrizeValidation: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [qrInput, setQrInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [validatingPrizeId, setValidatingPrizeId] = useState<string | null>(null);

  // Fetch prizes data
  const { data: prizesData, isLoading, refetch } = useQuery({
    queryKey: ['prizes', searchTerm, selectedStatus],
    queryFn: async () => {
      // This would be a new API endpoint to fetch prizes
      // For now, we'll use the activity tracking data
      const response = await api.getActivityDashboard();
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const extractPlayIdFromInput = (input: string): string | null => {
    // If input is already a UUID (play ID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(input.trim())) {
      return input.trim();
    }

    // Extract play ID from URL
    const urlMatch = input.match(/\/redeem\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    if (urlMatch) {
      return urlMatch[1];
    }

    return null;
  };

  const handleQRScan = async () => {
    const playId = extractPlayIdFromInput(qrInput);
    
    if (!playId) {
      toast({
        title: "Format invalide",
        description: "Veuillez saisir un ID de cadeau valide ou une URL QR complète",
        variant: "destructive"
      });
      return;
    }

    // Redirect to prize validation page with admin mode
    navigate(`/redeem/${playId}?admin=true`);
  };

  // Validate prize mutation
  const validatePrizeMutation = useMutation({
    mutationFn: async ({ playId, pin }: { playId: string; pin: string }) => {
      const response = await api.redeemPrize(playId, { pin });
      return response.data;
    },
    onSuccess: (data, variables) => {
      toast({
        title: "✅ Cadeau validé!",
        description: "Le cadeau a été marqué comme récupéré avec succès.",
      });
      setValidatingPrizeId(null);
      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ['prizes'] });
      refetch();
    },
    onError: (error: any, variables) => {
      toast({
        title: "Erreur de validation",
        description: error.message || "Erreur lors de la validation du cadeau",
        variant: "destructive"
      });
      setValidatingPrizeId(null);
    }
  });

  const handleValidatePrize = async (prize: PrizeRecord) => {
    if (!prize.pin) {
      toast({
        title: "Erreur",
        description: "Code PIN manquant pour ce cadeau",
        variant: "destructive"
      });
      return;
    }

    setValidatingPrizeId(prize.id);
    validatePrizeMutation.mutate({ playId: prize.id, pin: prize.pin });
  };

  const getPrizeStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, label: 'En attente' },
      CLAIMED: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle2, label: 'Réclamé' },
      REDEEMED: { color: 'bg-green-100 text-green-800 border-green-200', icon: Award, label: 'Échangé' }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;

    const Icon = config.icon;
    return (
      <Badge className={`${config.color} border`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter prizes based on search and status
  const filteredPrizes = prizesData?.recentPlays?.filter((play: any) => {
    if (play.result !== 'WIN') return false;
    
    const matchesSearch = !searchTerm || 
      play.slot.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      play.leadInfo?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      play.leadInfo?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || play.redemptionStatus === selectedStatus;
    
    return matchesSearch && matchesStatus;
  }) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Validation des Cadeaux</h1>
          <p className="text-gray-600 mt-1">Gérez et validez les cadeaux gagnés par vos clients</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* QR Code Scanner Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <QrCode className="w-5 h-5 mr-2" />
            Scanner QR Code Cadeau
          </CardTitle>
          <CardDescription>
            Scannez ou saisissez le code d'un cadeau pour le valider rapidement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="qr-input">Code du cadeau ou URL QR</Label>
              <Input
                id="qr-input"
                placeholder="Saisissez l'ID du cadeau ou collez l'URL du QR code"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleQRScan}
                disabled={!qrInput.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Valider
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 Astuce : Vous pouvez scanner directement le QR code avec votre appareil photo et copier l'URL ici
          </p>
        </CardContent>
      </Card>

      {/* Filters Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="search">Rechercher</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Rechercher par nom, email ou cadeau..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Statut</Label>
              <select
                id="status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="PENDING">En attente</option>
                <option value="CLAIMED">Réclamé</option>
                <option value="REDEEMED">Échangé</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cadeaux Réclamés</p>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredPrizes.filter((p: any) => p.redemptionStatus === 'CLAIMED').length}
                </p>
              </div>
              <Gift className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cadeaux Échangés</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredPrizes.filter((p: any) => p.redemptionStatus === 'REDEEMED').length}
                </p>
              </div>
              <Award className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En Attente</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {filteredPrizes.filter((p: any) => p.redemptionStatus === 'PENDING').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Prizes List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Gift className="w-5 h-5 mr-2" />
            Liste des Cadeaux ({filteredPrizes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredPrizes.length === 0 ? (
            <div className="text-center py-8">
              <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Aucun cadeau trouvé</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPrizes.map((play: any) => (
                <div key={play.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getPrizeStatusBadge(play.redemptionStatus)}
                        <span className="text-xs text-gray-500">
                          {formatDate(play.createdAt)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h3 className="font-medium text-gray-900">{play.slot.label}</h3>
                          <p className="text-sm text-gray-600">Roue: {play.wheel.name}</p>
                        </div>
                        
                        {play.leadInfo && (
                          <div className="space-y-1">
                            {play.leadInfo.name && (
                              <p className="text-sm flex items-center">
                                <User className="w-3 h-3 mr-1 text-gray-400" />
                                {play.leadInfo.name}
                              </p>
                            )}
                            {play.leadInfo.email && (
                              <p className="text-sm flex items-center">
                                <Mail className="w-3 h-3 mr-1 text-gray-400" />
                                {play.leadInfo.email}
                              </p>
                            )}
                            {play.leadInfo.phone && (
                              <p className="text-sm flex items-center">
                                <Phone className="w-3 h-3 mr-1 text-gray-400" />
                                {play.leadInfo.phone}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {play.redemptionStatus === 'CLAIMED' && (
                        <Button
                          onClick={() => handleValidatePrize(play)}
                          disabled={validatingPrizeId === play.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {validatingPrizeId === play.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Validation...
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-4 h-4 mr-2" />
                              Valider
                            </>
                          )}
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/redeem/${play.id}?admin=true`)}
                      >
                        <Store className="w-4 h-4 mr-1" />
                        Détails
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PrizeValidation; 