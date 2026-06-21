export type RootState = Record<string, never>;

export function rootReducer(state: RootState = {}) {
  return state;
}
