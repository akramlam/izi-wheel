import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useToast } from '../hooks/use-toast';
import { Plus, Pencil, Trash2, Check, X, UserPlus } from 'lucide-react';

type Company = {
  id: string;
  name: string;
  isActive: boolean;
  plan?: string;
  maxWheels?: number;
  createdAt: string;
  updatedAt: string;
  adminCount?: number;
};

type AdminInvite = {
  name: string;
  email: string;
  role: string;
};

const SuperAdmin = () => {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [adminsToInvite, setAdminsToInvite] = useState<AdminInvite[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    isActive: true,
    plan: 'BASIC',
    maxWheels: 1
  });

  // Fetch all companies on component mount
  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const response = await api.getAllCompanies();
      if (response.data && response.data.companies) {
        setCompanies(response.data.companies);
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Impossible de récupérer la liste des entreprises"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const payload = {
        ...formData,
        admins: adminsToInvite
      };
      
      const response = await api.createCompany(payload);
      
      if (response.data && response.data.company) {
        setCompanies(prev => [response.data.company, ...prev]);
        setIsCreating(false);
        resetForm();
        
        // Get the count of invited admins
        const invitedCount = response.data.admins?.length || 0;
        
        toast({
          title: 'Success',
          description: `Entreprise créée avec succès${invitedCount ? ` et ${invitedCount} admin(s) invité(s)` : ''}`
        });
        
        // Refresh the company list
        fetchCompanies();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Impossible de créer l'entreprise";
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: errorMessage
      });
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isUpdating) return;
    
    try {
      const response = await api.updateCompany(isUpdating, formData);
      
      if (response.data && response.data.company) {
        setCompanies(prev => 
          prev.map(company => 
            company.id === isUpdating ? response.data.company : company
          )
        );
        setIsUpdating(null);
        resetForm();
        
        toast({
          title: 'Success',
          description: "Entreprise mise à jour avec succès"
        });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Impossible de mettre à jour l'entreprise";
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: errorMessage
      });
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette entreprise ?")) {
      return;
    }
    
    try {
      await api.deleteCompany(companyId);
      
      setCompanies(prev => prev.filter(company => company.id !== companyId));
      
      toast({
        title: 'Success',
        description: "Entreprise supprimée avec succès"
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Impossible de supprimer l'entreprise";
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: errorMessage
      });
    }
  };

  const startUpdating = (company: Company) => {
    setFormData({
      name: company.name,
      isActive: company.isActive,
      plan: company.plan || 'BASIC',
      maxWheels: company.maxWheels || 1
    });
    setIsUpdating(company.id);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      isActive: true,
      plan: 'BASIC',
      maxWheels: 1
    });
    setAdminsToInvite([]);
  };

  const addAdminToInvite = () => {
    setAdminsToInvite([...adminsToInvite, { name: '', email: '', role: 'ADMIN' }]);
  };

  const removeAdminToInvite = (index: number) => {
    const newAdmins = [...adminsToInvite];
    newAdmins.splice(index, 1);
    setAdminsToInvite(newAdmins);
  };

  const handleAdminChange = (index: number, field: keyof AdminInvite, value: string) => {
    const newAdmins = [...adminsToInvite];
    newAdmins[index] = { ...newAdmins[index], [field]: value };
    setAdminsToInvite(newAdmins);
  };

  // Filter companies based on statusFilter
  const filteredCompanies = companies.filter(company => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return company.isActive;
    if (statusFilter === 'inactive') return !company.isActive;
    return true;
  });

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
          Tableau de bord Super Admin
        </h1>
        <p className="mt-2 text-gray-600">
          Gérer les entreprises et les paramètres du système
        </p>
      </div>

      {/* Company Management */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex justify-between">
          <h2 className="text-xl font-semibold text-gray-800">Entreprises</h2>
          <div className="flex space-x-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Tous</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
            <button
              onClick={() => {
                setIsCreating(true);
                setIsUpdating(null);
                resetForm();
              }}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create
            </button>
          </div>
        </div>

        {isCreating && (
          <div className="mb-6 rounded-md border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 text-md font-medium text-gray-900">Create New Company</h3>
            <form onSubmit={handleCreateCompany} className="flex flex-col space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Company Name
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
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="plan" className="block text-sm font-medium text-gray-700">
                    Plan
                  </label>
                  <select
                    id="plan"
                    name="plan"
                    value={formData.plan}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="BASIC">Basic</option>
                    <option value="PREMIUM">Premium</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="maxWheels" className="block text-sm font-medium text-gray-700">
                    Max Wheels
                  </label>
                  <input
                    type="number"
                    id="maxWheels"
                    name="maxWheels"
                    min="1"
                    value={formData.maxWheels}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                  Active
                </label>
              </div>
              
              {/* Admin Invitations Section */}
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Invite Administrators</h4>
                  <button
                    type="button"
                    onClick={addAdminToInvite}
                    className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    <UserPlus className="mr-1 h-4 w-4" />
                    Add Admin
                  </button>
                </div>
                
                {adminsToInvite.length > 0 && (
                  <div className="mt-3 space-y-3">
                    {adminsToInvite.map((admin, index) => (
                      <div key={index} className="rounded-md border border-gray-200 bg-white p-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700">
                              Name
                            </label>
                            <input
                              type="text"
                              value={admin.name}
                              onChange={(e) => handleAdminChange(index, 'name', e.target.value)}
                              placeholder="Admin Name"
                              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700">
                              Email
                            </label>
                            <input
                              type="email"
                              value={admin.email}
                              onChange={(e) => handleAdminChange(index, 'email', e.target.value)}
                              placeholder="admin@example.com"
                              required
                              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="flex items-end space-x-2">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-gray-700">
                                Role
                              </label>
                              <select
                                value={admin.role}
                                onChange={(e) => handleAdminChange(index, 'role', e.target.value)}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              >
                                <option value="ADMIN">Admin</option>
                                <option value="SUB">Sub-Admin</option>
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAdminToInvite(index)}
                              className="mb-[2px] rounded-md border border-gray-300 p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-500"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex space-x-2 pt-4">
                <button
                  type="submit"
                  className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Company Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Plan
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Max Wheels
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Admins
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Created
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                    No companies found
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((company) => (
                  <tr key={company.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {isUpdating === company.id ? (
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        company.name
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {isUpdating === company.id ? (
                        <select
                          name="plan"
                          value={formData.plan}
                          onChange={handleChange}
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                        >
                          <option value="BASIC">Basic</option>
                          <option value="PREMIUM">Premium</option>
                        </select>
                      ) : (
                        company.plan || 'BASIC'
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {isUpdating === company.id ? (
                        <input
                          type="number"
                          name="maxWheels"
                          min="1"
                          value={formData.maxWheels}
                          onChange={handleChange}
                          className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        company.maxWheels || 1
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {isUpdating === company.id ? (
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            name="isActive"
                            checked={formData.isActive}
                            onChange={handleChange}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Active</span>
                        </div>
                      ) : (
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            company.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {company.isActive ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {company.adminCount || 0}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(company.createdAt).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      {isUpdating === company.id ? (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={handleUpdateCompany}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <Check className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setIsUpdating(null)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => startUpdating(company)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCompany(company.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SuperAdmin; 