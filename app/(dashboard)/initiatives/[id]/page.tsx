'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  CalendarDays,
  User2,
  Wallet,
  Target,
  Sparkles,
  AlertTriangle,
  MessageSquare,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge, TypeBadge, GoalBadge, RoiBadge } from '@/components/initiatives/InitiativeBadges'
import { SubmitResultsDialog } from '@/components/initiatives/SubmitResultsDialog'
import { ApprovalDialog, ReviewResultsDialog } from '@/components/initiatives/ReviewDialogs'
import { ProgressUpdateDialog } from '@/components/initiatives/ProgressUpdateDialog'
import { ProjectKpiBlock } from '@/components/initiatives/ProjectKpiBlock'
import { useInitiative, useInitiativeAction, useViewer } from '@/hooks/useInitiatives'
import { nextActionFor, progressPct, budgetUsedPct, isOverdue, PRIORITY_LABELS } from '@/lib/initiatives/lifecycle'
import { formatPeso, formatDay } from '@/lib/format'
import { SLUG_TO_APP_ID } from '@/lib/kpi-map'
import { cn } from '@/lib/utils'

// The full business case: what was intended, what it cost, what it moved, and
// what was learned. This is the record the AI is trained on.

export default function InitiativeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params['id'] as string
  const viewer = useViewer()

  const { data, isLoading } = useInitiative(id)
  const action = useInitiativeAction()

  const [resultsOpen, setResultsOpen] = useState(false)
  const [approvalOpen, setApprovalOpen] = useState(false)
  const [progressOpen, setProgressOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)

  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />

  if (!data?.initiative) {
    return (
      <div>
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => router.push('/initiatives')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Initiatives
        </Button>
        <p className="mt-6 text-sm text-muted-foreground">Initiative not found.</p>
      </div>
    )
  }

  const initiative = data.initiative
  const next = nextActionFor(initiative, viewer)
  const progress = progressPct(initiative)
  const budgetUsed = budgetUsedPct(initiative)
  const overdue = isOverdue(initiative)
  const r = initiative.results

  // The primary control, driven by whatever the lifecycle says comes next.
  const primaryCta = (() => {
    if (!next.forViewer || !next.action) return null
    switch (next.action) {
      case 'submit':
        return { label: 'Submit for approval', run: () => action.mutate({ id, action: 'submit' }) }
      case 'approve':
        return { label: 'Review approval', run: () => setApprovalOpen(true) }
      case 'start':
        return { label: 'Start execution', run: () => action.mutate({ id, action: 'start' }) }
      case 'complete':
        return { label: 'Mark complete', run: () => action.mutate({ id, action: 'complete' }) }
      case 'submit-results':
        return { label: 'Submit results', run: () => setResultsOpen(true) }
      case 'begin-review':
        return { label: 'Begin review', run: () => action.mutate({ id, action: 'begin-review' }) }
      case 'approve-closure':
        return { label: 'Review results', run: () => setReviewOpen(true) }
      default:
        return null
    }
  })()

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => router.push('/initiatives')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Initiatives
      </Button>

      {/* Header */}
      <header className="rounded-xl border border-slate-200 bg-white p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge status={initiative.status} />
              <TypeBadge type={initiative.initiativeType} />
              {r && <GoalBadge goal={r.goalAchieved} />}
              <RoiBadge roi={r?.roi} />
            </div>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 md:text-2xl">
              {initiative.name}
            </h1>
            {initiative.description && (
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
                {initiative.description}
              </p>
            )}
          </div>

          {primaryCta && (
            <Button onClick={primaryCta.run} disabled={action.isPending}>
              {action.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {primaryCta.label}
            </Button>
          )}
        </div>

        {/* Next action */}
        <div
          className={cn(
            'mt-4 rounded-lg p-3 text-sm',
            next.forViewer ? 'bg-blue-50 text-blue-900' : 'bg-slate-50 text-slate-600',
          )}
        >
          <span className="font-medium">Next:</span> {next.label}
        </div>

        {/* Basic information */}
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm md:grid-cols-4">
          <Field icon={User2} label="Owner" value={initiative.ownerName ?? 'Unassigned'} />
          <Field icon={User2} label="Approver" value={initiative.approverName ?? '—'} />
          <Field icon={User2} label="Reviewer" value={initiative.reviewerName ?? '—'} />
          <Field icon={AlertTriangle} label="Priority" value={PRIORITY_LABELS[initiative.priority]} />
          <Field
            icon={CalendarDays}
            label="Timeline"
            value={
              initiative.startDate || initiative.endDate
                ? `${initiative.startDate ? formatDay(initiative.startDate) : '—'} → ${initiative.endDate ? formatDay(initiative.endDate) : '—'}`
                : '—'
            }
            emphasis={overdue ? 'warning' : undefined}
          />
        </dl>

        {initiative.status === 'active' && (
          <div className="mt-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn('h-full rounded-full', overdue ? 'bg-orange-500' : 'bg-blue-500')}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-xs text-slate-400">
                {progress}% complete
                {initiative.latestUpdateAt
                  ? ` · last update ${formatDay(initiative.latestUpdateAt)}`
                  : ' · no progress updates yet'}
                {overdue && ' · past its end date'}
              </p>
              {viewer.memberId === initiative.ownerId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setProgressOpen(true)}
                >
                  Update progress
                </Button>
              )}
            </div>
          </div>
        )}
      </header>

      {initiative.overallObjective && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Objective</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{initiative.overallObjective}</p>
          {initiative.descriptionMechanics && (
            <>
              <h3 className="mt-3 text-xs font-medium text-slate-500">Description and mechanics</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {initiative.descriptionMechanics}
              </p>
            </>
          )}
        </section>
      )}

      {(initiative.rejectionReason || initiative.cancellationReason) && (
        <div className="rounded-xl border border-red-200 bg-red-50/60 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-red-700">
            {initiative.rejectionReason ? 'Rejected' : 'Cancelled'}
          </p>
          <p className="mt-1 text-sm text-slate-800">
            {initiative.rejectionReason ?? initiative.cancellationReason}
          </p>
        </div>
      )}

      {/* AI suggestion / warning */}
      {(initiative.aiSuggestion || initiative.aiWarning) && (
        <div className="space-y-3">
          {initiative.aiSuggestion && (
            <div className="flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50/60 p-4">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                  AI suggestion at draft time
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-800">{initiative.aiSuggestion}</p>
              </div>
            </div>
          )}
          {initiative.aiWarning && (
            <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50/60 p-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-700">
                  Prior failure to avoid
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-800">{initiative.aiWarning}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Master KPI (§7.6) — exactly one, with its live status */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Target className="h-4 w-4 text-slate-400" /> Master KPI
          </h2>

          {!initiative.masterKpiName ? (
            <p className="mt-3 text-sm text-amber-700">
              No Master KPI linked. Exactly one is required before this can be submitted.
            </p>
          ) : (
            (() => {
              const appId = initiative.masterKpiSlug
                ? SLUG_TO_APP_ID[initiative.masterKpiSlug]
                : undefined
              const link = initiative.targetKpis.find(
                (k) => k.kpiSlug === initiative.masterKpiSlug,
              )
              const delta =
                link?.baselineValue != null && link?.resultValue != null
                  ? link.resultValue - link.baselineValue
                  : null
              return (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5">
                  <div className="min-w-0">
                    {appId ? (
                      <Link
                        href={`/kpis/${appId}`}
                        className="text-sm font-medium text-slate-900 hover:underline"
                      >
                        {initiative.masterKpiName}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium text-slate-900">
                        {initiative.masterKpiName}
                      </span>
                    )}
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      The existing organizational KPI this initiative exists to improve.
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-xs tabular-nums">
                    <p className="text-slate-500">
                      {link?.baselineValue != null ? link.baselineValue.toLocaleString() : '—'}
                      {' → '}
                      {link?.resultValue != null ? link.resultValue.toLocaleString() : '—'}
                    </p>
                    {delta != null && (
                      <p
                        className={cn(
                          'font-medium',
                          delta >= 0 ? 'text-emerald-600' : 'text-red-600',
                        )}
                      >
                        {delta >= 0 ? '+' : '−'}
                        {Math.abs(delta).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              )
            })()
          )}

          {/* Pre-v1.1 initiatives recorded several target KPIs. That intent is
              real history, so it is shown rather than discarded. */}
          {initiative.targetKpis.filter((k) => k.kpiSlug !== initiative.masterKpiSlug).length > 0 && (
            <div className="mt-2.5 border-t border-slate-100 pt-2">
              <p className="text-[11px] text-slate-400">
                Also recorded before this initiative used a single Master KPI:{' '}
                {initiative.targetKpis
                  .filter((k) => k.kpiSlug !== initiative.masterKpiSlug)
                  .map((k) => k.name ?? k.kpiSlug)
                  .join(', ')}
              </p>
            </div>
          )}
        </section>

        {/* Budget */}
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Wallet className="h-4 w-4 text-slate-400" /> Budget
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Approved" value={initiative.approvedBudget != null ? formatPeso(initiative.approvedBudget) : '—'} />
            <Row
              label="Actual spend"
              value={
                r?.actualSpend != null
                  ? formatPeso(r.actualSpend)
                  : initiative.actualSpend != null
                    ? formatPeso(initiative.actualSpend)
                    : '—'
              }
            />
            {budgetUsed != null && (
              <Row
                label="Used"
                value={`${budgetUsed}%`}
                tone={budgetUsed > 100 ? 'bad' : undefined}
              />
            )}
            {r?.revenueGenerated != null && <Row label="Revenue" value={formatPeso(r.revenueGenerated)} />}
            {r?.incrementalRevenue != null && (
              <Row label="Incremental revenue" value={formatPeso(r.incrementalRevenue)} />
            )}
            {r?.incrementalProfit != null && (
              <Row label="Incremental profit" value={formatPeso(r.incrementalProfit)} />
            )}
            {r?.roi != null && (
              <Row label="ROI" value={`${r.roi.toFixed(1)}%`} tone={r.roi >= 0 ? 'good' : 'bad'} />
            )}
            {r?.roas != null && <Row label="ROAS" value={`${r.roas.toFixed(2)}x`} />}
          </dl>

          {/* Approval route snapshot (§7.6) */}
          {(initiative.autoApproved || initiative.approverName) && (
            <p className="mt-3 border-t border-slate-100 pt-2 text-[11px] leading-snug text-slate-500">
              {initiative.autoApproved
                ? 'Auto-approved — the budget fell within a no-approval tier.'
                : `Routed to ${initiative.approverName} by the budget policy${
                    initiative.approvalPolicyVersion
                      ? ` (v${initiative.approvalPolicyVersion})`
                      : ''
                  }.`}
            </p>
          )}

          {/* Line items */}
          {initiative.budgetLines.length > 0 && (
            <div className="mt-3 border-t border-slate-100 pt-2">
              <p className="mb-1.5 text-xs font-medium text-slate-500">Line items</p>
              <ul className="space-y-1">
                {initiative.budgetLines.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="min-w-0 truncate text-slate-600">
                      {l.category}
                      {l.description ? ` — ${l.description}` : ''}
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-900">
                      {formatPeso(l.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      {/* Project KPIs (§7.6) */}
      <ProjectKpiBlock initiative={initiative} canEdit={viewer.memberId === initiative.ownerId} />

      {/* Results */}
      {r && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Results</h2>
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-xs font-medium text-slate-500">Business results</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{r.businessResults}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Lessons learned</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{r.lessonsLearned}</p>
            </div>
            <p className="text-xs text-slate-400">
              Submitted by {r.submittedByName ?? '—'} on {formatDay(r.submittedAt)}
              {r.reviewedAt && ` · reviewed by ${r.reviewedByName ?? '—'} on ${formatDay(r.reviewedAt)}`}
            </p>
            {r.reviewNotes && (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                <span className="font-medium">Review note:</span> {r.reviewNotes}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Thread */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <MessageSquare className="h-4 w-4 text-slate-400" /> Activity
        </h2>
        {!initiative.events?.length ? (
          <p className="mt-3 text-sm text-slate-400">No activity recorded yet.</p>
        ) : (
          <ol className="mt-3 space-y-3">
            {initiative.events.map((e) => (
              <li key={e.id} className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                <div className="min-w-0">
                  <p className="text-sm text-slate-700">
                    <span className="font-medium">{e.actorName ?? 'System'}</span>{' '}
                    {e.message ?? e.eventType.replace(/-/g, ' ')}
                  </p>
                  <p className="text-xs text-slate-400">{formatDay(e.createdAt)}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <SubmitResultsDialog initiative={initiative} open={resultsOpen} onOpenChange={setResultsOpen} />
      <ApprovalDialog initiative={initiative} open={approvalOpen} onOpenChange={setApprovalOpen} />
      <ProgressUpdateDialog initiative={initiative} open={progressOpen} onOpenChange={setProgressOpen} />
      <ReviewResultsDialog initiative={initiative} open={reviewOpen} onOpenChange={setReviewOpen} />
    </div>
  )
}

function Field({
  icon: Icon,
  label,
  value,
  emphasis,
}: {
  icon: React.ElementType
  label: string
  value: string
  emphasis?: 'warning'
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs text-slate-500">
        <Icon className="h-3.5 w-3.5 text-slate-400" aria-hidden />
        {label}
      </dt>
      <dd
        className={cn(
          'mt-0.5 truncate text-sm font-medium text-slate-900',
          emphasis === 'warning' && 'text-orange-700',
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-slate-500">{label}</dt>
      <dd
        className={cn(
          'font-medium tabular-nums text-slate-900',
          tone === 'good' && 'text-emerald-600',
          tone === 'bad' && 'text-red-600',
        )}
      >
        {value}
      </dd>
    </div>
  )
}
