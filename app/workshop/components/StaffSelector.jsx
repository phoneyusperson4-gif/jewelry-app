import { User } from 'lucide-react'
import { STAFF_MEMBERS } from '../constants'

/**
 * Dropdown for selecting the active technician.
 *
 * The selected name is written into all production log entries,
 * so changing it mid-shift correctly attributes subsequent actions.
 *
 * @param {object}   props
 * @param {string}   props.value    - Currently selected staff member name.
 * @param {Function} props.onChange - Called with the new name string when selection changes.
 */
export function StaffSelector({ value, onChange }) {
  return (
    <div className="mb-4 bg-white p-3 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <label className="text-xs font-black uppercase text-gray-400 flex items-center gap-1 mb-1">
        <User size={12} /> Technician
      </label>
      <select
        className="w-full font-bold text-base bg-transparent outline-none cursor-pointer"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {STAFF_MEMBERS.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>
    </div>
  )
}
