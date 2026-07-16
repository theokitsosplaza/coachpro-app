/**
 * CoachPro — Reflection Attention Flag (the safety chokepoint)
 * ---------------------------------------------------------------------------
 * The AI narrative layer (ai-coach.ts) may emit a single, coach-facing
 * "attention" signal derived ONLY from the client's written reflection:
 *
 *     { needsAttention: boolean, reason: string }
 *
 * This module is the ONE place that signal is ever turned into a Flag, and it
 * HARDCODES severity to 'warning'. The AI supplies only (a) whether to raise it
 * and (b) the reason text — never a severity, code, or title — so a hostile or
 * manipulated reflection can never mint a 'safety' flag, escalate triage to
 * red, or touch macros. Enforcement is STRUCTURAL (here), not prompt-based.
 *
 * Pure module: imports only types from coach-engine, so it is safe to import
 * from server routes and client components alike.
 * ---------------------------------------------------------------------------
 */

import type { Flag, Severity, Triage } from './coach-engine';

/** Stable code for the single reflection-derived attention flag. */
export const ATTENTION_FLAG_CODE = 'REFLECTION_ATTENTION';

/** The coach-facing reason is truncated to keep the flag card tidy and to bound
 *  any reflection-derived text that reaches the coach's screen. */
export const MAX_ATTENTION_REASON = 240;

/** The raw signal the AI returns (the only thing the model controls). */
export interface AttentionSignal {
  needsAttention: boolean;
  reason: string;
}

/**
 * Lenient parse of an unknown value (cached aiSynthesis JSON, an approve request
 * body, etc.) into a live AttentionSignal or null. Never throws. Returns a
 * signal ONLY when needsAttention is exactly true and reason is a non-empty
 * string — so null means "no attention flag".
 */
export function parseAttentionSignal(raw: unknown): AttentionSignal | null {
  if (
    raw != null &&
    typeof raw === 'object' &&
    (raw as Record<string, unknown>).needsAttention === true &&
    typeof (raw as Record<string, unknown>).reason === 'string' &&
    ((raw as Record<string, unknown>).reason as string).trim().length > 0
  ) {
    return { needsAttention: true, reason: ((raw as { reason: string }).reason).trim() };
  }
  return null;
}

/**
 * Mint the coach-facing Flag from the AI signal — the single chokepoint.
 * Severity is hardcoded to 'warning'; the model never provides it. Returns null
 * on any absent / false / malformed input (fail-safe: no signal -> no flag).
 */
export function attentionFlag(signal: AttentionSignal | null | undefined): Flag | null {
  const parsed = parseAttentionSignal(signal);
  if (!parsed) return null;
  return {
    code: ATTENTION_FLAG_CODE,
    severity: 'warning', // CAP — never 'safety', regardless of AI output
    title: 'Client reflection needs a look',
    detail: parsed.reason.slice(0, MAX_ATTENTION_REASON),
    suggestedAction: 'hold', // advisory only; nothing in the engine reads this
  };
}

/**
 * Raise triage to at least yellow for the roster board; never to red, never a
 * downgrade. red stays red; green / grey / yellow all become yellow.
 */
export function nudgeTriage(triage: Triage): Triage {
  return triage === 'red' ? 'red' : 'yellow';
}

/**
 * Append the attention flag (if any) to an engine flag list, preserving the
 * engine's severity ordering (safety, then warning, then info). Pure; returns a
 * new array. Does NOT touch triage — the roster board owns the triage nudge.
 */
export function appendAttentionFlag(
  flags: Flag[],
  signal: AttentionSignal | null | undefined,
): Flag[] {
  const flag = attentionFlag(signal);
  if (!flag) return flags;
  const order: Record<Severity, number> = { safety: 0, warning: 1, info: 2 };
  return [...flags, flag].sort((a, b) => order[a.severity] - order[b.severity]);
}
