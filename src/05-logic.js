/* ---------- cars ---------- */
var moneyChanged = true;
var HEAD_ANG = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
function makeCar(spot, parked, vip) {
  var cx = spot.x + .5, cy = spot.y + .5, type = vip ? 'limo' : pickCar(), hd = parked ? (spot.row === 'N' ? 3 : 1) : 0;
  var c = {
    id: ++S.id, fl: 0, vip: !!vip, spot: spot, hx: 0, hy: 0, type: type, color: carColor(type), v: 0, ang: HEAD_ANG[hd],
    x: parked ? cx : SPAWNX, y: parked ? cy : 2.5, heading: hd,
    state: parked ? 'parked' : 'in', path: parked ? [] : [{ x: cx, y: 2.5 }, { x: cx, y: cy, stop: true }],
    timer: 0, phase: 0, moving: false
  };
  spot.car = c; S.cars.push(c); return c;
}
// a driver who heads for the garage: reserves a slot, turns in off the road and disappears inside
function makeGarCar(slot, parked) {
  var type = pickCar(), col = carColor(type);
  var c = {
    id: ++S.id, fl: 0, g: true, gi: slot, vip: false, spot: null, hx: 0, hy: 0, color: col, type: type, v: 0, ang: 0, door: 2 + Math.floor(Math.random() * COLS()),
    x: parked ? GOUT : SPAWNX, y: parked ? GY1 : 2.5, heading: 0, state: parked ? 'ghide' : 'gin',
    path: parked ? [] : [{ x: GIN, y: 2.5 }, { x: GIN, y: GY1, stop: true }], timer: 0, phase: 0, moving: false
  };
  GS[slot].car = c; GS[slot].color = col; S.cars.push(c); return c;
}
/* ---------- walkers: the reason people park ---------- */
// main lot: from the car door, along the painted bay line (crossing the lane for the front row), to the shop door
function walkPath(spot) {
  var cx = spot.x + .5, xb = spot.x + 1, cy = spot.y + .5, p = [{ x: cx + .28, y: cy }, { x: xb, y: cy }];
  if (spot.row === 'S') { p.push({ x: xb, y: 3.05 }); p.push({ x: xb, y: 1.95 }); }
  p.push({ x: xb, y: .93 }); p.push({ x: cx, y: .93 }); p.push({ x: cx, y: .88 });
  return p;
}
// garage: out of the side door, down the path to the market walkway, along it to a shop door
function gWalkPath(door) {
  var dx = door + .5;
  return [{ x: GPED, y: GY1 + .12 }, { x: GPED, y: .97 }, { x: dx, y: .97 }, { x: dx, y: .93 }, { x: dx, y: .88 }];
}
function makeWalker(car, inside) {
  var g = !!car.g, door = g ? car.door : car.spot.x, path = g ? gWalkPath(door) : walkPath(car.spot), w = {
    id: ++S.id, car: car, fl: 0, g: g, door: door, row: g ? 'N' : car.spot.row, path: path, back: path.slice().reverse().slice(1),
    x: path[0].x, y: path[0].y, state: inside ? 'inside' : 'to', timer: inside ? 1 + Math.random() * 4 : 0, moving: false, bag: !!inside,
    color: SHIRT[Math.floor(Math.random() * SHIRT.length)], hair: HAIR[Math.floor(Math.random() * HAIR.length)]
  };
  if (!inside) w.path = path.slice(1);
  if (inside) { w.x = path[path.length - 1].x; w.y = .88; }
  S.walkers.push(w); return w;
}
function stepWalker(w, dt) {
  w.moving = false;
  if (w.state === 'inside') {
    w.timer -= dt;
    if (w.timer <= 0) {
      w.state = 'back'; w.bag = true; w.path = w.back.slice();
      var tip = fee() * tipRate() * (w.g ? GAR_PAY : 1) * feverPay();
      if (tip > 0) { earn(tip); popText(w.x, .88, '+' + fmtSmall(tip)); }
    }
    return;
  }
  var tg = w.path[0];
  if (!tg) {
    if (w.state === 'to') { w.state = 'inside'; w.timer = errandTime(); }
    else { w.done = true; if (w.car && (w.car.spot || w.car.g)) { w.car.phase = 2; w.car.timer = doorTime(); } }
    return;
  }
  var dx = tg.x - w.x, dy = tg.y - w.y, dist = Math.hypot(dx, dy), st = walkSpeed() * dt;
  w.moving = true;
  if (dist <= st) { w.x = tg.x; w.y = tg.y; w.path.shift(); } else { w.x += dx / dist * st; w.y += dy / dist * st; }
}
function walkerInLane(x0, x1) {
  for (var i = 0; i < S.walkers.length; i++) {
    var w = S.walkers[i];
    if (w.state === 'inside') continue;
    if (Math.abs(w.y - 2.5) < .75 && w.x >= x0 && w.x <= x1) return true;
  }
  return false;
}
var lastBackup = -99;
var HIDDEN = { parked: 1, wantout: 1, ghide: 1, gwait: 1 };
function queueCar() {
  var type = pickCar();
  var q = { id: ++S.id, fl: 0, vip: false, spot: null, hx: 0, hy: 0, type: type, color: carColor(type), v: 0, ang: 0, x: SPAWNX, y: 2.5, heading: 0, state: 'wait', path: [{ x: -3.9, y: 2.5, stop: true }], timer: 28, phase: 0, moving: false };
  S.cars.push(q);
}
function entranceBusy() { return S.cars.some(function (c) { return !HIDDEN[c.state] && c.x < SPAWNX + 2.3 && Math.abs(c.y - 2.5) < .6; }); }
// drivers fill the main lot first and spill into the garage when it is busy (some like the covered bays anyway)
function spawn(vip) {
  var free = S.spots.filter(function (s) { return unlocked(s) && !s.car; }), gf = vip ? 0 : garFree();
  var queued = S.cars.filter(function (c) { return c.state === 'wait'; }).length;
  if ((!free.length && !gf) || queued) {   // everything is full: the driver joins the queue on the street
    if (vip || queued >= 5 || entranceBusy()) return false;
    queueCar();
    if (S.t - lastBackup > 45 && S.tut >= TUT.length) { lastBackup = S.t; note('Lot full! Cars are backing up. Build more space, or speed up shop visits.'); }
    return true;
  }
  if (entranceBusy()) { S.spawnT = Math.min(S.spawnT, 0.3); return false; }
  var toG = false;
  if (gf) toG = !free.length || Math.random() < (free.length / activeSpots().length < .3 ? .7 : .25);
  if (toG) {
    var open = [], i;
    for (i = 0; i < garCap(); i++) if (!GS[i].car) open.push(i);
    makeGarCar(open[Math.floor(Math.random() * open.length)], false);
    return true;
  }
  // drivers like the bays near the shops and near the gate
  var wts = free.map(function (s) { return (s.row === 'N' ? 3 : 1) * (1 + (7 - s.x) * .15); });
  var tot = wts.reduce(function (a, b) { return a + b; }, 0), r = Math.random() * tot, pick = 0;
  for (var q = 0; q < wts.length; q++) { r -= wts[q]; if (r <= 0) { pick = q; break; } }
  makeCar(free[pick], false, vip);
  return true;
}
function blockedAhead(c) {
  if (c.heading !== 0) return false;
  for (var i = 0; i < S.cars.length; i++) {
    var o = S.cars[i];
    if (o === c || HIDDEN[o.state]) continue;
    if (Math.abs(o.y - c.y) < .65 && o.x > c.x && o.x - c.x < 1.7) return true;
  }
  return Math.abs(c.y - 2.5) < .7 && walkerInLane(c.x - .1, c.x + 1.1);
}
function roadClearFor(c) {
  for (var i = 0; i < S.cars.length; i++) {
    var o = S.cars[i];
    if (o === c || HIDDEN[o.state]) continue;
    // someone still reversing out of a bay claims the lane around their column straight away
    if (o.state === 'out' && o.path[0] && o.path[0].rev) { if (Math.abs(o.x - c.x) < 1.9) return false; continue; }
    if (o.state === 'gout' && o.y < 1.7 && Math.abs(o.x - c.x) < .8) return false;   // still on the garage driveway
    if (Math.abs(o.y - 2.5) < .9 && o.x > c.x - 2.0 && o.x < c.x + 1.7) return false;
  }
  return !walkerInLane(c.x - 1.1, c.x + 1.1);
}
// leaving drivers head east; some pull into the car wash on the way
function exitRoute(x) {
  var washing = S.cars.filter(function (c) { return c.washing; }).length;
  if (S.lvl.wash && x < WIN - .3 && washing < 3 && Math.random() < washChance())
    return [{ x: WIN, y: 2.5 }, { x: WIN, y: WY }, { x: WOUT, y: WY, washEnd: true }, { x: WOUT, y: 2.5, join: true }, { x: 14.5, y: 2.5 }];
  return [{ x: 14.5, y: 2.5 }];
}
function addMoney(a) { S.money += a; S.totalRun += a; S.lifetime += a; moneyChanged = true; }
// steady income (cars, tips, washes, taps) also feeds the $/s readout; one-off bonuses do not
function earn(a) { addMoney(a); S.earn.push({ t: S.t, v: a }); }
function popText(x, y, txt, big) { S.particles.push({ x: x, y: y, fl: 0, t: 0, txt: txt, big: !!big }); }
function payCar(c) {
  var ev = !c.g && c.spot && evBay(c.spot);
  var a = fee() * (c.vip ? 3 : 1) * (c.g ? GAR_PAY : 1) * (ev ? 1 + EV_BONUS : 1) * feverPay();
  earn(a); S.served++;
  popText(c.x, c.g ? 1 : c.y, '+' + fmtSmall(a));
  sfx('coin');
}
function payWash(c) {
  var a = washPrice() * feverPay();
  earn(a); S.washes++;
  popText(WX1, WY, '+' + fmtSmall(a));
}
function turnTo(c, want, dt) {
  var d = want - c.ang;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  c.ang += d * Math.min(1, dt * 9);
}
function stepCar(c, dt) {
  c.moving = false;
  if (c.state === 'parked') {
    if (c.phase === 0) { c.timer -= dt; if (c.timer <= 0) { makeWalker(c, false); c.phase = 1; } }       // step out
    else if (c.phase === 2) { c.timer -= dt; if (c.timer <= 0) { payCar(c); c.state = 'wantout'; } }      // step back in, then pay
    return;
  }
  if (c.state === 'ghide') {   // parked inside the garage, out of sight
    if (c.phase === 1) return;
    c.timer -= dt;
    if (c.timer <= 0) {
      if (c.phase === 0) { makeWalker(c, false); c.phase = 1; }
      else { payCar(c); c.state = 'gwait'; c.x = GOUT; c.y = GY1; c.ang = Math.PI / 2; c.v = 0; }
    }
    return;
  }
  if (c.state === 'gwait') {   // waits at the garage exit for a gap in the traffic
    if (roadClearFor(c)) { GS[c.gi].car = null; c.state = 'gout'; c.heading = 1; c.path = [{ x: GOUT, y: 2.5 }].concat(exitRoute(GOUT)); c.washing = c.path.length > 2; }
    return;
  }
  if (c.state === 'wantout') {
    if (roadClearFor(c)) { c.state = 'out'; c.path = [{ x: c.x, y: 2.5, rev: true }].concat(exitRoute(c.x)); c.washing = c.path.length > 2; }
    return;
  }
  if (c.state === 'wait') {
    var front = true, i;
    for (i = 0; i < S.cars.length; i++) if (S.cars[i].state === 'wait' && S.cars[i].x > c.x) front = false;
    var fs = front ? S.spots.filter(function (s) { return unlocked(s) && !s.car; }) : [];
    if (fs.length) {   // a bay opened up
      var sp = fs[Math.floor(Math.random() * fs.length)];
      sp.car = c; c.spot = sp; c.state = 'in'; c.path = [{ x: sp.x + .5, y: 2.5 }, { x: sp.x + .5, y: sp.y + .5, stop: true }]; c.timer = 0;
    } else if (c.x < GIN - .7 && garFree() > 0) {   // or a garage bay, if they have not passed the garage yet
      var open = [];
      for (i = 0; i < garCap(); i++) if (!GS[i].car) open.push(i);
      var gi = open[Math.floor(Math.random() * open.length)];
      c.g = true; c.gi = gi; c.door = 2 + Math.floor(Math.random() * COLS()); GS[gi].car = c; GS[gi].color = c.color;
      c.state = 'gin'; c.path = [{ x: GIN, y: 2.5 }, { x: GIN, y: GY1, stop: true }];
    } else if (!c.moving) {
      c.timer -= dt;
      if (c.timer <= 0) { c.state = 'leave'; c.path = [{ x: 14.5, y: 2.5 }]; S.lost = (S.lost || 0) + 1; popText(c.x, 2.5, 'Full!'); }
    }
    if (c.state === 'wait' && !c.path[0]) { c.v = 0; return; }
  }
  var tg = c.path[0];
  if (!tg) {
    if (c.state === 'in') { c.state = 'parked'; c.phase = 0; c.timer = doorTime(); c.v = 0; c.heading = c.spot.row === 'N' ? 3 : 1; }
    else if (c.state === 'gin') { c.state = 'ghide'; c.phase = 0; c.timer = doorTime(); c.v = 0; }
    return;
  }
  var dx = tg.x - c.x, dy = tg.y - c.y, dist = Math.hypot(dx, dy), roadLeg = Math.abs(dx) > Math.abs(dy);
  if (!tg.rev) c.heading = roadLeg ? (dx > 0 ? 0 : 2) : (dy > 0 ? 1 : 3);
  if (roadLeg && blockedAhead(c)) { c.v = 0; return; }
  if (c.state === 'gout' && !roadLeg && c.y > 1.0 && c.y < 1.8 && !roadClearFor(c)) { c.v = 0; return; }   // do not pull out in front of traffic
  if (tg.join && c.y > 3.3 && !roadClearFor(c)) { c.v = 0; return; }   // out of the wash: wait for a gap
  var vt = (roadLeg || c.g ? 2.1 : 1.2) * speedMul() * (tg.rev ? .7 : 1);
  if (c.path.length === 1 || tg.stop) vt = Math.min(vt, .45 + dist * 3);   // ease into the bay
  c.v += (vt - c.v) * Math.min(1, dt * 4.5);
  var st = c.v * dt;
  c.moving = st > 0.0005;
  if (dist > 0.001) turnTo(c, Math.atan2(dy, dx) + (tg.rev ? Math.PI : 0), dt);
  // round the corners: start on the next leg a little early
  var cut = (c.path.length > 1 && !tg.rev && !tg.stop && !tg.join) ? .22 : 0;
  if (dist <= st + cut) {
    if (!cut) { c.x = tg.x; c.y = tg.y; } else { c.x += dx / dist * Math.min(st, dist); c.y += dy / dist * Math.min(st, dist); }
    c.path.shift();
    if (tg.rev && c.spot) { c.spot.car = null; c.spot = null; }
    if (tg.washEnd) { c.inWash = false; c.washing = false; }
  } else { c.x += dx / dist * st; c.y += dy / dist * st; }
  if (c.washing && Math.abs(c.y - WY) < .3) {
    var inside = c.x > WX0 - .1 && c.x < WX1 + .1;
    if (c.inWash && c.x >= WX1 && !c.washPaid) { c.washPaid = true; payWash(c); }
    c.inWash = inside;
  }
}
// keep the number of cars sensible after loading a save or after a reset
function seedParked() {
  var spots = activeSpots(), n = Math.min(spots.length, Math.max(2, Math.round(spots.length * 0.4))), i, car;
  spots.sort(function () { return Math.random() - .5; });
  for (i = 0; i < n; i++) if (!spots[i].car) {
    car = makeCar(spots[i], true, false);
    if (Math.random() < .55) { car.phase = 1; makeWalker(car, true); }      // someone is mid-shop
    else { car.phase = 2; car.timer = 1 + Math.random() * 3; }              // someone is walking back to the car
  }
  var cap = garCap(), m = Math.round(cap * .35), pool = [];
  for (i = 0; i < cap; i++) pool.push(i);
  pool.sort(function () { return Math.random() - .5; });
  for (i = 0; i < m; i++) {
    car = makeGarCar(pool[i], true);
    if (Math.random() < .6) { car.phase = 1; makeWalker(car, true); }
    else { car.phase = 2; car.timer = 1 + Math.random() * 3; }
  }
}
function clearCars() { S.cars = []; S.walkers = []; S.spots.forEach(function (s) { s.car = null; }); GS.forEach(function (g) { g.car = null; g.color = null; }); }

