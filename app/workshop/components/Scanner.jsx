import { useEffect } from 'react'
import { Camera, Keyboard, Loader2, Search } from 'lucide-react'
import { useCameraScanner } from '../hooks/useCameraScanner'

/**
 * Toggle between 'manual' (keyboard / barcode gun) and 'camera' scan modes.
 *
 * @param {object}   props
 * @param {'manual'|'camera'} props.mode
 * @param {Function} props.onModeChange
 */
export function ScannerModeToggle({ mode, onModeChange }) {
  const options = [
    { value: 'manual', label: 'MANUAL', icon: <Keyboard size={14} /> },
    { value: 'camera', label: 'CAMERA', icon: <Camera size={14} /> },
  ]

  return (
    <div className="flex gap-2 mb-4">
      {options.map(({ value, label, icon }) => (
        <button
          key={value}
          onClick={() => onModeChange(value)}
          className={`
            flex-1 py-2 rounded-xl border-2 font-black text-xs
            flex items-center justify-center gap-1
            ${mode === value
              ? 'bg-black text-white border-black'
              : 'bg-white text-gray-400 border-gray-300'}
          `}
        >
          {icon} {label}
        </button>
      ))}
    </div>
  )
}

/**
 * Text input for manual barcode entry (also works with a USB barcode gun via keyboard events).
 *
 * Pressing Enter or clicking the search button triggers `onScan`.
 *
 * @param {object}   props
 * @param {string}   props.searchId
 * @param {Function} props.onSearchIdChange
 * @param {Function} props.onScan
 * @param {boolean}  props.loading
 * @param {boolean}  props.disabled
 */
export function ManualScanner({ searchId, onSearchIdChange, onScan, loading, disabled }) {
  return (
    <>
      <div className="flex gap-2">
        <input
          autoFocus
          type="text"
          placeholder="SCAN JOB BARCODE..."
          className="
            w-full p-6 border-4 border-black rounded-2xl font-black text-xl uppercase
            shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none
            focus:bg-blue-50 disabled:bg-gray-200 disabled:cursor-not-allowed
          "
          value={searchId}
          onChange={(e) => onSearchIdChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onScan()}
          disabled={disabled}
        />
        <button
          onClick={onScan}
          disabled={disabled}
          className="
            bg-black text-white px-8 rounded-2xl border-4 border-black
            shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1
            transition-all disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {loading ? <Loader2 className="animate-spin" /> : <Search />}
        </button>
      </div>

      <p className="text-center mt-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">
        Scan 1× to Start Stage · Scan 2× to Complete Stage
      </p>
    </>
  )
}

/**
 * Camera-based QR code scanner using `html5-qrcode` (lazy-loaded).
 *
 * Starts the camera on mount and stops it on unmount or when the user
 * clicks "STOP CAMERA". The video feed is rendered inside a `div` with
 * the given `containerId`.
 *
 * @param {object}   props
 * @param {string}   props.containerId - DOM id for the scanner container element.
 * @param {Function} props.onScan      - Called with the decoded string on a successful scan.
 * @param {Function} props.onStop      - Called when the user manually stops the camera.
 */
export function CameraScanner({ containerId, onScan, onStop }) {
  const { initialized, error, permissionDenied, start, stop, setOnScan } =
    useCameraScanner(containerId)

  useEffect(() => { setOnScan(onScan) }, [setOnScan, onScan])

  useEffect(() => {
    const t = setTimeout(() => start(), 100)
    return () => { clearTimeout(t); stop() }
  }, [start, stop])

  return (
    <div className="space-y-4">
      {/* The scanner library injects its video feed into this element */}
      <div
        id={containerId}
        className="w-full aspect-video bg-black rounded-2xl overflow-hidden border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
      />

      {error && (
        <div className="p-4 bg-red-100 border-2 border-red-600 rounded-xl font-black text-xs text-red-800">
          {error}
          {permissionDenied && (
            <button onClick={() => { stop(); start() }} className="ml-2 underline">
              Retry
            </button>
          )}
        </div>
      )}

      {!error && !initialized && (
        <div className="text-center p-4 bg-yellow-100 border-2 border-yellow-600 rounded-xl font-black text-xs">
          Initializing camera…
        </div>
      )}

      {initialized && (
        <p className="text-center text-[10px] font-black text-green-600">
          Camera active — point at a QR code
        </p>
      )}

      <button
        onClick={onStop}
        className="w-full bg-gray-200 p-3 rounded-xl font-black text-xs border-2 border-black"
      >
        STOP CAMERA
      </button>
    </div>
  )
}
