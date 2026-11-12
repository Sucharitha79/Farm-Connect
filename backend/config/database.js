import dns from 'node:dns';
import mongoose from 'mongoose';
import { config } from './env.js';

export const connectDatabase = async () => {
  if (!config.mongoUri || /<[^>]+>/.test(config.mongoUri)) {
    throw new Error('Set MONGODB_URI to a valid MongoDB connection string.');
  }

  if (config.mongoDnsServers.length) {
    dns.setServers(config.mongoDnsServers);
  }

  await mongoose.connect(config.mongoUri);
  console.log('Connected to MongoDB.');
};
