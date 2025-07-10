import { useState, useEffect, useCallback, useContext } from 'react';
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
import { ImageUpload } from '../components/ui/ImageUpload';
import { AuthContext } from '../contexts/AuthContext';

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
  mainTitle?: string;
  bannerImage?: string;
  backgroundImage?: string;
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
  const { user } = useContext(AuthContext);
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
    type: 'RANDOM_WIN',
    statut: 'Inactif',
    slots: [],
    companyId: '',
    socialNetwork: undefined,
    redirectUrl: '',
    redirectText: '',
    playLimit: 'ONCE_PER_DAY',
    gameRules: '',
    footerText: '',
    mainTitle: '',
    bannerImage: '',
    backgroundImage: '',
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
        redirectText: '',
        playLimit: 'ONCE_PER_DAY',
        gameRules: '',
        footerText: '',
        mainTitle: '',
        bannerImage: '',
        backgroundImage: '',
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

      const response = await api.getAllCompanies();

      if (response.data && response.data.companies) {
        setCompanies(response.data.companies);
      }
    } catch (error) {

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

        
        if (wheelResponse.data && wheelResponse.data.wheel) {
          const wheelFromApi = wheelResponse.data.wheel;

          
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
            redirectText: wheelFromApi.redirectText || '',
            playLimit: wheelFromApi.playLimit || 'ONCE_PER_DAY',
            gameRules: wheelFromApi.gameRules || '',
            footerText: wheelFromApi.footerText || '',
            mainTitle: wheelFromApi.mainTitle || '',
            slots: [],
            bannerImage: wheelFromApi.bannerImage || '',
            backgroundImage: wheelFromApi.backgroundImage || '',
          };
          

          
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

        // Use fallback data if API fails
        wheelData = {
          id: id || '',
          name: 'Roue ' + id,
          type: 'RANDOM_WIN', // Default enum value
          statut: 'Inactif',
          companyId: 'demo-company-id',
          slots: [],
          bannerImage: '',
          backgroundImage: '',
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

          }
        }
    } catch (error) {

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
      // Ensure every slot has a color
      const normalizedSlots = (slots || []).map((slot, idx) => ({
        ...slot,
        color: slot.color || PRESET_COLORS[idx % PRESET_COLORS.length],
      }));
      setWheel({
        ...wheelData,
        slots: normalizedSlots,
      });

      // If super admin and wheelData has a companyId, set it as selected
      if (isSuperAdmin && wheelData.companyId && !/^\d+$/.test(wheelData.companyId)) {
        setSelectedCompanyId(wheelData.companyId);
        localStorage.setItem('companyId', wheelData.companyId);
      }

    } catch (error) {

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
        bannerImage: '',
        backgroundImage: '',
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
        // If NaN, empty string, or null, use 0 instead
        if (isNaN(numValue) || numValue === null || value === '') {
          numValue = 0;
        }
        // Ensure value is within valid range
        numValue = Math.max(0, Math.min(100, numValue));
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
        color: randomColor,
      },
    ];
    // Ensure every slot has a color
    const normalizedSlots = updatedSlots.map((slot, idx) => ({
      ...slot,
      color: slot.color || PRESET_COLORS[idx % PRESET_COLORS.length],
    }));
    // Calculate new weights to maintain 100% total
    const newSlotCount = normalizedSlots.length;
    if (newSlotCount > 0) {
      // Distribute evenly if possible
      const equalWeight = Math.floor(100 / newSlotCount);
      const remainder = 100 - (equalWeight * newSlotCount);
      for (let i = 0; i < newSlotCount; i++) {
        normalizedSlots[i].weight = equalWeight;
        if (i === 0) {
          normalizedSlots[i].weight += remainder;
        }
      }
    }
    // Verify total is exactly 100%
    const total = normalizedSlots.reduce((sum, slot) => sum + slot.weight, 0);
    if (total !== 100 && normalizedSlots.length > 0) {
      normalizedSlots[0].weight += (100 - total);
    }
    setWheel(prev => ({
      ...prev,
      slots: normalizedSlots,
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
      // Check probability totals based on wheel type
      const total = wheel.slots.reduce((sum, slot) => sum + (slot.weight || 0), 0);
      
      if (wheel.type === 'ALL_WIN') {
        // ALL_WIN wheels must total exactly 100% (everyone wins something)
        if (total !== 100) {
          errors.totalProbability = `Pour "Gagnant à tous les coups", la somme des probabilités doit être exactement 100% (actuellement ${total}%).`;
          isValid = false;
        }
      } else if (wheel.type === 'RANDOM_WIN') {
        // RANDOM_WIN wheels can be 0-100% (missing percentage = losing chances)
        if (total > 100) {
          errors.totalProbability = `Pour "Gain aléatoire", la somme des probabilités ne peut pas dépasser 100% (actuellement ${total}%).`;
          isValid = false;
        }
        // Note: totals less than 100% are perfectly valid for RANDOM_WIN
        // Missing percentage becomes automatic losing chances
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
        
        // For RANDOM_WIN, allow 0% probability (losing slots)
        // For ALL_WIN, all slots must have probability > 0
        if (wheel.type === 'ALL_WIN' && slot.weight <= 0) {
          errors[`slots[${index}].weight`] = 'Pour "Gagnant à tous les coups", tous les lots doivent avoir une probabilité supérieure à 0';
          isValid = false;
        } else if (wheel.type === 'RANDOM_WIN' && slot.weight < 0) {
          errors[`slots[${index}].weight`] = 'La probabilité ne peut pas être négative';
          isValid = false;
        }
      });
    }

    setFormErrors(errors);
    return isValid;
  };

  // Helper function to convert between frontend display values and backend enum values
  const displayTypeToApiType = (displayType: WheelDisplayType): WheelType => {

    return displayType === "Gagnant à tous les coups" ? "ALL_WIN" : "RANDOM_WIN";
  }

  const apiTypeToDisplayType = (apiType: WheelType): WheelDisplayType => {

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
      formSchema: {},
    };

    // Only include play limit if it's different from default
    if (wheel.playLimit && wheel.playLimit !== 'ONCE_PER_DAY') {
      payload.playLimit = wheel.playLimit;
    }

    // Only include optional customization fields if they have values
    if (wheel.mainTitle && wheel.mainTitle.trim() !== '') {
      payload.mainTitle = wheel.mainTitle.trim();
    }

    if (wheel.bannerImage && wheel.bannerImage.trim() !== '') {
      payload.bannerImage = wheel.bannerImage.trim();
    }

    if (wheel.backgroundImage && wheel.backgroundImage.trim() !== '') {
      payload.backgroundImage = wheel.backgroundImage.trim();
    }

    if (wheel.gameRules && wheel.gameRules.trim() !== '') {
      payload.gameRules = wheel.gameRules.trim();
    }

    if (wheel.footerText && wheel.footerText.trim() !== '') {
      payload.footerText = wheel.footerText.trim();
    }

    // Conditionally add social network fields
    if (wheel.socialNetwork && wheel.socialNetwork.trim() !== '' && wheel.socialNetwork !== 'NONE') {
      payload.socialNetwork = wheel.socialNetwork;
      
      if (wheel.redirectUrl && wheel.redirectUrl.trim() !== '') {
        payload.redirectUrl = wheel.redirectUrl.trim();
      }
      
      if (wheel.redirectText && wheel.redirectText.trim() !== '') {
        payload.redirectText = wheel.redirectText.trim();
      }
    }

    // Log the final payload before sending


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
        
        // Update slots using bulk update to avoid race conditions
          try {
            // Verify weights total exactly 100% before updating slots
            const totalSlotWeight = wheel.slots.reduce((sum, slot) => sum + slot.weight, 0);
            let slotsToProcess = [...wheel.slots];
            
            if (totalSlotWeight !== 100) {
              // Normalize to ensure total is exactly 100%
              const factor = 100 / totalSlotWeight;
              let newTotal = 0;
              
              for (let i = 0; i < slotsToProcess.length; i++) {
                // For all but the last slot, calculate and round
                if (i < slotsToProcess.length - 1) {
                  slotsToProcess[i].weight = Math.round(slotsToProcess[i].weight * factor);
                  newTotal += slotsToProcess[i].weight;
                } else {
                  // Last slot gets whatever is needed to reach 100 exactly
                  slotsToProcess[i].weight = 100 - newTotal;
                }
              }
              
              // Update wheel state with normalized slots
              setWheel(prev => ({
                ...prev,
                slots: slotsToProcess
              }));
            }
            
            // Prepare bulk slot data
            const bulkSlotData = slotsToProcess.map((slot: Slot, index: number) => ({
              label: slot.label,
              weight: slot.weight,
              prizeCode: slot.prizeCode,
              color: slot.color,
              position: index,
              isWinning: wheel.type === "ALL_WIN" ? true : slot.weight > 0
            }));
            
            // Use bulk update to replace all slots atomically
            await api.bulkUpdateSlots(id!, bulkSlotData);
            console.log(`Bulk updated ${slotsToProcess.length} slots`);
            
            toast({
              title: "Succès",
              description: "Roue mise à jour avec succès!",
            });
            
            // Instead of navigating away, refetch the wheel data to show the saved state
            if (!isNew) {
              await fetchWheelData();
            } else {
              // For new wheels, we could navigate to the edit page with the new ID
              // But for now, stay on current page
            }
          } catch (slotError) {

      toast({
        variant: 'destructive',
              title: 'Erreur partielle',
              description: 'La roue a été mise à jour mais des problèmes sont survenus avec les cases',
            });
          }
        } catch (error: any) {
          console.error("Error updating wheel:", error);
          
          // Extract user-friendly error message from API response
          let errorMessage = "Une erreur est survenue lors de la mise à jour de la roue";
          let errorTitle = "Erreur";
          
          if (error.response?.data) {
            const errorData = error.response.data;
            
            // Use userMessage if available (user-friendly message from API)
            if (errorData.userMessage) {
              errorMessage = errorData.userMessage;
              errorTitle = "Erreur de validation";
            }
            // Handle specific probability validation error
            else if (errorData.error === 'Probabilities must total 100%') {
              errorMessage = `Les probabilités des lots doivent totaliser 100%. Actuellement: ${errorData.currentTotal}%. Veuillez ajuster les probabilités des lots ou utiliser le bouton "Normaliser à 100%" avant de sauvegarder.`;
              errorTitle = "Erreur de probabilité";
            }
            // Handle validation errors array
            else if (errorData.validationErrors && Array.isArray(errorData.validationErrors)) {
              errorMessage = errorData.validationErrors.join(' ');
              errorTitle = "Erreur de validation";
            }
            // Fallback to generic error message
            else if (errorData.error) {
              errorMessage = errorData.error;
            }
          }
          
          toast({
            variant: "destructive",
            title: errorTitle,
            description: errorMessage,
          });
        }
      }
    } catch (error: any) {
      console.error("Error saving wheel:", error);
      
      // Extract user-friendly error message from API response
      let errorMessage = "Une erreur est survenue lors de l'enregistrement de la roue";
      let errorTitle = "Erreur";
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Use userMessage if available (user-friendly message from API)
        if (errorData.userMessage) {
          errorMessage = errorData.userMessage;
          errorTitle = "Erreur de validation";
        }
        // Handle specific probability validation error
        else if (errorData.error === 'Probabilities must total 100%') {
          errorMessage = `Les probabilités des lots doivent totaliser 100%. Actuellement: ${errorData.currentTotal}%. Veuillez ajuster les probabilités des lots ou utiliser le bouton "Normaliser à 100%" avant de sauvegarder.`;
          errorTitle = "Erreur de probabilité";
        }
        // Handle validation errors array
        else if (errorData.validationErrors && Array.isArray(errorData.validationErrors)) {
          errorMessage = errorData.validationErrors.join(' ');
          errorTitle = "Erreur de validation";
        }
        // Fallback to generic error message
        else if (errorData.error) {
          errorMessage = errorData.error;
        }
      }

      toast({
        variant: "destructive",
        title: errorTitle,
        description: errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTypeChange = (value: string) => {

    // Convert from display string to API enum value
    const newType: WheelType = value === "Gagnant à tous les coups" ? "ALL_WIN" : "RANDOM_WIN";
    

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
              {/* SVG wheel representation */}
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Segments */}
                {wheel.slots.map((slot, index) => {
                  const segmentCount = wheel.slots.length;
                  const segmentAngle = 360 / segmentCount;
                  const startAngle = segmentAngle * index;
                  const endAngle = startAngle + segmentAngle;
                  
                  // Convert angles to radians for calculations
                  const startRad = (startAngle - 90) * (Math.PI / 180);
                  const endRad = (endAngle - 90) * (Math.PI / 180);
                  
                  // Calculate points for the segment path
                  const x1 = 50;
                  const y1 = 50;
                  const x2 = 50 + 50 * Math.cos(startRad);
                  const y2 = 50 + 50 * Math.sin(startRad);
                  const x3 = 50 + 50 * Math.cos(endRad);
                  const y3 = 50 + 50 * Math.sin(endRad);
                  
                  // Create SVG path for the segment
                  const largeArcFlag = segmentAngle > 180 ? 1 : 0;
                  
                  // Special case for single segment - draw a complete circle
                  const pathData = segmentCount === 1 
                    ? "M50,50 m0,-45 a45,45 0 1,0 0.1,0 a45,45 0 1,0 -0.1,0 Z"
                    : `M${x1},${y1} L${x2},${y2} A50,50 0 ${largeArcFlag},1 ${x3},${y3} Z`;
                  
                  return (
                    <path
                      key={index}
                      d={pathData}
                      fill={slot.color || PRESET_COLORS[index % PRESET_COLORS.length]}
                      stroke="#ffffff"
                      strokeWidth="0.5"
                    />
                  );
                })}
                
                {/* Text labels */}
                {wheel.slots.map((slot, index) => {
                  const segmentCount = wheel.slots.length;
                  const segmentAngle = 360 / segmentCount;
                  const middleAngle = (segmentAngle * index) + (segmentAngle / 2) - 90; // -90 to start from top
                  const middleRad = middleAngle * (Math.PI / 180);
                  
                  // Position text at 70% of radius from center
                  const textRadius = 35;
                  const textX = 50 + textRadius * Math.cos(middleRad);
                  const textY = 50 + textRadius * Math.sin(middleRad);
                  
                  // Calculate rotation for text to be readable
                  let textRotation = middleAngle + 90;
                  if (textRotation > 90 && textRotation < 270) {
                    textRotation += 180; // Flip text if it would be upside down
                  }
                  
                  return (
                    <text
                      key={`text-${index}`}
                      x={textX}
                      y={textY}
                      fill="#ffffff"
                      fontSize="3"
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${textRotation} ${textX} ${textY})`}
                      style={{ textShadow: '0 0 2px rgba(0,0,0,0.8)' }}
                    >
                      {slot.label || `Lot ${index + 1}`}
                    </text>
                  );
                })}
                
                {/* Center circle */}
                <circle cx="50" cy="50" r="4" fill="white" stroke="#cccccc" strokeWidth="1" />
              </svg>
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
              <span className={
                wheel.type === 'ALL_WIN' ? 
                  (totalProbability === 100 ? "text-green-600 font-semibold" : "text-red-600 font-semibold") :
                  (totalProbability <= 100 ? "text-green-600 font-semibold" : "text-red-600 font-semibold")
              }>
                {" "}{totalProbability}%
              </span>
              {wheel.type === 'ALL_WIN' && totalProbability !== 100 && (
                <span className="ml-2 text-red-600 inline-flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Doit être exactement 100%
                </span>
              )}
              {wheel.type === 'RANDOM_WIN' && totalProbability > 100 && (
                <span className="ml-2 text-red-600 inline-flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Ne peut pas dépasser 100%
                </span>
              )}
              {wheel.type === 'RANDOM_WIN' && totalProbability < 100 && (
                <span className="ml-2 text-blue-600 inline-flex items-center">
                  ℹ️ {100 - totalProbability}% de chances de perdre
                </span>
              )}
              {formErrors['totalProbability'] && (
                <p className="text-sm text-red-500 mt-1">{formErrors['totalProbability']}</p>
              )}
            </div>
            {/* Explanatory text based on wheel type */}
            {wheel.type === 'RANDOM_WIN' && (
              <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                <strong>Mode "Gain aléatoire":</strong> Les lots avec 0% de probabilité sont des cases perdantes. 
                Le total peut être inférieur à 100% - le pourcentage manquant représente des chances supplémentaires de perdre.
              </div>
            )}
            {wheel.type === 'ALL_WIN' && (
              <div className="mt-2 text-xs text-green-600 bg-green-50 p-2 rounded">
                <strong>Mode "Gagnant à tous les coups":</strong> Tous les lots doivent avoir une probabilité {'>'}0% 
                et le total doit être exactement 100% (le joueur gagne toujours quelque chose).
              </div>
            )}
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
                          min="0"
                      max="100"
                          step="1"
                          value={slot.weight === 0 ? '' : slot.weight}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Allow empty value while typing
                            if (value === '') {
                              handleSlotChange(index, 'weight', 0);
                            } else {
                              // Parse the number and ensure it's within valid range
                              const numValue = parseInt(value, 10);
                              if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                                handleSlotChange(index, 'weight', numValue);
                              }
                            }
                          }}
                          onFocus={(e) => {
                            // Select all text when focused for easy editing
                            e.target.select();
                          }}
                          placeholder="0"
                      className={`w-full p-2 border rounded-md ${formErrors[`slots[${index}].weight`] ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {/* Show helpful info for 0% probability in RANDOM_WIN mode */}
                        {wheel.type === 'RANDOM_WIN' && slot.weight === 0 && (
                          <p className="text-xs text-blue-600 flex items-center">
                            <span className="mr-1">ℹ️</span>
                            Lot perdant (0% de chance de gagner)
                          </p>
                        )}
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
          <CardTitle>Paramètres de la Roue {wheel.name}</CardTitle>
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
                <Label htmlFor="socialNetwork">Réseau social (optionnel)</Label>
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
                    <SelectValue placeholder="Sélectionner un réseau social (optionnel)" />
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
                <Label htmlFor="redirectUrl">Lien de redirection (optionnel)</Label>
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
                <Label htmlFor="redirectText">Texte de redirection (optionnel)</Label>
                <Textarea
                  id="redirectText"
                  placeholder="Ex: Vous allez être redirigé vers... (optionnel)"
                  value={wheel.redirectText || ''}
                  onChange={(e) => setWheel({ ...wheel, redirectText: e.target.value })}
                  rows={3}
                />
                <p className="text-xs text-gray-500">Texte affiché dans la popup de redirection (optionnel).</p>
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
                <p className="text-xs text-gray-500">Définit la fréquence à laquelle un utilisateur peut jouer (par défaut: une fois par jour).</p>
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
                <Label htmlFor="mainTitle">Titre principal (optionnel)</Label>
                <Input
                  id="mainTitle"
                  placeholder="Ex: Votre marque, votre événement... (laissez vide pour utiliser 'IZI Kado')"
                  value={wheel.mainTitle || ''}
                  onChange={(e) => setWheel({ ...wheel, mainTitle: e.target.value })}
                />
                <p className="text-xs text-gray-500">Personnalisez le titre affiché en haut de la page de jeu (optionnel).</p>
              </div>
              
              {/* Banner Image */}
              <ImageUpload
                onImageUpload={(url) => setWheel({ ...wheel, bannerImage: url })}
                currentImageUrl={wheel.bannerImage}
                imageType="banner"
                title="Image de bannière (optionnel)"
                description="Image de bannière à afficher en haut de la page (optionnel)"
                recommendedSize="1200x300px"
              />
              
              {/* Background Image */}
              <ImageUpload
                onImageUpload={(url) => setWheel({ ...wheel, backgroundImage: url })}
                currentImageUrl={wheel.backgroundImage}
                imageType="background"
                title="Image de fond (optionnel)"
                description="Image de fond pour personnaliser l'arrière-plan de la page (optionnel)"
                recommendedSize="1920x1080px"
              />
              
              {/* Only show game rules for super admins */}
              {user?.role === 'SUPER' && (
                <div className="space-y-2">
                  <Label htmlFor="gameRules">Règles du jeu (optionnel)</Label>
                  <Textarea
                    id="gameRules"
                    placeholder="Règles et instructions personnalisées... (laissez vide pour utiliser les règles par défaut)"
                    value={wheel.gameRules || ''}
                    onChange={(e) => setWheel({ ...wheel, gameRules: e.target.value })}
                    rows={5}
                  />
                  <p className="text-xs text-gray-500">Personnalisez les règles affichées aux joueurs (optionnel - des règles par défaut seront utilisées si vide).</p>
                </div>
              )}
              
              {/* Only show footer text for super admins */}
              {user?.role === 'SUPER' && (
                <div className="space-y-2">
                  <Label htmlFor="footerText">Texte du pied de page (optionnel)</Label>
                  <Input
                    id="footerText"
                    placeholder="Ex: © 2024 Votre Entreprise - Contactez-nous au 01.23.45.67.89"
                    value={wheel.footerText || ''}
                    onChange={(e) => setWheel({ ...wheel, footerText: e.target.value })}
                  />
                  <p className="text-xs text-gray-500">
                    Personnalisez le texte affiché en bas de la page (optionnel). 
                    <span className="text-blue-600 ml-1">Les numéros de téléphone seront automatiquement cliquables</span>.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default WheelEdit; 
