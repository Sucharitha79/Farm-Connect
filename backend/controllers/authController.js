import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { config } from '../config/env.js';
import {
  authChallenges,
  otpCooldowns,
  pendingRegistrations,
  users
} from '../data/store.js';
import { AppError, badRequest } from '../utils/errors.js';
import { isValidEmail, requireString } from '../utils/validation.js';
import { generateOTP, hashOTP, verifyOTP } from '../utils/generateOTP.js';
import { sendOtpEmail } from '../utils/emailService.js';

const OTP_LIFETIME_MS = 5 * 60 * 1000;
const OTP_RESEND_WAIT_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const registrationRoles = ['farmer', 'buyer', 'worker', 'equipment_owner'];

const publicUser = ({ passwordHash, ...user }) => user;

const createToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });

const normalizeEmail = (value) =>
  requireString(value, 'email', { max: 254 }).toLowerCase();

const validateMobileNumber = (value) => {
  const mobileNumber = requireString(value, 'mobileNumber', { max: 25 });
  const digits = mobileNumber.replace(/\D/g, '');
  if (!/^[+\d\s()-]+$/.test(mobileNumber) || digits.length < 7 || digits.length > 15) {
    throw badRequest('mobileNumber must contain between 7 and 15 digits.');
  }
  return mobileNumber;
};

const findChallenge = (verificationId, purpose) =>
  authChallenges.find((challenge) =>
    challenge.id === verificationId && challenge.purpose === purpose
  );

const secondsUntilResend = (lastSentAt) =>
  Math.max(0, Math.ceil((lastSentAt + OTP_RESEND_WAIT_MS - Date.now()) / 1000));

const issueChallenge = async ({ purpose, email, userId, registration }) => {
  const cooldown = otpCooldowns.find((entry) =>
    entry.email === email && entry.purpose === purpose
  );
  if (cooldown?.inFlight) {
    throw new AppError(429, 'An OTP request is already being processed.');
  }
  const existing = authChallenges.find((challenge) =>
    challenge.email === email && challenge.purpose === purpose
  );
  const lastSentAt = Math.max(
    registration?.lastOtpSentAt || 0,
    cooldown?.lastSentAt || 0,
    existing?.lastSentAt || 0
  ) || null;
  const retryAfterSeconds = lastSentAt ? secondsUntilResend(lastSentAt) : 0;
  if (retryAfterSeconds > 0) {
    throw new AppError(429, `Please wait ${retryAfterSeconds} seconds before requesting another OTP.`);
  }

  const cooldownEntry = cooldown || { email, purpose, lastSentAt: 0 };
  if (!cooldown) otpCooldowns.push(cooldownEntry);
  const previousLastSentAt = cooldownEntry.lastSentAt;
  cooldownEntry.inFlight = true;
  const now = Date.now();
  let challenge;

  try {
    const otp = generateOTP();
    const { salt, hash } = await hashOTP(otp);
    challenge = {
      id: randomUUID(),
      email,
      purpose,
      userId,
      salt,
      otpHash: hash,
      attempts: 0,
      createdAt: now,
      expiresAt: now + OTP_LIFETIME_MS,
      lastSentAt: now
    };

    for (let index = authChallenges.length - 1; index >= 0; index -= 1) {
      if (authChallenges[index].email === email && authChallenges[index].purpose === purpose) {
        authChallenges.splice(index, 1);
      }
    }
    authChallenges.push(challenge);

    try {
      await sendOtpEmail(email, otp, purpose);
    } catch (error) {
      console.error(`FarmLink OTP email delivery failed (${error.code || error.name || 'SMTP error'}).`);
      throw error instanceof AppError
        ? error
        : new AppError(503, 'Unable to send the OTP email. Please try again later.');
    }

    cooldownEntry.lastSentAt = now;
    cooldownEntry.inFlight = false;
    if (registration) registration.lastOtpSentAt = now;
    return challenge;
  } catch (error) {
    if (challenge) {
      const challengeIndex = authChallenges.indexOf(challenge);
      if (challengeIndex >= 0) authChallenges.splice(challengeIndex, 1);
    }
    cooldownEntry.inFlight = false;
    cooldownEntry.lastSentAt = previousLastSentAt;
    if (!previousLastSentAt) {
      const cooldownIndex = otpCooldowns.indexOf(cooldownEntry);
      if (cooldownIndex >= 0) otpCooldowns.splice(cooldownIndex, 1);
    }
    throw error;
  }
};

const verifyChallenge = async (verificationId, otp, purpose) => {
  const challenge = findChallenge(verificationId, purpose);
  if (!challenge || challenge.expiresAt <= Date.now()) {
    if (challenge) authChallenges.splice(authChallenges.indexOf(challenge), 1);
    throw new AppError(400, 'Invalid or expired OTP.');
  }
  if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
    authChallenges.splice(authChallenges.indexOf(challenge), 1);
    throw new AppError(400, 'Invalid or expired OTP.');
  }

  if (typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
    challenge.attempts += 1;
    if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
      authChallenges.splice(authChallenges.indexOf(challenge), 1);
    }
    throw badRequest('otp must be a 6-digit code.');
  }

  const isValid = await verifyOTP(otp, challenge.salt, challenge.otpHash);
  const challengeIndex = authChallenges.indexOf(challenge);
  if (challengeIndex < 0) throw new AppError(400, 'Invalid or expired OTP.');
  if (!isValid) {
    challenge.attempts += 1;
    if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
      authChallenges.splice(challengeIndex, 1);
    }
    throw new AppError(400, 'Invalid or expired OTP.');
  }
  authChallenges.splice(challengeIndex, 1);
  return challenge;
};

