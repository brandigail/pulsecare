const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** `80`, `82.5`, `1 240`: whole numbers stay whole, otherwise one decimal; thousands are grouped. */
export function formatKg(kg: number): string {
  if (!Number.isFinite(kg)) return '0'
  const rounded = Math.round(kg * 10) / 10
  const [whole = '0', fraction] = Math.abs(rounded).toString().split('.')
  return `${rounded < 0 ? '-' : ''}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}${fraction ? `.${fraction}` : ''}`
}

/** `45 min` under an hour, otherwise `1 h 05 min`. */
export function formatMinutes(seconds: number): string {
  const total = Math.max(0, Math.round(seconds / 60))
  return total < 60 ? `${total} min` : `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, '0')} min`
}

/** `Mon 16 Nov` for a YYYY-MM-DD day. */
export function formatDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  if (!y || !m || !d) return ''
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${weekday} ${d} ${MONTHS[m - 1]}`
}

/** `16 Nov` for a YYYY-MM-DD day. */
export function formatShortDay(key: string): string {
  const [, m, d] = key.split('-').map(Number)
  return m && d ? `${d} ${MONTHS[m - 1]}` : ''
}
