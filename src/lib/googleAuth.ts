import type { Role, SessionUser } from '../types';

export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '565106811175-f1s40beb8ft5djorhl98co67gaseach6.apps.googleusercontent.com';

export interface GoogleCredentialPayload {
  email: string;
  name?: string;
  picture?: string;
  sub?: string;
}

export function decodeGoogleCredential(credential: string): GoogleCredentialPayload {
  const [, payload] = credential.split('.');
  if (!payload) throw new Error('Google credential không hợp lệ');

  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const json = decodeURIComponent(
    Array.from(atob(padded))
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join(''),
  );

  const decoded = JSON.parse(json) as GoogleCredentialPayload;
  if (!decoded.email) throw new Error('Google credential không có email');
  return decoded;
}

export function inferRoleFromGoogleEmail(email: string): Role {
  const normalized = email.toLowerCase();
  if (normalized.includes('admin')) return 'ADMIN';
  if (normalized.includes('staff')) return 'STAFF';
  if (normalized.includes('expert')) return 'EXPERT';
  return 'BUSINESS';
}

export function createGoogleSession(credential: string, role: Role): SessionUser {
  const payload = decodeGoogleCredential(credential);
  return {
    accessToken: credential,
    refreshToken: `google-${payload.sub || payload.email}`,
    role,
    email: payload.email,
    fullName: payload.name || payload.email.split('@')[0],
    pictureUrl: payload.picture,
    authProvider: 'GOOGLE',
  };
}
