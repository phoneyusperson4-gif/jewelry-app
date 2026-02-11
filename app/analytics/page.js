'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle2, User, Loader2 } from 'lucide-react'

// THIS MUST BE DEFINED IN THIS FILE TO PREVENT PRERENDER ERRORS
const REDO_REASONS = ['Loose Stone', 'Polishing Issue', 'Sizing Error', 'Metal Flaw', 'Other']

export default function AnalyticsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    const { data } = await supabase
      .from('production_logs')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setLogs(data)
    setLoading(false)
  }

  // CALCULATIONS
  const redos = logs.filter(l => l.redo_reason)
  const completions = logs.filter(l => l.new_stage === 'Completed')
  
  const getStaffStats = () => {
    const stats = {}
    logs.forEach(log => {
      if (!stats[log.staff_name]) stats[log.staff_name] = { completed: 0, redos: 0 }
      if (log.new_stage === 'Completed') stats[log.staff_name].completed++
      if (log.redo_reason) stats[log.staff_name].redos++
    })
    return stats
  }

  const staffStats = getStaffStats()

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen font-black uppercase tracking-widest text-gray-400">
        <Loader2 className="animate-spin mb-4" size={48} />
        Generating Intelligence...
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white min-h-screen font-sans">
      <header className="mb-10">
        <h1 className="text-5xl font-black tracking-tighter uppercase italic">Shop Intelligence</h1>
        <p className="text-gray-400 font-bold uppercase text-xs tracking-[0.2em]">Efficiency & Quality Metrics</p>
      </header>

      {/* TOP ROW STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatBox title="Finished (All Time)" value={completions.length} icon={<CheckCircle2 className="text-green-500"/>} color="bg-green-50" />
        <StatBox title="Total QC Rejections" value={redos.length} icon={<AlertTriangle className="text-orange-500"/>} color="bg-orange-50" />
        <StatBox title="First-Pass Yield" value={logs.length ? Math.round(((logs.length - redos.length) / logs.length) * 100) + '%' : '100%'} icon={<TrendingUp className="text-blue-500"/>} color="bg-blue-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* REDO REASONS CHART */}
        <div className="border-4 border-black p-6 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="font-black uppercase text-sm mb-6 flex items-center gap-2"><BarChart3 size={18}/> Top Redo Reasons</h3>
          <div className="space-y-4">
            {REDO_REASONS.map(reason => {
              const count = redos.filter(r => r.redo_reason === reason).length
              const percentage = redos.length ? (count / redos.length) * 100 : 0
              return (
                <div key={reason}>
                  <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                    <span>{reason}</span>
                    <span>{count} Issues</span>
                  </div>
                  <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden border-2 border-black">
                    <div className="bg-orange-500 h-full transition-all duration-1000" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* STAFF PERFORMANCE TABLE */}
        <div className="border-4 border-black p-6 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white text-black">
          <h3 className="font-black uppercase text-sm mb-6 flex items-center gap-2"><User size={18}/> Staff Bench Stats</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-3 text-[10px] font-black uppercase text-gray-400 pb-2 border-b-2 border-gray-100">
                <span>Name</span>
                <span className="text-center">Finished</span>
                <span className="text-right">Redos</span>
            </div>
            {Object.keys(staffStats).map(name => (
              <div key={name} className="grid grid-cols-3 font-bold text-sm items-center py-2 border-b border-gray-50">
                <span className="font-black italic">{name}</span>
                <span className="text-center bg-green-100 text-green-700 rounded-lg py-1 mx-4 font-black">{staffStats[name].completed}</span>
                <span className="text-right text-orange-600 font-black">{staffStats[name].redos}</span>
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