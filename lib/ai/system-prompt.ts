import type { CompanyContext } from '@/types/chat'

function kpiList(context: CompanyContext): string {
  if (context.kpis.length === 0) return 'No KPI records are available.'

  return context.kpis.map((kpi) => {
    const history = kpi.recentHistory.length > 0
      ? kpi.recentHistory.map((h) => `${h.date}: ${h.value} vs ${h.target}`).join(', ')
      : 'no history'
    return `- ${kpi.name}: ${kpi.currentValue} vs ${kpi.target}; status ${kpi.status}; owner ${kpi.ownerName}; as of ${kpi.asOf ?? kpi.lastChecked}; history ${history}`
  }).join('\n')
}

function planList(context: CompanyContext): string {
  if (context.openPlans.length === 0) return 'No open recovery plans.'

  return context.openPlans.map((plan) =>
    `- ${plan.kpiName}: ${plan.summary}; owner ${plan.ownerName}; status ${plan.status}; target date ${plan.targetDate}`
  ).join('\n')
}

function peopleList(context: CompanyContext): string {
  if (context.peoplePerformance.length === 0) return 'No people-performance rows.'

  return context.peoplePerformance.map((person) =>
    `- ${person.name} (${person.role}): ${person.onTrack} on track, ${person.offTrack} off track, ${person.noData} unmeasured`
  ).join('\n')
}

function uploadList(context: CompanyContext): string {
  if (context.recentUploads.length === 0) return 'No recent uploads.'

  return context.recentUploads.map((upload) =>
    `- ${upload.kpiName}: ${upload.status}; uploaded ${upload.uploadedAt} by ${upload.uploadedByName}`
  ).join('\n')
}

export function buildSystemPrompt(context: CompanyContext): string {
  const { user, orgSummary, portfolio } = context

  return `You are the AI Coach for Northstar KPI OS, a fictional executive demo for a Philippine fintech marketplace. You act like a senior chief of staff: concise, decision-ready, and grounded only in the supplied data.

Default response order:
1. Executive conclusion in one or two sentences.
2. Three things requiring attention, each with KPI, gap or current value, as-of date, and implication.
3. Three prioritized recommended actions with owner and timing.
4. What is working, only if material.
5. Detailed KPI table or evidence only when the user asks for it.

Do not expose raw record IDs in normal prose. Do not invent data. If evidence is missing, say what is missing.

Current viewer:
- Name: ${user.name}
- Role: ${user.role}
- Owned KPIs: ${user.ownedKpis.length > 0 ? user.ownedKpis.join(', ') : 'none'}

Organization summary:
- Total KPIs: ${orgSummary.totalKpis}
- On track: ${orgSummary.onTrack}
- At risk: ${orgSummary.atRisk}
- Off target: ${orgSummary.missed}
- Last updated: ${orgSummary.lastUpdated}

Initiative portfolio:
- Active initiatives: ${portfolio.activeCount}
- Budget in flight: ${portfolio.budgetInFlight}
- Closed initiative spend: ${portfolio.totalSpendClosed}
- Closed initiative incremental profit: ${portfolio.totalIncrementalProfit}
- Portfolio ROI: ${portfolio.portfolioRoi ?? 'no closed evidence yet'}

KPI data:
${kpiList(context)}

Open plans:
${planList(context)}

People performance:
${peopleList(context)}

Recent uploads:
${uploadList(context)}

Today's date: ${new Date().toISOString().slice(0, 10)}`
}
