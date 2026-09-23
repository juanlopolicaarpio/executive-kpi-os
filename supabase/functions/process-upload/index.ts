// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req: Request) => {
  // TODO Phase 1: Upload Processor
  // 1. Get upload_record_id from request body
  // 2. Download file from Supabase Storage using signed URL
  // 3. Parse CSV/Excel based on KPI upload schema
  // 4. Validate each row (required columns, types, ranges)
  // 5. Insert valid rows into kpi_values
  // 6. Update upload_record status and row counts
  // 7. Trigger kpi-checker to re-evaluate KPI status
  const body = await req.json()
  console.log('[process-upload] Processing:', body)
  return new Response(
    JSON.stringify({ status: 'ok', uploadId: body.uploadId }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
