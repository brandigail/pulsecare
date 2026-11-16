import type { DateKey } from '../types'

const KEY = /^(\d{4})-(\d{2})-(\d{2})$/

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Today (or any moment) as the user's local calendar day. */
export function toDateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** True for a real calendar day in the YYYY-MM-DD format (so 2026-02-30 is rejected). */
export function isDateKey(value: string): value is DateKey {
  const match = KEY.exec(value)
  if (!match) return false
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

// All calendar arithmetic below runs on UTC midnight of the same y/m/d, so a daylight saving change can never
// make a day 23 or 25 hours long and skip or repeat a date.
function toUtc(key: DateKey): Date {
  const match = KEY.exec(key)
  if (!match) throw new Error(`Invalid date key: ${key}`)
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
}

function fromUtc(date: Date): DateKey {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

export function addDays(key: DateKey, days: number): DateKey {
  const date = toUtc(key)
  date.setUTCDate(date.getUTCDate() + days)
  return fromUtc(date)
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: DateKey, to: DateKey): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000)
}

/** 0 = Monday ... 6 = Sunday. */
export function weekdayIndex(key: DateKey): number {
  return (toUtc(key).getUTCDay() + 6) % 7
}

export function startOfWeek(key: DateKey): DateKey {
  return addDays(key, -weekdayIndex(key))
}

export function dayOfMonth(key: DateKey): number {
  return toUtc(key).getUTCDate()
}

export function monthIndex(key: DateKey): number {
  return toUtc(key).getUTCMonth()
}

/** The `count` days ending at `end`, oldest first. */
export function lastDays(end: DateKey, count: number): DateKey[] {
  return Array.from({ length: count }, (_, i) => addDays(end, i - (count - 1)))
}

const SHORT_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function shortWeekday(key: DateKey): string {
  return SHORT_WEEKDAYS[weekdayIndex(key)] ?? ''
}

export function monthName(index: number): string {
  return MONTHS[index] ?? ''
}

/** For example `Tue 3 Mar 2026`. */
export function formatDate(key: DateKey): string {
  return `${shortWeekday(key)} ${dayOfMonth(key)} ${monthName(monthIndex(key))} ${toUtc(key).getUTCFullYear()}`
}
