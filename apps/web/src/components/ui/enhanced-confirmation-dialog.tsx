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
import { AlertTriangle, Trash2, X, CheckCircle } from 'lucide-react';
import { BorderBeam } from '../magicui/border-beam';
import confetti from '../magicui/confetti';

interface EnhancedConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive' | 'success';
  icon?: React.ReactNode;
  isLoading?: boolean;
  showConfetti?: boolean;
}

export const EnhancedConfirmationDialog: React.FC<EnhancedConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Êtes-vous sûr ?',
  description = 'Cette action ne peut pas être annulée.',
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'default',
  icon,
  isLoading = false,
  showConfetti = false,
}) => {
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (showConfetti && !isLoading) {
      setShowSuccess(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [showConfetti, isLoading]);

  const getVariantStyles = () => {
    switch (variant) {
      case 'destructive':
        return {
          iconColor: 'text-red-500',
          buttonVariant: 'destructive' as const,
          borderColor: 'border-red-200',
          bgColor: 'bg-red-50'
        };
      case 'success':
        return {
          iconColor: 'text-green-500',
          buttonVariant: 'default' as const,
          borderColor: 'border-green-200',
          bgColor: 'bg-green-50'
        };
      default:
        return {
          iconColor: 'text-amber-500',
          buttonVariant: 'default' as const,
          borderColor: 'border-amber-200',
          bgColor: 'bg-amber-50'
        };
    }
  };

  const styles = getVariantStyles();
  
  const defaultIcon = variant === 'destructive' ? 
    <AlertTriangle className={`h-6 w-6 ${styles.iconColor}`} /> : 
    variant === 'success' ?
    <CheckCircle className={`h-6 w-6 ${styles.iconColor}`} /> :
    <AlertTriangle className={`h-6 w-6 ${styles.iconColor}`} />;

  const handleConfirm = () => {
    onConfirm();
  };

  if (showSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px] relative overflow-hidden">
          <BorderBeam size={250} duration={12} delay={9} />
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <DialogTitle className="text-xl font-semibold text-green-600 mb-2">
              Succès !
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              L'action a été effectuée avec succès.
            </DialogDescription>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`sm:max-w-[425px] relative ${variant === 'destructive' ? 'border-red-200' : ''}`}>
        {variant === 'destructive' && <BorderBeam size={250} duration={12} delay={9} colorFrom="#ef4444" colorTo="#dc2626" />}
        
        <DialogHeader>
          <div className={`flex items-center gap-3 mb-2 p-3 rounded-lg ${styles.bgColor}`}>
            {icon || defaultIcon}
            <DialogTitle className="text-lg font-semibold">
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-gray-600 px-3">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex gap-2 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 hover:bg-gray-50"
          >
            <X className="h-4 w-4 mr-2" />
            {cancelText}
          </Button>
          <Button
            variant={styles.buttonVariant}
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            ) : variant === 'destructive' ? (
              <Trash2 className="h-4 w-4 mr-2" />
            ) : null}
            {confirmText}
          </Button>
        </DialogFooter>
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