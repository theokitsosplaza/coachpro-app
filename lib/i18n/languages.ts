/**
 * Language registry — the single source of truth for per-client languages.
 * ---------------------------------------------------------------------------
 * Every consumer (the client form's picker, validation in server actions, the
 * AI layer's guardrail fallback) reads THIS registry. No consumer may branch
 * on a specific code (`if (lang === 'el')`) — adding a language must never
 * require touching a consumer.
 *
 * To add a language:
 *   1. Create lib/i18n/dictionaries/<code>.ts satisfying `Dictionary`.
 *   2. Add one entry to LANGUAGES below.
 * That's it.
 *
 * Codes are ISO 639-1. The DB stores them as a plain String with @default("en")
 * (mirroring the CheckIn.status convention — no Prisma enum); this allow-list
 * is the only enforcement layer.
 */

import { en, type Dictionary } from './dictionaries/en'
import { el } from './dictionaries/el'
import { es } from './dictionaries/es'
import { de } from './dictionaries/de'
import { fr } from './dictionaries/fr'
import { nl } from './dictionaries/nl'

export const LANGUAGES = {
  // label:      shown to the coach in the client form's picker.
  // aiName:     the language's English name, used verbatim in AI prompts
  //             ("write in Greek") — the prompt layer reads ONLY this, so a
  //             new language needs no prompt edit.
  // dateLocale: BCP 47 locale for date formatting in client-facing UI.
  //             Not consumed anywhere yet (reserved for Stage 4 / portal).
  en: { label: 'English',          aiName: 'English', dateLocale: 'en-GB', dictionary: en },
  el: { label: 'Greek (Ελληνικά)', aiName: 'Greek',   dateLocale: 'el-GR', dictionary: el },
  es: { label: 'Español',          aiName: 'Spanish', dateLocale: 'es-ES', dictionary: es },
  de: { label: 'Deutsch',          aiName: 'German',  dateLocale: 'de-DE', dictionary: de },
  fr: { label: 'Français',         aiName: 'French',  dateLocale: 'fr-FR', dictionary: fr },
  nl: { label: 'Nederlands',       aiName: 'Dutch',   dateLocale: 'nl-NL', dictionary: nl },
} as const satisfies Record<string, { label: string; aiName: string; dateLocale: string; dictionary: Dictionary }>

export type Language = keyof typeof LANGUAGES

export const DEFAULT_LANGUAGE: Language = 'en'

export function isLanguage(raw: unknown): raw is Language {
  return typeof raw === 'string' && raw in LANGUAGES
}

/**
 * Soft coercion — an unknown or missing code falls back to the default
 * instead of throwing, so a bad stored value can never block a save or
 * sink the analysis pipeline.
 */
export function toLanguage(raw: unknown): Language {
  return isLanguage(raw) ? raw : DEFAULT_LANGUAGE
}

export function getDictionary(lang: Language): Dictionary {
  return LANGUAGES[lang].dictionary
}
