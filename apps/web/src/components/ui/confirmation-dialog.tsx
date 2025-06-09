import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Button } from './button';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
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
}) => {
  const defaultIcon = variant === 'destructive' ? 
    <AlertTriangle className="h-6 w-6 text-red-500" /> : 
    <AlertTriangle className="h-6 w-6 text-amber-500" />;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {icon || defaultIcon}
            <DialogTitle className="text-lg font-semibold">
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-gray-600">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex gap-2 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            {cancelText}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={onConfirm}
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

// Predefined confirmation dialogs for common actions
export const DeleteConfirmationDialog: React.FC<Omit<ConfirmationDialogProps, 'variant' | 'icon' | 'title' | 'confirmText'> & {
  itemName?: string;
}> = ({ itemName = 'cet élément', ...props }) => (
  <ConfirmationDialog
    {...props}
    variant="destructive"
    title="Supprimer définitivement"
    description={`Êtes-vous sûr de vouloir supprimer ${itemName} ? Cette action est irréversible et toutes les données associées seront perdues.`}
    confirmText="Supprimer"
    icon={<Trash2 className="h-6 w-6 text-red-500" />}
  />
);

export default ConfirmationDialog; 