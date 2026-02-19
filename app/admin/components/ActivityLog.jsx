import { memo } from 'react'
import { ArrowRight, History, Search } from 'lucide-react'

/**
 * Audit log panel shown on the Live Board tab.
 *
 * Displays the 50 most recent production log entries, filterable by vtiger ID,
 * staff name, or stage name. Search input is debounced in the parent hook.
 *
 * @param {object}   props
 * @param {object[]} props.logs              - Filtered log entries (already searched).
 * @param {Function} props.onSearchChange    - `onChange` handler for the search input (debounced).
 */
export const ActivityLog = memo(function ActivityLog({ logs, onSearchChange }) {
  return (
    <div className="bg-white border-4 border-black p-8 rounded-[2.5rem] shadow-[8px_8px_0px_0px_black]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="font-black uppercase flex items-center gap-3 text-xl tracking-tighter">
          <History size={24} /> Recent Audit Log
        </h2>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Filter logs..."
            className="w-full pl-10 pr-4 py-2 border-2 border-black rounded-xl text-xs font-black outline-none uppercase shadow-[2px_2px_0px_0px_black] focus:translate-x-0.5 focus:translate-y-0.5 focus:shadow-none transition-all"
            onChange={onSearchChange}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {logs.length === 0 ? (
          <p className="text-gray-400 font-bold uppercase text-xs col-span-full">
            No logs match your filter.
          </p>
        ) : (
          logs.map((log, i) => (
            <div
              key={i}
              className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border-2 border-black hover:bg-yellow-50 transition-colors"
            >
              <div className="flex flex-col gap-1">
                <span className="font-black text-base leading-none">{log.orders?.vtiger_id}</span>
                <span className="text-[10px] font-black uppercase text-gray-500">{log.staff_name}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase bg-white px-3 py-2 rounded-xl border-2 border-black">
                <span className="text-gray-400 truncate max-w-[60px]">{log.previous_stage}</span>
                <ArrowRight size={12} className="text-black shrink-0" />
                <span className="text-blue-600 truncate max-w-[60px]">{log.new_stage}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
})
