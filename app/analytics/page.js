'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react'

export default function AnalyticsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    const { data } = await supabase.from('production_logs').select('*').order('created_at', { ascending: false })
    if (data) setLogs(data)
    setLoading(false)
  }

  const redos = logs.filter(l => l.redo_reason)
  const completions = logs.filter(l => l.new_stage === 'Completed')

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white min-h-screen">
      <header className="mb-10">
        <h1 className="text-5xl font-black tracking-tighter uppercase italic">Shop Intelligence</h1>
        <p className="text-gray-400 font-bold uppercase text-xs tracking-[0.2em]">Efficiency & Quality Metrics</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatBox title="Finished This Week" value={completions.length} icon={<CheckCircle2 className="text-green-500"/>} color="bg-green-50" />
        <StatBox title="Total QC Rejections" value={redos.length} icon={<AlertTriangle className="text-orange-500"/>} color="bg-orange-50" />
        <StatBox title="Quality Rate" value={logs.length ? Math.round(((logs.length - redos.length) / logs.length) * 100) + '%' : '0%'} icon={<TrendingUp className="text-blue-500"/>} color="bg-blue-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="border-4 border-black p-6 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="font-black uppercase text-sm mb-6 flex items-center gap-2"><BarChart3 size={18}/> Top Redo Reasons</h3>
          <div className="space-y-4">
            {REDO_REASONS.map(reason => {
              const count = redos.filter(r => r.redo_reason === reason).length
              const percentage = redos.length ? (count / redos.length) * 100 : 0
              return (
                <div key={reason}>
                  <div className="flex justify-between text-xs font-black uppercase mb-1">
                    <span>{reason}</span>
                    <span>{count}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden border-2 border-black">
                    <div className="bg-orange-500 h-full" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="border-4 border-black p-6 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-black text-white">
          <h3 className="font-black uppercase text-sm mb-6">Recent Redo Log</h3>
          <div className="space-y-4">
            {redos.slice(0, 5).map((r, i) => (
              <div key={i} className="border-l-2 border-orange-500 pl-4 py-1">
                <p className="text-xs font-black text-orange-400 uppercase">{r.redo_reason}</p>
                <p className="text-sm font-bold">Sent back by {r.staff_name}</p>
                <p className="text-[10px] text-gray-500 font-mono">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatBox({ title, value, icon, color }) {
  return (
    <div className={`${color} border-4 border-black p-6 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`}>
      <div className="flex justify-between items-center mb-2">
        <p className="text-[10px] font-black uppercase tracking-widest">{title}</p>
        {icon}
      </div>
      <p className="text-5xl font-black">{value}</p>
    </div>
  )
}