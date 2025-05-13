import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useToast } from '../hooks/use-toast';
import { ChevronLeft, Save, Plus, Trash2, Target } from 'lucide-react';

type Slot = {
  id?: string;
  label: string;
  weight: number;
  prizeCode: string;
};

type WheelData = {
  id?: string;
  name: string;
  mode: 'ALL_WIN' | 'RANDOM_WIN';
  formSchema: Record<string, any>;
  isActive: boolean;
  slots: Slot[];
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

  useEffect(() => {
    if (!isNew) {
      fetchWheelData();
    } else {
      setIsLoading(false);
      // Fetch companies for dropdown
      api.getCompanies().then(res => {
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
    setWheel(prev => ({
      ...prev,
      slots: [
        ...prev.slots,
        { label: 'New Prize', weight: 10, prizeCode: 'PRIZE' + (prev.slots.length + 1) },
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

  const validateSlots = (): boolean => {
    if (wheel.slots.length < 2) {
      toast({
        variant: 'destructive',
        title: 'Erreur de validation',
        description: 'Vous devez avoir au moins 2 cases sur la roue.',
      });
      return false;
    }

    // No need to check for sum == 100 with weights
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSlots()) return;
    if (isNew && !selectedCompanyId) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez sélectionner une entreprise pour cette roue.',
      });
      return;
    }
    setIsSaving(true);
    try {
      let savedWheel;
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
        // Create slots
        if (savedWheel.id) {
          await api.bulkUpdateSlots(savedWheel.id, wheel.slots);
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
      }
      
      toast({
        variant: 'success',
        title: 'Succès',
        description: `La roue ${isNew ? 'créée' : 'mise à jour'} avec succès!`,
      });
      
      navigate('/wheels');
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
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                >
                  <option value="">Sélectionnez une entreprise</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
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
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Promotion d'été"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Mode de la roue
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
          <h2 className="mb-4 text-lg font-medium text-gray-900">Champs du formulaire participant</h2>
          <p className="mb-4 text-sm text-gray-600">
            Sélectionnez les champs à collecter des utilisateurs avant qu'ils tournent la roue
          </p>
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
            <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-2">Cases de la roue</h2>
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
                          className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="Nom du lot"
                          required
                        />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <input
                          type="text"
                          value={slot.prizeCode}
                          onChange={(e) => handleSlotChange(index, 'prizeCode', e.target.value)}
                          className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="PRIZE1"
                          required
                        />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <input
                          type="number"
                          min="1"
                          value={slot.weight}
                          onChange={(e) => handleSlotChange(index, 'weight', e.target.value)}
                          className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          required
                        />
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