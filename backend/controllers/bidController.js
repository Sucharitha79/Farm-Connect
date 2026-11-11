import { randomUUID } from 'node:crypto';
import { bids, orders, produceListings } from '../data/store.js';
import { AppError, badRequest, forbidden, notFound } from '../utils/errors.js';
import { requirePositiveNumber, optionalString } from '../utils/validation.js';

export const createBid = (req, res) => {
  const listing = produceListings.find((item) => item.id === req.body.produceId);
  if (!listing) throw notFound('Produce listing not found.');
  if (listing.status !== 'available') throw new AppError(409, 'This listing is not accepting bids.');
  const bidAmount = requirePositiveNumber(req.body.bidAmount, 'bidAmount');
  const quantity = requirePositiveNumber(req.body.quantity, 'quantity');
  if (quantity > listing.quantity) throw badRequest('Bid quantity cannot exceed the listing quantity.');
  const bid = {
    id: randomUUID(),
    produceId: listing.id,
    buyerId: req.user.id,
    bidAmount,
    quantity,
    message: optionalString(req.body.message, 'message', { max: 1000 }) || '',
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  bids.push(bid);
  return res.status(201).json({ bid });
};

export const listMyBids = (req, res) =>
  res.json({ bids: bids.filter((bid) => bid.buyerId === req.user.id) });

export const listBidsForProduce = (req, res) => {
  const listing = produceListings.find((item) => item.id === req.params.produceId);
  if (!listing) throw notFound('Produce listing not found.');
  if (req.user.role !== 'admin' && listing.farmerId !== req.user.id) throw forbidden();
  const listingBids = bids
    .filter((bid) => bid.produceId === listing.id)
    .sort((a, b) => b.bidAmount - a.bidAmount);
  return res.json({
    bids: listingBids,
    highestBid: listingBids[0] || null
  });
};

export const updateBid = (req, res) => {
  const bid = bids.find((entry) => entry.id === req.params.id);
  if (!bid) throw notFound('Bid not found.');
  if (bid.buyerId !== req.user.id) throw forbidden();
  if (bid.status !== 'pending') throw new AppError(409, 'Only pending bids can be updated or withdrawn.');
  const listing = produceListings.find((item) => item.id === bid.produceId);
  if (!listing || listing.status !== 'available') {
    throw new AppError(409, 'The listing is no longer available.');
  }

  if (req.body.status !== undefined) {
    if (req.body.status !== 'withdrawn' || Object.keys(req.body).some((key) => key !== 'status')) {
      throw badRequest('A pending bid can only be withdrawn by setting status to withdrawn.');
    }
    bid.status = 'withdrawn';
  } else {
    if (req.body.bidAmount !== undefined) {
      bid.bidAmount = requirePositiveNumber(req.body.bidAmount, 'bidAmount');
    }
    if (req.body.quantity !== undefined) {
      const quantity = requirePositiveNumber(req.body.quantity, 'quantity');
      if (quantity > listing.quantity) throw badRequest('Bid quantity cannot exceed the listing quantity.');
      bid.quantity = quantity;
    }
    if (req.body.message !== undefined) {
      bid.message = optionalString(req.body.message, 'message', { max: 1000 });
    }
  }
  bid.updatedAt = new Date().toISOString();
  return res.json({ bid });
};

export const decideBid = (req, res) => {
  const bid = bids.find((entry) => entry.id === req.params.id);
  if (!bid) throw notFound('Bid not found.');
  const listing = produceListings.find((item) => item.id === bid.produceId);
  if (!listing) throw notFound('Produce listing not found.');
  if (listing.farmerId !== req.user.id) throw forbidden();
  if (bid.status !== 'pending') throw new AppError(409, 'Only pending bids can be accepted or rejected.');
  if (!['accepted', 'rejected'].includes(req.body.status)) {
    throw badRequest('status must be accepted or rejected.');
  }

  if (req.body.status === 'accepted') {
    if (listing.status !== 'available') throw new AppError(409, 'This listing is no longer available.');
    if (orders.some((order) => order.produceId === listing.id)) {
      throw new AppError(409, 'An order already exists for this listing.');
    }
    bid.status = 'accepted';
    listing.status = 'closed';
    for (const otherBid of bids) {
      if (otherBid.produceId === listing.id && otherBid.status === 'pending') {
        otherBid.status = 'rejected';
      }
    }
    const order = {
      id: randomUUID(),
      orderNumber: `FL-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`,
      bidId: bid.id,
      produceId: listing.id,
      farmerId: listing.farmerId,
      buyerId: bid.buyerId,
      quantity: bid.quantity,
      unitPrice: bid.bidAmount,
      totalPrice: bid.bidAmount * bid.quantity,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    orders.push(order);
    return res.json({ bid, order });
  }

  bid.status = 'rejected';
  return res.json({ bid });
};
