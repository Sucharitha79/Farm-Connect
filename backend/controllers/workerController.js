import { bookings, users, workers } from '../data/store.js';
import { AppError, badRequest, forbidden, notFound } from '../utils/errors.js';
import {
  requireAvailableDates,
  requirePositiveNumber,
  requireString
} from '../utils/validation.js';
import { getDatesForBooking } from '../utils/bookingDates.js';

const profileFields = [
  'fullName',
  'mobileNumber',
  'location',
  'skills',
  'wageType',
  'wageAmount',
  'experienceYears',
  'availableDates'
];

const validateMobileNumber = (value) => {
  const mobileNumber = requireString(value, 'mobileNumber', { max: 25 });
  const digits = mobileNumber.replace(/\D/g, '');
  if (!/^[+\d\s()-]+$/.test(mobileNumber) || digits.length < 7 || digits.length > 15) {
    throw badRequest('mobileNumber must contain between 7 and 15 digits.');
  }
  return mobileNumber;
};

const validateSkills = (value) => {
  if (!Array.isArray(value) || value.length < 1 || value.length > 30) {
    throw badRequest('skills must be an array containing 1 to 30 skills.');
  }
  const skills = value.map((skill) => requireString(skill, 'skill', { max: 60 }));
  return [...new Map(skills.map((skill) => [skill.toLowerCase(), skill])).values()];
};

const validateProfile = (body, existing = {}) => {
  const values = {};
  const hasInput = profileFields.some((field) => Object.hasOwn(body, field));
  if (!hasInput && existing.id) throw badRequest('Provide at least one profile field to update.');

  if (Object.hasOwn(body, 'fullName')) {
    values.fullName = requireString(body.fullName, 'fullName', { max: 100 });
  } else if (!existing.fullName) {
    throw badRequest('fullName is required.');
  }
  if (Object.hasOwn(body, 'mobileNumber')) {
    values.mobileNumber = validateMobileNumber(body.mobileNumber);
  } else if (!existing.mobileNumber) {
    throw badRequest('mobileNumber is required.');
  }
  if (Object.hasOwn(body, 'location')) {
    values.location = requireString(body.location, 'location', { max: 200 });
  } else if (!existing.location) {
    throw badRequest('location is required.');
  }
  if (Object.hasOwn(body, 'skills')) {
    values.skills = validateSkills(body.skills);
  } else if (!existing.skills?.length) {
    throw badRequest('skills is required.');
  }
  if (Object.hasOwn(body, 'wageType')) {
    if (!['daily', 'hourly'].includes(body.wageType)) {
      throw badRequest('wageType must be daily or hourly.');
    }
    values.wageType = body.wageType;
  } else if (!existing.wageType) {
    throw badRequest('wageType is required.');
  }
  if (Object.hasOwn(body, 'wageAmount')) {
    values.wageAmount = requirePositiveNumber(body.wageAmount, 'wageAmount');
  } else if (!existing.wageAmount) {
    throw badRequest('wageAmount is required.');
  }
  if (Object.hasOwn(body, 'experienceYears')) {
    const experienceYears = Number(body.experienceYears);
    if (!Number.isFinite(experienceYears) || experienceYears < 0 || experienceYears > 80) {
      throw badRequest('experienceYears must be a number from 0 to 80.');
    }
    values.experienceYears = experienceYears;
  } else if (existing.experienceYears === undefined) {
    throw badRequest('experienceYears is required.');
  }
  if (Object.hasOwn(body, 'availableDates')) {
    values.availableDates = requireAvailableDates(body.availableDates);
  } else if (!existing.availableDates?.length) {
    throw badRequest('availableDates is required.');
  }
  return { ...existing, ...values };
};

const findWorker = (id) =>
  workers.find((worker) => worker.id === id || worker.userId === id);

const publicWorker = (worker) => ({
  id: worker.id,
  userId: worker.userId,
  fullName: worker.fullName,
  mobileNumber: worker.mobileNumber,
  location: worker.location,
  skills: worker.skills,
  wageType: worker.wageType,
  wageAmount: worker.wageAmount,
  experienceYears: worker.experienceYears,
  availableDates: worker.availableDates,
  createdAt: worker.createdAt,
  updatedAt: worker.updatedAt
});

