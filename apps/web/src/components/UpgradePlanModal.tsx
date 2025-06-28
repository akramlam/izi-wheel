import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';

export type UpgradePlanModalProps = {
  isOpen: boolean;
  onClose: () => void;
  limitType: 'wheel' | 'play';
  remainingPlays?: number;
};

const UpgradePlanModal = ({ isOpen, onClose, limitType, remainingPlays = 0 }: UpgradePlanModalProps) => {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    // Navigate to the profile page (billing tab not implemented yet)
    navigate('/profile');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            {limitType === 'wheel' ? 'Limite de roues atteinte' : 'Limite de jeux atteinte'}
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            {limitType === 'wheel' 
              ? 'Vous avez atteint le nombre maximum de roues autorisées avec le plan gratuit.' 
              : `Vous avez utilisé les ${50 - remainingPlays} jeux inclus dans votre plan gratuit.`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="rounded-lg bg-blue-50 p-4 mb-4">
            <h3 className="font-medium text-blue-800 mb-2">Passez à un plan payant pour :</h3>
            <ul className="list-disc pl-5 text-blue-700 space-y-1">
              <li>Créer un nombre illimité de roues</li>
              <li>Obtenir des jeux illimités</li>
              <li>Accéder aux fonctionnalités premium</li>
              <li>Support client prioritaire</li>
            </ul>
          </div>
          
          <div className="text-sm text-gray-500">
            Votre essai gratuit inclut 1 roue et 50 jeux. Passez à un plan payant pour continuer à utiliser IZI Kado sans interruption.
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="sm:w-1/2">
            Plus tard
          </Button>
          <Button onClick={handleUpgrade} className="sm:w-1/2 bg-blue-600 hover:bg-blue-700">
            Améliorer maintenant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradePlanModal; 