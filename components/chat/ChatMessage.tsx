'use client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { UIMessage } from 'ai'
import { mockKpis } from '@/lib/mock-data/kpis'
import { KpiMentionCard } from './KpiMentionCard'
import { cn } from '@/lib/utils'

function getMessageText(message: UIMessage): string {
  // In AI SDK v6, messages have parts. Extract text from parts.
  if (message.parts && message.parts.length > 0) {
    return message.parts
      .filter((p): p is Extract<typeof p, { type: 'text' }> => p.type === 'text')
      .map(p => p.text)
      .join('')
  }
  return ''
}

function detectKpiMentions(content: string) {
  return mockKpis.filter(k =>
    content.toLowerCase().includes(k.name.toLowerCase())
  )
}

function cleanAssistantText(content: string): string {
  return content.replace(/\s*\[(KPI|MISS|INIT|CLOSED|ROLLUP):[^\]]+\]/g, '')
}

function exportAnswer(content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'kpai-answer.md'
  a.click()
  URL.revokeObjectURL(url)
}

export function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user'
  const rawContent = getMessageText(message)
  const content = isUser ? rawContent : cleanAssistantText(rawContent)
  const mentionedKpis = isUser ? [] : detectKpiMentions(content)

  if (!content) return null

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start', 'mb-4')}>
      {isUser ? (
        <div className="max-w-[80%] rounded-md bg-slate-900 px-4 py-3 text-sm text-white">
          {content}
        </div>
      ) : (
        <div className="w-full max-w-[960px]">
          <div className="rounded-md border border-border bg-white px-5 py-4 text-sm leading-relaxed shadow-sm">
            <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-2 text-[11px] text-slate-500">
              <button
                onClick={() => void navigator.clipboard?.writeText(content)}
                className="rounded-md px-2 py-1 hover:bg-slate-100 hover:text-slate-900"
              >
                Copy
              </button>
              <button
                onClick={() => exportAnswer(content)}
                className="rounded-md px-2 py-1 hover:bg-slate-100 hover:text-slate-900"
              >
                Export
              </button>
              <span className="ml-auto">Supporting data is below the answer.</span>
            </div>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ children }) => (
                  <details className="my-3 rounded-md border border-slate-200">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-600">
                      View detailed KPI table
                    </summary>
                    <div className="overflow-x-auto p-3">
                    <table className="min-w-full text-xs border-collapse">{children}</table>
                    </div>
                  </details>
                ),
                th: ({ children }) => (
                  <th className="border border-border bg-muted px-2 py-1 text-left font-semibold">{children}</th>
                ),
                td: ({ children }) => (
                  <td className="border border-border px-2 py-1">{children}</td>
                ),
                code: ({ children }) => (
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{children}</code>
                ),
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                ul: ({ children }) => <ul className="my-3 list-disc space-y-1.5 pl-4">{children}</ul>,
                ol: ({ children }) => <ol className="my-3 list-decimal space-y-1.5 pl-4">{children}</ol>,
                p: ({ children }) => <p className="mb-3 max-w-3xl last:mb-0">{children}</p>,
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
          {mentionedKpis.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {mentionedKpis.slice(0, 3).map(kpi => (
                <KpiMentionCard key={kpi.id} kpi={kpi} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
