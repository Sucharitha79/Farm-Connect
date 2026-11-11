import { randomUUID } from 'node:crypto';
import { bookings, equipment, workers } from '../data/store.js';
import { AppError, badRequest, forbidden, notFound } from '../utils/errors.js';
import {
  requirePositiveNumber,
  requireString
} from '../utils/validation.js';
import { bookingDatesOverlap, getBookingDates } from '../utils/bookingDates.js';

const serviceTypes = ['WORKER', 'EQUIPMENT'];

const getProviderDetails = (serviceType, serviceId) => {
  if (serviceType === 'WORKER') {
    const worker = workers.find((entry) => entry.id === serviceId || entry.userId === serviceId);
    if (!worker) throw notFound('Worker profile not found.');
    return {
      providerId: worker.userId,
      serviceId: worker.id,
      rateType: worker.wageType,
      rate: worker.wageAmount,
      availableDates: worker.availableDates
    };
  }
  const item = equipment.find((entry) => entry.id === serviceId);
  if (!item) throw notFound('Equipment listing not found.');
  return {
    providerId: item.ownerId,
    serviceId: item.id,
    rateType: item.rentalRateType,
    rate: item.rentalPrice,
    availableDates: item.availableDates
  };
};

const hasAcceptedConflict = (providerId, serviceType, serviceId, requestedDates) => {
  const requested = {
    bookingDate: requestedDates[0],
    bookingEndDate: requestedDates.at(-1),
    duration: requestedDates.length,
    rateType: 'daily'
  };
  return bookings.some((booking) =>
    booking.providerId === providerId &&
    booking.serviceType === serviceType &&
    booking.serviceId === serviceId &&
    booking.status === 'Accepted' &&
    bookingDatesOverlap(requested, booking)
  );
};

const getOwnBookings = (user) => {
  if (user.role === 'admin') return [...bookings];
  return bookings.filter((booking) =>
    booking.farmerId === user.id || booking.providerId === user.id
  );
};

const canManageBooking = (booking, user) =>
  booking.serviceType === 'WORKER'
    ? booking.providerId === user.id && user.role === 'worker'
    : booking.providerId === user.id && user.role === 'equipment_owner';

const findBooking = (id) => {
  const booking = bookings.find((entry) => entry.id === id);
  if (!booking) throw notFound('Booking not found.');
  return booking;
};

export const createBooking = (req, res) => {
  const body = req.body || {};
  if (!serviceTypes.includes(body.serviceType)) {
    throw badRequest('serviceType must be WORKER or EQUIPMENT.');
  }
  const serviceId = requireString(body.serviceId, 'serviceId', { max: 100 });
  const rateTypeDetails = getProviderDetails(body.serviceType, serviceId);
  const duration = requirePositiveNumber(body.duration, 'duration');
  if (!Number.isInteger(duration)) {
    throw badRequest('duration must be a whole number.');
  }
  const requestedDates = getBookingDates(body.bookingDate, duration, rateTypeDetails.rateType);
  if (requestedDates.some((date) => !rateTypeDetails.availableDates.includes(date))) {
    throw new AppError(409, 'The provider is not available for every requested date.');
  }
  if (hasAcceptedConflict(
    rateTypeDetails.providerId,
    body.serviceType,
    rateTypeDetails.serviceId,
    requestedDates
  )) {
    throw new AppError(409, 'This provider already has an accepted booking for the requested date.');
  }
  if (bookings.some((booking) =>
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
  bookings.push(booking);
  return res.status(201).json({
    success: true,
    message: 'Booking request created successfully.',
    data: { booking }
  });
};

export const listBookings = (req, res) => {
  let items = getOwnBookings(req.user);
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

export const getMyBookings = (req, res) => {
  const items = getOwnBookings(req.user)
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  return res.json({
    success: true,
    message: 'Your booking history retrieved successfully.',
    data: { count: items.length, bookings: items }
  });
};

export const getBooking = (req, res) => {
  const booking = findBooking(req.params.id);
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

const updateBookingStatus = (req, res, nextStatus) => {
  const booking = findBooking(req.params.id);
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
      const details = getProviderDetails(booking.serviceType, booking.serviceId);
      const requestedDates = getBookingDates(
        booking.bookingDate,
        booking.duration,
        details.rateType
      );
      if (requestedDates.some((date) => !details.availableDates.includes(date))) {
        throw new AppError(409, 'The provider is no longer available for every requested date.');
      }
      if (hasAcceptedConflict(
        booking.providerId,
        booking.serviceType,
        booking.serviceId,
        requestedDates
      )) {
        throw new AppError(409, 'Another booking has already been accepted for the requested date.');
      }
    }
  }

  booking.status = nextStatus;
  booking.updatedAt = new Date().toISOString();
  return res.json({
    success: true,
    message: `Booking ${nextStatus.toLowerCase()} successfully.`,
    data: { booking }
  });
};

export const acceptBooking = (req, res) => updateBookingStatus(req, res, 'Accepted');
export const rejectBooking = (req, res) => updateBookingStatus(req, res, 'Rejected');
export const cancelBooking = (req, res) => updateBookingStatus(req, res, 'Cancelled');
export const completeBooking = (req, res) => updateBookingStatus(req, res, 'Completed');
