import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Wheel } from 'react-custom-roulette';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { toast } from '../hooks/use-toast';
import { Loader2 } from 'lucide-react';

// Define types
type WheelData = {
  id: string;
  name: string;
  formSchema: any;
  slots: {
    id: string;
    label: string;
    color: string;
    weight: number;
    isWinning: boolean;
  }[];
};

type FormField = {
  name: string;
  label: string;
  type: string;
  required: boolean;
};

type PlayResponse = {
  play: {
    id: string;
    result: 'WIN' | 'LOSE';
    prize?: {
      pin: string;
      qrLink: string;
    };
  };
  slot: {
    label: string;
  };
};

const PlayWheel = () => {
  const { companyId, wheelId } = useParams<{ companyId: string; wheelId: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeIndex, setPrizeIndex] = useState(0);
  const [showResultModal, setShowResultModal] = useState(false);
  const [wheelColors, setWheelColors] = useState<string[]>([]);
  const [spinResult, setSpinResult] = useState<PlayResponse | null>(null);
  const [formFields, setFormFields] = useState<FormField[]>([]);

  // Fetch wheel data
  const { data: wheelData, isLoading: isLoadingWheel, error: wheelError } = useQuery<WheelData>({
    queryKey: ['wheel', companyId, wheelId],
    queryFn: async () => {
      try {
        const response = await api.getPublicWheel(companyId || '', wheelId || '');
        return response.data.wheel;
      } catch (error) {
        console.error('Error fetching wheel data:', error);
        throw error;
      }
    },
    enabled: !!companyId && !!wheelId,
  });

  // Prepare wheel data when loaded
  useEffect(() => {
    if (wheelData) {
      // Set wheel colors
      const colors = wheelData.slots.map(slot => 
        slot.color || (slot.isWinning ? '#28a745' : '#dc3545')
      );
      setWheelColors(colors);

      // Extract form fields from formSchema
      const fields: FormField[] = [];
      if (wheelData.formSchema) {
        if (Array.isArray(wheelData.formSchema.fields)) {
          // If formSchema has a fields array
          fields.push(...wheelData.formSchema.fields);
        } else if (typeof wheelData.formSchema === 'object') {
          // If formSchema is directly defining fields
          const defaultFields = [
            { name: 'name', label: 'Name', type: 'text', required: true },
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'phone', label: 'Phone', type: 'tel', required: false },
            { name: 'birthDate', label: 'Birth Date', type: 'date', required: false }
          ];
          fields.push(...defaultFields);
        }
      }
      setFormFields(fields);
    }
  }, [wheelData]);

  // Spin wheel mutation
  const { mutate: spinWheel, isPending: isSpinning } = useMutation({
    mutationFn: async () => {
      const response = await api.spinWheel(companyId || '', wheelId || '', {
        lead: formData
      });
      return response.data as PlayResponse;
    },
    onSuccess: (data) => {
      // Find the winning slot index
      const slotIndex = wheelData?.slots.findIndex(
        slot => slot.label === data.slot.label
      ) || 0;
      
      setPrizeIndex(slotIndex);
      setSpinResult(data);
      setMustSpin(true);
      
      // Show result after spinning animation completes
      setTimeout(() => {
        setShowResultModal(true);
        if (data.play.result === 'WIN') {
          toast({
            title: 'Congratulations!',
            description: 'You won a prize! Email sent with details.',
          });
        }
      }, 5000); // Wait for wheel animation to complete
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to spin the wheel. Please try again.',
      });
    }
  });

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    spinWheel();
  };

  const handleStopSpinning = () => {
    setMustSpin(false);
  };

  if (isLoadingWheel) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <span className="ml-2 text-lg">Chargement de la roue...</span>
      </div>
    );
  }

  if (wheelError || !wheelData) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4 text-center">
        <h1 className="mb-4 text-2xl font-bold text-red-600">Roue introuvable</h1>
        <p className="mb-6 text-gray-600">
          Désolé, cette roue n'existe pas ou n'est pas disponible.
        </p>
        <Button onClick={() => window.location.href = '/'}>
          Retour à l'accueil
        </Button>
      </div>
    );
  }

  const wheelOptions = {
    backgroundColors: wheelColors,
    textColors: Array(wheelData.slots.length).fill('#ffffff'),
    outerBorderColor: '#13113c',
    outerBorderWidth: 5,
    innerBorderColor: '#13113c',
    innerBorderWidth: 20,
    textDistance: 75,
    perpendicularText: true,
    radiusLineColor: '#ffffff40',
    radiusLineWidth: 1
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-lg bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            {wheelData.name}
          </h1>
          <p className="mt-2 text-gray-600">
            Remplissez le formulaire ci-dessous et tournez la roue pour gagner !
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Form Section */}
          <div className="space-y-6 sm:order-2">
            <h2 className="text-xl font-semibold text-gray-800">Entrez vos coordonnées</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {formFields.map((field) => (
                <div key={field.name}>
                  <label 
                    htmlFor={field.name} 
                    className="block text-sm font-medium text-gray-700"
                  >
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    id={field.name}
                    name={field.name}
                    type={field.type}
                    required={field.required}
                    value={formData[field.name] || ''}
                    onChange={handleFormChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              ))}

              <Button 
                type="submit" 
                className="mt-6 w-full bg-indigo-600 py-3 text-lg font-semibold hover:bg-indigo-700"
                disabled={isSpinning || mustSpin}
              >
                {isSpinning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Lancement en cours...
                  </>
                ) : (
                  'Tournez la roue !'
                )}
              </Button>
            </form>
          </div>

          {/* Wheel Section */}
          <div className="flex justify-center sm:order-1">
            <div className="relative h-80 w-80 sm:h-96 sm:w-96">
              <Wheel
                mustStartSpinning={mustSpin}
                prizeNumber={prizeIndex}
                data={wheelData.slots.map(slot => ({ option: slot.label }))}
                onStopSpinning={handleStopSpinning}
                {...wheelOptions}
                spinDuration={0.5}
              />
              {!mustSpin && !isSpinning && (
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform">
                  <div className="h-6 w-6 rounded-full bg-indigo-600 shadow-lg"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Result Modal */}
      <Dialog open={showResultModal} onOpenChange={setShowResultModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">
              {spinResult?.play.result === 'WIN' ? 'Félicitations ! 🎉' : 'Pas de chance cette fois 😔'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 text-center">
            {spinResult?.play.result === 'WIN' ? (
              <div className="space-y-4">
                <p className="text-lg font-medium text-gray-900">
                  Vous avez gagné: <span className="text-indigo-600">{spinResult.slot.label}</span>
                </p>
                
                <div className="rounded-md bg-gray-50 p-4">
                  <p className="mb-2 font-medium">Votre code PIN:</p>
                  <p className="text-2xl font-bold tracking-widest text-indigo-600">
                    {spinResult.play.prize?.pin}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Conservez ce code PIN pour récupérer votre lot
                  </p>
                </div>
                
                <div className="mx-auto max-w-xs">
                  <p className="mb-2 font-medium">Scannez le QR code pour récupérer votre lot:</p>
                  <img 
                    src={spinResult.play.prize?.qrLink} 
                    alt="QR Code" 
                    className="mx-auto h-48 w-48"
                  />
                </div>
              </div>
            ) : (
              <div className="py-6">
                <p className="text-lg text-gray-700">Vous n'avez pas gagné cette fois-ci.</p>
                <p className="mt-2 text-gray-600">Merci d'avoir participé !</p>
              </div>
            )}
          </div>
          
          <div className="flex justify-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => setShowResultModal(false)}
            >
              Fermer
            </Button>
            {spinResult?.play.result === 'WIN' && (
              <Button 
                onClick={() => navigate(`/redeem/${spinResult.play.id}`)}
              >
                Récupérer le lot
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlayWheel; 