import { authHandlers } from './auth';
import { csrfHandlers } from './csrf';
import { meHandlers } from './me';
import { webhookHandlers } from './webhooks';

export const handlers = [...csrfHandlers, ...authHandlers, ...meHandlers, ...webhookHandlers];
