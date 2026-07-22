/**
 * English dictionary — the REFERENCE dictionary.
 * ---------------------------------------------------------------------------
 * Its inferred shape (`Dictionary`) is the contract every other language file
 * must satisfy, so adding a key here forces every translation to provide it
 * (a missing key is a compile error, never a silent English leak).
 *
 * Entries that need interpolation are functions, not template strings, so
 * word order can differ per language.
 */

export const en = {
  /**
   * Client-facing reply substituted by the post-call safety guardrail when the
   * engine's "review" brake is active but the model still emitted a digit in
   * clientMessage (see lib/ai-coach.ts). Must contain NO digits and NO hint of
   * plan changes.
   */
  reviewBrakeFallback: (clientName: string) =>
    `Hi ${clientName}, thanks so much for checking in this week. ` +
    `I really appreciate you staying consistent. I'm going over your ` +
    `numbers myself and will be in touch soon with your next steps. ` +
    `Keep up the great work and rest well this week!`,
}

export type Dictionary = typeof en
