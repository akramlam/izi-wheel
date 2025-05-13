import { Router } from 'express';
import { 
  getPublicWheel,
  spinWheel,
  getPrizeDetails,
  redeemPrize
} from '../controllers/public.controller';

const router = Router();

// Debug middleware for spin endpoint
const debugRequestMiddleware = (req, res, next) => {
  if (req.path.includes('/spin')) {
    console.log('DEBUG - Spin request received:');
    console.log('- URL:', req.originalUrl);
    console.log('- Method:', req.method);
    console.log('- Body:', JSON.stringify(req.body, null, 2));
    console.log('- Headers:', JSON.stringify({
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length'],
    }, null, 2));
  }
  next();
};

// Apply debug middleware
router.use(debugRequestMiddleware);

// Public wheel endpoints
router.get('/companies/:companyId/wheels/:wheelId', getPublicWheel);
router.post('/companies/:companyId/wheels/:wheelId/spin', spinWheel);

// Prize redemption endpoints
router.get('/plays/:playId', getPrizeDetails);
router.post('/plays/:playId/redeem', redeemPrize);

export default router; 