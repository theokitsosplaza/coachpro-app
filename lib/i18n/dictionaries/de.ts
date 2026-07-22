/**
 * German dictionary.
 * ---------------------------------------------------------------------------
 * Typed against the English reference `Dictionary`, so a key added to en.ts
 * without a German translation fails the build instead of leaking English.
 */

import type { Dictionary } from './en'

export const de: Dictionary = {
  // Informal "du", gender-neutral for the coach ("Ich schaue mir ... selbst
  // an"). Like the English original: no digits, no hint of plan changes.
  reviewBrakeFallback: (clientName) =>
    `Hallo ${clientName}, danke dir für deinen Check-in diese Woche. ` +
    `Ich weiß es wirklich zu schätzen, dass du so konsequent dranbleibst. ` +
    `Ich schaue mir deine Zahlen gerade selbst genau an und melde mich bald ` +
    `mit den nächsten Schritten bei dir. Mach weiter so und ruh dich diese ` +
    `Woche gut aus!`,
}
