import type { SessionUser } from '../../types';

export type SessionState = {
  currentUser: SessionUser | null;
};

export const initialSessionState: SessionState = {
  currentUser: null,
};
