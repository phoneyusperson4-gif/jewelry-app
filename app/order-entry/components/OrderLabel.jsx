import dynamic from 'next/dynamic'
import { CheckCircle2, PlusCircle, Printer } from 'lucide-react'

const QRCodeCanvas = dynamic(
  () => import('qrcode.react').then(m => m.QRCodeCanvas),
  { ssr: false }
)

// Module-level constant — never changes, no need to recompute
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://atelier-os.vercel.app'

/**
 * Renders a value as a comma-joined string, or a fallback if empty.
 * @param {string[]} arr
 * @param {string}   fallback
 */
function listOrFallback(arr, fallback = '—') {
  return arr?.length ? arr.join(', ') : fallback
}

/**
 * A single row in the A4 spec table.
 * Using a plain function (not a component) because it's only used inside the
 * print label and never needs independent memoization.
 */
function SpecRow({ label, value, highlight = false }) {
  if (!value) return null
  return (
    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
      <td style={{
        padding: '5px 8px',
        fontSize: 9,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: '#6b7280',
        whiteSpace: 'nowrap',
        verticalAlign: 'top',
        width: 110,
      }}>
        {label}
      </td>
      <td style={{
        padding: '5px 8px',
        fontSize: 10,
        fontWeight: highlight ? 900 : 700,
        color: '#111',
        verticalAlign: 'top',
      }}>
        {value}
      </td>
    </tr>
  )
}

/**
 * The preview card shown in the browser after a successful order save,
 * plus a hidden A4 print sheet revealed only when the browser's print dialog opens.
 *
 * Print behaviour:
 * - A `<style>` tag scoped inside this component instructs the browser to hide
 *   everything on the page except `#print-sheet` when printing.
 * - `#print-sheet` is `display:none` in normal view and `display:block` in print.
 * - The preview card (`#screen-preview`) is `display:none` in print.
 *
 * @param {object}   props
 * @param {object}   props.order     - Saved order from Supabase.
 * @param {Function} props.onReset   - Callback to clear the saved order.
 */
