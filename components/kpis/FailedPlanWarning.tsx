import { AlertTriangle } from 'lucide-react'

interface Props {
  warning: string
}

export function FailedPlanWarning({ warning }: Props) {
  return (
    <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
      <p>{warning}</p>
    </div>
  )
}
