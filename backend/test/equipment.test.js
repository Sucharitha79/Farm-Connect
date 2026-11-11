import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-equipment-tests';

const [{ default: app }, { bookings, equipment, users }] = await Promise.all([
  import('../app.js'),
  import('../data/store.js')
]);
const { config } = await import('../config/env.js');

const ownerId = randomUUID();
const farmerId = randomUUID();
const workerId = randomUUID();
const ownerToken = jwt.sign({ sub: ownerId, role: 'equipment_owner' }, config.jwtSecret);
const farmerToken = jwt.sign({ sub: farmerId, role: 'farmer' }, config.jwtSecret);
const workerToken = jwt.sign({ sub: workerId, role: 'worker' }, config.jwtSecret);

let server;
let baseUrl;
let availableDate;

const callApi = async (path, { method = 'GET', token, body } = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const data = response.status === 204 ? null : await response.json();
  return { status: response.status, data };
};

before(async () => {
  users.push(
    { id: ownerId, role: 'equipment_owner', isVerified: true, isBlocked: false },
    { id: farmerId, role: 'farmer', isVerified: true, isBlocked: false },
    { id: workerId, role: 'worker', isVerified: true, isBlocked: false }
  );
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  availableDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('equipment listing permissions, availability, and rental history', async () => {
  assert.equal((await callApi('/api/equipment')).status, 401);
  assert.equal((await callApi('/api/equipment', { token: workerToken })).status, 403);

  const create = await callApi('/api/equipment', {
    method: 'POST',
    token: ownerToken,
    body: {
      equipmentName: 'Farm Tractor',
      category: 'Tractor',
      description: '55 HP tractor with operator option.',
      imageUrl: 'https://example.test/tractor.jpg',
      rentalRateType: 'daily',
      rentalPrice: 12000,
      location: 'Nashik',
      availableDates: [availableDate]
    }
  });
  assert.equal(create.status, 201);
  const listing = create.data.data.equipment;
  assert.equal(listing.ownerId, ownerId);
  assert.equal((await callApi('/api/equipment/my-listings', { token: ownerToken })).data.data.count, 1);
  assert.equal((await callApi('/api/equipment/my-listings', { token: farmerToken })).status, 403);

  const directory = await callApi('/api/equipment?category=tractor&location=nash&search=farm', {
    token: farmerToken
  });
  assert.equal(directory.status, 200);
  assert.equal(directory.data.data.count, 1);
  assert.equal(directory.data.data.equipment[0].id, listing.id);

  const wrongRoleCreate = await callApi('/api/equipment', {
    method: 'POST',
    token: workerToken,
    body: {}
  });
  assert.equal(wrongRoleCreate.status, 403);
  const invalidImage = await callApi('/api/equipment', {
    method: 'POST',
    token: ownerToken,
    body: {
      equipmentName: 'Bad Listing',
      category: 'Sprayer',
      rentalRateType: 'hourly',
      rentalPrice: 10,
      location: 'Nashik',
      availableDates: [availableDate],
      imageUrl: 'javascript:alert(1)'
    }
  });
  assert.equal(invalidImage.status, 400);

  const notOwnerUpdate = await callApi(`/api/equipment/${listing.id}`, {
    method: 'PUT',
    token: farmerToken,
    body: { rentalPrice: 13000 }
  });
  assert.equal(notOwnerUpdate.status, 403);

  const pendingBookingId = randomUUID();
  const completedBookingId = randomUUID();
  bookings.push(
    {
      id: pendingBookingId,
      farmerId,
      providerId: ownerId,
      serviceType: 'EQUIPMENT',
      serviceId: listing.id,
      bookingDate: availableDate,
      duration: 1,
      location: 'Nashik',
      totalPrice: 12000,
      status: 'Pending',
      createdAt: new Date().toISOString()
    },
    {
      id: completedBookingId,
      farmerId,
      providerId: ownerId,
      serviceType: 'EQUIPMENT',
      serviceId: listing.id,
      bookingDate: availableDate,
      duration: 1,
      location: 'Nashik',
      totalPrice: 12000,
      status: 'Completed',
      createdAt: new Date().toISOString()
    }
  );

  const conflictingUpdate = await callApi(`/api/equipment/${listing.id}`, {
    method: 'PUT',
    token: ownerToken,
    body: { availableDates: ['2099-01-01'] }
  });
  assert.equal(conflictingUpdate.status, 409);

  const update = await callApi(`/api/equipment/${listing.id}`, {
    method: 'PUT',
    token: ownerToken,
    body: { rentalPrice: 13000, rentalRateType: 'hourly' }
  });
  assert.equal(update.status, 200);
  assert.equal(update.data.data.equipment.rentalPrice, 13000);
  assert.equal(update.data.data.equipment.rentalRateType, 'hourly');

  const history = await callApi('/api/equipment/my-bookings', { token: ownerToken });
  assert.equal(history.data.data.count, 2);
  assert.equal(history.data.data.bookings.some((booking) => booking.status === 'Completed'), true);
  assert.equal((await callApi('/api/equipment/my-bookings', { token: farmerToken })).status, 403);

  const blockedDelete = await callApi(`/api/equipment/${listing.id}`, {
    method: 'DELETE',
    token: ownerToken
  });
  assert.equal(blockedDelete.status, 409);
  bookings.find((booking) => booking.id === pendingBookingId).status = 'Rejected';
  const deleted = await callApi(`/api/equipment/${listing.id}`, {
    method: 'DELETE',
    token: ownerToken
  });
  assert.equal(deleted.status, 204);
  assert.equal((await callApi(`/api/equipment/${listing.id}`, { token: farmerToken })).status, 404);
  assert.equal(equipment.length, 0);
  assert.equal((await callApi('/api/equipment/my-bookings', { token: ownerToken }))
    .data.data.bookings.find((booking) => booking.id === completedBookingId).equipmentName,
  'Equipment listing removed');
});
