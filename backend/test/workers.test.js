import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-worker-tests';

const [{ default: app }, { bookings, users }] = await Promise.all([
  import('../app.js'),
  import('../data/store.js')
]);
const { config } = await import('../config/env.js');

const farmerId = randomUUID();
const workerId = randomUUID();
const buyerId = randomUUID();
const workerToken = jwt.sign({ sub: workerId, role: 'worker' }, config.jwtSecret);
const farmerToken = jwt.sign({ sub: farmerId, role: 'farmer' }, config.jwtSecret);
const buyerToken = jwt.sign({ sub: buyerId, role: 'buyer' }, config.jwtSecret);

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
    { id: farmerId, role: 'farmer', isVerified: true, isBlocked: false },
    { id: workerId, role: 'worker', isVerified: true, isBlocked: false },
    { id: buyerId, role: 'buyer', isVerified: true, isBlocked: false }
  );
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  availableDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('worker profiles, directory permissions, and farmer job requests', async () => {
  assert.equal((await callApi('/api/workers')).status, 401);

  const create = await callApi('/api/workers', {
    method: 'POST',
    token: workerToken,
    body: {
      fullName: 'Kiran Worker',
      mobileNumber: '+91 9876543210',
      location: 'Nashik',
      skills: ['Planting', 'Harvesting', 'planting'],
      wageType: 'daily',
      wageAmount: 800,
      experienceYears: 4,
      availableDates: [availableDate]
    }
  });
  assert.equal(create.status, 201);
  const worker = create.data.data.worker;
  assert.equal(worker.skills.length, 2);
  assert.equal(worker.id, workerId);

  const duplicate = await callApi('/api/workers', {
    method: 'POST',
    token: workerToken,
    body: {}
  });
  assert.equal(duplicate.status, 409);

  const directory = await callApi('/api/workers?location=nash&skill=plant', {
    token: farmerToken
  });
  assert.equal(directory.status, 200);
  assert.equal(directory.data.data.count, 1);
  assert.equal(directory.data.data.workers[0].id, workerId);
  assert.equal((await callApi('/api/workers', { token: buyerToken })).status, 403);
  assert.equal((await callApi(`/api/workers/${workerId}`, { token: farmerToken })).status, 200);
  assert.equal((await callApi('/api/workers/my-profile', { token: workerToken })).status, 200);

  const forbiddenUpdate = await callApi(`/api/workers/${workerId}`, {
    method: 'PUT',
    token: farmerToken,
    body: { wageAmount: 900 }
  });
  assert.equal(forbiddenUpdate.status, 403);

  const update = await callApi(`/api/workers/${workerId}`, {
    method: 'PUT',
    token: workerToken,
    body: { wageAmount: 900, wageType: 'hourly' }
  });
  assert.equal(update.status, 200);
  assert.equal(update.data.data.worker.wageAmount, 900);
  assert.equal(update.data.data.worker.wageType, 'hourly');

  const pendingBookingId = randomUUID();
  const unavailableBookingId = randomUUID();
  bookings.push(
    {
      id: pendingBookingId,
      farmerId,
      providerId: workerId,
      serviceType: 'WORKER',
      serviceId: workerId,
      bookingDate: availableDate,
      duration: 1,
      location: 'Nashik',
      totalPrice: 900,
      status: 'Pending',
      createdAt: new Date().toISOString()
    },
    {
      id: unavailableBookingId,
      farmerId,
      providerId: workerId,
      serviceType: 'WORKER',
      serviceId: workerId,
      bookingDate: '2099-01-01',
      duration: 1,
      location: 'Nashik',
      totalPrice: 900,
      status: 'Pending',
      createdAt: new Date().toISOString()
    }
  );

  const unavailableUpdate = await callApi(`/api/workers/${workerId}`, {
    method: 'PUT',
    token: workerToken,
    body: { availableDates: [availableDate] }
  });
  assert.equal(unavailableUpdate.status, 409);

  const requests = await callApi('/api/workers/jobs', { token: workerToken });
  assert.equal(requests.data.data.count, 2);
  assert.equal((await callApi('/api/workers/my-jobs', { token: workerToken })).data.data.pendingJobs.length, 2);
  assert.equal((await callApi('/api/workers/my-jobs', { token: farmerToken })).status, 403);

  const acceptByFarmer = await callApi(`/api/workers/jobs/${pendingBookingId}/accept`, {
    method: 'PUT',
    token: farmerToken
  });
  assert.equal(acceptByFarmer.status, 403);
  const accepted = await callApi(`/api/workers/jobs/${pendingBookingId}/accept`, {
    method: 'PUT',
    token: workerToken
  });
  assert.equal(accepted.status, 200);
  assert.equal(accepted.data.data.booking.status, 'Accepted');

  const overlappingBookingId = randomUUID();
  bookings.push({
    id: overlappingBookingId,
    farmerId,
    providerId: workerId,
    serviceType: 'WORKER',
    serviceId: workerId,
    bookingDate: availableDate,
    duration: 1,
    rateType: 'daily',
    bookingEndDate: availableDate,
    location: 'Nashik',
    totalPrice: 900,
    status: 'Pending',
    createdAt: new Date().toISOString()
  });
  const overlappingAccept = await callApi(`/api/workers/jobs/${overlappingBookingId}/accept`, {
    method: 'PUT',
    token: workerToken
  });
  assert.equal(overlappingAccept.status, 409);
  const overlappingRejected = await callApi(`/api/workers/jobs/${overlappingBookingId}/reject`, {
    method: 'PUT',
    token: workerToken
  });
  assert.equal(overlappingRejected.status, 200);

  const unavailable = await callApi(`/api/workers/jobs/${unavailableBookingId}/accept`, {
    method: 'PUT',
    token: workerToken
  });
  assert.equal(unavailable.status, 409);
  const rejected = await callApi(`/api/workers/jobs/${unavailableBookingId}/reject`, {
    method: 'PUT',
    token: workerToken
  });
  assert.equal(rejected.status, 200);
  assert.equal(rejected.data.data.booking.status, 'Rejected');

  const blockedDelete = await callApi(`/api/workers/${workerId}`, {
    method: 'DELETE',
    token: workerToken
  });
  assert.equal(blockedDelete.status, 409);
  bookings[0].status = 'Completed';
  const completedJobs = await callApi('/api/workers/my-jobs', { token: workerToken });
  assert.equal(completedJobs.data.data.completedJobs.length, 1);
  assert.equal(completedJobs.data.data.pendingJobs.length, 0);

  const deleted = await callApi(`/api/workers/${workerId}`, {
    method: 'DELETE',
    token: workerToken
  });
  assert.equal(deleted.status, 204);
  assert.equal((await callApi('/api/workers/my-profile', { token: workerToken })).status, 404);
});
