'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getInitiatives,
  getInitiative,
  getInitiativeStats,
  createInitiative,
  updateInitiative,
  performAction,
  postProgressUpdate,
  submitResults,
  reviewResults,
  type CreateInitiativeInput,
  type UpdateInitiativeInput,
  type SubmitResultsInput,
  type ProgressUpdateInput,
} from '@/lib/api/initiatives'
import { getMe } from '@/lib/api/session-fetch'
import { usePersonaKey } from '@/hooks/usePersonas'
import { nextActionFor, sectionsFor, type InitiativeAction } from '@/lib/initiatives/lifecycle'
import type { Initiative, InitiativeFilters, InitiativeSection } from '@/types/initiative'

// Every mutation invalidates the list, the detail and the stats, because a
// closure changes the portfolio ROI that Home and the AI Coach read.

const LIST_KEY = 'initiatives'
const STATS_KEY = 'initiative-stats'
const ME_KEY = 'me'

/**
 * Who the SERVER says you are. The UI must not assume its own identity — this
 * is what keeps the buttons shown and the actions permitted in agreement.
 */
export function useMe() {
  const persona = usePersonaKey()
  return useQuery({
    queryKey: [ME_KEY, persona],
    queryFn: getMe,
    staleTime: 5 * 60 * 1000,
  })
}

export function useInitiatives(filters?: InitiativeFilters) {
  // Keyed on the persona because "what must I act on" is identity-dependent:
  // without it, switching person replays the previous person's cached board.
  const persona = usePersonaKey()
  return useQuery({
    queryKey: [LIST_KEY, filters ?? {}, persona],
    queryFn: () => getInitiatives(filters),
    placeholderData: (prev) => prev,
  })
}

export function useInitiative(id: string | undefined) {
  return useQuery({
    queryKey: [LIST_KEY, 'detail', id],
    queryFn: () => getInitiative(id!),
    enabled: Boolean(id),
    placeholderData: (prev) => prev,
  })
}

export function useInitiativeStats() {
  return useQuery({
    queryKey: [STATS_KEY],
    queryFn: getInitiativeStats,
    placeholderData: (prev) => prev,
  })
}

/** The viewer context the lifecycle helpers need. */
export function useViewer() {
  const { data: me } = useMe()
  return { memberId: me?.memberId ?? '', role: me?.role ?? 'viewer' } as const
}

/** Initiatives grouped into the PRD §7.1 sections. */
export function useInitiativeBoard(filters?: InitiativeFilters) {
  const query = useInitiatives(filters)
  const viewer = useViewer()
  const initiatives = query.data?.initiatives ?? []

  const bySection: Record<InitiativeSection, Initiative[]> = {
    drafts: [],
    active: [],
    'pending-approval': [],
    'for-review': [],
    closed: [],
    all: initiatives,
  }
  for (const initiative of initiatives) {
    for (const section of sectionsFor(initiative)) bySection[section].push(initiative)
  }

  const drafts = initiatives.filter((i) => i.status === 'draft')
  const approvedNotStarted = initiatives.filter((i) => i.status === 'approved')
  const needsYou = initiatives.filter((i) => nextActionFor(i, viewer).forViewer)

  return {
    ...query,
    initiatives,
    members: query.data?.members ?? [],
    unavailable: query.data?.unavailable ?? false,
    bySection,
    drafts,
    approvedNotStarted,
    needsYou,
    viewer,
  }
}

function useInvalidate() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: [LIST_KEY] })
    void qc.invalidateQueries({ queryKey: [STATS_KEY] })
  }
}

export function useCreateInitiative() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: CreateInitiativeInput) => createInitiative(input),
    onSuccess: (initiative) => {
      invalidate()
      toast.success(
        initiative.status === 'draft'
          ? `Draft saved: ${initiative.name}`
          : `${initiative.name} submitted for approval`,
      )
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateInitiative() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateInitiativeInput }) =>
      updateInitiative(id, input),
    onSuccess: () => {
      invalidate()
      toast.success('Initiative updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

const ACTION_TOAST: Record<InitiativeAction, string> = {
  submit: 'Submitted for approval',
  approve: 'Approved — the owner can now start',
  'request-revision': 'Revision requested',
  reject: 'Initiative rejected',
  withdraw: 'Withdrawn back to draft',
  start: 'Execution started',
  complete: 'Marked complete — results required next',
  'submit-results': 'Results submitted',
  'begin-review': 'Review started',
  'approve-closure': 'Closed',
  'request-results-revision': 'Results sent back',
  reopen: 'Reopened',
  cancel: 'Initiative cancelled',
}

export function useInitiativeAction() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, action, comment }: { id: string; action: InitiativeAction; comment?: string }) =>
      performAction(id, action, { comment }),
    onSuccess: (_data, vars) => {
      invalidate()
      toast.success(ACTION_TOAST[vars.action])
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useProgressUpdate() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProgressUpdateInput }) =>
      postProgressUpdate(id, input),
    onSuccess: () => {
      invalidate()
      toast.success('Progress updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useSubmitResults() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SubmitResultsInput }) =>
      submitResults(id, input),
    onSuccess: () => {
      invalidate()
      toast.success('Results submitted — awaiting reviewer')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useReviewResults() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, approve, reviewNotes }: { id: string; approve: boolean; reviewNotes?: string }) =>
      reviewResults(id, { approve, reviewNotes }),
    onSuccess: (_data, vars) => {
      invalidate()
      toast.success(
        vars.approve
          ? 'Closed — this initiative is now institutional memory'
          : 'Results sent back for revision',
      )
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

/** Initiatives targeting a given KPI — used on the KPI detail page. */
export function useInitiativesForKpi(kpiSlug: string | undefined) {
  return useQuery({
    queryKey: [LIST_KEY, 'by-kpi', kpiSlug],
    queryFn: () => getInitiatives({ kpiSlug: kpiSlug! }),
    enabled: Boolean(kpiSlug),
    placeholderData: (prev) => prev,
  })
}
