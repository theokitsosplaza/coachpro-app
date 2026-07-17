import './globals.css'
import { Manrope, IBM_Plex_Mono } from 'next/font/google'
import type { Metadata } from 'next'

// ── Typography foundation ──────────────────────────────────────────────────
// Two fonts, each exposed as a CSS custom property that globals.css maps onto
// Tailwind's font-sans / font-display / font-mono utilities.
//
// Manrope replaces the old Bricolage + Hanken pair: it carries both headings
// (800) and body (600), so there is no separate display face any more.
// font-display still resolves — it just points at Manrope now — which keeps
// the ~27 existing `font-display` headings rendering.

const manrope = Manrope({
  // 'greek' is load-bearing: client names are routinely Greek.
  subsets: ['latin', 'greek'],
  display: 'swap',
  // Manrope is a variable font (200–800), so it needs no weight list — one
  // file covers every weight the design uses (400/500/600/700/800).
  variable: '--font-manrope',
})

const plexMono = IBM_Plex_Mono({
  // No 'greek' here — IBM Plex Mono has no Greek subset, and next/font throws
  // on an unsupported subset. The mono is digits-only (times, counts, stats),
  // so latin is enough.
  subsets: ['latin'],
  display: 'swap',
  // Plex Mono is NOT variable — every weight is a separate static file, so
  // each one used must be listed or the browser falls back to the nearest.
  // 500/600 are the reference's; 700 covers the existing `font-mono font-bold`
  // numbers, which font-synthesis:none would otherwise render at 600.
  weight: ['500', '600', '700'],
  variable: '--font-plex-mono',
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
  // Both font variables go on <html> so they are available as CSS custom
  // properties throughout the document. globals.css sets Manrope as the body
  // default from --font-manrope.
  return (
    <html lang="en" className={`${manrope.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
