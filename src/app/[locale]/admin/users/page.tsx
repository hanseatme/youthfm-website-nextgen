'use client'

import { useState, useEffect } from 'react'
import { Search, MoreHorizontal, Shield, ShieldOff, Ban, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface User {
  id: string
  username: string | null
  display_name: string | null
  location: string | null
  avatar_id: number | null
  vibes_total: number
  vibes_available: number
  streak_current: number
  is_admin: boolean
  created_at: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const supabase = createClient()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      toast.error('Fehler beim Laden der Benutzer')
      console.error(error)
    } else {
      setUsers(data as User[])
    }
    setLoading(false)
  }

  const toggleAdmin = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: !currentStatus } as never)
      .eq('id', userId)

    if (error) {
      toast.error('Fehler beim Aktualisieren')
    } else {
      toast.success(currentStatus ? 'Admin-Rechte entfernt' : 'Admin-Rechte vergeben')
      fetchUsers()
    }
  }

  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(search.toLowerCase()) ||
    user.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    user.location?.toLowerCase().includes(search.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Benutzer verwalten</h1>
        <p className="text-muted-foreground">
          Übersicht und Verwaltung aller registrierten Benutzer
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alle Benutzer</CardTitle>
          <CardDescription>
            {users.length} Benutzer registriert
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Suche nach Name, Username oder Ort..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={fetchUsers}>
              Aktualisieren
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Benutzer</TableHead>
                  <TableHead>Ort</TableHead>
                  <TableHead className="text-right">Vibes</TableHead>
                  <TableHead className="text-right">Streak</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registriert</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Laden...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Keine Benutzer gefunden
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={`/avatars/${user.avatar_id || 1}.png`} />
                            <AvatarFallback>
                              {user.display_name?.[0] || user.username?.[0] || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {user.display_name || 'Unbekannt'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              @{user.username || 'no-username'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.location || '-'}</TableCell>
                      <TableCell className="text-right font-mono">
                        {user.vibes_total.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.streak_current > 0 ? (
                          <Badge variant="secondary">
                            🔥 {user.streak_current}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {user.is_admin ? (
                          <Badge variant="default">Admin</Badge>
                        ) : (
                          <Badge variant="outline">User</Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Aktionen</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              Profil anzeigen
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => toggleAdmin(user.id, user.is_admin)}
                            >
                              {user.is_admin ? (
                                <>
                                  <ShieldOff className="mr-2 h-4 w-4" />
                                  Admin entfernen
                                </>
                              ) : (
                                <>
                                  <Shield className="mr-2 h-4 w-4" />
                                  Zum Admin machen
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Ban className="mr-2 h-4 w-4" />
                              Benutzer sperren
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
