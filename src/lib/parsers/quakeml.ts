import type { SeismicEvent, Origin, Magnitude, FocalMechanism, NodalPlane, MomentTensor, PrincipalAxes, Axis, Tensor, StationMTContribution } from '@/types/seismology'

/** Parse QuakeML XML string into SeismicEvent array */
export function parseQuakeML(xml: string): SeismicEvent[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'application/xml')
  const errorNode = doc.querySelector('parsererror')
  if (errorNode) throw new Error('QuakeML parse error')

  const eventEls = doc.querySelectorAll('event')
  return Array.from(eventEls).map(parseEvent)
}

/** SeisComP stores region in <event><description type="region name"><text>
 *  IRIS stores it in <origin><region>
 *  We support both. */
function parseEventRegion(el: Element): string | undefined {
  const descriptions = el.querySelectorAll(':scope > description')
  for (const desc of descriptions) {
    const type = text(desc, 'type')
    // SeisComP uses "region name" or "Flinn-Engdahl region"
    if (!type || type === 'region name' || type === 'Flinn-Engdahl region' || type === 'nearest cities') {
      const regionText = text(desc, 'text')
      if (regionText) return regionText
    }
  }
  return undefined
}

function parseEvent(el: Element): SeismicEvent {
  const id = el.getAttribute('publicID') ?? el.getAttribute('catalog:eventid') ?? crypto.randomUUID()
  const eventRegion = parseEventRegion(el)

  return {
    id: id.split('/').pop() ?? id,
    publicId: id,
    type: (text(el, 'type') as SeismicEvent['type']) ?? 'earthquake',
    preferredOriginId: text(el, 'preferredOriginID') ?? undefined,
    preferredMagnitudeId: text(el, 'preferredMagnitudeID') ?? undefined,
    preferredFocalMechanismId: text(el, 'preferredFocalMechanismID') ?? undefined,
    origins: Array.from(el.querySelectorAll(':scope > origin')).map((o) => parseOrigin(o, eventRegion)),
    magnitudes: Array.from(el.querySelectorAll(':scope > magnitude')).map(parseMagnitude),
    focalMechanisms: Array.from(el.querySelectorAll(':scope > focalMechanism')).map(parseFocalMechanism),
    creationInfo: parseCreationInfo(el.querySelector(':scope > creationInfo')),
  }
}

function parseOrigin(el: Element, fallbackRegion?: string): Origin {
  return {
    id: el.getAttribute('publicID') ?? '',
    time: { value: new Date(text(el, 'time > value') ?? '') },
    latitude: { value: parseFloat(text(el, 'latitude > value') ?? '0') },
    longitude: { value: parseFloat(text(el, 'longitude > value') ?? '0') },
    // QuakeML stores depth in meters; our type uses km
    depth: numQm2km(el, 'depth > value'),
    depthType: text(el, 'depthType') as Origin['depthType'] ?? undefined,
    originType: text(el, 'type') as Origin['originType'] ?? undefined,
    methodId: text(el, 'methodID') ?? undefined,
    earthModelId: text(el, 'earthModelID') ?? undefined,
    evaluationMode: (text(el, 'evaluationMode') ?? 'automatic') as Origin['evaluationMode'],
    evaluationStatus: text(el, 'evaluationStatus') as Origin['evaluationStatus'] ?? undefined,
    quality: {
      associatedPhaseCount: num(el, 'quality > associatedPhaseCount'),
      usedPhaseCount: num(el, 'quality > usedPhaseCount'),
      associatedStationCount: num(el, 'quality > associatedStationCount'),
      usedStationCount: num(el, 'quality > usedStationCount'),
      azimuthalGap: num(el, 'quality > azimuthalGap'),
      minimumDistance: num(el, 'quality > minimumDistance'),
      maximumDistance: num(el, 'quality > maximumDistance'),
      standardError: num(el, 'quality > standardError'),
    },
    // SeisComP: region in <origin><region>, fallback to event-level description
    region: text(el, 'region') ?? fallbackRegion,
    creationInfo: parseCreationInfo(el.querySelector(':scope > creationInfo')),
  }
}

function parseMagnitude(el: Element): Magnitude {
  return {
    id: el.getAttribute('publicID') ?? '',
    mag: numQ(el, 'mag > value') ?? { value: 0 },
    type: text(el, 'type') ?? 'M',
    originId: text(el, 'originID') ?? undefined,
    stationCount: num(el, 'stationCount'),
    azimuthalGap: num(el, 'azimuthalGap'),
    evaluationMode: text(el, 'evaluationMode') as Magnitude['evaluationMode'] ?? undefined,
    evaluationStatus: text(el, 'evaluationStatus') as Magnitude['evaluationStatus'] ?? undefined,
    creationInfo: parseCreationInfo(el.querySelector(':scope > creationInfo')),
  }
}

