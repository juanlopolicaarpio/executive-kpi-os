'use client'
import { format } from 'date-fns'
import {
  AlertTriangle,
  FileText,
  CheckCircle,
  XCircle,
  MessageCircle,
  AlertOctagon,
  CheckCircle2,
  Activity,
} from 'lucide-react'
import type { AccountabilityEvent, AccountabilityEventType } from '@/types/accountability'

interface Props {
  events: AccountabilityEvent[]
}

interface EventConfig {
  icon: React.ReactNode
  dotClass: string
  labelClass: string
}

function getEventConfig(type: AccountabilityEventType): EventConfig {
  switch (type) {
    case 'miss':
      return {
        icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
        dotClass: 'bg-red-500',
        labelClass: 'text-red-700',
      }
    case 'plan-submitted':
      return {
        icon: <FileText className="h-4 w-4 text-blue-600" />,
        dotClass: 'bg-blue-500',
        labelClass: 'text-blue-700',
      }
    case 'plan-approved':
      return {
        icon: <CheckCircle className="h-4 w-4 text-green-600" />,
        dotClass: 'bg-green-500',
        labelClass: 'text-green-700',
      }
    case 'plan-rejected':
      return {
        icon: <XCircle className="h-4 w-4 text-red-600" />,
        dotClass: 'bg-red-500',
        labelClass: 'text-red-700',
      }
    case 'telegram-response':
      return {
        icon: <MessageCircle className="h-4 w-4 text-purple-600" />,
        dotClass: 'bg-purple-500',
        labelClass: 'text-purple-700',
      }
    case 'escalation':
      return {
        icon: <AlertOctagon className="h-4 w-4 text-orange-600" />,
        dotClass: 'bg-orange-500',
        labelClass: 'text-orange-700',
      }
    case 'resolved':
      return {
        icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
        dotClass: 'bg-green-500',
        labelClass: 'text-green-700',
      }
    case 'check-in':
      return {
        icon: <Activity className="h-4 w-4 text-gray-600" />,
        dotClass: 'bg-gray-400',
        labelClass: 'text-gray-600',
      }
    default:
      return {
        icon: <Activity className="h-4 w-4 text-gray-600" />,
        dotClass: 'bg-gray-400',
        labelClass: 'text-gray-600',
      }
  }
}

const EVENT_LABELS: Record<AccountabilityEventType, string> = {
  'miss': 'Target Missed',
  'check-in': 'Check-in',
  'plan-submitted': 'Plan Submitted',
  'plan-approved': 'Plan Approved',
  'plan-rejected': 'Plan Rejected',
  'escalation': 'Escalation',
  'resolved': 'Resolved',
  'telegram-response': 'Telegram Response',
}

export function AccountabilityThread({ events }: Props) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No accountability events yet.</p>
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-3.5 top-4 bottom-4 w-px bg-gray-200" />
      <div className="space-y-4">
        {events.map(event => {
          const config = getEventConfig(event.type)
          return (
            <div key={event.id} className="relative flex items-start gap-4 pl-0">
              {/* Dot */}
              <div className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-white bg-white shadow-sm`}>
                <span className={`absolute h-3 w-3 rounded-full ${config.dotClass}`} />
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0 pb-2">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className={`text-xs font-semibold uppercase tracking-wide ${config.labelClass}`}>
                    {EVENT_LABELS[event.type]}
                  </span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(event.triggeredAt), 'MMM d, yyyy · h:mm a')}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {event.source}
                  </span>
                </div>
                <p className="text-xs font-medium text-gray-700 mb-0.5">{event.actorName}</p>
                <p className="text-sm text-gray-800">{event.message}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
