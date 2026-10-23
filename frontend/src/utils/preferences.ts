const REVIEWS_KEY = 'studyos.reviews'

/** Ripassi automatici al completamento di un argomento: attivi salvo scelta contraria. */
export function reviewsEnabled(): boolean {
  try { return localStorage.getItem(REVIEWS_KEY) !== '0' } catch { return true }
}

export function setReviewsEnabled(enabled: boolean): void {
  try { localStorage.setItem(REVIEWS_KEY, enabled ? '1' : '0') } catch { /* storage bloccato: resta il default */ }
}
