'use client'
import { useState } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useProgressUpdate } from '@/hooks/useInitiatives'
import { cn } from '@/lib/utils'
import type { Initiative } from '@/types/initiative'

interface Props {
  initiative: Initiative
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * A progress update on an active initiative (PRD §7.4).
 *
 * Progress is MANUAL and deliberately never inferred from KPI movement — a KPI
 * moving does not mean the work happened, and conflating them would corrupt
 * both the execution signal and the learning record.
 */
export function ProgressUpdateDialog({ initiative, open, onOpenChange }: Props) {
  const update = useProgressUpdate()
  const [progress, setProgress] = useState(initiative.progressPercent ?? 0)
  const [note, setNote] = useState('')
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockerNote, setBlockerNote] = useState('')

  const canSave =
    note.trim().length > 0 && (!isBlocked || blockerNote.trim().length > 0) && !update.isPending

  const handleSave = async () => {
    if (!canSave) return
    await update.mutateAsync({
      id: initiative.id,
      input: {
        progressPercent: progress,
        note: note.trim(),
        isBlocked,
        blockerNote: isBlocked ? blockerNote.trim() : undefined,
      },
    })
    setNote('')
    setBlockerNote('')
    setIsBlocked(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update progress — {initiative.name}</DialogTitle>
          <DialogDescription>
            Where does execution actually stand? This is judged by you, not inferred from KPI
            movement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="progress-range">
              Progress: <span className="tabular-nums">{progress}%</span>
            </Label>
            <input
              id="progress-range"
              type="range"
              min={0}
              max={100}
              step={5}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="progress-note">Update</Label>
            <Textarea
              id="progress-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What moved since the last update?"
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setIsBlocked((b) => !b)}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg border p-3 text-left text-sm transition-colors',
                isBlocked
                  ? 'border-orange-300 bg-orange-50 text-orange-900'
                  : 'border-slate-200 hover:bg-slate-50',
              )}
            >
              <AlertTriangle
                className={cn('h-4 w-4 shrink-0', isBlocked ? 'text-orange-600' : 'text-slate-400')}
              />
              <span className="font-medium">Flag a blocker or risk</span>
            </button>
            {isBlocked && (
              <Textarea
                value={blockerNote}
                onChange={(e) => setBlockerNote(e.target.value)}
                placeholder="What is blocking this, and what would unblock it?"
                rows={2}
                aria-label="Blocker description"
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={update.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
