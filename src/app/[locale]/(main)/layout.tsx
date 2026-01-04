import { Header } from '@/components/layout/header'
import { MiniPlayer } from '@/components/player/mini-player'
import { Link } from '@/i18n/navigation'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
      <div className="relative min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pb-20 sm:pb-24">
        {children}
      </main>
      <footer className="border-t border-border/60 bg-background/95">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 pb-24 text-xs text-muted-foreground">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <a
                href="https://hanseat.me/impressum"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Impressum
              </a>
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Datenschutz
              </Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Nutzungsbedingungen
              </Link>
            </div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              2026 (c) hanseatische medienfabrik
            </div>
          </div>
          <div className="mt-2 text-[11px]">
            Programm und Inhalte erstellt durch kuenstliche Intelligenz
          </div>
        </div>
      </footer>
      <MiniPlayer />
    </div>
  )
}
