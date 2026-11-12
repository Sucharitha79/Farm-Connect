import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-booking-tests';
process.env.NODE_ENV = 'test';

const { enableInMemoryRepositoryForTests } = await import('../data/repository.js');
enableInMemoryRepositoryForTests();
const [{ default: app }, { bookings, users }] = await Promise.all([
  import('../app.js'),
  import('../data/store.js')
]);
const { config } = await import('../config/env.js');

const farmerId = randomUUID();
const secondFarmerId = randomUUID();
const workerId = randomUUID();
const equipmentOwnerId = randomUUID();
const buyerId = randomUUID();
const adminId = randomUUID();
const farmerToken = jwt.sign({ sub: farmerId, role: 'farmer' }, config.jwtSecret);
const secondFarmerToken = jwt.sign({ sub: secondFarmerId, role: 'farmer' }, config.jwtSecret);
const workerToken = jwt.sign({ sub: workerId, role: 'worker' }, config.jwtSecret);
const equipmentOwnerToken = jwt.sign(
  { sub: equipmentOwnerId, role: 'equipment_owner' },
  config.jwtSecret
);
const buyerToken = jwt.sign({ sub: buyerId, role: 'buyer' }, config.jwtSecret);

let server;
let baseUrl;
let dateOne;
let dateTwo;

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
    { id: farmerId, role: 'farmer', isVerified: true, isBlocked: false },
    { id: secondFarmerId, role: 'farmer', isVerified: true, isBlocked: false },
    { id: workerId, role: 'worker', isVerified: true, isBlocked: false },
    { id: equipmentOwnerId, role: 'equipment_owner', isVerified: true, isBlocked: false },
    { id: buyerId, role: 'buyer', isVerified: true, isBlocked: false },
    { id: adminId, role: 'admin', isVerified: true, isBlocked: false }
  );
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  dateOne = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  dateTwo = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('farmers book workers and equipment through provider status lifecycles', async () => {
  assert.equal((await callApi('/api/bookings')).status, 401);
  assert.equal((await callApi('/api/bookings', { token: buyerToken })).status, 403);

  const workerProfile = await callApi('/api/workers', {
    method: 'POST',
    token: workerToken,
    body: {
      fullName: 'Booking Test Worker',
      mobileNumber: '+91 9876543210',
      location: 'Nashik',
      skills: ['Harvesting'],
      wageType: 'daily',
      wageAmount: 500,
      experienceYears: 3,
      availableDates: [dateOne, dateTwo]
    }
  });
  assert.equal(workerProfile.status, 201);

  const equipmentListing = await callApi('/api/equipment', {
    method: 'POST',
    token: equipmentOwnerToken,
    body: {
      equipmentName: 'Test Harvester',
      category: 'Harvester',
      description: 'Booking test listing',
      rentalRateType: 'daily',
      rentalPrice: 1200,
      location: 'Nashik',
      availableDates: [dateOne, dateTwo]
    }
  });
  assert.equal(equipmentListing.status, 201);

  const invalidType = await callApi('/api/bookings', {
    method: 'POST',
    token: farmerToken,
    body: {
      serviceType: 'TRACTOR',
      serviceId: equipmentListing.data.data.equipment.id,
      bookingDate: dateOne,
      duration: 1,
      location: 'Nashik'
    }
  });
  assert.equal(invalidType.status, 400);

  const unavailableDate = await callApi('/api/bookings', {
    method: 'POST',
    token: farmerToken,
    body: {
      serviceType: 'WORKER',
      serviceId: workerProfile.data.data.worker.id,
      bookingDate: '2099-01-01',
      duration: 1,
      location: 'Nashik'
    }
  });
  assert.equal(unavailableDate.status, 409);

  const workerBookingResult = await callApi('/api/bookings', {
    method: 'POST',
    token: farmerToken,
    body: {
      serviceType: 'WORKER',
      serviceId: workerProfile.data.data.worker.id,
      workType: 'Harvesting',
      description: 'Harvest the north field and sort the produce.',
      bookingDate: dateOne,
      duration: 2,
      location: 'Nashik'
    }
  });
  assert.equal(workerBookingResult.status, 201);
  const workerBooking = workerBookingResult.data.data.booking;
  assert.equal(workerBooking.totalPrice, 1000);
  assert.equal(workerBooking.status, 'Pending');
  assert.equal(workerBooking.workType, 'Harvesting');
  assert.equal(workerBooking.description, 'Harvest the north field and sort the produce.');
  assert.equal(workerBooking.bookingEndDate, dateTwo);

  const duplicate = await callApi('/api/bookings', {
    method: 'POST',
    token: farmerToken,
    body: {
      serviceType: 'WORKER',
      serviceId: workerProfile.data.data.worker.id,
      bookingDate: dateOne,
      duration: 2,
      location: 'Nashik'
    }
  });
  assert.equal(duplicate.status, 409);

  const overlappingPending = await callApi('/api/bookings', {
    method: 'POST',
    token: secondFarmerToken,
    body: {
      serviceType: 'WORKER',
      serviceId: workerProfile.data.data.worker.id,
      workType: 'Planting',
      description: 'Plant the west field.',
      bookingDate: dateTwo,
      duration: 1,
      location: 'Nashik'
    }
  });
  assert.equal(overlappingPending.status, 409);

  const strangerRead = await callApi(`/api/bookings/${workerBooking.id}`, {
    token: secondFarmerToken
  });
  assert.equal(strangerRead.status, 403);
  assert.equal((await callApi('/api/bookings/my-bookings', { token: farmerToken }))
    .data.data.count, 1);
  assert.equal((await callApi('/api/bookings', { token: workerToken }))
    .data.data.bookings[0].id, workerBooking.id);

  const farmerAccept = await callApi(`/api/bookings/${workerBooking.id}/accept`, {
    method: 'PUT',
    token: farmerToken
  });
  assert.equal(farmerAccept.status, 403);
  const acceptedWorker = await callApi(`/api/bookings/${workerBooking.id}/accept`, {
    method: 'PUT',
    token: workerToken
  });
  assert.equal(acceptedWorker.status, 200);
  assert.equal(acceptedWorker.data.data.booking.status, 'Accepted');

  const conflictingBooking = await callApi('/api/bookings', {
    method: 'POST',
    token: secondFarmerToken,
    body: {
      serviceType: 'WORKER',
      serviceId: workerProfile.data.data.worker.id,
      bookingDate: dateTwo,
      duration: 1,
      location: 'Nashik'
    }
  });
  assert.equal(conflictingBooking.status, 409);

  const workerCompleted = await callApi(`/api/bookings/${workerBooking.id}/complete`, {
    method: 'PUT',
    token: workerToken
  });
  assert.equal(workerCompleted.status, 200);
  assert.equal(workerCompleted.data.data.booking.status, 'Completed');
  assert.equal((await callApi('/api/workers/my-jobs', { token: workerToken }))
    .data.data.completedJobs.length, 1);

  const equipmentBookingResult = await callApi('/api/bookings', {
    method: 'POST',
    token: farmerToken,
    body: {
      serviceType: 'EQUIPMENT',
      serviceId: equipmentListing.data.data.equipment.id,
      bookingDate: dateOne,
      duration: 1,
      location: 'Nashik'
    }
  });
  assert.equal(equipmentBookingResult.status, 201);
  const equipmentBooking = equipmentBookingResult.data.data.booking;
  assert.equal(equipmentBooking.providerId, equipmentOwnerId);
  assert.equal(equipmentBooking.totalPrice, 1200);
  const equipmentAccepted = await callApi(`/api/bookings/${equipmentBooking.id}/accept`, {
    method: 'PUT',
    token: equipmentOwnerToken
  });
  assert.equal(equipmentAccepted.status, 200);

  const farmerCancelled = await callApi(`/api/bookings/${equipmentBooking.id}/cancel`, {
    method: 'PUT',
    token: farmerToken
  });
  assert.equal(farmerCancelled.status, 200);
  assert.equal(farmerCancelled.data.data.booking.status, 'Cancelled');
  assert.equal((await callApi('/api/equipment/my-bookings', { token: equipmentOwnerToken }))
    .data.data.bookings[0].status, 'Cancelled');

  const rejectedBooking = await callApi('/api/bookings', {
    method: 'POST',
    token: secondFarmerToken,
    body: {
      serviceType: 'EQUIPMENT',
      serviceId: equipmentListing.data.data.equipment.id,
      bookingDate: dateTwo,
      duration: 1,
      location: 'Nashik'
    }
  });
  assert.equal(rejectedBooking.status, 201);
  const rejected = await callApi(`/api/bookings/${rejectedBooking.data.data.booking.id}/reject`, {
    method: 'PUT',
    token: equipmentOwnerToken
  });
  assert.equal(rejected.status, 200);
  assert.equal(rejected.data.data.booking.status, 'Rejected');

  const allAsAdmin = await callApi('/api/bookings', {
    token: jwt.sign({ sub: adminId, role: 'admin' }, config.jwtSecret)
  });
  assert.equal(allAsAdmin.status, 200);
  assert.equal(allAsAdmin.data.data.count, 3);
  assert.equal(bookings.length, 3);
});
