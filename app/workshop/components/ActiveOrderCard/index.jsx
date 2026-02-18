import { Circle, Layers, Sparkles } from 'lucide-react'
import { OrderHeader, OrderDetails, QCFailAlert, LocationToggle } from './OrderInfo'
import { StoneToggles, TimerControls, QRCodeBlock, StageControls } from './Controls'

/**
 * Full order detail panel rendered when a job is selected from the list or scanned.
 *
 * Composes all order sub-components into a single card. Receives all state and
 * callbacks from `WorkshopContent` via props — this component is intentionally
 * free of its own business logic.
 *
 * @param {object}   props
 * @param {object}   props.order
 * @param {boolean}  props.loading
 * @param {React.MutableRefObject<object>} props.cooldownsRef
 * @param {boolean}  props.isExternal
 * @param {Function} props.setIsExternal
 * @param {string}   props.manualStage
 * @param {Function} props.setManualStage
 * @param {string|null} props.lastRedoReason
 * @param {boolean}  props.showRejectMenu
 * @param {Function} props.setShowRejectMenu
 * @param {boolean}  props.isTimerRunning
 * @param {Function} props.onTimerStart
 * @param {Function} props.onTimerStop
 * @param {Function} props.onClose
 * @param {Function} props.onToggleStone
 * @param {Function} props.onMove
 * @param {Function} props.onPrint
 */

// Defined outside the component to avoid re-creation on every render.
const SETTING_ROWS = [
  { icon: <Sparkles size={14} />, label: 'Central Setting', key: 'setting_central' },
  { icon: <Layers size={14} />,   label: 'Small Setting',   key: 'setting_small'   },
  { icon: <Circle size={14} />,   label: 'Finish',          key: 'finish'          },
]

const EXTERNAL_STAGES = new Set(['Setting', 'Polishing'])

export function ActiveOrderCard({
  order,
  loading,
  cooldownsRef,
  isExternal,
  setIsExternal,
  manualStage,
  setManualStage,
  lastRedoReason,
  showRejectMenu,
  setShowRejectMenu,
  isTimerRunning,
  onTimerStart,
  onTimerStop,
  onClose,
  onToggleStone,
  onMove,
  onPrint,
}) {
  return (
    <div className="bg-white border-4 border-black p-4 md:p-6 rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in duration-200">

      <OrderHeader
        order={order}
        cooldownsRef={cooldownsRef}
        onClose={onClose}
      />

      <OrderDetails
        order={order}
        settingRows={SETTING_ROWS}
      />

      {/* QC fail reason — only relevant when the order is back in Goldsmithing */}
      {lastRedoReason && order.current_stage === 'Goldsmithing' && (
        <QCFailAlert reason={lastRedoReason} />
      )}

      {/* Internal/External toggle — only relevant for Setting and Polishing */}
      {EXTERNAL_STAGES.has(order.current_stage) && (
        <LocationToggle isExternal={isExternal} setIsExternal={setIsExternal} />
      )}

      <QRCodeBlock vtigerId={order.vtiger_id} onPrint={onPrint} />

      <StoneToggles order={order} onToggle={onToggleStone} />

      <TimerControls
        loading={loading}
        isRunning={isTimerRunning}
        onStart={onTimerStart}
        onStop={onTimerStop}
      />

      <StageControls
        loading={loading}
        manualStage={manualStage}
        setManualStage={setManualStage}
        showRejectMenu={showRejectMenu}
        setShowRejectMenu={setShowRejectMenu}
        onMove={onMove}
      />
    </div>
  )
}
