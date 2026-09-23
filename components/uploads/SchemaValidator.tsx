import type { UploadSchema } from '@/types/upload'

interface Props {
  schema: UploadSchema
}

const TYPE_LABELS: Record<string, string> = {
  string: 'Text',
  number: 'Number',
  date: 'Date (YYYY-MM-DD)',
  percentage: 'Decimal (0.0–1.0)',
}

export function SchemaValidator({ schema }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-sm font-semibold">
          Required Columns
          <span className="ml-1.5 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
            {schema.requiredColumns.length} required
          </span>
        </h3>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Column Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Description</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Example</th>
              </tr>
            </thead>
            <tbody>
              {schema.requiredColumns.map(col => (
                <tr key={col.name} className="border-b last:border-0">
                  <td className="px-4 py-2.5">
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono">{col.name}</code>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{TYPE_LABELS[col.type] ?? col.type}</td>
                  <td className="px-4 py-2.5 text-xs">{col.description}</td>
                  <td className="px-4 py-2.5">
                    <code className="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-mono text-blue-700">{col.example}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {schema.optionalColumns.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">
            Optional Columns
            <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {schema.optionalColumns.length} optional
            </span>
          </h3>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Column Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Description</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Example</th>
                </tr>
              </thead>
              <tbody>
                {schema.optionalColumns.map(col => (
                  <tr key={col.name} className="border-b last:border-0">
                    <td className="px-4 py-2.5">
                      <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono">{col.name}</code>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{TYPE_LABELS[col.type] ?? col.type}</td>
                    <td className="px-4 py-2.5 text-xs">{col.description}</td>
                    <td className="px-4 py-2.5">
                      <code className="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-mono text-blue-700">{col.example}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-gray-50 p-3 text-xs text-muted-foreground space-y-1">
        <p><span className="font-medium">Allowed formats:</span> {schema.allowedMimeTypes.join(', ')}</p>
        <p><span className="font-medium">Max file size:</span> {schema.maxFileSizeMb} MB</p>
        {schema.notes && <p><span className="font-medium">Notes:</span> {schema.notes}</p>}
      </div>
    </div>
  )
}
