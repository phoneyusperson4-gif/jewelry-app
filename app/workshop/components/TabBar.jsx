import { Flame, List, ScanLine } from 'lucide-react'

/**
 * @param {object}   props
 * @param {boolean}  props.active
 * @param {Function} props.onClick
 * @param {string}   [props.activeClass] - Tailwind classes applied to the active state.
 * @param {React.ReactNode} props.children
 */
function TabButton({ active, onClick, activeClass = 'bg-white text-black', children }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 flex items-center justify-center gap-1
        py-3 rounded-lg font-black text-[10px] md:text-xs transition-all
        ${active ? activeClass : 'text-gray-400 hover:text-white'}
      `}
    >
      {children}
    </button>
  )
}

/**
 * Three-tab navigation bar rendered inside a black pill at the top of the page.
 *
 * @param {object}   props
 * @param {'scanner'|'overview'|'rush'} props.activeTab
 * @param {Function} props.onTabChange - Called with the new tab name.
 * @param {number}   props.totalJobs   - Badge count shown on the ACTIVE tab.
 * @param {number}   props.rushCount   - Badge count shown on the RUSH tab.
 */
export function TabBar({ activeTab, onTabChange, totalJobs, rushCount }) {
  return (
    <div className="flex bg-black p-1 rounded-xl mb-6 shadow-xl gap-1">
      <TabButton
        active={activeTab === 'scanner'}
        onClick={() => onTabChange('scanner')}
      >
        <ScanLine size={14} /> SCANNER
      </TabButton>

      <TabButton
        active={activeTab === 'overview'}
        onClick={() => onTabChange('overview')}
      >
        <List size={14} /> ACTIVE ({totalJobs})
      </TabButton>

      <TabButton
        active={activeTab === 'rush'}
        activeClass="bg-red-500 text-white"
        onClick={() => onTabChange('rush')}
      >
        <Flame size={14} className={activeTab === 'rush' ? 'animate-pulse' : ''} />
        RUSH ({rushCount})
      </TabButton>
    </div>
  )
}
