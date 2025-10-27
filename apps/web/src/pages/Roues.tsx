"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent } from "../components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table"
import { Button } from "../components/ui/button"
import Badge from "../components/ui/Badge"
import { Search, Edit, Trash2, QrCode, MoreHorizontal, Copy, ToggleLeft, ToggleRight, ArrowUpDown, X, Plus } from "lucide-react"
import { ExternalLink } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useToast } from "../hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "../components/ui/dialog"
import { apiClient, api } from "@/services/api"
import { useAuth } from "../hooks/useAuth"
import UpgradePlanModal from "../components/UpgradePlanModal"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "../components/ui/dropdown-menu"
import { ConfirmationDialog } from '../components/ui/confirmation-dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select"
interface Roue {
  id: string
  entreprise: string
  nom: string
  type: "Gagnant à tous les coups" | "Gain aléatoire"
  parties: number
  liens: number
  statut: "Actif" | "Inactif"
}

// Add a type for company
interface Company {
  id: string;
  name: string;
  [key: string]: any; // For any other properties
}

const Roues: React.FC = () => {
  const [roues, setRoues] = useState<Roue[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [selectedWheelForQR, setSelectedWheelForQR] = useState<string | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    wheelId: string | null;
    wheelName: string;
  }>({
    isOpen: false,
    wheelId: null,
    wheelName: '',
  });
  
  // Filter and sort state
  const [filterType, setFilterType] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("nom")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  
  // Add companies state for super admin
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("")
  
  // Add state for wheel limits
  const [wheelsLimit, setWheelsLimit] = useState<number>(1) // Default to 1 for free plan
  const [wheelsUsed, setWheelsUsed] = useState<number>(0)
  
  // Add a state variable to store the company name for display
  // Display company name is set in state but not used directly after UI refactor
  const [displayCompanyName, setDisplayCompanyName] = useState<string>("Votre entreprise");
  
  // Free plan state
  // Free plan flag reserved for future UI conditions
  const [isFreePlan, setIsFreePlan] = useState<boolean>(false)
  const [remainingPlays, setRemainingPlays] = useState<number>(0)
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false)
  const upgradeModalType: 'wheel' | 'play' = 'wheel'
  const [currentPlan, setCurrentPlan] = useState<string>('FREE')
  const [showLimitDialog, setShowLimitDialog] = useState<boolean>(false)

  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  
  // Check if user is super admin
  const isSuperAdmin = user?.role === "SUPER"

  // Removed dropdown outside-click handler (no dropdowns in unified UI)

  // Removed unused getCompanyNameForDisplay

  // Fetch user profile and company data
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const profileResponse = await api.getProfile();
        
        if (profileResponse.data.user.company) {
          setSelectedCompanyId(profileResponse.data.user.company.id);
          setDisplayCompanyName(profileResponse.data.user.company.name);
          
          // Set wheel limits - IMPORTANT: This must be set here for sub-admins
          if (profileResponse.data.user.company.maxWheels) {
            setWheelsLimit(profileResponse.data.user.company.maxWheels);
          } else {
            // Fallback for companies without maxWheels set
            setWheelsLimit(5); // Default to 5 for BASIC plan
          }
          
          // Check if user is on free plan
          setIsFreePlan(profileResponse.data.user.company.plan === 'FREE');
          setCurrentPlan(profileResponse.data.user.company.plan || 'FREE');
          setRemainingPlays(profileResponse.data.user.company.remainingPlays || 0);
          
          // Fetch wheels for this company
          fetchRoues(profileResponse.data.user.company.id);
        }
        
        // If user is SUPER, fetch all companies
        if (profileResponse.data.user.role === 'SUPER') {
          fetchCompanies();
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: 'Error',
          description: 'Failed to load user profile',
          variant: 'destructive',
        });
      }
    };
    
    fetchUserProfile();
  }, []);

  // Modified useEffect to only fetch company/wheels once and avoid infinite loops
  useEffect(() => {
    // One-time initialization based on user type
    const initializeData = async () => {
      try {
        if (isSuperAdmin) {
          // Super admin: fetch companies first
          await fetchCompanies();
        } else {
          // Regular user: fetch profile and wheels
          try {
            // Get user company info from profile
            const profileResponse = await api.getProfile();
            if (profileResponse.data?.user?.company) {
              const company = profileResponse.data.user.company;
              
              // Store company info
              if (company.name) {
                setDisplayCompanyName(company.name);
                console.log("Setting company name from profile:", company.name);
              }
              
              // CRITICAL: Set wheel limits for sub-admins here too
              if (company.maxWheels) {
                setWheelsLimit(company.maxWheels);
                console.log("Setting wheel limit from profile:", company.maxWheels);
              } else {
                // Fallback for companies without maxWheels set
                setWheelsLimit(5); // Default to 5 for BASIC plan
                console.log("Using default wheel limit: 5");
              }
              if (company.plan) {
                setCurrentPlan(company.plan);
                setIsFreePlan(company.plan === 'FREE');
              }
              
              if (company.id) {
                localStorage.setItem('companyId', company.id);
                await fetchRoues(company.id);
              } else {
                await fetchRoues();
              }
            } else {
              console.log("No company in profile, using default");
              await fetchRoues();
            }
          } catch (error) {
            console.error("Error fetching profile, continuing with wheels:", error);
            await fetchRoues();
          }
        }
      } catch (error) {
        console.error("Error initializing data:", error);
        // For errors, still try to fetch wheels
        if (!isSuperAdmin) {
          await fetchRoues();
        }
      }
    };

    initializeData();
    // Empty dependency array means this only runs once at component mount
  }, []);

  // Simplified version of fetchRoues with hardcoded company name
  const fetchRoues = async (specificCompanyId?: string) => {
    try {
      setLoading(true);
      
      let response;
      
      // Get the selected company name directly from the companies array
      let companyNameToUse = "Votre entreprise";
      
      if (isSuperAdmin && specificCompanyId) {
        // For super admin, find the company name from the array
        const selectedCompany = companies.find(c => c.id === specificCompanyId);
        if (selectedCompany?.name) {
          companyNameToUse = selectedCompany.name;
        }
        
        // For super admin, use specific company ID
        response = await apiClient.get(`/companies/${specificCompanyId}/wheels`);
      } else {
        // For regular users (sub-admins), try to get company name from profile
        try {
          const profileResponse = await api.getProfile();
          if (profileResponse.data?.user?.company?.name) {
            companyNameToUse = profileResponse.data.user.company.name;
            
            // Store wheel limit from company data - CRITICAL for sub-admins
            if (profileResponse.data.user.company.maxWheels) {
              setWheelsLimit(profileResponse.data.user.company.maxWheels);
              console.log("Updated wheel limit in fetchRoues:", profileResponse.data.user.company.maxWheels);
            } else {
              // Fallback for companies without maxWheels set
              setWheelsLimit(5); // Default to 5 for BASIC plan
              console.log("Using default wheel limit in fetchRoues: 5");
            }
            
            // Also update the display company name state
            setDisplayCompanyName(companyNameToUse);
            console.log("Updated company name in fetchRoues:", companyNameToUse);
          }
        } catch (error) {
          console.error("Error getting user profile:", error);
        }
        
        // For regular users, use the standard API
        response = await api.getWheels();
      }
      
      console.log(`Using company name for wheels: ${companyNameToUse}`);
      
      // Extract wheels array from response.data
      if (response.data && response.data.wheels && Array.isArray(response.data.wheels)) {
        // Map API response to match Roue interface with company name
        const mappedWheels = response.data.wheels.map((wheel: any) => ({
          id: wheel.id,
          entreprise: companyNameToUse, // Use the dynamically determined company name
          nom: wheel.name,
          type: wheel.mode === 'ALL_WIN' ? 'Gagnant à tous les coups' : 'Gain aléatoire',
          parties: wheel._count?.plays || 0,
          liens: wheel._count?.shares || 0,
          statut: wheel.isActive ? 'Actif' : 'Inactif'
        }));
        
        setRoues(mappedWheels);
        setWheelsUsed(mappedWheels.length);
        console.log(`Set wheels used: ${mappedWheels.length}, wheel limit: ${wheelsLimit}`);
      } else {
        console.error("API returned non-array data:", response);
        setRoues([]);
        toast({
          title: "Erreur de format",
          description: "Les données reçues ne sont pas au format attendu",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching roues:", error);
      setRoues([]);
      toast({
        title: "Erreur",
        description: "Impossible de charger les roues",
        variant: "destructive",
      });
      } finally {
      setLoading(false);
    }
  };
  
  // Add function to fetch companies
  const fetchCompanies = async () => {
    try {
      setLoading(true);
      console.log("Fetching all companies...");
      const response = await api.getAllCompanies();
      
      if (response.data && response.data.companies && response.data.companies.length > 0) {
        setCompanies(response.data.companies);
        
        // Get stored company ID from localStorage or use the first company
        const storedCompanyId = localStorage.getItem('companyId');
        if (storedCompanyId && response.data.companies.some((c: Company) => c.id === storedCompanyId)) {
          setSelectedCompanyId(storedCompanyId);
          
          // Get the selected company name
          const selectedCompany = response.data.companies.find((c: Company) => c.id === storedCompanyId);
          if (selectedCompany) {
            setDisplayCompanyName(selectedCompany.name);
            console.log("Using stored company:", selectedCompany.name);
            
            // Store wheel limit from company data
            if (selectedCompany.maxWheels) {
              setWheelsLimit(selectedCompany.maxWheels);
            }
            if ((selectedCompany as any).plan) {
              setCurrentPlan((selectedCompany as any).plan);
              setIsFreePlan((selectedCompany as any).plan === 'FREE');
            }
          }
          
          // Fetch wheels for this company
          await fetchRoues(storedCompanyId);
        } else if (response.data.companies.length > 0) {
          // Use first company if no stored ID
          const firstCompany = response.data.companies[0] as Company;
          setSelectedCompanyId(firstCompany.id);
          localStorage.setItem('companyId', firstCompany.id);
          
          setDisplayCompanyName(firstCompany.name);
          console.log("Using first company:", firstCompany.name);
          
          // Store wheel limit from company data
          if (firstCompany.maxWheels) {
            setWheelsLimit(firstCompany.maxWheels);
          }
          if ((firstCompany as any).plan) {
            setCurrentPlan((firstCompany as any).plan);
            setIsFreePlan((firstCompany as any).plan === 'FREE');
          }
          
          // Fetch wheels for first company
          await fetchRoues(firstCompany.id);
        } else {
          setLoading(false);
        }
      } else {
        console.log("No companies found");
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les entreprises",
        variant: "destructive",
      });
      setLoading(false);
    }
  };
  
  // Handle company selection change (Radix Select returns the value directly)
  const handleCompanyChange = (newCompanyId: string) => {
    setSelectedCompanyId(newCompanyId);
    localStorage.setItem('companyId', newCompanyId);
    
    // Get the selected company name from the dropdown
    const selectedCompany = companies.find((c: Company) => c.id === newCompanyId);
    if (selectedCompany) {
      // Set company name for display
      setDisplayCompanyName(selectedCompany.name);
      console.log("Changed to company:", selectedCompany.name);
      
      // Update wheel limit
      if (selectedCompany.maxWheels) {
        setWheelsLimit(selectedCompany.maxWheels);
      }
    }
    
    // Force immediate refresh of wheels with new company ID
    if (newCompanyId) {
      fetchRoues(newCompanyId);
    } else {
      // If no company selected, clear the wheels
      setRoues([]);
      setWheelsUsed(0);
    }
  };

  // Removed unused handleCreateWheel

  const handleEditRoue = (id: string) => {
    navigate(`/roues/edit/${id}`)
  }

  const handleCreateWheel = () => {
    // Check if limit is reached
    if (wheelsUsed >= wheelsLimit) {
      setShowLimitDialog(true)
      return
    }
    // Navigate to create wheel page
    navigate('/roues/create')
  }

  const confirmDeleteRoue = (id: string) => {
    const roue = roues.find(r => r.id === id);
    setDeleteConfirmation({
      isOpen: true,
      wheelId: id,
      wheelName: roue?.nom || 'cette roue',
    });
  };

  const handleDeleteRoue = async () => {
    if (!deleteConfirmation.wheelId) return;

    try {
      setDeleting(deleteConfirmation.wheelId);
      
      // Use the current company ID for API calls
      const companyIdToUse = isSuperAdmin ? selectedCompanyId : localStorage.getItem('companyId');
      
      if (!companyIdToUse) {
        throw new Error("No company ID available");
      }
      
      await apiClient.delete(`/companies/${companyIdToUse}/wheels/${deleteConfirmation.wheelId}`);
      setRoues(roues.filter(roue => roue.id !== deleteConfirmation.wheelId));
      setDeleteConfirmation({ isOpen: false, wheelId: null, wheelName: '' });
      
      toast({
        title: "Succès",
        description: "La roue a été supprimée avec succès",
      });
    } catch (error) {
      console.error("Error deleting roue:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la roue",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  // Removed unused handleViewRoue

  const handleViewQRCode = (id: string) => {
    setSelectedWheelForQR(id)
  }

  const handleCloseQRModal = () => {
    setSelectedWheelForQR(null)
  }

  const handleCopyLink = (id: string) => {
    // Create the link to the wheel
    const wheelLink = `https://roue.izikado.fr/play/company/${id}`
    
    navigator.clipboard.writeText(wheelLink)
      .then(() => {
        toast({
          title: "Lien copié",
          description: "Le lien a été copié dans le presse-papier",
        })
      })
      .catch((error) => {
        console.error("Error copying link:", error)
        toast({
          title: "Erreur",
          description: "Impossible de copier le lien",
          variant: "destructive",
        })
      })
  }

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      // Convert UI status to API format (opposite of current status)
      const isActive = currentStatus !== "Actif";
      const newStatus = isActive ? "Actif" : "Inactif";
      
      // Use the current company ID for API calls
      const companyIdToUse = isSuperAdmin ? selectedCompanyId : localStorage.getItem('companyId');
      
      if (!companyIdToUse) {
        throw new Error("No company ID available");
      }
      
      // Send only the isActive field in the correct format
      const payload = {
        isActive: isActive,
        // Include other required fields for wheel update
        name: roues.find(r => r.id === id)?.nom || "",
        mode: roues.find(r => r.id === id)?.type === "Gagnant à tous les coups" ? "ALL_WIN" : "RANDOM_WIN",
        formSchema: {}
      };
      
      console.log("Updating wheel status with payload:", payload);
      
      await apiClient.put(`/companies/${companyIdToUse}/wheels/${id}`, payload);
      
      // Update the status in the local state
      setRoues(roues.map(roue => 
        roue.id === id ? { ...roue, statut: newStatus as "Actif" | "Inactif" } : roue
      ));
      
      toast({
        title: "Succès",
        description: `Statut mis à jour: ${newStatus}`,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    }
  };

  const filteredRoues = Array.isArray(roues) 
    ? roues
      .filter((roue) => {
        // Search filter
        const matchesSearch = 
          (roue.entreprise?.toLowerCase()?.includes(searchTerm.toLowerCase()) || false) ||
          (roue.nom?.toLowerCase()?.includes(searchTerm.toLowerCase()) || false)
        
        // Type filter
        const matchesType = filterType === "all" || 
          (filterType === "gagnant" && roue.type === "Gagnant à tous les coups") ||
          (filterType === "aleatoire" && roue.type === "Gain aléatoire")
        
        // Status filter
        const matchesStatus = filterStatus === "all" ||
          (filterStatus === "actif" && roue.statut === "Actif") ||
          (filterStatus === "inactif" && roue.statut === "Inactif")
        
        return matchesSearch && matchesType && matchesStatus
      })
      .sort((a, b) => {
        let aValue: any, bValue: any
        
        switch (sortBy) {
          case "nom":
            aValue = a.nom?.toLowerCase() || ""
            bValue = b.nom?.toLowerCase() || ""
            break
          case "type":
            aValue = a.type
            bValue = b.type
            break
          case "parties":
            aValue = a.parties
            bValue = b.parties
            break
          case "statut":
            aValue = a.statut
            bValue = b.statut
            break
          default:
            aValue = a.nom?.toLowerCase() || ""
            bValue = b.nom?.toLowerCase() || ""
        }
        
        if (sortOrder === "asc") {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
        }
      })
    : [];

  const getTypeVariant = (type: string) => {
    return type === "Gagnant à tous les coups" ? "success" : "warning"
  }

  const getStatusVariant = (statut: string) => {
    return statut === "Actif" ? "success" : "error"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-[#f3f0f9] p-2 sm:p-4 md:p-6">
      {/* Header - Mobile responsive */}
      <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:justify-between sm:items-start mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Roues</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Créez et gérez vos campagnes de roue.</p>
        </div>
        {/* Right header block: stack usage and action vertically */}
        <div className="flex flex-col items-end space-y-2">
        {(!isSuperAdmin || (isSuperAdmin && selectedCompanyId)) && (
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-right">
              <span className="font-medium">{wheelsUsed}</span> / <span className="font-medium">{wheelsLimit}</span> roues utilisées
            </div>
          )}
          <Button onClick={handleCreateWheel}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle roue
          </Button>
          </div>
      </div>

      {/* Company selector for super admin - Mobile responsive */}
      {isSuperAdmin && (
        <Card className="mb-4 sm:mb-6">
          <CardContent className="p-3 sm:p-6">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Sélectionner une entreprise
              </label>
              <Select
                value={selectedCompanyId}
                onValueChange={(v) => handleCompanyChange(v as any)}  >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une entreprise" />
                </SelectTrigger>
                <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unified filter/sort/search bar */}
      <Card className="mb-4 sm:mb-6">
        <CardContent className="p-3 sm:p-6">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
              {/* Search */}
            <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                placeholder="Rechercher par nom..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

            {/* Type filter */}
            <div className="w-full md:w-48">
              <Select value={filterType} onValueChange={(v) => setFilterType(v)}>
                <SelectTrigger><SelectValue placeholder="Tous les types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="gagnant">Gagnant à tous les coups</SelectItem>
                  <SelectItem value="aleatoire">Gain aléatoire</SelectItem>
                </SelectContent>
              </Select>
              </div>
              
            {/* Status filter */}
            <div className="w-full md:w-48">
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v)}>
                <SelectTrigger><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="actif">Actif</SelectItem>
                  <SelectItem value="inactif">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort field */}
            <div className="w-full md:w-56">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v)}>
                <SelectTrigger><SelectValue placeholder="Trier par" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nom">Nom</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                  <SelectItem value="parties">Parties</SelectItem>
                  <SelectItem value="statut">Statut</SelectItem>
                </SelectContent>
              </Select>
                </div>
                
            {/* Direction + Reset */}
            <div className="flex w-full md:w-auto gap-2">
              <Button variant="outline" size="sm" className="w-24" onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}>
                <ArrowUpDown className="h-4 w-4 mr-2" /> {sortOrder === 'asc' ? 'Asc' : 'Desc'}
                  </Button>
              <Button variant="outline" size="sm" onClick={() => { setFilterType('all'); setFilterStatus('all'); setSortBy('nom'); setSortOrder('asc'); setSearchTerm(''); }}>
                <X className="h-4 w-4 mr-2" /> Réinitialiser
                        </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Empty state for when super admin hasn't selected a company */}
      {isSuperAdmin && !selectedCompanyId && !loading && (
        <Card className="flex flex-col items-center justify-center p-8 sm:p-12 text-center">
          <div className="mx-auto flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-purple-100">
            <Search className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
          </div>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Sélectionnez une entreprise</h3>
          <p className="mt-1 text-sm text-gray-500">
            Veuillez d'abord sélectionner une entreprise pour voir ses roues.
          </p>
        </Card>
      )}

      {/* Roues Table - Mobile responsive */}
      {(!isSuperAdmin || (isSuperAdmin && selectedCompanyId)) && !loading && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="hidden lg:table-cell">Entreprise</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead className="hidden sm:table-cell">Type</TableHead>
                    <TableHead className="hidden md:table-cell">Parties</TableHead>
                    <TableHead className="hidden md:table-cell">Liens</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoues.map((roue) => (
                    <TableRow key={roue.id}>
                      <TableCell className="hidden lg:table-cell font-medium">{roue.entreprise}</TableCell>
                      <TableCell className="font-medium">
                        <div className="max-w-32 sm:max-w-none truncate">
                          {roue.nom}
                        </div>
                        {/* Show type on mobile under name */}
                        <div className="sm:hidden mt-1">
                          <Badge variant={getTypeVariant(roue.type)} className="text-xs">{roue.type}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant={getTypeVariant(roue.type)}>{roue.type}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{roue.parties.toLocaleString()}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {roue.statut === "Actif" ? (
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyLink(roue.id)}
                              className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                              title="Copier le lien"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewQRCode(roue.id)}
                              className="h-8 w-8 p-0 text-purple-600 hover:bg-purple-50"
                              title="QR Code"
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                            <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`https://roue.izikado.fr/play/company/${roue.id}`, '_blank')}
                            className="h-8 w-8 p-0 text-purple-600 hover:bg-purple-50"
                            title="Voir la roue en direct"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Roue inactive</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(roue.statut)}>{roue.statut}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleEditRoue(roue.id)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewQRCode(roue.id)}>
                                <QrCode className="mr-2 h-4 w-4" />
                                QR Code
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCopyLink(roue.id)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Copier le lien
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleToggleStatus(roue.id, roue.statut)}
                                className={roue.statut === "Actif" ? "text-orange-600" : "text-green-600"}
                              >
                                {roue.statut === "Actif" ? (
                                  <>
                                    <ToggleLeft className="mr-2 h-4 w-4" />
                                    Désactiver
                                  </>
                                ) : (
                                  <>
                                    <ToggleRight className="mr-2 h-4 w-4" />
                                    Activer
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => confirmDeleteRoue(roue.id)}
                                className="text-red-600"
                                disabled={deleting === roue.id}
                              >
                                {deleting === roue.id ? (
                                  <div className="flex items-center">
                                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
                                    Suppression...
                                  </div>
                                ) : (
                                  <>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Supprimer
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* QR Code Dialog - Mobile responsive */}
      <Dialog open={!!selectedWheelForQR} onOpenChange={handleCloseQRModal}>
        <DialogContent className="sm:max-w-md mx-4 sm:mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCloseQRModal}
            className="absolute top-2 right-2 z-10"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </Button>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">QR Code</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Scannez ce QR code ou partagez-le pour accéder à votre roue.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-4 sm:p-6">
            {selectedWheelForQR && (
              <>
                <div className="w-48 h-48 sm:w-64 sm:h-64 bg-white p-3 sm:p-4 rounded-md shadow-md flex items-center justify-center">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://roue.izikado.fr/play/company/${selectedWheelForQR}`)}`} 
                    alt="QR Code"
                    className="w-full h-full"
                  />
                </div>
                <Button 
                  className="mt-3 sm:mt-4 w-full sm:w-auto"
                  onClick={() => handleCopyLink(selectedWheelForQR)}
                >
                  Copier le lien
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Modal */}
      <UpgradePlanModal 
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        limitType={upgradeModalType}
        remainingPlays={remainingPlays}
        currentPlan={currentPlan}
      />

      {/* Pagination - hidden until real paging is implemented */}
      {false && (
      <div className="flex items-center justify-center space-x-2">
        <button className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">Précédent</button>
        {[1, 2, 3, 4, 5].map((page) => (
          <button
            key={page}
            className={`px-3 py-2 text-sm rounded ${
              page === 1 ? "bg-purple-600 text-white" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            {page}
          </button>
        ))}
        <button className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">Suivant</button>
      </div>
      )}

      {/* Wheel limit reached dialog */}
      <Dialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600">
              ⚠️ Nombre maximum de roues atteint
            </DialogTitle>
            <DialogDescription className="text-base mt-4">
              Vous avez atteint la limite de <strong>{wheelsLimit} roue{wheelsLimit > 1 ? 's' : ''}</strong> pour votre compte.
              <br /><br />
              Contactez votre référent pour augmenter votre limite.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowLimitDialog(false)}
            >
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirmation.isOpen}
        onConfirm={handleDeleteRoue}
        onClose={() => setDeleteConfirmation({ isOpen: false, wheelId: null, wheelName: '' })}
        title="Supprimer la roue"
        description={`Êtes-vous sûr de vouloir supprimer la roue "${deleteConfirmation.wheelName}" ? Toutes les données associées (cases, parties jouées) seront définitivement perdues. Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="destructive"
        isLoading={!!deleting}
      />
    </div>
  )
}

export default Roues