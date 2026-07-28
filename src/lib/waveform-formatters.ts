// ─── Waveform Data Formatters ────────────────────────────────────────────────

import type { DistanceGroup } from '@/types/waveform'

function toNum(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

// ─── Distance Formatting ──────────────────────────────────────────────────────

export function formatDistance(degrees: number): string {
  return `${toNum(degrees).toFixed(2)}°`
}

export function formatDistanceKm(km: number): string {
  const v = toNum(km)
  if (v >= 1000) {
    return `${(v / 1000).toFixed(1)} Mm` // Megameters for large distances
  }
  return `${v.toFixed(0)} km`
}

// ─── Azimuth Formatting ───────────────────────────────────────────────────────

export function formatAzimuth(degrees: number): string {
  return `${toNum(degrees).toFixed(1)}°`
}

export function getAzimuthDirection(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const index = Math.round(degrees / 22.5) % 16
  return directions[index]
}

// ─── Weight & Fit Formatting ──────────────────────────────────────────────────

export function formatWeight(weight: number): string {
  return toNum(weight).toFixed(2)
}

export function formatFit(fit: number): string {
  return `${toNum(fit).toFixed(1)}%`
}

export function formatMisfit(misfit: number): string {
  // Convert 0-1 misfit to 0-100% fit
  const fit = (1 - toNum(misfit)) * 100
  return formatFit(fit)
}

// ─── Time Shift Formatting ────────────────────────────────────────────────────

export function formatTimeShift(shift: number): string {
  const v = toNum(shift)
  const sign = v >= 0 ? '+' : ''
  return `${sign}${v.toFixed(2)}s`
}

// ─── Signal-to-Noise Ratio ───────────────────────────────────────────────────

export function formatSNR(snr: number): string {
  return toNum(snr).toFixed(1)
}

export function getSNRQuality(snr: number): 'good' | 'medium' | 'poor' {
  const v = toNum(snr)
  if (v >= 3.0) return 'good'
  if (v >= 1.5) return 'medium'
  return 'poor'
}

// ─── Amplitude Formatting ─────────────────────────────────────────────────────

export function formatAmplitude(amplitude: number): string {
  const v = toNum(amplitude)
  // Scientific notation for very small/large values
  if (Math.abs(v) < 0.001 || Math.abs(v) > 1000) {
    return v.toExponential(2)
  }
  return v.toFixed(3)
}

// ─── Magnitude Formatting ─────────────────────────────────────────────────────

export function formatMagnitude(mag: number, type: string = 'Mw'): string {
  return `${type} ${toNum(mag).toFixed(1)}`
}

// ─── Frequency Formatting ─────────────────────────────────────────────────────

export function formatFrequency(freq: number): string {
  return `${toNum(freq).toFixed(3)} Hz`
}

export function formatPeriod(freq: number): string {
  const f = toNum(freq) || 1
  const period = 1 / f
  return `${period.toFixed(1)}s`
}

// ─── Distance Group Labels ────────────────────────────────────────────────────

export function getDistanceGroupLabel(group: DistanceGroup): string {
  switch (group) {
    case 'local':
      return 'Local (<3°)'
    case 'regional':
      return 'Regional (3-10°)'
    case 'teleseismic':
      return 'Teleseismic (>10°)'
  }
}

// ─── Station Key Parsing ──────────────────────────────────────────────────────

export function parseStationKey(key: string): {
  network: string
  station: string
  location: string
  channel: string
} {
  const [network, station, location, channel] = key.split('.')
  return { network, station, location: location || '', channel }
}

export function formatStationKey(
  network: string,
  station: string,
  location: string,
  channel: string
): string {
  return `${network}.${station}.${location || ''}.${channel}`
}

// ─── Waveform Time Formatting ─────────────────────────────────────────────────

export function formatWaveformTime(seconds: number): string {
  const v = toNum(seconds)
  const mins = Math.floor(v / 60)
  const secs = v % 60
  if (mins > 0) {
    return `${mins}m ${secs.toFixed(1)}s`
  }
  return `${secs.toFixed(1)}s`
}

// ─── Variance Reduction Formatting ────────────────────────────────────────────

export function formatVarianceReduction(vr: number): string {
  return `${(toNum(vr) * 100).toFixed(1)}%`
}

// ─── Tensor Component Formatting ──────────────────────────────────────────────

export function formatTensorComponent(value: number): string {
  // Format in scientific notation with 2 decimal places
  return toNum(value).toExponential(2)
}
