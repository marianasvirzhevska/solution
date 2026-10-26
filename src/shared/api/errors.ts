import type { ApiErrorBody, ApiErrorPayload, ApiErrorType } from './types';

export class ApiError extends Error {
  readonly status: number;
  readonly type: ApiErrorType;
  readonly payload?: ApiErrorPayload;

  constructor(status: number, type: ApiErrorType, message: string, payload?: ApiErrorPayload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.type = type;
    if (payload) this.payload = payload;
  }

  static fromResponse(status: number, body: ApiErrorBody): ApiError {
    return new ApiError(status, body.error.type, body.error.message, body.error.payload);
  }
}

export function isValidationError(
  error: unknown,
): error is ApiError & { payload: ApiErrorPayload } {
  return (
    error instanceof ApiError && error.type === 'ValidationException' && Boolean(error.payload)
  );
}
