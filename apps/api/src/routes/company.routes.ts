import { Router } from 'express';
import { authMiddleware, roleGuard, companyGuard } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';
import wheelRoutes from './wheel.routes';
import userRoutes from './user.routes';
import { 
  getCompanyStatistics, 
  getAllCompanies, 
  updateCompany,
  createCompany,
  deleteCompany
} from '../controllers/company.controller';

// Add type annotation for router
const router: Router = Router();

// Apply authentication middleware to all company routes
router.use(authMiddleware);

// Nest wheel routes under company
router.use('/:companyId/wheels', companyGuard, wheelRoutes);

// Nest user routes under company
router.use('/:cid/users', companyGuard, userRoutes);

// Register statistics endpoint
router.get('/:companyId/statistics', companyGuard, getCompanyStatistics);

// Register all companies endpoint (SUPER only)
router.get('/', roleGuard([Role.SUPER]), getAllCompanies);

// Register update company endpoint (SUPER only)
router.put('/:companyId', roleGuard([Role.SUPER]), updateCompany);

// Create company endpoint (SUPER only)
router.post('/', roleGuard([Role.SUPER]), createCompany);

// Delete company endpoint (SUPER only)
router.delete('/:id', roleGuard([Role.SUPER]), deleteCompany);

export default router; 