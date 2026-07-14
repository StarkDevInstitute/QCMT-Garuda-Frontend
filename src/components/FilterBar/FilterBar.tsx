import { useCallback } from 'react'
import type { EventFilter } from '@/stores/eventStore'
import { useEventStore } from '@/stores/eventStore'
import { Button } from '@/components/ui/button'
import { RefreshCw, X } from 'lucide-react'

interface FilterBarProps {
  onRead: () => void
}

const FM_QUALITY_OPTIONS = ['ALL', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export function FilterBar({ onRead }: FilterBarProps) {
  const { filter, setFilter } = useEventStore()

  const handleClear = useCallback(() => {
    setFilter({
      lastDays: 4,
      dateFrom: undefined,
      dateTo: undefined,
      page: 1,
      pageSize: 50,
      methodId: '',
      focalMechanismQuality: 'ALL',
      hideOtherFake: true,
      showOnlyOwn: false,
      showOnlyPreferred: false,
      hideOutside: true,
    })
  }, [setFilter])

  const inputCls = 'h-6 px-1.5 text-[11px] rounded border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-accent'
  const checkLabelCls = 'flex items-center gap-1.5 cursor-pointer text-[11px] text-muted-foreground hover:text-foreground select-none'

  return (
    <div className="border-t border-border bg-card px-3 py-2 shrink-0">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Actions */}
        <Button variant="ghost" size="sm" onClick={handleClear} className="h-6 text-[11px] px-2">
          <X size={11} /> Clear
        </Button>
        <Button variant="ghost" size="sm" onClick={onRead} className="h-6 text-[11px] px-2 text-sky-400 hover:text-sky-300">
          <RefreshCw size={11} /> Refresh
        </Button>

        <div className="h-4 w-px bg-border" />

        {/* Time range */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Last</span>
          <input
            type="number"
            min={1}
            max={365}
            value={filter.lastDays}
            onChange={(e) => setFilter({ lastDays: parseInt(e.target.value) || 4, page: 1 })}
            className={`w-12 ${inputCls}`}
          />
          <span className="text-[11px] text-muted-foreground">days</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">From</span>
          <input
            type="datetime-local"
            className={inputCls}
            onChange={(e) => setFilter({ dateFrom: e.target.value ? new Date(e.target.value) : undefined, page: 1 })}
          />
          <span className="text-[11px] text-muted-foreground">To</span>
          <input
            type="datetime-local"
            className={inputCls}
            onChange={(e) => setFilter({ dateTo: e.target.value ? new Date(e.target.value) : undefined, page: 1 })}
          />
        </div>

        <div className="h-4 w-px bg-border" />

        {/* AutoMT API query */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Page</span>
          <input
            type="number"
            min={1}
            value={filter.page}
            onChange={(e) => setFilter({ page: parseInt(e.target.value, 10) || 1 })}
            className={`w-14 ${inputCls}`}
          />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Size</span>
          <input
            type="number"
            min={1}
            max={500}
            value={filter.pageSize}
            onChange={(e) => setFilter({ pageSize: parseInt(e.target.value, 10) || 50, page: 1 })}
            className={`w-14 ${inputCls}`}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Method</span>
          <input
            type="text"
            value={filter.methodId}
            onChange={(e) => setFilter({ methodId: e.target.value.trim(), page: 1 })}
            className={`w-20 ${inputCls}`}
          />
          <span className="text-[11px] text-muted-foreground">FM Q</span>
          <select
            value={filter.focalMechanismQuality}
            onChange={(e) => setFilter({ focalMechanismQuality: e.target.value, page: 1 })}
            className={`w-16 ${inputCls}`}
          >
            {FM_QUALITY_OPTIONS.map((q) => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </div>

        <div className="h-4 w-px bg-border" />

        {/* Checkboxes */}
        {(
          [
            ['hideOtherFake', 'Hide fake'],
            ['showOnlyOwn', 'Own only'],
            ['showOnlyPreferred', 'Preferred origin'],
            ['hideOutside', 'Hide outside region'],
          ] as [keyof EventFilter, string][]
        ).map(([key, label]) => (
          <label key={key} className={checkLabelCls}>
            <input
              type="checkbox"
              checked={filter[key] as boolean}
              onChange={(e) => setFilter({ [key]: e.target.checked, page: 1 })}
              className="accent-sky-400 w-3 h-3"
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  )
}
