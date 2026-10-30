/* ---------- cars ---------- */
var moneyChanged = true;
var HIDDEN = { parked: 1, wantout: 1, ghide: 1, gwait: 1 };
function newCar(type, color, x, y, ang, state) {
  return { id: ++S.id, type: type, color: color, x: x, y: y, ang: ang, v: 0, state: state, path: [], timer: 0, phase: 0, moving: false, blockT: 0, ghost: 0, hx: 0, hy: 0 };
}
function bayPath(s) { var ay = aisleY(s.k); return [{ x: ENX, y: LANE0 }, { x: ENX, y: ay }, { x: s.c + .5, y: ay }, { x: s.c + .5, y: s.y + .5, stop: true }]; }
function makeCar(spot, parked, vip) {
  var pc = vip ? { type: 'limo', color: '#ffd04a' } : pickCar();
  var c = newCar(pc.type, pc.color, SPAWNX, LANE0, 0, parked ? 'parked' : 'in');
  c.vip = !!vip; c.spot = spot;
  if (parked) { c.x = spot.c + .5; c.y = spot.y + .5; c.ang = spot.row === 'N' ? -Math.PI / 2 : Math.PI / 2; }
  else c.path = bayPath(spot);
  spot.car = c; S.cars.push(c); return c;
}
// a driver who heads for the garage: reserves a slot, turns up the driveway and disappears inside
function makeGarCar(slot, parked) {
  var pc = pickCar(), c = newCar(pc.type, pc.color, parked ? GOUT : SPAWNX, parked ? GY1 : LANE0, 0, parked ? 'ghide' : 'gin');
  c.g = true; c.gi = slot;
  if (!parked) c.path = [{ x: GIN, y: LANE0 }, { x: GIN, y: GY1 - .1, stop: true }];
  GS[slot].car = c; GS[slot].color = pc.color; GS[slot].type = pc.type; S.cars.push(c); return c;
}
/* ---------- walkers: the reason people park ---------- */
// from the car door, north along the painted bay line (across any aisles), along the walkway to the nearest market door
function walkPath(spot) {
  var cx = spot.c + .5, cy = spot.y + .5, xb = spot.c + 1, wy = walkY(), door = nearestDoor(xb), fy = shopFrontY() + .05;
  return { door: door, p: [{ x: cx + .28, y: cy }, { x: xb, y: cy }, { x: xb, y: wy }, { x: door, y: wy }, { x: door, y: fy }] };
}
// garage: out of the side door, past the stair tower, up to the walkway and along to a door
function gWalkPath() {
  var wy = walkY(), door = nearestDoor(0), fy = shopFrontY() + .05, sx = GX1 + 1.05;
  return { door: door, p: [{ x: GX1 + .15, y: GDOOR }, { x: sx, y: GDOOR }, { x: sx, y: wy }, { x: door, y: wy }, { x: door, y: fy }] };
}
function makeWalker(car, inside) {
  var g = !!car.g, wp = g ? gWalkPath() : walkPath(car.spot), path = wp.p, w = {
    id: ++S.id, car: car, g: g, door: wp.door, path: path, back: path.slice().reverse().slice(1),
    x: path[0].x, y: path[0].y, state: inside ? 'inside' : 'to', timer: inside ? 1 + Math.random() * 4 : 0, moving: false, bag: !!inside,
    color: SHIRT[Math.floor(Math.random() * SHIRT.length)], hair: HAIR[Math.floor(Math.random() * HAIR.length)]
  };
  if (!inside) w.path = path.slice(1);
  else { w.x = path[path.length - 1].x; w.y = path[path.length - 1].y; }
  S.walkers.push(w); return w;
}
// when the market moves or grows, shoppers on the way pop back to their cars
function resetWalkers() {
  S.walkers.forEach(function (w) { if (w.car) { w.car.phase = 2; w.car.timer = .5 + Math.random(); } });
  S.walkers = [];
}
function stepWalker(w, dt) {
  w.moving = false;
  if (w.state === 'inside') {
    w.timer -= dt;
    if (w.timer <= 0) {
      w.state = 'back'; w.bag = true; w.path = w.back.slice();
      var tip = fee() * tipRate() * (w.g ? GAR_PAY : 1) * hustleMul();
      if (tip > 0) { earn(tip); popText(w.x, w.y, '+' + fmtSmall(tip)); }
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
/* ---------- arriving: drivers fill the lot first and spill into the garage, or queue on the road ---------- */
var lastBackup = -99;
function entranceBusy() { return S.cars.some(function (c) { return !HIDDEN[c.state] && c.x < SPAWNX + 2 && Math.abs(c.y - LANE0) < .4; }); }
function spawn(vip) {
  var free = S.spots.filter(function (s) { return unlocked(s) && !s.car; }), gf = vip ? 0 : garFree();
  var queued = S.cars.filter(function (c) { return c.state === 'wait'; }).length;
  if ((!free.length && !gf) || queued) {   // everything is full: the driver joins the queue on the road
    if (vip || queued >= 5 || entranceBusy()) return false;
    var pc = pickCar(), q = newCar(pc.type, pc.color, SPAWNX, LANE0, 0, 'wait');
    q.path = [{ x: GIN - 1.3, y: LANE0, stop: true }]; q.timer = 30; S.cars.push(q);
    if (S.t - lastBackup > 45 && S.tut >= TUT.length) { lastBackup = S.t; note('Lot full! Cars are queuing. Build more bays, or speed up shop visits.'); }
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
  // drivers like bays close to the market and close to the entry lane
  var top = unitCount() - 1;
  var wts = free.map(function (s) { return (1 + (COLS_MAX - s.c) * .12) * (s.k === top ? 2 : 1) * (s.row === 'N' ? 1.3 : 1); });
  var tot = wts.reduce(function (a, b) { return a + b; }, 0), r = Math.random() * tot, pick = 0;
  for (var q2 = 0; q2 < wts.length; q2++) { r -= wts[q2]; if (r <= 0) { pick = q2; break; } }
  makeCar(free[pick], false, vip);
  return true;
}
/* ---------- driving ---------- */
// anything in the way, straight ahead of the direction of travel?
function blocked(c, dx, dy) {
  var i, o, rx, ry, al, la;
  if (c.ghost <= 0) for (i = 0; i < S.cars.length; i++) {
    o = S.cars[i];
    if (o === c || HIDDEN[o.state]) continue;
    rx = o.x - c.x; ry = o.y - c.y; al = rx * dx + ry * dy;
    if (al <= .05 || al > 1.05) continue;
    la = Math.abs(rx * dy - ry * dx);
    if (la < .45) return true;
  }
  for (i = 0; i < S.walkers.length; i++) {
    o = S.walkers[i];
    if (o.state === 'inside') continue;
    rx = o.x - c.x; ry = o.y - c.y; al = rx * dx + ry * dy;
    if (al > 0 && al < .8 && Math.abs(rx * dy - ry * dx) < .5) return true;
  }
  return false;
}
// is there a gap in the customer lane for a car pulling out at x?
function laneClear(c, x) {
  for (var i = 0; i < S.cars.length; i++) {
    var o = S.cars[i];
    if (o === c || HIDDEN[o.state]) continue;
    if (Math.abs(o.y - LANE0) >= .5 || o.x <= x - 2.6 || o.x >= x + 1.3) continue;
    if (o.x < x - .6 && o.v < .05) continue;   // a stopped car behind the merge (the queue) never moves into it
    return false;
  }
  return true;
}
// room to back out of a bay into the aisle?
function aisleClear(c) {
  var ay = aisleY(c.spot.k), cx = c.spot.c + .5;
  for (var i = 0; i < S.cars.length; i++) {
    var o = S.cars[i];
    if (o === c || HIDDEN[o.state]) continue;
    if (Math.abs(o.y - ay) < .7 && Math.abs(o.x - cx) < 1.5) return false;
    if (o.path[0] && o.path[0].rev && o.spot && o.spot.k === c.spot.k && Math.abs(o.x - cx) < 1.8) return false;
  }
  return true;
}
// after paying: onto the road and away, sometimes by way of the car wash
function roadOut(x) {
  var n = washLanes(), best = -1, bn = 2, i;
  if (n && x < WEX - .6 && Math.random() < washChance()) for (i = 0; i < n; i++) { var k = washLaneCars(i); if (k < bn) { bn = k; best = i; } }
  if (best < 0) return { lane: -1, p: [{ x: DESPAWNX, y: LANE0 }] };
  return { lane: best, p: [{ x: WEX, y: LANE0 }, { x: WEX, y: WYS[best] }, { x: WRX, y: WYS[best], washEnd: true }, { x: WRX, y: LANE0, join: true }, { x: DESPAWNX, y: LANE0 }] };
}
function setExit(c, pre, x) { var r = roadOut(x); c.path = pre.concat(r.p); c.washLane = r.lane >= 0 ? r.lane : undefined; c.washPaid = false; }
function addMoney(a) { S.money += a; S.totalRun += a; S.lifetime += a; moneyChanged = true; }
// rewards (goals, gifts, time warps) are spending money, but do not count as earnings for goals or the franchise bonus
function giveMoney(a) { S.money += a; moneyChanged = true; }
// steady income (cars, tips, washes, taps) also feeds the $/s readout; one-off bonuses do not
function earn(a) { addMoney(a); S.earn.push({ t: S.t, v: a }); }
function popText(x, y, txt, big) { S.particles.push({ x: x, y: y, t: 0, txt: txt, big: !!big }); }
function payCar(c) {
  var ev = !c.g && c.spot && evBay(c.spot);
  var a = fee() * (c.vip ? 3 : 1) * (c.g ? GAR_PAY : 1) * (ev ? 1 + EV_BONUS : 1) * hustleMul();
  earn(a); S.served++;
  popText(c.g ? GOUT : c.x, c.g ? GY1 : c.y, '+' + fmtSmall(a));
  sfx('coin');
}
function payWash(c) {
  var a = washPrice() * hustleMul();
  earn(a); S.washes++;
  popText(WX1, WYS[c.washLane], '+' + fmtSmall(a));
}
function turnTo(c, want, dt) {
  var d = want - c.ang;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  c.ang += d * Math.min(1, dt * 9);
}
function stepCar(c, dt) {
  c.moving = false;
  if (c.ghost > 0) c.ghost -= dt;
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
      else { payCar(c); c.state = 'gwait'; c.x = GOUT; c.y = GY1 - .1; c.ang = Math.PI / 2; c.v = 0; }
    }
    return;
  }
  if (c.state === 'gwait') {   // waits at the garage exit for a gap in the traffic
    var busy = S.cars.some(function (o) { return o !== c && o.state === 'gout' && o.y < LANE0 - .3; });   // one car on the driveway at a time
    if (!busy) { GS[c.gi].car = null; c.state = 'gout'; setExit(c, [{ x: GOUT, y: LANE0, join: true }], GOUT); }
    return;
  }
  if (c.state === 'wantout') {
    if (aisleClear(c)) { c.state = 'out'; var ay = aisleY(c.spot.k); setExit(c, [{ x: c.x, y: ay, rev: true }, { x: EXX(), y: ay }, { x: EXX(), y: LANE0, join: true }], EXX()); }
    return;
  }
  if (c.state === 'wait') {
    var front = true, i;
    for (i = 0; i < S.cars.length; i++) if (S.cars[i].state === 'wait' && S.cars[i].x > c.x) front = false;
    var fs = front ? S.spots.filter(function (s) { return unlocked(s) && !s.car; }) : [];
    if (fs.length) {   // a bay opened up
      var sp = fs[Math.floor(Math.random() * fs.length)];
      sp.car = c; c.spot = sp; c.state = 'in'; c.path = bayPath(sp);
    } else if (front && c.x < GIN && garFree() > 0) {   // or a garage bay
      var open = [];
      for (i = 0; i < garCap(); i++) if (!GS[i].car) open.push(i);
      var gi = open[Math.floor(Math.random() * open.length)];
      c.g = true; c.gi = gi; GS[gi].car = c; GS[gi].color = c.color; GS[gi].type = c.type;
      c.state = 'gin'; c.path = [{ x: GIN, y: LANE0 }, { x: GIN, y: GY1 - .1, stop: true }];
    } else if (!c.path[0]) {
      c.timer -= dt;
      if (c.timer <= 0) { c.state = 'leave'; c.path = [{ x: DESPAWNX, y: LANE0 }]; S.lost = (S.lost || 0) + 1; popText(c.x, LANE0, 'Full!'); }
    }
    if (c.state === 'wait' && !c.path[0]) { c.v = 0; return; }
  }
  var tg = c.path[0];
  if (!tg) {
    if (c.state === 'in') { c.state = 'parked'; c.phase = 0; c.timer = doorTime(); c.v = 0; }
    else if (c.state === 'gin') { c.state = 'ghide'; c.phase = 0; c.timer = doorTime(); c.v = 0; }
    return;
  }
  var dx = tg.x - c.x, dy = tg.y - c.y, dist = Math.hypot(dx, dy);
  var ux = dist > .001 ? dx / dist : 0, uy = dist > .001 ? dy / dist : 0;
  if (tg.join && c.y < LANE0 - .45 && LANE0 - c.y < 1.25 && !laneClear(c, tg.x)) {   // wait at the kerb for a gap...
    c.mergeT = (c.mergeT || 0) + dt;
    if (c.mergeT < 3) { c.v = 0; return; }   // ...but after a few seconds, nose in: traffic in the lane brakes for us
  }
  if (blocked(c, ux, uy)) {
    c.v = 0; c.blockT += dt;
    if (c.blockT > 5) { c.ghost = 1.2; c.blockT = 0; }   // never stay jammed: squeeze past
    return;
  }
  c.blockT = 0;
  var onRoad = Math.abs(c.y - LANE0) < .3 && Math.abs(dx) > Math.abs(dy);
  var vt = (onRoad ? 2.2 : 1.4) * speedMul() * (tg.rev ? .6 : 1);
  if (tg.stop || c.path.length === 1 && c.state !== 'out' && c.state !== 'gout' && c.state !== 'leave') vt = Math.min(vt, .45 + dist * 3);   // ease into the bay
  c.v += (vt - c.v) * Math.min(1, dt * 4.5);
  var st = c.v * dt;
  c.moving = st > 0.0005;
  if (dist > .001) turnTo(c, Math.atan2(dy, dx) + (tg.rev ? Math.PI : 0), dt);
  // round the corners: start on the next leg a little early
  var cut = (c.path.length > 1 && !tg.rev && !tg.stop && !tg.join) ? .22 : 0;
  if (dist <= st + cut) {
    if (!cut) { c.x = tg.x; c.y = tg.y; } else { c.x += ux * Math.min(st, dist); c.y += uy * Math.min(st, dist); }
    c.path.shift();
    if (tg.rev && c.spot) { c.spot.car = null; c.spot = null; }
    if (tg.washEnd) { c.inWash = false; c.washLane = undefined; }
  } else { c.x += ux * st; c.y += uy * st; }
  if (c.washLane !== undefined && Math.abs(c.y - WYS[c.washLane]) < .3) {
    if (c.inWash && c.x >= WX1 - .1 && !c.washPaid) { c.washPaid = true; payWash(c); }
    c.inWash = c.x > WX0 - .1 && c.x < WX1 + .2;
  }
}
/* ---------- through traffic on the other lanes: just passing, but it makes the road feel alive ---------- */
function stepTraffic(dt) {
  var lanes = ROAD().lanes.slice(1), tier = roadTier();
  S.trafT -= dt;
  if (S.trafT <= 0 && S.traffic.length < 40) {
    S.trafT = (1.6 + Math.random() * 2.4) / lanes.length / (1 + .25 * tier);
    var ln = lanes[Math.floor(Math.random() * lanes.length)], dir = ln[1], x = dir > 0 ? SPAWNX : DESPAWNX;
    var clear = !S.traffic.some(function (o) { return Math.abs(o.y - ln[0]) < .1 && Math.abs(o.x - x) < 2; });
    if (clear) { var pc = pickCar(); S.traffic.push({ id: ++S.id, x: x, y: ln[0], dir: dir, ang: dir > 0 ? 0 : Math.PI, v: (2.4 + Math.random() * .9) * (1 + .15 * tier), type: pc.type, color: pc.color, moving: true }); }
  }
  S.traffic.forEach(function (c) {
    var v = c.v;
    S.traffic.forEach(function (o) { if (o !== c && Math.abs(o.y - c.y) < .1) { var d = (o.x - c.x) * c.dir; if (d > 0 && d < 1.4) v = Math.min(v, o.v * .9); } });
    c.x += c.dir * v * dt;
  });
  S.traffic = S.traffic.filter(function (c) { return c.x > SPAWNX - 1 && c.x < DESPAWNX + 1 && ROAD().lanes.some(function (l) { return Math.abs(l[0] - c.y) < .05; }); });
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
  S.traffic = [];
  for (i = 0; i < 6; i++) { stepTraffic(.01); S.traffic.forEach(function (c) { c.x += c.dir * (3 + Math.random() * 20); }); }
}
function clearCars() { S.cars = []; S.walkers = []; S.traffic = []; S.spots.forEach(function (s) { s.car = null; }); GS.forEach(function (g) { g.car = null; g.color = null; }); }

/* ---------- hustle: steady tapping fills the meter, which multiplies income; it drains when you stop ---------- */
// a tap on the lot: coins drop and the meter rises
function tapLot(lx, ly) {
  S.taps++;
  S.fx.push({ kind: 'ring', lx: lx, ly: ly, t: 0 });
  var coin = fee() * 0.04 * hustleMul();
  earn(coin);
  S.fx.push({ kind: 'tapc', lx: lx, ly: ly, t: 0, txt: '+' + fmtSmall(coin) });
  S.hype = Math.min(1, S.hype + tapPower());
  sfx('tap', S.hype); buzz('light');
  tutEvent('tap');
}
function tickHype(dt) {
  if (S.hlock > 0) { S.hlock = Math.max(0, S.hlock - dt); S.hype = 1; }
  else S.hype = Math.max(0, S.hype - drainRate() * dt);
  if (S.hype >= .99 && !S.atMax) {   // a full meter: confetti, and it counts for the goal
    S.atMax = true; S.maxes++; sfx('max'); buzz('heavy'); moneyChanged = true;
    for (var i = 0; i < 22; i++) S.fx.push({ kind: 'conf', x: Math.random(), y: -.05 - Math.random() * .2, t: 0, vx: (Math.random() - .5) * .2, vy: .25 + Math.random() * .35, c: SHIRT[i % SHIRT.length], r: Math.random() * 6 });
  } else if (S.hype < .85) S.atMax = false;
}
function vipBonus() { return Math.max(fee() * 25, econRate() * 45) * vipMul(); }
function collectVip(c) {
  var bonus = vipBonus();
  addMoney(bonus); c.vip = false; S.vips++;
  popText(c.x, c.y, '+' + fmt(bonus), true);
  if (Math.random() < .3) { S.gems++; S.fx.push({ kind: 'gem', x: c.x, y: c.y, t: 0 }); }
  sfx('vip'); buzz('medium'); save();
}
function vipGap() { return (55 + Math.random() * 60) / (1 + 0.2 * S.perk.lucky) / mod('vip', 1); }

/* ---------- frame ---------- */
var lastUnits = 0, lastShop = -1;
function update(dt) {
  S.t += dt;
  tickHype(dt);
  var fdt = dt * flow();   // the lot moves a little faster while it hustles
  S.spawnT -= fdt;
  if (S.spawnT <= 0) { spawn(false); if (S.spawnT <= 0) S.spawnT = gapBase() * (.75 + Math.random() * .5); }
  S.vipT -= dt;
  if (S.parade > 0 && S.vipT > 3) S.vipT = 3;
  if (S.vipT <= 0) {
    var ok = spawn(true);
    if (ok && S.parade > 0) S.parade--;
    S.vipT = ok ? (S.parade > 0 ? 3 : vipGap()) : 6;
  }
  if (unitCount() !== lastUnits || shopTier() !== lastShop) { if (lastShop >= 0) resetWalkers(); lastUnits = unitCount(); lastShop = shopTier(); }
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
  S.cars = S.cars.filter(function (c) { return !((c.state === 'out' || c.state === 'gout' || c.state === 'leave') && c.x >= DESPAWNX - .1); });
  stepTraffic(fdt);
  var ex = EXX(), op1 = 0, op2 = 0;
  S.cars.forEach(function (c) {
    if (c.y > 8.4 && c.y < 10.3) { if (Math.abs(c.x - ENX) < .5 && c.state === 'in') op1 = 1; if (Math.abs(c.x - ex) < .5 && c.state === 'out') op2 = 1; }
  });
  S.gate += (op1 - S.gate) * Math.min(1, dt * 7); S.gate2 = (S.gate2 || 0) + (op2 - (S.gate2 || 0)) * Math.min(1, dt * 7);
  S.particles.forEach(function (p) { p.t += dt; });
  S.particles = S.particles.filter(function (p) { return p.t < 1.2; });
  S.fx.forEach(function (f) { f.t += dt; });
  S.fx = S.fx.filter(function (f) { return f.t < (f.kind === 'conf' ? 3 : f.kind === 'bub' ? 1.4 : f.kind === 'gem' ? 1.4 : f.kind === 'pop' ? .8 : .7); });
  S.pad += (S.padTarget - S.pad) * Math.min(1, dt * 8);
  var dd = S.lvl.garage - S.deckAnim; S.deckAnim += Math.abs(dd) < .01 ? dd : dd * Math.min(1, dt * 2.2) + Math.sign(dd) * Math.min(Math.abs(dd), dt * .35);
  if (SET.daynight) S.tod = (S.tod + dt / 480) % 1;   // an eight-minute day
  S.clouds.forEach(function (c) { c.x += c.v * dt; if (c.x > 30) c.x = -30; });
  if (S.lvl.promoter && S.rushReady > 0) startRush();
  stepCam(dt); tickMeta(dt); townGrowth();
}
