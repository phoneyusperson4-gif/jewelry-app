'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Camera, Search, User, X, RotateCcw, CheckCircle } from 'lucide-react'

const STAFF_MEMBERS = ['Goldsmith 1', 'Goldsmith 2', 'Setter 1', 'Setter 2', 'QC']
const REDO_REASONS = ['Loose Stone', 'Polishing Issue', 'Sizing Error', 'Metal Flaw', 'Other']

export default function WorkshopDashboard() {
  const [searchId, setSearchId] = useState('')
  const [activeOrder, setActiveOrder] = useState(null)
  const [staffName, setStaffName] = useState(STAFF_MEMBERS[0])
  const [showCamera, setShowCamera] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showRejectMenu, setShowRejectMenu] = useState(false)

  // Camera Logic
  useEffect(() => {
    if (showCamera) {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } });
      scanner.render((decodedText) => {
        setSearchId(decodedText);
        findOrder(decodedText);
        scanner.clear();
        setShowCamera(false);
      }, (error) => {});
      return () => scanner.clear();
    }
  }, [showCamera]);

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
        redo_reason: reason // This tracks why it failed QC
      }]);
      alert(isRejection ? `⚠️ Sent back to ${nextStage}` : `✅ Moved to ${nextStage}`);
      setActiveOrder(null);
      setSearchId('');
      setShowRejectMenu(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 bg-gray-50 min-h-screen">
      {/* STAFF SELECTOR */}
      <div className="mb-6 bg-white p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <label className="text-[10px] font-black uppercase text-gray-400">Current Staff</label>
        <select className="w-full font-black text-lg bg-transparent outline-none" value={staffName} onChange={(e) => setStaffName(e.target.value)}>
          {STAFF_MEMBERS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {!activeOrder && (
        <div className="flex gap-2">
          <input type="text" placeholder="SCAN ID..." className="flex-1 p-4 border-4 border-black rounded-xl font-black text-xl" value={searchId} onChange={(e) => setSearchId(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && findOrder()} />
          <button onClick={() => setShowCamera(true)} className="bg-blue-600 text-white p-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"><Camera /></button>
          {showCamera && <div className="fixed inset-0 bg-black z-50 p-6"><button onClick={() => setShowCamera(false)} className="text-white mb-4"><X size={40}/></button><div id="reader" className="bg-white rounded-xl"></div></div>}
        </div>
      )}

      {activeOrder && (
        <div className={`bg-white border-4 p-6 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${activeOrder.is_rush ? 'border-red-600 ring-4 ring-red-200' : 'border-black'}`}>
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-4xl font-black">{activeOrder.vtiger_id}</h2>
            <span className="bg-yellow-300 border-2 border-black px-3 py-1 rounded-lg font-black text-xs">{activeOrder.current_stage}</span>
          </div>

          <div className="space-y-3 mb-8">
            {/* NORMAL PROGRESSION BUTTON */}
            <button 
              onClick={() => {
                const stages = ['Goldsmithing', 'Setting', 'QC', 'Completed'];
                handleMove(stages[stages.indexOf(activeOrder.current_stage) + 1] || 'Completed');
              }}
              className="w-full bg-green-500 text-white p-5 border-4 border-black rounded-2xl font-black text-xl flex items-center justify-center gap-2"
            >
              <CheckCircle /> FINISH STAGE
            </button>

            {/* REJECTION BUTTON (Only visible in QC) */}
            {activeOrder.current_stage === 'QC' && !showRejectMenu && (
              <button 
                onClick={() => setShowRejectMenu(true)}
                className="w-full bg-orange-100 text-orange-600 p-4 border-2 border-orange-600 rounded-2xl font-black flex items-center justify-center gap-2"
              >
                <RotateCcw size={20} /> REJECT / NEEDS FIX
              </button>
            )}

            {showRejectMenu && (
              <div className="bg-orange-50 p-4 rounded-2xl border-2 border-orange-200 animate-in fade-in zoom-in duration-200">
                <p className="text-[10px] font-black uppercase text-orange-400 mb-3">Select Redo Reason</p>
                <div className="grid grid-cols-1 gap-2">
                  {REDO_REASONS.map(reason => (
                    <button 
                      key={reason}
                      onClick={() => handleMove('Goldsmithing', true, reason)}
                      className="bg-white p-3 border-2 border-black rounded-xl font-bold text-sm hover:bg-orange-500 hover:text-white transition-colors text-left"
                    >
                      {reason}
                    </button>
                  ))}
                  <button onClick={() => setShowRejectMenu(false)} className="text-xs font-bold text-gray-400 mt-2 italic text-center underline">Cancel Rejection</button>
                </div>
              </div>
            )}
          </div>
          
          <button onClick={() => setActiveOrder(null)} className="w-full text-gray-400 font-bold py-2">Back to Scanner</button>
        </div>
      )}
    </div>
  )
}