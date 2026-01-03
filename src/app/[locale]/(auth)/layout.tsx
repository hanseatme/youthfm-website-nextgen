import { Radio } from 'lucide-react'
import { Link } from '@/i18n/navigation'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Simple header */}
      <header className="p-4">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <Radio className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">NGRadio</span>
        </Link>
      </header>

      {/* Auth content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-background/95">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 text-xs text-muted-foreground">
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
              <a
                href="https://hanseat.me/datenschutz"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Datenschutz
              </a>
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
    </div>
  )
}
