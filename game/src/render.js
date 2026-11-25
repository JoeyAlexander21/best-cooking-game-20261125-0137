// Drawing only: the world's state and the current screen in, pixels out. The 1280x480
// playfield is scaled to fit the window and centred, the margin filled with the backdrop
// colour. Everything is drawn with canvas shapes and text — no image, font or sound
// asset is loaded, so the game plays fully offline. Ingredient icons are little vector
// drawings (a mound of rice, a drumstick, a fried egg, a chilli bowl, greens, noodles,
// meatballs, a cracker) so every dish on the plate is recognisable at a glance.
import {
  DISHES, FIELD, FONT, INGREDIENTS, LAYOUT, PALETTE, ingredientRect, ticketRect,
} from './config.js';
import { dishById, ingredientById } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** The vector icon for one ingredient, centred at (cx, cy) inside radius r. */
export function drawIngredientIcon(ctx, id, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  const s = r / 16;
  ctx.scale(s, s);
  switch (id) {
    case 'nasi':
      ctx.fillStyle = '#fff8e6';
      ctx.beginPath();
      ctx.ellipse(0, 3, 13, 8, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#e8d9b0';
      for (const [dx, dy] of [[-6, -1], [0, -4], [6, -1], [-2, 0]]) { circle(ctx, dx, dy, 1.6); }
      break;
    case 'ayam':
      ctx.fillStyle = '#b06a28';
      circle(ctx, -1, 1, 9);
      ctx.fillStyle = '#d99a4e';
      circle(ctx, -3, -1, 5);
      ctx.strokeStyle = '#f3e2c2';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(6, 6);
      ctx.lineTo(12, 12);
      ctx.stroke();
      ctx.fillStyle = '#f3e2c2';
      circle(ctx, 13, 12, 2.6);
      circle(ctx, 10, 14, 2.2);
      break;
    case 'telur':
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 10, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffb703';
      circle(ctx, 1, 0, 5.5);
      ctx.fillStyle = '#ffdf6b';
      circle(ctx, -0.5, -1.5, 2);
      break;
    case 'sambal':
      ctx.fillStyle = '#e8e2d2';
      ctx.beginPath();
      ctx.ellipse(0, 4, 12, 7, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#d9382b';
      ctx.beginPath();
      ctx.ellipse(0, 1, 10, 4.5, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#7a150c';
      circle(ctx, -4, -1, 1.5);
      circle(ctx, 3, -2, 1.5);
      circle(ctx, 0, 1, 1.2);
      ctx.fillStyle = '#3f9e4d';
      ctx.fillRect(-1, -9, 2, 5);
      break;
    case 'sayur':
      ctx.fillStyle = '#2f7d3a';
      for (const [dx, dy, rot] of [[-6, 2, -0.6], [0, -4, 0], [6, 2, 0.6]]) {
        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, 4.5, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#7ed491';
      circle(ctx, 0, -4, 2);
      break;
    case 'mie':
      ctx.strokeStyle = '#f2b705';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        for (let x = -12; x <= 12; x += 2) ctx.lineTo(x, i * 6 + Math.sin(x / 3 + i) * 2.5);
        ctx.stroke();
      }
      ctx.fillStyle = '#3f9e4d';
      circle(ctx, 8, -8, 2.4);
      break;
    case 'bakso':
      ctx.fillStyle = '#8a5a33';
      circle(ctx, -6, 3, 6.5);
      circle(ctx, 6, 3, 6.5);
      circle(ctx, 0, -6, 6.5);
      ctx.fillStyle = '#b98a5e';
      circle(ctx, -8, 1, 2);
      circle(ctx, 4, 1, 2);
      circle(ctx, -2, -8, 2);
      break;
    case 'kerupuk':
    default:
      ctx.fillStyle = '#f2a0b5';
      ctx.beginPath();
      for (let i = 0; i <= 12; i += 1) {
        const a = (i / 12) * Math.PI * 2;
        const rr = i % 2 === 0 ? 13 : 10;
        const x = Math.cos(a) * rr;
        const y = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#d96b8a';
      circle(ctx, -4, -3, 1.8);
      circle(ctx, 4, 2, 1.8);
      circle(ctx, 0, 5, 1.5);
      break;
  }
  ctx.restore();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, bold) {
    const key = `${size}${bold ? 'b' : ''}`;
    if (!fonts.has(key)) fonts.set(key, `${bold ? '700 ' : ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align ?? 'left';
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function fmtTime(seconds) {
    const s = Math.max(0, Math.ceil(seconds));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  function drawHud(state, best) {
    const hud = LAYOUT.hud;
    context.fillStyle = '#100c09';
    context.fillRect(0, 0, FIELD.width, hud.h);
    context.fillStyle = PALETTE.accent;
    context.fillRect(0, hud.h - 3, FIELD.width, 3);
    text('WAJAN PANAS', 16, 33, 24, PALETTE.accent, 'left', true);
    text('Dapur Nusantara', 218, 33, 15, PALETTE.muted);
    // Shift timer, centre.
    const t = state.timeLeft;
    const urgent = t <= 20;
    text('SHIFT', 560, 20, 12, PALETTE.muted, 'center', true);
    text(fmtTime(t), 560, 46, 26, urgent ? PALETTE.red : PALETTE.text, 'center', true);
    context.fillStyle = '#3a2a1e';
    roundRect(context, 500, 48, 120, 0, 0);
    context.fillStyle = urgent ? PALETTE.red : PALETTE.green;
    context.fillRect(500, 49, 120 * Math.max(0, t / 120), 2);
    text(`SKOR ${state.score}`, 700, 33, 22, PALETTE.text, 'left', true);
    text(`TERBAIK ${Math.max(best, state.score)}`, 830, 33, 15, PALETTE.muted);
    // Hearts.
    for (let i = 0; i < 3; i += 1) {
      context.fillStyle = i < state.hearts ? '#ff5a6e' : '#4a3428';
      context.font = '20px system-ui';
      context.textAlign = 'left';
      context.fillText('♥', 960 + i * 26, 34);
    }
    text(`Lv ${state.level}`, 1050, 33, 16, PALETTE.text, 'left', true);
    if (state.combo >= 2) {
      text(`KOMBO x${state.combo}`, 1120, 33, 17, '#ff8a3d', 'left', true);
    }
  }

  function drawTicket(state, ticket, index) {
    const r = ticketRect(index);
    const active = index === state.activeOrder;
    const dish = dishById(ticket.dishId);
    context.fillStyle = active ? '#ffe9a8' : PALETTE.ticket;
    roundRect(context, r.x, r.y, r.w, r.h, 8);
    context.fill();
    if (active) {
      context.strokeStyle = PALETTE.accent;
      context.lineWidth = 3;
      roundRect(context, r.x + 1, r.y + 1, r.w - 2, r.h - 2, 8);
      context.stroke();
    }
    if (ticket.respawn > 0) {
      text('Order baru datang…', r.x + 14, r.y + 34, 16, '#8a6d3b', 'left', true);
      text('—', r.x + 14, r.y + 62, 14, PALETTE.muted);
      return;
    }
    text(`${['Q', 'W', 'E'][index]}  ${dish.name}`, r.x + 12, r.y + 26, 18, PALETTE.ticketInk, 'left', true);
    text(`+${dish.points} poin`, r.x + r.w - 12, r.y + 26, 14, '#8a6d3b', 'right', true);
    // Recipe icons, ticked when already on the plate.
    const onPlate = state.plate.orderId === ticket.id ? state.plate.added : [];
    dish.recipe.forEach((id, i) => {
      const cx = r.x + 30 + i * 46;
      const cy = r.y + 52;
      context.fillStyle = onPlate.includes(id) ? '#d9f2dd' : '#efe3c8';
      circle(context, cx, cy, 17);
      drawIngredientIcon(context, id, cx, cy, 15);
      if (onPlate.includes(id)) {
        context.fillStyle = PALETTE.green;
        context.font = '700 15px system-ui';
        context.textAlign = 'center';
        context.fillText('✓', cx + 13, cy - 8);
      }
    });
    text(dish.recipe.map((id) => ingredientById(id).short).join(' + '), r.x + 148, r.y + 57, 11, '#6b543a');
    // Patience bar.
    const frac = Math.max(0, ticket.patience / ticket.maxPatience);
    context.fillStyle = '#e3d3ae';
    roundRect(context, r.x + 12, r.y + r.h - 16, r.w - 24, 8, 4);
    context.fill();
    context.fillStyle = frac > 0.5 ? PALETTE.green : frac > 0.25 ? '#e8a13a' : PALETTE.red;
    roundRect(context, r.x + 12, r.y + r.h - 16, (r.w - 24) * frac, 8, 4);
    context.fill();
  }

  function drawBoard(state) {
    const b = LAYOUT.board;
    context.fillStyle = PALETTE.panel;
    roundRect(context, b.x, b.y, b.w, b.h, 10);
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    roundRect(context, b.x, b.y, b.w, b.h, 10);
    context.stroke();
    text('ORDER BOARD', b.x + 14, b.y + 24, 17, PALETTE.accent, 'left', true);
    text('klik / Q W E', b.x + b.w - 14, b.y + 24, 12, PALETTE.muted, 'right');
    state.orders.forEach((ticket, i) => drawTicket(state, ticket, i));
  }

  function drawKitchen(state, now) {
    const k = LAYOUT.kitchen;
    // Wall with tiles, shelf and hanging pans.
    context.fillStyle = PALETTE.wall;
    roundRect(context, k.x, k.y, k.w, k.h, 10);
    context.fill();
    context.fillStyle = PALETTE.wallTile;
    for (let x = k.x + 12; x < k.x + k.w - 12; x += 44) {
      context.fillRect(x, k.y + 12, 36, 4);
    }
    // Shelf with jars.
    context.fillStyle = '#5d4128';
    context.fillRect(k.x + 24, k.y + 52, 180, 8);
    const jarColors = ['#d9382b', '#3f9e4d', '#f2b705', '#f2a0b5'];
    jarColors.forEach((c, i) => {
      context.fillStyle = c;
      roundRect(context, k.x + 34 + i * 42, k.y + 22, 30, 30, 5);
      context.fill();
      context.fillStyle = 'rgba(255,255,255,0.35)';
      context.fillRect(k.x + 38 + i * 42, k.y + 26, 6, 20);
    });
    text('DAPUR NUSANTARA', k.x + 240, k.y + 44, 15, PALETTE.muted, 'left', true);
    // Stove with two burners and a wok, steam rising.
    context.fillStyle = '#1c1a18';
    roundRect(context, k.x + 380, k.y + 20, 220, 74, 8);
    context.fill();
    for (const bx of [k.x + 420, k.x + 520]) {
      context.fillStyle = '#33302c';
      circle(context, bx, k.y + 62, 30);
      context.fillStyle = '#ff8a3d';
      circle(context, bx, k.y + 62, 18 + Math.sin(now * 3 + bx) * 2);
      context.fillStyle = '#c9ced6';
      circle(context, bx, k.y + 56, 24);
      context.fillStyle = '#2b2118';
      circle(context, bx, k.y + 56, 19);
    }
    context.strokeStyle = 'rgba(255,255,255,0.55)';
    context.lineWidth = 3;
    context.lineCap = 'round';
    for (let i = 0; i < 3; i += 1) {
      const sx = k.x + 470 + i * 26;
      context.beginPath();
      for (let y = 0; y <= 26; y += 4) {
        context.lineTo(sx + Math.sin(y / 6 + now * 2 + i) * 5, k.y + 18 - y);
      }
      context.stroke();
    }
    // Counter.
    context.fillStyle = PALETTE.counterTop;
    roundRect(context, k.x, k.y + 210, k.w, 26, 6);
    context.fill();
    context.fillStyle = PALETTE.counter;
    context.fillRect(k.x, k.y + 236, k.w, k.h - 236 - 10);
    // Recipe progress above the plate.
    const ticket = state.orders[state.activeOrder];
    const dish = ticket ? dishById(ticket.dishId) : null;
    const p = LAYOUT.plate;
    if (dish) {
      text(`Merakit: ${dish.name}`, p.x, k.y + 128, 17, PALETTE.text, 'center', true);
      dish.recipe.forEach((id, i) => {
        const cx = p.x - 52 + i * 52;
        const cy = k.y + 158;
        const done = state.plate.added.includes(id) && state.plate.orderId === ticket.id;
        context.fillStyle = done ? '#d9f2dd' : 'rgba(255,255,255,0.14)';
        circle(context, cx, cy, 20);
        context.strokeStyle = done ? PALETTE.green : 'rgba(255,255,255,0.4)';
        context.lineWidth = 2;
        context.beginPath();
        context.arc(cx, cy, 20, 0, Math.PI * 2);
        context.stroke();
        drawIngredientIcon(context, id, cx, cy, 17);
      });
    }
    // The plate, with whatever is on it so far.
    context.fillStyle = '#f4f1ea';
    context.beginPath();
    context.ellipse(p.x, p.y, p.r, p.r * 0.62, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#c9bfa8';
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(p.x, p.y, p.r - 8, p.r * 0.62 - 6, 0, 0, Math.PI * 2);
    context.stroke();
    const added = state.plate.added;
    added.forEach((id, i) => {
      const angle = -Math.PI / 2 + (i - (added.length - 1) / 2) * 0.9;
      drawIngredientIcon(context, id, p.x + Math.cos(angle) * 30, p.y + Math.sin(angle) * 16, 22);
    });
    if (state.ready) {
      context.strokeStyle = PALETTE.gold;
      context.lineWidth = 4;
      context.beginPath();
      context.ellipse(p.x, p.y, p.r + 5 + Math.sin(now * 5) * 2, (p.r + 5) * 0.62, 0, 0, Math.PI * 2);
      context.stroke();
      text('SIAP SAJI!', p.x, p.y + 62, 15, PALETTE.gold, 'center', true);
    } else if (added.length === 0) {
      text('piring kosong — klik bahan di bawah', p.x, p.y + 62, 13, PALETTE.muted, 'center');
    } else {
      text(`${added.length}/${dish ? dish.recipe.length : 3} bahan di piring`, p.x, p.y + 62, 13, PALETTE.text, 'center');
    }
    if (state.flash > 0) {
      context.fillStyle = `rgba(229,83,75,${(state.flash / 0.45) * 0.25})`;
      context.fillRect(k.x, k.y, k.w, k.h);
    }
  }

  function drawServePanel(state) {
    const s = LAYOUT.servePanel;
    context.fillStyle = PALETTE.panel;
    roundRect(context, s.x, s.y, s.w, s.h, 10);
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    roundRect(context, s.x, s.y, s.w, s.h, 10);
    context.stroke();
    text('PIRING SIAP SAJI', s.x + 14, s.y + 24, 17, PALETTE.accent, 'left', true);
    const dish = state.orders[state.activeOrder] ? dishById(state.orders[state.activeOrder].dishId) : null;
    text(dish ? `Order aktif: ${dish.name}` : '—', s.x + 14, s.y + 48, 14, PALETTE.text);
    text(state.ready ? 'Lengkap! Sajikan sekarang.' : 'Rakit semua bahan dulu.', s.x + 14, s.y + 68, 13, state.ready ? PALETTE.green : PALETTE.muted);
    const btn = LAYOUT.serveButton;
    const pulse = state.ready ? 0.85 + Math.sin(Date.now() / 180) * 0.15 : 1;
    context.fillStyle = state.ready ? `rgba(67,181,129,${pulse})` : '#4a3a28';
    roundRect(context, btn.x, btn.y, btn.w, btn.h, 12);
    context.fill();
    context.strokeStyle = state.ready ? '#d9f2dd' : '#6b543a';
    context.lineWidth = 2;
    roundRect(context, btn.x, btn.y, btn.w, btn.h, 12);
    context.stroke();
    text(state.ready ? '▶  SAJIKAN  (Spasi)' : 'SAJIKAN  (Spasi)', btn.x + btn.w / 2, btn.y + 40, 22, state.ready ? '#ffffff' : '#a98f6d', 'center', true);
    const tr = LAYOUT.trashButton;
    context.fillStyle = '#3a2a1e';
    roundRect(context, tr.x, tr.y, tr.w, tr.h, 10);
    context.fill();
    context.strokeStyle = '#6b543a';
    context.lineWidth = 2;
    roundRect(context, tr.x, tr.y, tr.w, tr.h, 10);
    context.stroke();
    text('Buang piring  (X)', tr.x + tr.w / 2, tr.y + 26, 15, '#d8c3a0', 'center', true);
  }

  function drawServeStats(state) {
    const s = LAYOUT.servePanel;
    const rows = [
      ['Tersaji', String(state.served)],
      ['Gagal', String(state.failed)],
      ['Kombo terbaik', `x${state.bestCombo}`],
    ];
    let y = 292;
    rows.forEach(([label, value]) => {
      text(label, s.x + 16, y, 14, PALETTE.muted);
      text(value, s.x + s.w - 16, y, 14, PALETTE.text, 'right', true);
      y += 20;
    });
    if (state.message) {
      context.fillStyle = 'rgba(0,0,0,0.45)';
      roundRect(context, s.x + 8, s.y + s.h - 24, s.w - 16, 20, 6);
      context.fill();
      text(state.message, s.x + s.w / 2, s.y + s.h - 10, 13, '#ffe9a8', 'center', true);
    }
  }

  function drawIngredients(state) {
    const bar = LAYOUT.ingredients;
    INGREDIENTS.forEach((ing, i) => {
      const r = ingredientRect(i);
      const inRecipe = (() => {
        const ticket = state.orders[state.activeOrder];
        return ticket ? dishById(ticket.dishId).recipe.includes(ing.id) : false;
      })();
      const used = state.plate.added.includes(ing.id);
      context.fillStyle = used ? '#2f5d3a' : '#33261a';
      roundRect(context, r.x, r.y, r.w, r.h, 10);
      context.fill();
      context.strokeStyle = inRecipe ? PALETTE.accent : '#5d4128';
      context.lineWidth = inRecipe ? 3 : 2;
      roundRect(context, r.x, r.y, r.w, r.h, 10);
      context.stroke();
      drawIngredientIcon(context, ing.id, r.x + r.w / 2, r.y + 36, 26);
      text(ing.name, r.x + r.w / 2, r.y + 78, 14, used ? '#9fd6ae' : PALETTE.text, 'center', true);
      context.fillStyle = '#100c09';
      roundRect(context, r.x + 8, r.y + 8, 22, 20, 5);
      context.fill();
      text(ing.key, r.x + 19, r.y + 23, 13, PALETTE.accent, 'center', true);
      if (used) text('✓ di piring', r.x + r.w - 8, r.y + 23, 11, PALETTE.green, 'right', true);
    });
  }

  function drawTitle(state) {
    context.fillStyle = 'rgba(12,8,5,0.72)';
    roundRect(context, 340, 66, 600, 108, 12);
    context.fill();
    context.strokeStyle = PALETTE.accent;
    context.lineWidth = 2;
    roundRect(context, 340, 66, 600, 108, 12);
    context.stroke();
    text('WAJAN PANAS', 640, 108, 34, PALETTE.accent, 'center', true);
    text('Dapur Nusantara — masak cepat, sajikan tepat waktu!', 640, 134, 16, PALETTE.text, 'center');
    text('Klik / Spasi untuk mulai  •  1–8 bahan  •  Q/W/E pilih order  •  Spasi sajikan  •  P jeda', 640, 160, 14, PALETTE.muted, 'center');
  }

  function drawPaused() {
    context.fillStyle = 'rgba(12,8,5,0.7)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    text('JEDA', 640, 210, 44, PALETTE.text, 'center', true);
    text('Tekan P atau klik untuk lanjut', 640, 250, 18, PALETTE.muted, 'center');
  }

  function drawOver(state, best) {
    context.fillStyle = 'rgba(12,8,5,0.78)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = '#2b2118';
    roundRect(context, 390, 90, 500, 260, 14);
    context.fill();
    context.strokeStyle = PALETTE.accent;
    context.lineWidth = 2;
    roundRect(context, 390, 90, 500, 260, 14);
    context.stroke();
    text('SHIFT SELESAI', 640, 140, 36, PALETTE.accent, 'center', true);
    text(state.overReason, 640, 172, 16, PALETTE.text, 'center');
    text(`Skor akhir  ${state.score}`, 640, 216, 26, PALETTE.text, 'center', true);
    text(`Tersaji ${state.served}   •   Gagal ${state.failed}   •   Kombo terbaik x${state.bestCombo}`, 640, 248, 16, PALETTE.muted, 'center');
    text(`Skor terbaik ${Math.max(best, state.score)}`, 640, 276, 16, PALETTE.gold, 'center', true);
    text('Tekan Enter / klik untuk main lagi', 640, 318, 15, PALETTE.muted, 'center');
  }

  function draw(state, screen, best) {
    resize();
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    const now = state.elapsed;
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    drawHud(state, best);
    drawBoard(state);
    drawKitchen(state, now);
    drawServePanel(state);
    drawServeStats(state);
    drawIngredients(state);
    if (screen === SCREEN_TITLE) drawTitle(state);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_OVER) drawOver(state, best);
  }

  return { draw };
}
