import { Router } from 'express';
import {
  getProfile,
  login,
  register,
  resendLoginOtp,
  resendRegistrationOtp,
  verifyLogin,
  verifyRegistration
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.post('/register', asyncHandler(register));
router.post('/register/verify', asyncHandler(verifyRegistration));
router.post('/register/resend-otp', asyncHandler(resendRegistrationOtp));
router.post('/login', asyncHandler(login));
router.post('/login/verify', asyncHandler(verifyLogin));
router.post('/login/resend-otp', asyncHandler(resendLoginOtp));
router.get('/profile', authenticate, asyncHandler(getProfile));

export default router;
