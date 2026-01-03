import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Next Generation Radio',
    template: '%s | Next Generation Radio',
  },
  description: 'Die moderne KI-Radio-Plattform mit Community-Features und Gamification',
}

// Root layout - required to have html and body tags
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
