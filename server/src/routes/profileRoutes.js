import { Router } from 'express';
import { getProfile, updateProfile, updatePreferences, verifyProfile } from '../controllers/profileController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getProfile);
router.put('/', updateProfile);
router.put('/preferences', updatePreferences);
router.put('/verify', verifyProfile);

export default router;

