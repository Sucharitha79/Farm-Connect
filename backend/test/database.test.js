import assert from 'node:assert/strict';
import { test } from 'node:test';
import { connectDatabase } from '../config/database.js';
import { config } from '../config/env.js';
import { models } from '../models/index.js';

test('MongoDB models cover every persisted backend collection', () => {
  assert.deepEqual(Object.keys(models).sort(), [
    'authChallenges',
    'bids',
    'bookings',
    'equipment',
    'orders',
    'otpCooldowns',
    'pendingRegistrations',
    'produceListings',
    'users',
    'workers'
  ]);
  assert.equal(models.users.schema.path('email').options.unique, true);
  assert.equal(models.users.schema.path('passwordHash').options.select, false);
  assert.equal(models.orders.schema.path('orderNumber').options.unique, true);
});

test('backend startup rejects an unset MongoDB connection string', async () => {
  const previousUri = config.mongoUri;
  config.mongoUri = '';
  try {
    await assert.rejects(connectDatabase(), /Set MONGODB_URI to a valid MongoDB connection string/);
  } finally {
    config.mongoUri = previousUri;
  }
});

test('repository does not fall back to memory when MongoDB is unavailable', async () => {
  const previousEnvironment = process.env.NODE_ENV;
  delete process.env.NODE_ENV;
  try {
    const { findRecord } = await import('../data/repository.js');
    await assert.rejects(
      findRecord('users', () => true),
      /MongoDB is not connected; refusing to use an in-memory data store/
    );
  } finally {
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
  }
});