export const createWorkerProfile = (req, res) => {
  if (workers.some((worker) => worker.userId === req.user.id)) {
    throw new AppError(409, 'A worker profile already exists for this account.');
  }
  const body = req.body || {};
  const values = validateProfile(body);
  const worker = {
    id: req.user.id,
    userId: req.user.id,
    ...values,
    createdAt: new Date().toISOString()
  };
  workers.push(worker);
  Object.assign(req.user, {
    name: worker.fullName,
    mobileNumber: worker.mobileNumber,
    location: worker.location
  });
  return res.status(201).json({
    success: true,
    message: 'Worker profile created successfully.',
    data: { worker: publicWorker(worker) }
  });
};

export const listWorkers = (req, res) => {
  const location = String(req.query.location || '').toLowerCase();
  const skill = String(req.query.skill || '').toLowerCase();
  const wageType = String(req.query.wageType || '').toLowerCase();
  const matches = workers.filter((worker) =>
    worker.location.toLowerCase().includes(location) &&
    worker.skills.some((entry) => entry.toLowerCase().includes(skill)) &&
    (!wageType || worker.wageType === wageType)
  );
  return res.json({
    success: true,
    message: 'Worker profiles retrieved successfully.',
    data: { count: matches.length, workers: matches.map(publicWorker) }
  });
};

export const getWorker = (req, res) => {
  const worker = findWorker(req.params.id);
  if (!worker) throw notFound('Worker profile not found.');
  return res.json({
    success: true,
    message: 'Worker profile retrieved successfully.',
    data: { worker: publicWorker(worker) }
  });
};

export const getMyProfile = (req, res) => {
  const worker = workers.find((entry) => entry.userId === req.user.id);
  if (!worker) throw notFound('Create a worker profile before viewing it.');
  return res.json({
    success: true,
    message: 'Worker profile retrieved successfully.',
    data: { worker: publicWorker(worker) }
  });
};

export const updateWorkerProfile = (req, res) => {
  const worker = findWorker(req.params.id);
  if (!worker) throw notFound('Worker profile not found.');
  if (worker.userId !== req.user.id) throw forbidden();
  const values = validateProfile(req.body || {}, worker);
  const hasUnavailableActiveJob = bookings.some((booking) => {
    if (
      booking.serviceType !== 'WORKER' ||
      booking.providerId !== worker.userId ||
      !['Pending', 'Accepted'].includes(booking.status)
    ) return false;
    return getDatesForBooking(booking, worker.wageType)
      .some((date) => !values.availableDates.includes(date));
  });
  if (hasUnavailableActiveJob) {
    throw new AppError(409, 'Availability cannot exclude a date with a pending or accepted job.');
  }
  Object.assign(worker, values, { updatedAt: new Date().toISOString() });
  Object.assign(req.user, {
    name: worker.fullName,
    mobileNumber: worker.mobileNumber,
    location: worker.location
  });
  return res.json({
    success: true,
    message: 'Worker profile updated successfully.',
    data: { worker: publicWorker(worker) }
  });
};

export const deleteWorkerProfile = (req, res) => {
  const worker = findWorker(req.params.id);
  if (!worker) throw notFound('Worker profile not found.');
  if (worker.userId !== req.user.id) throw forbidden();
  const hasActiveJobs = bookings.some((booking) =>
    booking.serviceType === 'WORKER' &&
    booking.providerId === worker.userId &&
    ['Pending', 'Accepted'].includes(booking.status)
  );
  if (hasActiveJobs) {
    throw new AppError(409, 'Resolve pending or accepted jobs before deleting this profile.');
  }
  workers.splice(workers.indexOf(worker), 1);
  return res.status(204).send();
};

export const getWorkerJobs = (req, res) => {
  const worker = workers.find((entry) => entry.userId === req.user.id);
  if (!worker) throw notFound('Create a worker profile before viewing job requests.');
  const workerBookings = bookings
    .filter((booking) => booking.serviceType === 'WORKER' && booking.providerId === worker.userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return res.json({
    success: true,
    message: 'Worker jobs retrieved successfully.',
    data: {
      count: workerBookings.length,
      pendingJobs: workerBookings.filter((booking) => booking.status === 'Pending'),
      completedJobs: workerBookings.filter((booking) => booking.status === 'Completed'),
      bookings: workerBookings
    }
  });
};

export const listWorkerJobRequests = (req, res) => {
  const worker = workers.find((entry) => entry.userId === req.user.id);
  if (!worker) throw notFound('Create a worker profile before viewing job requests.');
  const jobRequests = bookings
    .filter((booking) =>
      booking.serviceType === 'WORKER' &&
      booking.providerId === worker.userId &&
      booking.status === 'Pending'
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return res.json({
    success: true,
    message: 'Pending worker job requests retrieved successfully.',
    data: { count: jobRequests.length, jobRequests }
  });
};
