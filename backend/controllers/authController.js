import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { config } from '../config/env.js';
import {
  filterRecords,
  findRecord,
  insertRecord,
  removeRecord,
  removeRecords,
  updateRecord
} from '../data/repository.js';
import { AppError, badRequest } from '../utils/errors.js';
import { isValidEmail, requireString } from '../utils/validation.js';
import { generateOTP, hashOTP, verifyOTP } from '../utils/generateOTP.js';
import { sendOtpEmail } from '../utils/emailService.js';

const OTP_LIFETIME_MS = 5 * 60 * 1000;
const OTP_RESEND_WAIT_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const registrationRoles = ['farmer', 'buyer', 'worker', 'equipment_owner'];
const accountRoles = new Set([...registrationRoles, 'admin']);

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
  findRecord(
    'authChallenges',
    (challenge) => challenge.id === verificationId && challenge.purpose === purpose,
    { includeSecrets: true }
  );

const secondsUntilResend = (lastSentAt) =>
  Math.max(0, Math.ceil((lastSentAt + OTP_RESEND_WAIT_MS - Date.now()) / 1000));

const issueChallenge = async ({ purpose, email, registration }) => {
  let cooldown = await findRecord('otpCooldowns', (entry) =>
    entry.email === email && entry.purpose === purpose
  );
  if (cooldown?.inFlight) {
    throw new AppError(429, 'An OTP request is already being processed.');
  }
  const existing = await findRecord('authChallenges', (challenge) =>
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

  const cooldownEntry = cooldown || {
    id: randomUUID(),
    email,
    purpose,
    lastSentAt: 0,
    inFlight: false
  };
  if (!cooldown) {
    cooldown = await insertRecord('otpCooldowns', cooldownEntry);
  }
  const previousLastSentAt = cooldownEntry.lastSentAt;
  cooldownEntry.inFlight = true;
  await updateRecord('otpCooldowns', cooldownEntry.id, { inFlight: true });
  const now = Date.now();
  let challenge;

  try {
    const otp = generateOTP();
    const { salt, hash } = await hashOTP(otp);
    challenge = {
      id: randomUUID(),
      email,
      purpose,
      salt,
      otpHash: hash,
      attempts: 0,
      createdAt: now,
      expiresAt: new Date(now + OTP_LIFETIME_MS),
      lastSentAt: now
    };

    await removeRecords('authChallenges', (entry) =>
      entry.email === email && entry.purpose === purpose
    );
    await insertRecord('authChallenges', challenge);

    try {
      await sendOtpEmail(email, otp);
    } catch (error) {
      console.error(`FarmLink OTP email delivery failed (${error.code || error.name || 'SMTP error'}).`);
      throw error instanceof AppError
        ? error
        : new AppError(503, 'Unable to send the OTP email. Please try again later.');
    }

    await updateRecord('otpCooldowns', cooldownEntry.id, { lastSentAt: now, inFlight: false });
    if (registration) {
      await updateRecord('pendingRegistrations', registration.id, { lastOtpSentAt: now });
    }
    return challenge;
  } catch (error) {
    if (challenge) {
      await removeRecord('authChallenges', challenge.id);
    }
    await updateRecord('otpCooldowns', cooldownEntry.id, {
      inFlight: false,
      lastSentAt: previousLastSentAt
    });
    if (!previousLastSentAt) {
      await removeRecord('otpCooldowns', cooldownEntry.id);
    }
    throw error;
  }
};

const verifyChallenge = async (verificationId, otp, purpose) => {
  const challenge = await findChallenge(verificationId, purpose);
  if (!challenge || challenge.expiresAt <= Date.now()) {
    if (challenge) await removeRecord('authChallenges', challenge.id);
    throw new AppError(400, 'Invalid or expired OTP.');
  }
  if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
    await removeRecord('authChallenges', challenge.id);
    throw new AppError(400, 'Invalid or expired OTP.');
  }

  if (typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
    challenge.attempts += 1;
    if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
      await removeRecord('authChallenges', challenge.id);
    } else {
      await updateRecord('authChallenges', challenge.id, { attempts: challenge.attempts });
    }
    throw badRequest('otp must be a 6-digit code.');
  }

  const isValid = await verifyOTP(otp, challenge.salt, challenge.otpHash);
  const currentChallenge = await findChallenge(verificationId, purpose);
  if (!currentChallenge) throw new AppError(400, 'Invalid or expired OTP.');
  if (!isValid) {
    const attempts = currentChallenge.attempts + 1;
    if (attempts >= OTP_MAX_ATTEMPTS) {
      await removeRecord('authChallenges', currentChallenge.id);
    } else {
      await updateRecord('authChallenges', currentChallenge.id, { attempts });
    }
    throw new AppError(400, 'Invalid or expired OTP.');
  }
  await removeRecord('authChallenges', currentChallenge.id);
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
  if (await findRecord('users', (user) => user.email === email) ||
      await findRecord('pendingRegistrations', (registration) => registration.email === email)) {
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
  await insertRecord('pendingRegistrations', registration);
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
    await removeRecord('pendingRegistrations', registration.id);
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
  const registration = await findRecord(
    'pendingRegistrations',
    (entry) => entry.email === challenge.email,
    { includeSecrets: true }
  );
  if (!registration) throw new AppError(400, 'Invalid or expired OTP.');
  await removeRecord('pendingRegistrations', registration.id);
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
  await insertRecord('users', user);
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
  const registration = await findRecord('pendingRegistrations', (entry) => entry.email === email);
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
  const user = await findRecord(
    'users',
    (entry) => entry.email === email,
    { includeSecrets: true }
  );
  if (!user) {
    const pendingRegistration = await findRecord(
      'pendingRegistrations',
      (entry) => entry.email === email,
      { includeSecrets: true }
    );
    if (pendingRegistration && typeof password === 'string' &&
        await bcrypt.compare(password, pendingRegistration.passwordHash)) {
      throw new AppError(403, 'Please verify your email to complete registration before logging in.');
    }
    throw new AppError(401, 'Email or password is incorrect.');
  }
  if (typeof password !== 'string' || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(401, 'Email or password is incorrect.');
  }
  if (user.isVerified !== true) {
    throw new AppError(403, 'Please verify your email to complete registration before logging in.');
  }
  if (user.isBlocked) throw new AppError(403, 'This account has been blocked.');
  if (!accountRoles.has(user.role)) {
    throw new AppError(403, 'This account has an invalid role. Please contact support.');
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

export const updateProfile = async (req, res) => {
  const allowedFields = ['name', 'mobileNumber', 'location', 'farmName', 'address', 'city', 'state', 'pincode'];
  const body = req.body || {};
  const fields = Object.keys(body);
  if (!fields.length || fields.some((field) => !allowedFields.includes(field))) {
    throw badRequest('Provide at least one supported profile field.');
  }

  const values = {};
  for (const field of fields) {
    const max = field === 'address' ? 500 : 100;
    const min = ['name', 'mobileNumber'].includes(field) ? 1 : 0;
    values[field] = requireString(body[field], field, { max, min });
  }
  if (Object.hasOwn(values, 'mobileNumber')) {
    values.mobileNumber = validateMobileNumber(values.mobileNumber);
  }
  if (Object.hasOwn(values, 'pincode') && values.pincode && !/^\d{6}$/.test(values.pincode)) {
    throw badRequest('pincode must contain exactly 6 digits.');
  }
  const user = await updateRecord('users', req.user.id, values);
  return res.json({
    success: true,
    message: 'Profile updated successfully.',
    data: { user: publicUser(user) }
  });
};
