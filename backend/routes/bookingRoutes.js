import { Router } from 'express';
import {
  acceptBooking,
  cancelBooking,
  completeBooking,
  createBooking,
  getBooking,
  getMyBookings,
  listBookings,
  rejectBooking
} from '../controllers/bookingController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(authenticateToken);

router.post('/', authorizeRole('farmer'), asyncHandler(createBooking));
router.get('/', authorizeRole('farmer', 'worker', 'equipment_owner', 'admin'), asyncHandler(listBookings));
router.get('/my-bookings', authorizeRole('farmer', 'worker', 'equipment_owner'), asyncHandler(getMyBookings));
router.get('/:id', authorizeRole('farmer', 'worker', 'equipment_owner', 'admin'), asyncHandler(getBooking));
router.put('/:id/accept', authorizeRole('worker', 'farmer', 'equipment_owner', 'admin'), asyncHandler(acceptBooking));
router.put('/:id/reject', authorizeRole('worker', 'farmer', 'equipment_owner', 'admin'), asyncHandler(rejectBooking));
router.put('/:id/cancel', authorizeRole('farmer', 'admin'), asyncHandler(cancelBooking));
router.put('/:id/complete', authorizeRole('worker', 'farmer', 'equipment_owner', 'admin'), asyncHandler(completeBooking));

export default router;
