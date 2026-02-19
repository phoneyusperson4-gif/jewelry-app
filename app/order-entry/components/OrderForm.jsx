import { Gem, Layers, Type, Sparkles, Circle, Ruler, PackagePlus } from 'lucide-react'
import { ToggleButton, CheckboxGroup } from '@/app/order-entry/components/FormControls'
import {
  SETTING_CENTRAL_OPTIONS,
  SETTING_SMALL_OPTIONS,
  FINISH_OPTIONS,
  METAL_OPTIONS,
} from '@/app/order-entry/constants'

export function OrderForm({ formData, loading, error, updateField, toggleArray, onSubmit }) {
  // Common style for labels on the DARK background
  const labelStyle = "text-xs font-black uppercase text-gray-400 mb-0.5 block";

  return (
    <div className="space-y-4 text-white"> {/* Explicitly set base text to white for dark mode */}
      <div className="flex items-center gap-2 mb-2">
        <div className="bg-white text-black p-1.5 rounded-lg">
          <PackagePlus size={20} />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tighter">New Job</h1>
      </div>

      {error && (
        <div className="bg-red-100 border-2 border-red-500 text-red-700 p-3 rounded-xl font-bold text-xs">
          Error: {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">

        {/* Job ID + Priority */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelStyle}>Job ID</label>
            <input
              required type="text" placeholder="SO-1234"
              // Added text-black and explicit bg-white to ensure visibility
              className="w-full p-2.5 bg-white text-black border-2 border-black rounded-lg font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none focus:bg-yellow-50"
              value={formData.vtiger_id}
              onChange={e => updateField('vtiger_id', e.target.value.toUpperCase())}
            />
          </div>
          <div>
            <label className={labelStyle}>Priority</label>
            <button
              type="button"
              onClick={() => updateField('is_rush', !formData.is_rush)}
              className={`w-full p-2.5 border-2 border-black rounded-lg font-bold text-xs transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none ${formData.is_rush ? 'bg-red-500 text-white' : 'bg-white text-black'}`}
            >
              {formData.is_rush ? '🔥 RUSH' : 'STANDARD'}
            </button>
          </div>
        </div>

        {/* Article Code + Metal */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelStyle}>Article Code</label>
            <input
              required type="text" placeholder="RNG-782-YG"
              className="w-full p-2.5 bg-white text-black border-2 border-black rounded-lg font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none"
              value={formData.article_code}
              onChange={e => updateField('article_code', e.target.value.toUpperCase())}
            />
          </div>
          <div>
            <label className={labelStyle}>Metal</label>
            <div className="grid grid-cols-2 gap-2">
              {METAL_OPTIONS.map(({ value, label, activeClass }) => (
                <button
                  key={value} type="button"
                  onClick={() => updateField('metal', value)}
                  className={`p-2 border-2 border-black rounded-lg font-bold text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none ${formData.metal === value ? activeClass : 'bg-white text-black'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ring Size + Deadline */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={`${labelStyle} flex items-center gap-1`}>
              <Ruler size={12} /> Ring Size
            </label>
            <input
              type="text" placeholder="6.5 / L / 52"
              className="w-full p-2.5 bg-white text-black border-2 border-black rounded-lg font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none"
              value={formData.ring_size}
              onChange={e => updateField('ring_size', e.target.value)}
            />
          </div>
          <div>
            <label className={labelStyle}>Deadline</label>
            <input
              type="date"
              className="w-full p-2.5 bg-white text-black border-2 border-black rounded-lg font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none"
              value={formData.deadline}
              onChange={e => updateField('deadline', e.target.value)}
            />
          </div>
        </div>

        {/* Stones received */}
        <div className="grid grid-cols-2 gap-3">
          <ToggleButton
            active={formData.center_stone_received}
            onClick={() => updateField('center_stone_received', !formData.center_stone_received)}
            activeClass="bg-green-600 text-white"
            // Ensure the inactive state is visible
            inactiveClass="bg-white text-black"
          >
            <Gem size={14} /> {formData.center_stone_received ? 'Center: OK' : 'Center: Missing'}
          </ToggleButton>
          <ToggleButton
            active={formData.side_stones_received}
            onClick={() => updateField('side_stones_received', !formData.side_stones_received)}
            activeClass="bg-green-600 text-white"
            inactiveClass="bg-white text-black"
          >
            <Layers size={14} /> {formData.side_stones_received ? 'Sides: OK' : 'Sides: Missing'}
          </ToggleButton>
        </div>

        {/* Engraving - EXPLICIT TEXT BLACK HERE */}
        <div className="border-2 border-black rounded-xl p-3 bg-gray-100 text-black space-y-2" style={{ colorScheme: 'light' }}>
          <div className="flex items-center gap-1 text-[10px] font-black uppercase"><Type size={14} /> Engraving</div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1 text-xs cursor-pointer select-none font-bold">
              <input
                type="checkbox" className="w-4 h-4 accent-black"
                checked={formData.engraving_company}
                onChange={e => updateField('engraving_company', e.target.checked)}
              />
              Company
            </label>
            <div className="flex items-center gap-1">
              <label className="flex items-center gap-1 text-xs cursor-pointer select-none font-bold">
                <input
                  type="checkbox" className="w-4 h-4 accent-black"
                  checked={formData.engraving_personal}
                  onChange={e => updateField('engraving_personal', e.target.checked)}
                />
                Personal
              </label>
              {formData.engraving_personal && (
                <input
                  type="text" placeholder="Font"
                  className="border-2 border-black p-1 rounded-lg text-xs w-24 bg-white text-black"
                  value={formData.engraving_font}
                  onChange={e => updateField('engraving_font', e.target.value)}
                />
              )}
            </div>
          </div>
        </div>

        {/* Checkbox Groups - Wrapping in a div to force light context if needed */}
        <div className="space-y-4" style={{ colorScheme: 'light' }}>
            <CheckboxGroup
            title="Setting Central" icon={Sparkles}
            options={SETTING_CENTRAL_OPTIONS}
            selected={formData.setting_central}
            onChange={opt => toggleArray('setting_central', opt)}
            className="text-black bg-white" // Passing these as props if your component supports it
            />

            <CheckboxGroup
            title="Setting Small" icon={Layers}
            options={SETTING_SMALL_OPTIONS}
            selected={formData.setting_small}
            onChange={opt => toggleArray('setting_small', opt)}
            className="text-black bg-white"
            />

            <CheckboxGroup
            title="Finish" icon={Circle}
            options={FINISH_OPTIONS}
            selected={formData.finish}
            onChange={opt => toggleArray('finish', opt)}
            className="text-black bg-white"
            />
        </div>

        {/* Description */}
        <div>
          <label className={labelStyle}>Details / Notes</label>
          <textarea
            rows={2}
            className="w-full p-2.5 bg-white text-black border-2 border-black rounded-lg font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none resize-none"
            value={formData.description}
            onChange={e => updateField('description', e.target.value)}
          />
        </div>

        <button
          disabled={loading} type="submit"
          className="w-full bg-blue-600 text-white p-3.5 border-2 border-black rounded-xl font-black text-base shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'SAVING…' : 'CREATE JOB'}
        </button>
      </form>
    </div>
  )
}