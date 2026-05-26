import { MapPin } from 'lucide-react'
import type { SeismicEvent } from '@/types/seismology'
import { formatUTC, formatLat, formatLon, formatDepth, cn } from '@/lib/utils'

interface TensorPanelProps {
  event: SeismicEvent | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format scalar moment as "3.56E+20 Nm" */
function fmtMoment(Nm: number): string {
  if (!Nm) return '—'
  const exp = Math.floor(Math.log10(Math.abs(Nm)))
  const man = Nm / Math.pow(10, exp)
  return `${man.toFixed(2)}E+${exp} Nm`
}

function OriginRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-1 py-[2px]">
      <span className="text-[10px] text-muted-foreground shrink-0 w-[72px]">{label}:</span>
      <span className={cn('text-[10px] text-foreground/90 min-w-0 truncate', mono && 'font-mono')}>{value ?? '—'}</span>
    </div>
  )
}

function TensorRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-1 py-[2px]">
      <span className="text-[10px] text-muted-foreground shrink-0 w-[80px]">{label}:</span>
      <span className="text-[10px] font-mono text-foreground/90 min-w-0 truncate">{value ?? '—'}</span>
    </div>
  )
}

function EvalRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-1 py-[2px]">
      <span className="text-[10px] text-muted-foreground shrink-0 w-[58px]">{label}:</span>
      <span className={cn('text-[10px] text-foreground/90 min-w-0 truncate', mono && 'font-mono')}>{value ?? '—'}</span>
    </div>
  )
}

// ─── TensorPanel ──────────────────────────────────────────────────────────────

