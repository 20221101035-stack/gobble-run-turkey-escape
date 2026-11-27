// Gobble Run — the game itself: state machine, physics, collisions,
// scoring, HUD and screens. One job: turn input + world + farmer into
// a complete, playable escape.

import {
  VIEW_W,
  VIEW_H,
  GROUND_Y,
  TURKEY_X,
  GRAVITY,
  JUMP_V,
  DASH_TIME,
  DASH_COOLDOWN,
  DASH_SPEED,
  BASE_SPEED,
  MAX_SPEED,
  SPEED_PER_M,
  ESCAPE_DISTANCE,
  START_LIVES,
  START_GAP,
  GAP_STUMBLE,
  GAP_LUNGE,
  GAP_DASH,
  GAP_CORN,
  GAP_BUSH,
  INVULN_TIME,
  STAGES,
  SCORE,
  clamp,
  lerp,
} from './config.js';
import * as input from './input.js';
import * as sfx from './audio.js';
import * as sprites from './sprites.js';
import { World, hitsTurkey } from './world.js';
import { Farmer } from './farmer.js';

const PX_PER_M = 40;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = 'title'; // title | playing | paused | caught | escaped
    this.time = 0;
    this.runTime = 0;
    this.score = 0;
    this.best = 0;
    this.lives = START_LIVES;
    this.distance = 0;
    this.speed = BASE_SPEED;
    this.stageIndex = 0;
    this.banner = null; // { text, sub, t }
    this.particles = [];
    this.shake = 0;
    this.flash = 0;
    this.turkey = null;
    this.world = new World(1);
    this.farmer = new Farmer();
    this.gateX = null;
    this.endReason = '';
    this.endStats = null;
    this.mudSlow = false;
    this.debug = { collisions: 0, pickups: 0, jumps: 0, dashes: 0 };
    this.resetRun(1);
    this.state = 'title';
  }

  resetRun(seed) {
    this.world.reset(seed);
    this.farmer.reset();
    this.farmer.gap = START_GAP;
    this.score = 0;
    this.lives = START_LIVES;
    this.distance = 0;
    this.speed = BASE_SPEED;
    this.stageIndex = 0;
    this.runTime = 0;
    this.particles = [];
    this.shake = 0;
    this.flash = 0;
    this.gateX = null;
    this.endReason = '';
    this.endStats = null;
    this.mudSlow = false;
    this.turkey = {
      y: GROUND_Y, // feet
      vy: 0,
      grounded: true,
      sliding: false,
      slideTimer: 0,
      dashing: false,
      dashTimer: 0,
      dashCooldown: 0,
      invuln: 0,
      camo: 0,
      runPhase: 0,
    };
    this.showBanner('FARMYARD', STAGES[0].hint);
  }

  stage() {
    return STAGES[this.stageIndex];
  }

  showBanner(text, sub) {
    this.banner = { text, sub, t: 2.4 };
  }

  startRun() {
    this.resetRun((Math.random() * 1e9) | 0);
    this.state = 'playing';
    sfx.unlockAudio();
    sfx.startMusic();
    sfx.sfxGobble();
  }

  // --- player actions -------------------------------------------------
  doJump() {
    const t = this.turkey;
    if (this.state !== 'playing' || !t.grounded) return;
    t.vy = JUMP_V;
    t.grounded = false;
    t.sliding = false;
    this.debug.jumps += 1;
    sfx.sfxFlap();
    this.burstDust(6);
  }

  doSlide() {
    const t = this.turkey;
    if (this.state !== 'playing' || !t.grounded) return;
    t.sliding = true;
    t.slideTimer = 0.55;
  }

  doDash() {
    const t = this.turkey;
    if (this.state !== 'playing' || t.dashCooldown > 0 || t.dashing) return;
    t.dashing = true;
    t.dashTimer = DASH_TIME;
    t.dashCooldown = DASH_COOLDOWN;
    this.farmer.gain(GAP_DASH);
    this.debug.dashes += 1;
    sfx.sfxDash();
    this.burstDust(10);
  }

  // --- farmer callbacks ------------------------------------------------
  onFarmerShout() {
    sfx.sfxAlarm();
    this.showBanner('HE IS COMING!', 'Dash or jump when he lunges!');
  }

  onFarmerLungeEnd() {
    // the swipe lands only if the turkey is on the ground and not dashing
    const t = this.turkey;
    if (this.state !== 'playing') return;
    if (t.dashing || !t.grounded) return;
    this.farmer.stumble(GAP_LUNGE);
    this.flash = 0.35;
    this.shake = 8;
    sfx.sfxThud();
    this.showBanner('THE NET SWIPED YOU!', 'He is closing in — dash away!');
  }

  // --- effects --------------------------------------------------------
  burstDust(n) {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x: TURKEY_X - 30 + Math.random() * 20,
        y: GROUND_Y - Math.random() * 8,
        vx: -60 - Math.random() * 120,
        vy: -20 - Math.random() * 60,
        life: 0.4 + Math.random() * 0.3,
        max: 0.7,
        size: 3 + Math.random() * 5,
        color: '#d9c9a8',
      });
    }
  }

  burstStars(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 80 + Math.random() * 220;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 60,
        life: 0.5 + Math.random() * 0.4,
        max: 0.9,
        size: 3 + Math.random() * 5,
        color,
      });
    }
  }

  // --- update ---------------------------------------------------------
  update(dt) {
    this.time += dt;
    if (this.banner) {
      this.banner.t -= dt;
      if (this.banner.t <= 0) this.banner = null;
    }
    this.shake = Math.max(0, this.shake - dt * 30);
    this.flash = Math.max(0, this.flash - dt);
    this.updateParticles(dt);

    if (this.state === 'title') {
      // idle scene: the turkey waddles in place, the farmer paces
      this.turkey.runPhase += dt * 5;
      this.farmer.runPhase += dt * 4;
      return;
    }
    if (this.state !== 'playing') return;

    this.runTime += dt;
    const t = this.turkey;

    // speed ramps with distance
    this.speed = Math.min(MAX_SPEED, BASE_SPEED + this.distance * SPEED_PER_M);
    let speed = this.speed + (t.dashing ? DASH_SPEED : 0);
    if (this.mudSlow) speed *= 0.55;

    // timers
    t.dashCooldown = Math.max(0, t.dashCooldown - dt);
    t.invuln = Math.max(0, t.invuln - dt);
    t.camo = Math.max(0, t.camo - dt);
    if (t.dashing) {
      t.dashTimer -= dt;
      if (t.dashTimer <= 0) t.dashing = false;
    }
    if (t.sliding) {
      t.slideTimer -= dt;
      if (t.slideTimer <= 0) t.sliding = false;
    }

    // input
    if (input.jumpPressed()) this.doJump();
    if (input.slidePressed()) this.doSlide();
    if (input.dashPressed()) this.doDash();

    // vertical physics
    if (!t.grounded) {
      t.vy += GRAVITY * dt;
      t.y += t.vy * dt;
      if (t.y >= GROUND_Y) {
        t.y = GROUND_Y;
        t.vy = 0;
        t.grounded = true;
        this.burstDust(4);
      }
    }
    t.runPhase += dt * (7 + speed / 60);

    // world + distance
    this.world.update(dt, speed, this.stage().id);
    this.distance += (speed * dt) / PX_PER_M;
    this.score += speed * dt * SCORE.perMetre * 0.02;

    // stage changes
    const nextStage = STAGES.findIndex((s) => this.distance >= s.start && this.distance < s.end);
    if (nextStage !== -1 && nextStage !== this.stageIndex) {
      this.stageIndex = nextStage;
      this.score += SCORE.stageBonus;
      this.showBanner(this.stage().name, this.stage().hint);
      sfx.sfxFeather();
    }

    // the forest gate appears near the end
    if (this.gateX === null && this.distance >= ESCAPE_DISTANCE - 40) {
      this.gateX = this.world.scrollX + 1100;
    }
    if (this.gateX !== null) {
      const gateScreenX = this.gateX - this.world.scrollX;
      if (gateScreenX <= TURKEY_X + 20) {
        this.endRun(true, 'You reached the forest!');
        return;
      }
    }

    // farmer
    const farmerResult = this.farmer.update(dt, speed, {
      dashing: t.dashing,
      onFarmerShout: () => this.onFarmerShout(),
      onFarmerLungeEnd: () => this.onFarmerLungeEnd(),
    });
    if (farmerResult === 'caught') {
      this.endRun(false, 'The farmer caught up with you!');
      return;
    }

    // collisions
    this.mudSlow = false;
    const box = this.turkeyBox();
    for (const e of this.world.visible()) {
      if (e.hit) continue;
      const sx = this.world.screenX(e.x);
      if (sx < TURKEY_X - 160 || sx > TURKEY_X + 200) continue;
      if (e.kind === 'corn' || e.kind === 'feather' || e.kind === 'bush') {
        if (hitsTurkey(box, e, this.world.scrollX)) {
          e.hit = true;
          this.collect(e);
        }
        continue;
      }
      if (!e.solid) continue;
      if (e.kind === 'mud') {
        if (hitsTurkey(box, e, this.world.scrollX)) {
          this.mudSlow = true;
          if (!e.passed) {
            e.passed = true;
            this.farmer.stumble(4);
          }
        }
        continue;
      }
      if (e.kind === 'hangknife') {
        // only dangerous standing up: slide under it
        if (!t.sliding && hitsTurkey(box, e, this.world.scrollX)) this.hitObstacle(e);
        continue;
      }
      if (e.kind === 'oven') {
        // the body is solid; the flame column above it burns when lit
        if (hitsTurkey(box, e, this.world.scrollX)) {
          this.hitObstacle(e);
          continue;
        }
        if (e.flame > 0) {
          // the flame column above the oven body: a well-timed jump clears it
          const flameBox = {
            x: e.x - this.world.scrollX - 44,
            y: GROUND_Y - 96 - 60,
            w: 88,
            h: 60,
          };
          if (
            box.x < flameBox.x + flameBox.w &&
            box.x + box.w > flameBox.x &&
            box.y < flameBox.y + flameBox.h &&
            box.y + box.h > flameBox.y
          ) {
            this.hitObstacle(e);
          }
        }
        continue;
      }
      if (e.kind === 'fallknife') {
        if (e.knifeState === 'shadow') continue;
        const knifeBox = {
          x: e.x - this.world.scrollX - 15,
          y: e.knifeY - 30,
          w: 30,
          h: 60,
        };
        if (
          box.x < knifeBox.x + knifeBox.w &&
          box.x + box.w > knifeBox.x &&
          box.y < knifeBox.y + knifeBox.h &&
          box.y + box.h > knifeBox.y
        ) {
          this.hitObstacle(e);
        }
        continue;
      }
      if (e.kind === 'pumpkin') {
        if (hitsTurkey(box, e, this.world.scrollX)) {
          if (t.dashing) {
            e.hit = true;
            this.score += SCORE.pumpkin;
            this.burstStars(sx, e.y - 20, '#ff8c1a', 16);
            sfx.sfxPickup();
          } else {
            this.hitObstacle(e);
          }
        }
        continue;
      }
      if (hitsTurkey(box, e, this.world.scrollX)) this.hitObstacle(e);
    }
  }

  turkeyBox() {
    const t = this.turkey;
    const h = t.sliding ? 40 : 66;
    return {
      x: TURKEY_X - 28,
      y: t.y - h,
      w: 56,
      h,
    };
  }

  collect(e) {
    this.debug.pickups += 1;
    const sx = this.world.screenX(e.x);
    if (e.kind === 'corn') {
      this.score += SCORE.corn;
      this.farmer.gain(GAP_CORN);
      this.burstStars(sx, e.y - 10, '#ffd23c', 8);
      sfx.sfxPickup();
    } else if (e.kind === 'feather') {
      this.score += SCORE.feather;
      this.turkey.dashCooldown = 0;
      this.burstStars(sx, e.y - 10, '#e8a33c', 14);
      sfx.sfxFeather();
      this.showBanner('GOLDEN FEATHER!', 'Dash recharged!');
    } else if (e.kind === 'bush') {
      this.turkey.camo = 3;
      this.farmer.gain(GAP_BUSH);
      this.farmer.startSearch(3);
      this.burstStars(sx, e.y - 10, '#6da34a', 14);
      sfx.sfxPickup();
      this.showBanner('HIDDEN IN THE BUSH!', 'The farmer lost your trail!');
    }
  }

  hitObstacle(e) {
    const t = this.turkey;
    if (t.invuln > 0 || this.state !== 'playing') return;
    e.hit = true;
    this.debug.collisions += 1;
    this.lives -= 1;
    t.invuln = INVULN_TIME;
    this.farmer.stumble(GAP_STUMBLE);
    this.shake = 10;
    this.flash = 0.4;
    this.burstStars(TURKEY_X, t.y - 40, '#ff5a3c', 14);
    sfx.sfxThud();
    if (this.lives <= 0) {
      this.endRun(false, 'The farmer grabbed you by the drumstick!');
    }
  }

  endRun(escaped, reason) {
    this.state = escaped ? 'escaped' : 'caught';
    this.endReason = reason;
    this.endStats = {
      score: Math.floor(this.score),
      distance: Math.floor(this.distance),
      time: this.runTime,
      pickups: this.debug.pickups,
    };
    if (Math.floor(this.score) > this.best) this.best = Math.floor(this.score);
    sfx.stopMusic();
    if (escaped) sfx.sfxWin();
    else sfx.sfxCaught();
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  // --- render ---------------------------------------------------------
  render() {
    const ctx = this.ctx;
    ctx.save();
    if (this.shake > 0) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }
    const stage = this.state === 'title' ? STAGES[0] : this.stage();
    sprites.drawBackground(ctx, stage, this.world.scrollX, this.time);

    // forest gate
    if (this.gateX !== null) {
      const gx = this.gateX - this.world.scrollX;
      if (gx > -200 && gx < VIEW_W + 200) sprites.drawForestGate(ctx, gx, GROUND_Y, 1);
    }

    // world entities
    for (const e of this.world.visible()) {
      const sx = this.world.screenX(e.x);
      if (e.hit) continue;
      switch (e.kind) {
        case 'fence':
          sprites.drawFence(ctx, sx - 37, GROUND_Y, 74);
          break;
        case 'haybale':
          sprites.drawHayBale(ctx, sx, GROUND_Y - 31, 1);
          break;
        case 'mud':
          sprites.drawMud(ctx, sx - 55, GROUND_Y, 110);
          break;
        case 'pumpkin':
          sprites.drawPumpkin(ctx, sx, GROUND_Y - 22, 1);
          break;
        case 'crate':
          sprites.drawCrate(ctx, sx, GROUND_Y - 28, 1);
          break;
        case 'hangknife':
          sprites.drawHangKnife(ctx, sx, GROUND_Y, 1, e.swing);
          break;
        case 'oven':
          sprites.drawOven(ctx, sx, GROUND_Y, 1, e.flame);
          break;
        case 'pot':
          sprites.drawPot(ctx, sx, GROUND_Y - 12, 1);
          break;
        case 'fallknife':
          if (e.knifeState === 'shadow') {
            // telegraph: a pulsing shadow on the ground
            ctx.fillStyle = `rgba(0,0,0,${0.25 + 0.15 * Math.sin(this.time * 10)})`;
            ctx.beginPath();
            ctx.ellipse(sx, GROUND_Y - 2, 26, 7, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#3a2c1e';
            ctx.font = 'bold 20px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.fillText('!', sx, GROUND_Y - 70);
          } else {
            sprites.drawFallKnife(ctx, sx, e.knifeY, 1, e.knifeState === 'falling');
          }
          break;
        case 'corn':
          sprites.drawCorn(ctx, sx, e.y, 1, Math.sin(e.swing) * 4);
          break;
        case 'feather':
          sprites.drawFeather(ctx, sx, e.y, 1, Math.sin(e.swing) * 5);
          break;
        case 'bush':
          sprites.drawBush(ctx, sx, GROUND_Y - 24, 1);
          break;
        default:
          break;
      }
    }

    // farmer (behind the turkey, at the left). On the escaped screen he
    // is gone: the turkey got away.
    const farmerX = this.state === 'title' ? 90 : this.farmer.screenX();
    if (farmerX > -160 && this.state !== 'escaped') {
      sprites.drawFarmer(ctx, farmerX, GROUND_Y - 56, 1, {
        run: this.farmer.runPhase,
        lunge: this.farmer.lungeAmount(),
        searching: this.farmer.searching,
      });
      if (this.farmer.lungeState === 'telegraph') {
        ctx.fillStyle = '#b03a2a';
        ctx.font = 'bold 26px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('GOBBLE!', farmerX + 30, GROUND_Y - 190);
      }
    }

    // the turkey
    const t = this.turkey;
    const turkeyScale = 1;
    sprites.drawTurkey(ctx, TURKEY_X, t.y - 46 * turkeyScale, turkeyScale, {
      run: t.runPhase,
      air: !t.grounded,
      slide: t.sliding,
      blink: t.invuln > 0,
      camo: t.camo > 0,
    });

    // particles
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,60,40,${this.flash * 0.5})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    ctx.restore();

    // HUD + screens live above the world
    if (this.state === 'playing' || this.state === 'paused') this.renderHud();
    if (this.state === 'title') this.renderTitle();
    if (this.state === 'paused') this.renderPaused();
    if (this.state === 'caught' || this.state === 'escaped') this.renderEnd();
    if (this.banner && this.state === 'playing') this.renderBanner();
  }

  renderHud() {
    const ctx = this.ctx;
    // top bar
    ctx.fillStyle = 'rgba(40,24,10,0.55)';
    ctx.fillRect(0, 0, VIEW_W, 64);
    ctx.fillStyle = '#ffe9c4';
    ctx.font = 'bold 26px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${Math.floor(this.score)}`, 18, 40);
    // distance progress: farmyard -> barn -> kitchen -> forest
    const prog = clamp(this.distance / ESCAPE_DISTANCE, 0, 1);
    const barX = 330;
    const barW = 620;
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(barX, 22, barW, 16);
    ctx.fillStyle = '#ffd23c';
    ctx.fillRect(barX, 22, barW * prog, 16);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, 22, barW, 16);
    for (const s of STAGES) {
      const mx = barX + (s.end / ESCAPE_DISTANCE) * barW;
      ctx.beginPath();
      ctx.moveTo(mx, 18);
      ctx.lineTo(mx, 42);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffe9c4';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.floor(this.distance)} m  ·  ${this.stage().name}`, barX + barW / 2, 58);
    ctx.textAlign = 'right';
    ctx.fillText('FOREST', barX + barW + 4, 40);
    // hearts
    ctx.textAlign = 'left';
    for (let i = 0; i < START_LIVES; i++) {
      const hx = 990 + i * 34;
      ctx.font = '28px serif';
      ctx.fillStyle = i < this.lives ? '#ff5a5a' : 'rgba(255,255,255,0.25)';
      ctx.fillText('♥', hx, 42);
    }
    // farmer gap meter
    ctx.fillStyle = 'rgba(40,24,10,0.55)';
    ctx.fillRect(18, 78, 190, 44);
    ctx.fillStyle = '#ffb3a3';
    ctx.font = 'bold 13px Georgia, serif';
    ctx.fillText('FARMER', 28, 96);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(28, 102, 170, 10);
    ctx.fillStyle = this.farmer.gap < 25 ? '#ff3b2a' : '#7ec850';
    ctx.fillRect(28, 102, 170 * (this.farmer.gap / 100), 10);
    // dash cooldown
    const t = this.turkey;
    ctx.fillStyle = 'rgba(40,24,10,0.55)';
    ctx.fillRect(VIEW_W - 208, 78, 190, 44);
    ctx.fillStyle = '#ffe9c4';
    ctx.font = 'bold 13px Georgia, serif';
    ctx.fillText('DASH [Shift]', VIEW_W - 198, 96);
    const cd = t.dashCooldown > 0 ? 1 - t.dashCooldown / DASH_COOLDOWN : 1;
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(VIEW_W - 198, 102, 170, 10);
    ctx.fillStyle = cd >= 1 ? '#ffd23c' : '#c9a86a';
    ctx.fillRect(VIEW_W - 198, 102, 170 * cd, 10);
    // mute hint
    ctx.fillStyle = 'rgba(255,233,196,0.75)';
    ctx.font = '13px Georgia, serif';
    ctx.textAlign = 'right';
    ctx.fillText(sfx.isMuted() ? 'M: sound OFF' : 'M: sound ON · P: pause', VIEW_W - 18, VIEW_H - 14);
  }

  renderBanner() {
    const ctx = this.ctx;
    const b = this.banner;
    const a = clamp(b.t, 0, 1);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 44px Georgia, serif';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 10;
    ctx.fillText(b.text, VIEW_W / 2, 170);
    if (b.sub) {
      ctx.font = '20px Georgia, serif';
      ctx.fillText(b.sub, VIEW_W / 2, 204);
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  renderTitle() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(30,16,6,0.45)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd23c';
    ctx.font = 'bold 92px Georgia, serif';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 18;
    ctx.fillText('GOBBLE RUN', VIEW_W / 2, 210);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'italic 30px Georgia, serif';
    ctx.fillText('The Great Thanksgiving Escape', VIEW_W / 2, 262);
    ctx.font = '20px Georgia, serif';
    ctx.fillStyle = '#ffe9c4';
    ctx.fillText('Thanksgiving is coming, and you are the main course.', VIEW_W / 2, 320);
    ctx.fillText('Outrun the farmer, dodge the oven and the carving knives,', VIEW_W / 2, 350);
    ctx.fillText('and reach the forest before dinner is served.', VIEW_W / 2, 380);
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('↑ / SPACE jump  ·  ↓ slide  ·  SHIFT dash  ·  grab corn & feathers', VIEW_W / 2, 448);
    ctx.fillText('Smash pumpkins while dashing  ·  Hide in the bushes', VIEW_W / 2, 482);
    const blink = Math.floor(this.time * 2) % 2 === 0;
    if (blink) {
      ctx.fillStyle = '#ffd23c';
      ctx.font = 'bold 30px Georgia, serif';
      ctx.fillText('PRESS ENTER OR CLICK TO START', VIEW_W / 2, 560);
    }
    if (this.best > 0) {
      ctx.fillStyle = '#ffe9c4';
      ctx.font = '20px Georgia, serif';
      ctx.fillText(`Best score: ${this.best}`, VIEW_W / 2, 610);
    }
  }

  renderPaused() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(30,16,6,0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 56px Georgia, serif';
    ctx.fillText('PAUSED', VIEW_W / 2, 340);
    ctx.font = '22px Georgia, serif';
    ctx.fillText('Press P to keep running', VIEW_W / 2, 390);
  }

  renderEnd() {
    const ctx = this.ctx;
    const escaped = this.state === 'escaped';
    ctx.fillStyle = escaped ? 'rgba(20,60,20,0.55)' : 'rgba(60,10,5,0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = escaped ? '#8dff6a' : '#ff6a4a';
    ctx.font = 'bold 84px Georgia, serif';
    ctx.fillText(escaped ? 'ESCAPED!' : 'CAUGHT!', VIEW_W / 2, 230);
    ctx.fillStyle = '#fff';
    ctx.font = '24px Georgia, serif';
    ctx.fillText(this.endReason, VIEW_W / 2, 286);
    if (this.endStats) {
      ctx.font = 'bold 26px Georgia, serif';
      ctx.fillText(`Score ${this.endStats.score}   ·   ${this.endStats.distance} m escaped`, VIEW_W / 2, 350);
      ctx.font = '20px Georgia, serif';
      ctx.fillStyle = '#ffe9c4';
      ctx.fillText(
        `Time ${this.endStats.time.toFixed(1)}s  ·  ${this.endStats.pickups} pickups  ·  Best ${this.best}`,
        VIEW_W / 2,
        388,
      );
    }
    if (escaped) {
      ctx.font = '20px Georgia, serif';
      ctx.fillText('The forest is safe. This year, the turkey serves no dinner.', VIEW_W / 2, 440);
    } else {
      ctx.font = '20px Georgia, serif';
      ctx.fillText('The farmer is already sharpening the carving knife…', VIEW_W / 2, 440);
    }
    const blink = Math.floor(this.time * 2) % 2 === 0;
    if (blink) {
      ctx.fillStyle = '#ffd23c';
      ctx.font = 'bold 30px Georgia, serif';
      ctx.fillText('PRESS R TO RUN AGAIN', VIEW_W / 2, 520);
    }
  }

  // --- debug / automation hooks (read-only state for the playtester) ----
  debugState() {
    return {
      state: this.state,
      score: Math.floor(this.score),
      distance: Math.floor(this.distance),
      lives: this.lives,
      gap: Math.round(this.farmer.gap),
      speed: Math.round(this.speed),
      stage: this.stage().id,
      turkeyY: Math.round(this.turkey.y),
      turkeyGrounded: this.turkey.grounded,
      dashCooldown: +this.turkey.dashCooldown.toFixed(2),
      farmerLunge: this.farmer.lungeState,
      entities: this.world.visible().map((e) => ({
        kind: e.kind,
        sx: Math.round(this.world.screenX(e.x)),
        y: Math.round(e.y),
        state: e.knifeState || null,
        flame: e.flame || 0,
      })),
    };
  }
}
