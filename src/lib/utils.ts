import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a Date to UTC string: "2014-01-07 12:06:43" */
export function formatUTC(date: Date): string {
  return date.toISOString().replace('T', ' ').slice(0, 19)
}

/** Format latitude: "−44.6° S" */
export function formatLat(lat: number): string {
  const abs = Math.abs(lat).toFixed(2)
  return lat >= 0 ? `${abs}° N` : `${abs}° S`
}

/** Format longitude: "79.4° W" */
export function formatLon(lon: number): string {
  const abs = Math.abs(lon).toFixed(2)
  return lon >= 0 ? `${abs}° E` : `${abs}° W`
}

/** Format depth in km */
export function formatDepth(km: number): string {
  return `${km.toFixed(0)} km`
}

/** Format scalar moment: "3.52 × 10¹⁷ N·m" */
export function formatScalarMoment(Nm: number): string {
  if (!Nm) return '—'
  const exp = Math.floor(Math.log10(Math.abs(Nm)))
  const mantissa = Nm / Math.pow(10, exp)
  return `${mantissa.toFixed(2)} × 10${String(exp).replace(/(\d)/g, (_, c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[parseInt(c)])} N·m`
}
