/**
 * Spanish dictionary.
 * ---------------------------------------------------------------------------
 * Typed against the English reference `Dictionary`, so a key added to en.ts
 * without a Spanish translation fails the build instead of leaking English.
 */

import type { Dictionary } from './en'

export const es: Dictionary = {
  // Informal "tú", gender-neutral for the coach ("Estoy revisando", not
  // "yo mismo/misma"). Like the English original: no digits, no hint of
  // plan changes.
  reviewBrakeFallback: (clientName) =>
    `Hola ${clientName}, muchas gracias por tu check-in de esta semana. ` +
    `Valoro mucho tu constancia. Estoy revisando tus números personalmente ` +
    `y muy pronto te escribo con los próximos pasos. ¡Sigue así y descansa ` +
    `bien esta semana!`,
}
