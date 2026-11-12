import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import net from 'node:net';
import { after, before, test } from 'node:test';
import bcrypt from 'bcryptjs';

const deliveredEmails = [];

const smtpServer = net.createServer((socket) => {
  let buffer = '';
  let message = '';
  let readingMessage = false;
  socket.write('220 localhost FarmLink test SMTP\r\n');

  socket.on('data', (chunk) => {
    buffer += chunk.toString();
    let lineEnd = buffer.indexOf('\r\n');
    while (lineEnd >= 0) {
      const line = buffer.slice(0, lineEnd);
      buffer = buffer.slice(lineEnd + 2);

      if (readingMessage) {
        if (line === '.') {
          deliveredEmails.push(message);
          message = '';
          readingMessage = false;
          socket.write('250 Message accepted\r\n');
        } else {
          message += `${line}\n`;
        }
      } else if (/^(EHLO|HELO)\s/i.test(line)) {
        socket.write('250-localhost\r\n250 SIZE 10485760\r\n');
      } else if (/^(MAIL FROM|RCPT TO|RSET|NOOP)\s?/i.test(line)) {
        socket.write('250 OK\r\n');
      } else if (line === 'DATA') {
        readingMessage = true;
        socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
      } else if (line === 'QUIT') {
        socket.write('221 Bye\r\n');
        socket.end();
      } else {
        socket.write('250 OK\r\n');
      }

      lineEnd = buffer.indexOf('\r\n');
    }
  });
});

await new Promise((resolve) => smtpServer.listen(0, '127.0.0.1', resolve));
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-api-tests';
process.env.NODE_ENV = 'test';
process.env.SMTP_HOST = '127.0.0.1';
process.env.SMTP_PORT = String(smtpServer.address().port);
process.env.SMTP_FROM = 'FarmLink Test <noreply@example.test>';

const { enableInMemoryRepositoryForTests } = await import('../data/repository.js');
enableInMemoryRepositoryForTests();
const [{ default: app }, { users }] = await Promise.all([
  import('../app.js'),
  import('../data/store.js')
]);

let server;
let baseUrl;

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

const latestEmailOtp = () => {
  const match = deliveredEmails.at(-1)?.match(/code is (\d{6})/);
  assert.ok(match, 'Expected Nodemailer to deliver an email containing a six-digit OTP.');
  return match[1];
};

const registerAndVerify = async (name, email, role) => {
  const registration = await callApi('/api/auth/register', {
    method: 'POST',
    body: {
      name,
      email,
      mobileNumber: '+1 (415) 555-0199',
      password: 'FarmLinkPass123',
      role,
      location: 'Nashik'
    }
  });
  assert.equal(registration.status, 202);
  assert.equal(registration.data.success, true);
  assert.deepEqual(Object.keys(registration.data.data).sort(), ['email', 'verificationId']);

  const emailsBeforePendingLogin = deliveredEmails.length;
  const beforeVerificationLogin = await callApi('/api/auth/login', {
    method: 'POST',
    body: { email, password: 'FarmLinkPass123' }
  });
  assert.equal(beforeVerificationLogin.status, 403);
  assert.match(beforeVerificationLogin.data.message, /verify your email/i);
  assert.equal(deliveredEmails.length, emailsBeforePendingLogin);

  const verification = await callApi('/api/auth/register/verify', {
    method: 'POST',
    body: {
      verificationId: registration.data.data.verificationId,
      otp: latestEmailOtp()
    }
  });
  assert.equal(verification.status, 200);
  assert.equal(verification.data.data.user.role, role);
  assert.equal(Object.hasOwn(verification.data.data.user, 'passwordHash'), false);
  return verification.data.data.user;
};

const loginWithPassword = async (email, password = 'FarmLinkPass123') => {
  const emailCountBeforeLogin = deliveredEmails.length;
  const login = await callApi('/api/auth/login', {
    method: 'POST',
    body: { email, password }
  });
  assert.equal(login.status, 200);
  assert.equal(login.data.success, true);
  assert.equal(typeof login.data.data.token, 'string');
  assert.equal(Object.hasOwn(login.data.data, 'verificationId'), false);
  assert.equal(deliveredEmails.length, emailCountBeforeLogin);
  return login.data.data;
};

const withClockAdvanced = async (milliseconds, callback) => {
  const originalNow = Date.now;
  Date.now = () => originalNow() + milliseconds;
  try {
    return await callback();
  } finally {
    Date.now = originalNow;
  }
};

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  users.push({
    id: randomUUID(),
    name: 'Test Admin',
    email: 'admin@example.test',
    passwordHash: await bcrypt.hash('AdminPassword123', 4),
    role: 'admin',
    isVerified: true,
    location: '',
    isBlocked: false,
    createdAt: new Date().toISOString()
  });
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await new Promise((resolve, reject) =>
    smtpServer.close((error) => error ? reject(error) : resolve())
  );
});

