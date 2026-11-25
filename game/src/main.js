// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between four screens: title, play, paused and game over.
//
// ?seed=N fixes the order deal. ?shot=start|play|serve|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady for a
// screenshot.
//
// Sounds are tiny WebAudio beeps synthesised at run time — no audio file is loaded.
// Clicks and keys: 1-8 add an ingredient, Q/W/E pick an order ticket, Space serves,
// X throws the plate away, P pauses, M mutes, Enter / click starts and restarts.
import { BEST_KEY, INGREDIENTS, STEP } from './config.js';
import { createRandom } from './random.js';
import { EVENT_FAILED, EVENT_OVER, EVENT_SERVED, EVENT_WRONG, createWorld } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

let muted = false;
let audio = null;
function beep(freq, dur, type, gain) {
  if (muted) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') void audio.resume();
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type ?? 'sine';
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(gain ?? 0.12, audio.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
    osc.connect(amp);
    amp.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + dur);
  } catch {
    // Audio is a garnish: a browser without it still plays the game.
  }
}
function soundFor(events) {
  if (events & EVENT_SERVED) {
    beep(660, 0.12, 'triangle', 0.14);
    setTimeout(() => beep(880, 0.18, 'triangle', 0.14), 90);
  } else if (events & EVENT_WRONG) beep(160, 0.2, 'sawtooth', 0.08);
  else if (events & EVENT_FAILED) beep(220, 0.3, 'square', 0.08);
}

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Bermain. ${world.state.hearts} nyawa, shift 120 detik.`);
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Shift selesai. Skor ${world.state.score}. Terbaik ${best}.`);
  }

  function handleClick() {
    const click = input.takeClick();
    if (!click) return;
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      startGame();
      return;
    }
    if (screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      return;
    }
    if (click.kind === 'ingredient') {
      const events = world.addIngredient(INGREDIENTS[click.index].id);
      if (events) beep(520, 0.07, 'sine', 0.1);
      soundFor(events);
    } else if (click.kind === 'order') {
      world.selectOrder(click.index);
      beep(440, 0.06, 'sine', 0.08);
    } else if (click.kind === 'serve') {
      const events = world.serve();
      soundFor(events);
      if (events & EVENT_SERVED && world.state.over) endGame();
    } else if (click.kind === 'trash') {
      world.trashPlate();
      beep(300, 0.08, 'sine', 0.08);
    }
  }

  function handleKeys() {
    for (const key of input.takeKeys()) {
      if (key === 'm') {
        muted = !muted;
        announce(muted ? 'Suara mati.' : 'Suara hidup.');
        continue;
      }
      if (screen !== SCREEN_PLAY) continue;
      const ingIndex = INGREDIENTS.findIndex((ing) => ing.key === key);
      if (ingIndex >= 0) {
        const events = world.addIngredient(INGREDIENTS[ingIndex].id);
        if (events) beep(520, 0.07, 'sine', 0.1);
        soundFor(events);
      } else if (key === 'q' || key === 'w' || key === 'e') {
        world.selectOrder(['q', 'w', 'e'].indexOf(key));
      } else if (key === ' ') {
        const events = world.serve();
        soundFor(events);
      } else if (key === 'x') {
        world.trashPlate();
      }
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Jeda.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Bermain.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, true);
      return;
    }
    const events = world.step(STEP, false);
    soundFor(events);
    if (events & EVENT_OVER) endGame();
    else if (events & EVENT_FAILED) announce('Order hangus! Satu nyawa hilang.');
    else if (events & EVENT_SERVED) announce(`Tersaji! Skor ${world.state.score}.`);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    handleClick();
    handleKeys();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Jeda.');
    }
  });

  announce('Wajan Panas. Tekan Spasi atau klik untuk mulai.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
