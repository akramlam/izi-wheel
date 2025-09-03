"use client"

import React, { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card" // Added CardHeader, CardTitle
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input" // Added Input
import { Label } from "../components/ui/label" // Added Label
import { Switch } from "../components/ui/switch" // Added Switch
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select" // Added Select components
import { ConfirmationDialog } from '../components/ui/confirmation-dialog';
import { EnhancedConfirmationDialog } from '../components/ui/enhanced-confirmation-dialog';

import { api } from '../lib/api' // Fixed import path
import { useToast } from '../hooks/use-toast' // Fixed import path
import { Plus, Search, Filter, ArrowUpDown, TrendingUp, TrendingDown, Pencil, Trash2, Check, X, UserPlus, Users } from "lucide-react"

// More comprehensive company type based on SuperAdmin.tsx
interface Company {
  id: string
  name: string
  isActive: boolean
  plan?: string
  maxWheels?: number
  createdAt: string
  updatedAt: string
  adminCount?: number
  // Fields from existing companys.tsx if they are still relevant and returned by backend
  logo?: string       // Kept from original companys.tsx
  metric?: number     // Kept from original companys.tsx, might be part of stats, not core company data
  trend?: number      // Kept from original companys.tsx
  color?: string      // Kept from original companys.tsx
}

interface AdminInvite {
  name: string;
  email: string;
  role: string;
}

const Entreprises: React.FC = () => {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [isLoading, setIsLoading] = useState(true); // Renamed from loading to isLoading

  // States from SuperAdmin.tsx
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null); // Stores ID of company being updated
  const [adminsToInvite, setAdminsToInvite] = useState<AdminInvite[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    isActive: true,
    plan: 'FREE',
    maxWheels: 1
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    companyId: string | null;
    companyName: string;
    activeWheelsCount?: number;
    adminsCount?: number;
  }>({
    isOpen: false,
    companyId: null,
    companyName: '',
    activeWheelsCount: 0,
    adminsCount: 0,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const navigate = useNavigate();

  // Console logging for debugging
  useEffect(() => {
    console.log("Component mounted, isCreating:", isCreating);
  }, []);

  // Monitor isCreating state changes
  useEffect(() => {
    console.log("isCreating changed to:", isCreating);
  }, [isCreating]);

  useEffect(() => {
    fetchCompanies()
  }, [])

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      console.log("Fetching companies...");
      const response = await api.getAllCompanies();
      console.log("Companies response:", response);
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

  // Form handling logic from SuperAdmin.tsx
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    console.log(`Form field change: ${name} = ${value}`);
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : (name === 'maxWheels' ? parseInt(value) || 0 : value)
    }));
  };

  const handleSwitchChange = (checked: boolean) => {
    console.log(`Switch changed to: ${checked}`);
    setFormData(prev => ({
      ...prev,
      isActive: checked
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    console.log(`Select changed: ${name} = ${value}`);
    setFormData(prev => ({
        ...prev,
        [name]: value
    }));
  };

  const resetForm = () => {
    console.log("Resetting form");
    setFormData({
      name: '',
      isActive: true,
      plan: 'FREE',
      maxWheels: 1
    });
    setAdminsToInvite([]);
  };

  const addAdminToInvite = () => {
    console.log("Adding admin invite");
    setAdminsToInvite([...adminsToInvite, { name: '', email: '', role: 'ADMIN' }]);
  };

  const removeAdminToInvite = (index: number) => {
    console.log(`Removing admin invite at index ${index}`);
    setAdminsToInvite(prevAdmins => prevAdmins.filter((_, i) => i !== index));
  };

  const handleAdminChange = (index: number, field: keyof AdminInvite, value: string) => {
    console.log(`Admin change: [${index}].${field} = ${value}`);
    setAdminsToInvite(prevAdmins => 
      prevAdmins.map((admin, i) => i === index ? { ...admin, [field]: value } : admin)
    );
  };

  // CRUD operations from SuperAdmin.tsx, adapted for companysService
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Creating company with data:", formData);
    console.log("Admins to invite:", adminsToInvite);

    try {
      const payload = {
        ...formData,
        admins: adminsToInvite.length > 0 ? adminsToInvite : undefined
      };
      console.log("Sending payload:", payload);
      
      const response = await api.createCompany(payload);
      console.log("Create company response:", response);
      
      const newCompany = response.data?.company || response.data;
      if (newCompany && newCompany.id) {
        resetForm();
        setIsCreating(false);
        
        const invitedCount = adminsToInvite.length;
        toast({
          title: 'Succès',
          description: `Entreprise créée avec succès${invitedCount > 0 ? ` et ${invitedCount} admin(s) invité(s)` : ''}`
        });
        
        await fetchCompanies();
      } else {
        throw new Error("La réponse de création d'entreprise est invalide");
      }
    } catch (error: any) {
      console.error("Error creating company:", error);
      const errorMessage = error.response?.data?.message || error.message || "Impossible de créer l'entreprise";
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: errorMessage
      });
    }
  };

  const startUpdating = (company: Company) => {
    console.log("Starting update for company:", company);
    setIsUpdating(company.id);
    setFormData({
      name: company.name,
      isActive: company.isActive,
      plan: company.plan || 'BASIC',
      maxWheels: company.maxWheels || 1
    });
    setAdminsToInvite([]);
    setIsCreating(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Updating company with ID:", isUpdating);
    console.log("Update data:", formData);
    console.log("Admins to invite:", adminsToInvite);
    
    if (!isUpdating) return;
    
    try {
      const payload = {
        ...formData,
        admins: adminsToInvite.length > 0 ? adminsToInvite : undefined
      };
      
      const response = await api.updateCompany(isUpdating, payload);
      console.log("Update company response:", response);
      
      if (response.data) {
        setCompanies(prev => 
          prev.map(company => 
            company.id === isUpdating ? 
              {...company, ...formData, updatedAt: new Date().toISOString()} : 
              company
          )
        );
        
        setIsUpdating(null);
        resetForm();
        
        const invitedCount = adminsToInvite.length;
        toast({
          title: 'Succès',
          description: `Entreprise mise à jour avec succès${invitedCount > 0 ? ` et ${invitedCount} admin(s) invité(s)` : ''}`
        });
      }
    } catch (error: any) {
      console.error("Error updating company:", error);
      const errorMessage = error.response?.data?.message || "Impossible de mettre à jour l'entreprise";
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: errorMessage
      });
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    setDeleteConfirmation({
      isOpen: true,
      companyId: companyId,
      companyName: company?.name || 'cette entreprise',
      activeWheelsCount: company?.maxWheels,
      adminsCount: company?.adminCount,
    });
  };

  const confirmDeleteCompany = async (force: boolean = false) => {
    if (!deleteConfirmation.companyId) return;
    
    console.log(`Deleting company with ID: ${deleteConfirmation.companyId}, force: ${force}`);
    try {
      setIsDeleting(true);
      
      // Build the API URL with force parameter if needed
      const url = force 
        ? `/companies/${deleteConfirmation.companyId}?force=true`
        : `/companies/${deleteConfirmation.companyId}`;
      
      const response = await api.deleteCompany(deleteConfirmation.companyId, force);
      console.log("Delete company response:", response);
      
      const successMessage = force 
        ? `Entreprise "${deleteConfirmation.companyName}" et toutes ses données supprimées définitivement`
        : "Entreprise supprimée avec succès";
      
      toast({
        title: 'Succès',
        description: successMessage
      });
      
      setDeleteConfirmation({ isOpen: false, companyId: null, companyName: '', activeWheelsCount: 0, adminsCount: 0 });
      await fetchCompanies();
    } catch (error: any) {
      console.error("Error deleting company:", error);
      
      // If this is a 409 error (active wheels) and we're not forcing, let the dialog handle it
      if (error.response?.status === 409 && !force) {
        // Update the confirmation state with detailed info from the error
        const errorDetails = error.response?.data?.details;
        if (errorDetails) {
          setDeleteConfirmation(prev => ({
            ...prev,
            activeWheelsCount: errorDetails.activeWheelsCount,
            adminsCount: errorDetails.adminsCount,
          }));
        }
        throw error; // Re-throw for the enhanced dialog to catch
      } else {
        // For other errors, show a toast
        const errorMessage = error.response?.data?.message || error.response?.data?.error || "Impossible de supprimer l'entreprise";
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: errorMessage
        });
      }
    } finally {
      setIsDeleting(false);
    }
  };
  
  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPlan = planFilter === 'all' || (company.plan || 'N/A') === planFilter
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? company.isActive : !company.isActive)
    return matchesSearch && matchesPlan && matchesStatus
  })

  const sortedCompanies = [...filteredCompanies].sort((a, b) => {
    let aVal: any = ''
    let bVal: any = ''
    switch (sortBy) {
      case 'name':
        aVal = (a.name || '').toLowerCase();
        bVal = (b.name || '').toLowerCase();
        break;
      case 'createdAt':
        aVal = new Date(a.createdAt).getTime();
        bVal = new Date(b.createdAt).getTime();
        break;
      case 'plan':
        aVal = a.plan || '';
        bVal = b.plan || '';
        break;
      case 'adminCount':
        aVal = a.adminCount ?? 0;
        bVal = b.adminCount ?? 0;
        break;
      case 'maxWheels':
        aVal = a.maxWheels ?? 0;
        bVal = b.maxWheels ?? 0;
        break;
      default:
        aVal = (a.name || '').toLowerCase();
        bVal = (b.name || '').toLowerCase();
    }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  })

  const handleManageCompany = (companyId: string) => {
    navigate(`/entreprises/${companyId}/admins`);
  };

  // Form UI to be rendered when isCreating or isUpdating
  const renderForm = () => (
    <Card className="mb-6 shadow-lg">
      <CardHeader>
        <CardTitle>{isUpdating ? "Modifier l'entreprise" : "Créer une nouvelle entreprise"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={isUpdating ? handleUpdateCompany : handleCreateCompany} className="space-y-6">
          <div>
            <Label htmlFor="name">Nom de l'entreprise</Label>
            <Input id="name" name="name" value={formData.name} onChange={handleFormChange} required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="plan">Plan</Label>
              <Select name="plan" value={formData.plan} onValueChange={(value) => handleSelectChange('plan', value)}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un plan" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BASIC">Basic</SelectItem>
                  <SelectItem value="PREMIUM">Premium</SelectItem>
                  <SelectItem value="FREE">Free</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="maxWheels">Nombre max de roues</Label>
              <Input id="maxWheels" name="maxWheels" type="number" min="0" value={formData.maxWheels} onChange={handleFormChange} />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="isActive" name="isActive" checked={formData.isActive} onCheckedChange={handleSwitchChange} />
            <Label htmlFor="isActive">Active</Label>
          </div>

          {/* Admin Invitations Section - Show for both Create and Update */} 
          {(isCreating || isUpdating) && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">
                  {isUpdating ? "Ajouter des administrateurs" : "Inviter des administrateurs"}
                </h4>
                <Button type="button" variant="outline" size="sm" onClick={addAdminToInvite} className="flex items-center">
                  <UserPlus className="mr-2 h-4 w-4" /> Ajouter Admin
                </Button>
              </div>
              {adminsToInvite.map((admin, index) => (
                <Card key={index} className="p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <div>
                      <Label htmlFor={`admin-name-${index}`}>Nom</Label>
                      <Input id={`admin-name-${index}`} value={admin.name} onChange={(e) => handleAdminChange(index, 'name', e.target.value)} placeholder="Nom de l'admin" />
                    </div>
                    <div>
                      <Label htmlFor={`admin-email-${index}`}>Email</Label>
                      <Input id={`admin-email-${index}`} type="email" value={admin.email} onChange={(e) => handleAdminChange(index, 'email', e.target.value)} placeholder="admin@example.com" required={index === 0 && adminsToInvite.length > 0} />
                    </div>
                    <div className="flex items-end space-x-2">
                      <div className="flex-grow">
                        <Label htmlFor={`admin-role-${index}`}>Rôle</Label>
                        <Select value={admin.role} onValueChange={(value) => handleAdminChange(index, 'role', value)}>
                          <SelectTrigger><SelectValue placeholder="Rôle" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="SUB">Sub-Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeAdminToInvite(index)} className="text-red-500 hover:text-red-700">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {adminsToInvite.length === 0 && (
                <p className="text-gray-500 text-sm italic">Aucun administrateur à ajouter. Utilisez le bouton ci-dessus pour en ajouter.</p>
              )}
            </div>
          )}

          <div className="flex space-x-3 pt-4 border-t">
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white flex items-center">
              <Check className="mr-2 h-4 w-4" /> {isUpdating ? "Mettre à jour" : "Créer"}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                resetForm();
                setIsCreating(false);
                setIsUpdating(null);
              }} 
              className="flex items-center"
            >
              <X className="mr-2 h-4 w-4" /> Annuler
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  if (isLoading && companies.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-t-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestion des entreprises</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Créez, visualisez, et gérez vos entreprises clientes.</p>
        </div>
        {!isCreating && !isUpdating && (
          <Button 
            onClick={() => { 
              console.log("Create company button clicked");
              setIsCreating(true); 
              setIsUpdating(null); 
              setFormData({
                name: '',
                isActive: true,
                plan: 'BASIC',
                maxWheels: 1
              });
              setAdminsToInvite([]);
              window.scrollTo({ top: 0, behavior: 'smooth' }); 
            }} 
            className="bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 px-4 rounded-lg flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nouvelle entreprise
        </Button>
        )}
      </div>

      {/* Render Create/Update Form */} 
      {(isCreating || isUpdating) && renderForm()}

      {/* Filters and Search */} 
      <Card className="shadow-sm">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            {/* Search */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Rechercher par nom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
              />
            </div>

            {/* Plan filter */}
            <div className="w-full md:w-48">
              <Select value={planFilter} onValueChange={(v) => setPlanFilter(v)}>
                <SelectTrigger><SelectValue placeholder="Plan" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les plans</SelectItem>
                  <SelectItem value="BASIC">Basic</SelectItem>
                  <SelectItem value="PREMIUM">Premium</SelectItem>
                  <SelectItem value="FREE">Free</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status filter */}
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
                <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="active">Actives</SelectItem>
                  <SelectItem value="inactive">Inactives</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort controls */}
            <div className="flex w-full md:w-auto gap-2">
              <div className="w-full md:w-56">
                <Select value={sortBy} onValueChange={(v) => setSortBy(v)}>
                  <SelectTrigger><SelectValue placeholder="Trier par" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Nom</SelectItem>
                    <SelectItem value="createdAt">Date de création</SelectItem>
                    <SelectItem value="plan">Plan</SelectItem>
                    <SelectItem value="adminCount">Admins</SelectItem>
                    <SelectItem value="maxWheels">Roues max</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" className="w-28" onClick={() => setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')}>
                <ArrowUpDown className="h-4 w-4 mr-2" /> {sortDir === 'asc' ? 'Asc' : 'Desc'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setPlanFilter('all'); setStatusFilter('all'); setSortBy('name'); setSortDir('asc'); setSearchTerm(''); }}>
                <X className="h-4 w-4 mr-2" /> Réinitialiser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedCompanies.map((company) => (
          <Card key={company.id} className="group hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-purple-300 bg-white">
            <CardContent className="p-6">
              {/* Header with Logo and Status */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">
                      {company.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg leading-tight" title={company.name}>
                      {company.name.length > 20 ? `${company.name.substring(0, 20)}...` : company.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Créée le {new Date(company.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  company.isActive
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-red-100 text-red-700 border border-red-200'
                }`}>
                  {company.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>

              {/* Company Details */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Plan</span>
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                    company.plan === 'PREMIUM' ? 'bg-purple-100 text-purple-700' :
                    company.plan === 'BASIC' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {company.plan || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Roues Max</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {company.maxWheels !== undefined ? company.maxWheels : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-gray-600">Administrateurs</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {company.adminCount !== undefined ? company.adminCount : '0'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col space-y-2">
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleManageCompany(company.id)} 
                    className="flex-1 text-purple-600 border-purple-200 hover:bg-purple-50 hover:border-purple-300 transition-colors"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Gérer
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => startUpdating(company)} 
                    className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleDeleteCompany(company.id)} 
                  className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 transition-colors"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete confirmation dialog */}
      <EnhancedConfirmationDialog
        isOpen={deleteConfirmation.isOpen}
        onConfirm={confirmDeleteCompany}
        onClose={() => setDeleteConfirmation({ isOpen: false, companyId: null, companyName: '', activeWheelsCount: 0, adminsCount: 0 })}
        title="Supprimer l'entreprise"
        description={`Êtes-vous sûr de vouloir supprimer l'entreprise "${deleteConfirmation.companyName}" ? Toutes les données associées (roues, utilisateurs, parties) seront définitivement perdues. Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="destructive"
        isLoading={isDeleting}
        requireNameConfirmation={true}
        itemName={deleteConfirmation.companyName}
        activeWheelsCount={deleteConfirmation.activeWheelsCount}
        adminsCount={deleteConfirmation.adminsCount}
      />
    </div>
  )
}

export default Entreprises
