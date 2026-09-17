// Shared Tailwind utility strings for recurring page patterns (records tables,
// pills, action buttons, forms, panels). Keeping them here lets every page
// stay consistent without repeating long class lists.

/** Data table (replaces `.records-table` + th/td rules). */
export const TABLE =
  'w-full border-collapse text-left text-[13px] sm:text-[13.5px] ' +
  '[&_th]:border-b [&_th]:border-line-strong/80 [&_th]:bg-[#f4faf8] [&_th]:p-[12px_14px] [&_th]:font-extrabold [&_th]:text-ink [&_th]:whitespace-nowrap [&_th]:text-[11.5px] [&_th]:uppercase [&_th]:tracking-wide ' +
  '[&_td]:border-b [&_td]:border-line/80 [&_td]:p-[12px_14px] [&_td]:text-ink ' +
  '[&_tr:last-child_td]:border-b-0 [&_tr:hover_td]:bg-[#f8fbfb]/80 [&_td]:transition-colors'

/** Soft rounded pill button (replaces `.secondary-pill`). */
export const PILL =
  'cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 sm:px-[14px] py-1.5 sm:py-2 text-[12.5px] font-extrabold text-primary transition-all duration-150 hover:bg-primary/20 active:scale-95'

/** Primary solid button (replaces `.primary-action`). */
export const PRIMARY_BTN =
  'min-h-11 inline-flex items-center justify-center gap-2 cursor-pointer rounded-xl bg-gradient-to-r from-primary to-[#0f635a] px-4 sm:px-[18px] text-[13px] sm:text-[13.5px] font-extrabold text-white shadow-[0_8px_20px_rgba(20,120,109,0.22)] transition-all duration-150 hover:shadow-[0_12px_26px_rgba(20,120,109,0.32)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none'

/** Text/number input (replaces `.search-input`). */
export const SEARCH_INPUT =
  'min-w-[180px] rounded-xl border border-[#d4e4e0] bg-white px-3.5 py-2 sm:py-2.5 text-[13px] text-ink placeholder:text-muted/75 transition-all duration-150 focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/15 shadow-2xs'

/** Select dropdown (replaces `.filter-select` / `.status-selector-table`). */
export const SELECT_INPUT =
  'cursor-pointer rounded-xl border border-[#d4e4e0] bg-white px-3.5 py-2 sm:py-2.5 text-[13px] text-ink transition-all duration-150 focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/15 shadow-2xs'

/** Side form layout (replaces `.sidebar-form`). */
export const SIDEBAR_FORM = 'mt-[14px] flex flex-col gap-3.5'

/** Side form label (replaces `.sidebar-form label`). */
export const FORM_LABEL = 'flex flex-col gap-[6px] text-[12.5px] font-extrabold text-ink'

/** Side form field (replaces `.sidebar-form input/select/textarea`). */
export const FORM_FIELD =
  'w-full rounded-xl border border-[#d4e4e0] bg-white p-[10px_12px] text-[13px] text-ink transition-all duration-150 focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/15 shadow-2xs'

/** White card (replaces `.panel` / `.stat-card` surface). */
export const PANEL =
  'rounded-2xl border border-line-strong/80 bg-white p-4 sm:p-[20px] shadow-[0_4px_24px_rgba(18,57,59,0.06),0_1px_2px_rgba(0,0,0,0.02)] transition-all duration-200'

/** Panel title row (replaces `.panel-header`). */
export const PANEL_HEADER = 'mb-4 sm:mb-[18px] flex flex-wrap items-center justify-between gap-3'

/** Kicker text (replaces the `.page-heading p` / `.panel-header p` style). */
export const KICKER = 'mb-1 text-[11px] sm:text-[12px] font-extrabold uppercase tracking-wider text-muted-soft'

/** Two-column grid of form fields (replaces `.form-row-grid`). */
export const FORM_ROW = 'grid grid-cols-1 sm:grid-cols-2 gap-3'

/* --- Small action buttons (replace `.btn-*-small` and `.btn-action-*`) ----- */

export const BTN_SM_BASE =
  'cursor-pointer inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-[11.5px] sm:text-[12px] font-extrabold transition-all duration-150 active:scale-95 shadow-2xs'

export const BTN_SUCCESS = BTN_SM_BASE + ' bg-[#dff6dd] text-[#1e5a1b] hover:bg-[#cceed0]'
export const BTN_DANGER = BTN_SM_BASE + ' bg-[#ffebe0] text-[#a33c12] hover:bg-[#fed9c8]'
export const BTN_INFO = BTN_SM_BASE + ' bg-bg text-primary hover:bg-[#d8ebe5]'
export const BTN_WARN = BTN_SM_BASE + ' bg-[#fff3d6] text-[#8a5a00] hover:bg-[#feeac0]'
export const BTN_NEUTRAL = BTN_SM_BASE + ' bg-[#eef2f1] text-[#4d615e] hover:bg-[#e0e7e5]'
export const BTN_VIEW = BTN_SM_BASE + ' bg-[#e8f0fe] text-[#1a56c4] hover:bg-[#d4e4fc]'
export const BTN_PRIMARY = BTN_SM_BASE + ' bg-[#e1f5fe] text-[#0d47a1] hover:bg-[#c9ebfb]'

export const BTN_ACTION_SUCCESS =
  'cursor-pointer inline-flex items-center justify-center gap-1 rounded-xl bg-success px-3.5 py-2 text-[12px] font-extrabold text-white shadow-xs transition-all duration-150 hover:bg-[#238b55] hover:shadow-sm active:scale-95'
export const BTN_ACTION_DANGER =
  'cursor-pointer inline-flex items-center justify-center gap-1 rounded-xl bg-accent px-3.5 py-2 text-[12px] font-extrabold text-white shadow-xs transition-all duration-150 hover:bg-[#b6451e] hover:shadow-sm active:scale-95'

/* --- Disposition tags (replace `.dispo-tag` + `.dispo-*` colors) ---------- */

export const DISPO_TAG = 'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold shadow-2xs'

/** Maps a disposition string to the matching tag color pair. */
export function dispoClasses(disposition) {
  const d = disposition.toLowerCase()
  if (d.includes('class')) return 'bg-[#e8f5e9] text-[#2e7d32] border border-[#c8e6c9]'
  if (d.includes('home')) return 'bg-[#fff3e0] text-[#ef6c00] border border-[#ffe0b2]'
  if (d.includes('clinic')) return 'bg-[#e3f2fd] text-[#1565c0] border border-[#bbdefb]'
  return 'bg-[#ffebee] text-[#c62828] border border-[#ffcdd2]'
}
