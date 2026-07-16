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
  // Vimafy brand icons (assets live in public/brand/). The SVG is the primary,
  // scalable favicon for modern browsers; the 32/16 PNGs are fallbacks; the
  // 180 PNG is the iOS home-screen (apple-touch) icon. The 512 PNG is wired
  // through the web manifest (app/manifest.ts).
  icons: {
    icon: [
      { url: '/brand/vimafy-icon.svg', type: 'image/svg+xml' },
      { url: '/brand/vimafy-favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/vimafy-favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/brand/vimafy-favicon-180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
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
