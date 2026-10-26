import { HttpResponse } from 'msw';

import type { ApiErrorBody, ApiErrorPayload, ApiErrorType } from '@/shared/api/types';

import { db, FIXED_CSRF_TOKEN } from './db';

const ERROR_MESSAGES: Record<ApiErrorType, string> = {
  BadRequestException: 'The request could not be processed.',
  AuthenticationException: 'Authentication is required.',
  NotFoundException: 'The requested resource was not found.',
  TokenMismatchException: 'The CSRF token is missing or invalid.',
  ValidationException: 'The given data was invalid.',
};

const STATUS_BY_TYPE: Record<ApiErrorType, number> = {
  BadRequestException: 400,
  AuthenticationException: 401,
  NotFoundException: 404,
  TokenMismatchException: 419,
  ValidationException: 422,
};

export function errorResponse(
  type: ApiErrorType,
  payload?: ApiErrorPayload,
): HttpResponse<ApiErrorBody> {
  const body: ApiErrorBody = {
    error: {
      type,
      message: ERROR_MESSAGES[type],
      ...(payload ? { payload } : {}),
    },
  };
  return HttpResponse.json(body, { status: STATUS_BY_TYPE[type] });
}

export function requireCsrf(request: Request): HttpResponse<ApiErrorBody> | null {
  if (request.headers.get('X-CSRF-TOKEN') !== FIXED_CSRF_TOKEN) {
    return errorResponse('TokenMismatchException');
  }
  return null;
}

export function requireSession(): HttpResponse<ApiErrorBody> | null {
  const { issued, expiresAt } = db.session;
  if (!issued || expiresAt === null || Date.now() > expiresAt) {
    return errorResponse('AuthenticationException');
  }
  return null;
}

export function randomDelay(min = 200, max = 400): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
