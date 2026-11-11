import { bids, produceListings } from '../data/store.js';

export const getPriceAnalytics = (req, res) => {
  const accepted = bids.filter((bid) => bid.status === 'accepted').map((bid) => {
    const produce = produceListings.find((item) => item.id === bid.produceId);
    return produce ? { bid, produce } : null;
  }).filter(Boolean).filter(({ produce }) => {
    const name = String(req.query.produceName || '').toLowerCase();
    const category = String(req.query.category || '').toLowerCase();
    const location = String(req.query.location || '').toLowerCase();
    return produce.produceName.toLowerCase().includes(name) &&
      produce.category.toLowerCase().includes(category) &&
      produce.location.toLowerCase().includes(location);
  });

  const groups = new Map();
  for (const { bid, produce } of accepted) {
    const key = `${produce.produceName}|${produce.category}|${produce.location}`;
    const group = groups.get(key) || {
      produceName: produce.produceName,
      category: produce.category,
      location: produce.location,
      acceptedBidCount: 0,
      total: 0,
      lowestPrice: Infinity,
      highestPrice: -Infinity
    };
    group.acceptedBidCount += 1;
    group.total += bid.bidAmount;
    group.lowestPrice = Math.min(group.lowestPrice, bid.bidAmount);
    group.highestPrice = Math.max(group.highestPrice, bid.bidAmount);
    groups.set(key, group);
  }
  const prices = [...groups.values()].map(({ total, ...group }) => ({
    ...group,
    averagePrice: Number((total / group.acceptedBidCount).toFixed(2))
  }));
  return res.json({
    basis: 'Accepted bids; prices are per produce unit.',
    sampleCount: accepted.length,
    prices
  });
};
