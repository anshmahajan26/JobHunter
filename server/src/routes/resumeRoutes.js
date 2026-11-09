import { Router } from 'express';
import {
  uploadResume,
  getResumes,
  getResumeById,
  deleteResume,
  reparseResume,
  tailorResumeForJob,
  getTailoredResumeForJob,
  downloadTailoredResume,
} from '../controllers/resumeController.js';
import { authenticate } from '../middleware/auth.js';
import { resumeUpload } from '../middleware/upload.js';

const router = Router();

router.use(authenticate);

router.post('/upload', resumeUpload.single('resume'), uploadResume);
router.get('/', getResumes);
router.post('/tailor/:jobId', tailorResumeForJob);
router.get('/tailored/:jobId', getTailoredResumeForJob);
router.get('/tailored/:id/download', downloadTailoredResume);
router.get('/:id', getResumeById);
router.delete('/:id', deleteResume);
router.post('/:id/parse', reparseResume);

export default router;

