/**
 * French dictionary.
 * ---------------------------------------------------------------------------
 * Typed against the English reference `Dictionary`, so a key added to en.ts
 * without a French translation fails the build instead of leaking English.
 */

import type { Dictionary } from './en'

export const fr: Dictionary = {
  // Tutoiement (coach-client register), gender-neutral for the coach
  // ("Je regarde ... moi-même"). Like the English original: no digits, no
  // hint of plan changes.
  reviewBrakeFallback: (clientName) =>
    `Salut ${clientName}, merci beaucoup pour ton check-in cette semaine. ` +
    `J'apprécie vraiment ta régularité. Je regarde tes chiffres moi-même et ` +
    `je reviens vite vers toi avec la suite. Continue comme ça et ` +
    `repose-toi bien cette semaine !`,
}
