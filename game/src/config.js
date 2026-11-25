// Every tuning number, colour and layout rect in one place. The playfield is a fixed
// 1280x480 logical area; the renderer scales it to the window, so no rule below depends
// on the screen size. Layout rects are shared by the renderer and the click handling,
// so what you see is exactly what you can click.
export const FIELD = { width: 1280, height: 480 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** One work shift: when the clock hits zero the shift ends and the game is over. */
export const SHIFT_SECONDS = 120;
export const LIVES = 3;

/** Patience of a fresh order, in seconds; it shrinks as the day gets busier. */
export const PATIENCE = { base: 30, perLevel: 3, min: 18 };
/** Seconds of play per level (rush), and the last level. */
export const LEVEL = { seconds: 30, max: 4 };
/** Seconds before a served / failed ticket is replaced by a fresh order. */
export const RESPAWN_SECONDS = 1.2;
/** Points lost for adding an ingredient the active dish does not need. */
export const WRONG_PENALTY = 5;

export const INGREDIENTS = [
  { id: 'nasi', name: 'Nasi', short: 'NASI', color: '#fff6dd', key: '1' },
  { id: 'ayam', name: 'Ayam Goreng', short: 'AYAM', color: '#c98a3d', key: '2' },
  { id: 'telur', name: 'Telur', short: 'TELUR', color: '#ffd94d', key: '3' },
  { id: 'sambal', name: 'Sambal', short: 'SAMBAL', color: '#d9382b', key: '4' },
  { id: 'sayur', name: 'Sayur', short: 'SAYUR', color: '#3f9e4d', key: '5' },
  { id: 'mie', name: 'Mie', short: 'MIE', color: '#f2b705', key: '6' },
  { id: 'bakso', name: 'Bakso', short: 'BAKSO', color: '#8a5a33', key: '7' },
  { id: 'kerupuk', name: 'Kerupuk', short: 'KRUPUK', color: '#f2a0b5', key: '8' },
];

export const DISHES = [
  { id: 'nasgor', name: 'Nasi Goreng', recipe: ['nasi', 'telur', 'sambal'], points: 50 },
  { id: 'mieayam', name: 'Mie Ayam', recipe: ['mie', 'ayam', 'sayur'], points: 50 },
  { id: 'bakso', name: 'Bakso Kuah', recipe: ['bakso', 'mie', 'sambal'], points: 55 },
  { id: 'nasiayam', name: 'Nasi Ayam Geprek', recipe: ['nasi', 'ayam', 'sambal'], points: 55 },
  { id: 'mietelur', name: 'Mie Telur Sayur', recipe: ['mie', 'telur', 'sayur'], points: 60 },
];

export const PALETTE = {
  backdrop: '#171310',
  wall: '#3a2a1e',
  wallTile: '#46352a',
  floor: '#241a13',
  counter: '#7a4a28',
  counterTop: '#a06a3c',
  steel: '#c9ced6',
  panel: '#2b2118',
  panelEdge: '#6b4e2e',
  ticket: '#fff3d6',
  ticketInk: '#2b2118',
  text: '#fff6e8',
  muted: '#c9b18f',
  accent: '#ffb03a',
  green: '#43b581',
  red: '#e5534b',
  gold: '#f2c94c',
};

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'wajan-panas.best';

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

// ---- Layout (logical pixels, FIELD 1280x480) ----
export const LAYOUT = {
  hud: { x: 0, y: 0, w: 1280, h: 52 },
  board: { x: 12, y: 60, w: 296, h: 300 },
  ticket: { h: 84, gap: 6 },
  kitchen: { x: 320, y: 60, w: 628, h: 300 },
  plate: { x: 634, y: 252, r: 66 },
  servePanel: { x: 960, y: 60, w: 308, h: 300 },
  serveButton: { x: 976, y: 150, w: 276, h: 64 },
  trashButton: { x: 976, y: 222, w: 276, h: 40 },
  ingredients: { x: 12, y: 372, w: 1256, h: 96, gap: 8 },
};

export function ingredientRect(index) {
  const bar = LAYOUT.ingredients;
  const w = (bar.w - LAYOUT.ingredients.gap * (INGREDIENTS.length - 1)) / INGREDIENTS.length;
  return { x: bar.x + index * (w + LAYOUT.ingredients.gap), y: bar.y, w, h: bar.h };
}

export function ticketRect(index) {
  const b = LAYOUT.board;
  return { x: b.x + 8, y: b.y + 34 + index * (LAYOUT.ticket.h + LAYOUT.ticket.gap), w: b.w - 16, h: LAYOUT.ticket.h };
}
