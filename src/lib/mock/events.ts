import type { SeismicEvent, EventSummary } from '@/types/seismology'

const d = (iso: string) => new Date(iso)

export const mockEvents: SeismicEvent[] = [
  {
    id: 'gfz2024abcd', publicId: 'quakeml:ndk/gfz2024abcd',
    type: 'earthquake',
    preferredOriginId: 'orig-01', preferredMagnitudeId: 'mag-01', preferredFocalMechanismId: 'fm-01',
    origins: [{ id: 'orig-01', time: { value: d('2024-01-15T03:22:11Z') }, latitude: { value: -8.412 }, longitude: { value: 115.234 }, depth: { value: 10 }, evaluationMode: 'manual', evaluationStatus: 'confirmed', quality: { usedPhaseCount: 87, azimuthalGap: 42, minimumDistance: 1.2 }, region: 'Bali Region, Indonesia', creationInfo: { agencyId: 'BMKG', author: 'analyst@bmkg.go.id' } }],
    magnitudes: [{ id: 'mag-01', mag: { value: 5.8 }, type: 'Mw', evaluationMode: 'manual', creationInfo: { agencyId: 'BMKG' } }],
    focalMechanisms: [{ id: 'fm-01', nodalPlanes: { nodalPlane1: { strike: { value: 195 }, dip: { value: 60 }, rake: { value: -85 } }, nodalPlane2: { strike: { value: 15 }, dip: { value: 31 }, rake: { value: -100 } } }, momentTensor: { id: 'mt-01', scalarMoment: { value: 7.24e17 }, varianceReduction: 91.2, doubleCouple: 0.87, clvd: 0.13, inversionType: 'general' }, evaluationMode: 'manual', evaluationStatus: 'confirmed' }],
    creationInfo: { agencyId: 'BMKG', creationTime: d('2024-01-15T04:00:00Z') }
  },
  {
    id: 'gfz2024efgh', publicId: 'quakeml:ndk/gfz2024efgh',
    type: 'earthquake',
    preferredOriginId: 'orig-02', preferredMagnitudeId: 'mag-02',
    origins: [{ id: 'orig-02', time: { value: d('2024-01-15T01:47:33Z') }, latitude: { value: -5.231 }, longitude: { value: 132.561 }, depth: { value: 33 }, evaluationMode: 'automatic', evaluationStatus: 'preliminary', quality: { usedPhaseCount: 54, azimuthalGap: 110, minimumDistance: 4.7 }, region: 'Banda Sea', creationInfo: { agencyId: 'GFZ', author: 'autoloc@gfz' } }],
    magnitudes: [{ id: 'mag-02', mag: { value: 4.8 }, type: 'M', evaluationMode: 'automatic', creationInfo: { agencyId: 'GFZ' } }],
    focalMechanisms: [],
    creationInfo: { agencyId: 'GFZ', creationTime: d('2024-01-15T02:10:00Z') }
  },
  {
    id: 'gfz2024ijkl', publicId: 'quakeml:ndk/gfz2024ijkl',
    type: 'earthquake',
    preferredOriginId: 'orig-03', preferredMagnitudeId: 'mag-03', preferredFocalMechanismId: 'fm-03',
    origins: [{ id: 'orig-03', time: { value: d('2024-01-14T22:18:05Z') }, latitude: { value: 3.875 }, longitude: { value: 126.102 }, depth: { value: 57 }, evaluationMode: 'manual', evaluationStatus: 'confirmed', quality: { usedPhaseCount: 103, azimuthalGap: 35, minimumDistance: 2.1 }, region: 'Talaud Islands, Indonesia', creationInfo: { agencyId: 'BMKG' } }],
    magnitudes: [{ id: 'mag-03', mag: { value: 6.2 }, type: 'Mw', evaluationMode: 'manual', creationInfo: { agencyId: 'BMKG' } }],
    focalMechanisms: [{ id: 'fm-03', nodalPlanes: { nodalPlane1: { strike: { value: 20 }, dip: { value: 80 }, rake: { value: 175 } }, nodalPlane2: { strike: { value: 110 }, dip: { value: 85 }, rake: { value: 10 } } }, momentTensor: { id: 'mt-03', scalarMoment: { value: 2.11e18 }, varianceReduction: 88.4, doubleCouple: 0.92, clvd: 0.08, inversionType: 'zero trace' }, evaluationMode: 'manual', evaluationStatus: 'confirmed' }],
    creationInfo: { agencyId: 'BMKG', creationTime: d('2024-01-14T23:30:00Z') }
  },
  {
    id: 'gfz2024mnop', publicId: 'quakeml:ndk/gfz2024mnop',
    type: 'earthquake',
    preferredOriginId: 'orig-04', preferredMagnitudeId: 'mag-04',
    origins: [{ id: 'orig-04', time: { value: d('2024-01-14T18:54:22Z') }, latitude: { value: -7.112 }, longitude: { value: 107.834 }, depth: { value: 142 }, evaluationMode: 'automatic', evaluationStatus: 'reviewed', quality: { usedPhaseCount: 71, azimuthalGap: 65, minimumDistance: 0.8 }, region: 'West Java, Indonesia', creationInfo: { agencyId: 'BMKG' } }],
    magnitudes: [{ id: 'mag-04', mag: { value: 5.1 }, type: 'M', evaluationMode: 'automatic', creationInfo: { agencyId: 'BMKG' } }],
    focalMechanisms: [],
    creationInfo: { agencyId: 'BMKG', creationTime: d('2024-01-14T19:15:00Z') }
  },
  {
    id: 'gfz2024qrst', publicId: 'quakeml:ndk/gfz2024qrst',
    type: 'earthquake',
    preferredOriginId: 'orig-05', preferredMagnitudeId: 'mag-05', preferredFocalMechanismId: 'fm-05',
    origins: [{ id: 'orig-05', time: { value: d('2024-01-14T14:30:41Z') }, latitude: { value: -9.561 }, longitude: { value: 119.023 }, depth: { value: 20 }, evaluationMode: 'manual', evaluationStatus: 'final', quality: { usedPhaseCount: 118, azimuthalGap: 28, minimumDistance: 1.5 }, region: 'Sumbawa Region, Indonesia', creationInfo: { agencyId: 'BMKG' } }],
    magnitudes: [{ id: 'mag-05', mag: { value: 6.5 }, type: 'Mw', evaluationMode: 'manual', creationInfo: { agencyId: 'BMKG' } }],
    focalMechanisms: [{ id: 'fm-05', nodalPlanes: { nodalPlane1: { strike: { value: 280 }, dip: { value: 20 }, rake: { value: 90 } }, nodalPlane2: { strike: { value: 100 }, dip: { value: 70 }, rake: { value: 90 } } }, momentTensor: { id: 'mt-05', scalarMoment: { value: 8.54e18 }, varianceReduction: 94.7, doubleCouple: 0.95, clvd: 0.05, inversionType: 'zero trace' }, evaluationMode: 'manual', evaluationStatus: 'final' }],
    creationInfo: { agencyId: 'BMKG', creationTime: d('2024-01-14T16:00:00Z') }
  },
  {
    id: 'gfz2024uvwx', publicId: 'quakeml:ndk/gfz2024uvwx',
    type: 'earthquake',
    preferredOriginId: 'orig-06', preferredMagnitudeId: 'mag-06',
    origins: [{ id: 'orig-06', time: { value: d('2024-01-14T11:05:17Z') }, latitude: { value: 36.512 }, longitude: { value: 70.423 }, depth: { value: 207 }, evaluationMode: 'manual', evaluationStatus: 'confirmed', quality: { usedPhaseCount: 93, azimuthalGap: 80, minimumDistance: 4.8 }, region: 'Hindu Kush Region, Afghanistan', creationInfo: { agencyId: 'GFZ' } }],
    magnitudes: [{ id: 'mag-06', mag: { value: 4.9 }, type: 'M', evaluationMode: 'manual', creationInfo: { agencyId: 'GFZ' } }],
    focalMechanisms: [],
    creationInfo: { agencyId: 'GFZ', creationTime: d('2024-01-14T12:00:00Z') }
  },
  {
    id: 'gfz2024yzaa', publicId: 'quakeml:ndk/gfz2024yzaa',
    type: 'earthquake',
    preferredOriginId: 'orig-07', preferredMagnitudeId: 'mag-07', preferredFocalMechanismId: 'fm-07',
    origins: [{ id: 'orig-07', time: { value: d('2024-01-14T08:22:59Z') }, latitude: { value: -44.623 }, longitude: { value: -79.412 }, depth: { value: 10 }, evaluationMode: 'manual', evaluationStatus: 'confirmed', quality: { usedPhaseCount: 48, azimuthalGap: 165, minimumDistance: 3.4 }, region: 'Off Coast of Southern Chile', creationInfo: { agencyId: 'GFZ', author: 'seismologist@gfz' } }],
    magnitudes: [{ id: 'mag-07', mag: { value: 5.2 }, type: 'Mw', evaluationMode: 'manual', creationInfo: { agencyId: 'GFZ' } }],
    focalMechanisms: [{ id: 'fm-07', nodalPlanes: { nodalPlane1: { strike: { value: 5 }, dip: { value: 87 }, rake: { value: 2 } }, nodalPlane2: { strike: { value: 275 }, dip: { value: 88 }, rake: { value: 177 } } }, momentTensor: { id: 'mt-07', scalarMoment: { value: 3.52e17 }, varianceReduction: 87.6, doubleCouple: 0.904, clvd: 0.096, inversionType: 'zero trace' }, evaluationMode: 'manual', evaluationStatus: 'confirmed' }],
    creationInfo: { agencyId: 'GFZ', creationTime: d('2024-01-14T10:00:00Z') }
  },
  {
    id: 'gfz2024bbcc', publicId: 'quakeml:ndk/gfz2024bbcc',
    type: 'earthquake',
    preferredOriginId: 'orig-08', preferredMagnitudeId: 'mag-08',
    origins: [{ id: 'orig-08', time: { value: d('2024-01-14T05:44:02Z') }, latitude: { value: 0.312 }, longitude: { value: 123.481 }, depth: { value: 143 }, evaluationMode: 'automatic', evaluationStatus: 'preliminary', quality: { usedPhaseCount: 65, azimuthalGap: 90, minimumDistance: 2.3 }, region: 'Minahasa Peninsula, Sulawesi, Indonesia', creationInfo: { agencyId: 'BMKG' } }],
    magnitudes: [{ id: 'mag-08', mag: { value: 4.4 }, type: 'M', evaluationMode: 'automatic', creationInfo: { agencyId: 'BMKG' } }],
    focalMechanisms: [],
    creationInfo: { agencyId: 'BMKG', creationTime: d('2024-01-14T06:00:00Z') }
  },
  {
    id: 'gfz2024ddee', publicId: 'quakeml:ndk/gfz2024ddee',
    type: 'earthquake',
    preferredOriginId: 'orig-09', preferredMagnitudeId: 'mag-09', preferredFocalMechanismId: 'fm-09',
    origins: [{ id: 'orig-09', time: { value: d('2024-01-13T22:11:38Z') }, latitude: { value: -1.876 }, longitude: { value: 134.256 }, depth: { value: 25 }, evaluationMode: 'manual', evaluationStatus: 'confirmed', quality: { usedPhaseCount: 77, azimuthalGap: 55, minimumDistance: 1.9 }, region: 'Papua Barat, Indonesia', creationInfo: { agencyId: 'BMKG' } }],
    magnitudes: [{ id: 'mag-09', mag: { value: 5.5 }, type: 'Mw', evaluationMode: 'manual', creationInfo: { agencyId: 'BMKG' } }],
    focalMechanisms: [{ id: 'fm-09', nodalPlanes: { nodalPlane1: { strike: { value: 90 }, dip: { value: 45 }, rake: { value: -90 } }, nodalPlane2: { strike: { value: 270 }, dip: { value: 45 }, rake: { value: -90 } } }, momentTensor: { id: 'mt-09', scalarMoment: { value: 1.84e18 }, varianceReduction: 90.1, doubleCouple: 0.98, clvd: 0.02, inversionType: 'double couple' }, evaluationMode: 'manual', evaluationStatus: 'confirmed' }],
    creationInfo: { agencyId: 'BMKG', creationTime: d('2024-01-13T23:30:00Z') }
  },
  {
    id: 'gfz2024ffgg', publicId: 'quakeml:ndk/gfz2024ffgg',
    type: 'earthquake',
    preferredOriginId: 'orig-10', preferredMagnitudeId: 'mag-10',
    origins: [{ id: 'orig-10', time: { value: d('2024-01-13T19:33:21Z') }, latitude: { value: -6.891 }, longitude: { value: 105.421 }, depth: { value: 55 }, evaluationMode: 'automatic', evaluationStatus: 'reviewed', quality: { usedPhaseCount: 45, azimuthalGap: 120, minimumDistance: 0.5 }, region: 'Sunda Strait', creationInfo: { agencyId: 'BMKG' } }],
    magnitudes: [{ id: 'mag-10', mag: { value: 3.8 }, type: 'ML', evaluationMode: 'automatic', creationInfo: { agencyId: 'BMKG' } }],
    focalMechanisms: [],
    creationInfo: { agencyId: 'BMKG', creationTime: d('2024-01-13T20:00:00Z') }
  },
  {
    id: 'gfz2024hhii', publicId: 'quakeml:ndk/gfz2024hhii',
    type: 'earthquake',
    preferredOriginId: 'orig-11', preferredMagnitudeId: 'mag-11', preferredFocalMechanismId: 'fm-11',
    origins: [{ id: 'orig-11', time: { value: d('2024-01-13T15:07:44Z') }, latitude: { value: 28.341 }, longitude: { value: 84.712 }, depth: { value: 15 }, evaluationMode: 'manual', evaluationStatus: 'final', quality: { usedPhaseCount: 130, azimuthalGap: 25, minimumDistance: 2.0 }, region: 'Nepal', creationInfo: { agencyId: 'GFZ' } }],
    magnitudes: [{ id: 'mag-11', mag: { value: 6.4 }, type: 'Mw', evaluationMode: 'manual', creationInfo: { agencyId: 'GFZ' } }],
    focalMechanisms: [{ id: 'fm-11', nodalPlanes: { nodalPlane1: { strike: { value: 270 }, dip: { value: 10 }, rake: { value: 90 } }, nodalPlane2: { strike: { value: 90 }, dip: { value: 80 }, rake: { value: 90 } } }, momentTensor: { id: 'mt-11', scalarMoment: { value: 6.31e18 }, varianceReduction: 92.3, doubleCouple: 0.96, clvd: 0.04, inversionType: 'zero trace' }, evaluationMode: 'manual', evaluationStatus: 'final' }],
    creationInfo: { agencyId: 'GFZ', creationTime: d('2024-01-13T17:00:00Z') }
  },
  {
    id: 'gfz2024jjkk', publicId: 'quakeml:ndk/gfz2024jjkk',
    type: 'earthquake',
    preferredOriginId: 'orig-12', preferredMagnitudeId: 'mag-12',
    origins: [{ id: 'orig-12', time: { value: d('2024-01-13T10:55:08Z') }, latitude: { value: -2.543 }, longitude: { value: 138.921 }, depth: { value: 72 }, evaluationMode: 'automatic', evaluationStatus: 'preliminary', quality: { usedPhaseCount: 38, azimuthalGap: 145, minimumDistance: 5.2 }, region: 'Eastern Papua, Indonesia', creationInfo: { agencyId: 'BMKG' } }],
    magnitudes: [{ id: 'mag-12', mag: { value: 4.2 }, type: 'M', evaluationMode: 'automatic', creationInfo: { agencyId: 'BMKG' } }],
    focalMechanisms: [],
    creationInfo: { agencyId: 'BMKG', creationTime: d('2024-01-13T11:20:00Z') }
  },
]

/** Convert a SeismicEvent to a flat EventSummary for table display */
export function toEventSummary(event: SeismicEvent): EventSummary {
  const origin = event.origins.find(o => o.id === event.preferredOriginId) ?? event.origins[0]
  const mag = event.magnitudes.find(m => m.id === event.preferredMagnitudeId) ?? event.magnitudes[0]
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
    agency: origin.creationInfo?.agencyId ?? '—',
    region: origin.region ?? '—',
    hasMomentTensor: event.focalMechanisms.some(fm => fm.momentTensor != null),
  }
}

export const mockEventSummaries: EventSummary[] = mockEvents.map(toEventSummary)
