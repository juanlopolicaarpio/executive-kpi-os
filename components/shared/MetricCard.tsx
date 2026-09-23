import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  title: string
  value: string
  target: string
  trend?: 'up' | 'down' | 'flat'
  status: 'on-track' | 'off-track' | 'no-data'
  onClick?: () => void
}

const STATUS_BORDER: Record<string, string> = {
  'on-track': 'border-l-green-500',
  'off-track': 'border-l-red-500',
  'no-data': 'border-l-slate-400',
}

export function MetricCard({ title, value, target, trend, status, onClick }: Props) {
  return (
    <Card
      className={cn(
        'border-l-[3px] transition-colors hover:bg-slate-50',
        STATUS_BORDER[status],
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">{title}</p>
        <p className="mb-1 text-2xl font-semibold">{value}</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>Target: {target}</span>
          {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500 ml-1" />}
          {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500 ml-1" />}
          {trend === 'flat' && <Minus className="h-3 w-3 text-gray-400 ml-1" />}
        </div>
      </CardContent>
    </Card>
  )
}
