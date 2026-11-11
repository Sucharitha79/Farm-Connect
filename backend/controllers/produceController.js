import { randomUUID } from 'node:crypto';
import { bids, orders, produceListings } from '../data/store.js';
import { AppError, badRequest, forbidden, notFound } from '../utils/errors.js';
import {
  optionalString,
  requirePositiveNumber,
  requireString
} from '../utils/validation.js';

const requiredTextFields = ['produceName', 'category', 'unit', 'location'];
const optionalTextFields = ['description', 'imageUrl'];

const validateProduce = (body, existing = {}) => {
  const result = {};
  for (const field of requiredTextFields) {
    const value = optionalString(body[field], field, { max: 300 });
    if (value !== undefined) result[field] = value;
    else if (!existing[field]) throw badRequest(`${field} is required.`);
  }
  for (const field of optionalTextFields) {
    const value = optionalString(body[field], field, {
      max: field === 'description' ? 2000 : 1000
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

export const listProduce = (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.toLowerCase() : '';
  const category = typeof req.query.category === 'string' ? req.query.category.toLowerCase() : '';
  const location = typeof req.query.location === 'string' ? req.query.location.toLowerCase() : '';
  const items = produceListings.filter((item) =>
    item.status === 'available' &&
    item.produceName.toLowerCase().includes(search) &&
    item.category.toLowerCase().includes(category) &&
    item.location.toLowerCase().includes(location)
  );
  return res.json({ count: items.length, produce: items });
};

export const listMyProduce = (req, res) =>
  res.json({ produce: produceListings.filter((item) => item.farmerId === req.user.id) });

export const getProduce = (req, res) => {
  const item = produceListings.find((entry) => entry.id === req.params.id);
  if (!item || (item.status !== 'available' && req.user?.role !== 'admin' && req.user?.id !== item.farmerId)) {
    throw notFound('Produce listing not found.');
  }
  return res.json({ produce: item });
};

export const createProduce = (req, res) => {
  const values = validateProduce(req.body);
  const item = {
    id: randomUUID(),
    farmerId: req.user.id,
    ...values,
    status: 'available',
    createdAt: new Date().toISOString()
  };
  produceListings.push(item);
  return res.status(201).json({ produce: item });
};

export const updateProduce = (req, res) => {
  const item = produceListings.find((entry) => entry.id === req.params.id);
  if (!item) throw notFound('Produce listing not found.');
  if (item.farmerId !== req.user.id) throw forbidden();
  if (item.status !== 'available') throw new AppError(409, 'Only available listings can be updated.');

  const values = validateProduce(req.body, item);
  if (
    values.quantity !== undefined &&
    bids.some((bid) => bid.produceId === item.id && bid.status === 'pending' && bid.quantity > values.quantity)
  ) {
    throw new AppError(409, 'Quantity cannot be lower than an existing pending bid quantity.');
  }
  Object.assign(item, values, { updatedAt: new Date().toISOString() });
  return res.json({ produce: item });
};

export const deleteProduce = (req, res) => {
  const index = produceListings.findIndex((entry) => entry.id === req.params.id);
  if (index < 0) throw notFound('Produce listing not found.');
  const item = produceListings[index];
  if (item.farmerId !== req.user.id) throw forbidden();
  if (orders.some((order) => order.produceId === item.id)) {
    throw new AppError(409, 'A listing with an order cannot be deleted.');
  }
  produceListings.splice(index, 1);
  for (let i = bids.length - 1; i >= 0; i -= 1) {
    if (bids[i].produceId === item.id) bids.splice(i, 1);
  }
  return res.status(204).send();
};
