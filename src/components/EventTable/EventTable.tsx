import { useCallback, useState } from 'react'
import type { EventSummary } from '@/types/seismology'
import { useEventStore } from '@/stores/eventStore'
import { EventStatusBadge } from './EventStatusBadge'
import { formatUTC, formatLat, formatLon, cn } from '@/lib/utils'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

interface EventTableProps {
  events: EventSummary[]
  onSelect?: (id: string) => void
}

type SortKey = keyof Pick<EventSummary, 'time' | 'magnitude' | 'depth' | 'usedPhases' | 'agency' | 'region'>

function SortIcon({ column, current, dir }: { column: SortKey; current: string; dir: 'asc' | 'desc' }) {
  if (column !== current) return <ChevronsUpDown size={11} className="opacity-30" />
  return dir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />
}

export function EventTable({ events, onSelect }: EventTableProps) {
  const { selectedEventId, setSelectedEvent, sortColumn, sortDirection, setSorting } =
    useEventStore()

  const [hovered, setHovered] = useState<string | null>(null)

  const handleSort = useCallback(
    (col: SortKey) => {
      if (sortColumn === col) {
        setSorting(col, sortDirection === 'asc' ? 'desc' : 'asc')
      } else {
        setSorting(col, 'desc')
      }
    },
    [sortColumn, sortDirection, setSorting]
  )

  const sorted = [...events].sort((a, b) => {
    const dir = sortDirection === 'asc' ? 1 : -1
    const col = sortColumn as SortKey
    if (col === 'time') return dir * (a.time.getTime() - b.time.getTime())
    if (col === 'magnitude') return dir * (a.magnitude - b.magnitude)
    if (col === 'depth') return dir * (a.depth - b.depth)
    if (col === 'usedPhases') return dir * (a.usedPhases - b.usedPhases)
    if (col === 'agency') return dir * a.agency.localeCompare(b.agency)
    if (col === 'region') return dir * a.region.localeCompare(b.region)
    return 0
  })

  const headerCls = 'px-2 py-1.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground whitespace-nowrap'

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-xs border-collapse">
        <thead className="sticky top-0 bg-card z-10">
          <tr className="border-b-2 border-border">
            <th className={headerCls} onClick={() => handleSort('time')}>
              <span className="flex items-center gap-1">OT (GMT) <SortIcon column="time" current={sortColumn} dir={sortDirection} /></span>
            </th>
            <th className={headerCls} onClick={() => handleSort('magnitude')}>
              <span className="flex items-center gap-1">M <SortIcon column="magnitude" current={sortColumn} dir={sortDirection} /></span>
            </th>
            <th className={cn(headerCls, 'hidden sm:table-cell')}>TP</th>
            <th className={cn(headerCls, 'hidden md:table-cell')} onClick={() => handleSort('usedPhases')}>
              <span className="flex items-center gap-1">Phases <SortIcon column="usedPhases" current={sortColumn} dir={sortDirection} /></span>
            </th>
            <th className={cn(headerCls, 'hidden md:table-cell')}>Lat</th>
            <th className={cn(headerCls, 'hidden md:table-cell')}>Lon</th>
            <th className={cn(headerCls, 'hidden sm:table-cell')} onClick={() => handleSort('depth')}>
              <span className="flex items-center gap-1">Depth <SortIcon column="depth" current={sortColumn} dir={sortDirection} /></span>
            </th>
            <th className={headerCls}>Stat</th>
            <th className={cn(headerCls, 'hidden lg:table-cell')} onClick={() => handleSort('agency')}>
              <span className="flex items-center gap-1">Agency <SortIcon column="agency" current={sortColumn} dir={sortDirection} /></span>
            </th>
            <th className={cn(headerCls, 'hidden lg:table-cell')} onClick={() => handleSort('region')}>
              <span className="flex items-center gap-1">Region <SortIcon column="region" current={sortColumn} dir={sortDirection} /></span>
            </th>
            <th className={cn(headerCls, 'hidden xl:table-cell')}>ID</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((ev) => {
            const isSelected = ev.id === selectedEventId
            const isHovered = ev.id === hovered
            return (
              <tr
                key={ev.id}
                onClick={() => { setSelectedEvent(ev.id); onSelect?.(ev.id) }}
                onMouseEnter={() => setHovered(ev.id)}
                onMouseLeave={() => setHovered(null)}
                className={cn(
                  'cursor-pointer border-b border-border/40 transition-colors group',
                  isSelected
                    ? 'bg-sky-500/10 text-foreground border-l-2 border-l-sky-400'
                    : isHovered
                    ? 'bg-muted/40'
                    : ''
                )}
              >
                <td className="px-2 py-1.5 font-mono whitespace-nowrap">{formatUTC(ev.time)}</td>
                <td className="px-2 py-1.5 font-mono font-bold text-foreground">{ev.magnitude.toFixed(1)}</td>
                <td className="px-2 py-1.5 hidden sm:table-cell text-muted-foreground">{ev.magnitudeType}</td>
                <td className="px-2 py-1.5 font-mono hidden md:table-cell">{ev.usedPhases}</td>
                <td className="px-2 py-1.5 font-mono hidden md:table-cell">{formatLat(ev.latitude)}</td>
                <td className="px-2 py-1.5 font-mono hidden md:table-cell">{formatLon(ev.longitude)}</td>
                <td className="px-2 py-1.5 font-mono hidden sm:table-cell">{ev.depth.toFixed(2)} km</td>
                <td className="px-2 py-1.5">
                  <EventStatusBadge evaluationMode={ev.evaluationMode} evaluationStatus={ev.evaluationStatus} />
                </td>
                <td className="px-2 py-1.5 hidden lg:table-cell text-muted-foreground">{ev.agency}</td>
                <td className="px-2 py-1.5 hidden lg:table-cell max-w-xs truncate" title={ev.region}>{ev.region}</td>
                <td className="px-2 py-1.5 font-mono text-muted-foreground text-[10px] hidden xl:table-cell">{ev.id}</td>
              </tr>
            )
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">
                No events found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
