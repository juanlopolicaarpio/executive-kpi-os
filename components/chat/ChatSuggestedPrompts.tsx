'use client'
import { ArrowRight } from 'lucide-react'
import { useMe } from '@/hooks/useInitiatives'
import { useSession } from '@/hooks/useSession'
import type { UserRole } from '@/types/user'

type PromptGroup = { label: string; prompts: string[] }

const ROLE_GROUPS: Partial<Record<UserRole, PromptGroup[]>> = {
  ceo: [
    { label: 'Summary', prompts: ['Give me the executive summary for this period'] },
    { label: 'Risks', prompts: ['Which three KPIs need my attention first?'] },
    { label: 'Investment', prompts: ['Which affiliates are worth scaling?'] },
    { label: 'Actions', prompts: ['What decisions should I make today?'] },
  ],
  'econs-manager': [
    { label: 'Summary', prompts: ['Which of my KPIs are off target?'] },
    { label: 'Risks', prompts: ['Which channels are underperforming?'] },
    { label: 'Investment', prompts: ['What spend changes should I review this week?'] },
    { label: 'Actions', prompts: ['What initiatives are awaiting my approval?'] },
  ],
  'category-lead': [
    { label: 'Summary', prompts: ['How is my portfolio performing this period?'] },
    { label: 'Risks', prompts: ['What is putting revenue or approvals at risk?'] },
    { label: 'Investment', prompts: ['Which portfolio initiative has the best evidence?'] },
    { label: 'Actions', prompts: ['What should I propose to move my KPI?'] },
  ],
  'affiliate-officer': [
    { label: 'Summary', prompts: ['How are affiliate partners performing?'] },
    { label: 'Risks', prompts: ['Where is affiliate growth at risk?'] },
    { label: 'Investment', prompts: ['Which affiliate has the best CPA?'] },
    { label: 'Actions', prompts: ['What should my next initiative focus on?'] },
  ],
  'tts-ops': [
    { label: 'Summary', prompts: ['How is telesales performing today?'] },
    { label: 'Risks', prompts: ['Which telesales team needs attention?'] },
    { label: 'Agents', prompts: ['Which agents are driving approvals?'] },
    { label: 'Actions', prompts: ['What should telesales do first?'] },
  ],
  finance: [
    { label: 'Summary', prompts: ['Summarize profitability and spend this period'] },
    { label: 'Risks', prompts: ['Which spend KPIs are materially off target?'] },
    { label: 'Investment', prompts: ['How much budget is committed across active initiatives?'] },
    { label: 'Actions', prompts: ['Which initiatives need finance review?'] },
  ],
}

const DEFAULT_GROUPS: PromptGroup[] = [
  { label: 'Summary', prompts: ['Give me a 30-second KPI summary'] },
  { label: 'Risks', prompts: ['Which KPIs are at risk?'] },
  { label: 'Affiliate', prompts: ['Which affiliates are worth scaling?'] },
  { label: 'Actions', prompts: ['What should I do first?'] },
]

const DB_ROLE_TO_USER_ROLE: Record<string, UserRole> = {
  founder: 'ceo',
  ceo: 'ceo',
  ecomm_lead: 'econs-manager',
  growth_lead: 'econs-manager',
  category_lead: 'category-lead',
  ecomm_officer: 'econs-officer',
  paid_acquisition: 'econs-officer',
  affiliate_officer: 'affiliate-officer',
  affiliate_marketing: 'affiliate-officer',
  tts_ops: 'tts-ops',
  telesales: 'tts-ops',
  shopee_lazada_ops: 'shopee-lazada-ops',
  finance: 'finance',
  brand: 'brand',
  viewer: 'viewer',
}

interface Props {
  onSelect: (prompt: string) => void
}

export function ChatSuggestedPrompts({ onSelect }: Props) {
  const { role } = useSession()
  const { data: me } = useMe()
  const viewerRole = me ? (DB_ROLE_TO_USER_ROLE[me.dbRole] ?? 'viewer') : role
  const groups = ROLE_GROUPS[viewerRole] ?? DEFAULT_GROUPS

  return (
    <div className="mx-auto max-w-4xl px-4 py-3">
      <p className="mb-3 text-xs font-medium text-muted-foreground">Suggested questions</p>
      <div className="grid gap-3 md:grid-cols-2">
        {groups.map((group) => (
          <div key={group.label} className="rounded-md border border-slate-200 bg-white p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {group.label}
            </p>
            <div className="space-y-2">
              {group.prompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => onSelect(prompt)}
                  className="group flex w-full items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-800 transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-950"
                >
                  <span>{prompt}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-700" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
