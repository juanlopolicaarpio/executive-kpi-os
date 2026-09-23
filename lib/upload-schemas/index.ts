import type { UploadSchema } from '@/types/upload'

const excelMime = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']

export const uploadSchemas: Record<string, UploadSchema> = {
  'northstar-demo-upload': {
    kpiId: 'northstar-demo',
    kpiName: 'Northstar Demo Workbook',
    requiredColumns: [
      { name: 'date', type: 'date', description: 'Record date', example: '2026-08-23' },
      { name: 'revenue_php', type: 'number', description: 'Revenue in PHP', example: '340013' },
      { name: 'gross_profit_php', type: 'number', description: 'Gross profit in PHP', example: '154085' },
      { name: 'website_visits', type: 'number', description: 'Website visits', example: '15609' },
      { name: 'approved_applications', type: 'number', description: 'Approved applications', example: '152' },
    ],
    optionalColumns: [
      { name: 'approval_rate', type: 'percentage', description: 'Approved applications divided by submitted applications', example: '0.364' },
      { name: 'cross_sell_rate', type: 'percentage', description: 'Share of users adopting a second product', example: '0.108' },
      { name: 'customer_ltv_php', type: 'number', description: 'Estimated customer lifetime value', example: '2634' },
    ],
    allowedMimeTypes: excelMime,
    maxFileSizeMb: 10,
    notes: 'Synthetic Northstar demo upload schema covering Executive_Daily, Revenue_Mix, Vertical_Expansion, Partner_Health and Executive_Alerts sheets.',
  },
}

export function getUploadSchema(schemaId: string): UploadSchema | null {
  return uploadSchemas[schemaId] ?? uploadSchemas['northstar-demo-upload'] ?? null
}
