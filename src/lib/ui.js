// Shared Tailwind utility strings for recurring page patterns (records tables,
// pills, action buttons, forms, panels). Keeping them here lets every page
// stay consistent without repeating long class lists.

/** Data table (replaces `.records-table` + th/td rules). */
export const TABLE =
  'w-full border-collapse text-left text-[13.5px] ' +
  '[&_th]:border-b [&_th]:border-line [&_th]:bg-[#f4faf8] [&_th]:p-[12px_14px] [&_th]:font-extrabold [&_th]:text-ink ' +
  '[&_td]:border-b [&_td]:border-line [&_td]:p-[12px_14px] ' +
  '[&_tr:last-child_td]:border-b-0'

/** Soft rounded pill button (replaces `.secondary-pill`). */
export const PILL =
  'cursor-pointer rounded-full border-0 bg-bg px-[14px] py-2 text-[13px] font-extrabold text-primary transition-all duration-200 hover:bg-[#dbeae5]'

/** Primary solid button (replaces `.primary-action`). */
export const PRIMARY_BTN =
  'min-h-11 cursor-pointer rounded-lg bg-primary px-[18px] font-extrabold text-white shadow-[0_12px_22px_rgba(var(--color-primary-rgb),0.2)]'

/** Text/number input (replaces `.search-input`). */
export const SEARCH_INPUT =
  'min-w-[180px] rounded-md border border-[#d4e4e0] px-3 py-2 text-[13px] text-ink placeholder:text-muted'

/** Select dropdown (replaces `.filter-select` / `.status-selector-table`). */
export const SELECT_INPUT =
  'cursor-pointer rounded-md border border-[#d4e4e0] bg-white px-3 py-2 text-[13px] text-ink'

/** Side form layout (replaces `.sidebar-form`). */
export const SIDEBAR_FORM = 'mt-[14px] flex flex-col gap-3'

/** Side form label (replaces `.sidebar-form label`). */
export const FORM_LABEL = 'flex flex-col gap-[5px] text-[12.5px] font-extrabold text-ink'

/** Side form field (replaces `.sidebar-form input/select/textarea`). */
export const FORM_FIELD = 'w-full rounded-md border border-[#d4e4e0] p-[10px] text-[13px]'

/** White card (replaces `.panel` / `.stat-card` surface). */
export const PANEL =
  'rounded-lg border border-line-strong bg-white p-[18px] shadow-[0_16px_34px_rgba(38,71,67,0.08)]'

/** Panel title row (replaces `.panel-header`). */
export const PANEL_HEADER = 'mb-[15px] flex items-center justify-between gap-3'

/** Kicker text (replaces the `.page-heading p` / `.panel-header p` style). */
export const KICKER = 'mb-1 text-[12px] font-extrabold uppercase tracking-normal text-muted-soft'

/** Two-column grid of form fields (replaces `.form-row-grid`). */
export const FORM_ROW = 'grid grid-cols-2 gap-[10px]'

/* --- Small action buttons (replace `.btn-*-small` and `.btn-action-*`) ----- */

export const BTN_SM_BASE =
  'cursor-pointer rounded-md px-2 py-1 text-[12px] font-extrabold transition-all duration-200'

export const BTN_SUCCESS = BTN_SM_BASE + ' bg-[#dff6dd] text-[#1e5a1b]'
export const BTN_DANGER = BTN_SM_BASE + ' bg-[#ffebe0] text-[#a33c12]'
export const BTN_INFO = BTN_SM_BASE + ' bg-bg text-primary'
export const BTN_WARN = BTN_SM_BASE + ' bg-[#fff3d6] text-[#8a5a00]'
export const BTN_NEUTRAL = BTN_SM_BASE + ' bg-[#eef2f1] text-[#4d615e]'
export const BTN_VIEW = BTN_SM_BASE + ' bg-[#e8f0fe] text-[#1a56c4]'
export const BTN_PRIMARY = BTN_SM_BASE + ' bg-[#e1f5fe] text-[#0d47a1]'

export const BTN_ACTION_SUCCESS =
  'cursor-pointer rounded-md bg-success px-3 py-[6px] text-[12px] font-extrabold text-white transition-all duration-200 hover:bg-[#238b55]'
export const BTN_ACTION_DANGER =
  'cursor-pointer rounded-md bg-accent px-3 py-[6px] text-[12px] font-extrabold text-white transition-all duration-200 hover:bg-[#b6451e]'

/* --- Disposition tags (replace `.dispo-tag` + `.dispo-*` colors) ---------- */

export const DISPO_TAG = 'inline-flex rounded-[4px] px-2 py-[3px] text-[11px] font-bold'

/** Maps a disposition string to the matching tag color pair. */
export function dispoClasses(disposition) {
  const d = disposition.toLowerCase()
  if (d.includes('class')) return 'bg-[#e8f5e9] text-[#2e7d32]'
  if (d.includes('home')) return 'bg-[#fff3e0] text-[#ef6c00]'
  if (d.includes('clinic')) return 'bg-[#e3f2fd] text-[#1565c0]'
  return 'bg-[#ffebee] text-[#c62828]'
}
