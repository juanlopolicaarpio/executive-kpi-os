'use client'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import type { UploadRecord } from '@/types/upload'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const STATUS_COLOR: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  pending: 'bg-slate-100 text-slate-800',
  processing: 'bg-amber-100 text-amber-800',
  failed: 'bg-red-100 text-red-800',
}

export function UploadHistory({ records }: { records: UploadRecord[] }) {
  const columnHelper = createColumnHelper<UploadRecord>()

  const columns = [
    columnHelper.accessor('kpiName', {
      header: 'KPI',
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor('uploadedByName', { header: 'Uploaded By' }),
    columnHelper.accessor('uploadedAt', {
      header: 'Date',
      cell: (info) => format(new Date(info.getValue()), 'MMM d, HH:mm'),
    }),
    columnHelper.accessor('fileName', { header: 'File' }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => (
        <Badge className={`${STATUS_COLOR[info.getValue()] ?? ''} text-xs`}>
          {info.getValue()}
        </Badge>
      ),
    }),
    columnHelper.accessor('rowsProcessed', {
      header: 'Rows',
      cell: (info) => info.getValue() ?? '—',
    }),
  ]

  // TanStack Table returns callable accessors by design; React Compiler safely
  // leaves this component unmemoized.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => (
                <TableHead key={h.id}>
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
