import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '@/lib/api';
import { useToast } from '../hooks/use-toast';
import { ChevronLeft, Save, Plus, X, AlertCircle, Facebook, Instagram, Smartphone } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { useAuth } from '../hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

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

// Make sure we have consistent type definitions for frontend display values
type WheelDisplayType = "Gagnant à tous les coups" | "Gain aléatoire";
type WheelType = "ALL_WIN" | "RANDOM_WIN"; // Backend API enum values
type WheelStatus = "Actif" | "Inactif";

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
  type: WheelType; // Using backend enum values in our state
  statut: WheelStatus;
  slots: Slot[];
  companyId?: string;
  socialNetwork?: string;
  redirectUrl?: string;
  redirectText?: string;
  playLimit?: string;
  gameRules?: string;
  footerText?: string;
};

type Company = {
  id: string;
  name: string;
  color?: string;
};

// Define social network options
const SOCIAL_NETWORKS = [
  { value: 'GOOGLE', label: 'Google', icon: <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M12 11h8.88c.08.53.12 1.06.12 1.6 0 4.41-3.16 7.55-7.55 7.55-4.41 0-8-3.59-8-8s3.59-8 8-8c2.07 0 3.92.8 5.37 2.11l-2.19 2.11C15.17 7.4 13.65 6.95 12 6.95c-2.76 0-5 2.24-5 5s2.24 5 5 5c2.64 0 4.41-1.54 4.8-3.95H12v-2z"/></svg> },
  { value: 'INSTAGRAM', label: 'Instagram', icon: <Instagram className="h-4 w-4 mr-2" /> },
  { value: 'TIKTOK', label: 'TikTok', icon: <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.59-1.16-2.59-2.5a2.592 2.592 0 0 1 4.3-1.96V10.3a5.636 5.636 0 0 0-1.71-.26c-3.09 0-5.59 2.5-5.59 5.59s2.5 5.59 5.59 5.59 5.59-2.5 5.59-5.59V7.73c.99.79 2.22 1.25 3.59 1.25v-3.1c0-.02-2.44-.06-2.44-.06Z"/></svg> },
  { value: 'SNAPCHAT', label: 'Snapchat', icon: <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M12.206 4.1094c.1.0104.2063.0104.3063.0104.3906 0 2.6312.177 3.7312 2.4666.3833.8.2604 2.1.1937 3.177l-.0166.2605c-.0105.1354.1532.2187.2666.1666.1667-.0729.35-.1458.5458-.1458.2104 0 .4729.0626.6562.1666.2605.15.4209.3834.4209.6334 0 .2187-.1042.4375-.3126.6l-.2416.1937c-.3.2396-.7813.5834-.7813.8855 0 .1083.052.2187.1563.3125.3.2666 1.0396.5187 2.125.6312.0917.0084.1666.0813.1771.1646.0416.3209.1041.5084.1562.6563.0417.1187.1584.3.425.3h.0334c.1312 0 .2875-.0209.4604-.0209.1042 0 .2188.0105.3334.0209.2937.0208.5562.1979.7666.4375.3667.4104.7.9667 1.0333 1.6292.0334.0666.0105.1458-.0583.1875-.4063.2416-1.0125.45-1.9042.625-.0666.0125-.1208.0792-.1208.1458-.0104.0208-.0104.0313-.0208.0521-.0334.1229-.0855.2958-.1938.2958-.0625 0-.1354-.0208-.2187-.0417-.177-.0521-.4188-.1042-.7563-.1042-.1791 0-.3687.0105-.5583.0313-.3209.0416-.5896.1875-.8792.35-.65.3917-1.3833.8334-2.5416.8334h-.2188c-1.1583 0-1.8916-.4313-2.5416-.8438-.2813-.1625-.55-.3083-.8792-.35-.1896-.0208-.3791-.0313-.5583-.0313-.3375 0-.5813.0417-.7667.1042-.1042.0313-.1666.0417-.2208.0417-.0875 0-.1459-.1083-.1834-.3-.0125-.0624-.0666-.1291-.1312-.1458-.8917-.175-1.5-.3834-1.9042-.625-.0583-.0417-.0791-.1209-.0583-.1875.3333-.6625.6666-1.2188 1.0333-1.6292.2084-.2396.4709-.4167.7646-.4375.1187-.0104.2333-.0209.3333-.0209.1834 0 .3292.0105.4605.0209h.0333c.2458 0 .3875-.1625.4271-.3.0521-.1479.1146-.3354.1542-.6563.0125-.0833.0854-.1562.1771-.1646 1.0875-.1125 1.8271-.3646 2.1271-.6312.1041-.0938.1562-.2042.1562-.3125 0-.3021-.4812-.6459-.7812-.8855l-.2417-.1937c-.2083-.1625-.3125-.3813-.3125-.6 0-.25.1604-.4834.4209-.6334.1812-.1041.4541-.1666.6562-.1666.2125 0 .4062.0833.5458.1458.1271.0521.2771-.0417.2667-.1666l-.0209-.2605c-.0688-1.0688-.1917-2.3771.1938-3.177 1.0979-2.2896 3.3416-2.4666 3.7312-2.4666Z"/></svg> },
  { value: 'UBER_EATS', label: 'Uber Eats', icon: <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm5.5 5.5v1h-1v-1a.5.5 0 0 0-.5-.5h-8a.5.5 0 0 0-.5.5v8a.5.5 0 0 0 .5.5h1v1h-1c-.827 0-1.5-.673-1.5-1.5v-8c0-.827.673-1.5 1.5-1.5h8c.827 0 1.5.673 1.5 1.5zM16 15.5V8a.5.5 0 0 0-.5-.5h-6a.5.5 0 0 0-.5.5v7.5c0 .827.673 1.5 1.5 1.5h4c.827 0 1.5-.673 1.5-1.5z"/></svg> },
  { value: 'TRIPADVISOR', label: 'Tripadvisor', icon: <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8zm0 18c-3.35 0-6-2.57-6-6.2 0-2.34 1.95-5.44 6-9.14 4.05 3.7 6 6.79 6 9.14 0 3.63-2.65 6.2-6 6.2zm-4.17-6c.37 0 .67.26.74.62.41 2.22 2.28 2.98 3.64 2.87.43-.02.79.32.79.75 0 .4-.32.73-.72.75-2.13.13-4.62-1.09-5.19-4.12-.08-.45.28-.87.74-.87z"/></svg> },
  { value: 'TRUSTPILOT', label: 'Trustpilot', icon: <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M12 2l2.6 8.2h8.4l-6.8 5 2.6 8.2-6.8-5-6.8 5 2.6-8.2-6.8-5h8.4z"/></svg> },
  { value: 'DELIVEROO', label: 'Deliveroo', icon: <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M12 5c-5.648 0-5.648 8.465-5.648 11h11.296C17.648 13.465 17.648 5 12 5zm-2.824 7.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5.648 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg> },
  { value: 'PLANITY', label: 'Planity', icon: <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7v-5z"/></svg> },
  { value: 'FACEBOOK', label: 'Facebook', icon: <Facebook className="h-4 w-4 mr-2" /> },
  { value: 'OTHER', label: 'Autre', icon: <Smartphone className="h-4 w-4 mr-2" /> },
];

// Define play limit options
const PLAY_LIMITS = [
  { value: 'UNLIMITED', label: 'Illimité' },
  { value: 'ONCE_PER_DAY', label: '1 fois par jour' },
  { value: 'ONCE_PER_MONTH', label: '1 fois par mois' },
];

// Helper for social network default URLs
const SOCIAL_NETWORK_URLS: Record<string, string> = {
  GOOGLE: 'https://search.google.com/local/writereview?placeid=YOUR_PLACE_ID',
  INSTAGRAM: 'https://www.instagram.com/YOUR_USERNAME/',
  TIKTOK: 'https://www.tiktok.com/@YOUR_USERNAME',
  SNAPCHAT: 'https://www.snapchat.com/add/YOUR_USERNAME',
  UBER_EATS: 'https://www.ubereats.com/store/YOUR_STORE_NAME/YOUR_STORE_ID',
  TRIPADVISOR: 'https://www.tripadvisor.com/UserReviewEdit-gYOUR_GEOGRAPHY_ID-dYOUR_HOTEL_ID-YOUR_HOTEL_NAME.html',
  TRUSTPILOT: 'https://www.trustpilot.com/review/YOUR_DOMAIN.com',
  DELIVEROO: 'https://deliveroo.fr/menu/YOUR_CITY/YOUR_RESTAURANT_NAME',
  PLANITY: 'https://www.planity.com/YOUR_SALON_NAME_AND_ID',
  FACEBOOK: 'https://www.facebook.com/YOUR_PAGE_NAME/reviews/',
  OTHER: '',
};

const WheelEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isNew = !id || id === 'create';
  const isSuperAdmin = user?.role === 'SUPER';

  // Get company ID from location state if available
  const companyIdFromState = location.state?.companyId;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasApiError, setHasApiError] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [wheel, setWheel] = useState<WheelData>({
    name: '',
    type: 'RANDOM_WIN', // Default to RANDOM_WIN API enum value
    statut: 'Inactif',
    slots: [],
    companyId: '',
    socialNetwork: undefined,
    redirectUrl: '',
    redirectText: 'Vous allez être redirigé vers une page pour mettre des avis 5 étoiles',
    playLimit: 'ONCE_PER_DAY',
    gameRules: 'Une seule participation par personne est autorisée. Les informations saisies doivent être exactes pour valider la participation et la remise du lot.',
    footerText: `© ${new Date().getFullYear()} IZI Wheel`,
    });
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [totalProbability, setTotalProbability] = useState(0);
  const [redirectUrlPlaceholder, setRedirectUrlPlaceholder] = useState("https://www.example.com");

  // Fetch companies if super admin
  useEffect(() => {
    if (isSuperAdmin) {
      fetchCompanies();
      
      // If company ID was passed via state, use it
      if (companyIdFromState) {
        setSelectedCompanyId(companyIdFromState);
        localStorage.setItem('companyId', companyIdFromState);
      }
    }
  }, [isSuperAdmin, companyIdFromState]);
  
  // Load wheel data when needed
  useEffect(() => {
    if (!isNew) {
      fetchWheelData();
    } else {
      // Use default name
      const wheelName = 'Nouvelle roue';
      
      // Calculate equal probability for each slot
      const slotCount = 3; // Default number of slots
      const equalProbability = Math.floor(100 / slotCount);
      const remainder = 100 - (equalProbability * slotCount);
      
      // Initialize new wheel with 3 default slots with balanced probabilities
      setWheel({
        name: wheelName,
        type: 'RANDOM_WIN',
        statut: 'Inactif',
        slots: [
          { 
            label: 'Lot 1', 
            weight: equalProbability + remainder, // Add remainder to first slot
            prizeCode: 'PRIZE1',
            color: PRESET_COLORS[0]
          },
          { 
            label: 'Lot 2', 
            weight: equalProbability, 
            prizeCode: 'PRIZE2',
            color: PRESET_COLORS[1]
          },
          { 
            label: 'Lot 3', 
            weight: equalProbability, 
            prizeCode: 'PRIZE3',
            color: PRESET_COLORS[2]
          },
        ],
        companyId: '',
        socialNetwork: undefined,
        redirectUrl: '',
        redirectText: 'Vous allez être redirigé vers une page pour mettre des avis 5 étoiles',
        playLimit: 'ONCE_PER_DAY',
        gameRules: 'Une seule participation par personne est autorisée. Les informations saisies doivent être exactes pour valider la participation et la remise du lot.',
        footerText: `© ${new Date().getFullYear()} IZI Wheel`,
      });
      setIsLoading(false);
    }
  }, [id, isNew]);

  // Calculate total probability whenever slots change
  useEffect(() => {
    const total = wheel.slots.reduce((sum, slot) => sum + (slot.weight || 0), 0);
    setTotalProbability(total);
  }, [wheel.slots]);

  // Update redirect URL placeholder and optionally the URL when social network changes
  useEffect(() => {
    if (wheel.socialNetwork) {
      const placeholder = SOCIAL_NETWORK_URLS[wheel.socialNetwork] || "https://www.example.com";
      setRedirectUrlPlaceholder(placeholder);
      // Optionally, if you want to auto-fill the URL when a network is selected and URL is empty:
      // if (!wheel.redirectUrl && wheel.socialNetwork !== 'OTHER') {
      //   setWheel(prev => ({
      //     ...prev,
      //     redirectUrl: placeholder.includes('YOUR_') ? '' : placeholder, // Don't fill if it's a template
      //   }));
      // }
    } else {
      setRedirectUrlPlaceholder("https://www.example.com");
    }
  }, [wheel.socialNetwork]);

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

  const fetchWheelData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch the wheel data
      let wheelData: WheelData = {
        id: '',
        name: '',
        type: 'RANDOM_WIN', // Default enum value matching backend
        statut: 'Inactif',
        companyId: '',
        slots: []
      };
      let slots: Slot[] = [];
      
      try {
        const wheelResponse = await api.getWheel(id!);
        console.log('Raw wheel data from API:', wheelResponse.data);
        
        if (wheelResponse.data && wheelResponse.data.wheel) {
          const wheelFromApi = wheelResponse.data.wheel;
          console.log('Wheel mode from API:', wheelFromApi.mode);
          
          // Directly use the API enum value - don't convert it
          const validType: WheelType = wheelFromApi.mode === 'ALL_WIN' ? 'ALL_WIN' : 'RANDOM_WIN';
              
          const validStatus: WheelStatus = 
            wheelFromApi.isActive === true ? 'Actif' : 'Inactif';
          
          wheelData = {
            id: wheelFromApi.id || id,
            name: wheelFromApi.name || `Roue ${id}`,
            type: validType,
            statut: validStatus,
            companyId: wheelFromApi.companyId || '',
            socialNetwork: wheelFromApi.socialNetwork,
            redirectUrl: wheelFromApi.redirectUrl || '',
            redirectText: wheelFromApi.redirectText || 'Vous allez être redirigé vers une page pour mettre des avis 5 étoiles',
            playLimit: wheelFromApi.playLimit || 'ONCE_PER_DAY',
            slots: []
          };
          
          console.log('Processed wheel data:', wheelData);
          
          // Process slots if available
          if (wheelFromApi.slots && Array.isArray(wheelFromApi.slots)) {
            slots = wheelFromApi.slots.map((slot: any) => ({
              id: slot.id,
              label: slot.label || '',
              weight: slot.weight || 0,
              prizeCode: slot.prizeCode || '',
              color: slot.color || ''
            }));
          }
        }
      } catch (error) {
        console.error('Error loading wheel data:', error);
        // Use fallback data if API fails
        wheelData = {
          id: id || '',
          name: 'Roue ' + id,
          type: 'RANDOM_WIN', // Default enum value
          statut: 'Inactif',
          companyId: 'demo-company-id',
          slots: []
        };
        setHasApiError(true);
      }
      
      try {
        // Fetch slots for this wheel
        const slotsResponse = await api.getSlots(id!);
        if (slotsResponse.data) {
          // Check if data has a slots property (correct API response structure)
          if (slotsResponse.data.slots && Array.isArray(slotsResponse.data.slots)) {
            slots = slotsResponse.data.slots;
          } 
          // Fallback for older API format where data might be the array directly
          else if (Array.isArray(slotsResponse.data)) {
            slots = slotsResponse.data;
          }
          else {
            // If neither format works, use empty array
            slots = [];
            console.warn('Unexpected slots data format:', slotsResponse.data);
          }
        }
    } catch (error) {
        console.error('Error loading wheel slots:', error);
        // Use fallback slots if API fails
        slots = [
          { 
            id: '1',
            label: 'Lot 1', 
            weight: 25, 
            prizeCode: 'PRIZE1',
            color: PRESET_COLORS[0]
          },
          { 
            id: '2',
            label: 'Lot 2', 
            weight: 25, 
            prizeCode: 'PRIZE2',
            color: PRESET_COLORS[1]
          },
          { 
            id: '3',
            label: 'Lot 3', 
            weight: 25, 
            prizeCode: 'PRIZE3',
            color: PRESET_COLORS[2]
          },
        ];
        setHasApiError(true);
      }
      
      // Combine data
      setWheel({
        ...wheelData,
        slots: slots || [],
      });

      // If super admin and wheelData has a companyId, set it as selected
      if (isSuperAdmin && wheelData.companyId && !/^\d+$/.test(wheelData.companyId)) {
        setSelectedCompanyId(wheelData.companyId);
        localStorage.setItem('companyId', wheelData.companyId);
      }

    } catch (error) {
      console.error('Error loading wheel data:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger les données de la roue. Veuillez réessayer.',
      });
      setHasApiError(true);
      
      // Set fallback data
      setWheel({
        id: id,
        name: 'Roue ' + id,
        type: 'RANDOM_WIN', // Default enum value
        statut: 'Inactif',
        companyId: 'demo-company-id',
        slots: [
          { 
            id: '1',
            label: 'Lot 1', 
            weight: 25, 
            prizeCode: 'PRIZE1',
            color: PRESET_COLORS[0]
          },
          { 
            id: '2',
            label: 'Lot 2', 
            weight: 25, 
            prizeCode: 'PRIZE2',
            color: PRESET_COLORS[1]
          },
          { 
            id: '3',
            label: 'Lot 3', 
            weight: 25, 
            prizeCode: 'PRIZE3',
            color: PRESET_COLORS[2]
          },
        ],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // Clear any errors related to this field
    setFormErrors(prev => {
      const updated = { ...prev };
      delete updated[name];
      return updated;
    });

    setWheel(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCompanyId = e.target.value;
    if (newCompanyId && !/^\d+$/.test(newCompanyId)) {
      setSelectedCompanyId(newCompanyId);
      localStorage.setItem('companyId', newCompanyId);
    } else {
      console.warn('Attempted to select a company with an invalid ID format:', newCompanyId);
      toast({
        title: "ID d'entreprise invalide",
        description: "Le format de l'ID de l'entreprise sélectionnée n'est pas valide.",
        variant: "destructive"
      });
      setSelectedCompanyId(''); // Clear selection or revert to a valid default
    }
  };

  const handleStatusChange = (checked: boolean) => {
    setWheel(prev => ({
      ...prev,
      statut: checked ? 'Actif' : 'Inactif',
    }));
  };

  const handleSlotChange = (index: number, field: string, value: string | number) => {
    // Clear any errors related to this field
    setFormErrors(prev => {
      const updated = { ...prev };
      delete updated[`slots[${index}].${field}`];
      return updated;
    });

    // Update the wheel state with the new value
    setWheel(prev => {
      const updatedSlots = [...prev.slots];
      
      // Ensure we never set null values
      if (field === 'weight') {
        // For weight field, handle numbers appropriately
        let numValue = typeof value === 'string' ? parseFloat(value) : value;
        // If NaN or null, use 0 instead
        if (isNaN(numValue) || numValue === null) {
          numValue = 0;
        }
        updatedSlots[index] = { ...updatedSlots[index], [field]: numValue };
      } else {
        // For string fields, convert null to empty string
        const safeValue = value === null ? '' : value;
        updatedSlots[index] = { ...updatedSlots[index], [field]: safeValue };
      }
      
      return { ...prev, slots: updatedSlots };
    });
  };

  // Automatically distribute weights to sum to 100%
  const normalizeWeights = useCallback(() => {
    if (wheel.slots.length === 0) return;

    let slots = [...wheel.slots];
    
    // If all weights are 0, set them all equal
    const allZero = slots.every(slot => slot.weight === 0);
    if (allZero) {
      const equalWeight = Math.floor(100 / slots.length);
      slots = slots.map(slot => ({
        ...slot,
        weight: equalWeight
      }));
      
      // Distribute any remainder to the first slot
      const remainder = 100 - (equalWeight * slots.length);
      if (remainder > 0 && slots.length > 0) {
        slots[0].weight += remainder;
      }
    } else {
      // Calculate the current total
      const total = slots.reduce((sum, slot) => sum + slot.weight, 0);
      
      if (total === 0) {
        // If total is 0 but not all weights are 0 (some might be negative), reset to equal
        const equalWeight = Math.floor(100 / slots.length);
        slots = slots.map(slot => ({
          ...slot,
          weight: equalWeight
        }));
        
        // Distribute any remainder to the first slot
        const remainder = 100 - (equalWeight * slots.length);
        if (remainder > 0 && slots.length > 0) {
          slots[0].weight += remainder;
        }
      } else {
        // Scale all weights proportionally to ensure they sum to exactly 100
        let newTotal = 0;
        slots = slots.map((slot, index) => {
          // Calculate proportional weight but ensure it's at least 1
          let newWeight = Math.max(Math.floor((slot.weight / total) * 100), 1);
          
          // Adjust weights if we have enough slots to avoid exceeding 100
          if (newTotal + newWeight > 100 && index < slots.length - 1) {
            newWeight = Math.max(1, 100 - newTotal - (slots.length - index - 1));
          }
          
          newTotal += newWeight;
          return {
            ...slot,
            weight: newWeight
          };
        });
        
        // Ensure total is exactly 100% by adjusting the last slot with weight > 1
        if (newTotal !== 100) {
          const diff = 100 - newTotal;
          
          // Find the last slot with weight > 1 to adjust
          for (let i = slots.length - 1; i >= 0; i--) {
            if (slots[i].weight > 1 || (diff > 0 && i === 0)) {
              slots[i].weight += diff;
              break;
            }
          }
        }
      }
    }
    
    // Final verification to ensure total is exactly 100
    const finalTotal = slots.reduce((sum, slot) => sum + slot.weight, 0);
    if (finalTotal !== 100 && slots.length > 0) {
      // If still not 100, adjust the first slot
      slots[0].weight += (100 - finalTotal);
    }

    setWheel(prev => ({
      ...prev,
      slots
    }));
  }, [wheel.slots]);

  const addSlot = () => {
    if (wheel.slots.length >= 6) {
      toast({
        title: "Limite atteinte",
        description: "Vous ne pouvez pas ajouter plus de 6 lots.",
        variant: "destructive",
      });
      return;
    }
    // Get a random color from our predefined colors
    const randomColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
    
    // Add the new slot
    const updatedSlots = [
      ...wheel.slots,
      { 
        label: `Lot ${wheel.slots.length + 1}`, 
        weight: 0, // Temporary weight, will be adjusted
        prizeCode: `PRIZE${wheel.slots.length + 1}`,
          color: randomColor
        },
    ];
    
    // Calculate new weights to maintain 100% total
    const newSlotCount = updatedSlots.length;
    if (newSlotCount > 0) {
      // Distribute evenly if possible
      const equalWeight = Math.floor(100 / newSlotCount);
      const remainder = 100 - (equalWeight * newSlotCount);
      
      for (let i = 0; i < newSlotCount; i++) {
        updatedSlots[i].weight = equalWeight;
        
        // Add remainder to first slot
        if (i === 0) {
          updatedSlots[i].weight += remainder;
        }
      }
    }
    
    // Verify total is exactly 100%
    const total = updatedSlots.reduce((sum, slot) => sum + slot.weight, 0);
    if (total !== 100 && updatedSlots.length > 0) {
      updatedSlots[0].weight += (100 - total);
    }
    
    setWheel(prev => ({
      ...prev,
      slots: updatedSlots,
    }));
  };

  const removeSlot = (index: number) => {
    if (wheel.slots.length <= 1) {
      toast({
        title: "Action impossible",
        description: "Vous devez avoir au moins un lot.",
        variant: "destructive",
      });
      return;
    }
    // Remove the slot
    const updatedSlots = wheel.slots.filter((_, i) => i !== index);
    
    // If no slots left, just update and return
    if (updatedSlots.length === 0) {
      setWheel(prev => ({
        ...prev,
        slots: updatedSlots,
      }));
      return;
    }
    
    // Calculate new weights to maintain 100% total
    const removedWeight = wheel.slots[index].weight || 0;
    const remainingTotal = totalProbability - removedWeight;
    
    if (remainingTotal <= 0) {
      // If the remaining total is 0 or negative, distribute evenly
      const equalWeight = Math.floor(100 / updatedSlots.length);
      const remainder = 100 - (equalWeight * updatedSlots.length);
      
      for (let i = 0; i < updatedSlots.length; i++) {
        updatedSlots[i].weight = equalWeight;
        
        // Add remainder to first slot
        if (i === 0) {
          updatedSlots[i].weight += remainder;
        }
      }
    } else {
      // Distribute the removed weight proportionally among remaining slots
      const scaleFactor = 100 / remainingTotal;
      
      let newTotal = 0;
      for (let i = 0; i < updatedSlots.length; i++) {
        // Calculate new weight ensuring it's at least 1
        let newWeight = Math.max(Math.floor(updatedSlots[i].weight * scaleFactor), 1);
        
        // Prevent exceeding 100 for the remaining slots
        if (newTotal + newWeight > 100 && i < updatedSlots.length - 1) {
          newWeight = Math.max(1, 100 - newTotal - (updatedSlots.length - i - 1));
        }
        
        updatedSlots[i].weight = newWeight;
        newTotal += newWeight;
      }
      
      // Ensure the total is exactly 100 by adjusting the first slot
      if (newTotal !== 100 && updatedSlots.length > 0) {
        // Find a slot with weight > 1 to adjust
        let adjusted = false;
        for (let i = updatedSlots.length - 1; i >= 0; i--) {
          if (updatedSlots[i].weight > 1 || (i === 0 && !adjusted)) {
            updatedSlots[i].weight += (100 - newTotal);
            adjusted = true;
            break;
          }
        }
      }
    }
    
    // Final verification to ensure total is exactly 100%
    const total = updatedSlots.reduce((sum, slot) => sum + slot.weight, 0);
    if (total !== 100 && updatedSlots.length > 0) {
      updatedSlots[0].weight += (100 - total);
    }
    
    setWheel(prev => ({
      ...prev,
      slots: updatedSlots,
    }));
  };

  // Update the wheelSchema validation function to match backend expectations
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;
    
    if (!wheel.name.trim()) {
      errors.name = "Le nom de la roue est requis.";
      isValid = false;
    }

    // Company ID validation for Super Admin
    if (isSuperAdmin && !selectedCompanyId && isNew) { // Only for new wheels by super admin
      errors.companyId = "Veuillez sélectionner une entreprise.";
      isValid = false;
    }

    // Slot count validation (Min 1, Max 6)
    if (wheel.slots.length === 0) {
      errors.slots = "Vous devez ajouter au moins un lot.";
      toast({ title: "Erreur de validation", description: "Vous devez ajouter au moins un lot.", variant: "destructive" });
      isValid = false;
    } else if (wheel.slots.length > 6) {
      errors.slots = "Vous ne pouvez pas ajouter plus de 6 lots.";
      toast({ title: "Erreur de validation", description: "Vous ne pouvez pas ajouter plus de 6 lots.", variant: "destructive" });
      isValid = false;
    }

    // Validate individual slots and total probability only if basic slot count is valid
    if (isValid && wheel.slots.length > 0) {
      // Check if total probability is 100% for RANDOM_WIN type
      if (wheel.type === 'RANDOM_WIN') {
        const total = wheel.slots.reduce((sum, slot) => sum + (slot.weight || 0), 0);
        if (total !== 100) {
          errors.totalProbability = `Pour un gain aléatoire, la somme des probabilités doit être 100% (actuellement ${total}%).`;
          isValid = false;
        }
      }

      wheel.slots.forEach((slot, index) => {
        if (!slot.label.trim()) {
          errors[`slots[${index}].label`] = 'Le libellé est requis';
          isValid = false;
        }
        if (!slot.prizeCode.trim()) {
          errors[`slots[${index}].prizeCode`] = 'Le code du lot est requis';
          isValid = false;
        }
        if (slot.weight <= 0) {
          errors[`slots[${index}].weight`] = 'La probabilité doit être supérieure à 0';
          isValid = false;
        }
      });
    }

    setFormErrors(errors);
    return isValid;
  };

  // Helper function to convert between frontend display values and backend enum values
  const displayTypeToApiType = (displayType: WheelDisplayType): WheelType => {
    console.log('Converting display type to API type:', displayType);
    return displayType === "Gagnant à tous les coups" ? "ALL_WIN" : "RANDOM_WIN";
  }

  const apiTypeToDisplayType = (apiType: WheelType): WheelDisplayType => {
    console.log('Converting API type to display type:', apiType);
    return apiType === "ALL_WIN" ? "Gagnant à tous les coups" : "Gain aléatoire";
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    
    setIsSaving(true);
      
    const payload: any = {
          name: wheel.name,
      mode: wheel.type,
      isActive: wheel.statut === 'Actif',
      companyId: isSuperAdmin ? selectedCompanyId : user?.companyId,
      slots: wheel.slots.map(slot => ({
        id: slot.id,
        label: slot.label,
        weight: parseInt(String(slot.weight), 10),
        prizeCode: slot.prizeCode,
        color: slot.color,
      })),
      playLimit: wheel.playLimit,
      gameRules: wheel.gameRules,
      footerText: wheel.footerText,
      formSchema: {},
    };

    // Conditionally add social network fields
          if (wheel.socialNetwork && wheel.socialNetwork.trim() !== '' && wheel.socialNetwork !== 'NONE') {
        payload.socialNetwork = wheel.socialNetwork;
        payload.redirectUrl = wheel.redirectUrl;
        payload.redirectText = wheel.redirectText;
      }
      
      // Add game rules and footer text if provided
      if (wheel.gameRules && wheel.gameRules.trim() !== '') {
        payload.gameRules = wheel.gameRules;
      }
      
      if (wheel.footerText && wheel.footerText.trim() !== '') {
        payload.footerText = wheel.footerText;
      }

    // Log the final payload before sending
    console.log("Final payload being sent to API:", JSON.parse(JSON.stringify(payload)));

    try {
      if (isNew) {
        // Creating a new wheel
        try {
          const newWheelResponse = await api.createWheel(payload);
          
          if (!newWheelResponse.data || !newWheelResponse.data.wheel) {
            throw new Error("Failed to create wheel: Invalid response");
          }
          
          const newWheelId = newWheelResponse.data.wheel.id;
          
          // Create slots
          const slotPromises = wheel.slots.map(async (slot, index) => {
            const slotData = {
              label: slot.label,
              color: slot.color,
              weight: slot.weight, // Weight is the correct field for probability in the database
              isWinning: wheel.type === "ALL_WIN" ? true : slot.weight > 0, // Force winning for ALL_WIN mode
              prizeCode: slot.prizeCode,
              position: index
            };
            
            await api.createSlot(newWheelId, slotData);
          });
          
          await Promise.all(slotPromises);
          
          toast({
            title: "Succès",
            description: "Roue créée avec succès!",
          });
          
          navigate('/roues');
        } catch (error: any) {
          console.error("Error creating wheel:", error);
          toast({
            variant: "destructive",
            title: "Erreur",
            description: error.message || "Une erreur est survenue lors de la création de la roue",
          });
        }
      } else {
        // Updating an existing wheel
        try {
          // Update the wheel with proper schema fields
          await api.updateWheel(id!, payload);
        
        // Update slots
          try {
            // Delete existing slots
            const slotsResponse = await api.getSlots(id!);
            let existingSlots = [];
            
            // Handle different API response formats
            if (slotsResponse.data) {
              if (slotsResponse.data.slots && Array.isArray(slotsResponse.data.slots)) {
                existingSlots = slotsResponse.data.slots;
              } else if (Array.isArray(slotsResponse.data)) {
                existingSlots = slotsResponse.data;
              }
            }
            
            console.log(`Found ${existingSlots.length} existing slots to delete`);
            
            if (existingSlots.length > 0) {
              // Delete all existing slots first before creating new ones
              for (const slot of existingSlots) {
                if (slot.id) {
                  try {
                    await api.deleteSlot(id!, slot.id);
                    console.log(`Deleted slot ${slot.id}`);
                  } catch (deleteError) {
                    console.error(`Error deleting slot ${slot.id}:`, deleteError);
                  }
                }
              }
            }
            
            // Verify weights total exactly 100% before creating slots
            const totalSlotWeight = wheel.slots.reduce((sum, slot) => sum + slot.weight, 0);
            
            if (totalSlotWeight !== 100) {
              // Normalize to ensure total is exactly 100%
              const normalizedSlots = [...wheel.slots];
              
              // Simple proportional adjustment
              const factor = 100 / totalSlotWeight;
              let newTotal = 0;
              
              for (let i = 0; i < normalizedSlots.length; i++) {
                // For all but the last slot, calculate and round
                if (i < normalizedSlots.length - 1) {
                  normalizedSlots[i].weight = Math.round(normalizedSlots[i].weight * factor);
                  newTotal += normalizedSlots[i].weight;
                } else {
                  // Last slot gets whatever is needed to reach 100 exactly
                  normalizedSlots[i].weight = 100 - newTotal;
                }
              }
              
              // Update wheel state with normalized slots
              setWheel(prev => ({
                ...prev,
                slots: normalizedSlots
              }));
              
              // Use normalized slots for creation
              for (const slot of normalizedSlots) {
                await api.createSlot(id!, {
                  label: slot.label,
                  weight: slot.weight,
                  prizeCode: slot.prizeCode,
                  color: slot.color,
                  isWinning: wheel.type === "ALL_WIN" ? true : slot.weight > 0 // Force all slots to be winning for ALL_WIN mode
                });
                console.log(`Created slot: ${slot.label} (${slot.weight}%)`);
              }
            } else {
              // Weights already total 100%, create slots as is
              for (const slot of wheel.slots) {
                await api.createSlot(id!, {
                  label: slot.label,
                  weight: slot.weight,
                  prizeCode: slot.prizeCode,
                  color: slot.color,
                  isWinning: wheel.type === "ALL_WIN" ? true : slot.weight > 0 // Force all slots to be winning for ALL_WIN mode
                });
                console.log(`Created slot: ${slot.label} (${slot.weight}%)`);
              }
        }
        
        toast({
              title: "Succès",
              description: "Roue mise à jour avec succès!",
            });
            
            navigate('/roues');
          } catch (slotError) {
            console.error('Error updating wheel slots:', slotError);
      toast({
        variant: 'destructive',
              title: 'Erreur partielle',
              description: 'La roue a été mise à jour mais des problèmes sont survenus avec les cases',
            });
          }
        } catch (error: any) {
          console.error("Error updating wheel:", error);
          toast({
            variant: "destructive",
            title: "Erreur",
            description: error.message || "Une erreur est survenue lors de la mise à jour de la roue",
          });
        }
      }
    } catch (error: any) {
      console.error("Error saving wheel:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de l'enregistrement de la roue",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTypeChange = (value: string) => {
    console.log('Type changed to:', value);
    // Convert from display string to API enum value
    const newType: WheelType = value === "Gagnant à tous les coups" ? "ALL_WIN" : "RANDOM_WIN";
    
    console.log('Setting wheel type to:', newType);
    setWheel(prev => ({
      ...prev,
      type: newType
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
            <Button
              variant="outline"
            size="icon"
            onClick={() => navigate('/roues')}
          >
            <ChevronLeft className="h-4 w-4" />
            </Button>
          <h1 className="text-2xl font-bold">
            {isNew ? 'Créer une nouvelle roue' : `Modifier ${wheel.name}`}
          </h1>
        </div>
              <Button 
          onClick={handleSubmit}
          disabled={isSaving}
          className="flex items-center space-x-2"
        >
          {isSaving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          <span>Enregistrer</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main settings card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Company selector for super admin */}
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label htmlFor="companyId">Entreprise</Label>
                <select
                  id="companyId"
                  name="companyId"
                  value={selectedCompanyId}
                  onChange={handleCompanyChange}
                  className={`w-full p-2 border rounded-md ${formErrors['companyId'] ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">Sélectionner une entreprise</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
                {formErrors['companyId'] && <p className="text-sm text-red-500">{formErrors['companyId']}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nom de la roue</Label>
              <input
                id="name"
                name="name"
                value={wheel.name}
                onChange={handleChange}
                className={`w-full p-2 border rounded-md ${formErrors['name'] ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Nom de la roue"
              />
              {formErrors['name'] && <p className="text-sm text-red-500">{formErrors['name']}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type de roue</Label>
              <Select 
                value={wheel.type === "ALL_WIN" ? "Gagnant à tous les coups" : "Gain aléatoire"}
                onValueChange={handleTypeChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Gain aléatoire">Gain aléatoire</SelectItem>
                  <SelectItem value="Gagnant à tous les coups">Gagnant à tous les coups</SelectItem>
                </SelectContent>
              </Select>
              {/* Add debugging info for wheel type */}
              <div className="text-xs text-gray-500">Mode actuel: {wheel.type}</div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="status"
                checked={wheel.statut === 'Actif'}
                onCheckedChange={handleStatusChange}
              />
              <Label htmlFor="status">Roue active</Label>
              </div>
          </CardContent>
        </Card>

        {/* Preview card */}
        <Card>
          <CardHeader>
            <CardTitle>Aperçu</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center items-center p-4">
            <div className="w-full aspect-square bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center overflow-hidden">
              {/* Simple visual representation of the wheel */}
              <div className="relative w-full h-full">
                {wheel.slots.map((slot, index) => {
                  const angle = (360 / wheel.slots.length) * index;
                  return (
                    <div
                      key={index}
                      className="absolute inset-0"
                      style={{
                        clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.cos((angle + 360 / wheel.slots.length) * Math.PI / 180)}% ${50 - 50 * Math.sin((angle + 360 / wheel.slots.length) * Math.PI / 180)}%, 50% 50%)`,
                        transform: `rotate(${angle}deg)`,
                        backgroundColor: slot.color || PRESET_COLORS[index % PRESET_COLORS.length],
                      }}
                    />
                  );
                })}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-white rounded-full border-4 border-gray-300"></div>
            </div>
            </div>
            </div>
          </CardContent>
        </Card>
        </div>

      {/* Slots/Prizes card */}
      <Card className="md:col-span-3">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Lots et prix</CardTitle>
            <div className="mt-1 text-sm text-gray-500">
              Probabilité totale: 
              <span className={totalProbability === 100 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                {" "}{totalProbability}%
              </span>
              {totalProbability !== 100 && (
                <span className="ml-2 text-red-600 inline-flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  La somme des probabilités devrait être 100%
                </span>
              )}
              {formErrors['totalProbability'] && (
                <p className="text-sm text-red-500 mt-1">{formErrors['totalProbability']}</p>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            <Button onClick={normalizeWeights} variant="outline" className="mr-2">
              Normaliser à 100%
            </Button>
            <Button onClick={addSlot} variant="outline" className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Ajouter un lot</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {formErrors['slots'] && (
            <p className="text-sm text-red-500 mb-4">{formErrors['slots']}</p>
          )}
          
          <div className="space-y-4">
                  {wheel.slots.map((slot, index) => (
              <div key={index} className="p-4 border rounded-md relative">
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-2 top-2"
                  onClick={() => removeSlot(index)}
                >
                  <X className="h-4 w-4" />
                </Button>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="space-y-2">
                    <Label htmlFor={`slot-${index}-label`}>Libellé</Label>
                        <input
                      id={`slot-${index}-label`}
                          value={slot.label ?? ''}
                          onChange={(e) => handleSlotChange(index, 'label', e.target.value)}
                      className={`w-full p-2 border rounded-md ${formErrors[`slots[${index}].label`] ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="Nom du lot"
                        />
                        {formErrors[`slots[${index}].label`] && (
                      <p className="text-sm text-red-500">{formErrors[`slots[${index}].label`]}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`slot-${index}-code`}>Code du lot</Label>
                        <input
                      id={`slot-${index}-code`}
                          value={slot.prizeCode ?? ''}
                          onChange={(e) => handleSlotChange(index, 'prizeCode', e.target.value)}
                      className={`w-full p-2 border rounded-md ${formErrors[`slots[${index}].prizeCode`] ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Code unique du lot"
                        />
                        {formErrors[`slots[${index}].prizeCode`] && (
                      <p className="text-sm text-red-500">{formErrors[`slots[${index}].prizeCode`]}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`slot-${index}-weight`}>Probabilité (%)</Label>
                        <input
                      id={`slot-${index}-weight`}
                          type="number"
                          min="1"
                      max="100"
                          value={slot.weight ?? ''}
                          onChange={(e) => handleSlotChange(index, 'weight', e.target.value)}
                      className={`w-full p-2 border rounded-md ${formErrors[`slots[${index}].weight`] ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {formErrors[`slots[${index}].weight`] && (
                      <p className="text-sm text-red-500">{formErrors[`slots[${index}].weight`]}</p>
                    )}
                  </div>
                </div>

                {/* Color picker for slot */}
                <div className="mt-4">
                  <Label htmlFor={`slot-${index}-color`}>Couleur</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      id={`slot-${index}-color`}
                      type="color"
                      value={slot.color || PRESET_COLORS[index % PRESET_COLORS.length]}
                      onChange={(e) => handleSlotChange(index, 'color', e.target.value)}
                      className="w-10 h-10 p-1 border rounded cursor-pointer"
                    />
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map((color, colorIndex) => (
                        <div
                          key={colorIndex}
                          className="w-6 h-6 rounded-full border border-gray-300 cursor-pointer hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                          onClick={() => handleSlotChange(index, 'color', color)}
                          title={`Couleur ${colorIndex + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            </div>
        </CardContent>
        <CardFooter className="bg-gray-50 border-t flex justify-between">
          <div className="text-sm text-gray-600">
            {wheel.slots.length} lot{wheel.slots.length !== 1 ? 's' : ''} configuré{wheel.slots.length !== 1 ? 's' : ''}
          </div>
          {totalProbability !== 100 && (
            <Button onClick={normalizeWeights} variant="outline" size="sm">
              Normaliser à 100%
            </Button>
          )}
        </CardFooter>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Paramètres de redirection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="social" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="social">Réseau social</TabsTrigger>
              <TabsTrigger value="limit">Limite de jeu</TabsTrigger>
              <TabsTrigger value="custom">Personnalisation</TabsTrigger>
            </TabsList>
            
            <TabsContent value="social" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="socialNetwork">Réseau social</Label>
                <Select
                  value={wheel.socialNetwork ?? ''}
                  onValueChange={(value) => {
                    setWheel(prev => ({
                      ...prev,
                      socialNetwork: value,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un réseau social" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOCIAL_NETWORKS.map((network) => (
                      <SelectItem key={network.value} value={network.value}>
                        <div className="flex items-center">
                          {network.icon}
                          {network.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>

              <div className="space-y-2">
                <Label htmlFor="redirectUrl">Lien de redirection</Label>
                <Input
                  id="redirectUrl"
                  type="url"
                  placeholder={redirectUrlPlaceholder}
                  value={wheel.redirectUrl || ''}
                  onChange={(e) => setWheel(prev => ({ ...prev, redirectUrl: e.target.value }))}
                />
                 {wheel.socialNetwork && SOCIAL_NETWORK_URLS[wheel.socialNetwork]?.includes('YOUR_') && (
                  <p className="text-xs text-gray-500 mt-1">
                    N'oubliez pas de remplacer les parties comme "YOUR_PLACE_ID" par vos informations.
                  </p>
          )}
        </div>

              <div className="space-y-2">
                <Label htmlFor="redirectText">Texte de redirection</Label>
                <Textarea
                  id="redirectText"
                  placeholder="Vous allez être redirigé vers..."
                  value={wheel.redirectText || ''}
                  onChange={(e) => setWheel({ ...wheel, redirectText: e.target.value })}
                  rows={3}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="limit" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="playLimit">Limite de jeu par client</Label>
                <Select
                  value={wheel.playLimit ?? 'ONCE_PER_DAY'}
                  onValueChange={(value) => {
                    setWheel({
                      ...wheel,
                      playLimit: value
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une limite" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAY_LIMITS.map((limit) => (
                      <SelectItem key={limit.value} value={limit.value}>
                        {limit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
        </div>
                          </TabsContent>
              
              {/* <TabsContent value="custom" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gameRules">Règles du jeu</Label>
                  <Textarea
                    id="gameRules"
                    placeholder="Règles et instructions du jeu..."
                    value={wheel.gameRules || ''}
                    onChange={(e) => setWheel({ ...wheel, gameRules: e.target.value })}
                    rows={5}
                  />
                  <p className="text-xs text-gray-500">Personnalisez les règles qui seront affichées aux joueurs.</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="footerText">Texte du pied de page</Label>
                  <Input
                    id="footerText"
                    placeholder="© 2024 Votre Entreprise"
                    value={wheel.footerText || ''}
                    onChange={(e) => setWheel({ ...wheel, footerText: e.target.value })}
                  />
                  <p className="text-xs text-gray-500">Personnalisez le texte affiché en bas de la page.</p>
                        </div>
            </TabsContent>
             */}
            <TabsContent value="custom" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gameRules">Règles du jeu</Label>
                <Textarea
                  id="gameRules"
                  placeholder="Règles et instructions du jeu..."
                  value={wheel.gameRules || ''}
                  onChange={(e) => setWheel({ ...wheel, gameRules: e.target.value })}
                  rows={5}
                />
                <p className="text-xs text-gray-500">Personnalisez les règles qui seront affichées aux joueurs.</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="footerText">Texte du pied de page</Label>
                <Input
                  id="footerText"
                  placeholder="© 2024 Votre Entreprise"
                  value={wheel.footerText || ''}
                  onChange={(e) => setWheel({ ...wheel, footerText: e.target.value })}
                />
                <p className="text-xs text-gray-500">Personnalisez le texte affiché en bas de la page.</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default WheelEdit; 
