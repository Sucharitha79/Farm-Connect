import { badRequest } from './errors.js';

export const isValidEmail = (email) =>
  typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const requireString = (value, field, { max = 200, min = 1 } = {}) => {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) {
    throw badRequest(`${field} must be a string between ${min} and ${max} characters.`);
  }
  return value.trim();
};

export const requirePositiveNumber = (value, field) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw badRequest(`${field} must be a number greater than zero.`);
  }
  return number;
};

export const requireAvailableDates = (value) => {
  if (!Array.isArray(value) || value.length < 1 || value.length > 365) {
    throw badRequest('availableDates must contain 1 to 365 dates.');
  }
  const today = new Date().toISOString().slice(0, 10);
  const dates = value.map((date) => requireString(date, 'available date', { max: 10 }));
  if (dates.some((date) =>
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ||
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date ||
    date < today
  )) {
    throw badRequest('availableDates must contain valid dates in YYYY-MM-DD format that are today or later.');
  }
  return [...new Set(dates)].sort();
};

export const optionalString = (value, field, options) =>
  value === undefined ? undefined : requireString(value, field, options);
