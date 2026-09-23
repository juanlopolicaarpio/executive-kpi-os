import type { UserRole } from './user'

export type PlanStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'in-progress'
  | 'resolved'
  | 'failed'

export type AccountabilityEventType =
  | 'miss'
  | 'check-in'
  | 'plan-submitted'
  | 'plan-approved'
  | 'plan-rejected'
  | 'escalation'
  | 'resolved'
  | 'telegram-response'

export interface PlanAction {
  id: string
  description: string
  dueDate: string
  completed: boolean
}

export interface AccountabilityEvent {
  id: string
  kpiId: string
  triggeredAt: string
  type: AccountabilityEventType
  actorId: string
  actorName: string
  actorRole: UserRole
  message: string
  source: 'dashboard' | 'telegram' | 'system'
  metadata?: Record<string, unknown>
}

export interface RecoveryPlan {
  id: string
  kpiId: string
  ownerId: string
  ownerName: string
  createdAt: string
  updatedAt: string
  status: PlanStatus
  approvedById?: string
  approvedAt?: string
  rejectionReason?: string
  summary: string
  rootCause: string
  actions: PlanAction[]
  targetDate: string
  confidenceLevel: 'low' | 'medium' | 'high'
  outcome?: 'resolved' | 'failed'
  failureReason?: string
  previousPlanIds: string[]
  source: 'dashboard' | 'telegram'
  aiSuggestion?: string
  aiWarning?: string
  /** Whether the owner adopted the AI suggestion or wrote their own plan. */
  planSource?: 'ai-suggestion' | 'own'
  /** Institutional-memory provenance — what this plan was based on. */
  sourcePlaybookId?: string
  sourceLearningIds?: string[]
}
