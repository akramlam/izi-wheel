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
    // Navigate to the account settings page with the billing tab active
    navigate('/account-settings?tab=billing');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            {limitType === 'wheel' ? 'Maximum Wheels Reached' : 'Play Limit Reached'}
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            {limitType === 'wheel' 
              ? 'You have reached the maximum number of wheels allowed on the free plan.' 
              : `You have used all ${50 - remainingPlays} plays included in your free plan.`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="rounded-lg bg-blue-50 p-4 mb-4">
            <h3 className="font-medium text-blue-800 mb-2">Upgrade to a paid plan to:</h3>
            <ul className="list-disc pl-5 text-blue-700 space-y-1">
              <li>Create unlimited wheels</li>
              <li>Get unlimited plays</li>
              <li>Access premium features</li>
              <li>Priority customer support</li>
            </ul>
          </div>
          
          <div className="text-sm text-gray-500">
            Your free trial includes 1 wheel and 50 plays. Upgrade now to continue using IZI Wheel without interruption.
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="sm:w-1/2">
            Maybe Later
          </Button>
          <Button onClick={handleUpgrade} className="sm:w-1/2 bg-blue-600 hover:bg-blue-700">
            Upgrade Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradePlanModal; 