/* ---------- hustle: taps, Fever and the golden cars ---------- */
function startFever() {
  S.fever = feverLen(); S.hype = 1; S.fevers++;
  sfx('fever'); buzz('heavy'); moneyChanged = true;
  for (var i = 0; i < 26; i++) S.fx.push({ kind: 'conf', x: Math.random(), y: -.05 - Math.random() * .2, t: 0, vx: (Math.random() - .5) * .2, vy: .25 + Math.random() * .35, c: SHIRT[i % SHIRT.length], r: Math.random() * 6 });
}
// a tap on the lot: everyone hurries, and a few coins drop
function tapLot(lx, ly) {
  S.taps++;
  S.fx.push({ kind: 'ring', lx: lx, ly: ly, t: 0 });
  var coin = fee() * 0.04 * feverPay();
  earn(coin);
  S.fx.push({ kind: 'tapc', lx: lx, ly: ly, t: 0, txt: '+' + fmtSmall(coin) });
  if (S.fever <= 0) { S.hype = Math.min(1, S.hype + tapPower()); if (S.hype >= 1) startFever(); }
  sfx('tap', S.hype); buzz('light');
  tutEvent('tap');
}
function vipBonus() { return Math.max(fee() * 25, econRate() * 45) * (1 + 0.3 * S.perk.lucky); }
function collectVip(c) {
  var bonus = vipBonus();
  addMoney(bonus); c.vip = false; S.vips++;
  popText(c.x, c.y, '+' + fmt(bonus), true);
  if (Math.random() < .3) { S.gems++; S.fx.push({ kind: 'gem', x: c.x, y: c.y, t: 0 }); }
  sfx('vip'); buzz('medium'); save();
}
function vipGap() { return (55 + Math.random() * 60) / (1 + 0.2 * S.perk.lucky) / mod('vip', 1); }
function tickHype(dt) {
  if (S.fever > 0) {
    S.fever -= dt; S.hype = Math.max(0, S.fever / feverLen());
    if (S.fever <= 0) { S.fever = 0; S.hype = 0; moneyChanged = true; }
    return;
  }
  S.hype = Math.max(0, Math.min(1, S.hype + (0.006 * S.lvl.crew - (0.1 * S.hype + 0.025)) * dt));
}

