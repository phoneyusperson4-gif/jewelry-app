/**
 * Production stage pipeline — order matters.
 * Add/reorder stages here; all stage-progression logic derives from this array.
 * @type {string[]}
 */
export const STAGES = [
  'At Casting',
  'Casted',
  'Goldsmithing',
  'Setting',
  'Polishing',
  'QC',
  'Completed',
]

/**
 * Staff members available for attribution in production logs.
 * @type {string[]}
 */
export const STAFF_MEMBERS = [
  'Goldsmith 1',
  'Goldsmith 2',
  'Setter 1',
  'Setter 2',
  'Polisher 1',
  'QC',
]

/**
 * Selectable reasons when a QC technician sends a job back to Goldsmithing.
 * @type {string[]}
 */
export const REDO_REASONS = [
  'Loose Stone',
  'Polishing Issue',
  'Sizing Error',
  'Metal Flaw',
  'Other',
]

/**
 * How long (ms) before the same order can be scanned again.
 * Prevents accidental double-scans on a slow conveyor.
 */
export const COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes
