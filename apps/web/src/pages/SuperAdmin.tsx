import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useToast } from '../hooks/use-toast';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';

type Company = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  adminCount?: number;
};

const SuperAdmin = () => {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', isActive: true });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      const response = await api.getAllCompanies();
      setCompanies(response.data.companies);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load companies. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await api.createCompany({
        name: formData.name,
        isActive: formData.isActive,
      });
      
      toast({
        title: 'Success',
        description: 'Company created successfully',
      });
      
      setIsCreating(false);
      setFormData({ name: '', isActive: true });
      fetchCompanies();
    } catch (error) {
      console.error('Error creating company:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create company',
      });
    }
  };

  const handleUpdateCompany = async (companyId: string) => {
    try {
      await api.updateCompany(companyId, {
        name: formData.name,
        isActive: formData.isActive,
      });
      
      toast({
        title: 'Success',
        description: 'Company updated successfully',
      });
      
      setIsUpdating(null);
      setFormData({ name: '', isActive: true });
      fetchCompanies();
    } catch (error) {
      console.error('Error updating company:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update company',
      });
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!window.confirm('Are you sure you want to delete this company? This action cannot be undone.')) {
      return;
    }
    
    try {
      await api.deleteCompany(companyId);
      
      toast({
        title: 'Success',
        description: 'Company deleted successfully',
      });
      
      fetchCompanies();
    } catch (error) {
      console.error('Error deleting company:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete company',
      });
    }
  };

  const startEditing = (company: Company) => {
    setFormData({
      name: company.name,
      isActive: company.isActive,
    });
    setIsUpdating(company.id);
  };

  const cancelEditing = () => {
    setIsUpdating(null);
    setFormData({ name: '', isActive: true });
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
          Super Admin Dashboard
        </h1>
        <p className="mt-2 text-gray-600">
          Manage companies and system-wide settings
        </p>
      </div>

      {/* Company Management */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Companies</h2>
          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Company
            </button>
          )}
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
              
              <div className="flex space-x-2 pt-2">
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

        {companies.length === 0 ? (
          <div className="rounded-md bg-gray-50 p-4 text-center text-gray-600">
            No companies found. Create your first company to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Company Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Admin Count
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Created On
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {companies.map((company) => (
                  <tr key={company.id}>
                    <td className="whitespace-nowrap px-6 py-4">
                      {isUpdating === company.id ? (
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      ) : (
                        <div className="text-sm font-medium text-gray-900">{company.name}</div>
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
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      {isUpdating === company.id ? (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleUpdateCompany(company.id)}
                            className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="inline-flex items-center rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => startEditing(company)}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* System Stats Card */}
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium uppercase text-gray-500">Total Companies</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{companies.length}</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium uppercase text-gray-500">Active Companies</h3>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {companies.filter(c => c.isActive).length}
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium uppercase text-gray-500">Inactive Companies</h3>
          <p className="mt-2 text-3xl font-bold text-red-600">
            {companies.filter(c => !c.isActive).length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SuperAdmin; 