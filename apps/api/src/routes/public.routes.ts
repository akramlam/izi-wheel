import { Router } from 'express';
import { 
  getPublicWheel,
  spinWheel,
  getPrizeDetails,
  redeemPrize
} from '../controllers/public.controller';

const router = Router();

// Public wheel endpoints
router.get('/companies/:companyId/wheels/:wheelId', getPublicWheel);
router.post('/companies/:companyId/wheels/:wheelId/spin', spinWheel);

// Prize redemption endpoints
router.get('/plays/:playId', getPrizeDetails);
router.post('/plays/:playId/redeem', redeemPrize);

export default router; 