import { Router } from 'express';
import {
  getAutomationSettings,
  updateAutomationSettings,
  getAnswerBank,
  createAnswerBankItem,
  deleteAnswerBankItem,
  getNotifications,
  markNotificationRead,
} from '../controllers/settingsController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/automation', getAutomationSettings);
router.put('/automation', updateAutomationSettings);

router.get('/answer-bank', getAnswerBank);
router.post('/answer-bank', createAnswerBankItem);
router.delete('/answer-bank/:id', deleteAnswerBankItem);

router.get('/notifications', getNotifications);
router.patch('/notifications/:id/read', markNotificationRead);

export default router;

