import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { users } from '../data/store.js';
import { AppError, forbidden } from '../utils/errors.js';

export const authenticate = (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new AppError(401, 'A bearer token is required.'));
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = users.find((entry) => entry.id === payload.sub);
    if (!user) return next(new AppError(401, 'The authenticated user no longer exists.'));
    if (user.isVerified !== true) return next(new AppError(401, 'Email verification is required.'));
    if (user.isBlocked) return next(forbidden('This account has been blocked.'));
    req.user = user;
    return next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError(401, 'The token is invalid or expired.'));
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(forbidden('Your role is not permitted to perform this action.'));
  }
  return next();
};

export const authenticateToken = authenticate;
export const authorizeRole = authorize;
