import {
  filterRecords,
  findRecord,
  insertRecord,
  removeRecord,
  updateRecord
} from '../data/repository.js';
import { AppError, badRequest, forbidden, notFound } from '../utils/errors.js';
import {
  requireAvailableDates,
  requirePositiveNumber,
  requireString
} from '../utils/validation.js';
import { getDatesForBooking } from '../utils/bookingDates.js';
import { cleanupListingImage, rejectImageUrl, resolveListingImage } from '../utils/listingImage.js';

const profileFields = [
  'fullName',
  'mobileNumber',
  'location',
  'skills',
  'wageType',
  'wageAmount',
  'experienceYears',
  'availableDates',
  'isAvailable'
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
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      throw badRequest('skills must be an array.');
    }
  }
  if (!Array.isArray(value) || value.length < 1 || value.length > 30) {
    throw badRequest('skills must be an array containing 1 to 30 skills.');
  }
  const skills = value.map((skill) => requireString(skill, 'skill', { max: 60 }));
  return [...new Map(skills.map((skill) => [skill.toLowerCase(), skill])).values()];
};

const validateAvailabilityDates = (value) => {
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      throw badRequest('availableDates must be a JSON array.');
    }
  }
  return requireAvailableDates(value);
};

const validateProfile = (body, existing = {}, hasImageUpdate = false) => {
  const values = {};
  const hasInput = profileFields.some((field) => Object.hasOwn(body, field));
  if (!hasInput && !hasImageUpdate && existing.id) {
    throw badRequest('Provide at least one profile field to update.');
  }

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
    values.availableDates = validateAvailabilityDates(body.availableDates);
  } else if (!existing.availableDates?.length) {
    throw badRequest('availableDates is required.');
  }
  if (Object.hasOwn(body, 'isAvailable')) {
    if (![true, false, 'true', 'false'].includes(body.isAvailable)) {
      throw badRequest('isAvailable must be true or false.');
    }
    values.isAvailable = body.isAvailable === true || body.isAvailable === 'true';
  } else if (existing.isAvailable === undefined) {
    values.isAvailable = true;
  }
  return { ...existing, ...values };
};

const findWorker = (id) =>
  findRecord('workers', (worker) => worker.id === id || worker.userId === id);

const publicWorker = (worker) => ({
  id: worker.id,
  userId: worker.userId,
  fullName: worker.fullName,
  mobileNumber: worker.mobileNumber,
  location: worker.location,
  skills: worker.skills,
  profileImageUrl: worker.imageUrl || '',
  wageType: worker.wageType,
  wageAmount: worker.wageAmount,
  experienceYears: worker.experienceYears,
  availableDates: worker.availableDates,
  isAvailable: worker.isAvailable !== false,
  createdAt: worker.createdAt,
  updatedAt: worker.updatedAt
});

export const createWorkerProfile = async (req, res) => {
  if (await findRecord('workers', (worker) => worker.userId === req.user.id)) {
    throw new AppError(409, 'A worker profile already exists for this account.');
  }
  const body = req.body || {};
  rejectImageUrl(body);
  const values = validateProfile(body);
  const image = await resolveListingImage(req, null, 'farmlink/workers');
  const worker = {
    id: req.user.id,
    userId: req.user.id,
    ...values,
    imageUrl: image.imageUrl,
    imagePublicId: image.imagePublicId,
    createdAt: new Date().toISOString()
  };
  let created;
  try {
    created = await insertRecord('workers', worker);
  } catch (error) {
    await cleanupListingImage(image.imagePublicId);
    throw error;
  }
  await updateRecord('users', req.user.id, {
    name: worker.fullName,
    mobileNumber: worker.mobileNumber,
    location: worker.location
  });
  return res.status(201).json({
    success: true,
    message: 'Worker profile created successfully.',
    data: { worker: publicWorker(created) }
  });
};

export const listWorkers = async (req, res) => {
  const location = String(req.query.location || '').toLowerCase();
  const skill = String(req.query.skill || '').toLowerCase();
  const wageType = String(req.query.wageType || '').toLowerCase();
  if (wageType && !['daily', 'hourly'].includes(wageType)) {
    throw badRequest('wageType must be daily or hourly.');
  }
  const minWage = req.query.minWage === undefined || req.query.minWage === ''
    ? null
    : Number(req.query.minWage);
  const maxWage = req.query.maxWage === undefined || req.query.maxWage === ''
    ? null
    : Number(req.query.maxWage);
  if (
    (minWage !== null && (!Number.isFinite(minWage) || minWage < 0)) ||
    (maxWage !== null && (!Number.isFinite(maxWage) || maxWage < 0)) ||
    (minWage !== null && maxWage !== null && minWage > maxWage)
  ) {
    throw badRequest('Wage filters must be non-negative numbers, with minWage no greater than maxWage.');
  }
  const today = new Date().toISOString().slice(0, 10);
  const matches = await filterRecords('workers', (worker) =>
    worker.isAvailable !== false &&
    (worker.availableDates || []).some((date) => date >= today) &&
    worker.location.toLowerCase().includes(location) &&
    worker.skills.some((entry) => entry.toLowerCase().includes(skill)) &&
    (!wageType || worker.wageType === wageType) &&
    (minWage === null || worker.wageAmount >= minWage) &&
    (maxWage === null || worker.wageAmount <= maxWage)
  );
  return res.json({
    success: true,
    message: 'Worker profiles retrieved successfully.',
    data: { count: matches.length, workers: matches.map(publicWorker) }
  });
};

