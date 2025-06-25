import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import  Badge  from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../components/ui/pagination';
import { 
  Activity,
  Users,
  TrendingUp,
  Download,
  Search,
  RefreshCw,
  Award,
  Target,
  Clock,
  User,
  Trophy,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { api } from '../lib/api';

interface PlayRecord {
  id: string;
  result: 'WIN' | 'LOSE';
  redemptionStatus: 'PENDING' | 'CLAIMED' | 'REDEEMED';
  createdAt: string;
  claimedAt?: string;
  redeemedAt?: string;
  pin?: string;
  ip?: string;
  wheel: {
    name: string;
    company: string;
  };
  slot: {
    label: string;
    prizeCode?: string;
    color: string;
    isWinning: boolean;
  };
  leadInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

interface PlayStatistics {
  total: number;
  wins: number;
  losses: number;
  claimed: number;
  redeemed: number;
  winRate: number;
}

interface DashboardData {
  overview: {
    totalPlays: number;
    totalWins: number;
    totalClaimed: number;
    totalRedeemed: number;
    todayPlays: number;
    winRate: number;
    claimRate: number;
    redeemRate: number;
  };
  recentPlays: PlayRecord[];
  topWheels: Array<{
    id: string;
    name: string;
    totalPlays: number;
    wins: number;
    winRate: number;
  }>;
}

const ActivityTracking: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [plays, setPlays] = useState<PlayRecord[]>([]);
  const [statistics, setStatistics] = useState<PlayStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'plays' | 'export'>('dashboard');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [resultFilter, setResultFilter] = useState<'ALL' | 'WIN' | 'LOSE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'CLAIMED' | 'REDEEMED'>('ALL');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 20; // Reduced from 50 for better pagination

  // Export settings
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('csv');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  const fetchDashboardData = async () => {
    try {
      const response = await api.getActivityDashboard();
      if (response.data.success) {
        setDashboardData(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  const fetchPlays = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: ((page - 1) * itemsPerPage).toString()
      });

      if (searchTerm) params.append('search', searchTerm);
      if (resultFilter !== 'ALL') params.append('result', resultFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const response = await api.getActivityPlays(params.toString());
      if (response.data.success) {
        const newPlays = response.data.data.plays;
        setPlays(newPlays);
        setStatistics(response.data.data.statistics);
        
        // Use pagination info from API response
        const pagination = response.data.data.pagination;
        setTotalItems(pagination.total);
        setTotalPages(pagination.totalPages);
        setCurrentPage(pagination.currentPage);
      }
    } catch (error) {
      console.error('Failed to fetch plays:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        format: exportFormat
      });

      if (exportStartDate) params.append('startDate', exportStartDate);
      if (exportEndDate) params.append('endDate', exportEndDate);

      const response = await api.getActivityExport(params.toString(), {
        responseType: exportFormat === 'csv' ? 'blob' : 'json'
      });

      if (exportFormat === 'csv') {
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `play-data-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `play-data-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };

  const refreshData = () => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
    } else if (activeTab === 'plays') {
      fetchPlays(1);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
    } else if (activeTab === 'plays') {
      fetchPlays(1);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'plays') {
      const timeoutId = setTimeout(() => {
        fetchPlays(1);
        setCurrentPage(1);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, resultFilter, statusFilter]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getResultBadge = (result: 'WIN' | 'LOSE') => {
    return result === 'WIN' ? (
      <Badge className="bg-green-100 text-green-800 border-green-200">
        <Trophy className="w-3 h-3 mr-1" />
        Gagné
      </Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800 border-gray-200">
        <XCircle className="w-3 h-3 mr-1" />
        Perdu
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, label: 'En attente' },
      CLAIMED: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle2, label: 'Réclamé' },
      REDEEMED: { color: 'bg-green-100 text-green-800 border-green-200', icon: Award, label: 'Échangé' }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;

    const Icon = config.icon;
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Parties</p>
                <p className="text-2xl font-bold">{dashboardData?.overview.totalPlays || 0}</p>
                <p className="text-xs text-gray-500">Aujourd'hui: {dashboardData?.overview.todayPlays || 0}</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Prix Gagnés</p>
                <p className="text-2xl font-bold">{dashboardData?.overview.totalWins || 0}</p>
                <p className="text-xs text-gray-500">Taux: {dashboardData?.overview.winRate || 0}%</p>
              </div>
              <Trophy className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Prix Réclamés</p>
                <p className="text-2xl font-bold">{dashboardData?.overview.totalClaimed || 0}</p>
                <p className="text-xs text-gray-500">Taux: {dashboardData?.overview.claimRate || 0}%</p>
              </div>
              <User className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Prix Échangés</p>
                <p className="text-2xl font-bold">{dashboardData?.overview.totalRedeemed || 0}</p>
                <p className="text-xs text-gray-500">Taux: {dashboardData?.overview.redeemRate || 0}%</p>
              </div>
              <Award className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Parties Récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData?.recentPlays.slice(0, 5).map((play) => (
                <div key={play.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      {getResultBadge(play.result)}
                      {getStatusBadge(play.redemptionStatus)}
                    </div>
                    <p className="text-sm font-medium">{play.wheel.name}</p>
                    <p className="text-xs text-gray-500">{play.slot.label}</p>
                    {play.leadInfo?.name && (
                      <p className="text-xs text-gray-600">{play.leadInfo.name} • {play.leadInfo.email}</p>
                    )}
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    {formatDate(play.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Roues Populaires
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData?.topWheels.map((wheel) => (
                <div key={wheel.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{wheel.name}</p>
                    <p className="text-xs text-gray-500">{wheel.totalPlays} parties • {wheel.wins} gains</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">{wheel.winRate}%</p>
                    <p className="text-xs text-gray-500">Taux de gain</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderPlays = () => (
    <div className="space-y-6">
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{statistics.total}</p>
              <p className="text-sm text-gray-600">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{statistics.wins}</p>
              <p className="text-sm text-gray-600">Gains</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-600">{statistics.losses}</p>
              <p className="text-sm text-gray-600">Pertes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{statistics.claimed}</p>
              <p className="text-sm text-gray-600">Réclamés</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{statistics.redeemed}</p>
              <p className="text-sm text-gray-600">Échangés</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Rechercher (nom, email, PIN)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tous les résultats</option>
              <option value="WIN">Gains seulement</option>
              <option value="LOSE">Pertes seulement</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="PENDING">En attente</option>
              <option value="CLAIMED">Réclamés</option>
              <option value="REDEEMED">Échangés</option>
            </select>

            <Button onClick={refreshData} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Historique des Parties
            </span>
            <Badge variant="default" className="bg-blue-500 text-white">{statistics?.total || 0} parties</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Date</th>
                  <th className="text-left py-3 px-4 font-medium">Joueur</th>
                  <th className="text-left py-3 px-4 font-medium">Roue</th>
                  <th className="text-left py-3 px-4 font-medium">Résultat</th>
                  <th className="text-left py-3 px-4 font-medium">Prix</th>
                  <th className="text-left py-3 px-4 font-medium">Statut</th>
                  <th className="text-left py-3 px-4 font-medium">PIN</th>
                  <th className="text-left py-3 px-4 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {plays.map((play) => (
                  <tr key={play.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm">
                      {formatDate(play.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      {play.leadInfo?.name ? (
                        <div>
                          <div className="font-medium text-sm">{play.leadInfo.name}</div>
                          <div className="text-xs text-gray-600">{play.leadInfo.email}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Non renseigné</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-sm">{play.wheel.name}</div>
                        <div className="text-xs text-gray-600">{play.wheel.company}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {getResultBadge(play.result)}
                    </td>
                    <td className="py-3 px-4">
                      {play.result === 'WIN' ? (
                        <div>
                          <div className="font-medium text-sm">{play.slot.label}</div>
                          {play.slot.prizeCode && (
                            <div className="text-xs text-gray-600">Code: {play.slot.prizeCode}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(play.redemptionStatus)}
                      {play.claimedAt && (
                        <div className="text-xs text-gray-500 mt-1">
                          Réclamé: {formatDate(play.claimedAt)}
                        </div>
                      )}
                      {play.redeemedAt && (
                        <div className="text-xs text-gray-500 mt-1">
                          Échangé: {formatDate(play.redeemedAt)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm font-mono">
                      {play.pin || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {play.ip || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) {
                          fetchPlays(currentPage - 1);
                        }
                      }}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {/* Show first page */}
                  {currentPage > 3 && (
                    <>
                      <PaginationItem>
                        <PaginationLink 
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            fetchPlays(1);
                          }}
                          className="cursor-pointer"
                        >
                          1
                        </PaginationLink>
                      </PaginationItem>
                      {currentPage > 4 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}
                    </>
                  )}
                  
                  {/* Show pages around current page */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageStart = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                    const pageNum = pageStart + i;
                    
                    if (pageNum > totalPages) return null;
                    
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            fetchPlays(pageNum);
                          }}
                          isActive={pageNum === currentPage}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  {/* Show last page */}
                  {currentPage < totalPages - 2 && (
                    <>
                      {currentPage < totalPages - 3 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}
                      <PaginationItem>
                        <PaginationLink 
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            fetchPlays(totalPages);
                          }}
                          className="cursor-pointer"
                        >
                          {totalPages}
                        </PaginationLink>
                      </PaginationItem>
                    </>
                  )}
                  
                  <PaginationItem>
                    <PaginationNext 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) {
                          fetchPlays(currentPage + 1);
                        }
                      }}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
          
          {/* Show pagination info */}
          {totalItems > 0 && (
            <div className="mt-4 text-center text-sm text-gray-600">
              Affichage de {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, totalItems)} sur {totalItems} résultats
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderExport = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Download className="w-5 h-5 mr-2" />
            Exporter les Données
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Format d'export</label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="csv">CSV (Excel)</option>
                <option value="json">JSON</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Date de début</label>
              <Input
                type="date"
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Date de fin</label>
              <Input
                type="date"
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-4">
            <Button onClick={handleExport} className="w-full md:w-auto">
              <Download className="w-4 h-4 mr-2" />
              Exporter les Données
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Données incluses dans l'export :</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• ID de la partie et date</li>
              <li>• Informations de l'entreprise et de la roue</li>
              <li>• Résultat de la partie (gain/perte)</li>
              <li>• Détails du prix et code PIN</li>
              <li>• Statut de réclamation et d'échange</li>
              <li>• Informations du joueur (nom, email)</li>
              <li>• Adresse IP et horodatage</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (loading && !dashboardData && !plays.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Traçabilité & Activité</h1>
          <p className="text-gray-600">Suivi complet des parties et activités utilisateurs</p>
        </div>
        <Button onClick={refreshData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'dashboard'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Activity className="w-4 h-4 inline mr-2" />
            Tableau de Bord
          </button>
          <button
            onClick={() => setActiveTab('plays')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'plays'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Historique des Parties
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'export'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Download className="w-4 h-4 inline mr-2" />
            Export de Données
          </button>
        </nav>
      </div>

      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'plays' && renderPlays()}
      {activeTab === 'export' && renderExport()}
    </div>
  );
};

export default ActivityTracking;