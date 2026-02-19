import { memo } from 'react'
import { Clock, RotateCcw, Search } from 'lucide-react'
import { formatDuration, calculateTotalTime } from '@/app/admin/utils'

/**
 * Completed jobs archive — searchable table with per-stage duration columns.
 *
 * Accepts already-filtered data from the parent so it has no filtering logic
 * of its own; it is purely a presentation component.
 *
 * @param {object}   props
 * @param {object[]} props.jobs            - Filtered completed job rows.
 * @param {number}   props.totalCount      - Unfiltered count (for the subtitle).
 * @param {object}   props.stageDurations  - Map of `{ [orderId]: { [stage]: seconds, Total: seconds } }`.
 * @param {boolean}  props.loading
 * @param {boolean}  props.isRefreshing
 * @param {Function} props.onSearchChange  - Debounced `onChange` for the search input.
 * @param {Function} props.onRefresh       - Called when the refresh button is clicked.
 * @param {Function} props.onSelectJob     - Called with the full job object when a row is clicked.
 */
export const ArchiveTable = memo(function ArchiveTable({
  jobs,
  totalCount,
  stageDurations,
  loading,
  isRefreshing,
  onSearchChange,
  onRefresh,
  onSelectJob,
}) {
  return (
    <div className="bg-white border-4 border-black rounded-[3rem] overflow-hidden shadow-[12px_12px_0px_0px_black] animate-in slide-in-from-bottom-4 duration-500">

      {/* Toolbar */}
      <div className="p-8 bg-gray-50 border-b-4 border-black flex flex-col sm:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="font-black uppercase text-3xl tracking-tighter">Completed Jobs Archive</h2>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-1">
            Showing {jobs.length} of {totalCount} Finished Pieces
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-4 top-4 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="SEARCH ID OR MODEL..."
              className="w-full pl-12 pr-4 py-4 border-4 border-black rounded-2xl text-sm font-black outline-none uppercase shadow-[4px_4px_0px_0px_black] focus:translate-x-1 focus:translate-y-1 focus:shadow-none transition-all"
              onChange={onSearchChange}
            />
          </div>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="bg-black text-white p-4 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_black] hover:bg-gray-800 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
            title="Refresh archive"
          >
            <RotateCcw size={20} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-black border-t-transparent" />
            <p className="mt-4 font-black uppercase text-gray-400">Loading archive...</p>
          </div>
        ) : totalCount === 0 ? (
          <p className="p-20 text-center font-black uppercase text-gray-400 text-lg">
            No completed orders found
          </p>
        ) : jobs.length === 0 ? (
          <p className="p-20 text-center font-black uppercase text-gray-400 text-lg">
            No jobs match your search
          </p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black text-white text-[10px] uppercase font-black tracking-widest">
                <th className="p-6 whitespace-nowrap">Job ID</th>
                <th className="p-6 whitespace-nowrap">Article Code</th>
                <th className="p-6 whitespace-nowrap">Total Time</th>
                <th className="p-6 whitespace-nowrap text-orange-400">Goldsmithing</th>
                <th className="p-6 whitespace-nowrap text-purple-400">Setting</th>
                <th className="p-6 whitespace-nowrap text-purple-400">Set Ext</th>
                <th className="p-6 whitespace-nowrap text-emerald-400">Polishing</th>
                <th className="p-6 whitespace-nowrap text-emerald-400">Pol Ext</th>
                <th className="p-6 whitespace-nowrap text-right">Date Finished</th>
              </tr>
            </thead>
            <tbody className="divide-y-4 divide-gray-100">
              {jobs.map(job => {
                const d = stageDurations[job.id] ?? {}
                return (
                  <tr
                    key={job.id}
                    onClick={() => onSelectJob(job)}
                    className="hover:bg-blue-50 cursor-pointer transition-colors group"
                  >
                    <td className="p-6 font-black text-xl group-hover:text-blue-600 transition-colors">
                      {job.vtiger_id}
                      {job.is_rush && (
                        <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded text-[8px] align-middle">RUSH</span>
                      )}
                    </td>
                    <td className="p-6 text-sm font-black text-blue-600 uppercase">{job.article_code}</td>
                    <td className="p-6">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-black" />
                        <span className="bg-black text-white px-3 py-1.5 rounded-lg text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]">
                          {calculateTotalTime(job.created_at, job.updated_at)}
                        </span>
                      </div>
                    </td>
                    <td className="p-6 text-sm font-black text-gray-500">{formatDuration(d.Goldsmithing)}</td>
                    <td className="p-6 text-sm font-black text-gray-500">{formatDuration(d.Setting)}</td>
                    <td className="p-6 text-center">
                      {job.is_external
                        ? <span className="inline-flex items-center justify-center w-6 h-6 bg-green-100 text-green-700 rounded-full font-black">✓</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="p-6 text-sm font-black text-gray-500">{formatDuration(d.Polishing)}</td>
                    <td className="p-6 text-center">
                      {job.is_external
                        ? <span className="inline-flex items-center justify-center w-6 h-6 bg-green-100 text-green-700 rounded-full font-black">✓</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="p-6 text-right text-xs font-black text-gray-400 uppercase tracking-wider">
                      {new Date(job.updated_at).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
})
