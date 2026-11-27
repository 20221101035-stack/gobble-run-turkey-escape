// Gobble Run — the farmer who chases the turkey.
// One job: turn the turkey's mistakes into pressure. The gap is the
// farmer's distance behind the turkey: stumbles and lunges close it,
// dashes and corn open it. At zero he grabs the turkey.

import { clamp } from './config.js';

export class Farmer {
  constructor() {
    this.reset();
  }

  reset() {
    this.gap = 62; // 0..100
    this.lungeTimer = 7 + Math.random() * 4; // seconds until the next lunge
    this.lungeState = 'idle'; // idle | telegraph | lunging
    this.lungeClock = 0;
    this.runPhase = 0;
    this.searching = false;
    this.searchTimer = 0;
    this.shouted = false;
  }

  // gap: 0..100. Returns 'caught' when the farmer closes in.
  update(dt, speed, player) {
    this.runPhase += dt * (6 + speed / 90);
    // the farmer slowly gains when the turkey dawdles, loses when it dashes
    const pressure = player.dashing ? 2.2 : -0.35;
    this.gap = clamp(this.gap + pressure * dt, 0, 100);

    if (this.searching) {
      this.searchTimer -= dt;
      if (this.searchTimer <= 0) this.searching = false;
      this.lungeTimer = Math.max(this.lungeTimer, 4);
    } else {
      this.lungeTimer -= dt;
      if (this.lungeTimer <= 0 && this.lungeState === 'idle') {
        this.lungeState = 'telegraph';
        this.lungeClock = 0.85; // the wind-up the player can see
        this.shouted = false;
      }
    }

    if (this.lungeState === 'telegraph') {
      this.lungeClock -= dt;
      if (!this.shouted) {
        this.shouted = true;
        player.onFarmerShout();
      }
      if (this.lungeClock <= 0) {
        this.lungeState = 'lunging';
        this.lungeClock = 0.45; // the net swipe
      }
    } else if (this.lungeState === 'lunging') {
      this.lungeClock -= dt;
      if (this.lungeClock <= 0) {
        this.lungeState = 'idle';
        this.lungeTimer = 7 + Math.random() * 5;
        player.onFarmerLungeEnd();
      }
    }

    if (this.gap <= 0) return 'caught';
    return 'ok';
  }

  // Called when the turkey stumbles on an obstacle.
  stumble(amount) {
    this.gap = clamp(this.gap - amount, 0, 100);
  }

  // Called when the turkey dashes, grabs corn, or hides in a bush.
  gain(amount) {
    this.gap = clamp(this.gap + amount, 0, 100);
  }

  // The turkey vanished into a bush: the farmer stops and looks around.
  startSearch(seconds) {
    this.searching = true;
    this.searchTimer = seconds;
    this.lungeState = 'idle';
    this.lungeTimer = Math.max(this.lungeTimer, 5);
  }

  // 0..1 lunge amount for the drawing (0 = running, 1 = full lunge).
  lungeAmount() {
    if (this.lungeState === 'telegraph') return 0.35;
    if (this.lungeState === 'lunging') return 1;
    return 0;
  }

  // screen x of the farmer: he trails the turkey by the gap.
  screenX() {
    // gap 100 -> far left off-screen edge; gap 0 -> right on the turkey
    return 60 - (100 - this.gap) * -0.4 + (100 - this.gap) * 1.15;
  }
}
