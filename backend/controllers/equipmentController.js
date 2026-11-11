import { randomUUID } from 'node:crypto';
import { bookings, equipment } from '../data/store.js';
import { AppError, badRequest, forbidden, notFound } from '../utils/errors.js';
import {
  requireAvailableDates,
  requirePositiveNumber,
  requireString
} from '../utils/validation.js';
import { getDatesForBooking } from '../utils/bookingDates.js';

const equipmentFields = [
  'equipmentName',
  'category',
  'description',
  'imageUrl',
  'rentalRateType',
  'rentalPrice',
  'location',
  'availableDates'
];

const validateImageUrl = (value) => {
  if (value === '') return '';
  const imageUrl = requireString(value, 'imageUrl', { max: 2000 });
  try {
    const url = new URL(imageUrl);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported protocol');
  } catch {
    throw badRequest('imageUrl must be a valid HTTP or HTTPS URL.');
  }
  return imageUrl;
};

const validateEquipment = (body, existing = {}) => {
  const values = {};
  if (!equipmentFields.some((field) => Object.hasOwn(body, field)) && existing.id) {
    throw badRequest('Provide at least one equipment field to update.');
  }

  for (const field of ['equipmentName', 'category', 'location']) {
    if (Object.hasOwn(body, field)) {
      values[field] = requireString(body[field], field, { max: 200 });
    } else if (!existing[field]) {
      throw badRequest(`${field} is required.`);
    }
  }

  if (Object.hasOwn(body, 'description')) {
    values.description = requireString(body.description, 'description', { max: 2000, min: 0 });
  } else if (existing.description === undefined) {
    values.description = '';
  }
  if (Object.hasOwn(body, 'imageUrl')) {
    values.imageUrl = validateImageUrl(body.imageUrl);
  } else if (existing.imageUrl === undefined) {
    values.imageUrl = '';
  }
  if (Object.hasOwn(body, 'rentalRateType')) {
    if (!['hourly', 'daily'].includes(body.rentalRateType)) {
      throw badRequest('rentalRateType must be hourly or daily.');
    }
    values.rentalRateType = body.rentalRateType;
  } else if (!existing.rentalRateType) {
    throw badRequest('rentalRateType is required.');
  }
  if (Object.hasOwn(body, 'rentalPrice')) {
    values.rentalPrice = requirePositiveNumber(body.rentalPrice, 'rentalPrice');
  } else if (!existing.rentalPrice) {
    throw badRequest('rentalPrice is required.');
  }
  if (Object.hasOwn(body, 'availableDates')) {
    values.availableDates = requireAvailableDates(body.availableDates);
  } else if (!existing.availableDates?.length) {
    throw badRequest('availableDates is required.');
  }
  return { ...existing, ...values };
};

const findEquipment = (id) => equipment.find((item) => item.id === id);
const availableOnOrAfterToday = (item) => {
  const today = new Date().toISOString().slice(0, 10);
  return item.availableDates.some((date) => date >= today);
};

const publicEquipment = (item) => ({
  id: item.id,
  ownerId: item.ownerId,
  equipmentName: item.equipmentName,
  category: item.category,
  description: item.description,
  imageUrl: item.imageUrl,
  rentalRateType: item.rentalRateType,
  rentalPrice: item.rentalPrice,
  location: item.location,
  availableDates: item.availableDates,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt
});

export const createEquipment = (req, res) => {
  const values = validateEquipment(req.body || {});
  const item = {
    id: randomUUID(),
    ownerId: req.user.id,
    ...values,
    createdAt: new Date().toISOString()
  };
  equipment.push(item);
  return res.status(201).json({
    success: true,
    message: 'Equipment listing created successfully.',
    data: { equipment: publicEquipment(item) }
  });
};

export const listEquipment = (req, res) => {
  const search = String(req.query.search || '').toLowerCase();
  const category = String(req.query.category || '').toLowerCase();
  const location = String(req.query.location || '').toLowerCase();
  const rentalRateType = String(req.query.rentalRateType || '').toLowerCase();
  const listings = equipment.filter((item) =>
    availableOnOrAfterToday(item) &&
    item.equipmentName.toLowerCase().includes(search) &&
    item.category.toLowerCase().includes(category) &&
    item.location.toLowerCase().includes(location) &&
    (!rentalRateType || item.rentalRateType === rentalRateType)
  );
  return res.json({
    success: true,
    message: 'Available equipment retrieved successfully.',
    data: { count: listings.length, equipment: listings.map(publicEquipment) }
  });
};

export const getEquipment = (req, res) => {
  const item = findEquipment(req.params.id);
  if (!item) throw notFound('Equipment listing not found.');
  if (
    !availableOnOrAfterToday(item) &&
    item.ownerId !== req.user.id &&
    req.user.role !== 'admin'
  ) {
    throw notFound('Equipment listing not found.');
  }
  return res.json({
    success: true,
    message: 'Equipment listing retrieved successfully.',
    data: { equipment: publicEquipment(item) }
  });
};

export const getMyListings = (req, res) => {
  const listings = equipment.filter((item) => item.ownerId === req.user.id);
  return res.json({
    success: true,
    message: 'Your equipment listings retrieved successfully.',
    data: { count: listings.length, equipment: listings.map(publicEquipment) }
  });
};

export const updateEquipment = (req, res) => {
  const item = findEquipment(req.params.id);
  if (!item) throw notFound('Equipment listing not found.');
  if (item.ownerId !== req.user.id) throw forbidden();
  const values = validateEquipment(req.body || {}, item);
  const dateChangesConflict = bookings.some((booking) => {
    if (
      booking.serviceType !== 'EQUIPMENT' ||
      booking.serviceId !== item.id ||
      !['Pending', 'Accepted'].includes(booking.status)
    ) return false;
    return getDatesForBooking(booking, item.rentalRateType)
      .some((date) => !values.availableDates.includes(date));
  });
  if (dateChangesConflict) {
    throw new AppError(409, 'Availability cannot exclude a date with a pending or accepted rental.');
  }
  Object.assign(item, values, { updatedAt: new Date().toISOString() });
  return res.json({
    success: true,
    message: 'Equipment listing updated successfully.',
    data: { equipment: publicEquipment(item) }
  });
};

export const deleteEquipment = (req, res) => {
  const item = findEquipment(req.params.id);
  if (!item) throw notFound('Equipment listing not found.');
  if (item.ownerId !== req.user.id) throw forbidden();
  const hasActiveBookings = bookings.some((booking) =>
    booking.serviceType === 'EQUIPMENT' &&
    booking.serviceId === item.id &&
    ['Pending', 'Accepted'].includes(booking.status)
  );
  if (hasActiveBookings) {
    throw new AppError(409, 'Resolve pending or accepted rentals before deleting this listing.');
  }
  equipment.splice(equipment.indexOf(item), 1);
  return res.status(204).send();
};

export const getMyBookings = (req, res) => {
  const myBookings = bookings
    .filter((booking) =>
      booking.serviceType === 'EQUIPMENT' && booking.providerId === req.user.id
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((booking) => {
      const item = findEquipment(booking.serviceId);
      return {
        ...booking,
        equipmentName: item?.equipmentName || 'Equipment listing removed'
      };
    });
  return res.json({
    success: true,
    message: 'Your equipment bookings retrieved successfully.',
    data: { count: myBookings.length, bookings: myBookings }
  });
};
