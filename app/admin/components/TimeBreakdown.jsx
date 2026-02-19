import { memo, useState, useEffect, useMemo } from 'react'
import { History } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { formatDuration } from '@/app/admin/utils'

/**
 * Fetches production logs for a given order and renders:
 * - A 3-cell summary (Total / Active / Waiting time)
 * - Per-stage duration totals (dynamic — reflects any stage in the pipeline)
 * - A scrollable timeline interleaving active stage entries and idle waits
 *
 * Fetch is cancelled on unmount to prevent state updates on dead components.
 *
 * @param {object} props
 * @param {object} props.order - Full order row from Supabase.
 */
export const TimeBreakdown = memo(function TimeBreakdown({ order }) {
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('production_logs')
      .select('*')
      .eq('order_id', order.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (!cancelled) { setLogs(data ?? []); setLoading(false) }
      })
    return () => { cancelled = true }
  }, [order.id])

  const { timeline, totalSeconds, activeSeconds, waitingSeconds, summary } = useMemo(() => {
    const startTime = new Date(order.created_at).getTime()
    const endTime   = order.current_stage === 'Completed'
      ? new Date(order.updated_at).getTime()
      : Date.now()
    const totalSeconds = Math.max(0, Math.floor((endTime - startTime) / 1000))

    const timeline = []
    let prevEnd = startTime

    for (const log of logs) {
      const logTime    = new Date(log.created_at).getTime()
      const stageSecs  = log.duration_seconds || 0
      const stageStart = logTime - stageSecs * 1000
      const stageName  = (log.previous_stage || log.new_stage || 'Unknown').trim()

      const waitSecs = Math.max(0, Math.floor((stageStart - prevEnd) / 1000))
      if (waitSecs > 0) {
        timeline.push({ type: 'wait', name: 'Waiting', seconds: waitSecs, from: new Date(prevEnd), to: new Date(stageStart) })
      }
      if (stageSecs > 0) {
        timeline.push({ type: 'stage', name: stageName, seconds: stageSecs, from: new Date(stageStart), to: new Date(logTime), staff: log.staff_name, isRedo: log.action === 'REJECTED' })
      }
      prevEnd = logTime
    }

    const finalWait = Math.max(0, Math.floor((endTime - prevEnd) / 1000))
    if (finalWait > 0) {
      timeline.push({ type: 'wait', name: 'Waiting', seconds: finalWait, from: new Date(prevEnd), to: new Date(endTime) })
    }

    const activeSeconds  = timeline.filter(t => t.type === 'stage').reduce((s, t) => s + t.seconds, 0)
    const waitingSeconds = timeline.filter(t => t.type === 'wait').reduce((s, t)  => s + t.seconds, 0)

    const summary = logs.reduce((acc, log) => {
      const stage = (log.previous_stage || log.new_stage || 'Unknown').trim()
      acc[stage] = (acc[stage] || 0) + (log.duration_seconds || 0)
      return acc
    }, {})

    return { timeline, totalSeconds, activeSeconds, waitingSeconds, summary }
  }, [logs, order.created_at, order.updated_at, order.current_stage])

  if (loading) {
    return (
      <div className="animate-pulse text-[10px] font-black uppercase text-gray-400 mt-4">
        Calculating...
      </div>
    )
  }

  const stageList = Object.keys(summary).filter(s => summary[s] > 0)

  return (
    <div className="mt-6 space-y-6">
      {/* Overall summary */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Total',   value: totalSeconds   },
          { label: 'Active',  value: activeSeconds  },
          { label: 'Waiting', value: waitingSeconds },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-50 border-2 border-black p-2 rounded-xl text-center">
            <p className="text-[8px] font-black uppercase text-gray-400">{label}</p>
            <p className="text-xs font-black">{formatDuration(value)}</p>
          </div>
        ))}
      </div>

      {/* Per-stage totals */}
      {stageList.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {stageList.map(stage => (
            <div key={stage} className="bg-gray-50 border-2 border-black p-2 rounded-xl text-center">
              <p className="text-[8px] font-black uppercase text-gray-400">{stage}</p>
              <p className="text-xs font-black">{formatDuration(summary[stage])}</p>
            </div>
          ))}
        </div>
      )}

      {/* Scrollable timeline */}
      <div className="border-t-4 border-black pt-4">
        <h4 className="font-black text-[10px] mb-3 uppercase text-gray-400 tracking-widest flex items-center gap-2">
          <History size={12} /> Timeline (with waiting)
        </h4>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
          {timeline.map((item, i) => (
            <div
              key={i}
              className={`flex justify-between items-center text-[11px] py-2 border-b-2 border-gray-100 last:border-0 ${item.type === 'wait' ? 'opacity-70' : ''}`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${item.type === 'wait' ? 'bg-gray-400' : 'bg-blue-500'}`} />
                <span className="font-bold uppercase">
                  {item.type === 'wait' ? (
                    <>⏳ Waiting</>
                  ) : (
                    <>
                      {item.isRedo && <span className="text-red-600">REDO: </span>}
                      {item.name}
                      {item.staff && <span className="text-gray-400 ml-1">({item.staff})</span>}
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px] text-gray-500">
                  {item.from.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' – '}
                  {item.to.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="font-mono font-black bg-blue-50 px-2 py-0.5 rounded text-blue-700">
                  {formatDuration(item.seconds)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})
