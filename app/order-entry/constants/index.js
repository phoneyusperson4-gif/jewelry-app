/**
 * Setting options for the central stone.
 * @type {string[]}
 */
export const SETTING_CENTRAL_OPTIONS = ['round', 'tiger', 'bezel', 'square', 'v-shape', 'other']

/**
 * Setting options for small/side stones.
 * @type {string[]}
 */
export const SETTING_SMALL_OPTIONS = ['prong', 'pave', 'castle', 'flush', 'perle', 'bezel']

/**
 * Finish type options.
 * @type {string[]}
 */
export const FINISH_OPTIONS = ['polished', 'rhodium', 'mat']

/**
 * Metal type options with display label and active colour class.
 * @type {Array<{ value: string, label: string, activeClass: string }>}
 */
export const METAL_OPTIONS = [
  { value: 'Au', label: 'Au', activeClass: 'bg-yellow-500 text-white' },
  { value: 'PT', label: 'PT', activeClass: 'bg-gray-400 text-white'   },
]

/**
 * Default form state. Import and spread to reset the form.
 */
export const INITIAL_FORM = {
  vtiger_id:             '',
  article_code:          '',
  description:           '',
  current_stage:         'At Casting',
  is_rush:               false,
  center_stone_received: false,
  side_stones_received:  false,
  metal:                 'Au',
  engraving_company:     false,
  engraving_personal:    false,
  engraving_font:        '',
  setting_central:       [],
  setting_small:         [],
  finish:                [],
  ring_size:             '',
  deadline:              '',
}
