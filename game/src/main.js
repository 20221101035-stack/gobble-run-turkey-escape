// Gobble Run — bootstrap: canvas, loop, state keys, screenshot modes,
// and a simple autopilot the playtester drives. One job: wire the
// modules together and hand the game a frame every tick.

import { VIEW_W, VIEW_H, TURKEY_X, GROUND_Y, ESCAPE_DISTANCE, mulberry32 } from './config.js';
import * as input from './input.js';
import * as sfx from './audio.js';
import { Game } from './game.js';

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const game = new Game(canvas);
input.initInput(canvas);

window.__game = game;
window.__shotReady = false;

const params = new URLSearchParams(window.location.search);
const shotMode = params.get('shot'); // title | farm | kitchen | end
const seed = Number(params.get('seed') || 7);
const autoplay = params.get('autoplay') === '1';

// --- screenshot modes: deterministic staged frames -----------------------
// ?shot=title   -> the title screen
// ?shot=farm    -> mid-run in the farmyard, turkey jumping a fence
// ?shot=kitchen -> mid-run in the kitchen, oven flames + a falling knife
// ?shot=end     -> the ESCAPED end screen
function setupShot(mode) {
  const rng = mulberry32(seed * 31 + 5);
  if (mode === 'title') {
    game.state = 'title';
    game.time = 1.2;
    game.world.scrollX = 300;
    return;
  }
  if (mode === 'farm') {
    game.resetRun(seed);
    game.state = 'playing';
    // fast-forward a real run, stopping on a frame with an obstacle
    // right ahead of the turkey so the shot shows the action
    seekActionFrame(14, ['fence', 'haybale', 'mud', 'pumpkin']);
    return;
  }
  if (mode === 'kitchen') {
    game.resetRun(seed);
    game.state = 'playing';
    // jump-start the run deep into the kitchen stage
    game.distance = 1230;
    game.stageIndex = 2;
    game.world.scrollX = 1230 * 40;
    game.world.spawnX = game.world.scrollX + 900;
    game.showBanner('KITCHEN', 'The oven is lit!');
    seekActionFrame(12, ['oven', 'fallknife', 'hangknife', 'pot']);
    return;
  }
  if (mode === 'end') {
    game.resetRun(seed);
    game.state = 'playing';
    game.score = 18420;
    game.distance = ESCAPE_DISTANCE;
    game.runTime = 182.4;
    game.debug.pickups = 47;
    game.endRun(true, 'You reached the forest!');
    return;
  }
}

// Step the simulation forward in small slices until a hazard of one of
// the wanted kinds is right ahead of the turkey, then freeze that frame.
function seekActionFrame(maxSeconds, kinds) {
  const dt = 1 / 60;
  const slice = 15; // frames per slice (0.25s)
  const maxSlices = Math.floor(maxSeconds / 0.25);
  for (let s = 0; s < maxSlices; s++) {
    for (let i = 0; i < slice; i++) {
      autoPilot(dt);
      game.update(dt);
      if (game.state !== 'playing') break;
    }
    if (game.state !== 'playing') break;
    const near = game.debugState().entities.some((e) => {
      const d = e.sx - TURKEY_X;
      return kinds.includes(e.kind) && d > 90 && d < 340;
    });
    if (near) break;
  }
  game.render();
  window.__shotReady = true;
}

// The autopilot: jump solid hazards, slide under hanging knives, dash on
// a farmer lunge. Used by screenshot staging and by the playtester.
// Triggers are time-based (distance / speed) so they hold at any speed:
// a jump stays airborne ~0.78s, so it starts ~0.55s before impact.
function autoPilot(dt) {
  if (game.state !== 'playing') return;
  const t = game.turkey;
  const speed = game.speed;
  const jumpAt = speed * 0.48; // start the jump ~0.48s before impact
  const slideAt = speed * 0.35;
  const ahead = game.debugState().entities.filter((e) => e.sx > TURKEY_X - 40 && e.sx < TURKEY_X + 420);
  const solidNear = ahead.some(
    (e) => ['fence', 'haybale', 'crate', 'pot', 'oven', 'pumpkin', 'mud'].includes(e.kind) && e.sx - TURKEY_X < 300 && e.sx - TURKEY_X > 0,
  );
  for (const e of ahead) {
    const dist = e.sx - TURKEY_X;
    if (e.kind === 'hangknife' && dist < slideAt && dist > 0 && t.grounded && !t.sliding) {
      game.doSlide();
    }
    if (['fence', 'haybale', 'crate', 'pot', 'oven', 'pumpkin'].includes(e.kind)) {
      if (dist < jumpAt && dist > 0 && t.grounded) game.doJump();
    }
    if (e.kind === 'fallknife' && e.state !== 'shadow' && dist < jumpAt && dist > 0 && t.grounded) {
      game.doJump();
    }
    if (e.kind === 'fallknife' && e.state === 'shadow' && dist < jumpAt && dist > -40 && t.grounded) {
      game.doJump();
    }
    if (e.kind === 'mud' && dist < jumpAt && dist > 0 && t.grounded) game.doJump();
  }
  if (game.farmer.lungeState === 'telegraph' && t.dashCooldown <= 0) game.doDash();
  // grab high corn, but never waste the jump when a solid hazard is near
  const corn = ahead.find((e) => e.kind === 'corn' && e.sx - TURKEY_X < jumpAt && e.sx - TURKEY_X > 0);
  if (corn && corn.y < GROUND_Y - 120 && t.grounded && !solidNear) game.doJump();
  void dt;
}

// --- main loop ----------------------------------------------------------
let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (autoplay) autoPilot(dt);

  // state keys
  if (game.state === 'title' && input.confirmPressed()) {
    game.startRun();
  } else if (game.state === 'playing' && input.pausePressed()) {
    game.state = 'paused';
    sfx.stopMusic();
  } else if (game.state === 'paused' && input.pausePressed()) {
    game.state = 'playing';
    sfx.startMusic();
  } else if ((game.state === 'caught' || game.state === 'escaped') && input.restartPressed()) {
    game.startRun();
  }
  if (input.mutePressed()) {
    const muted = sfx.toggleMute();
    if (!muted && game.state === 'playing') sfx.startMusic();
  }

  game.update(dt);
  game.render();
  input.endFrame();
  requestAnimationFrame(frame);
}

if (shotMode) {
  setupShot(shotMode);
  if (shotMode === 'title' || shotMode === 'end') {
    game.render();
    window.__shotReady = true;
  }
} else {
  requestAnimationFrame(frame);
}

// expose the autopilot for the playtest driver
window.__autoPilot = autoPilot;