/* ---------- frame ---------- */
function update(dt) {
  S.t += dt;
  tickHype(dt);
  var fdt = dt * flow();   // the whole lot runs faster while it hustles
  S.spawnT -= fdt;
  if (S.spawnT <= 0) { spawn(false); if (S.spawnT <= 0) S.spawnT = gapBase() * (.75 + Math.random() * .5); }
  S.vipT -= dt;
  if (S.parade > 0 && S.vipT > 3) S.vipT = 3;
  if (S.vipT <= 0) {
    var ok = spawn(true);
    if (ok && S.parade > 0) S.parade--;
    S.vipT = ok ? (S.parade > 0 ? 3 : vipGap()) : 6;
  }
  S.walkers.forEach(function (w) { stepWalker(w, fdt); });
  S.walkers = S.walkers.filter(function (w) { return !w.done; });
  S.cars.forEach(function (c) {
    stepCar(c, fdt);
    if (c.vip && !HIDDEN[c.state]) {
      c.vt = (c.vt || 0) + dt;
      if (c.vt > 1 && !S.tutVip && S.tut >= TUT.length) { S.tutVip = true; tip('Tap the golden car for a big bonus!', 6); }
      if (S.lvl.concierge && c.vt > 2.5) collectVip(c);
    }
  });
  S.cars = S.cars.filter(function (c) { return !((c.state === 'out' || c.state === 'gout' || c.state === 'leave') && c.x >= 14.4); });
  var open = S.cars.some(function (c) { return (c.state === 'in' || c.state === 'gout') && c.heading === 0 && c.x > -4.7 && c.x < -2.4; });
  S.gate += ((open ? 1 : 0) - S.gate) * Math.min(1, dt * 7);
  S.particles.forEach(function (p) { p.t += dt; });
  S.particles = S.particles.filter(function (p) { return p.t < 1.2; });
  S.fx.forEach(function (f) { f.t += dt; });
  S.fx = S.fx.filter(function (f) { return f.t < (f.kind === 'conf' ? 3 : f.kind === 'bub' ? 1.4 : f.kind === 'gem' ? 1.4 : .7); });
  S.pad += (S.padTarget - S.pad) * Math.min(1, dt * 8);
  var dd = S.lvl.garage - S.deckAnim; S.deckAnim += Math.abs(dd) < .01 ? dd : dd * Math.min(1, dt * 2.2) + Math.sign(dd) * Math.min(Math.abs(dd), dt * .35);
  if (SET.daynight) S.tod = (S.tod + dt / 480) % 1;   // an eight-minute day
  S.clouds.forEach(function (c) { c.x += c.v * dt; if (c.x > 30) c.x = -30; });
  if (S.lvl.promoter && S.rushReady > 0) startRush();
  stepCam(dt); tickMeta(dt);
}
