import type { ChatMessage } from '@/types/chat'

export const mockChatHistory: ChatMessage[] = [
  {
    id: 'msg-ns-ceo-001',
    userId: 'user-ceo',
    role: 'user',
    content: 'What needs attention in August?',
    source: 'web',
    createdAt: '2026-08-23T08:00:00Z',
    metadata: {},
  },
  {
    id: 'msg-ns-ceo-002',
    userId: 'user-ceo',
    role: 'assistant',
    content: [
      'Revenue remains below plan even though traffic and approvals are recovering.',
      '',
      '**Three findings**',
      '1. Revenue forecast remains below the PHP 30.0M monthly plan.',
      '2. Website visits and approved applications are still below target.',
      '3. Partner approval quality is the constraint to watch before adding more paid volume.',
      '',
      '**Recommended actions**',
      '1. Protect spend for the highest-converting paid search sources.',
      '2. Confirm bank partner rule changes before scaling volume.',
      '3. Scale CRM cross-sell and broadband campaigns while the core funnel recovers.',
    ].join('\n'),
    source: 'web',
    createdAt: '2026-08-23T08:00:08Z',
    metadata: {
      kpiReferences: ['kpi-ns-revenue-forecast', 'kpi-ns-website-visits', 'kpi-ns-approval-rate'],
      planReferences: ['plan-northstar-traffic-recovery'],
      tokensUsed: 210,
    },
  },
]
