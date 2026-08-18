// Typed application errors with error codes.
// Throw these inside services / API routes — the global error handler
// converts them to standardized JSON responses.

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 400,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const Errors = {
  // Auth
  invalidCredentials: () => new AppError("AUTH_INVALID_CREDENTIALS", "Invalid email or password", 401),
  unauthorized: () => new AppError("AUTH_UNAUTHORIZED", "Authentication required", 401),
  forbidden: (msg = "You do not have permission to perform this action") => new AppError("FORBIDDEN", msg, 403),
  accountLocked: () => new AppError("AUTH_ACCOUNT_LOCKED", "Account is locked due to repeated failed logins", 423),
  accountInactive: () => new AppError("AUTH_ACCOUNT_INACTIVE", "Account is not active", 403),
  sessionExpired: () => new AppError("AUTH_SESSION_EXPIRED", "Session expired", 401),

  // Resource
  notFound: (entity: string, id?: string) =>
    new AppError("NOT_FOUND", `${entity} not found${id ? `: ${id}` : ""}`, 404),
  conflict: (msg: string) => new AppError("CONFLICT", msg, 409),
  duplicate: (entity: string, field: string) =>
    new AppError("DUPLICATE", `${entity} with this ${field} already exists`, 409),

  // Validation
  validation: (msg: string, details?: unknown) => new AppError("VALIDATION_ERROR", msg, 422, details),

  // Business
  insufficientStock: (item: string, requested: number, available: number) =>
    new AppError(
      "INSUFFICIENT_STOCK",
      `Insufficient stock for ${item}: requested ${requested}, available ${available}`,
      422,
      { item, requested, available }
    ),
  duplicateItemCode: () => new AppError("DUPLICATE_ITEM_CODE", "An item with this code already exists", 409),
  invalidRequisition: (msg: string) => new AppError("INVALID_REQUISITION", msg, 422),
  invalidStockTransfer: (msg: string) => new AppError("INVALID_STOCK_TRANSFER", msg, 422),
  fifoCalculationError: (msg: string) => new AppError("FIFO_CALCULATION_ERROR", msg, 500),

  // System
  database: (msg: string) => new AppError("DATABASE_ERROR", msg, 500),
  internal: (msg = "Internal server error") => new AppError("INTERNAL_ERROR", msg, 500),
};
