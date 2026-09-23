'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Loader2, Check, X, MailCheck, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { AccessDenied } from '@/components/shared/StateViews'
import { sessionFetch } from '@/lib/api/session-fetch'
import { useMe } from '@/hooks/useInitiatives'
import { can, type PrdRole } from '@/lib/permissions/capabilities'
import { formatDay } from '@/lib/format'
import { cn } from '@/lib/utils'

// PRD §10.2 users and roles.
//
// Invite-only: adding someone here creates their account and emails them. There
// is no delete — a member may own KPIs and have signed approvals, so access is
// switched off rather than the person erased.

interface AdminUser {
  id: string
  name: string
  email: string
  level: PrdRole
  levelLabel: string
  isActive: boolean
  hasSignedIn: boolean
  invitedAt: string | null
  lastSeenAt: string | null
  ownedKpiCount: number
}

const LEVEL_HELP: Record<PrdRole, string> = {
  executive: 'Everything except admin settings. Can approve and review.',
  admin: 'Manages users, policies and settings. Cannot approve initiatives.',
  manager: 'Creates KPIs, approves and reviews within their reporting line.',
  contributor: 'Owns KPIs, runs initiatives, submits results. Cannot approve.',
  viewer: 'Read only.',
}

export default function AdminUsersPage() {
  const qc = useQueryClient()
  const { data: me } = useMe()
  const mayManage = me ? can(me.role, 'admin:manage') : false
  const [inviteOpen, setInviteOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await sessionFetch('/api/admin/users')
      return (await res.json()) as {
        users: AdminUser[]
        levels: { value: PrdRole; label: string }[]
      }
    },
    enabled: mayManage,
  })

  const patch = useMutation({
    mutationFn: async (body: { id: string; level?: PrdRole; isActive?: boolean }) => {
      const res = await sessionFetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Could not save')
      return json
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Saved')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (!me) return <Skeleton className="h-64 w-full rounded-xl" />
  if (!mayManage) return <AccessDenied />
  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />

  const users = data?.users ?? []
  const levels = data?.levels ?? []

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="rounded-xl border border-slate-200 bg-white p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Administration
            </p>
            <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950 md:text-2xl">
              People and access
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Adding someone creates their account and emails them a sign-in link. Nobody can sign
              up on their own.
            </p>
          </div>
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add person
          </Button>
        </div>
      </header>

      <div className="space-y-2">
        {users.map((u) => (
          <div
            key={u.id}
            className={cn(
              'flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4',
              u.isActive ? 'border-slate-200' : 'border-slate-200 opacity-60',
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">{u.name}</p>
                {u.id === me.memberId && (
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                    you
                  </span>
                )}
                {!u.isActive && (
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                    deactivated
                  </span>
                )}
                {u.hasSignedIn ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700">
                    <MailCheck className="h-3 w-3" aria-hidden /> signed in
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-700">
                    <Clock className="h-3 w-3" aria-hidden /> invite pending
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {u.email}
                {u.ownedKpiCount > 0 && ` · owns ${u.ownedKpiCount} KPI${u.ownedKpiCount === 1 ? '' : 's'}`}
                {u.lastSeenAt && ` · last seen ${formatDay(u.lastSeenAt)}`}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <select
                value={u.level}
                disabled={u.id === me.memberId || patch.isPending}
                onChange={(e) => patch.mutate({ id: u.id, level: e.target.value as PrdRole })}
                aria-label={`Access level for ${u.name}`}
                className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm disabled:opacity-50"
              >
                {levels.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>

              <Button
                variant="outline"
                size="sm"
                disabled={u.id === me.memberId || patch.isPending}
                onClick={() => patch.mutate({ id: u.id, isActive: !u.isActive })}
              >
                {u.isActive ? (
                  <>
                    <X className="mr-1.5 h-3.5 w-3.5" /> Deactivate
                  </>
                ) : (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5" /> Reactivate
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-slate-500">
        You cannot change your own level or deactivate yourself — there is no way back in if you
        remove your own access. Ask another admin.
      </p>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} levels={levels} />
    </div>
  )
}

function InviteDialog({
  open,
  onOpenChange,
  levels,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  levels: { value: PrdRole; label: string }[]
}) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [level, setLevel] = useState<PrdRole>('contributor')

  const invite = useMutation({
    mutationFn: async () => {
      const res = await sessionFetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), level }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Could not add that person')
      return json as { warning?: string }
    },
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ['admin-users'] })
      if (r.warning) toast.warning(r.warning)
      else toast.success(`Invitation sent to ${email.trim()}`)
      setName('')
      setEmail('')
      setLevel('contributor')
      onOpenChange(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const valid = name.trim().length > 1 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a person</DialogTitle>
          <DialogDescription>
            They will get an email with a sign-in link. Their access level decides what they can do
            once inside.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-name">Full name</Label>
            <Input
              id="invite-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ana Santos"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Work email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="avery@northstar.example"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-level">Access level</Label>
            <select
              id="invite-level"
              value={level}
              onChange={(e) => setLevel(e.target.value as PrdRole)}
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              {levels.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">{LEVEL_HELP[level]}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={invite.isPending}>
            Cancel
          </Button>
          <Button onClick={() => invite.mutate()} disabled={!valid || invite.isPending}>
            {invite.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
