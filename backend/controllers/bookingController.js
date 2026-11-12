import { randomUUID } from 'node:crypto';
import {
  filterRecords,
  findRecord,
  insertRecord,
  listRecords,
  updateRecord
} from '../data/repository.js';
import { AppError, badRequest, forbidden, notFound } from '../utils/errors.js';
import {
  requirePositiveNumber,
  requireString
} from '../utils/validation.js';
import { getBookingDates } from '../utils/bookingDates.js';

const serviceTypes = ['WORKER', 'EQUIPMENT'];

const getProviderDetails = async (serviceType, serviceId) => {
  if (serviceType === 'WORKER') {
    const worker = await findRecord('workers', (entry) =>
      entry.id === serviceId || entry.userId === serviceId
    );
    if (!worker) throw notFound('Worker profile not found.');
    return {
      providerId: worker.userId,
      serviceId: worker.id,
      rateType: worker.wageType,
      rate: worker.wageAmount,
      isAvailable: worker.isAvailable !== false,
      availableDates: worker.availableDates
    };
  }
  const item = await findRecord('equipment', (entry) => entry.id === serviceId);
  if (!item) throw notFound('Equipment listing not found.');
  return {
    providerId: item.ownerId,
    serviceId: item.id,
    rateType: item.rentalRateType,
    rate: item.rentalPrice,
    availableDates: item.availableDates
  };
};

const hasBookingConflict = async (
  providerId,
  serviceType,
  serviceId,
  requestedDates,
  statuses = ['Accepted'],
  excludeBookingId = ''
) => {
  const requested = {
    bookingDate: requestedDates[0],
    bookingEndDate: requestedDates.at(-1),
    duration: requestedDates.length,
    rateType: 'daily'
  };
  return Boolean(await findRecord('bookings', (booking) =>
    booking.id !== excludeBookingId &&
    booking.providerId === providerId &&
    booking.serviceType === serviceType &&
    booking.serviceId === serviceId &&
    statuses.includes(booking.status) &&
    booking.bookingDate <= requested.bookingEndDate &&
    (booking.bookingEndDate || booking.bookingDate) >= requested.bookingDate
  ));
};

const getOwnBookings = async (user) => {
  if (user.role === 'admin') return listRecords('bookings');
  return filterRecords('bookings', (booking) =>
    booking.farmerId === user.id || booking.providerId === user.id
  );
};

const canManageBooking = (booking, user) =>
  booking.serviceType === 'WORKER'
    ? booking.providerId === user.id && user.role === 'worker'
    : booking.providerId === user.id && ['equipment_owner', 'farmer'].includes(user.role);

const findBooking = async (id) => {
  const booking = await findRecord('bookings', (entry) => entry.id === id);
  if (!booking) throw notFound('Booking not found.');
  return booking;
};

export const createBooking = async (req, res) => {
  const body = req.body || {};
  if (!serviceTypes.includes(body.serviceType)) {
    throw badRequest('serviceType must be WORKER or EQUIPMENT.');
  }
  const serviceId = requireString(body.serviceId, 'serviceId', { max: 100 });
  const rateTypeDetails = await getProviderDetails(body.serviceType, serviceId);
  if (body.serviceType === 'EQUIPMENT' && rateTypeDetails.providerId === req.user.id) {
    throw badRequest('You cannot request a rental for your own equipment listing.');
  }
  if (body.serviceType === 'WORKER' && !rateTypeDetails.isAvailable) {
    throw new AppError(409, 'This worker is currently unavailable.');
  }
  const duration = requirePositiveNumber(body.duration, 'duration');
  if (!Number.isInteger(duration)) {
    throw badRequest('duration must be a whole number.');
  }
  const requestedDates = getBookingDates(body.bookingDate, duration, rateTypeDetails.rateType);
  if (requestedDates.some((date) => !rateTypeDetails.availableDates.includes(date))) {
    throw new AppError(409, 'The provider is not available for every requested date.');
  }
  const conflictingStatuses = body.serviceType === 'WORKER'
    ? ['Pending', 'Accepted']
    : ['Accepted'];
  if (await hasBookingConflict(
    rateTypeDetails.providerId,
    body.serviceType,
    rateTypeDetails.serviceId,
    requestedDates,
    conflictingStatuses
  )) {
    throw new AppError(
      409,
      body.serviceType === 'WORKER'
        ? 'This worker already has a pending or confirmed booking on an overlapping date.'
        : 'This provider already has an accepted booking for the requested date.'
    );
  }
  if (await findRecord('bookings', (booking) =>
    booking.farmerId === req.user.id &&
    booking.serviceType === body.serviceType &&
    booking.serviceId === rateTypeDetails.serviceId &&
    booking.status === 'Pending' &&
    booking.bookingDate === requestedDates[0] &&
    booking.duration === duration
  )) {
    throw new AppError(409, 'You already have a pending booking for this provider and date.');
  }

  const location = requireString(body.location, 'location', { max: 200 });
  const workType = body.serviceType === 'WORKER'
    ? body.workType === undefined
      ? 'General farm work'
      : requireString(body.workType, 'workType', { max: 100 })
    : '';
  const description = body.serviceType === 'WORKER' && body.description !== undefined
    ? requireString(body.description, 'description', { max: 2000, min: 0 })
    : '';
  const totalPrice = rateTypeDetails.rate * duration;
  if (!Number.isFinite(totalPrice) || totalPrice <= 0 || totalPrice > Number.MAX_SAFE_INTEGER) {
    throw badRequest('The calculated booking price is outside the supported range.');
  }

  const booking = {
    id: randomUUID(),
    farmerId: req.user.id,
    providerId: rateTypeDetails.providerId,
    serviceType: body.serviceType,
    serviceId: rateTypeDetails.serviceId,
    workType,
    description,
    bookingDate: requestedDates[0],
    bookingEndDate: requestedDates.at(-1),
    duration,
    rateType: rateTypeDetails.rateType,
    unitPrice: rateTypeDetails.rate,
    location,
    totalPrice,
    status: 'Pending',
    createdAt: new Date().toISOString()
  };
  await insertRecord('bookings', booking);
  return res.status(201).json({
    success: true,
    message: 'Booking request created successfully.',
    data: { booking }
  });
};

