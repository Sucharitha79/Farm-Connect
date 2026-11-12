import {
  filterRecords,
  findRecord,
  listRecords,
  removeRecord,
  removeRecords,
  updateRecord
} from '../data/repository.js';
import { AppError, notFound } from '../utils/errors.js';

const withoutPassword = ({ passwordHash, ...user }) => user;

export const getUsers = async (req, res) =>
  res.json({ users: (await listRecords('users')).map(withoutPassword) });
export const getAllProduce = async (req, res) =>
  res.json({ produce: await listRecords('produceListings') });
export const getAllBids = async (req, res) =>
  res.json({ bids: await listRecords('bids') });
export const getAllOrders = async (req, res) =>
  res.json({ orders: await listRecords('orders') });
export const getAllEquipment = async (req, res) =>
  res.json({ equipment: await listRecords('equipment') });
export const getAllBookings = async (req, res) =>
  res.json({ bookings: await listRecords('bookings') });

export const setUserBlocked = async (req, res) => {
  const user = await findRecord('users', (entry) => entry.id === req.params.id);
  if (!user) throw notFound('User not found.');
  if (user.role === 'admin' && req.user.id !== user.id) {
    throw new AppError(403, 'An admin cannot change another admin account.');
  }
  if (typeof req.body.isBlocked !== 'boolean') {
    throw new AppError(400, 'isBlocked must be a boolean.');
  }
  const updatedUser = await updateRecord('users', user.id, { isBlocked: req.body.isBlocked });
  return res.json({ user: withoutPassword(updatedUser) });
};

export const deleteProduce = async (req, res) => {
  const item = await findRecord('produceListings', (entry) => entry.id === req.params.id);
  if (!item) throw notFound('Produce listing not found.');
  if (await findRecord('orders', (order) => order.produceId === req.params.id)) {
    throw new AppError(409, 'A listing with an order cannot be deleted.');
  }
  await removeRecord('produceListings', item.id);
  await removeRecords('bids', (bid) => bid.produceId === item.id);
  return res.status(204).send();
};

export const getDashboard = async (req, res) => {
  const [users, produceListings, bids, orders, workers, equipment] = await Promise.all([
    listRecords('users'),
    listRecords('produceListings'),
    listRecords('bids'),
    listRecords('orders'),
    listRecords('workers'),
    listRecords('equipment')
  ]);
  return res.json({
    statistics: {
      users: users.length,
      farmers: users.filter((user) => user.role === 'farmer').length,
      buyers: users.filter((user) => user.role === 'buyer').length,
      workers: workers.length,
      equipment: equipment.length,
      blockedUsers: users.filter((user) => user.isBlocked).length,
      produceListings: produceListings.length,
      availableListings: produceListings.filter((item) => item.status === 'available').length,
      bids: bids.length,
      pendingBids: bids.filter((bid) => bid.status === 'pending').length,
      orders: orders.length,
      deliveredOrders: orders.filter((order) => order.status === 'Delivered').length
    }
  });
};
