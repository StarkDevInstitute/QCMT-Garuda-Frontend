import type { EventSummary, SeismicEvent } from '@/types/seismology'

/** Convert a SeismicEvent to a flat EventSummary for EventTable rows. */
export function toEventSummary(event: SeismicEvent): EventSummary {
  const origin = event.origins.find((o) => o.id === event.preferredOriginId) ?? event.origins[0]
  const mag = event.magnitudes.find((m) => m.id === event.preferredMagnitudeId) ?? event.magnitudes[0]

  return {
    id: event.id,
    time: origin.time.value,
    magnitude: mag?.mag.value ?? 0,
    magnitudeType: mag?.type ?? 'M',
    usedPhases: origin.quality?.usedPhaseCount ?? 0,
    latitude: origin.latitude.value,
    longitude: origin.longitude.value,
    depth: origin.depth?.value ?? 0,
    evaluationMode: origin.evaluationMode,
    evaluationStatus: origin.evaluationStatus,
    agency: origin.creationInfo?.agencyId ?? event.creationInfo?.agencyId ?? '—',
    region: origin.region ?? '—',
    hasMomentTensor: event.focalMechanisms.some((fm) => fm.momentTensor != null),
  }
}
