import { setRequestLocale } from 'next-intl/server'
import { Users, Sparkles, Swords, Radio } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'

interface AdminDashboardProps {
  params: Promise<{ locale: string }>
}

export default async function AdminDashboard({ params }: AdminDashboardProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const supabase = await createClient()

  // Fetch stats
  const [
    { count: totalUsers },
    { count: activeDuels },
    { data: vibesData },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('duels').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('profiles').select('vibes_total').limit(1000),
  ])

  const vibesArray = vibesData as { vibes_total: number }[] | null
  const totalVibes = vibesArray?.reduce((sum, p) => sum + (p.vibes_total || 0), 0) || 0

  const stats = [
    {
      title: 'Benutzer gesamt',
      value: totalUsers?.toLocaleString() || '0',
      icon: Users,
      description: 'Registrierte Benutzer',
    },
    {
      title: 'Vibes gesamt',
      value: totalVibes.toLocaleString(),
      icon: Sparkles,
      description: 'Alle verdienten Vibes',
    },
    {
      title: 'Aktive Duelle',
      value: activeDuels?.toString() || '0',
      icon: Swords,
      description: 'Aktuell laufende Duelle',
    },
    {
      title: 'Stream Status',
      value: 'Online',
      icon: Radio,
      description: 'Aktueller Stream-Status',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Übersicht über die Plattform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Letzte Registrierungen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Keine aktuellen Daten verfügbar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Letzte Duelle</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Keine aktuellen Daten verfügbar
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
