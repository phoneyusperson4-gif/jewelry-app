import { Factory, Gem, Hammer, Sparkles } from 'lucide-react'

/**
 * Static kanban column definitions for the live board.
 *
 * Each entry maps a display column to one or more `current_stage` values in the DB.
 * Add new stages here without touching any component code.
 *
 * @type {Array<{
 *   key:    string,
 *   title:  string,
 *   icon:   React.ReactNode,
 *   stages: string[],
 *   color:  { bg: string, border: string, text: string, accent: string }
 * }>}
 */
export const KANBAN_COLUMNS = [
  {
    key:    'Casting',
    title:  'Casting',
    icon:   <Factory size={18} />,
    stages: ['At Casting'],
    color:  { bg: 'bg-blue-50',    border: 'border-blue-600',    text: 'text-blue-700',    accent: 'border-blue-200'    },
  },
  {
    key:    'Goldsmithing',
    title:  'Goldsmithing',
    icon:   <Hammer size={18} />,
    stages: ['Goldsmithing'],
    color:  { bg: 'bg-orange-50',  border: 'border-orange-500',  text: 'text-orange-700',  accent: 'border-orange-200'  },
  },
  {
    key:    'Setting',
    title:  'Setting',
    icon:   <Gem size={18} />,
    stages: ['Setting'],
    color:  { bg: 'bg-purple-50',  border: 'border-purple-600',  text: 'text-purple-700',  accent: 'border-purple-200'  },
  },
  {
    key:    'Polishing',
    title:  'Polishing',
    icon:   <Sparkles size={18} />,
    stages: ['Polishing', 'QC'],
    color:  { bg: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-700', accent: 'border-emerald-200' },
  },
]
