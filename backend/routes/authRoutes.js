import { Router } from 'express';
import {
  getProfile,
  login,
  register,
  resendRegistrationOtp,
  updateProfile,
  verifyRegistration
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.post('/register', asyncHandler(register));
router.post('/register/verify', asyncHandler(verifyRegistration));
router.post('/register/resend-otp', asyncHandler(resendRegistrationOtp));
router.post('/login', asyncHandler(login));
router.get('/profile', authenticate, asyncHandler(getProfile));
router.put('/profile', authenticate, asyncHandler(updateProfile));

export default router;
