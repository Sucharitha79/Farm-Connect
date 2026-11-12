import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { findRecord, insertRecord } from './repository.js';
import { isValidEmail } from '../utils/validation.js';

export const seedAdmin = async () => {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email && !password) return;
  if (!email || !password) {
    throw new Error('Set both ADMIN_EMAIL and ADMIN_PASSWORD to provision an admin account.');
  }
  if (!isValidEmail(email) || password.length < 8 || password.length > 72) {
    throw new Error('ADMIN_EMAIL must be valid and ADMIN_PASSWORD must be 8-72 characters.');
  }
  if (await findRecord('users', (user) => user.email === email)) return;
  const user = {
    id: randomUUID(),
    name: 'FarmLink Admin',
    email,
    mobileNumber: '',
    passwordHash: await bcrypt.hash(password, 12),
    role: 'admin',
    isVerified: true,
    location: '',
    isBlocked: false,
    createdAt: new Date().toISOString()
  };
  await insertRecord('users', user);
};
