// @ts-nocheck
// Deno Edge Function — not compiled by Next.js TypeScript
// Deploy with: supabase functions deploy telegram-webhook

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req: Request) => {
  // Validate webhook secret
  const secret = req.headers.get('X-Telegram-Bot-Api-Secret-Token')
  if (secret !== Deno.env.get('TELEGRAM_WEBHOOK_SECRET')) {
    return new Response('Forbidden', { status: 403 })
  }

  const body = await req.json()
  const message = body?.message

  if (!message) return new Response('OK')

  const telegramId = message?.from?.id
  const text: string = message?.text ?? ''

  // TODO Phase 2: Implement full bot logic
  // 1. Look up telegram_session by telegram_id
  // 2. If not linked → send linking instructions
  // 3. If session.awaiting_plan_for_kpi_id && text.startsWith('PLAN:') → handlePlanSubmission
  // 4. Otherwise → CHAT MODE: buildCompanyContext, buildSystemPrompt, call Claude, reply

  console.log(`Received message from telegram_id ${telegramId}: ${text}`)

  return new Response('OK')
})
