// Gobble Run — keyboard, mouse and touch input.
// One job: turn raw events into clean queries the game loop can ask once
// per frame (held keys, and edges that fire exactly once per press).

const held = new Set();
const pressed = new Set();
let clickQueue = 0;
let anyGesture = false;

export function initInput(canvas) {
  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) pressed.add(event.code);
    held.add(event.code);
    anyGesture = true;
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  window.addEventListener('blur', () => {
    held.clear();
    pressed.clear();
  });
  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    clickQueue += 1;
    anyGesture = true;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
}

export function isDown(code) {
  return held.has(code);
}

// True only on the frame the key went down.
export function wasPressed(code) {
  return pressed.has(code);
}

// True when the player jumped with keyboard or clicked/tapped.
export function jumpPressed() {
  return (
    pressed.has('Space') ||
    pressed.has('ArrowUp') ||
    pressed.has('KeyW') ||
    clickQueue > 0
  );
}

export function slidePressed() {
  return pressed.has('ArrowDown') || pressed.has('KeyS');
}

export function dashPressed() {
  return pressed.has('ShiftLeft') || pressed.has('ShiftRight') || pressed.has('KeyX');
}

export function confirmPressed() {
  return pressed.has('Enter') || pressed.has('Space') || clickQueue > 0;
}

export function pausePressed() {
  return pressed.has('KeyP') || pressed.has('Escape');
}

export function mutePressed() {
  return pressed.has('KeyM');
}

export function restartPressed() {
  return pressed.has('KeyR') || pressed.has('Enter') || clickQueue > 0;
}

export function hasGesture() {
  return anyGesture;
}

// Call at the end of every frame: edges live for one frame only.
export function endFrame() {
  pressed.clear();
  clickQueue = 0;
}
