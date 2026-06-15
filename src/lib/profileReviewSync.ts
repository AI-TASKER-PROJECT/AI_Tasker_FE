const PROFILE_REVIEW_SYNC_EVENT = "aitasker:profile-review-sync";

export function notifyProfileReviewSync() {
  window.dispatchEvent(new Event(PROFILE_REVIEW_SYNC_EVENT));
}

export function subscribeProfileReviewSync(listener: () => void) {
  window.addEventListener(PROFILE_REVIEW_SYNC_EVENT, listener);
  return () => window.removeEventListener(PROFILE_REVIEW_SYNC_EVENT, listener);
}
