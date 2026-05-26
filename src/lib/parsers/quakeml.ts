import type { SeismicEvent, Origin, Magnitude, FocalMechanism, NodalPlane } from '@/types/seismology'

/** Parse QuakeML XML string into SeismicEvent array */
export function parseQuakeML(xml: string): SeismicEvent[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'application/xml')
  const errorNode = doc.querySelector('parsererror')
  if (errorNode) throw new Error('QuakeML parse error')

  const eventEls = doc.querySelectorAll('event')
  return Array.from(eventEls).map(parseEvent)
}

function parseEvent(el: Element): SeismicEvent {
  const id = el.getAttribute('publicID') ?? el.getAttribute('catalog:eventid') ?? crypto.randomUUID()

  return {
    id: id.split('/').pop() ?? id,
    publicId: id,
    type: (text(el, 'type') as SeismicEvent['type']) ?? 'earthquake',
    preferredOriginId: text(el, 'preferredOriginID') ?? undefined,
    preferredMagnitudeId: text(el, 'preferredMagnitudeID') ?? undefined,
    preferredFocalMechanismId: text(el, 'preferredFocalMechanismID') ?? undefined,
    origins: Array.from(el.querySelectorAll(':scope > origin')).map(parseOrigin),
    magnitudes: Array.from(el.querySelectorAll(':scope > magnitude')).map(parseMagnitude),
    focalMechanisms: Array.from(el.querySelectorAll(':scope > focalMechanism')).map(parseFocalMechanism),
    creationInfo: parseCreationInfo(el.querySelector(':scope > creationInfo')),
  }
}

function parseOrigin(el: Element): Origin {
  return {
    id: el.getAttribute('publicID') ?? '',
    time: { value: new Date(text(el, 'time > value') ?? '') },
    latitude: { value: parseFloat(text(el, 'latitude > value') ?? '0') },
    longitude: { value: parseFloat(text(el, 'longitude > value') ?? '0') },
    depth: numQ(el, 'depth > value'),
    evaluationMode: (text(el, 'evaluationMode') ?? 'automatic') as Origin['evaluationMode'],
    evaluationStatus: text(el, 'evaluationStatus') as Origin['evaluationStatus'] ?? undefined,
    quality: {
      usedPhaseCount: num(el, 'quality > usedPhaseCount'),
      usedStationCount: num(el, 'quality > usedStationCount'),
      azimuthalGap: num(el, 'quality > azimuthalGap'),
      minimumDistance: num(el, 'quality > minimumDistance'),
      standardError: num(el, 'quality > standardError'),
    },
    region: text(el, 'region') ?? undefined,
    creationInfo: parseCreationInfo(el.querySelector(':scope > creationInfo')),
  }
}

function parseMagnitude(el: Element): Magnitude {
  return {
    id: el.getAttribute('publicID') ?? '',
    mag: { value: parseFloat(text(el, 'mag > value') ?? '0') },
    type: text(el, 'type') ?? 'M',
    originId: text(el, 'originID') ?? undefined,
    stationCount: num(el, 'stationCount'),
    evaluationMode: text(el, 'evaluationMode') as Magnitude['evaluationMode'] ?? undefined,
    evaluationStatus: text(el, 'evaluationStatus') as Magnitude['evaluationStatus'] ?? undefined,
    creationInfo: parseCreationInfo(el.querySelector(':scope > creationInfo')),
  }
}

function parseFocalMechanism(el: Element): FocalMechanism {
  const npEl = el.querySelector('nodalPlanes')
  return {
    id: el.getAttribute('publicID') ?? '',
    triggeringOriginId: text(el, 'triggeringOriginID') ?? undefined,
    nodalPlanes: npEl ? {
      nodalPlane1: parseNodalPlane(npEl.querySelector('nodalPlane1')),
      nodalPlane2: parseNodalPlane(npEl.querySelector('nodalPlane2')),
    } : undefined,
    evaluationMode: text(el, 'evaluationMode') as FocalMechanism['evaluationMode'] ?? undefined,
    evaluationStatus: text(el, 'evaluationStatus') as FocalMechanism['evaluationStatus'] ?? undefined,
    creationInfo: parseCreationInfo(el.querySelector(':scope > creationInfo')),
  }
}

function parseNodalPlane(el: Element | null): NodalPlane | undefined {
  if (!el) return undefined
  return {
    strike: { value: parseFloat(text(el, 'strike > value') ?? '0') },
    dip: { value: parseFloat(text(el, 'dip > value') ?? '0') },
    rake: { value: parseFloat(text(el, 'rake > value') ?? '0') },
  }
}

function parseCreationInfo(el: Element | null) {
  if (!el) return undefined
  return {
    agencyId: text(el, 'agencyID') ?? undefined,
    author: text(el, 'author') ?? undefined,
    creationTime: new Date(text(el, 'creationTime') ?? ''),
    version: text(el, 'version') ?? undefined,
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function text(el: Element, selector: string): string | null {
  return el.querySelector(selector)?.textContent?.trim() ?? null
}

function num(el: Element, selector: string): number | undefined {
  const v = text(el, selector)
  return v ? parseFloat(v) : undefined
}

function numQ(el: Element, selector: string) {
  const v = num(el, selector)
  return v !== undefined ? { value: v } : undefined
}
