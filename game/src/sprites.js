// Gobble Run — every picture is drawn with canvas paths, no image files.
// One job: the turkey, the farmer, the hazards, the pickups and the
// scenery, all in a warm autumn palette.

function ellipse(ctx, x, y, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function circle(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function poly(ctx, points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
}

// The hero: a plump brown turkey with a fanned tail, mid-waddle.
// pose: { run: 0..1 (leg phase), air: bool, slide: bool, blink: bool, camo: bool }
export function drawTurkey(ctx, x, y, s, pose) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (pose.blink && Math.floor(performance.now() / 90) % 2 === 0) ctx.globalAlpha = 0.35;
  if (pose.slide) ctx.scale(1.25, 0.62);

  const legSwing = Math.sin(pose.run * Math.PI * 2) * 10;
  const wingFlap = pose.air ? Math.sin(pose.run * Math.PI * 6) * 0.5 : 0;

  // fanned tail feathers
  const tailColors = ['#b5772f', '#c98a3a', '#a8641f', '#d99a45', '#8a4d18'];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.38;
    const tx = -34 + Math.cos(a) * 34;
    const ty = -22 + Math.sin(a) * 34;
    ctx.save();
    ctx.translate(-20, -18);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = tailColors[i];
    ctx.beginPath();
    ctx.ellipse(0, -20, 9, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5e3a12';
    ctx.beginPath();
    ctx.ellipse(0, -38, 5, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    void tx;
    void ty;
  }

  // legs
  ctx.strokeStyle = '#e07b39';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-6, 26);
  ctx.lineTo(-6 + legSwing, 44);
  ctx.moveTo(8, 26);
  ctx.lineTo(8 - legSwing, 44);
  ctx.stroke();
  // feet
  ctx.strokeStyle = '#d96a1e';
  ctx.beginPath();
  ctx.moveTo(-6 + legSwing, 44);
  ctx.lineTo(-12 + legSwing, 48);
  ctx.moveTo(-6 + legSwing, 44);
  ctx.lineTo(0 + legSwing, 48);
  ctx.moveTo(8 - legSwing, 44);
  ctx.lineTo(2 - legSwing, 48);
  ctx.moveTo(8 - legSwing, 44);
  ctx.lineTo(14 - legSwing, 48);
  ctx.stroke();

  // body
  ellipse(ctx, 0, 0, 40, 30, '#8a5a2b');
  ellipse(ctx, 12, 8, 26, 18, '#a9713a');
  // wing
  ctx.save();
  ctx.translate(-4, -4);
  ctx.rotate(-0.25 + wingFlap);
  ellipse(ctx, 0, 0, 22, 13, '#6d4420');
  ctx.restore();
  // head
  circle(ctx, 34, -34, 15, '#9c6a33');
  circle(ctx, 34, -34, 15, '#b07a3e');
  // beak
  poly(ctx, [[46, -38], [60, -33], [46, -29]], '#e8963c');
  // wattle
  ellipse(ctx, 42, -24, 4, 8, '#d43d2a');
  // snood
  ellipse(ctx, 48, -40, 3, 6, '#d43d2a');
  // eye
  circle(ctx, 38, -38, 3.5, '#1c1410');
  circle(ctx, 39.5, -39.5, 1.2, '#fff');

  if (pose.camo) {
    // leafy camouflage: a few green leaves over the back
    ctx.fillStyle = '#5d8a3c';
    for (const [lx, ly, lr] of [[-14, -22, 9], [2, -28, 8], [16, -20, 7]]) {
      ctx.beginPath();
      ctx.ellipse(lx, ly, lr, lr * 0.55, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// The villain: a farmer in overalls and a straw hat, net in hand.
// pose: { run, lunge: 0..1 (0 idle, 1 full lunge), searching: bool }
export function drawFarmer(ctx, x, y, s, pose) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const lean = pose.lunge * 0.35;
  const legSwing = Math.sin(pose.run * Math.PI * 2) * 12;
  ctx.rotate(lean);

  // legs (overalls)
  ctx.strokeStyle = '#3a5a8a';
  ctx.lineWidth = 11;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-8, 8);
  ctx.lineTo(-8 + legSwing, 52);
  ctx.moveTo(8, 8);
  ctx.lineTo(8 - legSwing, 52);
  ctx.stroke();
  // boots
  ellipse(ctx, -8 + legSwing, 54, 10, 5, '#4a2c14');
  ellipse(ctx, 8 - legSwing, 54, 10, 5, '#4a2c14');
  // torso: red shirt + overalls bib
  ellipse(ctx, 0, -14, 24, 26, '#b03a2a');
  poly(ctx, [[-18, -30], [18, -30], [14, 12], [-14, 12]], '#3a5a8a');
  // arms reaching forward with the net
  ctx.strokeStyle = '#b03a2a';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(10, -26);
  ctx.lineTo(38, -18 + (pose.lunge ? -8 : 0));
  ctx.stroke();
  // net: a ring with a mesh
  ctx.save();
  ctx.translate(52, -22 + (pose.lunge ? -10 : 0));
  ctx.strokeStyle = '#7a5a2a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(220,220,220,0.85)';
  ctx.lineWidth = 1.2;
  for (let i = -12; i <= 12; i += 6) {
    ctx.beginPath();
    ctx.moveTo(i, -14);
    ctx.lineTo(i, 14);
    ctx.moveTo(-14, i);
    ctx.lineTo(14, i);
    ctx.stroke();
  }
  ctx.restore();
  // head
  circle(ctx, 2, -52, 14, '#e8b98a');
  // angry eyes
  circle(ctx, 8, -55, 2.2, '#1c1410');
  circle(ctx, 14, -55, 2.2, '#1c1410');
  ctx.strokeStyle = '#1c1410';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(5, -60);
  ctx.lineTo(11, -58);
  ctx.moveTo(17, -60);
  ctx.lineTo(11, -58);
  ctx.stroke();
  // moustache
  ellipse(ctx, 10, -46, 7, 2.5, '#6d4a1e');
  // straw hat
  ellipse(ctx, 0, -62, 24, 6, '#d9b45a');
  ellipse(ctx, 0, -68, 13, 9, '#e8c96a');
  ctx.fillStyle = '#8a5a2a';
  ctx.fillRect(-13, -66, 26, 4);
  ctx.restore();
}

export function drawFence(ctx, x, y, w) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#8a5a34';
  ctx.fillRect(0, -34, 8, 34);
  ctx.fillRect(w - 8, -34, 8, 34);
  ctx.fillStyle = '#a9713a';
  ctx.fillRect(-4, -30, w + 8, 7);
  ctx.fillRect(-4, -16, w + 8, 7);
  ctx.restore();
}

export function drawHayBale(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#d9a94e';
  ctx.beginPath();
  ctx.arc(0, 0, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b8892f';
  ctx.lineWidth = 2;
  for (let r = 8; r < 30; r += 8) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = '#8a6a1e';
  ctx.beginPath();
  ctx.moveTo(-24, -14);
  ctx.lineTo(24, 12);
  ctx.moveTo(-20, 18);
  ctx.lineTo(20, -18);
  ctx.stroke();
  ctx.restore();
}

export function drawMud(ctx, x, y, w) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#6d4a26';
  ctx.beginPath();
  ctx.ellipse(w / 2, 0, w / 2, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a6238';
  ctx.beginPath();
  ctx.ellipse(w / 2 - 12, -2, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(w / 2 + 18, 1, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawPumpkin(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#e07b1f';
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c96a12';
  ctx.beginPath();
  ctx.ellipse(-12, 0, 9, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(12, 0, 9, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5d8a3c';
  ctx.fillRect(-3, -26, 6, 10);
  ctx.restore();
}

export function drawCrate(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#a97a45';
  ctx.fillRect(-26, -26, 52, 52);
  ctx.strokeStyle = '#7a5527';
  ctx.lineWidth = 3;
  ctx.strokeRect(-26, -26, 52, 52);
  ctx.beginPath();
  ctx.moveTo(-26, -26);
  ctx.lineTo(26, 26);
  ctx.moveTo(26, -26);
  ctx.lineTo(-26, 26);
  ctx.stroke();
  ctx.restore();
}

export function drawHangKnife(ctx, x, y, s, swing) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(swing) * 0.12);
  ctx.strokeStyle = '#5a4632';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -90);
  ctx.lineTo(0, -40);
  ctx.stroke();
  // blade
  ctx.fillStyle = '#dfe6ea';
  poly(ctx, [[-7, -40], [7, -40], [10, 18], [0, 30], [-10, 18]], '#dfe6ea');
  ctx.fillStyle = '#9aa5ab';
  ctx.fillRect(-7, -40, 14, 6);
  // handle
  ctx.fillStyle = '#4a2c14';
  ctx.fillRect(-6, -58, 12, 20);
  ctx.restore();
}

export function drawOven(ctx, x, y, s, flame) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // body
  ctx.fillStyle = '#3c3c44';
  ctx.fillRect(-52, -96, 104, 96);
  ctx.fillStyle = '#565660';
  ctx.fillRect(-52, -96, 104, 14);
  // door window
  ctx.fillStyle = '#ffb347';
  ctx.fillRect(-38, -70, 76, 40);
  ctx.fillStyle = '#2a2a30';
  ctx.fillRect(-38, -70, 76, 8);
  // knobs
  for (let i = 0; i < 3; i++) circle(ctx, -26 + i * 26, -88, 5, '#e8e8e8');
  // flames on top when the jet is on
  if (flame > 0) {
    ctx.globalAlpha = flame;
    ctx.fillStyle = '#ff7b1f';
    for (let i = 0; i < 5; i++) {
      const fx = -40 + i * 20;
      const fh = 34 + Math.sin(performance.now() / 60 + i * 2) * 10;
      ctx.beginPath();
      ctx.moveTo(fx - 9, -96);
      ctx.quadraticCurveTo(fx, -96 - fh, fx + 9, -96);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#ffd23c';
    for (let i = 0; i < 3; i++) {
      const fx = -24 + i * 24;
      const fh = 20 + Math.sin(performance.now() / 50 + i * 3) * 6;
      ctx.beginPath();
      ctx.moveTo(fx - 6, -96);
      ctx.quadraticCurveTo(fx, -96 - fh, fx + 6, -96);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

export function drawPot(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#4a4a52';
  ctx.beginPath();
  ctx.ellipse(0, 0, 30, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-30, -22, 60, 24);
  ctx.fillStyle = '#6a6a72';
  ctx.fillRect(-30, -22, 60, 6);
  ctx.fillStyle = '#2a2a30';
  ctx.beginPath();
  ctx.ellipse(0, -22, 28, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2a2a30';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-30, -12);
  ctx.lineTo(-42, -12);
  ctx.moveTo(30, -12);
  ctx.lineTo(42, -12);
  ctx.stroke();
  ctx.restore();
}

export function drawFallKnife(ctx, x, y, s, falling) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(falling ? 0.15 : 0);
  ctx.fillStyle = '#dfe6ea';
  poly(ctx, [[-8, -34], [8, -34], [11, 22], [0, 36], [-11, 22]], '#dfe6ea');
  ctx.fillStyle = '#4a2c14';
  ctx.fillRect(-7, -52, 14, 20);
  ctx.restore();
}

export function drawCorn(ctx, x, y, s, bob) {
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.scale(s, s);
  ctx.fillStyle = '#ffd23c';
  ctx.beginPath();
  ctx.ellipse(0, 0, 9, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8b400';
  for (let i = -2; i <= 2; i++) {
    ctx.fillRect(i * 3 - 1, -14, 2, 28);
  }
  ctx.fillStyle = '#5d8a3c';
  poly(ctx, [[-8, 12], [0, 26], [8, 12]], '#5d8a3c');
  ctx.restore();
}

export function drawFeather(ctx, x, y, s, bob) {
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.rotate(0.4);
  ctx.scale(s, s);
  ctx.fillStyle = '#e8a33c';
  ctx.beginPath();
  ctx.ellipse(0, 0, 8, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c98a2a';
  ctx.beginPath();
  ctx.ellipse(0, -14, 4, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8a5a14';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 20);
  ctx.lineTo(0, -20);
  ctx.stroke();
  ctx.restore();
}

export function drawBush(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#4a7a2e';
  circle(ctx, -18, -8, 16, '#4a7a2e');
  circle(ctx, 0, -18, 20, '#5d8a3c');
  circle(ctx, 18, -8, 16, '#4a7a2e');
  ctx.fillStyle = '#6da34a';
  circle(ctx, -8, -12, 8, '#6da34a');
  circle(ctx, 10, -16, 7, '#6da34a');
  ctx.restore();
}

// The forest gate: the end of the run. A gap in the fence with autumn trees.
export function drawForestGate(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // trees
  for (const [tx, th, col] of [[-70, 150, '#c96a1e'], [-30, 180, '#a8641f'], [20, 165, '#d97b1f'], [70, 145, '#8a5a2b']]) {
    ctx.fillStyle = '#6d4420';
    ctx.fillRect(tx - 6, -60, 12, 60);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(tx - 34, -60);
    ctx.lineTo(tx, -60 - th);
    ctx.lineTo(tx + 34, -60);
    ctx.closePath();
    ctx.fill();
  }
  // arch banner
  ctx.fillStyle = '#7a4a1e';
  ctx.fillRect(-90, -210, 180, 16);
  ctx.fillStyle = '#ffd23c';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('TO FREEDOM!', 0, -197);
  ctx.restore();
}

// Parallax scenery. stageId: farmyard | barn | kitchen. scrollX in px.
export function drawBackground(ctx, stage, scrollX, t) {
  const W = 1280;
  const H = 720;
  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, stage.skyTop);
  sky.addColorStop(1, stage.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // sun
  circle(ctx, 1080, 96, 44, '#fff3c4');
  circle(ctx, 1080, 96, 34, '#ffe08a');
  // clouds (slow parallax)
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 4; i++) {
    const cx = (((i * 340 - scrollX * 0.15) % (W + 320)) + W + 320) % (W + 320) - 160;
    const cy = 70 + i * 42;
    ellipse(ctx, cx, cy, 52, 18, 'rgba(255,255,255,0.85)');
    ellipse(ctx, cx + 34, cy + 6, 38, 14, 'rgba(255,255,255,0.85)');
    ellipse(ctx, cx - 36, cy + 8, 30, 12, 'rgba(255,255,255,0.85)');
  }
  // distant hills / buildings
  ctx.fillStyle = stage.id === 'kitchen' ? '#8a6a52' : '#9a7a4a';
  const hillOff = scrollX * 0.3;
  for (let i = 0; i < 6; i++) {
    const hx = (((i * 420 - hillOff) % (W + 420)) + W + 420) % (W + 420) - 210;
    ctx.beginPath();
    ctx.moveTo(hx - 220, 604);
    ctx.quadraticCurveTo(hx, 470 + (i % 2) * 30, hx + 220, 604);
    ctx.closePath();
    ctx.fill();
  }
  // buildings per stage (medium parallax)
  const bOff = scrollX * 0.55;
  if (stage.id === 'farmyard') {
    for (let i = 0; i < 3; i++) {
      const bx = (((i * 560 - bOff) % (W + 560)) + W + 560) % (W + 560) - 280;
      drawFarmhouse(ctx, bx, 604);
    }
  } else if (stage.id === 'barn') {
    for (let i = 0; i < 3; i++) {
      const bx = (((i * 560 - bOff) % (W + 560)) + W + 560) % (W + 560) - 280;
      drawBarn(ctx, bx, 604);
    }
  } else {
    for (let i = 0; i < 3; i++) {
      const bx = (((i * 560 - bOff) % (W + 560)) + W + 560) % (W + 560) - 280;
      drawKitchenWindow(ctx, bx, 604);
    }
  }
  // ground
  ctx.fillStyle = stage.ground;
  ctx.fillRect(0, 604, W, 116);
  ctx.fillStyle = stage.groundDark;
  ctx.fillRect(0, 604, W, 8);
  // ground texture ticks (fast parallax)
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  const tickOff = scrollX % 90;
  for (let x = -tickOff; x < W; x += 90) {
    ctx.fillRect(x, 640, 34, 5);
    ctx.fillRect(x + 44, 684, 26, 4);
  }
  // grass tufts on the ground line
  ctx.fillStyle = stage.grass;
  const tuftOff = scrollX % 130;
  for (let x = -tuftOff; x < W; x += 130) {
    ctx.beginPath();
    ctx.moveTo(x, 606);
    ctx.lineTo(x + 4, 594);
    ctx.lineTo(x + 8, 606);
    ctx.closePath();
    ctx.fill();
  }
  void t;
}

function drawFarmhouse(ctx, x, gy) {
  ctx.save();
  ctx.translate(x, gy);
  ctx.fillStyle = '#e8d8b0';
  ctx.fillRect(-80, -120, 160, 120);
  ctx.fillStyle = '#a84a2a';
  poly(ctx, [[-92, -118], [0, -168], [92, -118]], '#a84a2a');
  ctx.fillStyle = '#5a4632';
  ctx.fillRect(-16, -56, 32, 56);
  ctx.fillStyle = '#7fb3d9';
  ctx.fillRect(-62, -96, 28, 28);
  ctx.fillRect(34, -96, 28, 28);
  ctx.fillStyle = '#fff';
  ctx.fillRect(-62, -84, 28, 4);
  ctx.fillRect(34, -84, 28, 4);
  ctx.restore();
}

function drawBarn(ctx, x, gy) {
  ctx.save();
  ctx.translate(x, gy);
  ctx.fillStyle = '#a83226';
  ctx.fillRect(-90, -140, 180, 140);
  ctx.fillStyle = '#7a241a';
  poly(ctx, [[-100, -138], [0, -190], [100, -138]], '#7a241a');
  ctx.strokeStyle = '#e8d8b0';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-90, -70);
  ctx.lineTo(90, -70);
  ctx.stroke();
  ctx.fillStyle = '#5a4632';
  ctx.fillRect(-24, -64, 48, 64);
  ctx.fillStyle = '#ffd23c';
  poly(ctx, [[0, -128], [14, -108], [-14, -108]], '#ffd23c');
  ctx.restore();
}

function drawKitchenWindow(ctx, x, gy) {
  ctx.save();
  ctx.translate(x, gy);
  ctx.fillStyle = '#b09a7a';
  ctx.fillRect(-110, -190, 220, 190);
  ctx.fillStyle = '#7fb3d9';
  ctx.fillRect(-88, -160, 60, 80);
  ctx.fillRect(28, -160, 60, 80);
  ctx.fillStyle = '#5a4632';
  ctx.fillRect(-88, -122, 60, 6);
  ctx.fillRect(28, -122, 60, 6);
  ctx.fillRect(-61, -160, 6, 80);
  ctx.fillRect(55, -160, 6, 80);
  ctx.fillStyle = '#d97b1f';
  circle(ctx, -58, -60, 18, '#d97b1f');
  circle(ctx, 58, -60, 14, '#e8a33c');
  ctx.restore();
}