test('email OTP registration and direct password login for all roles', async () => {
  const farmer = await registerAndVerify('Test Farmer', 'farmer@example.test', 'farmer');
  const buyer = await registerAndVerify('Test Buyer', 'buyer@example.test', 'buyer');
  const worker = await registerAndVerify('Test Worker', 'worker@example.test', 'worker');
  const equipmentOwner = await registerAndVerify(
    'Equipment Owner',
    'owner@example.test',
    'equipment_owner'
  );
  assert.equal(farmer.mobileNumber, '+1 (415) 555-0199');
  assert.equal(worker.role, 'worker');
  assert.equal(equipmentOwner.role, 'equipment_owner');

  const farmerLogin = await loginWithPassword(farmer.email);
  const buyerLogin = await loginWithPassword(buyer.email);
  assert.equal(farmerLogin.user.role, 'farmer');
  assert.equal((await callApi('/api/auth/profile', { token: farmerLogin.token })).data.data.user.role, 'farmer');
  const roleSpoofLogin = await callApi('/api/auth/login', {
    method: 'POST',
    body: { email: farmer.email, password: 'FarmLinkPass123', role: 'buyer' }
  });
  assert.equal(roleSpoofLogin.status, 200);
  assert.equal(roleSpoofLogin.data.data.user.role, 'farmer');
  assert.equal((await callApi('/api/produce/mine', { token: roleSpoofLogin.data.data.token })).status, 200);

  const invalidPassword = await callApi('/api/auth/login', {
    method: 'POST',
    body: { email: farmer.email, password: 'WrongPassword123' }
  });
  assert.equal(invalidPassword.status, 401);
  assert.equal(invalidPassword.data.message, 'Email or password is incorrect.');

  const unverifiedUser = {
    id: randomUUID(),
    name: 'Unverified Test User',
    email: 'unverified@example.test',
    passwordHash: await bcrypt.hash('FarmLinkPass123', 4),
    role: 'farmer',
    isVerified: false,
    isBlocked: false,
    createdAt: new Date().toISOString()
  };
  users.push(unverifiedUser);
  const unverifiedLogin = await callApi('/api/auth/login', {
    method: 'POST',
    body: { email: unverifiedUser.email, password: 'FarmLinkPass123' }
  });
  assert.equal(unverifiedLogin.status, 403);
  assert.match(unverifiedLogin.data.message, /verify your email/i);

  const invalidRoleUser = {
    id: randomUUID(),
    name: 'Invalid Role Test User',
    email: 'invalid-role@example.test',
    passwordHash: await bcrypt.hash('FarmLinkPass123', 4),
    role: 'unexpected',
    isVerified: true,
    isBlocked: false,
    createdAt: new Date().toISOString()
  };
  users.push(invalidRoleUser);
  const invalidRoleLogin = await callApi('/api/auth/login', {
    method: 'POST',
    body: { email: invalidRoleUser.email, password: 'FarmLinkPass123' }
  });
  assert.equal(invalidRoleLogin.status, 403);
  assert.match(invalidRoleLogin.data.message, /invalid role/i);

  const updatedProfile = await callApi('/api/auth/profile', {
    method: 'PUT',
    token: farmerLogin.token,
    body: {
      farmName: 'Green Acres',
      address: 'Farm Road',
      city: 'Nashik',
      state: 'Maharashtra',
      pincode: '422001'
    }
  });
  assert.equal(updatedProfile.status, 200);
  assert.equal(updatedProfile.data.data.user.farmName, 'Green Acres');
  assert.equal(updatedProfile.data.data.user.pincode, '422001');
  const unsupportedProfileField = await callApi('/api/auth/profile', {
    method: 'PUT',
    token: farmerLogin.token,
    body: { role: 'admin' }
  });
  assert.equal(unsupportedProfileField.status, 400);
  const workerLogin = await loginWithPassword(worker.email);
  assert.equal(workerLogin.user.role, 'worker');
  const equipmentOwnerLogin = await loginWithPassword(equipmentOwner.email);
  assert.equal(equipmentOwnerLogin.user.role, 'equipment_owner');
  const adminLogin = await loginWithPassword('admin@example.test', 'AdminPassword123');
  assert.equal(adminLogin.user.role, 'admin');
  const adminToken = adminLogin.token;
  assert.ok(Array.isArray((await callApi('/api/admin/equipment', { token: adminToken })).data.equipment));
  assert.ok(Array.isArray((await callApi('/api/admin/bookings', { token: adminToken })).data.bookings));

  const listingResult = await callApi('/api/produce', {
    method: 'POST',
    token: farmerLogin.token,
    body: {
      produceName: 'Tomato',
      category: 'Vegetable',
      quantity: 50,
      unit: 'kg',
      expectedPrice: 20,
      location: 'Nashik'
    }
  });
  assert.equal(listingResult.status, 201);
  const produceId = listingResult.data.produce.id;
  assert.equal((await callApi('/api/produce?search=tom')).data.count, 1);

  const invalidBid = await callApi('/api/bids', {
    method: 'POST',
    token: buyerLogin.token,
    body: { produceId, bidAmount: 25, quantity: 51 }
  });
  assert.equal(invalidBid.status, 400);

  const bidResult = await callApi('/api/bids', {
    method: 'POST',
    token: buyerLogin.token,
    body: { produceId, bidAmount: 25, quantity: 20, message: 'Ready to buy' }
  });
  assert.equal(bidResult.status, 201);
  const bidId = bidResult.data.bid.id;
  const receivedBids = await callApi(`/api/bids/produce/${produceId}`, {
    token: farmerLogin.token
  });
  assert.equal(receivedBids.data.highestBid.id, bidId);

  const decision = await callApi(`/api/bids/${bidId}/decision`, {
    method: 'PATCH',
    token: farmerLogin.token,
    body: { status: 'accepted' }
  });
  assert.equal(decision.status, 200);
  assert.equal(decision.data.order.totalPrice, 500);
  const orderId = decision.data.order.id;
  const confirmed = await callApi(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    token: farmerLogin.token,
    body: { status: 'Confirmed' }
  });
  assert.equal(confirmed.data.order.status, 'Confirmed');
  const cancelled = await callApi(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    token: buyerLogin.token,
    body: { status: 'Cancelled' }
  });
  assert.equal(cancelled.data.order.status, 'Cancelled');

  const analytics = await callApi('/api/analytics/prices?produceName=tom');
  assert.equal(analytics.data.prices[0].averagePrice, 25);
  const dashboard = await callApi('/api/admin/dashboard', { token: adminToken });
  assert.equal(dashboard.data.statistics.orders, 1);

  const blocked = await callApi(`/api/admin/users/${buyer.id}/block`, {
    method: 'PATCH',
    token: adminToken,
    body: { isBlocked: true }
  });
  assert.equal(blocked.status, 200);
  assert.equal((await callApi('/api/auth/profile', { token: buyerLogin.token })).status, 403);
});

