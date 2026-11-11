import { Router } from 'express';
import {
  createWorkerProfile,
  deleteWorkerProfile,
  getMyProfile,
  getWorker,
  getWorkerJobs,
  listWorkerJobRequests,
  listWorkers,
  updateWorkerProfile
} from '../controllers/workerController.js';
import { acceptBooking, rejectBooking } from '../controllers/bookingController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(authenticateToken);

router.get('/my-profile', authorizeRole('worker'), asyncHandler(getMyProfile));
router.get('/my-jobs', authorizeRole('worker'), asyncHandler(getWorkerJobs));
router.get('/jobs', authorizeRole('worker'), asyncHandler(listWorkerJobRequests));
router.put('/jobs/:id/accept', authorizeRole('worker'), asyncHandler(acceptBooking));
router.put('/jobs/:id/reject', authorizeRole('worker'), asyncHandler(rejectBooking));

router.post('/', authorizeRole('worker'), asyncHandler(createWorkerProfile));
router.get('/', authorizeRole('farmer', 'worker', 'admin'), asyncHandler(listWorkers));
router.get('/:id', authorizeRole('farmer', 'worker', 'admin'), asyncHandler(getWorker));
router.put('/:id', authorizeRole('worker'), asyncHandler(updateWorkerProfile));
router.delete('/:id', authorizeRole('worker'), asyncHandler(deleteWorkerProfile));

export default router;
