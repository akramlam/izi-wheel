import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth';
import { Plus, Pencil, Trash2, Check, X, RefreshCw } from 'lucide-react';
import { DeleteConfirmationDialog } from '../components/ui/confirmation-dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { PasswordInput } from '../components/ui/password-input';
import Badge from '../components/ui/Badge';
import { 
  Users, 
  Edit, 
  Key, 
  UserPlus,
  AlertTriangle,
  Mail,
  User
} from 'lucide-react';

type SubAdmin = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  role: string;
  createdAt: string;
};

type Company = {
  id: string;
  name: string;
  isActive: boolean;
};

const SubAdminManager = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    subAdminId: string | null;
    subAdminName: string;
  }>({
    isOpen: false,
    subAdminId: null,
    subAdminName: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    isActive: true,
    role: 'SUB',
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      
      // First, make sure we have a valid companyId
      let companyId = user?.companyId || '';
      
      // If not available or we're SUPER admin, try to get it from API
      if (!companyId || user?.role === 'SUPER') {
        try {
          const validationResponse = await api.getValidCompanyId();
          companyId = validationResponse.data.companyId;
          setCompanyName(validationResponse.data.companyName || '');
          setSelectedCompanyId(companyId);
          
          // For SUPER users, fetch all companies
          if (user?.role === 'SUPER') {
            const companiesResponse = await api.getAllCompanies();
            if (companiesResponse.data && companiesResponse.data.companies) {
              setCompanies(companiesResponse.data.companies);
            }
          }
          
          // Update in localStorage for future use
          localStorage.setItem('companyId', companyId);
        } catch (error) {
          console.error('Error validating company ID:', error);
          toast({
            variant: 'destructive',
            title: 'Erreur',
            description: 'Impossible de valider l\'ID d\'entreprise. Veuillez vous reconnecter.',
          });
          return;
        }
      } else {
        setSelectedCompanyId(companyId);
      }
      
      if (!companyId) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Aucun ID d\'entreprise trouvé. Veuillez vous reconnecter.',
        });
        return;
      }
      
      await fetchSubAdmins(companyId);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubAdmins = async (companyId = selectedCompanyId) => {
    try {
      if (!companyId) return;
      
      const response = await api.getCompanyUsers(companyId);
      
      // Get company name if we don't have it yet or it has changed
      if (companyId !== 'demo-company-id') {
        try {
          const companyResponse = await api.getCompany(companyId);
          if (companyResponse.data && companyResponse.data.company) {
            if (selectedCompanyId === companyId) {
              setCompanyName(companyResponse.data.company.name);
            }
          }
        } catch (error) {
          console.error('Error fetching company details:', error);
        }
      }
      
      // Filter only SUB role users
      const subAdminUsers = response.data.users.filter(
        (user: any) => user.role === 'SUB'
      );
      setSubAdmins(subAdminUsers);
    } catch (error) {
      console.error('Error fetching sub-admins:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Échec du chargement des sous-administrateurs. Veuillez réessayer.',
      });
    }
  };

  // Handle company change
  const handleCompanyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCompanyId = e.target.value;
    setSelectedCompanyId(newCompanyId);
    
    // When company changes, update the list of sub-admins
    if (newCompanyId) {
      await fetchSubAdmins(newCompanyId);
      
      // Update company name from companies list
      const selectedCompany = companies.find(company => company.id === newCompanyId);
      if (selectedCompany) {
        setCompanyName(selectedCompany.name);
      }
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  const handleCreateSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!selectedCompanyId) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Veuillez sélectionner une entreprise.',
        });
        return;
      }

      await api.createUser({
        companyId: selectedCompanyId,
        name: formData.name,
        email: formData.email,
        isActive: formData.isActive,
        role: 'SUB',
      });
      
      toast({
        title: 'Succès',
        description: 'Sous-administrateur créé avec succès. Un email avec les identifiants a été envoyé.',
      });
      
      setIsCreating(false);
      setFormData({
        name: '',
        email: '',
        isActive: true,
        role: 'SUB',
      });
      fetchSubAdmins();
    } catch (error) {
      console.error('Error creating sub-admin:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Échec de la création du sous-administrateur',
      });
    }
  };

  const handleUpdateSubAdmin = async (subAdminId: string) => {
    try {
      await api.updateUser(subAdminId, {
        name: formData.name,
        email: formData.email,
        isActive: formData.isActive,
      });
      
      toast({
        title: 'Succès',
        description: 'Sous-administrateur mis à jour avec succès',
      });
      
      setIsUpdating(null);
      setFormData({
        name: '',
        email: '',
        isActive: true,
        role: 'SUB',
      });
      fetchSubAdmins();
    } catch (error) {
      console.error('Error updating sub-admin:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Échec de la mise à jour du sous-administrateur',
      });
    }
  };

  const handleResetPassword = async (subAdminId: string) => {
    try {
      if (!newPassword || newPassword.length < 8) {
        toast({
          variant: 'destructive',
          title: 'Erreur de validation',
          description: 'Le mot de passe doit comporter au moins 8 caractères',
        });
        return;
      }

      console.log(`Attempting to reset password for user: ${subAdminId}`);
      await api.resetUserPassword(subAdminId, {
        password: newPassword,
      });
      
      toast({
        title: 'Succès',
        description: 'Mot de passe réinitialisé avec succès',
      });
      
      setResetPassword(null);
      setNewPassword('');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Échec de la réinitialisation du mot de passe';
      
      if (error.response?.status === 404) {
        errorMessage = 'Utilisateur non trouvé';
      } else if (error.response?.status === 403) {
        errorMessage = 'Accès refusé - permissions insuffisantes';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || 'Données invalides';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: errorMessage,
      });
    }
  };

  const openDeleteConfirmation = (subAdminId: string, subAdminName: string) => {
    setDeleteConfirmation({
      isOpen: true,
      subAdminId,
      subAdminName,
    });
  };

  const closeDeleteConfirmation = () => {
    setDeleteConfirmation({
      isOpen: false,
      subAdminId: null,
      subAdminName: '',
    });
  };

  const handleDeleteSubAdmin = async () => {
    if (!deleteConfirmation.subAdminId) return;
    
    setIsDeleting(true);
    try {
      await api.deleteUser(deleteConfirmation.subAdminId);
      
      toast({
        title: 'Succès',
        description: 'Sous-administrateur supprimé avec succès',
      });
      
      fetchSubAdmins();
      closeDeleteConfirmation();
    } catch (error) {
      console.error('Error deleting sub-admin:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Échec de la suppression du sous-administrateur',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const startEditing = (subAdmin: SubAdmin) => {
    setFormData({
      name: subAdmin.name,
      email: subAdmin.email,
      isActive: subAdmin.isActive,
      role: 'SUB',
    });
    setIsUpdating(subAdmin.id);
  };

  const startResetPassword = (subAdminId: string) => {
    setResetPassword(subAdminId);
    setNewPassword('');
  };

  const cancelAction = () => {
    setIsUpdating(null);
    setResetPassword(null);
    setNewPassword('');
    setFormData({
      name: '',
      email: '',
      isActive: true,
      role: 'SUB',
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Gestion des sous-administrateurs
        </h1>
        <p className="mt-2 text-gray-600">
          {user?.role === 'SUPER' ? (
            selectedCompanyId ? 
              `Créez et gérez les sous-administrateurs pour l'entreprise "${companyName}"` :
              'Sélectionnez une entreprise pour gérer ses sous-administrateurs'
          ) : (
            'Créez et gérez les sous-administrateurs de votre entreprise'
          )}
        </p>
      </div>

      {/* Sub-Admin Management */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-6 flex flex-wrap items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Sous-Administrateurs</h2>
          {user?.role === 'SUPER' && !selectedCompanyId ? (
            <div className="text-sm text-amber-600">
              Veuillez sélectionner une entreprise ci-dessous pour gérer ses sous-administrateurs
            </div>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className={`inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 ${
                isCreating ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={isCreating}
            >
              <Plus className="mr-1 h-4 w-4" />
              {companyName ? `Ajouter un sous-administrateur pour ${companyName}` : `Ajouter un sous-administrateur`}
            </button>
          )}
        </div>

        {user?.role === 'SUPER' && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <label htmlFor="companySelector" className="mb-2 block text-sm font-medium text-gray-700 md:mb-0">
                Sélectionner une entreprise pour gérer ses sous-administrateurs:
              </label>
              <select
                id="companySelector"
                value={selectedCompanyId}
                onChange={handleCompanyChange}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 md:w-auto"
              >
                <option value="">-- Sélectionner une entreprise --</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name} {!company.isActive && "(Inactive)"}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {isCreating && (
          <div className="rounded-lg border border-gray-200 p-5 shadow">
            <h3 className="mb-3 text-md font-medium text-gray-900">
              {companyName ? 
                `Créer un nouveau sous-administrateur pour ${companyName}` : 
                'Créer un nouveau sous-administrateur'}
            </h3>
            <form onSubmit={handleCreateSubAdmin} className="grid gap-4 md:grid-cols-2">
              {user?.role === 'SUPER' && (
                <div className="col-span-2">
                  <label htmlFor="companyId" className="block text-sm font-medium text-gray-700">
                    Entreprise
                  </label>
                  <select
                    id="companyId"
                    name="companyId"
                    value={selectedCompanyId}
                    onChange={handleCompanyChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  >
                    <option value="">-- Sélectionner une entreprise --</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name} {!company.isActive && "(Inactive)"}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nom
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="flex items-center self-end">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                  Actif
                </label>
              </div>
              
              <div className="col-span-2 mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setFormData({
                      name: '',
                      email: '',
                      isActive: true,
                      role: 'SUB',
                    });
                  }}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  <X className="mr-2 h-4 w-4" />
                  Annuler
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  <Check className="mr-2 h-4 w-4" />
                  {companyName ? `Créer pour ${companyName}` : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        )}

        {subAdmins.length === 0 ? (
          <div className="rounded-md bg-gray-50 p-4 text-center text-gray-600">
            {selectedCompanyId ? 
              `Aucun sous-administrateur trouvé dans ${companyName}. Ajoutez votre premier sous-administrateur pour commencer.` : 
              user?.role === 'SUPER' ? 
                'Veuillez sélectionner une entreprise pour voir ses sous-administrateurs' :
                'Aucun sous-administrateur trouvé. Ajoutez votre premier sous-administrateur pour commencer.'
            }
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Nom
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Statut
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Créé le
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {subAdmins.map((subAdmin) => (
                  <tr key={subAdmin.id}>
                    <td className="whitespace-nowrap px-6 py-4">
                      {isUpdating === subAdmin.id ? (
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      ) : (
                        <div className="text-sm font-medium text-gray-900">{subAdmin.name}</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {isUpdating === subAdmin.id ? (
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      ) : (
                        <div className="text-sm text-gray-500">{subAdmin.email}</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {isUpdating === subAdmin.id ? (
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            name="isActive"
                            checked={formData.isActive}
                            onChange={handleChange}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Actif</span>
                        </div>
                      ) : (
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            subAdmin.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {subAdmin.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(subAdmin.createdAt).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      {isUpdating === subAdmin.id ? (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleUpdateSubAdmin(subAdmin.id)}
                            className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={cancelAction}
                            className="inline-flex items-center rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : resetPassword === subAdmin.id ? (
                        <div className="flex items-center justify-end space-x-2">
                          <PasswordInput
                            name="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Nouveau mot de passe"
                            className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            minLength={8}
                          />
                          <button
                            onClick={() => handleResetPassword(subAdmin.id)}
                            className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={cancelAction}
                            className="inline-flex items-center rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => startEditing(subAdmin)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Modifier"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => startResetPassword(subAdmin.id)}
                            className="text-amber-600 hover:text-amber-900"
                            title="Réinitialiser le mot de passe"
                          >
                            <RefreshCw className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => openDeleteConfirmation(subAdmin.id, subAdmin.name)}
                            className="text-red-600 hover:text-red-900"
                            title="Supprimer"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={closeDeleteConfirmation}
        onConfirm={handleDeleteSubAdmin}
        itemName={`le sous-administrateur "${deleteConfirmation.subAdminName}"`}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default SubAdminManager; 
