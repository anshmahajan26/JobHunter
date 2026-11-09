import { Router } from 'express';
import {
  getApplications,
  getApplicationById,
  prepareJobApplication,
  submitApplication,
  updateApplicationStatus,
} from '../controllers/applicationController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getApplications);
router.get('/:id', getApplicationById);
router.post('/jobs/:id/prepare', prepareJobApplication);
router.post('/:id/submit', submitApplication);
router.patch('/:id/status', updateApplicationStatus);

export default router;

