import { useCallback } from 'react'
import { useEventStore } from '@/stores/eventStore'
import type { EventFilter } from '@/stores/eventStore'
import { createDefaultEventFilter } from '@/stores/eventStore'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, RefreshCw, X } from 'lucide-react'

interface FilterBarProps {
  onRead: (override?: Partial<EventFilter>) => void
}

export function FilterBar({ onRead }: FilterBarProps) {
  const { filter, setFilter } = useEventStore()

  const methodPresets = ['', 'a', 'm', 'w']
  const qualityPresets = ['', 'a1', 'a2', 'b1', 'b2', 'c1']

  const toDateTimeUtcValue = (value?: Date): string => {
    if (!value) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    const y = value.getUTCFullYear()
    const m = pad(value.getUTCMonth() + 1)
    const d = pad(value.getUTCDate())
    const hh = pad(value.getUTCHours())
    const mm = pad(value.getUTCMinutes())
    return `${y}-${m}-${d}T${hh}:${mm}`
  }

  const fromDateTimeUtcValue = (value: string): Date | undefined => {
    if (!value) return undefined
    const [datePart, timePart] = value.split('T')
    if (!datePart || !timePart) return undefined

    const [y, m, d] = datePart.split('-').map((v) => parseInt(v, 10))
    const [hh, mm] = timePart.split(':').map((v) => parseInt(v, 10))

    if ([y, m, d, hh, mm].some((v) => Number.isNaN(v))) return undefined
    return new Date(Date.UTC(y, m - 1, d, hh, mm, 0, 0))
  }

  const handleClear = useCallback(() => {
    setFilter(createDefaultEventFilter())
  }, [setFilter])

  const inputCls = 'h-8 px-2 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-accent'
  const labelCls = 'text-[10px] font-medium tracking-wide uppercase text-muted-foreground'

  return (
    <div className="border-t border-border bg-card/95 px-3 py-2.5 shrink-0">
      <div className="grid grid-cols-1 lg:grid-cols-[200px_200px_150px_150px_100px_100px_auto_auto] gap-2 items-end">
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Start Time (UTC)</label>
          <input
            type="datetime-local"
            value={toDateTimeUtcValue(filter.dateFrom)}
            className={`${inputCls} w-full max-w-[190px]`}
            onChange={(e) => setFilter({ page: 1, dateFrom: fromDateTimeUtcValue(e.target.value) })}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelCls}>End Time (UTC)</label>
          <input
            type="datetime-local"
            value={toDateTimeUtcValue(filter.dateTo)}
            className={`${inputCls} w-full max-w-[190px]`}
            onChange={(e) => setFilter({ page: 1, dateTo: fromDateTimeUtcValue(e.target.value) })}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelCls}>Method ID</label>
          <select
            value={filter.methodId}
            className={inputCls}
            onChange={(e) => setFilter({ page: 1, methodId: e.target.value })}
          >
            {methodPresets.map((value) => (
              <option key={value || 'all'} value={value}>
                {value ? value.toUpperCase() : 'All Methods'}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelCls}>FM Quality</label>
          <select
            value={filter.focalMechanismQuality}
            className={inputCls}
            onChange={(e) => setFilter({ page: 1, focalMechanismQuality: e.target.value })}
          >
            {qualityPresets.map((value) => (
              <option key={value || 'all'} value={value}>
                {value ? value.toUpperCase() : 'All Quality'}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelCls}>Page</label>
          <input
            type="number"
            min={1}
            value={filter.page}
            className={inputCls}
            onChange={(e) => setFilter({ page: Math.max(1, parseInt(e.target.value, 10) || 1) })}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelCls}>Page Size</label>
          <select
            value={String(filter.pageSize)}
            className={inputCls}
            onChange={(e) => setFilter({ page: 1, pageSize: Math.max(1, parseInt(e.target.value, 10) || 20) })}
          >
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="default" size="sm" onClick={() => onRead()} className="h-8 px-3 text-xs">
            <RefreshCw size={12} /> Apply
          </Button>
          <Button variant="outline" size="sm" onClick={handleClear} className="h-8 px-3 text-xs">
            <X size={12} /> Reset
          </Button>
        </div>

        <div className="flex items-center justify-end gap-2 lg:ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const nextPage = Math.max(1, filter.page - 1)
              setFilter({ page: nextPage })
              onRead({ page: nextPage })
            }}
            className="h-8 px-2 text-xs"
            disabled={filter.page <= 1}
          >
            <ChevronLeft size={12} /> Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const nextPage = filter.page + 1
              setFilter({ page: nextPage })
              onRead({ page: nextPage })
            }}
            className="h-8 px-2 text-xs"
          >
            Next <ChevronRight size={12} />
          </Button>
        </div>
      </div>
    </div>
  )
}
