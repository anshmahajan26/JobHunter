import { Router } from 'express';
import {
  triggerAgentRun,
  stopAgentRun,
  getAgentStatus,
  getAgentHistory,
  pauseAgent,
  resumeAgent,
} from '../controllers/agentController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.post('/run', triggerAgentRun);
router.post('/stop', stopAgentRun);
router.get('/status', getAgentStatus);
router.get('/history', getAgentHistory);
router.post('/pause', pauseAgent);
router.post('/resume', resumeAgent);

export default router;

