import { Router } from 'express';
import {
  getPendingActions,
  answerPendingAction,
  dismissPendingAction,
  markPendingAsApplied,
} from '../controllers/pendingActionController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getPendingActions);
router.post('/:id/answer', answerPendingAction);
router.post('/:id/dismiss', dismissPendingAction);
router.post('/:id/mark-applied', markPendingAsApplied);

export default router;

