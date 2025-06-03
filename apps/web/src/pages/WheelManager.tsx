import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { apiClient } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { Plus, Edit, Trash2, Play, ToggleLeft, ToggleRight, Loader2, ExternalLink, Copy, QrCode, Download } from 'lucide-react';
import { toast } from '../hooks/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';

const WheelManager = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wheels, setWheels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [wheelToDelete, setWheelToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  
  // Add companies state for super admin
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const isSuperAdmin = user?.role === 'SUPER';
  
  // State for wheel limits
  const [currentWheelCount, setCurrentWheelCount] = useState(0);
  const [maxWheelsAllowed, setMaxWheelsAllowed] = useState<number | null>(null); // null if not applicable or plan is unlimited
  
  // State for plan details
  const [planName, setPlanName] = useState<string | null>(null);
  const [maxPlaysAllowed, setMaxPlaysAllowed] = useState<number | null>(null);
  const [currentPlaysCount, setCurrentPlaysCount] = useState(0);

  // QR code modal state
  const [selectedWheel, setSelectedWheel] = useState<any | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  // Both SUPER and ADMIN users can create, edit, and delete wheels
  const canEdit = user?.role === 'SUPER' || user?.role === 'ADMIN';

  useEffect(() => {
    // If super admin, fetch companies first
    if (isSuperAdmin) {
      fetchCompanies();
    } else {
      fetchWheels();
    }
  }, [isSuperAdmin]);

  // Add effect to fetch wheels when selected company changes
  useEffect(() => {
    if (isSuperAdmin && selectedCompanyId) {
      fetchWheels(selectedCompanyId);
    }
  }, [selectedCompanyId]);

  // Add function to fetch companies
  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      const response = await api.getAllCompanies();
      if (response.data && response.data.companies) {
        setCompanies(response.data.companies);
        
        // Get stored company ID from localStorage or use the first company
        const storedCompanyId = localStorage.getItem('companyId');
        let companyToSelect = null;

        if (storedCompanyId && response.data.companies.some((c: any) => c.id === storedCompanyId)) {
          companyToSelect = response.data.companies.find((c: any) => c.id === storedCompanyId);
        } else if (response.data.companies.length > 0) {
          companyToSelect = response.data.companies[0];
        }

        if (companyToSelect) {
          setSelectedCompanyId(companyToSelect.id);
          localStorage.setItem('companyId', companyToSelect.id);
          // Assuming company object might have these details for plan limit
          setMaxWheelsAllowed(companyToSelect.maxWheelsAllowed || companyToSelect.max_wheels || null);
          setPlanName(companyToSelect.planName || null);
          setMaxPlaysAllowed(companyToSelect.maxPlaysAllowed || null);
          setCurrentPlaysCount(companyToSelect.currentPlaysCount || 0);
          fetchWheels(companyToSelect.id, companyToSelect.maxWheelsAllowed || companyToSelect.max_wheels || null, {
            planName: companyToSelect.planName || null,
            maxPlaysAllowed: companyToSelect.maxPlaysAllowed || null,
            currentPlaysCount: companyToSelect.currentPlaysCount || 0,
          });
        } else {
          setMaxWheelsAllowed(null); // No company selected or no companies
          setPlanName(null);
          setMaxPlaysAllowed(null);
          setCurrentPlaysCount(0);
          setCurrentWheelCount(0);
          setWheels([]);
          setIsLoading(false);
        }
      } else {
        setMaxWheelsAllowed(null);
        setCurrentWheelCount(0);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      setError('Failed to load companies. Please try again.');
      setIsLoading(false);
    }
  };

  // Handle company selection change
  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCompanyId = e.target.value;
    setSelectedCompanyId(newCompanyId);
    localStorage.setItem('companyId', newCompanyId);
    const company = companies.find(c => c.id === newCompanyId);
    const companyMaxWheels = company?.maxWheelsAllowed || company?.max_wheels || null;
    const companyPlanName = company?.planName || null;
    const companyMaxPlays = company?.maxPlaysAllowed || null;
    const companyCurrentPlays = company?.currentPlaysCount || 0;

    setMaxWheelsAllowed(companyMaxWheels);
    setPlanName(companyPlanName);
    setMaxPlaysAllowed(companyMaxPlays);
    setCurrentPlaysCount(companyCurrentPlays);

    fetchWheels(newCompanyId, companyMaxWheels, {
      planName: companyPlanName,
      maxPlaysAllowed: companyMaxPlays,
      currentPlaysCount: companyCurrentPlays,
    }); // Pass it to fetchWheels
  };

  const fetchWheels = async (specificCompanyId?: string, companyMaxWheels?: number | null, companyPlanDetails?: { planName: string | null; maxPlaysAllowed: number | null; currentPlaysCount: number; }) => {
    try {
      setIsLoading(true);
      setError(null);
      setCurrentWheelCount(0); // Reset count before fetching
      
      // If companyMaxWheels is passed, use it.
      if (companyMaxWheels !== undefined) {
        setMaxWheelsAllowed(companyMaxWheels);
      }
      // If companyPlanDetails are passed, use them.
      if (companyPlanDetails) {
        setPlanName(companyPlanDetails.planName);
        setMaxPlaysAllowed(companyPlanDetails.maxPlaysAllowed);
        setCurrentPlaysCount(companyPlanDetails.currentPlaysCount);
      }
      
      let companyIdToUse = specificCompanyId;
      
      // If no specific company ID is provided and user is not super admin
      if (!companyIdToUse && !isSuperAdmin) {
        // Get from localStorage or validate
        const storedCompanyId = localStorage.getItem('companyId');
        if (!storedCompanyId || storedCompanyId === 'null') {
          try {
            const validationResponse = await api.getValidCompanyId();
            if (validationResponse.data.companyId) {
              localStorage.setItem('companyId', validationResponse.data.companyId);
              companyIdToUse = validationResponse.data.companyId;
              setCompanyId(validationResponse.data.companyId);
            }
          } catch (validationError) {
            console.error('Error validating company ID:', validationError);
          }
        } else {
          companyIdToUse = storedCompanyId;
          setCompanyId(storedCompanyId);
        }
      }
      
      if (!companyIdToUse && isSuperAdmin) {
        // For super admin without a company ID, just show empty list
        setWheels([]);
        setIsLoading(false);
        return;
      }
      
      // Override the API call to use our specific company ID
      let response;
      if (companyIdToUse) {
        response = await apiClient.get(`/companies/${companyIdToUse}/wheels`);
      } else {
        response = await api.getWheels(); // This ideally should also return maxWheelsAllowed for the user's company
      }
      
      setWheels(response.data.wheels || []);
      setCurrentWheelCount(response.data.wheels?.length || 0);

      // Attempt to get maxWheelsAllowed from the response if not already set by company context
      // This is a common place for an API to return such metadata.
      if (maxWheelsAllowed === null && response.data.meta?.maxWheelsAllowed !== undefined) {
        setMaxWheelsAllowed(response.data.meta.maxWheelsAllowed);
      }
      if (planName === null && response.data.meta?.planName !== undefined) {
        setPlanName(response.data.meta.planName);
      }
      if (maxPlaysAllowed === null && response.data.meta?.maxPlaysAllowed !== undefined) {
        setMaxPlaysAllowed(response.data.meta.maxPlaysAllowed);
      }
      if (response.data.meta?.currentPlaysCount !== undefined) { // Always update current plays from the most direct source
        setCurrentPlaysCount(response.data.meta.currentPlaysCount);
      }
      
      // For non-superadmin, these details might also come from the user object or a dedicated plan endpoint
      if (!isSuperAdmin) {
        if (maxWheelsAllowed === null) setMaxWheelsAllowed(user?.company?.maxWheelsAllowed || user?.company?.max_wheels || null);
        if (planName === null) setPlanName(user?.company?.planName || null);
        if (maxPlaysAllowed === null) setMaxPlaysAllowed(user?.company?.maxPlaysAllowed || null);
        if (currentPlaysCount === 0 && user?.company?.currentPlaysCount) setCurrentPlaysCount(user?.company?.currentPlaysCount || 0);
      }

    } catch (error) {
      console.error('Error fetching wheels:', error);
      setError('Failed to load wheels. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWheel = () => {
    // For super admin, include the company ID in navigation state
    if (isSuperAdmin && selectedCompanyId) {
      navigate('/roues/new', { state: { companyId: selectedCompanyId } });
    } else {
      navigate('/roues/new');
    }
  };

  const handleEditWheel = (wheelId: string) => {
    navigate(`/roues/${wheelId}`);
  };

  const confirmDelete = (wheelId: string) => {
    setWheelToDelete(wheelId);
    setShowDeleteModal(true);
  };

  const handleDeleteWheel = async () => {
    if (!wheelToDelete) return;

    try {
      setIsDeleting(true);
      await api.deleteWheel(wheelToDelete);
      // Remove the deleted wheel from state
      setWheels(wheels.filter(wheel => wheel.id !== wheelToDelete));
      setShowDeleteModal(false);
      setWheelToDelete(null);
    } catch (error) {
      console.error('Error deleting wheel:', error);
      setError('Failed to delete wheel. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (wheelId: string, currentState: boolean) => {
    try {
      const response = await api.updateWheel(wheelId, { isActive: !currentState });
      
      // Update local state with potentially new QR code
      setWheels(
        wheels.map(wheel => 
          wheel.id === wheelId ? { 
            ...wheel, 
            isActive: !currentState,
            qrCodeLink: response.data.wheel.qrCodeLink
          } : wheel
        )
      );

      if (!currentState) {
        toast({
          title: "Roue activée",
          description: "La roue est maintenant accessible publiquement.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error toggling wheel status:', error);
      setError('Failed to update wheel status. Please try again.');
    }
  };

  const getPublicWheelUrl = (wheelId: string) => {
    return `https://roue.izikado.fr/play/${companyId}/${wheelId}`;
  };
  
  const copyPublicUrl = (wheelId: string) => {
    const url = getPublicWheelUrl(wheelId);
    navigator.clipboard.writeText(url)
      .then(() => {
        toast({
          title: "URL copiée!",
          description: "L'URL de la roue a été copiée dans le presse-papiers.",
          variant: "default",
        });
      })
      .catch(err => {
        console.error('Failed to copy URL:', err);
        toast({
          title: "Échec de la copie",
          description: "Impossible de copier l'URL. Veuillez réessayer.",
          variant: "destructive",
        });
      });
  };
  
  const openPublicWheel = (wheelId: string) => {
    const url = getPublicWheelUrl(wheelId);
    window.open(url, '_blank');
  };

  const showQrCode = (wheel: any) => {
    setSelectedWheel(wheel);
    setShowQrModal(true);
  };

  const handleDownloadQR = () => {
    if (selectedWheel?.qrCodeLink) {
      // Create temporary link
      const link = document.createElement('a');
      link.href = selectedWheel.qrCodeLink;
      link.download = `wheel-qr-${selectedWheel.name}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header section */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campagnes de roues</h1>
          <p className="text-gray-600">
            Créez et gérez vos campagnes de roue à prix.
          </p>
        </div>
        {canEdit && (!isSuperAdmin || (isSuperAdmin && selectedCompanyId)) && (
          <button
            onClick={handleCreateWheel}
            disabled={maxWheelsAllowed !== null && currentWheelCount >= maxWheelsAllowed}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle roue
          </button>
        )}
      </div>
      
      {/* Company selector for super admin */}
      {isSuperAdmin && (
        <div className="mb-6">
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
        </div>
      )}

      {/* Wheel limits display */} 
      {(maxWheelsAllowed !== null || !isSuperAdmin || planName) && (
         <div className="mb-6 p-6 bg-white shadow-lg rounded-xl text-sm space-y-3">
          {planName && (
            <p className='text-lg font-semibold text-indigo-700'>Plan Actuel: <span className='text-gray-800'>{planName}</span></p>
          )}
          {maxWheelsAllowed !== null ? (
            <p className="text-gray-700">
              Utilisation des roues: <span className="font-bold text-gray-900">{currentWheelCount} / {maxWheelsAllowed}</span>.
              ({maxWheelsAllowed - currentWheelCount} restantes)
              {currentWheelCount >= maxWheelsAllowed && (
                <span className="text-red-600 ml-2 font-semibold">Limite de roues atteinte.</span>
              )}
            </p>
          ) : (
            <p className="text-gray-700">
              Nombre total de roues: <span className="font-bold text-gray-900">{currentWheelCount}</span>.
            </p>
          )}
          {maxPlaysAllowed !== null && (
            <p className="text-gray-700">
              Utilisation des jeux: <span className="font-bold text-gray-900">{currentPlaysCount} / {maxPlaysAllowed}</span>.
              ({maxPlaysAllowed - currentPlaysCount} jeux restants)
              {currentPlaysCount >= maxPlaysAllowed && (
                <span className="text-red-600 ml-2 font-semibold">Limite de jeux atteinte.</span>
              )}
            </p>
          )}
          {planName === 'Free Trial' && ( // Example condition for showing upgrade button
            <Button 
              onClick={() => navigate('/pricing')} // Or your upgrade path
              className='mt-3 bg-green-500 hover:bg-green-600 text-white'
            >
              Mettre à niveau le plan
            </Button>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Code QR pour la roue</DialogTitle>
            <DialogDescription>
              Scannez ce QR code pour accéder directement à la roue "{selectedWheel?.name}"
            </DialogDescription>
          </DialogHeader>
          
          {selectedWheel?.qrCodeLink ? (
            <div className="flex flex-col items-center justify-center py-4">
              <img 
                src={selectedWheel.qrCodeLink} 
                alt="QR Code" 
                className="h-64 w-64 rounded-lg border border-gray-200"
              />
              <p className="mt-4 text-sm text-gray-500 text-center">
                URL: {getPublicWheelUrl(selectedWheel.id)}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-gray-500">
                Cette roue n'a pas encore de code QR. Activez-la pour générer un code QR.
              </p>
            </div>
          )}
          
          <DialogFooter className="flex sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setShowQrModal(false)}
            >
              Fermer
            </Button>
            {selectedWheel?.qrCodeLink && (
              <Button 
                variant="default"
                onClick={handleDownloadQR}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Download className="mr-2 h-4 w-4" />
                Télécharger
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wheels list */}
      {wheels.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
            <Play className="h-6 w-6 text-indigo-600" />
          </div>
          {isSuperAdmin && !selectedCompanyId ? (
            <>
              <h3 className="mt-2 text-sm font-semibold text-gray-900">Sélectionnez une entreprise</h3>
              <p className="mt-1 text-sm text-gray-500">Veuillez d'abord sélectionner une entreprise pour voir ses roues.</p>
            </>
          ) : (
            <>
              <h3 className="mt-2 text-sm font-semibold text-gray-900">Aucune roue</h3>
              <p className="mt-1 text-sm text-gray-500">Commencez par créer une nouvelle campagne de roue.</p>
              {canEdit && (
                <button
                  onClick={handleCreateWheel}
                  className="mt-6 inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  <Plus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                  Nouvelle roue
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Nom
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Mode
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Statut
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Cases
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Parties
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Lien public
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {wheels.map((wheel) => (
                  <tr key={wheel.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {wheel.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        wheel.mode === 'ALL_WIN' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {wheel.mode === 'ALL_WIN' ? 'Gagnant à tous les coups' : 'Gain aléatoire'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {canEdit ? (
                        <button 
                          onClick={() => handleToggleActive(wheel.id, wheel.isActive)}
                          className="flex items-center text-sm font-medium"
                          title={wheel.isActive ? 'Désactiver' : 'Activer'}
                        >
                          {wheel.isActive ? (
                            <>
                              <ToggleRight className="mr-1 h-5 w-5 text-green-500" />
                              <span className="text-green-600">Actif</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="mr-1 h-5 w-5 text-gray-400" />
                              <span className="text-gray-500">Inactif</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          wheel.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {wheel.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {wheel._count?.slots || 0}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {wheel._count?.plays || 0}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {wheel.isActive && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => copyPublicUrl(wheel.id)}
                            className="rounded p-1 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                            title="Copier le lien public"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openPublicWheel(wheel.id)}
                            className="rounded p-1 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-900"
                            title="Ouvrir la roue publique"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => showQrCode(wheel)}
                            className="rounded p-1 text-purple-600 hover:bg-purple-100 hover:text-purple-900"
                            title="Afficher le code QR"
                          >
                            <QrCode className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                      {!wheel.isActive && (
                        <span className="text-xs text-gray-400">Activer la roue pour partager</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEditWheel(wheel.id)}
                          className="rounded p-1 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-900"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => confirmDelete(wheel.id)}
                            className="rounded p-1 text-red-600 hover:bg-red-100 hover:text-red-900"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Trash2 className="h-6 w-6 text-red-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                      Delete Wheel
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete this wheel? All associated data will be permanently removed.
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button 
                  type="button" 
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleDeleteWheel}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
                <button 
                  type="button" 
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WheelManager;