export function TensorPanel({ event }: TensorPanelProps) {
  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground select-none">
        <MapPin size={28} className="opacity-30" />
        <div className="text-center">
          <p className="text-sm font-medium">No event selected</p>
          <p className="text-[11px] mt-1 opacity-60">Click a marker on the map or select from Events</p>
        </div>
      </div>
    )
  }

  const origin = event.origins.find(o => o.id === event.preferredOriginId) ?? event.origins[0]
  const mag = event.magnitudes.find(m => m.id === event.preferredMagnitudeId) ?? event.magnitudes[0]
  const fm = event.focalMechanisms.find(f => f.id === event.preferredFocalMechanismId) ?? event.focalMechanisms[0]
  const np1 = fm?.nodalPlanes?.nodalPlane1
  const np2 = fm?.nodalPlanes?.nodalPlane2
  const mt = fm?.momentTensor
  const pa = fm?.principalAxes

  const depthLabel = origin?.depth
    ? `${formatDepth(origin.depth.value)}${origin.depthType === 'operator assigned' ? ' fixed' : ''}`
    : '—'

  const stationsLabel = origin?.quality?.usedStationCount != null
    ? `${origin.quality.usedStationCount} / ${origin.quality.associatedStationCount ?? '?'}`
    : '—'

  const dcClvdIso = [
    mt?.doubleCouple != null ? (mt.doubleCouple * 100).toFixed(1) : null,
    mt?.clvd != null ? (mt.clvd * 100).toFixed(1) : null,
    mt?.iso != null ? (mt.iso * 100).toFixed(1) : null,
  ].map(v => v ?? '-').join(' / ') + '%'

  return (
    <div className="flex flex-col text-xs">

      {/* ── Region header ── */}
      <div className="px-3 py-1.5 border-b border-border bg-card/50 shrink-0">
        <p className="text-[13px] font-semibold text-foreground leading-snug">
          {origin?.region ?? 'Unknown region'}
        </p>
      </div>

      {/* ── Two-column: origin params | nodal planes ── */}
      <div className="grid grid-cols-2 divide-x divide-border border-b border-border">

        {/* Left: origin params */}
        <div className="px-3 py-2">
          <OriginRow label="Type" value={origin?.evaluationStatus ?? 'hypocenter'} />
          <OriginRow label="Time" value={origin ? formatUTC(origin.time.value) : null} mono />
          <OriginRow label="Depth" value={depthLabel} mono />
          <OriginRow label="Lat" value={origin ? formatLat(origin.latitude.value) : null} mono />
          <OriginRow label="Lon" value={origin ? formatLon(origin.longitude.value) : null} mono />
          <OriginRow label="Stations" value={stationsLabel} mono />
          <OriginRow
            label="Az. Gap"
            value={origin?.quality?.azimuthalGap != null ? `${origin.quality.azimuthalGap.toFixed(0)}°` : null}
            mono
          />
          <OriginRow
            label="Min. Dist"
            value={origin?.quality?.minimumDistance != null ? `${origin.quality.minimumDistance.toFixed(1)} km` : null}
            mono
          />
        </div>

        {/* Right: nodal planes / stress axis table */}
        <div className="px-2 py-2">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">
            Nodal planes / stress axis
          </p>
          <table className="w-full text-[10px]">
            <thead>
              <tr>
                <th className="text-left text-muted-foreground font-normal pb-0.5 w-7"></th>
                <th className="text-right text-muted-foreground font-normal pb-0.5 pr-1">
                  <span className="block text-[9px]">Strike</span>
                  <span className="block text-[8px] opacity-60">(deg)</span>
                </th>
                <th className="text-right text-muted-foreground font-normal pb-0.5 pr-1">
                  <span className="block text-[9px]">Dip</span>
                  <span className="block text-[8px] opacity-60">(deg)</span>
                </th>
                <th className="text-right text-muted-foreground font-normal pb-0.5">
                  <span className="block text-[9px]">Rake</span>
                  <span className="block text-[8px] opacity-60">(deg)</span>
                </th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <tr className="border-t border-border/40">
                <td className="text-muted-foreground pr-1 py-[3px]">NP1</td>
                <td className="text-right pr-1 py-[3px]">{np1 ? np1.strike.value.toFixed(0) : '—'}</td>
                <td className="text-right pr-1 py-[3px]">{np1 ? np1.dip.value.toFixed(0) : '—'}</td>
                <td className="text-right py-[3px]">{np1 ? np1.rake.value.toFixed(0) : '—'}</td>
              </tr>
              <tr className="border-t border-border/40">
                <td className="text-muted-foreground pr-1 py-[3px]">NP2</td>
                <td className="text-right pr-1 py-[3px]">{np2 ? np2.strike.value.toFixed(0) : '—'}</td>
                <td className="text-right pr-1 py-[3px]">{np2 ? np2.dip.value.toFixed(0) : '—'}</td>
                <td className="text-right py-[3px]">{np2 ? np2.rake.value.toFixed(0) : '—'}</td>
              </tr>
              {/* Principal stress axes T / N / P */}
              {pa && (
                <>
                  <tr className="border-t border-border/60">
                    <td className="text-muted-foreground pr-1 py-[3px]">T</td>
                    <td className="text-right pr-1 py-[3px]">{pa.tAxis.length.value.toFixed(2)}</td>
                    <td className="text-right pr-1 py-[3px]">{pa.tAxis.azimuth.value.toFixed(2)}</td>
                    <td className="text-right py-[3px]">{pa.tAxis.plunge.value.toFixed(2)}</td>
                  </tr>
                  <tr className="border-t border-border/40">
                    <td className="text-muted-foreground pr-1 py-[3px]">N</td>
                    <td className="text-right pr-1 py-[3px]">{pa.nAxis ? pa.nAxis.length.value.toFixed(2) : '—'}</td>
                    <td className="text-right pr-1 py-[3px]">{pa.nAxis ? pa.nAxis.azimuth.value.toFixed(2) : '—'}</td>
                    <td className="text-right py-[3px]">{pa.nAxis ? pa.nAxis.plunge.value.toFixed(2) : '—'}</td>
                  </tr>
                  <tr className="border-t border-border/40">
                    <td className="text-muted-foreground pr-1 py-[3px]">P</td>
                    <td className="text-right pr-1 py-[3px]">{pa.pAxis.length.value.toFixed(2)}</td>
                    <td className="text-right pr-1 py-[3px]">{pa.pAxis.azimuth.value.toFixed(2)}</td>
                    <td className="text-right py-[3px]">{pa.pAxis.plunge.value.toFixed(2)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Tensor information ── */}
      {mt && (
        <div className="border-b border-border px-3 py-2">
          <div className="grid grid-cols-2 gap-x-2">
            <TensorRow label="Mw" value={mag ? mag.mag.value.toFixed(2) : '—'} />
            <TensorRow label="Az. Gap" value={fm?.azimuthalGap != null ? `${fm.azimuthalGap.toFixed(0)}°` : '—'} />
            <TensorRow label="Moment" value={mt.scalarMoment ? fmtMoment(mt.scalarMoment.value) : '—'} />
            <TensorRow label="Fit" value={mt.varianceReduction != null ? `${mt.varianceReduction.toFixed(1)}%` : '—'} />
            <div className="col-span-2">
              <TensorRow label="DC/CLVD/ISO" value={dcClvdIso} />
            </div>
            <TensorRow label="Method" value={mt.inversionType ?? '—'} />
            <TensorRow label="Model" value={origin?.earthModelId ?? '—'} />
            <div className="col-span-2">
              <TensorRow label="Filter" value={mt.methodId ?? 'BP 90s-300s'} />
            </div>
          </div>
        </div>
      )}

      {/* ── Evaluation (2 columns) ── */}
      <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
        {/* Origin info */}
        <div className="px-3 py-2">
          <EvalRow label="EventID" value={event.id} mono />
          <EvalRow label="Agency" value={origin?.creationInfo?.agencyId ?? event.creationInfo?.agencyId ?? '—'} />
          <EvalRow label="Author" value={origin?.creationInfo?.author ?? '—'} />
          <EvalRow
            label="Updated"
            value={origin?.creationInfo?.creationTime ? formatUTC(origin.creationInfo.creationTime) : '—'}
            mono
          />
        </div>
        {/* Focal mechanism eval info */}
        <div className="px-3 py-2">
          <EvalRow
            label="Evaluation"
            value={origin ? `${origin.evaluationStatus ?? '—'} (${origin.evaluationMode === 'manual' ? 'M' : 'A'})` : '—'}
          />
          <EvalRow label="Agency" value={fm?.creationInfo?.agencyId ?? origin?.creationInfo?.agencyId ?? '—'} />
          <EvalRow label="Author" value={fm?.creationInfo?.author ?? origin?.creationInfo?.author ?? '—'} />
          <EvalRow
            label="Updated"
            value={
              fm?.creationInfo?.creationTime
                ? formatUTC(fm.creationInfo.creationTime)
                : origin?.creationInfo?.creationTime
                  ? formatUTC(origin.creationInfo.creationTime)
                  : '—'
            }
            mono
          />
        </div>
      </div>
    </div>
  )
}

