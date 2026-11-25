// The screenshot scenes behind ?shot=start|play|serve|end. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a simple
// autopilot (serve the first order correctly, then build the next one), so the frame
// is what a short game really looks like and the same seed always gives the same frame.
import { STEP } from './config.js';
import { EVENT_OVER, dishById } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const SAMPLE = 1 / 30;

/** Step the world for `seconds`, running `drive` every sample. */
function runFor(world, seconds, drive) {
  const steps = Math.round(seconds / SAMPLE);
  for (let i = 0; i < steps; i += 1) {
    if (drive) drive(world);
    const events = world.step(SAMPLE, false);
    if (events & EVENT_OVER) return true;
  }
  return false;
}

/** Add the next missing ingredient of the active order, if any. */
function addNext(world) {
  const ticket = world.activeTicket();
  if (!ticket) return;
  const dish = dishById(ticket.dishId);
  const missing = dish.recipe.find((id) => !world.state.plate.added.includes(id));
  if (missing) world.addIngredient(missing);
}

/**
 * Set `world` to the named scene (start, play, serve or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'serve' && name !== 'end') {
    // Title: the kitchen simmers behind the banner, clock and patience frozen.
    for (let i = 0; i < 5 / STEP; i += 1) world.step(STEP, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'end') {
    // A rushed cook who never adds a thing: orders expire until the hearts run out.
    runFor(world, 600, null);
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  // Serve the first order correctly, so the score is real, then build the next dish.
  runFor(world, 2, null);
  world.selectOrder(0);
  addNext(world);
  runFor(world, 0.5, null);
  addNext(world);
  runFor(world, 0.5, null);
  addNext(world);
  runFor(world, 0.5, null);
  world.serve();
  runFor(world, 3, null);
  // Now build the next active order.
  world.selectOrder(world.state.activeOrder);
  addNext(world);
  runFor(world, 1, null);
  if (name === 'serve') {
    addNext(world);
    runFor(world, 0.5, null);
    addNext(world);
    runFor(world, 0.5, null);
  } else {
    // play: leave the dish mid-assembly — two of three ingredients on the plate.
    addNext(world);
  }
  return { screen: SCREEN_PLAY, best: world.state.score };
}
