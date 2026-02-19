import { memo } from 'react'
import { Globe } from 'lucide-react'

/**
 * A single stage column on the live production board.
 *
 * Wrapped in `React.memo` so it only re-renders when its own job list or
 * the `onSelectJob` handler reference changes — not on every parent render.
 *
 * @param {object}   props
 * @param {string}   props.title         - Column header label.
 * @param {React.ReactNode} props.icon   - Lucide icon for the column header.
 * @param {object[]} props.jobs          - Orders currently in this stage.
 * @param {{ bg: string, border: string, text: string, accent: string }} props.color - Tailwind colour tokens.
 * @param {Function} props.onSelectJob   - Called with the full job object when a card is clicked.
 */
export const KanbanColumn = memo(function KanbanColumn({ title, icon, jobs, color, onSelectJob }) {
  return (
    <div className={`${color.bg} border-4 ${color.border} rounded-[2rem] p-5 shadow-[6px_6px_0px_0px_black]`}>
      <div className={`flex items-center gap-2 ${color.text} mb-4 border-b-4 ${color.accent} pb-3 font-black uppercase text-xs tracking-tighter`}>
        {icon} {title} ({jobs.length})
      </div>

      <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
        {jobs.map(job => (
          <div
            key={job.id}
            onClick={() => onSelectJob(job)}
            className="bg-white p-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-0 active:shadow-none"
          >
            <div className="flex justify-between items-start mb-1">
              <p className="font-black text-lg leading-none">{job.vtiger_id}</p>
              {job.is_rush && (
                <span className="bg-red-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase">RUSH</span>
              )}
            </div>
            <p className="text-[10px] font-black text-blue-600 uppercase truncate">
              {job.article_code || 'No Article'}
              {(job.current_stage === 'Setting' || job.current_stage === 'Polishing') && job.is_external && (
                <span className="ml-2 inline-flex items-center gap-0.5 bg-blue-100 text-blue-700 px-1 py-0.5 rounded text-[8px] font-black uppercase">
                  <Globe size={8} /> EXT
                </span>
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
})
