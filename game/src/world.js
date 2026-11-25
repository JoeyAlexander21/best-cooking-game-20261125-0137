// The game's rules and state, with no drawing and no browser in it: the order board,
// the plate being assembled, the shift clock, hearts, score and combo. step() advances
// one fixed step and returns what happened as bit flags, so the caller can react (and
// play sounds) without the world knowing about screens or sound.
//
// How a shift plays: three order tickets sit on the board, each with a patience bar.
// Click a ticket (or Q/W/E) to make it the active order, then click ingredients
// (or keys 1-8) to build that dish on the plate in the middle of the kitchen. A
// wrong ingredient costs 5 points and breaks the combo. When every ingredient of the
// recipe is on the plate it is ready: hit SERVE (or Space) for points — a fast serve
// pays a patience bonus and grows the combo. An order whose patience runs out is
// failed: a heart is lost. Lose all 3 hearts, or let the 120-second shift clock run
// out, and the shift ends.
import {
  DISHES, INGREDIENTS, LEVEL, LIVES, PATIENCE, RESPAWN_SECONDS, SHIFT_SECONDS, STEP, WRONG_PENALTY,
} from './config.js';

export const EVENT_SERVED = 1;
export const EVENT_WRONG = 2;
export const EVENT_FAILED = 4;
export const EVENT_OVER = 8;
export const EVENT_ADDED = 16;

export function dishById(id) {
  return DISHES.find((dish) => dish.id === id);
}

export function ingredientById(id) {
  return INGREDIENTS.find((ing) => ing.id === id);
}

