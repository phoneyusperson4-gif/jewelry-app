import { AlertOctagon, Calendar, Flame, Globe, Home, X } from 'lucide-react'
import { CooldownBadge } from '../CooldownBadge'

/**
 * Order header: vtiger ID, rush flag, cooldown badge, article code, stage, deadline.
 */
export function OrderHeader({ order, cooldownsRef, onClose }) {
  return (
    <div className="flex justify-between items-start mb-6">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-none">
            {order.vtiger_id}
          </h2>
          {order.is_rush && <Flame size={24} className="text-red-500 fill-red-500" />}
          <CooldownBadge jobId={order.id} cooldownsRef={cooldownsRef} size="lg" />
        </div>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase">
            {order.article_code || 'NO CODE'}
          </span>
          <span className="text-gray-400 font-black text-[10px] uppercase italic">
            Stage: {order.current_stage}
          </span>
          {order.deadline && (
            <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1">
              <Calendar size={10} />
              Due: {new Date(order.deadline).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <button onClick={onClose} className="text-gray-300 hover:text-black ml-2 shrink-0">
        <X size={32} />
      </button>
    </div>
  )
}

/**
 * Metal, ring size, description and setting/finish badge rows.
 *
 * @param {object}   props
 * @param {object}   props.order
 * @param {Array}    props.settingRows - Array of `{ icon, label, key }` objects for badge sections.
 */
export function OrderDetails({ order, settingRows }) {
  const renderBadges = (items) => {
    if (!items?.length) {
      return <span className="text-gray-400 italic text-xs">None</span>
    }
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {items.map((item) => (
          <span
            key={item}
            className="bg-white border border-black px-2 py-0.5 rounded-full text-[9px] font-bold uppercase shadow-sm"
          >
            {item}
          </span>
        ))}
      </div>
    )
  }

  return (
    <>
      {/* Basic specs */}
      <div className="bg-gray-50 border-2 border-black rounded-2xl p-4 mb-6 grid grid-cols-2 gap-y-3">
        <div>
          <p className="text-xs font-black text-gray-400 uppercase">Metal</p>
          <p className="text-xs font-black">{order.metal || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs font-black text-gray-400 uppercase">Size</p>
          <p className="text-xs font-black">{order.ring_size || 'N/A'}</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs font-black text-gray-400 uppercase">Instructions</p>
          <p className="text-[10px] font-bold italic">{order.description || 'No special notes'}</p>
        </div>
      </div>

      {/* Settings & Finish */}
      <div className="bg-gray-50 border-2 border-black rounded-2xl p-4 mb-6 space-y-4">
        {settingRows.map(({ icon, label, key }) => (
          <div key={key}>
            <p className="text-xs font-black text-gray-400 uppercase flex items-center gap-1">
              {icon} {label}
            </p>
            {renderBadges(order[key])}
          </div>
        ))}
      </div>

      {/* Engraving (conditional) */}
      {(order.engraving_company || order.engraving_personal) && (
        <div className="bg-gray-50 border-2 border-black rounded-2xl p-4 mb-6">
          <p className="text-xs font-black text-gray-400 uppercase flex items-center gap-1 mb-2">
            Engraving
          </p>
          <div className="space-y-1 text-xs">
            {order.engraving_company && (
              <div><span className="font-black">Company:</span> Yes</div>
            )}
            {order.engraving_personal && (
              <div>
                <span className="font-black">Personal:</span> Yes
                {order.engraving_font && (
                  <span className="ml-2 font-mono text-[10px] bg-white px-1 py-0.5 rounded border border-black">
                    Font: {order.engraving_font}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Red alert banner shown at the top of a Goldsmithing-stage order when it was
 * previously rejected by QC, so the goldsmith knows why it came back.
 *
 * @param {object} props
 * @param {string} props.reason - The redo reason string from the last production log.
 */
export function QCFailAlert({ reason }) {
  return (
    <div className="mb-4 bg-red-600 text-white p-3 rounded-xl border-2 border-black flex items-center gap-3 animate-pulse">
      <AlertOctagon size={20} />
      <div>
        <p className="text-xs font-black uppercase opacity-70">Last QC Fail Reason</p>
        <p className="text-xs font-black uppercase">{reason}</p>
      </div>
    </div>
  )
}

/**
 * Internal / External location toggle, shown only for Setting and Polishing stages.
 *
 * @param {object}   props
 * @param {boolean}  props.isExternal
 * @param {Function} props.setIsExternal
 */
export function LocationToggle({ isExternal, setIsExternal }) {
  const options = [
    { value: false, label: 'INTERNAL', icon: <Home size={12} />,  activeClass: 'bg-black text-white' },
    { value: true,  label: 'EXTERNAL', icon: <Globe size={12} />, activeClass: 'bg-blue-600 text-white' },
  ]

  return (
    <div className="flex bg-gray-100 p-1 rounded-xl mb-4 border-2 border-black">
      {options.map(({ value, label, icon, activeClass }) => (
        <button
          key={label}
          onClick={() => setIsExternal(value)}
          className={`
            flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-black text-[10px] transition-all
            ${isExternal === value ? activeClass : 'text-gray-400'}
          `}
        >
          {icon} {label}
        </button>
      ))}
    </div>
  )
}
