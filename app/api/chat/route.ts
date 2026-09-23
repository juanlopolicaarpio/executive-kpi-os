import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from 'ai'
import {
  getAffiliateSummary,
  getNorthstarKpis,
  getNorthstarPerson,
  getTelesalesSummary,
  northstarAlerts,
  NORTHSTAR_AS_OF,
} from '@/lib/northstar/demo-data'
import { MEMBER_HEADER } from '@/lib/permissions/headers'
import type { EvidenceRef } from '@/lib/ai/evidence'

export const runtime = 'nodejs'

const PROMPT_VERSION = 'northstar-demo-2026-08-23-v2'
const MODEL = 'question-routed-demo-coach'

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json()) as { messages?: UIMessage[]; userId?: string }
  const person = getNorthstarPerson(req.headers.get(MEMBER_HEADER))
  const question = lastUserText(body.messages ?? [])
  const answer = buildExecutiveAnswer(question, person.name, person.roleLabel)

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const textId = 'northstar-answer'
      writer.write({ type: 'start', messageId: `msg-${Date.now()}` })
      writer.write({ type: 'text-start', id: textId })
      writer.write({ type: 'text-delta', id: textId, delta: answer })
      writer.write({ type: 'text-end', id: textId })
      writer.write({ type: 'finish', finishReason: 'stop' })
    },
  })

  return createUIMessageStreamResponse({
    stream,
    headers: {
      'x-kpai-prompt-version': PROMPT_VERSION,
      'x-kpai-model': MODEL,
      'x-kpai-confidence': 'high',
    },
  })
}

export async function GET(req: Request): Promise<Response> {
  const person = getNorthstarPerson(req.headers.get(MEMBER_HEADER))
  return Response.json({
    evidence: buildEvidence(),
    confidence: 'high',
    limitations: [
      'This is a synthetic Northstar demo dataset, not actual Northstar performance data.',
      'The coach answers from the loaded executive, affiliate, telesales and partner records for this demo.',
    ],
    promptVersion: PROMPT_VERSION,
    model: MODEL,
    recordCount: buildEvidence().length,
    lastUpdated: NORTHSTAR_AS_OF,
    reportingPeriod: 'August 2026',
    viewer: {
      name: person.name,
      role: person.roleLabel,
    },
  })
}

function buildEvidence(): EvidenceRef[] {
  const kpis = getNorthstarKpis()
  const affiliate = getAffiliateSummary()
  const telesales = getTelesalesSummary()
  return [
    ...kpis.map((kpi) => ({
      id: `KPI:${kpi.slug}`,
      kind: 'kpi' as const,
      label: kpi.name,
      summary: `${kpi.currentValueDisplay} vs target ${kpi.targetDisplay}; ${kpi.status}; owner ${kpi.ownerName}`,
      link: `/kpis/${kpi.appId}`,
      asOf: NORTHSTAR_AS_OF,
    })),
    {
      id: 'DATASET:affiliate_marketing',
      kind: 'rollup' as const,
      label: 'Affiliate Marketing',
      summary: `${affiliate.activeAffiliates} active affiliates; ${peso(affiliate.revenue)} revenue; ${affiliate.approvedConversions} approved conversions; top revenue partner ${affiliate.topByRevenue.affiliateName}.`,
      link: '/api/northstar/affiliates',
      asOf: affiliate.asOf,
    },
    {
      id: 'DATASET:telesales',
      kind: 'rollup' as const,
      label: 'Telesales',
      summary: `${telesales.activeAgents} active agents; ${telesales.calls} calls; ${telesales.approvedApplications} approved applications; top approval agent ${telesales.topByApprovals.agentName}.`,
      link: '/api/northstar/telesales',
      asOf: telesales.asOf,
    },
    ...northstarAlerts.map((alert) => ({
      id: `ALERT:${alert.id}`,
      kind: 'rollup' as const,
      label: `${alert.severity}: ${alert.kpi}`,
      summary: `${alert.insight} Recommended action: ${alert.recommendedAction}`,
      link: null,
      asOf: alert.alertDate,
    })),
  ]
}

