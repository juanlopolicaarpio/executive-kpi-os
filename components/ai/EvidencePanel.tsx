'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  Database,
  ChevronDown,
  Target,
  Rocket,
  Archive,
  BarChart3,
  AlertOctagon,
  ShieldQuestion,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EvidenceRef } from '@/lib/ai/evidence'

// PRD §9.5: "Users can inspect and correct the evidence set."
//
// This is what turns the prompt's citation instruction into something a
// skeptical reader can actually check. Every record the assistant was given is
// listed, with a link to the source screen where one exists.

const KIND_ICON: Record<EvidenceRef['kind'], React.ElementType> = {
  kpi: Target,
  initiative: Rocket,
  'closed-initiative': Archive,
  rollup: BarChart3,
  miss: AlertOctagon,
}

const CONFIDENCE_STYLE: Record<string, string> = {
  high: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  medium: 'bg-amber-50 text-amber-800 ring-amber-200',
  low: 'bg-slate-100 text-slate-600 ring-slate-200',
}

export function ConfidenceBadge({
  band,
  reason,
  className,
}: {
  band: 'high' | 'medium' | 'low'
  reason?: string
  className?: string
}) {
  return (
    <span
      title={reason}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1',
        CONFIDENCE_STYLE[band] ?? CONFIDENCE_STYLE['low'],
        className,
      )}
    >
      <ShieldQuestion className="h-3 w-3" aria-hidden />
      {band[0]!.toUpperCase() + band.slice(1)} confidence
    </span>
  )
}

export function EvidencePanel({
  evidence,
  limitations,
  confidence,
  confidenceReason,
  model,
  promptVersion,
  defaultOpen = false,
}: {
  evidence: EvidenceRef[]
  limitations?: string[]
  confidence?: 'high' | 'medium' | 'low'
  confidenceReason?: string
  model?: string
  promptVersion?: string
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <Database className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
        <span className="text-sm font-medium text-slate-800">
          Evidence in scope
          <span className="ml-1.5 font-normal text-slate-400">{evidence.length} records</span>
        </span>
        {confidence && <ConfidenceBadge band={confidence} reason={confidenceReason} />}
        <ChevronDown
          className={cn('ml-auto h-4 w-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open && (
        <div className="border-t border-slate-100 px-3 py-3">
          {limitations && limitations.length > 0 && (
            <div className="mb-3 rounded-lg bg-amber-50 p-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                Limitations
              </p>
              <ul className="mt-1 space-y-0.5">
                {limitations.map((l) => (
                  <li key={l} className="text-xs leading-snug text-amber-900">
                    · {l}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {evidence.length === 0 ? (
            <p className="text-xs text-slate-500">
              No internal records were in scope. Treat any claim about the organization as
              unsupported.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {evidence.map((e) => {
                const Icon = KIND_ICON[e.kind]
                const body = (
                  <>
                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-xs font-medium text-slate-800">
                        {e.label}
                        <code className="ml-1.5 rounded bg-slate-100 px-1 py-0.5 text-[10px] font-normal text-slate-500">
                          {e.id}
                        </code>
                      </span>
                      <span className="block text-[11px] leading-snug text-slate-500">{e.summary}</span>
                    </span>
                  </>
                )
                return (
                  <li key={e.id}>
                    {e.link ? (
                      <Link
                        href={e.link}
                        className="flex gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                      >
                        {body}
                      </Link>
                    ) : (
                      <span className="flex gap-2 px-2 py-1.5">{body}</span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          {(model || promptVersion) && (
            <p className="mt-3 border-t border-slate-100 pt-2 text-[10px] text-slate-400">
              {model && <>Model {model}</>}
              {model && promptVersion && ' · '}
              {promptVersion && <>Prompt {promptVersion}</>}
              {' · logged for reproducibility'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
