import { bids, orders, produceListings, users } from '../data/store.js';
import { AppError, notFound } from '../utils/errors.js';

const withoutPassword = ({ passwordHash, ...user }) => user;

export const getUsers = (req, res) =>
  res.json({ users: users.map(withoutPassword) });
export const getAllProduce = (req, res) => res.json({ produce: produceListings });
export const getAllBids = (req, res) => res.json({ bids });
export const getAllOrders = (req, res) => res.json({ orders });

export const setUserBlocked = (req, res) => {
  const user = users.find((entry) => entry.id === req.params.id);
  if (!user) throw notFound('User not found.');
  if (user.role === 'admin' && req.user.id !== user.id) {
    throw new AppError(403, 'An admin cannot change another admin account.');
  }
  if (typeof req.body.isBlocked !== 'boolean') {
    throw new AppError(400, 'isBlocked must be a boolean.');
  }
  user.isBlocked = req.body.isBlocked;
  return res.json({ user: withoutPassword(user) });
};

export const deleteProduce = (req, res) => {
  const index = produceListings.findIndex((item) => item.id === req.params.id);
  if (index < 0) throw notFound('Produce listing not found.');
  if (orders.some((order) => order.produceId === req.params.id)) {
    throw new AppError(409, 'A listing with an order cannot be deleted.');
  }
  produceListings.splice(index, 1);
  for (let i = bids.length - 1; i >= 0; i -= 1) {
    if (bids[i].produceId === req.params.id) bids.splice(i, 1);
  }
  return res.status(204).send();
};

export const getDashboard = (req, res) => res.json({
  statistics: {
    users: users.length,
    farmers: users.filter((user) => user.role === 'farmer').length,
    buyers: users.filter((user) => user.role === 'buyer').length,
    blockedUsers: users.filter((user) => user.isBlocked).length,
    produceListings: produceListings.length,
    availableListings: produceListings.filter((item) => item.status === 'available').length,
    bids: bids.length,
    pendingBids: bids.filter((bid) => bid.status === 'pending').length,
    orders: orders.length,
    deliveredOrders: orders.filter((order) => order.status === 'Delivered').length
  }
});
