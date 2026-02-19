import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

/**
 * Displays a live countdown badge when an order is in its post-scan cooldown window.
 *
 * Rendered in isolation so only this element re-renders every second,
 * instead of the entire job list or order card.
 *
 * Returns `null` when there is no active cooldown, so it's safe to render unconditionally.
 *
 * @param {object}  props
 * @param {string}  props.jobId        - The order ID to check against the cooldown registry.
 * @param {React.MutableRefObject<object>} props.cooldownsRef - Shared ref: `{ [orderId]: expiryTimestamp }`.
 * @param {'sm'|'lg'} [props.size='sm'] - Controls badge sizing. 'lg' is used inside the order card header.
 */
export function CooldownBadge({ jobId, cooldownsRef, size = 'sm' }) {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    const tick = () => {
      const expiry = cooldownsRef.current[jobId]
      setRemaining(expiry ? Math.max(0, Math.ceil((expiry - Date.now()) / 1000)) : 0)
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [jobId, cooldownsRef])

  if (!remaining) return null

  if (size === 'lg') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-black text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
        <Clock size={14} /> {remaining}s cooldown
      </span>
    )
  }

  return (
    <span className="flex items-center gap-1 text-[8px] font-black text-yellow-600 bg-yellow-50 px-1 py-0.5 rounded">
      <Clock size={10} /> {remaining}s
    </span>
  )
}
