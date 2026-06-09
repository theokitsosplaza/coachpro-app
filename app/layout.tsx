import './globals.css'
import { Bricolage_Grotesque, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google'
import type { Metadata } from 'next'

// ── Typography foundation ──────────────────────────────────────────────────
// Three fonts, each exposed as a CSS custom property so globals.css and
// @theme can wire them into Tailwind utilities (font-display, font-sans,
// font-mono) and individual components can reference them directly.

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',   // page titles, client names, big headers
})

const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',      // default UI text, labels, paragraphs, buttons
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',      // every standalone number — weights, macros, %s
})

export const metadata: Metadata = {
  title: 'Vimafy | AI Check-ins',
  description: 'B2B fitness coaching dashboard for weekly client reviews',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Apply all three font variables to <html> so they are available as CSS
  // custom properties throughout the entire document. The actual class that
  // uses --font-body as the default is set in globals.css on <body>.
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${hanken.variable} ${jetbrains.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
