export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  const isDuplicateKeyError = error.code === 11000;
  const statusCode = error.statusCode || (isDuplicateKeyError ? 409 : 500);
  if (statusCode >= 500) console.error(error);
  return res.status(statusCode).json({
    success: false,
    message: isDuplicateKeyError
      ? 'A record with the same unique value already exists.'
      : statusCode >= 500 && !error.expose
        ? 'Internal server error.'
        : error.message
  });
};
