/**
 * Returns a debounced version of `func` with a `.cancel()` method
 * so callers can clean up pending invocations on unmount.
 *
 * @template {(...args: any[]) => void} T
 * @param {T} func
 * @param {number} wait - Milliseconds to delay
 * @returns {T & { cancel: () => void }}
 */
export function debounce(func, wait) {
  let timeout = null
  function debounced(...args) {
    clearTimeout(timeout)
    timeout = setTimeout(() => { timeout = null; func(...args) }, wait)
  }
  debounced.cancel = () => { clearTimeout(timeout); timeout = null }
  return debounced
}

/**
 * Converts a raw seconds value into a human-readable duration string.
 *
 * @param {number} seconds
 * @returns {string} e.g. "2d 3h 15m"
 *
 * @example
 * formatDuration(3725) // → "1h 2m"
 * formatDuration(0)    // → "0m"
 */
export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0m'
  if (seconds < 60) return '<1m'
  const days = Math.floor(seconds / 86400)
  const hrs  = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hrs  > 0) parts.push(`${hrs}h`)
  if (mins > 0 || parts.length === 0) parts.push(`${mins}m`)
  return parts.join(' ')
}

/**
 * Returns elapsed time between two ISO date strings as a formatted duration.
 *
 * @param {string} start - ISO date string
 * @param {string} end   - ISO date string
 * @returns {string}
 */
export function calculateTotalTime(start, end) {
  if (!start || !end) return '---'
  return formatDuration(Math.floor((new Date(end) - new Date(start)) / 1000))
}