export function OrderLabel({ order, onReset }) {
  const qrValue = `${SITE_URL}/workshop?search=${order.vtiger_id}`

  return (
    <>
      {/* ── Print stylesheet ─────────────────────────────────────────────── */}
      {/* Scoped inside this component so it only exists when a label is shown */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 14mm;
          }
          body * { visibility: hidden !important; }
          #print-sheet,
          #print-sheet * { visibility: visible !important; }
          #print-sheet {
            position: fixed !important;
            inset: 0 !important;
            display: block !important;
          }
          #screen-preview { display: none !important; }
        }
      `}</style>

      {/* ── Screen preview card ───────────────────────────────────────────── */}
      <div id="screen-preview" className="animate-in zoom-in duration-300 flex flex-col items-center">
        <div className="bg-green-100 text-green-700 px-3 py-0.5 rounded-full text-[8px] font-black uppercase mb-4 flex items-center gap-1">
          <CheckCircle2 size={10} /> Saved
        </div>

        <div className="bg-white border-2 border-black p-4 w-52 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] flex flex-col items-center text-center">
          {order.is_rush && (
            <span className="bg-red-500 text-white text-[7px] font-black uppercase px-2 py-0.5 mb-2 rounded">
              🔥 RUSH
            </span>
          )}
          <h2 className="text-2xl font-black mb-0.5 leading-none">{order.vtiger_id}</h2>
          <p className="text-[8px] font-black uppercase text-blue-600 mb-1">{order.article_code}</p>
          {order.metal && (
            <p className="text-[7px] font-bold uppercase text-gray-500 mb-2">{order.metal}</p>
          )}
          <div className="bg-white p-1 border border-black rounded mb-2">
            <QRCodeCanvas value={qrValue} size={100} level="H" />
          </div>

          {/* Stone status pills */}
          <div className="flex gap-1 w-full mb-1">
            {[
              { label: 'Center', active: order.center_stone_received },
              { label: 'Sides',  active: order.side_stones_received  },
            ].map(({ label, active }) => (
              <span
                key={label}
                className={`flex-1 py-0.5 text-[6px] font-black uppercase border border-black rounded ${active ? 'bg-black text-white' : 'bg-white text-gray-300 line-through'}`}
              >
                {label}
              </span>
            ))}
          </div>

          {order.deadline && (
            <p className="text-[7px] font-bold text-red-500 uppercase mt-0.5">
              Due: {new Date(order.deadline).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>

        <button
          onClick={() => window.print()}
          className="mt-4 flex items-center gap-1 font-black uppercase text-xs border-b border-black pb-0.5 hover:text-blue-600 transition-colors"
        >
          <Printer size={12} /> Print A4 Label
        </button>
        <button
          onClick={onReset}
          className="mt-2 text-[10px] font-bold text-gray-500 hover:text-black transition-colors"
        >
          Create another?
        </button>
      </div>

      {/* ── A4 print sheet (hidden on screen) ────────────────────────────── */}
      <div id="print-sheet" style={{ display: 'none', fontFamily: "'DM Mono', 'Courier New', monospace" }}>

        {/* Header strip */}
        <div style={{
          background: '#000',
          color: '#fff',
          padding: '14px 18px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          borderRadius: 4,
        }}>
          <div>
            {order.is_rush && (
              <div style={{
                display: 'inline-block',
                background: '#ef4444',
                color: '#fff',
                fontSize: 8,
                fontWeight: 900,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: 2,
                marginBottom: 6,
              }}>
                🔥 RUSH ORDER
              </div>
            )}
            <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>
              {order.vtiger_id}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#93c5fd', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {order.article_code}
            </div>
          </div>

          {/* QR code — right-aligned in header */}
          <div style={{
            background: '#fff',
            padding: 8,
            borderRadius: 4,
            flexShrink: 0,
          }}>
            <QRCodeCanvas value={qrValue} size={100} level="H" includeMargin={false} />
          </div>
        </div>

        {/* Two-column body */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

          {/* ── Left col: core specs ── */}
          <div style={{ border: '1.5px solid #000', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              background: '#f3f4f6',
              padding: '5px 8px',
              fontSize: 8,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              borderBottom: '1.5px solid #000',
            }}>
              Job Details
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <SpecRow label="Stage"       value={order.current_stage} highlight />
                <SpecRow label="Metal"       value={order.metal} />
                <SpecRow label="Ring Size"   value={order.ring_size} />
                <SpecRow label="Deadline"    value={order.deadline ? new Date(order.deadline).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : null} />
                <SpecRow
                  label="Center Stone"
                  value={order.center_stone_received ? '✓ Received' : '✗ Not received'}
                />
                <SpecRow
                  label="Side Stones"
                  value={order.side_stones_received ? '✓ Received' : '✗ Not received'}
                />
              </tbody>
            </table>
          </div>

          {/* ── Right col: settings & finish ── */}
          <div style={{ border: '1.5px solid #000', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              background: '#f3f4f6',
              padding: '5px 8px',
              fontSize: 8,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              borderBottom: '1.5px solid #000',
            }}>
              Specifications
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <SpecRow label="Central Setting" value={listOrFallback(order.setting_central)} />
                <SpecRow label="Small Setting"   value={listOrFallback(order.setting_small)} />
                <SpecRow label="Finish"          value={listOrFallback(order.finish)} />
                {(order.engraving_company || order.engraving_personal) && (
                  <SpecRow
                    label="Engraving"
                    value={[
                      order.engraving_company  ? 'Company'  : null,
                      order.engraving_personal ? `Personal${order.engraving_font ? ` (${order.engraving_font})` : ''}` : null,
                    ].filter(Boolean).join(' · ')}
                  />
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notes / description — full width */}
        {order.description && (
          <div style={{ marginTop: 14, border: '1.5px solid #000', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              background: '#f3f4f6',
              padding: '5px 8px',
              fontSize: 8,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              borderBottom: '1.5px solid #000',
            }}>
              Notes &amp; Instructions
            </div>
            <p style={{ padding: '8px 10px', fontSize: 10, fontWeight: 600, color: '#374151', margin: 0, lineHeight: 1.5 }}>
              {order.description}
            </p>
          </div>
        )}

        {/* Technician sign-off row */}
        <div style={{
          marginTop: 14,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 10,
        }}>
          {['Goldsmithing', 'Setting', 'Polishing', 'QC'].map(stage => (
            <div
              key={stage}
              style={{
                border: '1.5px solid #000',
                borderRadius: 4,
                padding: '8px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 7, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280', marginBottom: 20 }}>
                {stage}
              </div>
              <div style={{ borderTop: '1px solid #d1d5db', paddingTop: 4, fontSize: 7, color: '#9ca3af' }}>
                Technician
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 14,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1.5px solid #000',
          paddingTop: 8,
        }}>
          <span style={{ fontSize: 7, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Created: {new Date().toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          <span style={{ fontSize: 7, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Atelier OS · {order.vtiger_id}
          </span>
        </div>
      </div>
    </>
  )
}

/**
 * Placeholder shown in the preview pane before any order is saved.
 */
export function LabelPlaceholder() {
  return (
    <div className="text-center space-y-2">
      <div className="bg-black w-16 h-16 rounded-full flex items-center justify-center mx-auto">
        <PlusCircle className="text-white" size={32} />
      </div>
      <p className="font-black text-black uppercase text-[10px] tracking-widest">Label Preview</p>
      <p className="text-[9px] text-gray-400">Fill in the form and hit Create Job</p>
    </div>
  )
}
