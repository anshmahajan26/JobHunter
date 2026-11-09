import { Router } from 'express';
import {
  getAdminStats,
  getUsers,
  toggleUserStatus,
  getCompanyBoards,
  addCompanyBoard,
  toggleCompanyBoard,
  checkBoardHealth,
  getAIUsage,
  getSystemErrors,
} from '../controllers/adminController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Restrict all routes to admin
router.use(authenticate, authorize('admin'));

router.get('/stats', getAdminStats);
router.get('/users', getUsers);
router.patch('/users/:id/status', toggleUserStatus);
router.get('/boards', getCompanyBoards);
router.post('/boards', addCompanyBoard);
router.patch('/boards/:id/toggle', toggleCompanyBoard);
router.get('/boards/:id/health', checkBoardHealth);
router.get('/ai-usage', getAIUsage);
router.get('/errors', getSystemErrors);

export default router;

