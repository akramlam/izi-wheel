import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ConfirmationDialog } from '../components/ui/confirmation-dialog';
import { toast } from '../hooks/use-toast';
import { api } from '../lib/api';
import { Plus, ArrowLeft, UserPlus, Trash2, Mail, User, Shield, Calendar } from 'lucide-react';
import Badge from '../components/ui/Badge';

interface CompanyUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SUB';
  isActive: boolean;
  createdAt: string;
}

interface Company {
  id: string;
  name: string;
  plan: string;
  maxWheels: number;
  isActive: boolean;
}

const CompanyAdminManager: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'ADMIN' as 'ADMIN' | 'SUB'
  });

  useEffect(() => {
    if (companyId) {
      fetchCompanyData();
      fetchUsers();
    }
  }, [companyId]);

  const fetchCompanyData = async () => {
    try {
      const response = await api.getCompany(companyId!);
      setCompany(response.data.company);
    } catch (error) {
      console.error('Error fetching company:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de récupérer les informations de l\'entreprise'
      });
    }
  };

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await api.getCompanyUsers(companyId!);
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de récupérer la liste des administrateurs'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteForm.email || !inviteForm.role) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs obligatoires'
      });
      return;
    }

    try {
      setIsInviting(true);
      await api.createUser({
        companyId,
        ...inviteForm
      });
      
      toast({
        title: 'Succès',
        description: 'Invitation envoyée avec succès'
      });
      
      setInviteForm({ name: '', email: '', role: 'ADMIN' });
      fetchUsers();
    } catch (error: any) {
      console.error('Error inviting user:', error);
      const errorMessage = error.response?.data?.error || 'Impossible d\'envoyer l\'invitation';
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: errorMessage
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${userName}" ?`)) {
      return;
    }

    try {
      await api.deleteUser(userId);
      toast({
        title: 'Succès',
        description: 'Utilisateur supprimé avec succès'
      });
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de supprimer l\'utilisateur'
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'info';
      case 'SUB':
        return 'default';
      default:
        return 'default';
    }
  };

  if (isLoading && !company) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-t-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          onClick={() => navigate('/entreprises')}
          className="flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Gestion des administrateurs
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {company ? `Entreprise: ${company.name}` : 'Chargement...'}
          </p>
        </div>
      </div>

      {/* Company Info Card */}
      {company && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Informations de l'entreprise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Nom</Label>
                <p className="text-lg font-semibold">{company.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Plan</Label>
                <p className="text-lg">{company.plan}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Max Roues</Label>
                <p className="text-lg">{company.maxWheels}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Statut</Label>
                <Badge variant={company.isActive ? 'success' : 'error'}>
                  {company.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite User Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserPlus className="h-5 w-5 mr-2" />
            Inviter un administrateur
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInviteUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="name">Nom (optionnel)</Label>
                <Input
                  id="name"
                  type="text"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nom de l'administrateur"
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="admin@example.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="role">Rôle *</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(value: 'ADMIN' | 'SUB') => setInviteForm(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrateur</SelectItem>
                    <SelectItem value="SUB">Sous-administrateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={isInviting} className="bg-purple-600 hover:bg-purple-700">
              {isInviting ? 'Envoi en cours...' : 'Envoyer l\'invitation'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Administrateurs ({users.length})
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Aucun administrateur trouvé</p>
              <p className="text-sm text-gray-400 mt-2">
                Utilisez le formulaire ci-dessus pour inviter des administrateurs
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {user.name || 'Nom non défini'}
                      </h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Mail className="h-4 w-4" />
                        <span>{user.email}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        <span>Créé le {new Date(user.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role === 'ADMIN' ? 'Administrateur' : 'Sous-administrateur'}
                    </Badge>
                    <Badge variant={user.isActive ? 'success' : 'error'}>
                      {user.isActive ? 'Actif' : 'Inactif'}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id, user.name || user.email)}
                      className="text-red-600 border-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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

export default CompanyAdminManager; 