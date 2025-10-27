import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { X, FileText } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../hooks/use-toast';

interface CompanyTextsModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  companyName: string;
  initialContactText?: string;
  initialRulesText?: string;
}

export const CompanyTextsModal: React.FC<CompanyTextsModalProps> = ({
  isOpen,
  onClose,
  companyId,
  companyName,
  initialContactText = '',
  initialRulesText = '',
}) => {
  const { toast } = useToast();
  const [contactText, setContactText] = useState(initialContactText);
  const [rulesText, setRulesText] = useState(initialRulesText);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setContactText(initialContactText);
    setRulesText(initialRulesText);
  }, [initialContactText, initialRulesText, isOpen]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await api.updateCompanyTexts(companyId, {
        contactText: contactText || null,
        rulesText: rulesText || null,
      });

      toast({
        title: 'Succès',
        description: 'Les textes ont été mis à jour avec succès',
      });

      onClose();
    } catch (error: any) {
      console.error('Error updating company texts:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.response?.data?.error || 'Impossible de mettre à jour les textes',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-indigo-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Modifier les textes</h2>
              <p className="text-sm text-gray-600">{companyName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Contact Text */}
          <div>
            <Label htmlFor="contactText" className="text-base font-semibold text-gray-900">
              📞 Contact
            </Label>
            {/* <p className="text-sm text-gray-600 mb-2">
              Ce texte sera affiché dans un modal lorsque les utilisateurs cliquent sur "Contact"
            </p>
            <Textarea
              id="contactText"
              value={contactText}
              onChange={(e) => setContactText(e.target.value)}
              placeholder="Ex: Pour nous contacter :&#10;Email: contact@example.com&#10;Téléphone: +33 1 23 45 67 89&#10;Adresse: 123 Rue Exemple, Paris"
              className="min-h-[150px] font-mono text-sm"
            /> */}
            <button onClick={() => (window.location.href = 'https://izikado.fr/')}>
              
            </button>
          </div>

          {/* Rules Text */}
          <div>
            <Label htmlFor="rulesText" className="text-base font-semibold text-gray-900">
              📋 Règlement
            </Label>
            <p className="text-sm text-gray-600 mb-2">
              Ce texte sera affiché dans un modal lorsque les utilisateurs cliquent sur "Règlement"
            </p>
            <Textarea
              id="rulesText"
              value={rulesText}
              onChange={(e) => setRulesText(e.target.value)}
              placeholder="Ex: CONDITIONS GÉNÉRALES D'UTILISATION&#10;&#10;Article 1 - Organisation et contexte&#10;Le jeu marketing est organisé par...&#10;&#10;Article 2 - Participation&#10;La participation au jeu est réservée..."
              className="min-h-[200px] font-mono text-sm"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
          <Button onClick={onClose} variant="outline" disabled={isSaving}>
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  );
};
