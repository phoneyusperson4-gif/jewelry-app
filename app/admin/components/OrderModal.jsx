'use client'
import { memo } from 'react'
import { X } from 'lucide-react'
import { TimeBreakdown } from '@/app/admin/components/TimeBreakdown' // ✅ Matches the Named Export

export const OrderModal = memo(function OrderModal({ order, onClose }) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white border-[6px] border-black p-8 rounded-[3rem] shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] w-full max-w-lg animate-in zoom-in duration-150">

        {/* Header */}
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-5xl font-black tracking-tighter leading-none">{order.vtiger_id}</h2>
              {order.is_rush && (
                <span className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-black uppercase">RUSH</span>
              )}
            </div>
            <p className="text-blue-600 font-black text-sm uppercase mt-3 bg-blue-50 inline-block px-3 py-1 rounded-lg">
              Model: {order.article_code}
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-black text-white p-3 rounded-full hover:rotate-90 hover:scale-110 transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* The Time Breakdown Section */}
        <TimeBreakdown order={order} />

        {/* Footer info */}
        <div className="mt-8 grid grid-cols-2 gap-3">
          <div className="bg-gray-50 border-2 border-black p-3 rounded-2xl text-center">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Order Date</p>
            <p className="text-xs font-black">{new Date(order.created_at).toLocaleDateString()}</p>
          </div>
          <div className="bg-gray-50 border-2 border-black p-3 rounded-2xl text-center">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Current Status</p>
            <p className="text-xs font-black uppercase text-green-600">{order.current_stage}</p>
          </div>
        </div>
      </div>
    </div>
  )
})