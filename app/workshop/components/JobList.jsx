import { Flame, Package } from 'lucide-react'
import { CooldownBadge } from './CooldownBadge'

/**
 * Single row in the active jobs list.
 *
 * @param {object}   props
 * @param {object}   props.job          - Order row from Supabase.
 * @param {Function} props.onClick      - Called when the card is tapped/clicked.
 * @param {React.MutableRefObject<object>} props.cooldownsRef
 */
export function JobCard({ job, onClick, cooldownsRef }) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white p-4 rounded-2xl border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
        cursor-pointer flex justify-between items-center
        group active:scale-95 transition-transform
        ${job.is_rush ? 'border-red-500' : 'border-black'}
      `}
    >
      <div>
        <div className="flex items-center gap-2">
          <p className="font-black text-xl group-hover:text-blue-600">{job.vtiger_id}</p>
          {job.is_rush && <Flame size={16} className="text-red-500 fill-red-500" />}
          <CooldownBadge jobId={job.id} cooldownsRef={cooldownsRef} size="sm" />
        </div>
        <p className="text-[10px] text-blue-600 font-black uppercase flex items-center gap-1">
          <Package size={10} /> {job.article_code || 'Stock'}
        </p>
      </div>
      <p className="text-[8px] font-black uppercase text-gray-400">{job.current_stage}</p>
    </div>
  )
}

/**
 * Scrollable list of job cards with loading/empty states.
 *
 * @param {object}   props
 * @param {object[]} props.jobs
 * @param {boolean}  props.loading
 * @param {Function} props.onSelectJob              - Called with the full job object when a card is clicked.
 * @param {React.MutableRefObject<object>} props.cooldownsRef
 */
export function JobList({ jobs, loading, onSelectJob, cooldownsRef }) {
  if (loading) {
    return (
      <div className="text-center p-10 text-gray-400 font-black uppercase text-xs animate-pulse">
        Loading jobs…
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center p-10 text-gray-400 font-black uppercase text-xs">
        No jobs found in this view.
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          onClick={() => onSelectJob(job)}
          cooldownsRef={cooldownsRef}
        />
      ))}
    </div>
  )
}
