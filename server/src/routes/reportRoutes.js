import { Router } from 'express';
import { getReports, getReportById, retryEmailReport } from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getReports);
router.get('/:id', getReportById);
router.post('/:id/retry-email', retryEmailReport);

export default router;

