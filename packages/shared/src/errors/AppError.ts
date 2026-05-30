export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(400, message, details);
  }

  static unauthorized(message = 'Unauthorized'): AppError {
    return new AppError(401, message);
  }

  static forbidden(message = 'Forbidden'): AppError {
    return new AppError(403, message);
  }

  static notFound(message = 'Resource not found'): AppError {
    return new AppError(404, message);
  }

  static conflict(message: string, details?: unknown): AppError {
    return new AppError(409, message, details);
  }

  static internal(message = 'Internal Server Error', details?: unknown): AppError {
    return new AppError(500, message, details);
  }
}