function buildExecutiveAnswer(question: string, viewerName: string, roleLabel: string): string {
  const kpis = getNorthstarKpis()
  const bySlug = Object.fromEntries(kpis.map((kpi) => [kpi.slug, kpi]))
  const revenue = bySlug.revenue!
  const forecast = bySlug.revenue_forecast!
  const visits = bySlug.website_visits!
  const approvals = bySlug.approved_applications!
  const approvalRate = bySlug.approval_rate!
  const crossSell = bySlug.cross_sell_rate!
  const broadband = bySlug.broadband_revenue!
  const cpa = bySlug.paid_acquisition_cpa!
  const affiliateRevenue = bySlug.affiliate_revenue!
  const affiliateApprovals = bySlug.affiliate_approved_conversions!
  const telesalesApprovals = bySlug.telesales_approved_applications!
  const telesalesContactRate = bySlug.telesales_contact_rate!
  const telesalesRevenue = bySlug.telesales_revenue!
  const affiliate = getAffiliateSummary()
  const telesales = getTelesalesSummary()

  const intent = question.toLowerCase()
  const wantsAffiliate = /affiliate|creator|influencer|peso|tipid|foodpanda|grab|blog|money tita/.test(intent)
  const wantsTelesales = /telesales|tele sales|agent|call|team alpha|team bravo|team charlie|team delta|ts\d+/.test(intent)
  const wantsPartner = /partner|sla|bank|underwriting|approval rule/.test(intent)
  const wantsLifecycle = /crm|lifecycle|cross|ltv|repeat/.test(intent)
  const wantsForecast = /forecast|plan|month.?end|revenue gap|target/.test(intent)

  if (wantsTelesales) {
    const bestTeam = [...telesales.teamSummary].sort((a, b) => b.approved - a.approved)[0]!
    return [
      `For ${viewerName}, telesales is now loaded as its own demo dataset. The latest rows are dated ${telesales.asOf}; you can inspect them at /api/northstar/telesales.`,
      '',
      '**Telesales readout**',
      `1. ${telesales.activeAgents} agents were active, making ${telesales.calls.toLocaleString()} calls and ${telesales.contacts.toLocaleString()} contacts. Contact rate is ${pct(telesales.contactRate)} versus a ${telesalesContactRate.targetDisplay} target.`,
      `2. The team submitted ${telesales.applicationsSubmitted} applications and produced ${telesales.approvedApplications} approvals. That puts Telesales Approved Applications at ${telesalesApprovals.currentValueDisplay} versus ${telesalesApprovals.targetDisplay}.`,
      `3. Revenue is light on the latest date at ${telesalesRevenue.currentValueDisplay}; ${telesales.topByRevenue.agentName} is the only agent with booked telesales revenue in the latest slice.`,
      '',
      '**Where to look first**',
      `1. ${bestTeam.team}: ${bestTeam.approved} approvals from ${bestTeam.submitted} submissions.`,
      `2. ${telesales.topByContactRate.agentName}: strongest contact rate at ${pct(telesales.topByContactRate.contactRate)}.`,
      `3. ${telesales.topByApprovals.agentName}: highest latest approvals with ${telesales.topByApprovals.approvedApplications}.`,
    ].join('\n')
  }

  if (wantsAffiliate) {
    return [
      `For ${viewerName}, affiliate data is loaded at /api/northstar/affiliates and tied to the Affiliate Revenue and Affiliate Approved Conversions KPIs.`,
      '',
      '**Affiliate readout**',
      `1. Affiliate revenue is ${affiliateRevenue.currentValueDisplay} versus ${affiliateRevenue.targetDisplay}; approved conversions are ${affiliateApprovals.currentValueDisplay} versus ${affiliateApprovals.targetDisplay}.`,
      `2. ${affiliate.topByRevenue.affiliateName} is the top revenue partner at ${peso(affiliate.topByRevenue.revenue)}; ${affiliate.topByApprovals.affiliateName} leads approved conversions with ${affiliate.topByApprovals.approvedConversions}.`,
      `3. The weakest CPA is ${affiliate.weakestEconomics.affiliateName} at ${peso(affiliate.weakestEconomics.cpa)}. The best CPA is ${affiliate.bestCpa.affiliateName} at ${peso(affiliate.bestCpa.cpa)}.`,
      '',
      '**Action**',
      'Move the next test budget toward partners with strong approvals and tolerable CPA, not just the largest reach. Keep Practical Ledger and Budget Buddy under review unless approval quality improves.',
    ].join('\n')
  }

  if (wantsLifecycle) {
    return [
      `For ${viewerName}, the lifecycle story is the strongest part of the August demo: CRM is improving even while the acquisition funnel remains under plan.`,
      '',
      '**Three findings**',
      `1. Cross-sell is at ${crossSell.currentValueDisplay} against a ${crossSell.targetDisplay} target, so lifecycle journeys are creating incremental value.`,
      `2. Customer lifetime value is above target at ${bySlug.customer_ltv!.currentValueDisplay}, confirming better repeat-product economics.`,
      `3. Revenue is still short of plan at ${revenue.currentValueDisplay}; CRM gains are not yet large enough to offset the August acquisition dip.`,
      '',
      '**Recommended actions**',
      '1. Scale the highest-performing lifecycle journeys this week.',
      '2. Retarget recently eligible users into products with faster approval cycles.',
      '3. Use lifecycle lift as a recovery lever, but keep paid traffic recovery as the executive priority.',
    ].join('\n')
  }

  if (wantsPartner) {
    return [
      `For ${viewerName}, partner approval quality is the main operating constraint to watch; it is recovering, but it is still close to the threshold.`,
      '',
      '**Three findings**',
      `1. Approval rate is ${approvalRate.currentValueDisplay} versus a ${approvalRate.targetDisplay} target, after early-August pressure from selected bank partners.`,
      `2. Approved applications are ${approvals.currentValueDisplay} versus ${approvals.targetDisplay}, keeping revenue below plan.`,
      `3. Paid acquisition CPA is ${cpa.currentValueDisplay}; it is inside the threshold now, but it becomes fragile if approval rates soften again.`,
      '',
      '**Recommended actions**',
      '1. Confirm underwriting or eligibility changes with affected bank partners today.',
      '2. Shift incremental paid budget toward campaigns with stronger approval quality.',
      '3. Keep partner SLA and approval-rate monitoring visible in the weekly exec review.',
    ].join('\n')
  }

  if (wantsForecast) {
    return [
      `For ${viewerName}, the forecast is still the main executive gap.`,
      '',
      '**Forecast readout**',
      `1. Revenue forecast is ${forecast.currentValueDisplay} versus PHP 30.0M plan, so the business is still projected materially below plan.`,
      `2. Revenue is ${revenue.currentValueDisplay} versus ${revenue.targetDisplay} on ${NORTHSTAR_AS_OF}.`,
      `3. The recovery is visible in visits and approvals, but it has not closed the month-end gap yet.`,
      '',
      '**Decision path**',
      'Prioritize paid traffic quality, partner approval recovery, and the lifecycle/broadband upside that is already working. Do not scale weak-approval paid volume just to recover sessions.',
    ].join('\n')
  }

  return [
    `For ${viewerName} (${roleLabel}), the August demo needs executive attention because revenue is still below plan even though traffic and approvals are recovering.`,
    '',
    '**Three findings**',
    `1. Revenue is ${revenue.currentValueDisplay} versus a ${revenue.targetDisplay} daily target. The business is still materially below plan.`,
    `2. Month-end revenue forecast is ${forecast.currentValueDisplay} versus a PHP 30.0M plan, so the forecast remains the highest-priority gap.`,
    `3. Website visits are ${visits.currentValueDisplay} and approved applications are ${approvals.currentValueDisplay}; both sit below target and explain the revenue shortfall.`,
    '',
    '**Recommended actions**',
    '1. Review the paid traffic recovery plan and protect spend for the highest-converting sources.',
    '2. Confirm partner approval-rule changes with Pioneer Bank and BPI before increasing volume.',
    '3. Scale the CRM cross-sell journeys and broadband campaign while the core funnel recovers.',
    '',
    '**What is working**',
    `Cross-sell is ${crossSell.currentValueDisplay} and broadband revenue is ${broadband.currentValueDisplay}, so lifecycle and vertical expansion are credible upside stories for the demo.`,
  ].join('\n')
}

function peso(value: number): string {
  return value >= 1_000_000 ? `PHP ${(value / 1_000_000).toFixed(1)}M` : value >= 1000 ? `PHP ${(value / 1000).toFixed(0)}K` : `PHP ${Math.round(value)}`
}

function pct(value: number): string {
  return `${value.toFixed(1)}%`
}

function lastUserText(messages: UIMessage[]): string {
  const last = [...messages].reverse().find((message) => message.role === 'user')
  if (!last) return ''
  return (last.parts ?? [])
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join(' ')
}
