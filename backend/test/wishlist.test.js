import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-wishlist-tests';
process.env.NODE_ENV = 'test';

const { enableInMemoryRepositoryForTests } = await import('../data/repository.js');
enableInMemoryRepositoryForTests();
const [{ default: app }, { produceListings, users }] = await Promise.all([
  import('../app.js'),
  import('../data/store.js')
]);
const { config } = await import('../config/env.js');

const buyerId = randomUUID();
const farmerId = randomUUID();
const buyerToken = jwt.sign({ sub: buyerId, role: 'buyer' }, config.jwtSecret);
const farmerToken = jwt.sign({ sub: farmerId, role: 'farmer' }, config.jwtSecret);
const productId = randomUUID();
let server;
let baseUrl;

const callApi = async (path, { method = 'GET', token } = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return {
    status: response.status,
    data: response.status === 204 ? null : await response.json()
  };
};

before(async () => {
  users.push(
    { id: buyerId, role: 'buyer', isVerified: true, isBlocked: false, wishlistProductIds: [] },
    { id: farmerId, role: 'farmer', isVerified: true, isBlocked: false, wishlistProductIds: [] }
  );
  produceListings.push({
    id: productId,
    farmerId,
    produceName: 'Tomato',
    category: 'Vegetable',
    quantity: 50,
    unit: 'kg',
    expectedPrice: 20,
    location: 'Nashik',
    description: '',
    imageUrl: 'https://images.example.test/tomato.png',
    status: 'available',
    createdAt: new Date().toISOString()
  });
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('wishlist is buyer-only, persisted on the user record, and returns real products', async () => {
  assert.equal((await callApi('/api/wishlist')).status, 401);
  assert.equal((await callApi('/api/wishlist', { token: farmerToken })).status, 403);

  const added = await callApi(`/api/wishlist/${productId}`, { method: 'POST', token: buyerToken });
  assert.equal(added.status, 200);
  assert.equal(added.data.data.product.imageUrl, 'https://images.example.test/tomato.png');

  const duplicateAdd = await callApi(`/api/wishlist/${productId}`, {
    method: 'POST',
    token: buyerToken
  });
  assert.equal(duplicateAdd.status, 200);

  const wishlist = await callApi('/api/wishlist', { token: buyerToken });
  assert.equal(wishlist.data.data.count, 1);
  assert.equal(wishlist.data.data.products[0].id, productId);

  const removed = await callApi(`/api/wishlist/${productId}`, {
    method: 'DELETE',
    token: buyerToken
  });
  assert.deepEqual(removed.data.data.wishlistProductIds, []);
  assert.equal((await callApi('/api/wishlist', { token: buyerToken })).data.data.count, 0);
});
