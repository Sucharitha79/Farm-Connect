import { randomUUID } from 'node:crypto';
import {
  filterRecords,
  findRecord,
  insertRecord,
  removeRecord,
  removeRecords,
  updateRecord
} from '../data/repository.js';
import { AppError, badRequest, forbidden, notFound } from '../utils/errors.js';
import {
  cleanupListingImage,
  rejectImageUrl,
  resolveListingImage
} from '../utils/listingImage.js';
import {
  optionalString,
  requirePositiveNumber,
  requireString
} from '../utils/validation.js';

const requiredTextFields = ['produceName', 'category', 'unit', 'location'];
const optionalTextFields = ['description'];

const validateProduce = (body, existing = {}) => {
  const result = {};
  for (const field of requiredTextFields) {
    const value = optionalString(body[field], field, { max: 300 });
    if (value !== undefined) result[field] = value;
    else if (!existing[field]) throw badRequest(`${field} is required.`);
  }
  for (const field of optionalTextFields) {
    const value = optionalString(body[field], field, {
      max: 2000,
      min: 0
    });
    if (value !== undefined) result[field] = value;
    else if (!existing[field]) result[field] = '';
  }

  if (body.quantity !== undefined) {
    result.quantity = requirePositiveNumber(body.quantity, 'quantity');
  } else if (!existing.quantity) {
    throw badRequest('quantity is required.');
  }
  if (body.expectedPrice !== undefined) {
    result.expectedPrice = requirePositiveNumber(body.expectedPrice, 'expectedPrice');
  } else if (!existing.expectedPrice) {
    throw badRequest('expectedPrice is required.');
  }
  return result;
};

export const listProduce = async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.toLowerCase() : '';
  const category = typeof req.query.category === 'string' ? req.query.category.toLowerCase() : '';
  const location = typeof req.query.location === 'string' ? req.query.location.toLowerCase() : '';
  const items = (await filterRecords('produceListings', (item) =>
    item.status === 'available' &&
    item.produceName.toLowerCase().includes(search) &&
    item.category.toLowerCase().includes(category) &&
    item.location.toLowerCase().includes(location)
  ));
  return res.json({ count: items.length, produce: items });
};

export const listMyProduce = async (req, res) =>
  res.json({ produce: await filterRecords('produceListings', (item) => item.farmerId === req.user.id) });

export const getProduce = async (req, res) => {
  const item = await findRecord('produceListings', (entry) => entry.id === req.params.id);
  if (!item || (item.status !== 'available' && req.user?.role !== 'admin' && req.user?.id !== item.farmerId)) {
    throw notFound('Produce listing not found.');
  }
  return res.json({ produce: item });
};

export const createProduce = async (req, res) => {
  const body = req.body || {};
  rejectImageUrl(body);
  const values = validateProduce(body);
  const image = await resolveListingImage(req, null, 'farmlink/produce');
  const item = {
    id: randomUUID(),
    farmerId: req.user.id,
    ...values,
    imageUrl: image.imageUrl,
    imagePublicId: image.imagePublicId,
    status: 'available',
    createdAt: new Date().toISOString()
  };
  let created;
  try {
    created = await insertRecord('produceListings', item);
  } catch (error) {
    await cleanupListingImage(image.imagePublicId);
    throw error;
  }
  return res.status(201).json({ produce: created });
};

export const updateProduce = async (req, res) => {
  const body = req.body || {};
  rejectImageUrl(body);
  const item = await findRecord('produceListings', (entry) => entry.id === req.params.id);
  if (!item) throw notFound('Produce listing not found.');
  if (item.farmerId !== req.user.id) throw forbidden();
  if (item.status !== 'available') throw new AppError(409, 'Only available listings can be updated.');

  const values = validateProduce(body, item);
  if (
    values.quantity !== undefined &&
    await findRecord('bids', (bid) =>
      bid.produceId === item.id && bid.status === 'pending' && bid.quantity > values.quantity
    )
  ) {
    throw new AppError(409, 'Quantity cannot be lower than an existing pending bid quantity.');
  }
  const image = await resolveListingImage(req, item, 'farmlink/produce');
  let updated;
  try {
    updated = await updateRecord('produceListings', item.id, {
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
  return res.json({ produce: updated });
};

export const deleteProduce = async (req, res) => {
  const item = await findRecord('produceListings', (entry) => entry.id === req.params.id);
  if (!item) throw notFound('Produce listing not found.');
  if (item.farmerId !== req.user.id) throw forbidden();
  if (await findRecord('orders', (order) => order.produceId === item.id)) {
    throw new AppError(409, 'A listing with an order cannot be deleted.');
  }
  await removeRecord('produceListings', item.id);
  await removeRecords('bids', (bid) => bid.produceId === item.id);
  await cleanupListingImage(item.imagePublicId);
  return res.status(204).send();
};
