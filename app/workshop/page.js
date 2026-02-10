'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Camera, CheckCircle, Search, User, X } from 'lucide-react'

const STAFF_MEMBERS = ['Goldsmith 1', 'Goldsmith 2', 'Setter 1', 'Setter 2', 'QC']

export default function WorkshopDashboard() {
  const [searchId, setSearchId] = useState('')
  const [activeOrder, setActiveOrder] = useState(null)
  const [staffName, setStaffName] = useState(STAFF_MEMBERS[0])
  const [showCamera, setShowCamera] = useState(false)
  const [loading, setLoading] = useState(false)

  // 1. Camera Logic
  useEffect(() => {
    if (showCamera) {
      const scanner = new Html5QrcodeScanner("reader", { 
        fps: 10, 
        qrbox: { width: 250, height: 250 } 
      });

      scanner.render((decodedText) => {
        setSearchId(decodedText);
        findOrder(decodedText); // Auto-find when scanned
        scanner.clear();
        setShowCamera(false);
      }, (error) => { /* Ignore errors */ });

      return () => scanner.clear();
    }
  }, [showCamera]);

  const findOrder = async (idToSearch = searchId) => {
    const cleanId = idToSearch.toUpperCase().trim();
    if (!cleanId) return;

    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, production_logs(*)')
      .eq('vtiger_id', cleanId)
      .single();

    if (data) {
      if (data.current_stage === 'At Casting') {
        alert("Still at Casting House!");
      } else {
        setActiveOrder(data);
      }
    } else {
      alert("Order not found!");
    }
    setLoading(false);
  }

  const completeStage = async () => {
    const stages = ['Goldsmithing', 'Setting', 'QC', 'Completed'];
    const currentIndex = stages.indexOf(activeOrder.current_stage);
    const nextStage = stages[currentIndex + 1] || 'Completed';

    const { error } = await supabase.from('orders').update({ current_stage: nextStage }).eq('id', activeOrder.id);
    
    if (!error) {
      await supabase.from('production_logs').insert([{
        order_id: activeOrder.id,
        staff_name: staffName,
        previous_stage: activeOrder.current_stage,
        new_stage: nextStage
      }]);
      alert("Moved to " + nextStage);
      setActiveOrder(null);
      setSearchId('');
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 bg-gray-50 min-h-screen">
      {/* STAFF SELECTOR */}
      <div className="mb-6 bg-white p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <label className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-1">
          <User size={12}/> Current Staff
        </label>
        <select 
          className="w-full font-black text-lg bg-transparent outline-none"
          value={staffName} 
          onChange={(e) => setStaffName(e.target.value)}
        >
          {STAFF_MEMBERS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* SCANNING CONTROLS */}
      {!activeOrder && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input 
                type="text" 
                placeholder="TYPE OR SCAN ID..."
                className="w-full p-4 border-4 border-black rounded-xl font-black uppercase text-xl"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && findOrder()}
              />
              <button onClick={() => findOrder()} className="absolute right-3 top-4 text-black">
                <Search />
              </button>
            </div>
            
            {/* THE SCANNING BUTTON */}
            <button 
              onClick={() => setShowCamera(true)}
              className="bg-blue-600 text-white p-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:mt-1"
            >
              <Camera size={28} />
            </button>
          </div>

          {showCamera && (
            <div className="fixed inset-0 bg-black z-50 p-6 flex flex-col">
              <button onClick={() => setShowCamera(false)} className="text-white self-end mb-4"><X size={40}/></button>
              <div id="reader" className="bg-white rounded-xl overflow-hidden"></div>
              <p className="text-white text-center mt-4 font-bold">Align QR Code inside the box</p>
            </div>
          )}
        </div>
      )}

      {/* ACTIVE JOB CARD */}
      {activeOrder && (
        <div className="bg-white border-4 border-black p-6 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex justify-between border-b-2 border-gray-100 pb-4 mb-4">
            <div>
              <h2 className="text-4xl font-black">{activeOrder.vtiger_id}</h2>
              <p className="font-bold text-gray-500 uppercase">{activeOrder.client_name}</p>
            </div>
            <span className="bg-yellow-300 border-2 border-black px-3 py-1 rounded-lg font-black h-fit text-xs">
              {activeOrder.current_stage}
            </span>
          </div>

          {/* HISTORY PREVIEW */}
          <div className="mb-6">
            <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Order History</p>
            {activeOrder.production_logs?.map((l, i) => (
              <div key={i} className="text-xs font-bold border-l-2 border-blue-500 pl-2 mb-1">
                {l.new_stage} by {l.staff_name}
              </div>
            ))}
          </div>

          <button 
            onClick={completeStage}
            className="w-full bg-green-500 text-white p-5 border-4 border-black rounded-2xl font-black text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1"
          >
            FINISH & MOVE TO NEXT STAGE
          </button>
        </div>
      )}
    </div>
  )
}