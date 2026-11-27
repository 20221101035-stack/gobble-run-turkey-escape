// Gobble Run — the scrolling world: spawning, hazards, pickups.
// One job: keep a fair, readable stream of things to dodge and grab
// coming at the turkey, matched to the current stage.

import { GROUND_Y, SPAWNS, mulberry32 } from './config.js';

// Hitbox sizes by kind, in px, relative to the entity anchor (ground line).
const SHAPES = {
  fence: { w: 74, h: 52, y: GROUND_Y - 26, solid: true },
  haybale: { w: 62, h: 62, y: GROUND_Y - 31, solid: true },
  mud: { w: 110, h: 18, y: GROUND_Y - 9, solid: true, slow: true },
  pumpkin: { w: 54, h: 46, y: GROUND_Y - 23, solid: true },
  crate: { w: 56, h: 56, y: GROUND_Y - 28, solid: true },
  hangknife: { w: 34, h: 132, y: GROUND_Y - 108, solid: true, high: true },
  oven: { w: 110, h: 100, y: GROUND_Y - 50, solid: true },
  pot: { w: 66, h: 30, y: GROUND_Y - 15, solid: true },
  fallknife: { w: 30, h: 60, y: GROUND_Y - 30, solid: true, falling: true },
  corn: { w: 30, h: 40, y: GROUND_Y - 96, solid: false },
  feather: { w: 30, h: 44, y: GROUND_Y - 130, solid: false },
  bush: { w: 76, h: 54, y: GROUND_Y - 27, solid: false },
};

function pickKind(rng, stageId) {
  const table = SPAWNS[stageId];
  let total = 0;
  for (const [, w] of table) total += w;
  let roll = rng() * total;
  for (const [kind, w] of table) {
    roll -= w;
    if (roll <= 0) return kind;
  }
  return 'corn';
}

export class World {
  constructor(seed) {
    this.rng = mulberry32(seed);
    this.entities = [];
    this.scrollX = 0;
    this.spawnX = 1500; // next spawn position in world px
    this.time = 0;
  }

  reset(seed) {
    this.rng = mulberry32(seed);
    this.entities = [];
    this.scrollX = 0;
    this.spawnX = 1500;
    this.time = 0;
  }

  // Spawn a pattern: sometimes a single hazard, sometimes a hazard with
  // a corn arc over it so a good jump pays off.
  spawnNext(stageId, speed) {
    const kind = pickKind(this.rng, stageId);
    const x = this.spawnX;
    const shape = SHAPES[kind];
    const ent = {
      kind,
      x,
      w: shape.w,
      h: shape.h,
      y: shape.y,
      solid: shape.solid,
      slow: !!shape.slow,
      high: !!shape.high,
      falling: !!shape.falling,
      passed: false,
      hit: false,
      // falling knife state machine: shadow -> drop -> stuck
      knifeState: 'shadow',
      knifeTimer: 0.7 + this.rng() * 0.5,
      knifeY: -260,
      // oven flame cycle
      flame: 0,
      flameTimer: 0.6 + this.rng() * 0.8,
      swing: this.rng() * Math.PI * 2,
    };
    this.entities.push(ent);
    if (kind === 'fence' || kind === 'haybale' || kind === 'crate' || kind === 'pot') {
      // reward the jump: a corn arc over the obstacle
      if (this.rng() < 0.75) {
        for (const dx of [-30, 0, 30]) {
          this.entities.push({
            kind: 'corn',
            x: x + dx,
            w: 30,
            h: 40,
            y: GROUND_Y - 150 - Math.abs(dx) * 0.4,
            solid: false,
            passed: false,
            hit: false,
            swing: this.rng() * Math.PI * 2,
          });
        }
      }
    }
    // gap to the next spawn shrinks as speed grows, never below a fair gap
    const gap = Math.max(300, 560 - speed * 0.45) + this.rng() * 260;
    this.spawnX += gap;
  }

  update(dt, speed, stageId) {
    this.time += dt;
    this.scrollX += speed * dt;
    // spawn ahead of the right edge
    while (this.spawnX < this.scrollX + 1500) this.spawnNext(stageId, speed);
    for (const e of this.entities) {
      e.swing += dt * 3;
      if (e.kind === 'fallknife') {
        e.knifeTimer -= dt;
        if (e.knifeState === 'shadow' && e.knifeTimer <= 0) {
          e.knifeState = 'falling';
        } else if (e.knifeState === 'falling') {
          e.knifeY += 1500 * dt;
          if (e.knifeY >= GROUND_Y - 40) {
            e.knifeY = GROUND_Y - 40;
            e.knifeState = 'stuck';
          }
        }
      }
      if (e.kind === 'oven') {
        e.flameTimer -= dt;
        if (e.flameTimer <= 0) {
          e.flame = e.flame > 0 ? 0 : 1;
          e.flameTimer = e.flame > 0 ? 0.9 + this.rng() * 0.5 : 0.8 + this.rng() * 0.9;
        }
      }
    }
    // drop anything far behind
    this.entities = this.entities.filter((e) => e.x - this.scrollX > -260);
  }

  // screen x of a world x
  screenX(worldX) {
    return worldX - this.scrollX;
  }

  // entities currently on screen, left to right
  visible() {
    return this.entities.filter((e) => {
      const sx = this.screenX(e.x);
      return sx > -160 && sx < 1440;
    });
  }
}

// Axis-aligned hit test between the turkey box and an entity box.
export function hitsTurkey(turkeyBox, e, scrollX) {
  const ex = e.x - scrollX - e.w / 2;
  const ey = e.y - e.h / 2;
  return (
    turkeyBox.x < ex + e.w &&
    turkeyBox.x + turkeyBox.w > ex &&
    turkeyBox.y < ey + e.h &&
    turkeyBox.y + turkeyBox.h > ey
  );
}
