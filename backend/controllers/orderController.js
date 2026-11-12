import { filterRecords, findRecord, updateRecord } from '../data/repository.js';
import { AppError, badRequest, forbidden, notFound } from '../utils/errors.js';

const transitions = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Processing', 'Cancelled'],
  Processing: ['Shipped'],
  Shipped: ['Delivered'],
  Delivered: [],
  Cancelled: []
};

export const listMyOrders = async (req, res) => {
  const userOrders = await filterRecords('orders',
    (order) => order.buyerId === req.user.id || order.farmerId === req.user.id
  );
  return res.json({ orders: userOrders });
};

export const getOrder = async (req, res) => {
  const order = await findRecord('orders',
    (entry) => entry.id === req.params.id || entry.orderNumber === req.params.id
  );
  if (!order) throw notFound('Order not found.');
  if (
    req.user.role !== 'admin' &&
    order.buyerId !== req.user.id &&
    order.farmerId !== req.user.id
  ) throw forbidden();
  return res.json({ order });
};

export const updateOrderStatus = async (req, res) => {
  const order = await findRecord('orders', (entry) => entry.id === req.params.id);
  if (!order) throw notFound('Order not found.');
  const nextStatus = req.body.status;
  if (!Object.hasOwn(transitions, nextStatus)) {
    throw badRequest(`status must be one of: ${Object.keys(transitions).join(', ')}.`);
  }

  const isFarmer = req.user.id === order.farmerId;
  const isBuyer = req.user.id === order.buyerId;
  if (req.user.role !== 'admin' && !isFarmer && !isBuyer) throw forbidden();
  if (req.user.role !== 'admin') {
    const permitted = isFarmer
      ? ['Confirmed', 'Processing', 'Shipped'].includes(nextStatus)
      : nextStatus === 'Cancelled';
    if (!permitted) throw forbidden('Only the farmer can advance fulfillment, and only the buyer can cancel.');
  }
  if (!transitions[order.status].includes(nextStatus)) {
    throw new AppError(409, `Order cannot transition from ${order.status} to ${nextStatus}.`);
  }
  const updatedOrder = await updateRecord('orders', order.id, {
    status: nextStatus,
    updatedAt: new Date().toISOString()
  });
  return res.json({ order: updatedOrder });
};
