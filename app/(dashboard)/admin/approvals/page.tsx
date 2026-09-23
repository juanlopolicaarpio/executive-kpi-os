'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { AccessDenied } from '@/components/shared/StateViews'
import { sessionFetch } from '@/lib/api/session-fetch'
import { useMe } from '@/hooks/useInitiatives'
import { can } from '@/lib/permissions/capabilities'
import { validateTiers, matchTier, type ApprovalTier } from '@/lib/initiatives/routing'
import { formatPeso } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { MemberLite } from '@/lib/initiatives/mapping'

// PRD §10.2 Budget approval policies.
//
// The same validateTiers() that guards the API runs here as you type, so the
// gap or overlap is visible before saving rather than as a rejection after.

interface TierRow {
  lowerBound: number
  upperBound: number | null
  approvalRequired: boolean
  approverRole: 'manager' | 'executive' | 'admin' | null
}

export default function ApprovalPolicyPage() {
  const qc = useQueryClient()
  const { data: me } = useMe()
  const mayManage = me ? can(me.role, 'admin:manage') : false

  const { data, isLoading } = useQuery({
    queryKey: ['approval-policy'],
    queryFn: async () => {
      const res = await sessionFetch('/api/admin/approval-policies')
      return (await res.json()) as {
        policy: { id: string; version: number; currency: string } | null
        tiers: ApprovalTier[]
        members: MemberLite[]
      }
    },
    enabled: mayManage,
  })

  const [tiers, setTiers] = useState<TierRow[] | null>(null)
  const [testAmount, setTestAmount] = useState('750000')

  // Seed from the server exactly once per fetched policy, derived during render
  // rather than via an effect (which would cascade a re-render each refetch).
  const [seededFor, setSeededFor] = useState<string | null>(null)
  const policyKey = data?.policy?.id ?? null
  if (data?.tiers && policyKey !== seededFor) {
    setSeededFor(policyKey)
    setTiers(
      data.tiers.map((t) => ({
        lowerBound: t.lowerBound,
        upperBound: t.upperBound,
        approvalRequired: t.approvalRequired,
        approverRole: t.approverRole,
      })),
    )
  }
  const rows = tiers ?? []

  const save = useMutation({
    mutationFn: async () => {
      const res = await sessionFetch('/api/admin/approval-policies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tiers }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Could not save')
      return json
    },
    onSuccess: (r: { version: number }) => {
      void qc.invalidateQueries({ queryKey: ['approval-policy'] })
      toast.success(`Policy saved as version ${r.version}`)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (!me) return <Skeleton className="h-64 w-full rounded-xl" />
  if (!mayManage) return <AccessDenied />
  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />

  const asTiers: ApprovalTier[] = rows.map((t, i) => ({
    id: `t-${i}`,
    sortOrder: i + 1,
    lowerBound: Number(t.lowerBound),
    upperBound: t.upperBound == null ? null : Number(t.upperBound),
    approvalRequired: t.approvalRequired,
    approverRole: t.approverRole,
    approverUserId: null,
    delegateUserId: null,
  }))
  const validationError = validateTiers(asTiers)

  const testValue = Number(testAmount || 0)
  const matched = validationError ? null : matchTier(testValue, asTiers)
  const matchedIndex = matched ? asTiers.findIndex((t) => t.id === matched.id) : -1

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="rounded-xl border border-slate-200 bg-white p-5 md:p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Administration</p>
        <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950 md:text-2xl">
          Budget approval policy
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          When an initiative is submitted, its total budget is matched against these tiers to decide
          whether it approves automatically or routes to someone. Lower bounds are exclusive (except
          the first tier); upper bounds are inclusive.
        </p>
        {data?.policy && (
          <p className="mt-2 text-xs text-slate-400">
            Active version {data.policy.version} · {data.policy.currency}
          </p>
        )}
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="space-y-2">
          {rows.map((t, i) => (
            <div
              key={i}
              className={cn(
                'flex flex-wrap items-center gap-2 rounded-lg border p-3',
                i === matchedIndex ? 'border-blue-300 bg-blue-50/40' : 'border-slate-200',
              )}
            >
              <span className="w-5 text-xs font-medium text-slate-400">{i + 1}</span>

              <Input
                type="number"
                className="w-32"
                value={t.lowerBound}
                onChange={(e) => update(setTiers, i, { lowerBound: Number(e.target.value) })}
                aria-label={`Tier ${i + 1} lower bound`}
              />
              <span className="text-xs text-slate-400">to</span>
              <Input
                type="number"
                className="w-32"
                value={t.upperBound ?? ''}
                placeholder="∞"
                onChange={(e) =>
                  update(setTiers, i, {
                    upperBound: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                aria-label={`Tier ${i + 1} upper bound`}
              />

              <select
                value={t.approvalRequired ? 'required' : 'none'}
                onChange={(e) =>
                  update(setTiers, i, {
                    approvalRequired: e.target.value === 'required',
                    approverRole: e.target.value === 'required' ? (t.approverRole ?? 'manager') : null,
                  })
                }
                className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
                aria-label={`Tier ${i + 1} decision`}
              >
                <option value="none">No approval</option>
                <option value="required">Approval required</option>
              </select>

              {t.approvalRequired && (
                <select
                  value={t.approverRole ?? 'manager'}
                  onChange={(e) =>
                    update(setTiers, i, { approverRole: e.target.value as TierRow['approverRole'] })
                  }
                  className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
                  aria-label={`Tier ${i + 1} approver`}
                >
                  <option value="manager">The owner&apos;s manager</option>
                  <option value="executive">Executive</option>
                  <option value="admin">Admin</option>
                </select>
              )}

              {rows.length > 1 && (
                <button
                  onClick={() => setTiers((p) => (p ?? []).filter((_, idx) => idx !== i))}
                  className="ml-auto rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                  aria-label={`Remove tier ${i + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setTiers((prev) => {
                const p = prev ?? []
                const last = p[p.length - 1]
                const lower = last?.upperBound ?? 0
                // The new tier takes over the top; the previous last gets a
                // bound so the set stays contiguous.
                const next = p.map((t, i) =>
                  i === p.length - 1 && t.upperBound == null ? { ...t, upperBound: lower } : t,
                )
                return [
                  ...next,
                  { lowerBound: lower, upperBound: null, approvalRequired: true, approverRole: 'executive' as const },
                ]
              })
            }
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add tier
          </Button>

          <Button onClick={() => save.mutate()} disabled={Boolean(validationError) || save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save policy
          </Button>
        </div>

        {validationError ? (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-900">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {validationError}
          </p>
        ) : (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-900">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Tiers are contiguous and cover every amount.
          </p>
        )}
      </section>

      {/* Live routing test — the boundary cases from §14.4 */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Test a budget</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Input
            type="number"
            className="w-40"
            value={testAmount}
            onChange={(e) => setTestAmount(e.target.value)}
            aria-label="Test budget amount"
          />
          {[500000, 500000.01, 1000000, 1500000].map((v) => (
            <button
              key={v}
              onClick={() => setTestAmount(String(v))}
              className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              {formatPeso(v)}
            </button>
          ))}
        </div>
        <p className="mt-2.5 text-sm text-slate-700">
          {matched
            ? matched.approvalRequired
              ? `${formatPeso(testValue)} → tier ${matchedIndex + 1}, routes to the ${matched.approverRole === 'manager' ? "owner's manager" : matched.approverRole}.`
              : `${formatPeso(testValue)} → tier ${matchedIndex + 1}, approves automatically.`
            : 'No tier matches this amount.'}
        </p>
      </section>
    </div>
  )
}

function update<T>(
  setter: React.Dispatch<React.SetStateAction<T[] | null>>,
  i: number,
  patch: Partial<T>,
) {
  setter((prev) => (prev ?? []).map((item, idx) => (idx === i ? { ...item, ...patch } : item)))
}
