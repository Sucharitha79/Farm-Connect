import mongoose from 'mongoose';
import { models } from '../models/index.js';
import {
  authChallenges,
  bookings,
  bids,
  equipment,
  orders,
  otpCooldowns,
  pendingRegistrations,
  produceListings,
  users,
  workers
} from './store.js';

const memoryCollections = {
  users,
  pendingRegistrations,
  authChallenges,
  otpCooldowns,
  workers,
  bookings,
  equipment,
  produceListings,
  bids,
  orders
};

let useInMemoryRepository = false;

export const enableInMemoryRepositoryForTests = () => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('The in-memory repository is only available to tests.');
  }
  useInMemoryRepository = true;
};

const isInMemoryRepository = () => {
  if (useInMemoryRepository) return true;
  if (mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB is not connected; refusing to use an in-memory data store.');
  }
  return false;
};
const serializeRecord = (record) => {
  if (!record) return null;
  const { _id, ...value } = record;
  return value;
};
const getCollection = (name) => {
  const collection = memoryCollections[name];
  if (!collection) throw new Error(`Unknown repository collection: ${name}`);
  return collection;
};

export const listRecords = async (name, { includeSecrets = false } = {}) => {
  if (!isInMemoryRepository()) {
    const query = models[name].find();
    if (includeSecrets) query.select('+passwordHash +otpHash');
    return (await query.lean()).map(serializeRecord);
  }
  return [...getCollection(name)];
};

export const findRecord = async (name, predicate, options) =>
  (await listRecords(name, options)).find(predicate) || null;

export const filterRecords = async (name, predicate, options) =>
  (await listRecords(name, options)).filter(predicate);

export const insertRecord = async (name, record) => {
  if (!isInMemoryRepository()) {
    const [created] = await models[name].create([record]);
    return serializeRecord(created.toObject());
  }
  getCollection(name).push(record);
  return record;
};

export const updateRecord = async (name, id, updates) => {
  if (!isInMemoryRepository()) {
    const updated = await models[name].findOneAndUpdate(
      { id },
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();
    return serializeRecord(updated);
  }
  const record = getCollection(name).find((entry) => entry.id === id);
  if (!record) return null;
  Object.assign(record, updates);
  return record;
};

export const updateRecords = async (name, predicate, updates) => {
  const records = (await listRecords(name)).filter(predicate);
  if (isInMemoryRepository()) {
    for (const record of records) Object.assign(record, updates);
    return records.length;
  }
  if (!records.length) return 0;
  const result = await models[name].updateMany(
    { id: { $in: records.map((record) => record.id) } },
    { $set: updates },
    { runValidators: true }
  );
  return result.modifiedCount;
};

export const removeRecord = async (name, id) => {
  if (!isInMemoryRepository()) {
    const result = await models[name].deleteOne({ id });
    return result.deletedCount > 0;
  }
  const collection = getCollection(name);
  const index = collection.findIndex((entry) => entry.id === id);
  if (index < 0) return false;
  collection.splice(index, 1);
  return true;
};

export const removeRecords = async (name, predicate) => {
  const records = (await listRecords(name)).filter(predicate);
  if (isInMemoryRepository()) {
    const collection = getCollection(name);
    const ids = new Set(records.map((record) => record.id));
    for (let index = collection.length - 1; index >= 0; index -= 1) {
      if (ids.has(collection[index].id)) collection.splice(index, 1);
    }
    return records.length;
  }
  if (!records.length) return 0;
  const result = await models[name].deleteMany({
    id: { $in: records.map((record) => record.id) }
  });
  return result.deletedCount;
};
