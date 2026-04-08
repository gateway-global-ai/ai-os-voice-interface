/**
 * Optional "demo hints" callouts in governance surfaces (e.g. Amendment Program).
 * Default off so real API / workflow testing is not cluttered with demo copy.
 * Persisted in localStorage when the user opts in.
 */
const STORAGE_KEY = 'aios.governanceDemoHints';

export function readGovernanceDemoHints(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeGovernanceDemoHints(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(STORAGE_KEY, '1');
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* private mode / quota */
  }
}
