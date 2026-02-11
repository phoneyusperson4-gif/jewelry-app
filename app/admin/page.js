'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Camera, Search, User, X, RotateCcw, CheckCircle, BarChart3, TrendingUp, Trophy } from 'lucide-react'

// Constants defined at the top to prevent build errors
const STAFF_MEMBERS = ['Goldsmith 1', 'Goldsmith 2', 'Setter 1', 'Setter 2', 'QC']
const REDO_REASONS = ['Loose Stone', 'Polishing Issue', 'Sizing Error', 'Metal Flaw', 'Other']

export default function WorkshopDashboard() {
  const [view, setView] = useState('scanner') // 'scanner' or 'stats'
  const [searchId, setSearchId] = useState('')
  const [activeOrder, setActiveOrder] = useState(null)
  const [staffName, setStaffName] = useState(STAFF_MEMBERS[0])
  const [showCamera, setShowCamera] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showRejectMenu, setShowRejectMenu] = useState(false)
  const [allLogs, setAllLogs] = useState([])

  // 1. Fetch Analytics Data
  useEffect(() => {
    if (view === 'stats') fetchGlobalLogs()
  }, [view])

  const fetchGlobalLogs = async () => {
    setLoading(true)
    const { data } = await supabase.from('production_logs').select('*').order('created_at', { ascending: false })
    if (data) setAllLogs(data)
    setLoading(false)
  }

  // 2. Camera Logic
  useEffect(() => {
    if (showCamera && view === 'scanner') {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } });
      scanner.render((decodedText) => {
        setSearchId(decodedText);
        findOrder(decodedText);
        scanner.clear();
        setShowCamera(false);
      }, (error) => {});
      return () => scanner.clear();
    }
  }, [showCamera, view]);

  const findOrder = async (idToSearch = searchId) => {
    const cleanId = idToSearch.toUpperCase().trim();
    if (!cleanId) return;
    setLoading(true);
    const { data } = await supabase.from('orders').select('*, production_logs(*)').eq('vtiger_id', cleanId).single();
    if (data) {
      if (data.current_stage === 'At Casting') alert("🛑 Still at Casting!");
      else setActiveOrder(data);
    } else alert("Order not found!");
    setLoading(false);
  }

  const handleMove = async (nextStage, isRejection = false, reason = null) => {
    const { error } = await supabase.from('orders').update({ current_stage: nextStage }).eq('id', activeOrder.id);
    if (!error) {
      await supabase.from('production_logs').insert([{
        order_id: activeOrder.id,
        staff_name: staffName,
        previous_stage: activeOrder.current_stage,
        new_stage: nextStage,
        redo_reason: reason
      }]);
      alert(isRejection ? `⚠️ Sent back to ${nextStage}` : `✅ Moved to ${nextStage}`);
      setActiveOrder(null);
      setSearchId('');
      setShowRejectMenu(false);
    }
  }

  // --- ANALYTICS CALCULATIONS ---
  const redos = allLogs.filter(l => l.redo_reason)
  const completions = allLogs.filter(l => l.new_stage === 'Completed')
  const qualityRate = allLogs.length ? Math.round(((allLogs.length - redos.length) / allLogs.length) * 100) : 100

  const getStaffStats = () => {
    const stats = {}
    allLogs.forEach(log => {
      if (!stats[log.staff_name]) stats[log.staff_name] = { completed: 0, redos: 0 }
      if (log.new_stage === 'Completed') stats[log.staff_name].completed++
      if (log.redo_reason) stats[log.staff_name].redos++
    })
    return stats
  }
  const staffStats = getStaffStats()

  return (
    <div className="max-w-2xl mx-auto p-4 bg-gray-50 min-h-screen pb-20">
      
      {/* VIEW TOGGLE */}
      <div className="flex bg-black p-1 rounded-xl mb-6 shadow-xl border border-gray-800">
        <button onClick={() => setView('scanner')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-black text-xs transition-all ${view === 'scanner' ? 'bg-white text-black shadow-inner' : 'text-gray-400'}`}>
          <Camera size={14}/> SCANNER
        </button>
        <button onClick={() => setView('stats')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-black text-xs transition-all ${view === 'stats' ? 'bg-white text-black shadow-inner' : 'text-gray-400'}`}>
          <BarChart3 size={14}/> SHOP ANALYTICS
        </button>
      </div>

      {view === 'scanner' ? (
        <>
          {/* STAFF SELECTOR */}
          <div className="mb-6 bg-white p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <label className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-1"><User size={12}/> Current Staff Member</label>
            <select className="w-full font-black text-lg bg-transparent outline-none cursor-pointer" value={staffName} onChange={(e) => setStaffName(e.target.value)}>
              {STAFF_MEMBERS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {!activeOrder ? (
            <div className="flex gap-2">
              <input type="text" placeholder="SCAN OR TYPE ID..." className="flex-1 p-4 border-4 border-black rounded-xl font-black text-xl placeholder:text-gray-300 uppercase" value={searchId} onChange={(e) => setSearchId(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && findOrder()} />
              <button onClick={() => setShowCamera(true)} className="bg-blue-600 text-white p-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all"><Camera /></button>
              {showCamera && <div className="fixed inset-0 bg-black z-50 p-6 flex flex-col items-center"><button onClick={() => setShowCamera(false)} className="text-white self-end mb-4"><X size={40}/></button><div id="reader" className="bg-white rounded-xl w-full max-w-sm overflow-hidden border-4 border-blue-500"></div></div>}
            </div>
          ) : (
            <div className={`bg-white border-4 p-6 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in duration-200 ${activeOrder.is_rush ? 'border-red-600 ring-4 ring-red-100' : 'border-black'}`}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-4xl font-black leading-none">{activeOrder.vtiger_id}</h2>
                  <p className="text-gray-400 font-bold text-xs uppercase mt-1">{activeOrder.client_name}</p>
                </div>
                <span className="bg-yellow-300 border-2 border-black px-3 py-1 rounded-lg font-black text-[10px] uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{activeOrder.current_stage}</span>
              </div>

              <div className="space-y-3 mb-8">
                <button onClick={() => {
                  const stages = ['Goldsmithing', 'Setting', 'QC', 'Completed'];
                  handleMove(stages[stages.indexOf(activeOrder.current_stage) + 1] || 'Completed');
                }} className="w-full bg-green-500 text-white p-5 border-4 border-black rounded-2xl font-black text-xl flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 transition-all">
                  <CheckCircle /> COMPLETE STAGE
                </button>

                {activeOrder.current_stage === 'QC' && !showRejectMenu && (
                  <button onClick={() => setShowRejectMenu(true)} className="w-full bg-red-50 text-red-600 p-4 border-2 border-red-600 border-dashed rounded-2xl font-black flex items-center justify-center gap-2 transition-all">
                    <RotateCcw size={20} /> REJECT (SEND BACK)
                  </button>
                )}

                {showRejectMenu && (
                  <div className="bg-red-50 p-4 rounded-2xl border-2 border-red-200 animate-in slide-in-from-top-2">
                    <p className="text-[10px] font-black uppercase text-red-400 mb-3">Reason for Rejection</p>
                    <div className="grid grid-cols-1 gap-2">
                      {REDO_REASONS.map(reason => (
                        <button key={reason} onClick={() => handleMove('Goldsmithing', true, reason)} className="bg-white p-3 border-2 border-black rounded-xl font-bold text-sm hover:bg-red-500 hover:text-white transition-all text-left">
                          {reason}
                        </button>
                      ))}
                      <button onClick={() => setShowRejectMenu(false)} className="text-xs font-bold text-gray-400 mt-2 text-center underline">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => setActiveOrder(null)} className="w-full text-gray-400 font-bold py-2 text-xs uppercase tracking-widest">Exit Scanner</button>
            </div>
          )}
        </>
      ) : (
        /* --- INTEGRATED STATS VIEW --- */
        <div className="space-y-6 animate-in fade-in duration-500">
          
          {/* ROW 1: KEY METRICS */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border-4 border-black p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex justify-between items-center mb-1 text-green-600"><CheckCircle size={16}/> <span className="text-[10px] font-black uppercase">Finished</span></div>
              <p className="text-4xl font-black">{completions.length}</p>
            </div>
            <div className="bg-white border-4 border-black p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex justify-between items-center mb-1 text-blue-600"><TrendingUp size={16}/> <span className="text-[10px] font-black uppercase">First-Pass</span></div>
              <p className="text-4xl font-black">{qualityRate}%</p>
            </div>
          </div>

          {/* ROW 2: STAFF PERFORMANCE */}
          <div className="bg-white border-4 border-black p-6 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="font-black uppercase text-xs mb-4 flex items-center gap-2"><Trophy size={16} className="text-yellow-500"/> Bench Performance</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-3 text-[10px] font-black text-gray-400 border-b-2 border-gray-100 pb-2">
                <span>STAFF</span> <span className="text-center">FINISHED</span> <span className="text-right">REDOS</span>
              </div>
              {Object.keys(staffStats).map(name => (
                <div key={name} className="grid grid-cols-3 items-center py-1 font-bold text-sm">
                  <span className="italic">{name}</span>
                  <span className="text-center bg-green-50 text-green-600 rounded-lg py-1 mx-4 font-black">{staffStats[name].completed}</span>
                  <span className="text-right text-red-500">{staffStats[name].redos}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ROW 3: TOP REJECTION REASONS */}
          <div className="bg-white border-4 border-black p-6 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="font-black uppercase text-xs mb-4 flex items-center gap-2"><RotateCcw size={16} className="text-red-500"/> Top Issues</h3>
            <div className="space-y-4">
              {REDO_REASONS.map(reason => {
                const count = redos.filter(r => r.redo_reason === reason).length
                const pct = redos.length ? (count / redos.length) * 100 : 0
                return (
                  <div key={reason}>
                    <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                      <span>{reason}</span> <span>{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full border border-black overflow-hidden">
                      <div className="h-full bg-red-500" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}