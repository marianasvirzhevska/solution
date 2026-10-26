import { request } from '@/shared/api/http-client';
import type { Me } from '@/shared/api/types';
import { getFingerprint } from '@/shared/lib/fingerprint';

interface LoginResponse {
  device_session_token: string;
}

export const authApi = {
  login(email: string, password: string): Promise<LoginResponse> {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password, fingerprint: getFingerprint() },
      headers: { 'X-Captcha-Token': 'dev-captcha' },
      auth: false,
    });
  },

  issue(deviceSessionToken: string): Promise<void> {
    return request('/auth/token/issue', {
      method: 'POST',
      body: { device_session_token: deviceSessionToken, fingerprint: getFingerprint() },
      auth: false,
    });
  },

  revoke(): Promise<void> {
    return request('/auth/token/revoke', {
      method: 'POST',
      body: { fingerprint: getFingerprint() },
      auth: false,
    });
  },

  getMe(): Promise<Me> {
    return request<Me>('/v1/me');
  },
};
