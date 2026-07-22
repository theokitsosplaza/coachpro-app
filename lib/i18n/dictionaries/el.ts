/**
 * Greek dictionary.
 * ---------------------------------------------------------------------------
 * Typed against the English reference `Dictionary`, so a key added to en.ts
 * without a Greek translation fails the build instead of leaking English.
 */

import type { Dictionary } from './en'

export const el: Dictionary = {
  // Gender-neutral phrasing throughout ("Ελέγχω προσωπικά", not "ο ίδιος/η
  // ίδια") — the coach's gender is unknown. Like the English original: no
  // digits, no hint of plan changes.
  reviewBrakeFallback: (clientName) =>
    `Γεια σου ${clientName}, ευχαριστώ πολύ για το check-in αυτής της εβδομάδας. ` +
    `Εκτιμώ πολύ τη συνέπειά σου. Ελέγχω προσωπικά τα νούμερά σου και θα ` +
    `επικοινωνήσω σύντομα μαζί σου για τα επόμενα βήματα. Συνέχισε την ` +
    `εξαιρετική δουλειά και φρόντισε να ξεκουραστείς αυτή την εβδομάδα!`,
}
