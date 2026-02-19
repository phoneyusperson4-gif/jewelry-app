/**
 * A styled toggle button used for binary field choices (stone received, rush flag, metal).
 *
 * @param {object}        props
 * @param {boolean}       props.active       - Whether the button is in its "on" state.
 * @param {Function}      props.onClick
 * @param {string}        props.activeClass  - Tailwind classes applied when active.
 * @param {string}        [props.inactiveClass] - Tailwind classes applied when inactive (default: high‑contrast).
 * @param {React.ReactNode} props.children
 * @param {string}        [props.className]  - Optional extra classes.
 */
export function ToggleButton({
  active,
  onClick,
  activeClass,
  inactiveClass = 'bg-white text-black border-2 border-black',
  children,
  className = '',
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        p-2.5 border-2 border-black rounded-lg flex items-center justify-center gap-1.5
        font-bold text-[10px] uppercase
        shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none
        transition-all
        ${active ? activeClass : inactiveClass}
        ${className}
      `}
    >
      {children}
    </button>
  )
}

/**
 * A labelled group of checkboxes for multi-select fields.
 *
 * @param {object}        props
 * @param {string}        props.title    - Section label.
 * @param {React.ElementType} props.icon - Lucide icon component.
 * @param {string[]}      props.options  - All available options.
 * @param {string[]}      props.selected - Currently selected values.
 * @param {Function}      props.onChange - Called with the toggled option string.
 * @param {string}        [props.className] - Optional extra classes.
 */
export function CheckboxGroup({
  title,
  icon: Icon,
  options,
  selected,
  onChange,
  className = '',
}) {
  return (
    <div className={`border-2 border-black rounded-xl p-3 bg-gray-50 text-gray-900 ${className}`}>
      <div className="flex items-center gap-1 text-[10px] font-black uppercase mb-1">
        <Icon size={14} /> {title}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1">
        {options.map(opt => (
          <label key={opt} className="flex items-center gap-1 text-xs capitalize cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-4 h-4 accent-black"
              checked={selected.includes(opt)}
              onChange={() => onChange(opt)}
            />
            {opt}
          </label>
        ))}
      </div>
    </div>
  )
}