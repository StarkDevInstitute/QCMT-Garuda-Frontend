import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function safeNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/** Format a Date to UTC string: "2014-01-07 12:06:43" */
export function formatUTC(date: Date): string {
  return date.toISOString().replace('T', ' ').slice(0, 19)
}

/** Format latitude: "−44.6° S" */
export function formatLat(lat: number): string {
  const v = safeNumber(lat)
  const abs = Math.abs(v).toFixed(2)
  return v >= 0 ? `${abs}° N` : `${abs}° S`
}

/** Format longitude: "79.4° W" */
export function formatLon(lon: number): string {
  const v = safeNumber(lon)
  const abs = Math.abs(v).toFixed(2)
  return v >= 0 ? `${abs}° E` : `${abs}° W`
}

/** Format depth in km */
export function formatDepth(km: number): string {
  return `${safeNumber(km).toFixed(2)} km`
}

/** Format magnitude with type */
export function formatMag(mag: number, type: string = 'Mw'): string {
  return `${type} ${safeNumber(mag).toFixed(1)}`
}

/** Format scalar moment: "3.52 × 10¹⁷ N·m" */
export function formatScalarMoment(Nm: number): string {
  if (!Nm) return '—'
  const exp = Math.floor(Math.log10(Math.abs(Nm)))
  const mantissa = Nm / Math.pow(10, exp)
  return `${mantissa.toFixed(2)} × 10${String(exp).replace(/(\d)/g, (_, c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[parseInt(c)])} N·m`
}
