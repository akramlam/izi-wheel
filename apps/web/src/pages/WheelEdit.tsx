import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useToast } from '../hooks/use-toast';
import { ChevronLeft, Save, Plus, Trash2, Target, Info, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@radix-ui/react-tooltip';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';

// Predefined colors for slots
const PRESET_COLORS = [
  '#FF6384', // Pink
  '#36A2EB', // Blue
  '#FFCE56', // Yellow
  '#4BC0C0', // Teal
  '#9966FF', // Purple
  '#FF9F40', // Orange
  '#C9CBCF', // Grey
  '#7CFC00', // Lawn Green
  '#FF4500', // Orange Red
  '#1E90FF', // Dodger Blue
];

type Slot = {
  id?: string;
  label: string;
  weight: number;
  prizeCode: string;
  color?: string;
};

type WheelData = {
  id?: string;
  name: string;
  mode: 'ALL_WIN' | 'RANDOM_WIN';
  formSchema: Record<string, any>;
  isActive: boolean;
  slots: Slot[];
  qrCodeLink?: string;
};

const WheelEdit = () => {
  const { wheelId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = wheelId === 'new';

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [wheel, setWheel] = useState<WheelData>({
    name: '',
    mode: 'RANDOM_WIN',
    formSchema: { name: true, email: true, phone: false },
    isActive: false,
    slots: [],
  });
  // Company selection state
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Added state for QR code modal
  const [showQrModal, setShowQrModal] = useState(false);
  const [newWheelData, setNewWheelData] = useState<{
    wheel: WheelData;
    publicUrl: string;
  } | null>(null);

  useEffect(() => {
    if (!isNew) {
      fetchWheelData();
    } else {
      setIsLoading(false);
      // Fetch companies for dropdown
      api.getAllCompanies().then(res => {
        setCompanies(res.data.companies || []);
      });
    }
  }, [wheelId]);

  const fetchWheelData = async () => {
    try {
      setIsLoading(true);
      const response = await api.getWheel(wheelId!);
      const wheelData = response.data.wheel;

      // Also fetch slots if they're not included in the wheel response
      if (!wheelData.slots) {
        const slotsResponse = await api.getSlots(wheelId!);
        wheelData.slots = slotsResponse.data.slots || [];
      }

      setWheel(wheelData);
    } catch (error) {
      console.error('Erreur de chargement des données de la roue:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger les données de la roue. Veuillez réessayer.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    // Clear any errors related to this field
    setFormErrors(prev => {
      const updated = { ...prev };
      delete updated[name];
      return updated;
    });

    setWheel(prev => ({
      ...prev,
      [name]: newValue,
    }));
  };

  const handleFormSchemaChange = (field: string, checked: boolean) => {
    setWheel(prev => ({
      ...prev,
      formSchema: {
        ...prev.formSchema,
        [field]: checked,
      },
    }));
  };

  const handleSlotChange = (index: number, field: string, value: string | number) => {
    // Clear any errors related to this field
    setFormErrors(prev => {
      const updated = { ...prev };
      delete updated[`slots[${index}].${field}`];
      return updated;
    });

    const updatedSlots = [...wheel.slots];
    updatedSlots[index] = {
      ...updatedSlots[index],
      [field]: field === 'weight' ? Number(value) : value,
    };

    setWheel(prev => ({
      ...prev,
      slots: updatedSlots,
    }));
  };

  const addSlot = () => {
    // Get a random color from our predefined colors
    const randomColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
    
    setWheel(prev => ({
      ...prev,
      slots: [
        ...prev.slots,
        { 
          label: 'New Prize', 
          weight: 10, 
          prizeCode: 'PRIZE' + (prev.slots.length + 1),
          color: randomColor
        },
      ],
    }));
  };

  const removeSlot = (index: number) => {
    const updatedSlots = wheel.slots.filter((_, i) => i !== index);
    setWheel(prev => ({
      ...prev,
      slots: updatedSlots,
    }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Validate basic fields
    if (!wheel.name.trim()) {
      errors['name'] = 'Le nom de la roue est requis';
    }
    
    // Validate company selection for new wheels
    if (isNew && !selectedCompanyId) {
      errors['selectedCompanyId'] = 'Veuillez sélectionner une entreprise';
    }

    // Validate slots
    if (wheel.slots.length < 2) {
      errors['slots'] = 'Vous devez avoir au moins 2 cases sur la roue';
    } else {
      // Validate individual slots
      wheel.slots.forEach((slot, index) => {
        if (!slot.label.trim()) {
          errors[`slots[${index}].label`] = 'Le libellé est requis';
        }
        if (!slot.prizeCode.trim()) {
          errors[`slots[${index}].prizeCode`] = 'Le code du lot est requis';
        }
        if (slot.weight <= 0) {
          errors[`slots[${index}].weight`] = 'Le poids doit être supérieur à 0';
        }
      });
    }

    // Check if at least one form field is selected
    if (!wheel.formSchema.name && !wheel.formSchema.email && !wheel.formSchema.phone) {
      errors['formSchema'] = 'Sélectionnez au moins un champ pour le formulaire';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSaving(true);
    try {
      let savedWheel;
      let publicUrl;
      
      if (isNew) {
        // Create new wheel with companyId
        const response = await api.createWheel({
          name: wheel.name,
          mode: wheel.mode,
          formSchema: wheel.formSchema,
          isActive: wheel.isActive,
          companyId: selectedCompanyId,
        });
        
        savedWheel = response.data.wheel;
        publicUrl = response.data.publicUrl;
        
        // Create slots
        if (savedWheel.id) {
          await api.bulkUpdateSlots(savedWheel.id, wheel.slots);
        }
        
        // Set data for QR code modal if wheel is active and has QR code
        if (savedWheel.isActive && savedWheel.qrCodeLink) {
          setNewWheelData({
            wheel: savedWheel,
            publicUrl: publicUrl
          });
          setShowQrModal(true);
        } else {
          // Show success toast and navigate if not showing QR modal
          toast({
            variant: 'success',
            title: 'Succès',
            description: `La roue créée avec succès!`,
          });
          
          navigate('/wheels');
        }
      } else {
        // Update wheel
        const response = await api.updateWheel(wheelId!, {
          name: wheel.name,
          mode: wheel.mode,
          formSchema: wheel.formSchema,
          isActive: wheel.isActive,
        });
        savedWheel = response.data.wheel;
        
        // Update slots
        if (savedWheel.id) {
          await api.bulkUpdateSlots(savedWheel.id, wheel.slots);
        }
        
        toast({
          variant: 'success',
          title: 'Succès',
          description: `La roue mise à jour avec succès!`,
        });
        
        navigate('/wheels');
      }
    } catch (error) {
      console.error('Erreur de sauvegarde de la roue:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: `Impossible de ${isNew ? 'créer' : 'mettre à jour'} la roue. Veuillez réessayer.`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadQR = () => {
    if (newWheelData?.wheel.qrCodeLink) {
      // Create temporary link
      const link = document.createElement('a');
      link.href = newWheelData.wheel.qrCodeLink;
      link.download = `wheel-qr-${newWheelData.wheel.name}.png`;
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
    <div className="h-full overflow-y-auto pb-10">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/wheels')}
          className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-indigo-600"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Retour aux roues
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{isNew ? 'Créer une nouvelle roue' : 'Modifier la roue'}</h1>
      </div>

      {/* QR Code Modal */}
      <Dialog 
        open={showQrModal} 
        onOpenChange={(open) => {
          setShowQrModal(open);
          if (!open) navigate('/wheels');
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Votre roue est prête !</DialogTitle>
            <DialogDescription>
              Votre roue a été créée avec succès. Utilisez ce QR code pour partager votre roue.
            </DialogDescription>
          </DialogHeader>
          
          {newWheelData?.wheel.qrCodeLink ? (
            <div className="flex flex-col items-center justify-center py-4">
              <img 
                src={newWheelData.wheel.qrCodeLink} 
                alt="QR Code" 
                className="h-64 w-64 rounded-lg border border-gray-200"
              />
              <p className="mt-4 text-sm text-gray-500 text-center">
                URL: {newWheelData.publicUrl}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-gray-500">
                Aucun QR code disponible.
              </p>
            </div>
          )}
          
          <DialogFooter className="flex sm:justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setShowQrModal(false);
                navigate('/wheels');
              }}
            >
              Fermer
            </Button>
            {newWheelData?.wheel.qrCodeLink && (
              <Button 
                variant="default"
                onClick={handleDownloadQR}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Télécharger le QR code
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Wheel info card */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-medium text-gray-900">Informations sur la roue</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Company select (only when creating) */}
            {isNew && (
              <div className="col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">Entreprise</label>
                <select
                  value={selectedCompanyId}
                  onChange={e => setSelectedCompanyId(e.target.value)}
                  className={`block w-full rounded-md border ${formErrors.selectedCompanyId ? 'border-red-500' : 'border-gray-300'} px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                  required
                >
                  <option value="">Sélectionnez une entreprise</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
                {formErrors.selectedCompanyId && (
                  <p className="mt-1 text-xs text-red-500">{formErrors.selectedCompanyId}</p>
                )}
              </div>
            )}
            <div className="col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Nom de la roue
              </label>
              <input
                type="text"
                name="name"
                value={wheel.name}
                onChange={handleChange}
                className={`block w-full rounded-md border ${formErrors.name ? 'border-red-500' : 'border-gray-300'} px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                placeholder="Promotion d'été"
                required
              />
              {formErrors.name && (
                <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 flex items-center">
                Mode de la roue
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="ml-1">
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs p-2 bg-gray-800 text-white text-xs rounded">
                      <p>Gain aléatoire: Les utilisateurs gagnent selon les probabilités définies</p>
                      <p>Gagnant à tous les coups: Tous les utilisateurs gagnent un prix</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </label>
              <select
                name="mode"
                value={wheel.mode}
                onChange={handleChange}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="RANDOM_WIN">Gain aléatoire</option>
                <option value="ALL_WIN">Gagnant à tous les coups</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Statut
              </label>
              <div className="mt-2 flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={wheel.isActive}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">Actif</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form fields card */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Champs du formulaire participant</h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="ml-2">
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs p-2 bg-gray-800 text-white text-xs rounded">
                  Ces champs seront affichés aux utilisateurs avant qu'ils puissent tourner la roue.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="mb-4 text-sm text-gray-600">
            Sélectionnez les champs à collecter des utilisateurs avant qu'ils tournent la roue
          </p>
          {formErrors.formSchema && (
            <p className="mb-2 text-xs text-red-500">{formErrors.formSchema}</p>
          )}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="field-name"
                checked={wheel.formSchema.name || false}
                onChange={(e) => handleFormSchemaChange('name', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="field-name" className="ml-2 text-sm text-gray-700">
                Nom
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="field-email"
                checked={wheel.formSchema.email || false}
                onChange={(e) => handleFormSchemaChange('email', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="field-email" className="ml-2 text-sm text-gray-700">
                Email
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="field-phone"
                checked={wheel.formSchema.phone || false}
                onChange={(e) => handleFormSchemaChange('phone', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="field-phone" className="ml-2 text-sm text-gray-700">
                Téléphone
              </label>
            </div>
          </div>
        </div>

        {/* Slots card */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center">
              <h2 className="text-lg font-semibold text-gray-900">Cases de la roue</h2>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="ml-2">
                      <HelpCircle className="h-4 w-4 text-gray-400" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs p-2 bg-gray-800 text-white text-xs rounded">
                    Chaque case représente un lot possible sur la roue. Le poids détermine la probabilité que cette case soit choisie.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <button
              type="button"
              onClick={addSlot}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="mr-2 h-4 w-4" /> Ajouter une case
            </button>
          </div>
          
          <div className="mb-2 text-right text-sm text-gray-500">
            Poids total : {wheel.slots.reduce((sum, slot) => sum + slot.weight, 0)}
          </div>

          {formErrors.slots && (
            <p className="mb-2 text-sm text-red-500">{formErrors.slots}</p>
          )}

          {wheel.slots.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                <Target className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune case</h3>
              <p className="mt-1 text-sm text-gray-500">Ajoutez des cases à votre roue pour commencer.</p>
              <button
                type="button"
                onClick={addSlot}
                className="mt-4 inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <Plus className="mr-1 h-4 w-4" />
                Ajouter une case
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Libellé du lot
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Code du lot
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Couleur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Poids
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {wheel.slots.map((slot, index) => (
                    <tr key={index}>
                      <td className="whitespace-nowrap px-6 py-4">
                        <input
                          type="text"
                          value={slot.label}
                          onChange={(e) => handleSlotChange(index, 'label', e.target.value)}
                          className={`block w-full rounded-md border ${formErrors[`slots[${index}].label`] ? 'border-red-500' : 'border-gray-300'} px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                          placeholder="Nom du lot"
                          required
                        />
                        {formErrors[`slots[${index}].label`] && (
                          <p className="mt-1 text-xs text-red-500">{formErrors[`slots[${index}].label`]}</p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <input
                          type="text"
                          value={slot.prizeCode}
                          onChange={(e) => handleSlotChange(index, 'prizeCode', e.target.value)}
                          className={`block w-full rounded-md border ${formErrors[`slots[${index}].prizeCode`] ? 'border-red-500' : 'border-gray-300'} px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                          placeholder="PRIZE1"
                          required
                        />
                        {formErrors[`slots[${index}].prizeCode`] && (
                          <p className="mt-1 text-xs text-red-500">{formErrors[`slots[${index}].prizeCode`]}</p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <input
                          type="color"
                          value={slot.color || '#FF6384'}
                          onChange={(e) => handleSlotChange(index, 'color', e.target.value)}
                          className="h-10 w-full cursor-pointer"
                        />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <input
                          type="number"
                          min="1"
                          value={slot.weight}
                          onChange={(e) => handleSlotChange(index, 'weight', e.target.value)}
                          className={`block w-full rounded-md border ${formErrors[`slots[${index}].weight`] ? 'border-red-500' : 'border-gray-300'} px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                          required
                        />
                        {formErrors[`slots[${index}].weight`] && (
                          <p className="mt-1 text-xs text-red-500">{formErrors[`slots[${index}].weight`]}</p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => removeSlot(index)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Submit button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {isSaving ? (
              <>
                <svg className="mr-2 h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isNew ? 'Créer la roue' : 'Enregistrer les modifications'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default WheelEdit; 