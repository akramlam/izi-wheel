import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth';
import { Plus, Pencil, Trash2, Check, X, RefreshCw } from 'lucide-react';

type SubAdmin = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  role: string;
  createdAt: string;
};

const SubAdminManager = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    isActive: true,
    role: 'SUB',
  });

  useEffect(() => {
    fetchSubAdmins();
  }, []);

  const fetchSubAdmins = async () => {
    try {
      setIsLoading(true);
      const companyId = user?.companyId;
      if (!companyId) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Aucun ID d\'entreprise trouvé. Veuillez vous reconnecter.',
        });
        return;
      }

      const response = await api.getCompanyUsers(companyId);
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
    } finally {
      setIsLoading(false);
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
      if (!user?.companyId) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Aucun ID d\'entreprise trouvé. Veuillez vous reconnecter.',
        });
        return;
      }

      await api.createUser({
        companyId: user.companyId,
        name: formData.name,
        email: formData.email,
        password: formData.password,
        isActive: formData.isActive,
        role: 'SUB',
      });
      
      toast({
        title: 'Succès',
        description: 'Sous-administrateur créé avec succès',
      });
      
      setIsCreating(false);
      setFormData({
        name: '',
        email: '',
        password: '',
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
        password: '',
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
      if (!formData.password || formData.password.length < 8) {
        toast({
          variant: 'destructive',
          title: 'Erreur de validation',
          description: 'Le mot de passe doit comporter au moins 8 caractères',
        });
        return;
      }

      await api.resetUserPassword(subAdminId, {
        password: formData.password,
      });
      
      toast({
        title: 'Succès',
        description: 'Mot de passe réinitialisé avec succès',
      });
      
      setResetPassword(null);
      setFormData({
        ...formData,
        password: '',
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Échec de la réinitialisation du mot de passe',
      });
    }
  };

  const handleDeleteSubAdmin = async (subAdminId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce sous-administrateur ? Cette action ne peut être annulée.')) {
      return;
    }
    
    try {
      await api.deleteUser(subAdminId);
      
      toast({
        title: 'Succès',
        description: 'Sous-administrateur supprimé avec succès',
      });
      
      fetchSubAdmins();
    } catch (error) {
      console.error('Error deleting sub-admin:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Échec de la suppression du sous-administrateur',
      });
    }
  };

  const startEditing = (subAdmin: SubAdmin) => {
    setFormData({
      name: subAdmin.name,
      email: subAdmin.email,
      password: '',
      isActive: subAdmin.isActive,
      role: 'SUB',
    });
    setIsUpdating(subAdmin.id);
  };

  const startResetPassword = (subAdminId: string) => {
    setResetPassword(subAdminId);
    setFormData({
      ...formData,
      password: '',
    });
  };

  const cancelAction = () => {
    setIsUpdating(null);
    setResetPassword(null);
    setFormData({
      name: '',
      email: '',
      password: '',
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
          Créez et gérez les sous-administrateurs de votre entreprise
        </p>
      </div>

      {/* Sub-Admin Management */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Sous-Administrateurs</h2>
          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un sous-administrateur
            </button>
          )}
        </div>

        {isCreating && (
          <div className="mb-6 rounded-md border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 text-md font-medium text-gray-900">Créer un nouveau sous-administrateur</h3>
            <form onSubmit={handleCreateSubAdmin} className="grid gap-4 md:grid-cols-2">
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

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Mot de passe
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                  minLength={8}
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
              
              <div className="col-span-2 flex space-x-2 pt-4">
                <button
                  type="submit"
                  className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Créer
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <X className="mr-2 h-4 w-4" />
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {subAdmins.length === 0 ? (
          <div className="rounded-md bg-gray-50 p-4 text-center text-gray-600">
            Aucun sous-administrateur trouvé. Ajoutez votre premier sous-administrateur pour commencer.
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
                          <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
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
                            onClick={() => handleDeleteSubAdmin(subAdmin.id)}
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
    </div>
  );
};

export default SubAdminManager; 