import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

export const runtime = 'nodejs'

// Polishes a deterministic institutional-memory match (computed client-side by
// lib/loop/memory.ts) into a concise, owner-facing recovery suggestion. The
// substance — which playbook, which past learnings, what failed before — is
// already decided; Claude only turns it into tailored prose. If the model is
// unavailable we fall back to the deterministic rationale so the loop never
// blocks on the LLM.

interface SuggestBody {
  kpi: { name: string; target: string; currentValueDisplay: string; strategicPurpose?: string }
  match: {
    rationale: string
    warning?: string
    playbookName?: string
    successRatePct?: number
    learnings?: { title: string; outcome: string }[]
    draftActions?: string[]
  }
}

export async function POST(req: Request): Promise<Response> {
  let body: SuggestBody
  try {
    body = (await req.json()) as SuggestBody
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { kpi, match } = body
  const fallback = match?.rationale ?? 'Propose a recovery plan grounded in the latest data.'

  const memoryBlock = [
    match.playbookName
      ? `Best-matching playbook: "${match.playbookName}"${
          match.successRatePct != null ? ` (${match.successRatePct}% historical success)` : ''
        }.`
      : 'No close playbook match.',
    match.learnings?.length
      ? `Past learnings:\n${match.learnings.map((l) => `- ${l.title} -> ${l.outcome}`).join('\n')}`
      : '',
    match.warning ? `Prior failure to avoid: ${match.warning}` : '',
    match.draftActions?.length ? `Candidate actions:\n${match.draftActions.map((a) => `- ${a}`).join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const result = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      maxOutputTokens: 400,
      system:
        'You are the KPAI accountability copilot for an e-commerce nutrition brand. ' +
        'Using only the institutional memory provided, write a concise recovery suggestion (3-5 sentences) ' +
        'for the KPI owner. Lead with the recommended approach and why it has worked before, reference the ' +
        'specific past learning, and if a prior failure is noted, explicitly tell them not to repeat it. ' +
        'Be direct and practical. Do not invent facts beyond the memory given.',
      prompt:
        `KPI missing target: ${kpi.name}. Currently ${kpi.currentValueDisplay} against target ${kpi.target}.` +
        (kpi.strategicPurpose ? ` Why it matters: ${kpi.strategicPurpose}.` : '') +
        `\n\nInstitutional memory:\n${memoryBlock}`,
    })
    const suggestion = result.text?.trim() || fallback
    return Response.json({ suggestion, warning: match.warning ?? null })
  } catch {
    // LLM unavailable (e.g. no API key in mock dev) — return the grounded match.
    return Response.json({ suggestion: fallback, warning: match.warning ?? null, fallback: true })
  }
}
