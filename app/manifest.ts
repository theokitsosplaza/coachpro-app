import type { MetadataRoute } from 'next'

// Web app manifest for Vimafy. Next.js serves this at /manifest.webmanifest and
// automatically injects <link rel="manifest"> into <head>. It supplies the PWA
// install metadata and the large (512) app icon; the browser-tab favicons are
// declared via metadata.icons in app/layout.tsx. Colors mirror the dark theme
// in globals.css (--bg / --background = #0B0C0E).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vimafy',
    short_name: 'Vimafy',
    description: 'B2B fitness coaching dashboard for weekly client reviews',
    start_url: '/',
    display: 'standalone',
    background_color: '#0B0C0E',
    theme_color: '#0B0C0E',
    icons: [
      {
        src: '/brand/vimafy-favicon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/brand/vimafy-favicon-180.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
