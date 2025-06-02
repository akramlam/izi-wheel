"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent } from "../components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table"
import { Button } from "../components/ui/button"
import Badge from "../components/ui/Badge"
import { Plus, Search, Filter, ArrowUpDown, Eye, LinkIcon, Edit, Trash2, QrCode } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useToast } from "../hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog"
import { apiClient, api } from "@/services/api"
import { useAuth } from "../hooks/useAuth"

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
  
  // Add companies state for super admin
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("")
  
  // Add state for wheel limits
  const [wheelsLimit, setWheelsLimit] = useState<number>(3) // Default value
  const [wheelsUsed, setWheelsUsed] = useState<number>(0)
  
  // Add a state variable to store the company name for display
  const [displayCompanyName, setDisplayCompanyName] = useState<string>("Votre entreprise");
  
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  
  // Check if user is super admin
  const isSuperAdmin = user?.role === "SUPER"

  // Add direct mapping right in the render to override any issues with state timing
  const getCompanyNameForDisplay = () => {
    // For super admin with selected company
    if (isSuperAdmin && selectedCompanyId) {
      const company = companies.find(c => c.id === selectedCompanyId);
      if (company?.name) return company.name;
    }
    
    // Get from state
    if (displayCompanyName && displayCompanyName !== "N/A") {
      return displayCompanyName;
    }
    
    // Final fallback
    return "Votre entreprise";
  };

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
        // For regular users, try to get company name from profile
        try {
          const profileResponse = await api.getProfile();
          if (profileResponse.data?.user?.company?.name) {
            companyNameToUse = profileResponse.data.user.company.name;
            
            // Store wheel limit from company data
            if (profileResponse.data.user.company.maxWheels) {
              setWheelsLimit(profileResponse.data.user.company.maxWheels);
            }
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
  
  // Handle company selection change
  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCompanyId = e.target.value;
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

  const handleCreateRoue = () => {
    // For super admin, include the company ID in navigation state
    if (isSuperAdmin && selectedCompanyId) {
      navigate("/roues/create", { state: { companyId: selectedCompanyId } })
    } else {
      navigate("/roues/create")
    }
  }

  const handleEditRoue = (id: string) => {
    navigate(`/roues/edit/${id}`)
  }

  const handleDeleteRoue = async (id: string) => {
    try {
      setDeleting(id)
      
      // Use the current company ID for API calls
      const companyIdToUse = isSuperAdmin ? selectedCompanyId : localStorage.getItem('companyId');
      
      if (!companyIdToUse) {
        throw new Error("No company ID available");
      }
      
      await apiClient.delete(`/companies/${companyIdToUse}/wheels/${id}`);
      setRoues(roues.filter(roue => roue.id !== id));
      
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

  const handleViewRoue = (id: string) => {
    navigate(`/roues/${id}`)
  }

  const handleViewQRCode = (id: string) => {
    setSelectedWheelForQR(id)
  }

  const handleCopyLink = (id: string) => {
    // Create the link to the wheel
    const wheelLink = `${window.location.origin}/play/company/${id}`
    
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
    ? roues.filter(
    (roue) =>
          (roue.entreprise?.toLowerCase()?.includes(searchTerm.toLowerCase()) || false) ||
          (roue.nom?.toLowerCase()?.includes(searchTerm.toLowerCase()) || false)
  )
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Roues</h1>
          <p className="text-gray-600 dark:text-gray-400">Créez et gérez vos campagnes de roue.</p>
        </div>
        {/* Only show button if not super admin or if super admin has selected a company */}
        {(!isSuperAdmin || (isSuperAdmin && selectedCompanyId)) && (
          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium">{wheelsUsed}</span> / <span className="font-medium">{wheelsLimit}</span> roues utilisées
            </div>
            <Button className="flex items-center space-x-2" onClick={handleCreateRoue}>
              <Plus className="h-4 w-4" />
              <span>Nouvelle roue</span>
            </Button>
          </div>
        )}
      </div>

      {/* Company selector for super admin */}
      {isSuperAdmin && (
        <Card className="mb-2">
          <CardContent className="p-4">
            <div className="flex flex-col space-y-2">
              <label htmlFor="company-selector" className="text-sm font-medium text-gray-700">
                Sélectionner une entreprise
              </label>
              <select
                id="company-selector"
                value={selectedCompanyId}
                onChange={handleCompanyChange}
                className="w-full sm:w-96 rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              >
                <option value="">-- Choisir une entreprise --</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            {/* Only show add button if not super admin or if super admin has selected a company */}
            {(!isSuperAdmin || (isSuperAdmin && selectedCompanyId)) && (
              <Button variant="outline" size="sm" className="flex items-center space-x-2" onClick={handleCreateRoue}>
              <Plus className="h-4 w-4" />
              <span>Ajouter</span>
            </Button>
            )}
            <Button variant="outline" size="sm" className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span>Filtrer</span>
            </Button>
            <Button variant="outline" size="sm" className="flex items-center space-x-2">
              <ArrowUpDown className="h-4 w-4" />
              <span>Trier</span>
            </Button>
            <div className="flex-1"></div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 w-64"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Empty state for when super admin hasn't selected a company */}
      {isSuperAdmin && !selectedCompanyId && !loading && (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
            <Search className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Sélectionnez une entreprise</h3>
          <p className="mt-1 text-sm text-gray-500">
            Veuillez d'abord sélectionner une entreprise pour voir ses roues.
          </p>
        </Card>
      )}

      {/* Roues Table (only show if not super admin or if super admin has selected a company) */}
      {(!isSuperAdmin || (isSuperAdmin && selectedCompanyId)) && !loading && (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <input type="checkbox" className="rounded border-gray-300" />
                </TableHead>
                <TableHead>Entreprise</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Parties</TableHead>
                <TableHead>Liens</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoues.map((roue) => (
                <TableRow key={roue.id}>
                  <TableCell>
                    <input type="checkbox" className="rounded border-gray-300" />
                  </TableCell>
                  <TableCell className="font-medium">{roue.entreprise}</TableCell>
                  <TableCell>{roue.nom}</TableCell>
                  <TableCell>
                    <Badge variant={getTypeVariant(roue.type)}>{roue.type}</Badge>
                  </TableCell>
                  <TableCell>{roue.parties.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                        <div title="Voir la roue">
                          <Eye 
                            className="h-4 w-4 text-gray-400 hover:text-purple-600 cursor-pointer" 
                            onClick={() => handleViewRoue(roue.id)}
                          />
                        </div>
                        <div title="Voir le QR code">
                          <QrCode 
                            className="h-4 w-4 text-gray-400 hover:text-purple-600 cursor-pointer" 
                            onClick={() => handleViewQRCode(roue.id)}
                          />
                        </div>
                        <div title="Copier le lien">
                          <LinkIcon 
                            className="h-4 w-4 text-gray-400 hover:text-purple-600 cursor-pointer"
                            onClick={() => handleCopyLink(roue.id)}
                          />
                        </div>
                        <span 
                          className="text-purple-600 hover:underline cursor-pointer"
                          onClick={() => handleCopyLink(roue.id)}
                        >
                          {roue.liens}
                        </span>
                    </div>
                  </TableCell>
                  <TableCell>
                      <Badge 
                        variant={getStatusVariant(roue.statut)}
                        className="cursor-pointer"
                        onClick={() => handleToggleStatus(roue.id, roue.statut)}
                      >
                        {roue.statut}
                      </Badge>
                  </TableCell>
                  <TableCell>
                      <div className="flex space-x-2">
                        <button 
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" 
                          onClick={() => handleEditRoue(roue.id)}
                        >
                          <Edit className="h-4 w-4 text-blue-500" />
                        </button>
                        <button 
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" 
                          onClick={() => handleDeleteRoue(roue.id)}
                          disabled={deleting === roue.id}
                        >
                          {deleting === roue.id ? (
                            <div className="h-4 w-4 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-red-500" />
                          )}
                    </button>
                      </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      )}

      {/* QR Code Dialog */}
      <Dialog open={!!selectedWheelForQR} onOpenChange={(open) => !open && setSelectedWheelForQR(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code</DialogTitle>
            <DialogDescription>
              Scannez ce QR code ou partagez-le pour accéder à votre roue.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6">
            {selectedWheelForQR && (
              <>
                <div className="w-64 h-64 bg-white p-4 rounded-md shadow-md flex items-center justify-center">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/play/company/${selectedWheelForQR}`)}`} 
                    alt="QR Code"
                    className="w-full h-full"
                  />
                </div>
                <Button 
                  className="mt-4"
                  onClick={() => handleCopyLink(selectedWheelForQR)}
                >
                  Copier le lien
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Pagination */}
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
    </div>
  )
}

export default Roues