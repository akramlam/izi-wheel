import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import  Badge  from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Mail, 
  Send, 
  AlertCircle, 
  CheckCircle,
  Clock, 
  BarChart3,
  Filter,
  Search,
  RefreshCw
} from 'lucide-react';
import { api } from '../lib/api';

interface EmailLog {
  id: string;
  type: 'INVITATION' | 'PRIZE_NOTIFICATION' | 'PASSWORD_RESET' | 'WELCOME' | 'NOTIFICATION';
  recipient: string;
  subject: string;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'BOUNCED' | 'DELIVERED';
  messageId?: string;
  errorMessage?: string;
  sentAt?: string;
  createdAt: string;
  metadata?: any;
  // Relations
  company?: { name: string };
  user?: { name: string; email: string };
  play?: { 
    id: string; 
    slot: { label: string };
    wheel: { name: string };
  };
}

interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  byType: {
    INVITATION: number;
    PRIZE_NOTIFICATION: number;
    PASSWORD_RESET: number;
    WELCOME: number;
    NOTIFICATION: number;
  };
}

const EmailTracking: React.FC = () => {
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const fetchEmailData = async () => {
    try {
      setLoading(true);
      const response = await api.getEmailDashboard();
      
      if (response.data.success) {
        setStats(response.data.data.statistics);
        setLogs(response.data.data.recentLogs);
      }
    } catch (error) {
      console.error('Failed to fetch email data:', error);
      // For now, set mock data since the backend isn't fully implemented
      setStats({
        total: 0,
        sent: 0,
        failed: 0,
        pending: 0,
        byType: {
          INVITATION: 0,
          PRIZE_NOTIFICATION: 0,
          PASSWORD_RESET: 0,
          WELCOME: 0,
          NOTIFICATION: 0
        }
      });
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmailData();
  }, []);

  const getStatusBadge = (status: string) => {
    const variants = {
      SENT: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      PENDING: { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' },
      FAILED: { variant: 'destructive' as const, icon: AlertCircle, color: 'text-red-600' },
      BOUNCED: { variant: 'destructive' as const, icon: AlertCircle, color: 'text-red-600' },
      DELIVERED: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' }
    };

    const config = variants[status as keyof typeof variants] || variants.PENDING;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {status}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      INVITATION: 'bg-blue-100 text-blue-800',
      PRIZE_NOTIFICATION: 'bg-green-100 text-green-800',
      PASSWORD_RESET: 'bg-orange-100 text-orange-800',
      WELCOME: 'bg-purple-100 text-purple-800',
      NOTIFICATION: 'bg-gray-100 text-gray-800'
    };

    return (
      <Badge className={colors[type as keyof typeof colors] || colors.NOTIFICATION}>
        {type.replace('_', ' ')}
      </Badge>
    );
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || log.type === filterType;
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement des données email...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Traçabilité des E-mails</h1>
          <p className="text-gray-600">Suivez tous les e-mails envoyés par votre système</p>
        </div>
        <Button onClick={fetchEmailData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Envoyés</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Réussis</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.sent || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Échoués</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.failed || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Attente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.pending || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Email Types Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Répartition par Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats?.byType.INVITATION || 0}</div>
              <div className="text-sm text-gray-600">Invitations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats?.byType.PRIZE_NOTIFICATION || 0}</div>
              <div className="text-sm text-gray-600">Prix</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats?.byType.PASSWORD_RESET || 0}</div>
              <div className="text-sm text-gray-600">Mot de passe</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats?.byType.WELCOME || 0}</div>
              <div className="text-sm text-gray-600">Bienvenue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{stats?.byType.NOTIFICATION || 0}</div>
              <div className="text-sm text-gray-600">Notifications</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher par email ou sujet..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les types</option>
              <option value="INVITATION">Invitations</option>
              <option value="PRIZE_NOTIFICATION">Prix</option>
              <option value="PASSWORD_RESET">Mot de passe</option>
              <option value="WELCOME">Bienvenue</option>
              <option value="NOTIFICATION">Notifications</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="SENT">Envoyé</option>
              <option value="PENDING">En attente</option>
              <option value="FAILED">Échoué</option>
              <option value="BOUNCED">Rejeté</option>
              <option value="DELIVERED">Livré</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Email Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des E-mails ({filteredLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Aucun e-mail trouvé pour les filtres sélectionnés</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Destinataire</th>
                    <th className="text-left py-3 px-4">Sujet</th>
                    <th className="text-left py-3 px-4">Type</th>
                    <th className="text-left py-3 px-4">Statut</th>
                    <th className="text-left py-3 px-4">Message ID</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm">
                        {formatDate(log.sentAt || log.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{log.recipient}</div>
                          {log.user && (
                            <div className="text-sm text-gray-600">{log.user.name}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="max-w-xs truncate" title={log.subject}>
                          {log.subject}
                        </div>
                        {log.play && (
                          <div className="text-sm text-gray-600">
                            {log.play.wheel.name} - {log.play.slot.label}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {getTypeBadge(log.type)}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(log.status)}
                        {log.errorMessage && (
                          <div className="text-xs text-red-600 mt-1 max-w-xs truncate" title={log.errorMessage}>
                            {log.errorMessage}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm font-mono">
                        {log.messageId ? (
                          <span className="text-gray-600">{log.messageId.substring(0, 20)}...</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailTracking; 