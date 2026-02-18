/**
 * Displays a transient status message after a scan or stage action.
 *
 * Auto-dismissed by the parent after 4 seconds (see `useWorkshopState`).
 * Returns `null` when there is no active message.
 *
 * @param {object}         props
 * @param {{ type: 'start'|'success'|'error', text: string } | null} props.message
 */
export function ScanMessage({ message }) {
  if (!message) return null

  const styles = {
    start:   'bg-blue-100  border-blue-600  text-blue-800',
    success: 'bg-green-100 border-green-600 text-green-800',
    error:   'bg-red-100   border-red-600   text-red-800',
  }

  return (
    <div
      className={`
        mb-4 p-4 rounded-xl border-2 font-black text-sm text-center uppercase
        animate-in slide-in-from-top-2
        ${styles[message.type] ?? styles.error}
      `}
    >
      {message.text}
    </div>
  )
}
