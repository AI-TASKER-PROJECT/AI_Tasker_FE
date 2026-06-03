import { useEffect, useState } from 'react';
import type { Role, SessionUser } from '../types';

const SESSION_KEY = 'aitasker.session';
const SESSION_EVENT = 'aitasker:session-change';

const demoUsers: Record<Role, SessionUser> = {
  BUSINESS: {
    accessToken: 'demo-business-token',
    refreshToken: 'demo-refresh-token',
    role: 'BUSINESS',
    email: 'business@demo.aitasker.vn',
    fullName: 'Nguyễn Minh Anh',
  },
  EXPERT: {
    accessToken: 'demo-expert-token',
    refreshToken: 'demo-refresh-token',
    role: 'EXPERT',
    email: 'expert@demo.aitasker.vn',
    fullName: 'Trần Hoàng Nam',
  },
  ADMIN: {
    accessToken: 'demo-admin-token',
    refreshToken: 'demo-refresh-token',
    role: 'ADMIN',
    email: 'admin@demo.aitasker.vn',
    fullName: 'Lê Thu Quản Trị',
  },
  STAFF: {
    accessToken: 'demo-staff-token',
    refreshToken: 'demo-refresh-token',
    role: 'STAFF',
    email: 'staff@demo.aitasker.vn',
    fullName: 'Phạm Quốc Huy',
  },
};

export function getSession(): SessionUser | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function saveSession(session: SessionUser) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function createDemoSession(role: Role) {
  const session = demoUsers[role];
  saveSession(session);
  return session;
}

export function useSession() {
  const [session, setSessionState] = useState<SessionUser | null>(() => getSession());

  useEffect(() => {
    const sync = () => setSessionState(getSession());
    window.addEventListener(SESSION_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(SESSION_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return session;
}

export function roleLabel(role?: Role) {
  const labels: Record<Role, string> = {
    BUSINESS: 'Doanh nghiệp',
    EXPERT: 'Chuyên gia',
    ADMIN: 'Quản trị viên',
    STAFF: 'Nhân viên thẩm định',
  };
  return role ? labels[role] : 'Khách';
}
