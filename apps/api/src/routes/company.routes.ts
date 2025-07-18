import { Router } from 'express';
import { authMiddleware, roleGuard } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';
import wheelRoutes from './wheel.routes';
import { getCompanies, createCompany, deleteCompany, updateCompany, getCompanyStatistics, validateSuperAdminAccess, getCompany } from '../controllers/company.controller';
import { getCompanyUsers, inviteUser, updateUser, deleteUser, resetUserPassword } from '../controllers/user.controller';

// Add type annotation for router
const router: Router = Router();

// Apply authentication middleware to all company routes
router.use(authMiddleware);

// Validate company access route (no role guard so any authenticated user can use it)
router.get('/validate-access', authMiddleware, validateSuperAdminAccess);

// Nest wheel routes under company
router.use('/:companyId/wheels', wheelRoutes);

router.get('/', authMiddleware, roleGuard([Role.SUPER]), getCompanies);
router.post('/', authMiddleware, roleGuard([Role.SUPER]), createCompany);
router.delete('/:id', authMiddleware, roleGuard([Role.SUPER]), deleteCompany);
router.patch('/:id/plan', authMiddleware, roleGuard([Role.SUPER]), updateCompany);

// Statistics endpoint
router.get('/:companyId/statistics', authMiddleware, roleGuard([Role.SUPER, Role.ADMIN]), getCompanyStatistics);

// User management endpoints (ADMIN+)
router.get('/:companyId/users', authMiddleware, roleGuard([Role.SUPER, Role.ADMIN]), getCompanyUsers);
router.post('/:companyId/users', authMiddleware, roleGuard([Role.SUPER, Role.ADMIN]), inviteUser);
router.put('/:companyId/users/:uid', authMiddleware, roleGuard([Role.SUPER, Role.ADMIN]), updateUser);
router.put('/:companyId/users/:uid/reset-password', authMiddleware, roleGuard([Role.SUPER, Role.ADMIN]), resetUserPassword);
router.delete('/:companyId/users/:uid', authMiddleware, roleGuard([Role.SUPER, Role.ADMIN]), deleteUser);

// Company CRUD operations
router.get('/:companyId', authMiddleware, roleGuard([Role.SUPER, Role.ADMIN]), getCompany);
router.put('/:companyId', authMiddleware, roleGuard([Role.SUPER, Role.ADMIN]), updateCompany);
router.delete('/:companyId', authMiddleware, roleGuard([Role.SUPER, Role.ADMIN]), deleteCompany);

// TODO: Add company CRUD operations in future milestone


export default router; 