export function createWorld(random) {
  const state = {
    score: 0,
    combo: 0,
    bestCombo: 0,
    served: 0,
    failed: 0,
    hearts: LIVES,
    timeLeft: SHIFT_SECONDS,
    elapsed: 0,
    level: 1,
    orders: [],
    activeOrder: 0,
    plate: { orderId: null, added: [] },
    ready: false,
    flash: 0,
    message: '',
    messageTimer: 0,
    over: false,
    overReason: '',
    nextOrderId: 1,
  };

  function patienceFor() {
    return Math.max(PATIENCE.min, PATIENCE.base - PATIENCE.perLevel * (state.level - 1));
  }

  function dealOrder(slot) {
    // Prefer a dish no other ticket is already serving, so the board always shows
    // a real choice (with 5 dishes and 3 tickets this almost always succeeds).
    const taken = new Set(state.orders.filter(Boolean).map((t) => t.dishId));
    let dish = DISHES[Math.floor(random() * DISHES.length)];
    for (let tries = 0; tries < 6 && taken.has(dish.id); tries += 1) {
      dish = DISHES[Math.floor(random() * DISHES.length)];
    }
    const patience = patienceFor();
    state.orders[slot] = {
      id: state.nextOrderId,
      dishId: dish.id,
      patience,
      maxPatience: patience,
      respawn: 0,
      slot,
    };
    state.nextOrderId += 1;
  }

  function reset() {
    state.score = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.served = 0;
    state.failed = 0;
    state.hearts = LIVES;
    state.timeLeft = SHIFT_SECONDS;
    state.elapsed = 0;
    state.level = 1;
    state.orders = [];
    state.activeOrder = 0;
    state.plate = { orderId: null, added: [] };
    state.ready = false;
    state.flash = 0;
    state.message = '';
    state.messageTimer = 0;
    state.over = false;
    state.overReason = '';
    state.nextOrderId = 1;
    for (let slot = 0; slot < 3; slot += 1) dealOrder(slot);
    state.plate.orderId = state.orders[0].id;
  }

  function activeTicket() {
    return state.orders[state.activeOrder] ?? null;
  }

  function selectOrder(index) {
    if (index < 0 || index >= state.orders.length) return false;
    const ticket = state.orders[index];
    if (!ticket || ticket.respawn > 0) return false;
    state.activeOrder = index;
    if (state.plate.added.length === 0) state.plate.orderId = ticket.id;
    return true;
  }

  /** Add one ingredient to the plate. Returns an event flag (0 when nothing happens). */
  function addIngredient(id) {
    if (state.over) return 0;
    const ticket = activeTicket();
    if (!ticket) return 0;
    const dish = dishById(ticket.dishId);
    if (state.plate.orderId !== ticket.id) {
      // A fresh plate always belongs to the active order.
      state.plate = { orderId: ticket.id, added: [] };
      state.ready = false;
    }
    if (state.ready) return 0;
    if (!dish.recipe.includes(id)) {
      state.score = Math.max(0, state.score - WRONG_PENALTY);
      state.combo = 0;
      state.flash = 0.45;
      state.message = `Bukan bahan ${dish.name}! -${WRONG_PENALTY}`;
      state.messageTimer = 1.4;
      return EVENT_WRONG;
    }
    if (state.plate.added.includes(id)) return 0;
    state.plate.added.push(id);
    if (state.plate.added.length === dish.recipe.length) {
      state.ready = true;
      state.message = `${dish.name} siap disajikan!`;
      state.messageTimer = 1.6;
    }
    return EVENT_ADDED;
  }

  /** Serve the finished plate. Returns an event flag (0 when the plate is not ready). */
  function serve() {
    if (state.over || !state.ready) return 0;
    const ticket = activeTicket();
    if (!ticket || state.plate.orderId !== ticket.id) return 0;
    const dish = dishById(ticket.dishId);
    const bonus = Math.round((ticket.patience / ticket.maxPatience) * 25);
    const gained = dish.points + bonus + state.combo * 5;
    state.score += gained;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.served += 1;
    state.message = `+${gained} — ${dish.name} tersaji!`;
    state.messageTimer = 1.6;
    state.plate = { orderId: null, added: [] };
    state.ready = false;
    ticket.respawn = RESPAWN_SECONDS;
    ticket.patience = 0;
    return EVENT_SERVED;
  }

  function trashPlate() {
    if (state.plate.added.length === 0) return;
    state.plate = { orderId: null, added: [] };
    state.ready = false;
    state.message = 'Piring dibuang, rakit ulang.';
    state.messageTimer = 1.2;
  }

  function failTicket(ticket, reason) {
    state.failed += 1;
    state.hearts -= 1;
    state.combo = 0;
    state.message = reason;
    state.messageTimer = 1.8;
    if (state.plate.orderId === ticket.id) {
      state.plate = { orderId: null, added: [] };
      state.ready = false;
    }
    ticket.respawn = RESPAWN_SECONDS;
    ticket.patience = 0;
    if (state.hearts <= 0) {
      state.hearts = 0;
      state.over = true;
      state.overReason = 'Tiga order hangus — dapur tutup!';
      return EVENT_OVER;
    }
    return EVENT_FAILED;
  }

  /**
   * One fixed step. With `attract` set (the title screen's backdrop) the clock and the
   * patience bars are frozen, so the kitchen stays alive behind the title without
   * anything being served or failed.
   */
  function step(dt, attract) {
    let events = 0;
    if (state.over) return events;
    state.elapsed += dt;
    state.level = Math.min(LEVEL.max, 1 + Math.floor(state.elapsed / LEVEL.seconds));
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt);
    if (state.messageTimer > 0) {
      state.messageTimer -= dt;
      if (state.messageTimer <= 0) state.message = '';
    }
    if (attract) return events;
    state.timeLeft -= dt;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      state.over = true;
      state.overReason = 'Shift selesai — waktu habis!';
      return EVENT_OVER;
    }
    for (let index = 0; index < state.orders.length; index += 1) {
      const ticket = state.orders[index];
      if (!ticket) continue;
      if (ticket.respawn > 0) {
        ticket.respawn -= dt;
        if (ticket.respawn <= 0) dealOrder(index);
        continue;
      }
      ticket.patience -= dt;
      if (ticket.patience <= 0) {
        events |= failTicket(ticket, `Order ${dishById(ticket.dishId).name} hangus!`);
        if (events & EVENT_OVER) break;
      }
    }
    return events;
  }

  reset();
  return { state, reset, step, selectOrder, addIngredient, serve, trashPlate, activeTicket };
}

export { STEP };
