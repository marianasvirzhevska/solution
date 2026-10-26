export interface Webhook {
  id: string;
  name: string;
  url: string;
  active: boolean;
  created_at: string;
}

export interface WebhookList {
  data: Webhook[];
  paging: {
    pages: { current: number; last: number };
    results: { total: number; limitation: number };
  };
}

export interface Me {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
}

export type ApiErrorType =
  | 'BadRequestException'
  | 'AuthenticationException'
  | 'NotFoundException'
  | 'TokenMismatchException'
  | 'ValidationException';

export type ApiErrorPayload = Record<string, string[]>;

export interface ApiErrorBody {
  error: {
    type: ApiErrorType;
    message: string;
    payload?: ApiErrorPayload;
  };
}
