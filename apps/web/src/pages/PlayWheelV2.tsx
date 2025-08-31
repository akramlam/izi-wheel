import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Wheel3D, WheelConfig } from '../components/wheel';
import soundUtils from '../lib/sound';
import PlayerForm, { FormField, PlayerFormData } from '../components/PlayerForm';
import { toast } from '../hooks/use-toast';
import SpinWheelWrapper from '../components/wheel/SpinWheelWrapper';

const PlayWheelV2 = () => {
  const { companyId, wheelId } = useParams<{ companyId: string; wheelId: string }>();
  const navigate = useNavigate();
  const isPublic = typeof window !== 'undefined' && window.location.hostname === 'roue.izikado.fr';
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [prizeIndex, setPrizeIndex] = useState(0);
  const [showResultModal, setShowResultModal] = useState(false);
  const [spinResult, setSpinResult] = useState<any>(null);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  
  // Initialize wheel configuration
  const [wheelConfig, setWheelConfig] = useState<WheelConfig>({
    segments: [],
    spinDurationMin: 3,
    spinDurationMax: 6,
    sounds: {
      tick: !isPublic,
      win: !isPublic
    },
    hapticFeedback: !isPublic,
    colors: {
      primaryGradient: '#a25afd',
      secondaryGradient: '#6366f1'
    }
  });

  // Fetch wheel data
  const { data: wheelData } = useQuery({
    queryKey: ['wheel', companyId, wheelId],
    queryFn: async () => {
      const response = await api.getPublicWheel(companyId || '', wheelId || '');
      return response.data.wheel;
    },
    enabled: !!companyId && !!wheelId,
  });

  // Only init sounds when not public
  useEffect(() => {
    if (!isPublic) soundUtils.init();
  }, [isPublic]);

  useEffect(() => {
    if (!wheelData) return;

    // Setup form fields (kept for non-public only)
    if (!isPublic) {
      const fields: FormField[] = [];
      if (wheelData.formSchema) {
        if (Array.isArray(wheelData.formSchema.fields)) {
          fields.push(...wheelData.formSchema.fields);
        } else if (typeof wheelData.formSchema === 'object') {
          fields.push(
            { name: 'name', label: 'Prénom', type: 'text', required: true },
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'phone', label: 'Téléphone', type: 'tel', required: false }
          );
        }
      }
      setFormFields(fields);
    }
    
    // Build segments from saved slots (no forced winning)
    if (wheelData?.slots && wheelData.slots.length > 0) {
      const preset = ['#FF6384','#36A2EB','#FFCE56','#4BC0C0','#9966FF','#FF9F40','#7CFC00','#FF4500','#1E90FF','#20B2AA'];
      const segments = wheelData.slots.map((slot: any, i: number) => ({
        label: (slot.label && String(slot.label).trim()) || `Lot ${i + 1}`,
        color: slot.color || preset[i % preset.length]
      }));
      setWheelConfig(prev => ({ ...prev, segments }));
    }
  }, [wheelData, isPublic]);

  // Spin wheel mutation
  const { mutate: spinWheel, isPending: isSpinningMutation } = useMutation({
    mutationFn: async () => {
      const response = await api.spinWheel(companyId || '', wheelId || '', { lead: formData });
      return response.data;
    },
    onSuccess: (data) => {
      if (!wheelData?.slots?.length) return;

      let slotIndex = 0;
      if (data.prizeIndex !== undefined && data.prizeIndex >= 0) {
        slotIndex = data.prizeIndex;
      } else if (data.slot?.label) {
        const match = wheelData.slots.findIndex((s: any) => s.label && s.label.trim().toLowerCase() === data.slot.label.trim().toLowerCase());
        slotIndex = match >= 0 ? match : 0;
      }

      setPrizeIndex(slotIndex);
      setSpinResult(data);

      // Shorter delay on public for snappier UX
      setTimeout(() => {
        setIsSpinning(false);
        setShowResultModal(true);
      }, isPublic ? 800 : 1500);

      setIsSpinning(true);
    },
    onError: (error: any) => {
      const backendMsg = error?.response?.data?.error || "";
      toast({ title: backendMsg || "Erreur : Impossible de faire tourner la roue.", variant: "destructive" });
      setIsSpinning(false);
    }
  });

  const handleFormSubmit = (data: PlayerFormData) => {
    if (!isPublic) soundUtils.play('click');
    const apiFormData: Record<string, string> = {};
    if (data.name) apiFormData.name = data.name;
    if (data.email) apiFormData.email = data.email;
    if (data.phone) apiFormData.phone = data.phone;
    if (Object.keys(apiFormData).length === 0) {
      toast({ title: "Erreur : Veuillez remplir au moins un champ pour participer.", variant: "destructive" });
      return;
    }
    setFormData(apiFormData);
    spinWheel();
  };

  const handleWheelFinishedSpin = () => {
    setIsSpinning(false);
    setShowResultModal(true);
  };

  // --- UI ---
  return (
    <div 
      className={isPublic ? "min-h-screen w-full flex items-center justify-center bg-white" : "relative min-h-screen w-full flex items-center justify-center overflow-x-hidden bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-100 animate-gradient-move"}
      style={isPublic ? undefined : { overflowY: 'auto', scrollbarGutter: 'stable', minHeight: '100vh', position: 'relative' }}
    >
      {!isPublic && (
        <div className="absolute top-8 left-1/2 z-20 -translate-x-1/2 text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-pink-600 select-none">
          IZI Kado
        </div>
      )}

      <div className="container z-10 px-4 py-10">
        <div className={isPublic ? "grid grid-cols-1" : "grid grid-cols-1 md:grid-cols-2 gap-8 items-center"}>
          <div className="flex justify-center w-full">
            <div className="relative p-2">
              {wheelConfig.segments.length > 0 ? (
                <div className="flex items-center justify-center">
                  <div style={{ width: isPublic ? 'min(92vw, 92vh)' as any : 384 }}>
                    <SpinWheelWrapper
                      items={wheelConfig.segments.map((s, idx) => ({
                        label: s.label,
                        backgroundColor: s.color,
                        weight: wheelData?.slots?.[idx]?.weight || 1,
                      }))}
                      onRest={handleWheelFinishedSpin}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex h-96 w-96 flex-col items-center justify-center rounded-full border-[12px] border-indigo-400/80 bg-white/60">
                  <div className="p-8 text-center">
                    <p className="text-xl font-bold text-gray-800">La roue n'est pas configurée</p>
                    <p className="mt-2 text-gray-600">Aucune option n'est disponible pour cette roue.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {!isPublic && (
            <div className="w-full max-w-md mx-auto rounded-3xl bg-white/70 shadow-2xl backdrop-blur-2xl p-10 flex flex-col gap-8 border border-indigo-100/60">
              <div className="text-center mb-2">
                <h2 className="text-2xl font-bold text-indigo-700">Participez au jeu</h2>
                <p className="text-gray-600 mt-2">Remplissez le formulaire pour faire tourner la roue et tenter de gagner</p>
              </div>
              <PlayerForm fields={formFields} onSubmit={handleFormSubmit} isSubmitting={isSpinningMutation || isSpinning} />
            </div>
          )}
        </div>
      </div>

      {/* Result Modal */}
      <Dialog open={showResultModal} onOpenChange={(open) => { setShowResultModal(open); }}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-white/95 shadow-2xl border border-indigo-100/60">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold">
              {spinResult?.play?.result === 'WIN' ? '🎉 Félicitations !' : '😞 Pas de chance cette fois'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            {spinResult?.play?.result === 'WIN' ? (
              <div className="space-y-4">
                <p className="text-lg font-bold">
                  Vous avez gagné: <span className="text-pink-600">{wheelConfig.segments[prizeIndex]?.label || spinResult?.slot?.label}</span>
                </p>
              </div>
            ) : (
              <div className="py-2">
                <p className="text-base text-gray-700">Vous n'avez pas gagné cette fois-ci.</p>
              </div>
            )}
          </div>
          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={() => { setShowResultModal(false); setIsSpinning(false); }}>
              Fermer
            </Button>
            {spinResult?.play?.result === 'WIN' && (
              <Button onClick={() => {
                const id = spinResult?.play?.id;
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (id && uuidRegex.test(id)) {
                  sessionStorage.setItem('lastPlayId', id);
                  navigate(`/redeem/${id}`);
                } else {
                  toast({ title: "Erreur : Identifiant de jeu invalide.", variant: "destructive" });
                }
              }}>
                Récupérer le lot
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlayWheelV2; 
