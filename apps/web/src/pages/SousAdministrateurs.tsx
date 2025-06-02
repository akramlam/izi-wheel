"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent } from "../components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table"
import { Button } from "../components/ui/button"
import Badge from "../components/ui/Badge"
import { Plus, Search, Filter, ArrowUpDown, MoreHorizontal, Edit, Trash2, Pencil, Check, X, RefreshCw } from "lucide-react"
import { api } from '../lib/api';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth';

// Data types from SubAdminManager.tsx
type SubAdmin = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  role: string; // Should be 'SUB' for this page
  createdAt: string;
  companyName?: string; // Optional: To store company name directly if needed
};

type Company = {
  id: string;
  name: string;
  isActive: boolean;
};

const SousAdministrateurs: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormProcessing, setIsFormProcessing] = useState(false);

  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [resetPasswordPrompt, setResetPasswordPrompt] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [companyName, setCompanyName] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    isActive: true,
    role: 'SUB',
  });

  const [searchTerm, setSearchTerm] = useState("");

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
          companyId = validationResponse.data?.companyId || '';
          setCompanyName(validationResponse.data?.companyName || '');
          setSelectedCompanyId(companyId);
          
          // For SUPER users, fetch all companies
          if (user?.role === 'SUPER') {
            const companiesResponse = await api.getAllCompanies();
            if (companiesResponse.data && companiesResponse.data.companies) {
              setCompanies(companiesResponse.data.companies);
            }
          }
          
          // Update in localStorage for future use
          if (companyId) {
            localStorage.setItem('companyId', companyId);
          }
        } catch (error) {
          console.error('Error validating company ID:', error);
          toast({
            variant: 'destructive',
            title: 'Erreur de validation',
            description: 'Impossible de valider l\'ID d\'entreprise. Veuillez vous reconnecter ou contacter le support.',
          });
          
          // Set empty state if validation fails
          setCompanies([]);
          setSubAdmins([]);
          setIsLoading(false);
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
        setIsLoading(false);
        return;
      }
      
      // Try to fetch sub-admins, but don't let it break the app if it fails
      try {
        await fetchSubAdmins(companyId);
      } catch (e) {
        console.error("Failed to fetch initial sub-admins:", e);
        setSubAdmins([]);
      }
      } catch (error) {
      console.error("Error in fetchInitialData:", error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Une erreur est survenue lors du chargement des données. Veuillez réessayer.',
      });
      } finally {
      setIsLoading(false);
    }
  };

  // Make sure companies are loaded for SUPER users
  useEffect(() => {
    if (user?.role === 'SUPER' && companies.length === 0 && !isLoading) {
      fetchCompaniesForSuperAdmin();
    }
  }, [user?.role, companies.length, isLoading]);

  useEffect(() => {
    if (user?.role === 'SUPER' && selectedCompanyId) {
      fetchSubAdmins(selectedCompanyId);
      const selectedCompany = companies.find(c => c.id === selectedCompanyId);
      if (selectedCompany) setCompanyName(selectedCompany.name);
    }
  }, [selectedCompanyId, user?.role, companies]);

  const fetchCompaniesForSuperAdmin = async () => {
    setIsLoading(true);
    try {
      const response = await api.getAllCompanies();
      const fetchedCompanies = response.data?.companies || [];
      setCompanies(fetchedCompanies);
      if (fetchedCompanies.length === 0) {
        toast({
          title: "Information", 
          description: "Aucune entreprise trouvée à gérer."
        });
      }
    } catch (error) {
      console.error("Error fetching companies for SUPER admin:", error);
      toast({ 
        variant: "destructive", 
        title: "Erreur", 
        description: "Impossible de charger la liste des entreprises." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubAdmins = async (companyId = selectedCompanyId) => {
    if (!companyId) {
      setSubAdmins([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
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
          // Don't let company name fetch failure stop the process
        }
      }
      
      // Filter only SUB role users
      const subAdminUsers = response.data?.users?.filter(
        (user: any) => user?.role === 'SUB'
      ) || [];
      
      setSubAdmins(subAdminUsers);
    } catch (error) {
      console.error('Error fetching sub-admins for company ' + companyId + ':', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: `Échec du chargement des sous-administrateurs pour l'entreprise ${companyName || companyId}.`,
      });
      setSubAdmins([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCompanyId = e.target.value;
    setSelectedCompanyId(newCompanyId);
    
    // When company changes, update the list of sub-admins
    if (newCompanyId) {
      fetchSubAdmins(newCompanyId);
      
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
    
    if (!selectedCompanyId) {
      toast({
        variant: 'destructive',
        title: 'Sélection requise', 
        description: 'Veuillez sélectionner une entreprise.'
      });
      return;
    }
    
    // Validate form data
    if (!formData.name || !formData.email) {
      toast({
        variant: 'destructive',
        title: 'Données manquantes',
        description: 'Veuillez remplir tous les champs obligatoires.'
      });
      return;
    }
    
    setIsFormProcessing(true);
    try {
      // Create payload with required fields only
      const payload = {
        companyId: selectedCompanyId,
        name: formData.name.trim(),
        email: formData.email.trim(),
        isActive: formData.isActive,
        role: 'SUB',
      };
      
      console.log('Creating sub-admin with payload:', payload);
      
      const response = await api.createUser(payload);
      
      console.log('Create sub-admin response:', response);
      
      toast({
        title: 'Succès',
        description: 'Sous-administrateur créé. Un email avec les identifiants a été envoyé.',
      });
      
      setIsCreating(false);
      setFormData({ name: '', email: '', isActive: true, role: 'SUB' });
      
      // Refresh the list after a short delay to allow the server to process
      setTimeout(() => {
        fetchSubAdmins(selectedCompanyId);
      }, 500);
      
    } catch (error: any) {
      console.error('Error creating sub-admin:', error);
      
      // More detailed error handling
      let errorMsg = 'Échec de la création du sous-administrateur.';
      let errorDetails = '';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        
        if (error.response.data && error.response.data.error) {
          errorMsg = error.response.data.error;
          
          // Handle specific error cases
          if (errorMsg.includes('Email already in use')) {
            errorMsg = 'Cette adresse email est déjà utilisée.';
          } else if (errorMsg.includes('Company not found')) {
            errorMsg = 'Entreprise non trouvée. Veuillez rafraîchir la page.';
          }
        } else if (error.response.status === 500) {
          errorMsg = 'Erreur serveur. Veuillez contacter l\'administrateur.';
          errorDetails = 'Le serveur a rencontré une erreur interne.';
        } else if (error.response.status === 409) {
          errorMsg = 'Un utilisateur avec cet email existe déjà.';
        } else if (error.response.status === 400) {
          errorMsg = 'Données invalides. Vérifiez les informations saisies.';
        }
      } else if (error.request) {
        // The request was made but no response was received
        errorMsg = 'Pas de réponse du serveur. Vérifiez votre connexion.';
        errorDetails = 'Le serveur ne répond pas. Veuillez réessayer plus tard.';
      }
      
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: errorMsg,
      });
      
      if (errorDetails) {
        console.error('Additional error details:', errorDetails);
      }
    } finally {
      setIsFormProcessing(false);
    }
  };

  const handleUpdateSubAdmin = async (subAdminId: string) => {
    setIsFormProcessing(true);
    try {
      await api.updateUser(subAdminId, {
        name: formData.name,
        email: formData.email,
        isActive: formData.isActive,
      });
      toast({ title: 'Succès', description: 'Sous-administrateur mis à jour.' });
      setIsUpdating(null);
      setFormData({ name: '', email: '', isActive: true, role: 'SUB' });
      fetchSubAdmins(selectedCompanyId);
    } catch (error: any) {
      console.error('Error updating sub-admin:', error);
      const errorMsg = error.response?.data?.message || 'Échec de la mise à jour.';
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: errorMsg,
      });
    } finally {
      setIsFormProcessing(false);
    }
  };

  const handleResetPassword = async (subAdminId: string) => {
    if (!newPassword || newPassword.length < 8) {
      toast({ 
        variant: 'destructive', 
        title: 'Erreur de validation', 
        description: 'Le mot de passe doit comporter au moins 8 caractères.' 
      });
      return;
    }
    setIsFormProcessing(true);
    try {
      await api.resetUserPassword(subAdminId, { password: newPassword });
      toast({ title: 'Succès', description: 'Mot de passe réinitialisé avec succès.' });
      setResetPasswordPrompt(null);
      setNewPassword('');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      const errorMsg = error.response?.data?.message || 'Échec de la réinitialisation.';
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: errorMsg,
      });
    } finally {
      setIsFormProcessing(false);
    }
  };

  const handleDeleteSubAdmin = async (subAdminId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce sous-administrateur ? Cette action est irréversible.')) {
      return;
    }
    setIsFormProcessing(true);
    try {
      await api.deleteUser(subAdminId);
      toast({ title: 'Succès', description: 'Sous-administrateur supprimé.' });
      fetchSubAdmins(selectedCompanyId);
    } catch (error: any) {
      console.error('Error deleting sub-admin:', error);
      const errorMsg = error.response?.data?.message || 'Échec de la suppression.';
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: errorMsg,
      });
    } finally {
      setIsFormProcessing(false);
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
    setIsCreating(false);
    setResetPasswordPrompt(null);
  };

  const startResetPassword = (subAdminId: string) => {
    setResetPasswordPrompt(subAdminId);
    setNewPassword('');
    setIsCreating(false);
    setIsUpdating(null);
  };

  const cancelAction = () => {
    setIsCreating(false);
    setIsUpdating(null);
    setResetPasswordPrompt(null);
    setNewPassword('');
    setFormData({ name: '', email: '', isActive: true, role: 'SUB' });
  };

  // Determine main page loading state
  const showMainLoader = isLoading && 
                         ((user?.role !== 'SUPER' && !subAdmins.length) || 
                          (user?.role === 'SUPER' && companies.length === 0 && !selectedCompanyId)) && 
                         !isCreating && !isUpdating && !resetPasswordPrompt;

  if (showMainLoader) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
        <p className="ml-4 text-gray-600">Chargement des données...</p>
      </div>
    );
  }

  // Provide a fallback in case searchTerm or admin object are undefined
  const safeSearchTerm = searchTerm || '';
  const filteredSubAdmins = subAdmins.filter(
    (admin) => {
      if (!admin) return false;
      const name = (admin.name || '').toLowerCase();
      const email = (admin.email || '').toLowerCase();
      const term = safeSearchTerm.toLowerCase();
      return name.includes(term) || email.includes(term);
    }
  );

  const getStatusVariant = (isActive: boolean) => {
    return isActive ? "success" : "error"
  }
  
  const openCreateModal = () => {
    if (user?.role === 'SUPER' && !selectedCompanyId) {
        toast({
          variant: 'destructive',
          title: "Sélection requise", 
          description: "Veuillez d'abord sélectionner une entreprise."
        });
        return;
    }
    cancelAction();
    setIsCreating(true);
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des Sous-administrateurs</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {user?.role === 'SUPER' ? 
              (selectedCompanyId && companyName ? `Gestion pour l'entreprise "${companyName}"` : (companies.length > 0 ? 'Sélectionnez une entreprise pour gérer les sous-administrateurs.' : (isLoading ? 'Chargement des entreprises...': 'Aucune entreprise à gérer.'))) :
              (companyName ? `Gérez les accès pour "${companyName}".` : (isLoading ? 'Chargement des données...' : 'Gérez les accès et permissions de votre équipe.'))
            }
          </p>
        </div>
        <Button 
          onClick={openCreateModal} 
          className="mt-4 sm:mt-0 flex items-center space-x-2"
          disabled={(user?.role === 'SUPER' && !selectedCompanyId && companies.length > 0) || isCreating || isLoading}
        >
          <Plus className="h-4 w-4" />
          <span>Nouveau sous-administrateur</span>
        </Button>
      </div>

      {/* Company Selector for SUPER Admin */}
      {user?.role === 'SUPER' && (
        <Card>
          <CardContent className="p-6">
            <label htmlFor="companySelector" className="block text-sm font-medium text-gray-700 mb-2">
              Sélectionner une entreprise :
            </label>
            <select
              id="companySelector"
              value={selectedCompanyId}
              onChange={handleCompanyChange}
              className="block w-full sm:w-auto rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              disabled={isLoading && companies.length === 0}
            >
              <option value="">-- Sélectionner une entreprise --</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name} {!company.isActive && "(Inactive)"}
                </option>
              ))}
            </select>
             {isLoading && selectedCompanyId && <p className="text-sm text-gray-500 mt-2">Chargement des sous-administrateurs...</p>}
          </CardContent>
        </Card>
      )}

      {/* Create or Edit Form */}
      {(isCreating || isUpdating) && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium mb-4">
              {isUpdating ? `Modifier: ${formData.name}` : 'Créer un nouveau sous-administrateur'}
              {companyName && <span className="text-sm text-gray-500"> pour {companyName}</span>}
            </h3>
            <form onSubmit={isUpdating ? (e) => { e.preventDefault(); if(isUpdating) handleUpdateSubAdmin(isUpdating); } : handleCreateSubAdmin} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nom</label>
                <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2" placeholder="Nom complet"/>
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2" placeholder="admin@exemple.com"/>
              </div>
              <div className="flex items-center">
                <input type="checkbox" name="isActive" id={`isActiveModal-${isUpdating || 'new'}`} checked={formData.isActive} onChange={handleChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"/>
                <label htmlFor={`isActiveModal-${isUpdating || 'new'}`} className="ml-2 block text-sm text-gray-900">Actif</label>
              </div>
              <div className="text-xs text-gray-500">
                <p>Un email avec les identifiants sera envoyé à l'utilisateur.</p>
                <p>L'utilisateur devra modifier son mot de passe lors de sa première connexion.</p>
              </div>
              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={cancelAction} disabled={isLoading || isFormProcessing}>Annuler</Button>
                <Button type="submit" disabled={isLoading || isFormProcessing}>
                  {isFormProcessing ? (
                    <><div className="animate-spin w-4 h-4 mr-2 border-2 border-t-transparent border-white rounded-full"></div> {isUpdating ? 'Sauvegarde...' : 'Création...'}</>
                  ) : (
                    isUpdating ? <><Check className="mr-2 h-4 w-4" /> Sauvegarder</> : <><Plus className="mr-2 h-4 w-4" /> Créer</>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Reset Password Form */}
      {resetPasswordPrompt && (
         <Card>
           <CardContent className="p-6">
             <h3 className="text-lg font-medium mb-4">Réinitialiser le mot de passe pour {subAdmins.find(sa => sa.id === resetPasswordPrompt)?.name}</h3>
             <form onSubmit={(e) => { e.preventDefault(); if(resetPasswordPrompt) handleResetPassword(resetPasswordPrompt); }} className="space-y-4">
               <div>
                 <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">Nouveau mot de passe (min 8 caractères)</label>
                 <input type="password" name="newPassword" id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"/>
               </div>
               <div className="flex justify-end space-x-3">
                 <Button type="button" variant="outline" onClick={cancelAction} disabled={isLoading}>Annuler</Button>
                 <Button type="submit" disabled={isLoading}><RefreshCw className="mr-2 h-4 w-4" /> {isLoading ? 'Réinitialisation...' : 'Réinitialiser'}</Button>
               </div>
             </form>
           </CardContent>
         </Card>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            {/* Example filter buttons, functionality to be implemented if needed */}
            <Button variant="outline" size="sm" className="flex items-center space-x-2 w-full sm:w-auto" disabled={true}>
              <Filter className="h-4 w-4" />
              <span>Filtrer</span>
            </Button>
            <Button variant="outline" size="sm" className="flex items-center space-x-2 w-full sm:w-auto" disabled={true}>
              <ArrowUpDown className="h-4 w-4" />
              <span>Trier</span>
            </Button>
            <div className="flex-1"></div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par nom ou email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
                disabled={ (user?.role === 'SUPER' && !selectedCompanyId && companies.length > 0) || isLoading }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sous-administrateurs Table */}
      { (user?.role === 'SUPER' && !selectedCompanyId && !isLoading) && (
        <Card>
            <CardContent className="p-6 text-center text-gray-500">
                Veuillez sélectionner une entreprise ci-dessus pour afficher les sous-administrateurs.
            </CardContent>
        </Card>
      )}

      { (selectedCompanyId || user?.role !== 'SUPER') && !isLoading && filteredSubAdmins.length === 0 && !isCreating && !isUpdating && !resetPasswordPrompt && (
         <Card>
            <CardContent className="p-6 text-center text-gray-500">
                Aucun sous-administrateur trouvé {companyName ? `pour ${companyName}`: ''}.
                { (user?.role === 'SUPER' && !selectedCompanyId) ? "" : (<> Cliquez sur "Nouveau sous-administrateur" pour en ajouter un.</>)}
            </CardContent>
        </Card>
      )}

      { (selectedCompanyId || user?.role !== 'SUPER') && (filteredSubAdmins.length > 0 || (isLoading && !showMainLoader) ) && (
      <Card>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date de création</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading && filteredSubAdmins.length === 0 && (user?.role !== 'SUPER' || selectedCompanyId) ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto"></div>
                      </td>
                    </tr>
                ) : (
                filteredSubAdmins.map((admin) => (
                <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.name}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>
                        <Badge variant={getStatusVariant(admin.isActive)}>{admin.isActive ? "Actif" : "Inactif"}</Badge>
                  </TableCell>
                    <TableCell>{new Date(admin.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                        <div className="flex items-center justify-end space-x-1 md:space-x-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEditing(admin)}
                            title="Modifier"
                            disabled={isUpdating === admin.id || resetPasswordPrompt === admin.id || isLoading}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startResetPassword(admin.id)}
                            title="Réinitialiser le mot de passe"
                            disabled={isUpdating === admin.id || resetPasswordPrompt === admin.id || isLoading}
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSubAdmin(admin.id)}
                            title="Supprimer"
                            disabled={isUpdating === admin.id || resetPasswordPrompt === admin.id || isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                  </TableCell>
                </TableRow>
                )))}
            </TableBody>
          </Table>
            </div>
        </CardContent>
      </Card>
      )}
    </div>
  )
}

export default SousAdministrateurs
