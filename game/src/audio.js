// Gobble Run — every sound is synthesized with WebAudio, no audio files.
// One job: bleeps, gobbles and a little autumn tune, all from oscillators.

let ctx = null;
let muted = false;
let musicTimer = null;
let musicStep = 0;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function unlockAudio() {
  audio();
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  if (muted) stopMusic();
  return muted;
}

function tone(freq, dur, type, vol, when = 0, slideTo = null) {
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(dur, vol, filterFreq) {
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const gain = ac.createGain();
  gain.gain.value = vol;
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start(t0);
}

// The turkey's own voice: two throaty low blips.
export function sfxGobble() {
  tone(180, 0.09, 'square', 0.16, 0, 120);
  tone(150, 0.12, 'square', 0.16, 0.1, 95);
}

export function sfxFlap() {
  noiseBurst(0.14, 0.2, 900);
}

export function sfxPickup() {
  tone(660, 0.08, 'sine', 0.2, 0, 990);
  tone(990, 0.1, 'sine', 0.18, 0.07, 1320);
}

export function sfxFeather() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'triangle', 0.2, i * 0.07));
}

export function sfxThud() {
  tone(90, 0.22, 'sine', 0.32, 0, 45);
  noiseBurst(0.12, 0.18, 400);
}

export function sfxAlarm() {
  tone(440, 0.12, 'square', 0.14, 0, 440);
  tone(349, 0.14, 'square', 0.14, 0.14, 349);
}

export function sfxDash() {
  noiseBurst(0.2, 0.16, 2400);
  tone(300, 0.16, 'sawtooth', 0.08, 0, 720);
}

export function sfxClick() {
  tone(520, 0.05, 'sine', 0.14);
}

export function sfxWin() {
  [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'triangle', 0.22, i * 0.11));
}

export function sfxCaught() {
  [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.14, i * 0.16));
}

// A short plucky autumn loop: bass + melody, scheduled a bar at a time.
const MELODY = [
  392, 0, 523, 659, 587, 0, 523, 440, 392, 0, 440, 523, 659, 587, 523, 0,
  587, 0, 659, 784, 659, 587, 523, 440, 392, 440, 523, 0, 392, 0, 0, 0,
];
const BASS = [131, 0, 0, 0, 175, 0, 0, 0, 196, 0, 0, 0, 175, 0, 147, 0];

export function startMusic() {
  if (musicTimer || muted) return;
  const ac = audio();
  if (!ac) return;
  musicStep = 0;
  musicTimer = window.setInterval(() => {
    if (muted) return;
    const step = musicStep % 32;
    const m = MELODY[step];
    const b = BASS[step % 16];
    if (m) tone(m, 0.22, 'triangle', 0.07);
    if (b) tone(b, 0.3, 'sine', 0.1);
    musicStep += 1;
  }, 190);
}

export function stopMusic() {
  if (musicTimer) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
}
