import { Router } from 'express';
import {
  getJobs,
  getJobById,
  triggerDiscovery,
  matchJob,
  toggleSaveJob,
  dismissJob,
} from '../controllers/jobController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getJobs);
router.post('/discover', triggerDiscovery);
router.get('/:id', getJobById);
router.post('/:id/match', matchJob);
router.post('/:id/save', toggleSaveJob);
router.post('/:id/dismiss', dismissJob);

export default router;