function parseFocalMechanism(el: Element): FocalMechanism {
  const npEl = el.querySelector(':scope > nodalPlanes')
  const paEl = el.querySelector(':scope > principalAxes')
  const mtEl = el.querySelector(':scope > momentTensor')
  return {
    id: el.getAttribute('publicID') ?? '',
    triggeringOriginId: text(el, 'triggeringOriginID') ?? undefined,
    nodalPlanes: npEl ? {
      nodalPlane1: parseNodalPlane(npEl.querySelector('nodalPlane1')),
      nodalPlane2: parseNodalPlane(npEl.querySelector('nodalPlane2')),
    } : undefined,
    principalAxes: paEl ? parsePrincipalAxes(paEl) : undefined,
    azimuthalGap: num(el, ':scope > azimuthalGap'),
    momentTensor: mtEl ? parseMomentTensor(mtEl) : undefined,
    evaluationMode: text(el, 'evaluationMode') as FocalMechanism['evaluationMode'] ?? undefined,
    evaluationStatus: text(el, 'evaluationStatus') as FocalMechanism['evaluationStatus'] ?? undefined,
    creationInfo: parseCreationInfo(el.querySelector(':scope > creationInfo')),
  }
}

function parseMomentTensor(el: Element): MomentTensor {
  const tensorEl = el.querySelector(':scope > tensor')
  return {
    id: el.getAttribute('publicID') ?? '',
    derivedOriginId: text(el, 'derivedOriginID') ?? undefined,
    momentMagnitudeId: text(el, 'momentMagnitudeID') ?? undefined,
    scalarMoment: numQ(el, 'scalarMoment > value'),
    tensor: tensorEl ? parseTensor(tensorEl) : undefined,
    variance: num(el, 'variance'),
    varianceReduction: num(el, 'varianceReduction'),
    doubleCouple: num(el, 'doubleCouple'),
    clvd: num(el, 'clvd'),
    iso: num(el, 'iso'),
    methodId: text(el, 'methodID') ?? undefined,
    category: text(el, 'category') as MomentTensor['category'] ?? undefined,
    inversionType: text(el, 'inversionType') as MomentTensor['inversionType'] ?? undefined,
    creationInfo: parseCreationInfo(el.querySelector(':scope > creationInfo')),
    stationContributions: parseStationContributions(el),
  }
}

const COMPONENT_MAP: Record<string, string> = {
  P: 'P', SH: 'L', SV: 'S', R: 'R', G: 'L', R60: 'R',
}

function parseStationContributions(mtEl: Element): StationMTContribution[] {
  // Try :scope > first, fall back to any depth (handles namespace wrapping)
  let els = Array.from(mtEl.querySelectorAll(':scope > stationMomentTensorContribution'))
  if (els.length === 0) {
    els = Array.from(mtEl.getElementsByTagName('stationMomentTensorContribution'))
  }
  console.debug('[quakeml] stationMomentTensorContribution found:', els.length,
    '| momentTensor children:', mtEl.children.length,
    '| tag names:', Array.from(mtEl.children).map(c => c.tagName).join(', '))
  return els.map((el) => {
    const wfEl = el.querySelector('waveformID')
    const raw = text(el, 'component') ?? undefined
    return {
      waveformId: {
        networkCode: wfEl?.getAttribute('networkCode') ?? '',
        stationCode: wfEl?.getAttribute('stationCode') ?? '',
        locationCode: wfEl?.getAttribute('locationCode') ?? undefined,
        channelCode: wfEl?.getAttribute('channelCode') ?? '',
      },
      component: raw ? (COMPONENT_MAP[raw] ?? raw) : undefined,
      active: text(el, 'active') === 'true' ? true
            : text(el, 'active') === 'false' ? false : undefined,
      weight: num(el, 'weight'),
      timeShift: num(el, 'timeShift'),
      misfit: num(el, 'misfit'),
      snr: num(el, 'snr'),
    }
  })
}

function parseTensor(el: Element): Tensor {
  const rq = (sel: string) => numQ(el, sel) ?? { value: 0 }
  return {
    Mrr: rq('Mrr > value'),
    Mtt: rq('Mtt > value'),
    Mpp: rq('Mpp > value'),
    Mrt: rq('Mrt > value'),
    Mrp: rq('Mrp > value'),
    Mtp: rq('Mtp > value'),
  }
}

function parsePrincipalAxes(el: Element): PrincipalAxes {
  return {
    tAxis: parseAxis(el.querySelector('tAxis'))!,
    pAxis: parseAxis(el.querySelector('pAxis'))!,
    nAxis: parseAxis(el.querySelector('nAxis')) ?? undefined,
  }
}

function parseAxis(el: Element | null): Axis | undefined {
  if (!el) return undefined
  return {
    azimuth: numQ(el, 'azimuth > value') ?? { value: 0 },
    plunge: numQ(el, 'plunge > value') ?? { value: 0 },
    length: numQ(el, 'length > value') ?? { value: 0 },
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

/** QuakeML depth is in meters; convert to km for our internal type */
function numQm2km(el: Element, selector: string) {
  const v = num(el, selector)
  return v !== undefined ? { value: v / 1000 } : undefined
}
