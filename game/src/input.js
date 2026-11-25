// Keyboard and mouse input, reduced to actions the game loop consumes once per frame.
// Clicks are hit-tested in logical (1280x480) coordinates against the layout rects in
// config.js, so a click on a ticket, an ingredient, SERVE or the trash bin is exact.
import { FIELD, LAYOUT, ingredientRect, ticketRect } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_SERVE = 4;
export const ACTION_TRASH = 8;

/** Which clickable thing, if any, sits at logical point (x, y). */
export function hitTest(x, y) {
  for (let i = 0; i < 8; i += 1) {
    const r = ingredientRect(i);
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return { kind: 'ingredient', index: i };
  }
  for (let i = 0; i < 3; i += 1) {
    const r = ticketRect(i);
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return { kind: 'order', index: i };
  }
  const s = LAYOUT.serveButton;
  if (x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h) return { kind: 'serve' };
  const t = LAYOUT.trashButton;
  if (x >= t.x && x < t.x + t.w && y >= t.y && y < t.y + t.h) return { kind: 'trash' };
  return null;
}

export function createInput(canvas) {
  let actions = 0;
  const pressed = new Set();
  let click = null;

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
    const ox = (rect.width - FIELD.width * scale) / 2;
    const oy = (rect.height - FIELD.height * scale) / 2;
    return {
      x: (event.clientX - rect.left - ox) / scale,
      y: (event.clientY - rect.top - oy) / scale,
    };
  }

  canvas.addEventListener('pointerdown', (event) => {
    const point = toLogical(event);
    click = hitTest(point.x, point.y);
    actions |= ACTION_CONFIRM;
  });

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    pressed.add(key);
    if (key === ' ' || key === 'enter') {
      actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (key === 'p' || key === 'escape') {
      actions |= ACTION_PAUSE;
    }
  });

  function takeActions() {
    const taken = actions;
    actions = 0;
    return taken;
  }

  function takeClick() {
    const taken = click;
    click = null;
    return taken;
  }

  /** Ingredient / order keys pressed since the last call (1-8, q/w/e, x, m). */
  function takeKeys() {
    const taken = [...pressed];
    pressed.clear();
    return taken;
  }

  return { takeActions, takeClick, takeKeys };
}
