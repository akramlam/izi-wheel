import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Wheel } from 'react-custom-roulette';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Loader2, Mail, Phone, Calendar, User, Sparkles } from 'lucide-react';
import { Confetti } from '@/components/magicui/confetti';

// Brand accent color and confetti colors
const ACCENT = '#6366f1'; // Indigo
const CONFETTI_COLORS = [ACCENT, '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff'];

const inputIcons = {
  name: <User className="h-4 w-4 text-gray-400" />,
  email: <Mail className="h-4 w-4 text-gray-400" />,
  phone: <Phone className="h-4 w-4 text-gray-400" />,
  birthDate: <Calendar className="h-4 w-4 text-gray-400" />,
};

const PlayWheelV2 = () => {
  const { companyId, wheelId } = useParams<{ companyId: string; wheelId: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeIndex, setPrizeIndex] = useState(0);
  const [showResultModal, setShowResultModal] = useState(false);
  const [spinResult, setSpinResult] = useState<any>(null);
  const [formFields, setFormFields] = useState<any[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);

  // Fetch wheel data
  const { data: wheelData, isLoading: isLoadingWheel, error: wheelError } = useQuery({
    queryKey: ['wheel', companyId, wheelId],
    queryFn: async () => {
      const response = await api.getPublicWheel(companyId || '', wheelId || '');
      return response.data.wheel;
    },
    enabled: !!companyId && !!wheelId,
  });

  useEffect(() => {
    if (wheelData) {
      const fields: any[] = [];
      if (wheelData.formSchema) {
        if (Array.isArray(wheelData.formSchema.fields)) {
          fields.push(...wheelData.formSchema.fields);
        } else if (typeof wheelData.formSchema === 'object') {
          fields.push(
            { name: 'name', label: 'Name', type: 'text', required: true },
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'phone', label: 'Phone', type: 'tel', required: false },
            { name: 'birthDate', label: 'Birth Date', type: 'date', required: false }
          );
        }
      }
      setFormFields(fields);
    }
  }, [wheelData]);

  // Spin wheel mutation
  const { mutate: spinWheel, isPending: isSpinning } = useMutation({
    mutationFn: async () => {
      const response = await api.spinWheel(companyId || '', wheelId || '', { lead: formData });
      return response.data;
    },
    onSuccess: (data) => {
      if (!wheelData || !wheelData.slots || wheelData.slots.length === 0) return;
      let slotIndex = wheelData.slots.findIndex((slot: any) => slot.label === data.slot.label);
      if (slotIndex === -1) slotIndex = 0;
      setPrizeIndex(slotIndex);
      setSpinResult(data);
      setMustSpin(true);
      setTimeout(() => {
        setShowResultModal(true);
        if (data.play.result === 'WIN') setShowConfetti(true);
      }, 5000);
    },
    onError: () => {
      alert('Failed to spin the wheel. Please try again.');
    }
  });

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(formData).length === 0) return;
    spinWheel();
  };

  const handleStopSpinning = () => setMustSpin(false);

  // --- UI ---
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-x-hidden bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-100 animate-gradient-move">
      {/* Animated background gradient */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-100 blur-2xl opacity-80 animate-gradient-move" />
      {/* Placeholder logo/brand */}
      <div className="absolute top-8 left-1/2 z-20 -translate-x-1/2 flex items-center gap-2 text-3xl font-extrabold text-indigo-700 drop-shadow-lg select-none">
        <Sparkles className="h-8 w-8 text-pink-400 animate-bounce" />
        IZI Wheel
      </div>
      {/* Confetti (Magic UI) */}
      {showConfetti && (
        <Confetti
          options={{
            particleCount: 160,
            angle: 90,
            spread: 120,
            colors: CONFETTI_COLORS,
            shapes: ["star", "circle", "square"],
          }}
          className="!fixed inset-0 z-[300] pointer-events-none"
        />
      )}
      <div className="z-10 flex w-full max-w-6xl flex-col items-center justify-center gap-12 px-4 py-16 md:flex-row md:gap-20">
        {/* Wheel Section */}
        <div className="relative flex flex-col items-center justify-center">
          {/* Spinning blur/glow behind the wheel */}
          <div className="absolute z-0 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-indigo-400/30 via-pink-400/20 to-purple-400/30 blur-3xl animate-spin-slow" style={{ animationDuration: '12s' }} />
          <div className="relative h-96 w-96 rounded-full shadow-2xl bg-white/60 backdrop-blur-2xl border-[12px] border-indigo-400/80 overflow-visible">
            {/* Multi-layered border for 3D effect */}
            <div className="absolute inset-0 z-10 rounded-full pointer-events-none">
              <div className="absolute inset-0 rounded-full border-[10px] border-white/60" />
              <div className="absolute inset-2 rounded-full border-[6px] border-indigo-300/60" />
              <div className="absolute inset-4 rounded-full border-[2px] border-purple-200/60" />
            </div>
            {/* Animated wheel glow */}
            <div className="absolute -inset-4 z-0 rounded-full bg-gradient-to-br from-indigo-400 via-pink-400 to-purple-400 opacity-40 blur-2xl animate-pulse" />
            {/* SVG gloss/reflection overlay */}
            <svg className="absolute inset-0 z-20 w-full h-full pointer-events-none" viewBox="0 0 384 384" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="192" cy="90" rx="120" ry="40" fill="white" fillOpacity="0.18" />
              <ellipse cx="192" cy="100" rx="90" ry="20" fill="white" fillOpacity="0.10" />
              <ellipse cx="192" cy="300" rx="80" ry="16" fill="white" fillOpacity="0.07" />
            </svg>
            {wheelData && wheelData.slots && wheelData.slots.length > 0 ? (
              <Wheel
                mustStartSpinning={mustSpin}
                prizeNumber={prizeIndex}
                data={wheelData.slots.map((slot: any) => ({ option: slot.label || 'Prize' }))}
                onStopSpinning={handleStopSpinning}
                spinDuration={0.6}
                backgroundColors={wheelData.slots.map((slot: any) => slot.color || '#a5b4fc')}
                textColors={Array(wheelData.slots.length).fill('#fff')}
                outerBorderColor="#6366f1"
                outerBorderWidth={12}
                innerBorderColor="#fff"
                innerBorderWidth={24}
                textDistance={80}
                perpendicularText={true}
                radiusLineColor="#fff5"
                radiusLineWidth={2}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center rounded-full border-8 border-indigo-600 bg-white">
                <div className="p-8 text-center">
                  <p className="text-xl font-bold text-gray-800">La roue n'est pas configurée</p>
                  <p className="mt-2 text-gray-600">Aucune option n'est disponible pour cette roue.</p>
                </div>
              </div>
            )}
            {/* Enhanced pointer with metallic/gem look and shadow */}
            <div className="absolute left-1/2 top-0 z-30 -translate-x-1/2 -translate-y-1/2">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-pink-400 via-indigo-400 to-purple-400 shadow-2xl flex items-center justify-center animate-bounce pointer-events-none border-4 border-white/80">
                <div className="h-10 w-10 bg-gradient-to-b from-white via-indigo-100 to-indigo-400 rounded-b-full shadow-lg flex items-center justify-center" style={{ clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }}>
                  <div className="h-3 w-3 rounded-full bg-gradient-to-br from-yellow-300 via-pink-200 to-indigo-200 shadow-inner border border-white/80 mt-1" />
                </div>
              </div>
              {/* Pointer shadow */}
              <div className="absolute left-1/2 top-10 -translate-x-1/2 w-8 h-4 bg-black/20 rounded-b-full blur-sm" />
            </div>
          </div>
        </div>
        {/* Form Section */}
        <div className="w-full max-w-md rounded-3xl bg-white/70 shadow-2xl backdrop-blur-2xl p-10 flex flex-col gap-8 border border-indigo-100/60 glassmorphic-card">
          <h2 className="text-3xl font-extrabold text-indigo-700 mb-4 text-center tracking-tight">Entrez vos coordonnées</h2>
          <form onSubmit={handleSubmit} className="space-y-7">
            {formFields.map((field: any) => (
              <div key={field.name} className="relative">
                <label htmlFor={field.name} className="absolute left-4 top-3 text-gray-400 pointer-events-none transition-all duration-200 peer-focus:-top-5 peer-focus:text-xs peer-focus:text-indigo-500 peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400">
                  {inputIcons[field.name as keyof typeof inputIcons] || null} <span className="ml-1">{field.label}</span> {field.required && <span className="text-red-500">*</span>}
                </label>
                <input
                  id={field.name}
                  name={field.name}
                  type={field.type}
                  required={field.required}
                  value={formData[field.name] || ''}
                  onChange={handleFormChange}
                  className="peer mt-8 block w-full rounded-xl border border-gray-300 bg-white/80 px-5 py-3 text-lg text-gray-800 shadow-md focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                  placeholder=" "
                  autoComplete="off"
                  aria-label={field.label}
                />
              </div>
            ))}
            <Button
              type="submit"
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 py-4 text-xl font-bold text-white shadow-xl hover:from-indigo-600 hover:to-pink-600 transition-all duration-200 animate-shimmer"
              disabled={isSpinning || mustSpin}
              aria-label="Tournez la roue !"
            >
              {isSpinning ? (
                <>
                  <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                  Lancement en cours...
                </>
              ) : (
                'Tournez la roue !'
              )}
            </Button>
          </form>
        </div>
      </div>
      {/* Result Modal */}
      <Dialog open={showResultModal} onOpenChange={(open) => { setShowResultModal(open); if (!open) setShowConfetti(false); }}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-white/95 shadow-2xl backdrop-blur-2xl border border-indigo-100/60 animate-fade-in">
          <DialogHeader>
            <DialogTitle className="text-center text-3xl font-extrabold">
              {spinResult?.play.result === 'WIN' ? '🎉 Félicitations !' : '😅 Pas de chance cette fois'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            {spinResult?.play.result === 'WIN' ? (
              <div className="space-y-6">
                <p className="text-2xl font-bold text-indigo-700">
                  Vous avez gagné: <span className="text-pink-600 font-extrabold">{spinResult.slot.label}</span>
                </p>
                <div className="rounded-xl bg-indigo-50 p-5 shadow-inner">
                  <p className="mb-2 font-semibold">Votre code PIN:</p>
                  <p className="text-3xl font-extrabold tracking-widest text-indigo-600 animate-pulse">
                    {spinResult.play.prize?.pin}
                  </p>
                  <p className="mt-2 text-base text-gray-500">
                    Conservez ce code PIN pour récupérer votre lot
                  </p>
                </div>
                <div className="mx-auto max-w-xs">
                  <p className="mb-2 font-semibold">Scannez le QR code pour récupérer votre lot:</p>
                  <img
                    src={spinResult.play.prize?.qrLink}
                    alt="QR Code"
                    className="mx-auto h-44 w-44 rounded-xl shadow-lg border border-indigo-100"
                  />
                </div>
              </div>
            ) : (
              <div className="py-8">
                <p className="text-2xl text-gray-700 font-semibold">Vous n'avez pas gagné cette fois-ci.</p>
                <p className="mt-3 text-lg text-gray-600">Merci d'avoir participé !</p>
              </div>
            )}
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <Button
              variant="outline"
              onClick={() => { setShowResultModal(false); setShowConfetti(false); }}
              className="rounded-xl border-indigo-200 text-lg px-6 py-2"
            >
              Fermer
            </Button>
            {spinResult?.play.result === 'WIN' && (
              <Button
                onClick={() => navigate(`/redeem/${spinResult.play.id}`)}
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 text-white text-lg px-6 py-2 font-bold shadow-md"
              >
                Récupérer le lot
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Extra: animated gradient shimmer for button */}
      <style>{`
        .animate-shimmer {
          background-size: 200% 100%;
          animation: shimmer 2s linear infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .glassmorphic-card {
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
          border-radius: 2rem;
          border: 1px solid rgba(255,255,255,0.18);
        }
        .animate-fade-in {
          animation: fadeIn 0.5s cubic-bezier(.4,0,.2,1);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-gradient-move {
          background-size: 400% 400%;
          animation: gradientMove 12s ease-in-out infinite;
        }
        @keyframes gradientMove {
          0%,100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
};

export default PlayWheelV2; 