export const register = async (req, res) => {
  const body = req.body || {};
  const name = requireString(body.name, 'name', { max: 100 });
  const email = normalizeEmail(body.email);
  const mobileNumber = validateMobileNumber(body.mobileNumber);
  const password = body.password;
  const role = body.role;

  if (!isValidEmail(email)) throw badRequest('A valid email address is required.');
  if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
    throw badRequest('Password must be between 8 and 72 characters.');
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw badRequest('Password must contain at least one letter and one number.');
  }
  if (!registrationRoles.includes(role)) {
    throw badRequest(`role must be one of: ${registrationRoles.join(', ')}. Admin accounts cannot be registered publicly.`);
  }
  if (users.some((user) => user.email === email) ||
      pendingRegistrations.some((registration) => registration.email === email)) {
    throw new AppError(409, 'An account with this email already exists or is awaiting verification.');
  }

  const registration = {
    id: randomUUID(),
    name,
    email,
    mobileNumber,
    passwordHash: await bcrypt.hash(password, 12),
    role,
    location: typeof body.location === 'string' ? body.location.trim() : '',
    createdAt: new Date().toISOString(),
    lastOtpSentAt: null
  };
  pendingRegistrations.push(registration);
  try {
    const challenge = await issueChallenge({
      purpose: 'registration',
      email,
      registration
    });
    return res.status(202).json({
      success: true,
      message: 'Verification OTP sent to your email.',
      data: { verificationId: challenge.id, email }
    });
  } catch (error) {
    pendingRegistrations.splice(pendingRegistrations.indexOf(registration), 1);
    throw error;
  }
};

export const verifyRegistration = async (req, res) => {
  const body = req.body || {};
  const challenge = await verifyChallenge(
    body.verificationId,
    body.otp,
    'registration'
  );
  const registrationIndex = pendingRegistrations.findIndex(
    (entry) => entry.email === challenge.email
  );
  if (registrationIndex < 0) throw new AppError(400, 'Invalid or expired OTP.');

  const [registration] = pendingRegistrations.splice(registrationIndex, 1);
  const user = {
    id: registration.id,
    name: registration.name,
    email: registration.email,
    mobileNumber: registration.mobileNumber,
    passwordHash: registration.passwordHash,
    role: registration.role,
    location: registration.location,
    isVerified: true,
    isBlocked: false,
    createdAt: registration.createdAt
  };
  users.push(user);
  return res.json({
    success: true,
    message: 'Email verified successfully. You can now log in.',
    data: { user: publicUser(user) }
  });
};

export const resendRegistrationOtp = async (req, res) => {
  const body = req.body || {};
  const email = normalizeEmail(body.email);
  if (!isValidEmail(email)) throw badRequest('A valid email address is required.');
  const registration = pendingRegistrations.find((entry) => entry.email === email);
  if (!registration) throw new AppError(404, 'No registration is awaiting verification for this email.');

  const challenge = await issueChallenge({
    purpose: 'registration',
    email,
    registration
  });
  return res.json({
    success: true,
    message: 'A new verification OTP was sent to your email.',
    data: { verificationId: challenge.id, email }
  });
};

export const login = async (req, res) => {
  const body = req.body || {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = body.password;
  if (!isValidEmail(email)) throw badRequest('A valid email address is required.');
  const user = users.find((entry) => entry.email === email);
  if (!user || typeof password !== 'string' ||
      !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(401, 'Email or password is incorrect.');
  }
  if (user.isVerified !== true) {
    throw new AppError(403, 'Email verification is required before login.');
  }
  if (user.isBlocked) throw new AppError(403, 'This account has been blocked.');

  const challenge = await issueChallenge({
    purpose: 'login',
    email,
    userId: user.id
  });
  return res.json({
    success: true,
    message: 'Login OTP sent to your email.',
    data: { verificationId: challenge.id, email }
  });
};

export const resendLoginOtp = async (req, res) => {
  const body = req.body || {};
  const previousChallenge = findChallenge(body.verificationId, 'login');
  if (!previousChallenge) throw new AppError(404, 'Login verification was not found. Please log in again.');
  const user = users.find((entry) => entry.id === previousChallenge.userId);
  if (!user || user.isBlocked) throw new AppError(403, 'This account cannot log in.');

  const challenge = await issueChallenge({
    purpose: 'login',
    email: user.email,
    userId: user.id
  });
  return res.json({
    success: true,
    message: 'A new login OTP was sent to your email.',
    data: { verificationId: challenge.id, email: user.email }
  });
};

export const verifyLogin = async (req, res) => {
  const body = req.body || {};
  const challenge = await verifyChallenge(body.verificationId, body.otp, 'login');
  const user = users.find((entry) => entry.id === challenge.userId);
  if (!user || user.isVerified !== true || user.isBlocked) {
    throw new AppError(403, 'This account cannot log in.');
  }
  return res.json({
    success: true,
    message: 'Login successful.',
    data: { user: publicUser(user), token: createToken(user) }
  });
};

export const getProfile = (req, res) => res.json({
  success: true,
  message: 'Profile retrieved successfully.',
  data: { user: publicUser(req.user) }
});
