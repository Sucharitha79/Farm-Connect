import { randomUUID } from 'node:crypto';
import {
  filterRecords,
  findRecord,
  insertRecord,
  listRecords,
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
import {
  cleanupListingImage,
  rejectImageUrl,
  resolveListingImage
} from '../utils/listingImage.js';

const equipmentFields = [
  'equipmentName',
  'category',
  'description',
  'rentalRateType',
  'rentalPrice',
  'location',
  'availableDates',
  'removeImage'
];

const validateEquipment = (body, existing = {}, hasImageUpload = false) => {
  const values = {};
  if (!equipmentFields.some((field) => Object.hasOwn(body, field)) && !hasImageUpload && existing.id) {
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
    let availableDates = body.availableDates;
    if (typeof availableDates === 'string') {
      try {
        availableDates = JSON.parse(availableDates);
      } catch {
        throw badRequest('availableDates must be a JSON array.');
      }
    }
    values.availableDates = requireAvailableDates(availableDates);
  } else if (!existing.availableDates?.length) {
    throw badRequest('availableDates is required.');
  }
  return { ...existing, ...values };
};

const findEquipment = (id) => findRecord('equipment', (item) => item.id === id);
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

export const createEquipment = async (req, res) => {
  rejectImageUrl(req.body || {});
  const values = validateEquipment(req.body || {});
  const image = await resolveListingImage(req, null, 'farmlink/equipment');
  const item = {
    id: randomUUID(),
    ownerId: req.user.id,
    ...values,
    imageUrl: image.imageUrl,
    imagePublicId: image.imagePublicId,
    createdAt: new Date().toISOString()
  };
  let created;
  try {
    created = await insertRecord('equipment', item);
  } catch (error) {
    await cleanupListingImage(image.imagePublicId);
    throw error;
  }
  return res.status(201).json({
    success: true,
    message: 'Equipment listing created successfully.',
    data: { equipment: publicEquipment(created) }
  });
};

export const listEquipment = async (req, res) => {
  const search = String(req.query.search || '').toLowerCase();
  const category = String(req.query.category || '').toLowerCase();
  const location = String(req.query.location || '').toLowerCase();
  const rentalRateType = String(req.query.rentalRateType || '').toLowerCase();
  const listings = await filterRecords('equipment', (item) =>
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

export const getEquipment = async (req, res) => {
  const item = await findEquipment(req.params.id);
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

export const getMyListings = async (req, res) => {
  const listings = await filterRecords('equipment', (item) => item.ownerId === req.user.id);
  return res.json({
    success: true,
    message: 'Your equipment listings retrieved successfully.',
    data: { count: listings.length, equipment: listings.map(publicEquipment) }
  });
};

export const updateEquipment = async (req, res) => {
  rejectImageUrl(req.body || {});
  const item = await findEquipment(req.params.id);
  if (!item) throw notFound('Equipment listing not found.');
  if (item.ownerId !== req.user.id) throw forbidden();
  const values = validateEquipment(req.body || {}, item, Boolean(req.file));
  const activeEquipmentBookings = await filterRecords('bookings', (booking) =>
    booking.serviceType === 'EQUIPMENT' &&
    booking.serviceId === item.id &&
    ['Pending', 'Accepted'].includes(booking.status)
  );
  const dateChangesConflict = activeEquipmentBookings.some((booking) => {
    return getDatesForBooking(booking, item.rentalRateType)
      .some((date) => !values.availableDates.includes(date));
  });
  if (dateChangesConflict) {
    throw new AppError(409, 'Availability cannot exclude a date with a pending or accepted rental.');
  }
  const image = await resolveListingImage(req, item, 'farmlink/equipment');
  let updated;
  try {
    updated = await updateRecord('equipment', item.id, {
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
  return res.json({
    success: true,
    message: 'Equipment listing updated successfully.',
    data: { equipment: publicEquipment(updated) }
  });
};

export const deleteEquipment = async (req, res) => {
  const item = await findEquipment(req.params.id);
  if (!item) throw notFound('Equipment listing not found.');
  if (item.ownerId !== req.user.id) throw forbidden();
  const hasActiveBookings = await findRecord('bookings', (booking) =>
    booking.serviceType === 'EQUIPMENT' &&
    booking.serviceId === item.id &&
    ['Pending', 'Accepted'].includes(booking.status)
  );
  if (hasActiveBookings) {
    throw new AppError(409, 'Resolve pending or accepted rentals before deleting this listing.');
  }
  await removeRecord('equipment', item.id);
  await cleanupListingImage(item.imagePublicId);
  return res.status(204).send();
};

export const getMyBookings = async (req, res) => {
  const myBookings = (await filterRecords('bookings', (booking) =>
      booking.serviceType === 'EQUIPMENT' && booking.providerId === req.user.id
    ))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const equipmentListings = await listRecords('equipment');
  const equipmentById = new Map(equipmentListings.map((item) => [item.id, item]));
  const bookingsWithEquipmentName = myBookings.map((booking) => ({
    ...booking,
    equipmentName: equipmentById.get(booking.serviceId)?.equipmentName || 'Equipment listing removed'
  }));
  return res.json({
    success: true,
    message: 'Your equipment bookings retrieved successfully.',
    data: { count: bookingsWithEquipmentName.length, bookings: bookingsWithEquipmentName }
  });
};