test('OTP resend cooldown, invalidation, and failed-attempt limit', async () => {
  const registration = await callApi('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'OTP Test Worker',
      email: 'otp-worker@example.test',
      mobileNumber: '4155550123',
      password: 'FarmLinkPass123',
      role: 'worker'
    }
  });
  assert.equal(registration.status, 202);
  const originalVerificationId = registration.data.data.verificationId;
  const originalOtp = latestEmailOtp();

  const tooSoon = await callApi('/api/auth/register/resend-otp', {
    method: 'POST',
    body: { email: 'otp-worker@example.test' }
  });
  assert.equal(tooSoon.status, 429);

  const resentFirst = await withClockAdvanced(61_000, () =>
    callApi('/api/auth/register/resend-otp', {
      method: 'POST',
      body: { email: 'otp-worker@example.test' }
    })
  );
  assert.equal(resentFirst.status, 200);
  const oldOtpAfterResend = await callApi('/api/auth/register/verify', {
    method: 'POST',
    body: { verificationId: originalVerificationId, otp: originalOtp }
  });
  assert.equal(oldOtpAfterResend.status, 400);
  const currentVerificationId = resentFirst.data.data.verificationId;
  const currentOtp = latestEmailOtp();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const wrongOtp = attempt === 0
      ? '12345'
      : currentOtp === '000000' ? '000001' : '000000';
    const rejected = await callApi('/api/auth/register/verify', {
      method: 'POST',
      body: { verificationId: currentVerificationId, otp: wrongOtp }
    });
    assert.equal(rejected.status, 400);
    assert.equal(rejected.data.success, false);
  }

  const invalidated = await callApi('/api/auth/register/verify', {
    method: 'POST',
    body: { verificationId: currentVerificationId, otp: currentOtp }
  });
  assert.equal(invalidated.status, 400);

  const resent = await withClockAdvanced(122_000, () =>
    callApi('/api/auth/register/resend-otp', {
      method: 'POST',
      body: { email: 'otp-worker@example.test' }
    })
  );
  assert.equal(resent.status, 200);
  assert.notEqual(resent.data.data.verificationId, originalVerificationId);
  const verified = await callApi('/api/auth/register/verify', {
    method: 'POST',
    body: {
      verificationId: resent.data.data.verificationId,
      otp: latestEmailOtp()
    }
  });
  assert.equal(verified.status, 200);
});