export const listBookings = async (req, res) => {
  let items = await getOwnBookings(req.user);
  if (req.query.status) {
    items = items.filter((booking) => booking.status === req.query.status);
  }
  if (req.query.serviceType) {
    items = items.filter((booking) => booking.serviceType === req.query.serviceType);
  }
  items.sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  return res.json({
    success: true,
    message: 'Bookings retrieved successfully.',
    data: { count: items.length, bookings: items }
  });
};

export const getMyBookings = async (req, res) => {
  const items = (await getOwnBookings(req.user))
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  return res.json({
    success: true,
    message: 'Your booking history retrieved successfully.',
    data: { count: items.length, bookings: items }
  });
};

export const getBooking = async (req, res) => {
  const booking = await findBooking(req.params.id);
  if (
    req.user.role !== 'admin' &&
    booking.farmerId !== req.user.id &&
    booking.providerId !== req.user.id
  ) {
    throw forbidden();
  }
  return res.json({
    success: true,
    message: 'Booking retrieved successfully.',
    data: { booking }
  });
};

const updateBookingStatus = async (req, res, nextStatus) => {
  const booking = await findBooking(req.params.id);
  const isFarmer = booking.farmerId === req.user.id && req.user.role === 'farmer';
  const isProvider = canManageBooking(booking, req.user);
  if (!isFarmer && !isProvider && req.user.role !== 'admin') throw forbidden();

  if (booking.status !== 'Pending' && booking.status !== 'Accepted') {
    throw new AppError(409, `A ${booking.status.toLowerCase()} booking cannot be changed.`);
  }

  if (nextStatus === 'Cancelled') {
    if (!isFarmer && req.user.role !== 'admin') {
      throw forbidden('Only the farmer who requested the booking or an admin can cancel it.');
    }
  } else if (nextStatus === 'Completed') {
    if (!isProvider && req.user.role !== 'admin') {
      throw forbidden('Only the service provider or an admin can complete the booking.');
    }
    if (booking.status !== 'Accepted') {
      throw new AppError(409, 'Only accepted bookings can be completed.');
    }
  } else if (nextStatus === 'Accepted' || nextStatus === 'Rejected') {
    if (!isProvider && req.user.role !== 'admin') {
      throw forbidden('Only the assigned service provider or an admin can decide this booking.');
    }
    if (booking.status !== 'Pending') {
      throw new AppError(409, 'Only pending bookings can be accepted or rejected.');
    }
    if (nextStatus === 'Accepted') {
      const details = await getProviderDetails(booking.serviceType, booking.serviceId);
      const requestedDates = getBookingDates(
        booking.bookingDate,
        booking.duration,
        details.rateType
      );
      if (requestedDates.some((date) => !details.availableDates.includes(date))) {
        throw new AppError(409, 'The provider is no longer available for every requested date.');
      }
      const conflictingStatuses = booking.serviceType === 'WORKER'
        ? ['Pending', 'Accepted']
        : ['Accepted'];
      if (await hasBookingConflict(
        booking.providerId,
        booking.serviceType,
        booking.serviceId,
        requestedDates,
        conflictingStatuses,
        booking.id
      )) {
        throw new AppError(409, 'Another booking overlaps the requested date.');
      }
    }
  }

  const updated = await updateRecord('bookings', booking.id, {
    status: nextStatus,
    updatedAt: new Date().toISOString()
  });
  return res.json({
    success: true,
    message: `Booking ${nextStatus.toLowerCase()} successfully.`,
    data: { booking: updated }
  });
};

export const acceptBooking = async (req, res) => updateBookingStatus(req, res, 'Accepted');
export const rejectBooking = async (req, res) => updateBookingStatus(req, res, 'Rejected');
export const cancelBooking = async (req, res) => updateBookingStatus(req, res, 'Cancelled');
export const completeBooking = async (req, res) => updateBookingStatus(req, res, 'Completed');
