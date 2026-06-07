import type { Triage } from './coach-engine';

// ASSUMPTION: a client is overdue if their last check-in is older than this.
// Validate with real coaches before hardening.
export const OVERDUE_DAYS = 9;

export const TRIAGE_ORDER: Record<Triage, number> = {
  red: 0,
  yellow: 1,
  green: 2,
  grey: 3,
};
