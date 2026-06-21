import { rootReducer } from './rootReducer';

export const store = {
  getState: rootReducer,
};

export type AppStore = typeof store;
