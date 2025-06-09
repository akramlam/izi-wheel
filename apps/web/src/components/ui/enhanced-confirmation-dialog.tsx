import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Button } from './button';
import { AlertTriangle, Trash2, X, CheckCircle, Loader2 } from 'lucide-react';
import { BorderBeam } from '../magicui/border-beam';
import confetti from '../magicui/confetti';
import { Input } from './input';
import { Label } from './label';

interface EnhancedConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (force?: boolean) => Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'default';
  isLoading?: boolean;
  
  // Enhanced props for force deletion
  requireNameConfirmation?: boolean;
  itemName?: string; // Name of the item being deleted (company name)
  forceDeleteMessage?: string; // Custom message explaining why force delete is needed
  activeWheelsCount?: number;
  adminsCount?: number;
}

export const EnhancedConfirmationDialog: React.FC<EnhancedConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'default',
  isLoading = false,
  requireNameConfirmation = false,
  itemName = '',
  forceDeleteMessage = '',
  activeWheelsCount = 0,
  adminsCount = 0,
}) => {
  const [step, setStep] = useState<'normal' | 'force'>('normal');
  const [nameInput, setNameInput] = useState('');
  const [isNameValid, setIsNameValid] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('normal');
      setNameInput('');
      setIsNameValid(false);
    }
  }, [isOpen]);

  // Validate name input
  useEffect(() => {
    setIsNameValid(nameInput.trim() === itemName.trim());
  }, [nameInput, itemName]);

  const handleNormalConfirm = async () => {
    try {
      await onConfirm(false); // Normal deletion
    } catch (error: any) {
      // Check if error is due to active wheels
      if (error?.response?.status === 409 && requireNameConfirmation) {
        setStep('force'); // Switch to force deletion mode
      } else {
        // Re-throw other errors
        throw error;
      }
    }
  };

  const handleForceConfirm = async () => {
    if (isNameValid) {
      await onConfirm(true); // Force deletion
    }
  };

  const handleClose = () => {
    setStep('normal');
    setNameInput('');
    setIsNameValid(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className={`h-5 w-5 ${variant === 'destructive' ? 'text-red-500' : 'text-yellow-500'}`} />
            {step === 'force' ? 'Suppression forcée requise' : title}
          </DialogTitle>
        </DialogHeader>

        {step === 'normal' ? (
          // Normal confirmation step
          <>
            <DialogDescription className="text-sm text-gray-600 mb-4">
              {description}
            </DialogDescription>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                {cancelText}
              </Button>
              <Button
                variant={variant}
                onClick={handleNormalConfirm}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {confirmText}
              </Button>
            </div>
          </>
        ) : (
          // Force deletion step
          <>
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-red-800 mb-2">
                      Impossible de supprimer l'entreprise
                    </p>
                    <p className="text-red-700 mb-3">
                      L'entreprise <strong>"{itemName}"</strong> contient:
                    </p>
                    <ul className="list-disc list-inside text-red-700 space-y-1 mb-3">
                      <li><strong>{activeWheelsCount}</strong> roue(s) active(s)</li>
                      <li><strong>{adminsCount}</strong> administrateur(s)</li>
                    </ul>
                    <p className="text-red-700">
                      La suppression supprimera <strong>définitivement</strong> toutes les données associées 
                      (roues, utilisateurs, parties jouées, etc.).
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="company-name" className="text-sm font-medium">
                  Pour confirmer, tapez le nom exact de l'entreprise:
                </Label>
                <Input
                  id="company-name"
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder={itemName}
                  className={`w-full ${
                    nameInput && !isNameValid 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                      : nameInput && isNameValid
                      ? 'border-green-500 focus:border-green-500 focus:ring-green-500'
                      : ''
                  }`}
                  disabled={isLoading}
                  autoComplete="off"
                />
                {nameInput && !isNameValid && (
                  <p className="text-xs text-red-600">
                    Le nom ne correspond pas. Tapez exactement: <strong>{itemName}</strong>
                  </p>
                )}
                {isNameValid && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    ✓ Nom confirmé
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleForceConfirm}
                disabled={!isNameValid || isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                Supprimer définitivement
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Enhanced Delete Confirmation Dialog with Magic UI effects
export const EnhancedDeleteConfirmationDialog: React.FC<Omit<EnhancedConfirmationDialogProps, 'variant' | 'icon' | 'title' | 'confirmText'> & {
  itemName?: string;
}> = ({ itemName = 'cet élément', ...props }) => (
  <EnhancedConfirmationDialog
    {...props}
    variant="destructive"
    title="⚠️ Suppression définitive"
    description={`Êtes-vous sûr de vouloir supprimer ${itemName} ? Cette action est irréversible et toutes les données associées seront perdues.`}
    confirmText="Supprimer définitivement"
    icon={<Trash2 className="h-6 w-6 text-red-500" />}
    showConfetti={false}
  />
);

export default EnhancedConfirmationDialog; 