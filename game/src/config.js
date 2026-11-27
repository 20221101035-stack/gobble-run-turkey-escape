// Gobble Run — tuning, stages and shared constants.
// One job: every number the game balances on lives here, so tuning never
// means hunting through the update loop.

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const GROUND_Y = 604; // top of the ground strip the turkey runs on
export const TURKEY_X = 230; // fixed screen x of the turkey (world scrolls)
export const GRAVITY = 2600; // px / s^2
export const JUMP_V = -1060; // take-off velocity for a flap-jump
export const DASH_TIME = 0.45; // seconds of dash burst
export const DASH_COOLDOWN = 2.2; // seconds before the next dash
export const DASH_SPEED = 620; // extra world speed while dashing
export const BASE_SPEED = 250; // world scroll speed at the start (px/s)
export const MAX_SPEED = 540; // world scroll speed at the end
export const SPEED_PER_M = 0.16; // extra px/s per metre escaped
export const ESCAPE_DISTANCE = 1800; // metres to the forest gate: escaped
export const START_LIVES = 3;
export const START_GAP = 62; // farmer gap, 0 = caught, 100 = far behind
export const GAP_STUMBLE = 14; // gap lost when an obstacle hits
export const GAP_LUNGE = 18; // gap lost when a lunge lands
export const GAP_DASH = 5; // gap gained per dash
export const GAP_CORN = 1; // gap gained per corn cob
export const GAP_BUSH = 22; // gap gained from a camouflage bush
export const INVULN_TIME = 1.3; // seconds of mercy after a hit

// The escape runs through three places; each stage changes the palette,
// the scenery and which hazards show up.
export const STAGES = [
  {
    id: 'farmyard',
    name: 'FARMYARD',
    start: 0,
    end: 600,
    skyTop: '#ffd28a',
    skyBottom: '#ffe9c4',
    ground: '#c98f4e',
    groundDark: '#a96f35',
    grass: '#7da65c',
    hint: 'Jump the fences, dodge the mud, grab the corn!',
  },
  {
    id: 'barn',
    name: 'BARN',
    start: 600,
    end: 1200,
    skyTop: '#e8a06a',
    skyBottom: '#f7cf9a',
    ground: '#8a5a34',
    groundDark: '#6d4426',
    grass: '#8a7a4a',
    hint: 'Mind the hanging carving knives — slide under them!',
  },
  {
    id: 'kitchen',
    name: 'KITCHEN',
    start: 1200,
    end: 1800,
    skyTop: '#d97b5f',
    skyBottom: '#f2b28c',
    ground: '#7a4a3a',
    groundDark: '#5f382c',
    grass: '#a08a5a',
    hint: 'The oven is lit! Jump the flames, dodge the falling knives!',
  },
];

// Spawn tables: [kind, weight] per stage. Weights are relative.
export const SPAWNS = {
  farmyard: [
    ['fence', 3],
    ['haybale', 2],
    ['mud', 2],
    ['pumpkin', 1],
    ['corn', 4],
    ['bush', 1],
  ],
  barn: [
    ['crate', 3],
    ['hangknife', 3],
    ['haybale', 2],
    ['corn', 4],
    ['feather', 1],
    ['bush', 1],
  ],
  kitchen: [
    ['oven', 3],
    ['fallknife', 3],
    ['pot', 2],
    ['corn', 3],
    ['feather', 1],
    ['bush', 1],
  ],
};

export const SCORE = {
  perMetre: 1,
  corn: 25,
  pumpkin: 50,
  feather: 150,
  stageBonus: 500,
};

// Deterministic RNG so screenshots and playtests are reproducible.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}
