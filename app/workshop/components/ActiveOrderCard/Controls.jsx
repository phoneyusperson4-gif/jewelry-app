import { Gem, Layers, Loader2, CheckCircle, Printer } from 'lucide-react'
import dynamic from 'next/dynamic'
import { STAGES, REDO_REASONS } from '../../constants'

const QRCodeCanvas = dynamic(
  () => import('qrcode.react').then((m) => m.QRCodeCanvas),
  { ssr: false }
)

/**
 * Two toggle buttons tracking whether the center stone and side stones
 * have been received from the client / stone store.
 *
 * @param {object}   props
 * @param {object}   props.order
 * @param {Function} props.onToggle - Called with `(field, currentValue)`.
 */
export function StoneToggles({ order, onToggle }) {
  const stones = [
    { field: 'center_stone_received', label: 'Center', icon: <Gem size={24} /> },
    { field: 'side_stones_received',  label: 'Sides',  icon: <Layers size={24} /> },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      {stones.map(({ field, label, icon }) => (
        <button
          key={field}
          onClick={() => onToggle(field, order[field])}
          className={`
            p-4 rounded-2xl border-2 border-black flex flex-col items-center gap-2 transition-all
            ${order[field]
              ? 'bg-green-500 text-white shadow-inner'
              : 'bg-gray-50 text-gray-400 border-dashed'}
          `}
        >
          {icon}
          <span className="text-[10px] font-black uppercase">
            {order[field] ? `${label}: Ready` : `${label}: Needed`}
          </span>
        </button>
      ))}
    </div>
  )
}

/**
 * START / STOP buttons wired to the per-stage timer.
 *
 * - START records `timer_started_at` in the DB.
 * - STOP calculates elapsed time, advances the stage, and closes the order.
 *
 * @param {object}   props
 * @param {boolean}  props.loading
 * @param {boolean}  props.isRunning
 * @param {Function} props.onStart
 * @param {Function} props.onStop
 */
export function TimerControls({ loading, isRunning, onStart, onStop }) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      <button
        onClick={onStart}
        disabled={loading || isRunning}
        className="
          flex items-center justify-center gap-2 p-4
          bg-green-500 text-white border-4 border-black rounded-2xl
          font-black text-sm
          shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-0.5
          transition-all disabled:opacity-40 disabled:cursor-not-allowed
        "
      >
        ▶ START
      </button>
      <button
        onClick={onStop}
        disabled={loading || !isRunning}
        className="
          flex items-center justify-center gap-2 p-4
          bg-red-500 text-white border-4 border-black rounded-2xl
          font-black text-sm
          shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-0.5
          transition-all disabled:opacity-40 disabled:cursor-not-allowed
        "
      >
        ■ STOP
      </button>
    </div>
  )
}

/**
 * QR code display with an inline print button.
 *
 * @param {object}   props
 * @param {string}   props.vtigerId
 * @param {Function} props.onPrint
 */
export function QRCodeBlock({ vtigerId, onPrint }) {
  return (
    <div className="relative flex flex-col items-center bg-gray-50 border-2 border-black rounded-3xl p-4 mb-6">
      <div className="bg-white p-2 border border-black rounded-lg shadow-sm">
        <QRCodeCanvas value={vtigerId} size={120} level="H" includeMargin={false} />
      </div>
      <p className="text-[9px] font-black uppercase mt-2 text-gray-400 tracking-widest">
        Digital Job Token
      </p>
      <button
        onClick={onPrint}
        className="absolute top-2 right-2 bg-black text-white p-2 rounded-full hover:scale-110 transition-transform shadow-lg"
        title="Print QR Label"
      >
        <Printer size={16} />
      </button>
    </div>
  )
}

/**
 * Manual stage override select + "MOVE TO STAGE" button + QC rejection flow.
 *
 * @param {object}   props
 * @param {boolean}  props.loading
 * @param {string}   props.manualStage
 * @param {Function} props.setManualStage
 * @param {boolean}  props.showRejectMenu
 * @param {Function} props.setShowRejectMenu
 * @param {Function} props.onMove - Called with `(isRejection: boolean, reason: string | null)`.
 */
export function StageControls({
  loading,
  manualStage,
  setManualStage,
  showRejectMenu,
  setShowRejectMenu,
  onMove,
}) {
  return (
    <div className="space-y-4">
      {/* Stage override select */}
      <div className="bg-white border-2 border-black rounded-xl p-3">
        <label className="text-xs font-black uppercase text-gray-400">Override Stage:</label>
        <select
          className="w-full font-black text-sm outline-none bg-transparent"
          value={manualStage}
          onChange={(e) => setManualStage(e.target.value)}
        >
          {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Primary move button */}
      <button
        disabled={loading}
        onClick={() => onMove(false, null)}
        className="
          w-full bg-black text-white p-5 border-4 border-black rounded-3xl
          font-black text-xl flex items-center justify-center gap-3
          hover:bg-gray-800 active:scale-95 transition-all
          shadow-[0px_6px_0px_0px_rgba(0,0,0,0.5)] disabled:opacity-50
        "
      >
        {loading
          ? <Loader2 className="animate-spin" />
          : <><CheckCircle size={24} /> MOVE TO STAGE</>}
      </button>

      {/* QC rejection trigger */}
      <button
        onClick={() => setShowRejectMenu((v) => !v)}
        className="
          w-full bg-red-50 text-red-600 p-4
          border-2 border-red-600 border-dashed rounded-2xl
          font-black text-xs uppercase hover:bg-red-100
        "
      >
        Fail QC / Send back to Goldsmithing
      </button>

      {/* Redo reason picker */}
      {showRejectMenu && (
        <div className="bg-red-100 p-4 rounded-2xl border-2 border-red-600 animate-in slide-in-from-top-2">
          <p className="text-xs font-black uppercase mb-3 text-red-700">Reason for Redo:</p>
          <div className="grid grid-cols-1 gap-2">
            {REDO_REASONS.map((reason) => (
              <button
                key={reason}
                onClick={() => onMove(true, reason)}
                className="
                  bg-white p-3 border-2 border-black rounded-xl
                  font-black text-[10px] uppercase text-left
                  hover:bg-red-600 hover:text-white transition-colors
                "
              >
                {reason}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
