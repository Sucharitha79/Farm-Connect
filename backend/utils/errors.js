export class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.expose = true;
  }
}

export const notFound = (message) => new AppError(404, message);
export const badRequest = (message) => new AppError(400, message);
export const forbidden = (message = 'You are not allowed to perform this action.') =>
  new AppError(403, message);
