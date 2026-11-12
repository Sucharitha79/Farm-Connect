import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';

process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-image-tests';
process.env.NODE_ENV = 'test';
process.env.CLOUDINARY_CLOUD_NAME = 'farm-link-test';
process.env.CLOUDINARY_API_KEY = 'test-api-key';
process.env.CLOUDINARY_API_SECRET = 'test-api-secret';

const { enableInMemoryRepositoryForTests } = await import('../data/repository.js');
enableInMemoryRepositoryForTests();
const [{ default: app }, { equipment, produceListings, users, workers }, { config }] = await Promise.all([
  import('../app.js'),
  import('../data/store.js'),
  import('../config/env.js')
]);

const ownerId = randomUUID();
const farmerId = randomUUID();
const workerId = randomUUID();
const ownerToken = jwt.sign({ sub: ownerId, role: 'equipment_owner' }, config.jwtSecret);
const farmerToken = jwt.sign({ sub: farmerId, role: 'farmer' }, config.jwtSecret);
const workerToken = jwt.sign({ sub: workerId, role: 'worker' }, config.jwtSecret);
const uploadedAssets = [];
const deletedAssets = [];
const originalUploadStream = cloudinary.uploader.upload_stream;
const originalDestroy = cloudinary.uploader.destroy;
let server;
let baseUrl;
let uploadNumber = 0;
const pngImage = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/Y5sAAAAASUVORK5CYII=',
  'base64'
);

cloudinary.uploader.upload_stream = (options, callback) => ({
  end(buffer) {
    uploadNumber += 1;
    const publicId = `test-listing-${uploadNumber}`;
    uploadedAssets.push({ publicId, folder: options.folder, buffer });
    callback(null, {
      secure_url: `https://res.cloudinary.test/${publicId}.png`,
      public_id: publicId
    });
  }
});
cloudinary.uploader.destroy = async (publicId) => {
  deletedAssets.push(publicId);
  return { result: 'ok' };
};

const multipartRequest = async (path, { method = 'POST', token, fields = {}, file } = {}) => {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.append(key, value);
  if (file) body.append('image', new Blob([file.buffer], { type: file.type }), file.name);
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body
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
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  cloudinary.uploader.upload_stream = originalUploadStream;
  cloudinary.uploader.destroy = originalDestroy;
});

test('authenticated farmers and equipment owners upload persistent listing images', async () => {
  const product = await multipartRequest('/api/produce', {
    token: farmerToken,
    fields: {
      produceName: 'Tomato',
      category: 'Vegetable',
      quantity: '50',
      unit: 'kg',
      expectedPrice: '20',
      location: 'Nashik'
    },
    file: { buffer: pngImage, name: 'tomato.png', type: 'image/png' }
  });
  assert.equal(product.status, 201);
  const productId = product.data.produce.id;
  assert.equal(product.data.produce.imageUrl, 'https://res.cloudinary.test/test-listing-1.png');
  assert.equal(product.data.produce.imagePublicId, 'test-listing-1');
  assert.equal((await fetch(`${baseUrl}/api/produce/${productId}`).then((res) => res.json()))
    .produce.imageUrl, product.data.produce.imageUrl);
  assert.equal((await fetch(`${baseUrl}/api/produce/mine`, {
    headers: { Authorization: `Bearer ${farmerToken}` }
  }).then((res) => res.json())).produce[0].imageUrl, product.data.produce.imageUrl);

  const availableDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const listing = await multipartRequest('/api/equipment', {
    token: ownerToken,
    fields: {
      equipmentName: 'Farm Tractor',
      category: 'Tractor',
      description: 'Test listing',
      rentalRateType: 'daily',
      rentalPrice: '12000',
      location: 'Nashik',
      availableDates: JSON.stringify([availableDate])
    },
    file: { buffer: pngImage, name: 'tractor.png', type: 'image/png' }
  });
  assert.equal(listing.status, 201);
  const equipmentId = listing.data.data.equipment.id;
  assert.equal(listing.data.data.equipment.imageUrl, 'https://res.cloudinary.test/test-listing-2.png');
  assert.equal((await multipartRequest(`/api/equipment/${equipmentId}`, {
    method: 'PUT',
    token: ownerToken,
    fields: { removeImage: 'true' }
  })).data.data.equipment.imageUrl, '');
  assert.deepEqual(deletedAssets, ['test-listing-2']);

  const directory = await fetch(`${baseUrl}/api/equipment`, {
    headers: { Authorization: `Bearer ${farmerToken}` }
  }).then((res) => res.json());
  assert.equal(directory.data.equipment[0].imageUrl, '');
  assert.equal(uploadedAssets[0].folder, 'farmlink/produce');
  assert.equal(uploadedAssets[1].folder, 'farmlink/equipment');
  assert.equal(produceListings.length, 1);
  assert.equal(equipment.length, 1);

  const profile = await multipartRequest('/api/workers', {
    token: workerToken,
    fields: {
      fullName: 'Test Worker',
      mobileNumber: '+91 9876543210',
      location: 'Nashik',
      skills: JSON.stringify(['Harvesting']),
      wageType: 'daily',
      wageAmount: '800',
      experienceYears: '4',
      availableDates: JSON.stringify([new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)]),
      isAvailable: 'true'
    },
    file: { buffer: pngImage, name: 'worker.png', type: 'image/png' }
  });
  assert.equal(profile.status, 201);
  assert.equal(profile.data.data.worker.profileImageUrl, 'https://res.cloudinary.test/test-listing-3.png');
  assert.equal(workers.length, 1);
  const removedProfileImage = await multipartRequest(`/api/workers/${workerId}`, {
    method: 'PUT',
    token: workerToken,
    fields: { removeImage: 'true' }
  });
  assert.equal(removedProfileImage.status, 200);
  assert.equal(removedProfileImage.data.data.worker.profileImageUrl, '');
  assert.deepEqual(deletedAssets, ['test-listing-2', 'test-listing-3']);
});

test('image upload rejects unauthorized, invalid, oversized, and URL-based requests', async () => {
  const fields = {
    equipmentName: 'Farm Tractor',
    category: 'Tractor',
    rentalRateType: 'daily',
    rentalPrice: '12000',
    location: 'Nashik',
    availableDates: JSON.stringify([new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)])
  };
  const validFile = { buffer: pngImage, name: 'tractor.png', type: 'image/png' };
  assert.equal((await multipartRequest('/api/equipment', { fields, file: validFile })).status, 401);

  const spoofedImage = await multipartRequest('/api/equipment', {
    token: ownerToken,
    fields,
    file: { buffer: Buffer.from('not an image'), name: 'tractor.png', type: 'image/png' }
  });
  assert.equal(spoofedImage.status, 400);
  assert.match(spoofedImage.data.message, /not a valid/i);

  const oversizedImage = await multipartRequest('/api/equipment', {
    token: ownerToken,
    fields,
    file: { buffer: Buffer.alloc(5 * 1024 * 1024 + 1), name: 'large.png', type: 'image/png' }
  });
  assert.equal(oversizedImage.status, 413);

  const imageUrlRequest = await fetch(`${baseUrl}/api/produce`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${farmerToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      produceName: 'Tomato',
      category: 'Vegetable',
      quantity: 50,
      unit: 'kg',
      expectedPrice: 20,
      location: 'Nashik',
      imageUrl: 'https://example.test/tomato.png'
    })
  });
  assert.equal(imageUrlRequest.status, 400);
  assert.match((await imageUrlRequest.json()).message, /upload an image file/i);
});
