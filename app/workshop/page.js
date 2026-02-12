'use client'
import { useState, useEffect, Suspense } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { 
  Camera, Search, User, X, RotateCcw, 
  CheckCircle, BarChart3, Package, Loader2 
} from 'lucide-react'

const STAFF_MEMBERS = ['Goldsmith 1', 'Goldsmith 2', 'Setter 1', 'Setter 2', 'QC']
const REDO_REASONS = ['Loose Stone', 'Polishing Issue', 'Sizing Error', 'Metal Flaw', 'Other']

// We wrap the content in a sub-component to handle SearchParams correctly in Next.js
function WorkshopContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [view, setView] = useState('scanner') // 'scanner' or 'stats'
  const [searchId, setSearchId] = useState('')
  const [activeOrder, setActiveOrder] = useState(null)
  const [staffName, setStaffName] = useState(STAFF_MEMBERS[0])
  const [showCamera, setShowCamera] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showRejectMenu, setShowRejectMenu] = useState(false)
  
  const [allLogs, setAllLogs] = useState([]) 
  const [activeJobs, setActiveJobs] = useState([]) 

  // 1. Initial Data Fetch
  useEffect(() => {
    fetchGlobalLogs()
    fetchActiveJobs()
  }, [view])

  // 2. DEEP LINKING: Auto-load if 'search' is in URL
  useEffect(() => {
    const urlId = searchParams.get('search')
    if (urlId && !activeOrder) {
      findOrder(urlId)
    }
  }, [searchParams])

  const fetchGlobalLogs = async () => {
    const { data } = await supabase.from('production_logs').select('*').order('created_at', { ascending: false })
    if (data) setAllLogs(data)
  }

  const fetchActiveJobs = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .neq('current_stage', 'Completed')
      .order('created_at', { ascending: false })
    if (data) setActiveJobs(data)
  }

  // 3. Camera Logic
  useEffect(() => {
    if (showCamera && view === 'scanner') {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } });
      scanner.render((decodedText) => {
        // If the QR is a full URL, extract the ID; otherwise use the text
        const id = decodedText.includes('search=') ? decodedText.split('search=')[1] : decodedText
        findOrder(id);
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
    
    const { data, error } = await supabase
      .from('orders')
      .select('*, production_logs(*)')
      .eq('vtiger_id', cleanId)
      .single();

    if (data) {
      setActiveOrder(data);
      setSearchId('');
    } else {
      alert("Order not found!");
    }
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
      setShowRejectMenu(false);
      fetchActiveJobs();
      // Clear URL params after action
      router.push('/workshop', { shallow: true });
    }
  }

  const redos = allLogs.filter(l => l.redo_reason)
  const completions = allLogs.filter(l => l.new_stage === 'Completed')

  return (
    <div className="max-w-2xl mx-auto p-4 bg-gray-50 min-h-screen pb-20">
      
      {/* NAVIGATION TOGGLE */}
      <div className="flex bg-black p-1 rounded-xl mb-6 shadow-xl sticky top-4 z-40 border border-gray-800">
        <button onClick={() => setView('scanner')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-black text-xs transition-all ${view === 'scanner' ? 'bg-white text-black shadow-inner' : 'text-gray-400'}`}>
          <Package size={14}/> WORKSHOP
        </button>
        <button onClick={() => setView('stats')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-black text-xs transition-all ${view === 'stats' ? 'bg-white text-black shadow-inner' : 'text-gray-400'}`}>
          <BarChart3 size={14}/> ANALYTICS
        </button>
      </div>

      {view === 'scanner' ? (
        <>
          {/* STAFF IDENTITY */}
          <div className="mb-4 bg-white p-3 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <label className="text-[10px] font-black uppercase text-black flex items-center gap-1 mb-1"><User size={12}/> Current Staff</label>
            <select className="w-full font-bold text-base bg-transparent outline-none" value={staffName} onChange={(e) => setStaffName(e.target.value)}>
              {STAFF_MEMBERS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {!activeOrder ? (
            <div className="space-y-6">
              {/* SEARCH & SCAN AREA */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-4 text-black" size={20}/>
                  <input 
                    type="text" 
                    placeholder="ENTER ID..." 
                    className="w-full pl-10 p-4 border-4 border-black rounded-xl font-black text-xl uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:translate-y-1 focus:shadow-none transition-all outline-none" 
                    value={searchId} 
                    onChange={(e) => setSearchId(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && findOrder()} 
                  />
                </div>
                <button onClick={() => setShowCamera(true)} className="bg-blue-600 text-white p-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-700 transition-colors">
                  <Camera />
                </button>
              </div>

              {showCamera && (
                <div className="fixed inset-0 bg-black z-50 p-6 flex flex-col items-center justify-center">
                  <button onClick={() => setShowCamera(false)} className="absolute top-8 right-8 text-white"><X size={48}/></button>
                  <div className="bg-white p-2 rounded-2xl border-4 border-blue-500 overflow-hidden shadow-2xl">
                    <div id="reader" className="w-[300px]"></div>
                  </div>
                  <p className="text-white font-black mt-6 animate-pulse uppercase tracking-widest">Scanning Job Bag...</p>
                </div>
              )}

              {/* JOB LIBRARY (ACTIVE LIST) */}
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="font-black uppercase text-[10px] text-black mb-3 flex items-center gap-2 tracking-widest">Active Jobs in Shop ({activeJobs.length})</h3>
                <div className="grid gap-3">
                  {activeJobs.map(job => (
                    <div 
                      key={job.id} 
                      onClick={() => { setActiveOrder(job); window.scrollTo(0,0); }}
                      className="bg-white p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer flex justify-between items-center group"
                    >
                      <div>
                        <p className="font-black text-xl group-hover:text-blue-600">{job.vtiger_id}</p>
                        <p className="text-[10px] text-black font-black uppercase">{job.client_name || 'Stock Item'}</p>
                      </div>
                      <span className="bg-yellow-300 border-2 border-black px-2 py-1 rounded-lg text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        {job.current_stage}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ACTIVE WORK CARD */
            <div className={`bg-white border-4 p-6 rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in duration-200 ${activeOrder.is_rush ? 'border-red-600 ring-8 ring-red-50' : 'border-black'}`}>
  
            {/* TOP HEADER */}
            <div className="flex justify-between items-start mb-6">
             <div>
                <h2 className="text-5xl font-black tracking-tighter leading-none">{activeOrder.vtiger_id}</h2>
                 <p className="text-black font-black text-xs uppercase mt-2 tracking-widest">{activeOrder.client_name}</p>
              </div>
              <button onClick={() => setActiveOrder(null)} className="text-black hover:text-black-700 transition-colors"><X size={32}/></button>
            </div>

             {/* NEW: THE SMART QR SECTION */}
              <div className="flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-3xl p-6 mb-8">
                 <div className="bg-white p-3 border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-3">
                  <QRCodeCanvas 
                     value={`${window.location.origin}/workshop?search=${activeOrder.vtiger_id}`} 
                    size={160}
                   level={"H"}
                 />
               </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Scan to Sync Device</p>
            </div>

              {/* ACTIONS SECTION */}
              <div className="space-y-4 mb-4">
                <button 
                  disabled={loading}
                  onClick={() => {
                    const stages = ['Goldsmithing', 'Setting', 'QC', 'Completed'];
                    handleMove(stages[stages.indexOf(activeOrder.current_stage) + 1] || 'Completed');
                  }} 
                  className="w-full bg-green-500 text-white p-6 border-4 border-black rounded-3xl font-black text-2xl flex items-center justify-center gap-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle size={28}/> FINISH STAGE</>}
                </button>

                {activeOrder.current_stage === 'QC' && !showRejectMenu && (
                  <button onClick={() => setShowRejectMenu(true)} className="w-full bg-red-50 text-red-600 p-5 border-4 border-red-600 border-dashed rounded-3xl font-black text-lg flex items-center justify-center gap-2">
                    <RotateCcw size={24} /> FAIL QC / REDO
                  </button>
                )}

                  {/* REJECTION MENU (IF OPEN) */}
                  {showRejectMenu && (
                    <div className="bg-red-50 p-6 rounded-3xl border-4 border-black animate-in slide-in-from-top-4">
                      <p className="text-xs font-black uppercase text-red-500 mb-4 tracking-widest text-center">Select Failure Reason</p>
                      <div className="grid gap-2">
                        {REDO_REASONS.map(reason => (
                          <button key={reason} onClick={() => handleMove('Goldsmithing', true, reason)} className="bg-white p-4 border-2 border-black rounded-xl font-black text-sm hover:bg-red-500 hover:text-white transition-all text-left uppercase">
                            {reason}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
          )}
        </>
      ) : (
        /* ANALYTICS VIEW (INTEGRATED) */
        <div className="space-y-6 animate-in fade-in duration-500">
           <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <p className="text-[10px] font-black uppercase text-green-600 mb-1">Total Finished</p>
              <p className="text-5xl font-black">{completions.length}</p>
            </div>
            <div className="bg-white border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <p className="text-[10px] font-black uppercase text-red-600 mb-1">Total Redos</p>
              <p className="text-5xl font-black">{redos.length}</p>
            </div>
          </div>
          
          <div className="bg-black text-white p-6 rounded-3xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-black mb-4">Recent Shop Log</h3>
            <div className="space-y-3">
              {allLogs.slice(0, 5).map((log, i) => (
                <div key={i} className="text-[10px] font-bold border-l-2 border-blue-500 pl-3">
                  {log.staff_name} moved <span className="text-blue-400">{log.order_id}</span> to {log.new_stage}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
// ... existing imports ...
import { Gem, Layers } from 'lucide-react' // Add these icons to your imports

// ... inside WorkshopContent() component ...

  // NEW FUNCTION: Toggle Stone Status
  const toggleStone = async (field, currentValue) => {
    const newValue = !currentValue
    
    // 1. Optimistic Update (Update UI immediately)
    setActiveOrder({ ...activeOrder, [field]: newValue })
    
    // 2. Update Database
    const { error } = await supabase
      .from('orders')
      .update({ [field]: newValue })
      .eq('id', activeOrder.id)

    if (error) {
      alert("Error updating stone status!")
      setActiveOrder({ ...activeOrder, [field]: currentValue }) // Revert if failed
    }
  }

  // ... (Keep existing fetch logic) ...

  return (
    // ... (Keep existing layout) ...

          /* INSIDE THE ACTIVE WORK CARD - Replace the content */
          <div className={`bg-white border-4 p-6 rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in duration-200 ${activeOrder.is_rush ? 'border-red-600 ring-8 ring-red-50' : 'border-black'}`}>
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-5xl font-black tracking-tighter leading-none">{activeOrder.vtiger_id}</h2>
                <p className="text-gray-400 font-black text-xs uppercase mt-2 tracking-widest">{activeOrder.client_name}</p>
              </div>
              <button onClick={() => setActiveOrder(null)} className="text-gray-300 hover:text-black"><X size={32}/></button>
            </div>

            {/* NEW: STONE INDICATORS (CLICK TO TOGGLE) */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button 
                onClick={() => toggleStone('center_stone_received', activeOrder.center_stone_received)}
                className={`p-4 rounded-2xl border-2 border-black flex flex-col items-center justify-center gap-2 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none ${activeOrder.center_stone_received ? 'bg-green-500 text-white' : 'bg-red-50 text-red-500'}`}
              >
                <Gem size={24} className={activeOrder.center_stone_received ? "fill-white" : ""} />
                <span className="text-[10px] font-black uppercase">
                  {activeOrder.center_stone_received ? 'CENTER: RECEIVED' : 'CENTER: MISSING'}
                </span>
              </button>

              <button 
                onClick={() => toggleStone('side_stones_received', activeOrder.side_stones_received)}
                className={`p-4 rounded-2xl border-2 border-black flex flex-col items-center justify-center gap-2 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none ${activeOrder.side_stones_received ? 'bg-green-500 text-white' : 'bg-red-50 text-red-500'}`}
              >
                <Layers size={24} className={activeOrder.side_stones_received ? "fill-white" : ""} />
                <span className="text-[10px] font-black uppercase">
                  {activeOrder.side_stones_received ? 'SIDES: RECEIVED' : 'SIDES: MISSING'}
                </span>
              </button>
            </div>

            {/* QR CODE SECTION */}
            <div className="flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-3xl p-6 mb-4">
              <div className="bg-white p-3 border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-3">
                <QRCodeCanvas value={`${window.location.origin}/workshop?search=${activeOrder.vtiger_id}`} size={160} level={"H"} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Scan to Sync Device</p>
            </div>

            {/* ACTIONS (Finish/Reject) */}
            <div className="space-y-4 mb-4">
              <button 
                disabled={loading}
                onClick={() => {
                  const stages = ['Goldsmithing', 'Setting', 'QC', 'Completed'];
                  handleMove(stages[stages.indexOf(activeOrder.current_stage) + 1] || 'Completed');
                }} 
                className="w-full bg-green-500 text-white p-6 border-4 border-black rounded-3xl font-black text-2xl flex items-center justify-center gap-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle size={28}/> FINISH STAGE</>}
              </button>

              {activeOrder.current_stage === 'QC' && !showRejectMenu && (
                <button onClick={() => setShowRejectMenu(true)} className="w-full bg-red-50 text-red-600 p-5 border-4 border-red-600 border-dashed rounded-3xl font-black text-lg flex items-center justify-center gap-2">
                  <RotateCcw size={24} /> FAIL QC / REDO
                </button>
              )}
               {/* ... (Keep reject menu logic) ... */}
            </div>
          </div>
  )
export default function WorkshopPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center font-black">LOADING WORKSHOP...</div>}>
      <WorkshopContent />
    </Suspense>
  )
}