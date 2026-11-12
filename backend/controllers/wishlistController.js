import { filterRecords, findRecord, updateRecord } from '../data/repository.js';
import { badRequest, notFound } from '../utils/errors.js';

const getBuyer = async (id) => {
  const buyer = await findRecord('users', (user) => user.id === id);
  if (!buyer) throw notFound('Customer account not found.');
  return buyer;
};

const getWishlistProducts = async (buyer) => {
  const productIds = new Set(buyer.wishlistProductIds || []);
  const products = await filterRecords('produceListings', (product) => productIds.has(product.id));
  return products.sort((first, second) =>
    (buyer.wishlistProductIds || []).indexOf(first.id) -
    (buyer.wishlistProductIds || []).indexOf(second.id)
  );
};

export const getWishlist = async (req, res) => {
  const buyer = await getBuyer(req.user.id);
  const products = await getWishlistProducts(buyer);
  return res.json({
    success: true,
    message: 'Wishlist retrieved successfully.',
    data: { count: products.length, products }
  });
};

export const addWishlistItem = async (req, res) => {
  const productId = req.params.productId;
  if (typeof productId !== 'string' || !productId.trim()) {
    throw badRequest('A product ID is required.');
  }
  const product = await findRecord('produceListings', (item) =>
    item.id === productId && item.status === 'available'
  );
  if (!product) throw notFound('Available product not found.');

  const buyer = await getBuyer(req.user.id);
  const wishlistProductIds = buyer.wishlistProductIds || [];
  if (!wishlistProductIds.includes(product.id)) {
    await updateRecord('users', buyer.id, {
      wishlistProductIds: [...wishlistProductIds, product.id]
    });
  }
  return res.status(200).json({
    success: true,
    message: 'Product saved to your wishlist.',
    data: { product }
  });
};

export const removeWishlistItem = async (req, res) => {
  const buyer = await getBuyer(req.user.id);
  const wishlistProductIds = (buyer.wishlistProductIds || [])
    .filter((productId) => productId !== req.params.productId);
  await updateRecord('users', buyer.id, { wishlistProductIds });
  return res.json({
    success: true,
    message: 'Product removed from your wishlist.',
    data: { wishlistProductIds }
  });
};
