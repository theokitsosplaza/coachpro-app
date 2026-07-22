/**
 * Dutch dictionary.
 * ---------------------------------------------------------------------------
 * Typed against the English reference `Dictionary`, so a key added to en.ts
 * without a Dutch translation fails the build instead of leaking English.
 */

import type { Dictionary } from './en'

export const nl: Dictionary = {
  // Informal "je", gender-neutral for the coach ("Ik neem ... zelf door").
  // Like the English original: no digits, no hint of plan changes.
  reviewBrakeFallback: (clientName) =>
    `Hoi ${clientName}, bedankt voor je check-in deze week. Ik waardeer het ` +
    `echt dat je zo consequent bezig bent. Ik neem je cijfers zelf even ` +
    `goed door en laat je snel de volgende stappen weten. Ga zo door en ` +
    `rust deze week goed uit!`,
}