export const getWorker = async (req, res) => {
  const worker = await findWorker(req.params.id);
  if (!worker) throw notFound('Worker profile not found.');
  return res.json({
    success: true,
    message: 'Worker profile retrieved successfully.',
    data: { worker: publicWorker(worker) }
  });
};

export const getMyProfile = async (req, res) => {
  const worker = await findRecord('workers', (entry) => entry.userId === req.user.id);
  if (!worker) throw notFound('Create a worker profile before viewing it.');
  return res.json({
    success: true,
    message: 'Worker profile retrieved successfully.',
    data: { worker: publicWorker(worker) }
  });
};

export const updateWorkerProfile = async (req, res) => {
  const worker = await findWorker(req.params.id);
  if (!worker) throw notFound('Worker profile not found.');
  if (worker.userId !== req.user.id) throw forbidden();
  rejectImageUrl(req.body || {});
  const hasImageUpdate = Boolean(req.file) ||
    req.body?.removeImage === true ||
    req.body?.removeImage === 'true';
  const values = validateProfile(req.body || {}, worker, hasImageUpdate);
  const activeWorkerBookings = await filterRecords('bookings', (booking) => {
    if (
      booking.serviceType !== 'WORKER' ||
      booking.providerId !== worker.userId ||
      !['Pending', 'Accepted'].includes(booking.status)
    ) return false;
    return true;
  });
  const hasUnavailableActiveJob = activeWorkerBookings.some((booking) =>
    getDatesForBooking(booking, worker.wageType)
      .some((date) => !values.availableDates.includes(date))
  );
  if (hasUnavailableActiveJob) {
    throw new AppError(409, 'Availability cannot exclude a date with a pending or accepted job.');
  }
  const image = await resolveListingImage(req, worker, 'farmlink/workers');
  let updated;
  try {
    updated = await updateRecord('workers', worker.id, {
      ...values,
      imageUrl: image.imageUrl,
      imagePublicId: image.imagePublicId,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    if (req.file) await cleanupListingImage(image.imagePublicId);
    throw error;
  }
  await cleanupListingImage(image.previousImagePublicId);
  await updateRecord('users', req.user.id, {
    name: worker.fullName,
    mobileNumber: worker.mobileNumber,
    location: worker.location
  });
  return res.json({
    success: true,
    message: 'Worker profile updated successfully.',
    data: { worker: publicWorker(updated) }
  });
};

export const deleteWorkerProfile = async (req, res) => {
  const worker = await findWorker(req.params.id);
  if (!worker) throw notFound('Worker profile not found.');
  if (worker.userId !== req.user.id) throw forbidden();
  const hasActiveJobs = await findRecord('bookings', (booking) =>
    booking.serviceType === 'WORKER' &&
    booking.providerId === worker.userId &&
    ['Pending', 'Accepted'].includes(booking.status)
  );
  if (hasActiveJobs) {
    throw new AppError(409, 'Resolve pending or accepted jobs before deleting this profile.');
  }
  await removeRecord('workers', worker.id);
  await cleanupListingImage(worker.imagePublicId);
  return res.status(204).send();
};

export const getWorkerJobs = async (req, res) => {
  const worker = await findRecord('workers', (entry) => entry.userId === req.user.id);
  if (!worker) throw notFound('Create a worker profile before viewing job requests.');
  const workerBookings = (await filterRecords('bookings', (booking) =>
    booking.serviceType === 'WORKER' && booking.providerId === worker.userId
  ))
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

export const listWorkerJobRequests = async (req, res) => {
  const worker = await findRecord('workers', (entry) => entry.userId === req.user.id);
  if (!worker) throw notFound('Create a worker profile before viewing job requests.');
  const jobRequests = (await filterRecords('bookings', (booking) =>
      booking.serviceType === 'WORKER' &&
      booking.providerId === worker.userId &&
      booking.status === 'Pending'
    ))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return res.json({
    success: true,
    message: 'Pending worker job requests retrieved successfully.',
    data: { count: jobRequests.length, jobRequests }
  });
};
