/* ---------- camera ---------- */
var T = { ox: 0, oy: 0, k: 1, dpr: 1 };
// the camera frames what is built: the lot, the market, the road, and the garage and car wash once they exist
function camTarget() {
  var ex = EXX(), x0 = S.deckAnim > .02 ? GX0 - .8 : -2.6, x1 = S.lvl.wash ? WRX + 1 : Math.max(ex + 1.5, shopSpan()[1] + 1);
  var y0 = topY() - 3.6, y1 = RY + ROAD().w + 1.2, zt = Math.max([30, 36, 56, 80, 200][shopTier()], S.deckAnim * DH + 30);
  var l = P(x0, y1).x, r = P(x1, y0).x, t = Math.min(P(x0, y0, zt * .6).y, P(GX1, GY0, S.deckAnim > .02 ? S.deckAnim * DH + 40 : 0).y), b = P(x1, y1).y;
  return { l: l - 20, t: t - 10, r: r + 20, b: b + 10 };
}
// phones held upright get a closer look; pinch out to see everything
function defaultZoom() {
  var c = S.cam, availH = Math.max(120, S.h - 242 - S.safeT - S.safeB), fit = Math.min(S.w / (c.r - c.l), availH / (c.b - c.t));
  return Math.max(1, Math.min(2, .74 / fit));
}
function stepCam(dt) {
  var t = camTarget(), k = S.camSet ? Math.min(1, dt * 3) : 1, v = S.view, e;
  for (e in t) S.cam[e] += (t[e] - S.cam[e]) * k;
  S.camSet = true;
  if (!v.user) {   // ease back to the default framing
    var q = Math.min(1, dt * 4);
    v.z += (defaultZoom() - v.z) * q; v.x += (0 - v.x) * q; v.y += (0 - v.y) * q;
  }
}
var ZMIN = .45, ZMAX = 4;
function clampView() {
  var v = S.view, c = S.cam, w = (c.r - c.l) * .7 + 200, h = (c.b - c.t) * .7 + 200;
  v.z = Math.max(ZMIN, Math.min(ZMAX, v.z));
  v.x = Math.max(-w, Math.min(w, v.x)); v.y = Math.max(-h, Math.min(h, v.y));
}
function computeT() {
  var dpr = cv.width / S.w, c = S.cam, VW = c.r - c.l, VH = c.b - c.t, v = S.view;
  var topPad = 92 + S.safeT, botPad = 150 + S.safeB + S.pad, availH = Math.max(120, S.h - topPad - botPad);
  var sc = Math.min(S.w / VW, availH / VH) * v.z;
  var cx = c.l + VW / 2 + v.x, cy = c.t + VH / 2 + v.y;
  T.k = sc * dpr; T.dpr = dpr; T.ox = (S.w / 2 - cx * sc) * dpr; T.oy = (topPad + availH / 2 - cy * sc) * dpr;
}
// screen (css px) to lot coordinates, using the current transform
function toLot(sx, sy) { return { x: (sx * T.dpr - T.ox) / T.k, y: (sy * T.dpr - T.oy) / T.k }; }
// zoom by f around a point on screen, keeping what is under the fingers in place
function zoomAt(sx, sy, f) {
  var v = S.view, before = toLot(sx, sy);
  v.user = true; v.z *= f; clampView(); computeT();
  var after = toLot(sx, sy);
  v.x += before.x - after.x; v.y += before.y - after.y; clampView(); computeT();
}
function panBy(dx, dy) { var v = S.view; v.user = true; v.x -= dx * T.dpr / T.k; v.y -= dy * T.dpr / T.k; clampView(); computeT(); }
function hiddenCar(c) { return c.state === 'ghide' || c.state === 'gwait'; }

/* ---------- light: dusk, night and the glow of the lot ---------- */
function daylight() { return .5 + .5 * Math.cos(S.tod * Math.PI * 2); }
function nightAmt() {
  var dk = Math.max(0, Math.min(1, (.45 - daylight()) / .45));
  return Math.max(dk, TH().night || 0);
}
function hexA(h, a) { var n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
function nightPass() {
  var dk = nightAmt(), li = daylight(), col;
  if (dk > 0) col = mix('#ffd9bd', '#6a66b4', dk);
  else if (li < .65) col = mix('#ffffff', '#ffd9bd', Math.min(1, (.65 - li) / .2));
  else return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = col; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.globalCompositeOperation = 'source-over';
  if (dk < .05) return;
  ctx.setTransform(T.k, 0, 0, T.k, T.ox, T.oy);
  ctx.globalCompositeOperation = 'lighter';
  var a = dk, p, ex = EXX();
  lotLamps().forEach(function (l) { p = P(l[0], l[1], 36); glow(p.x, p.y + 16, 60, 'rgba(255,230,160,.5)', a); });
  [-16.5, -12.6, -9.8, 2.3, 6.4, 14.1, 18.3, 23, 27].forEach(function (x) { p = P(x, RY + .1, 40); glow(p.x, p.y + 18, 64, 'rgba(255,226,150,.45)', a); });
  shopDoors().forEach(function (dx) { p = P(dx, shopFrontY() + .1, 10); glow(p.x, p.y, 34, 'rgba(255,220,130,.6)', a); });
  p = P(-2, 9.75, 70); glow(p.x, p.y, 30, freeCount() ? 'rgba(90,240,140,.6)' : 'rgba(255,90,90,.6)', a);
  if (S.lvl.wash) WYS.slice(0, washLanes()).forEach(function (wy) { p = P(WX1, wy, 10); glow(p.x, p.y, 40, 'rgba(120,210,255,.5)', a); });
  if (S.deckAnim > .5) for (var d = 0; d < Math.floor(S.deckAnim); d++) { p = P((GX0 + GX1) / 2, GY1, d * DH + 20); glow(p.x, p.y, 70, 'rgba(255,230,160,.35)', a); }
  S.cars.concat(S.traffic).forEach(function (c) {
    if (hiddenCar(c) || c.state === 'parked' || c.state === 'wantout' || c.inWash) return;
    var m = CARS[c.type] || CARS.sedan, f = orel(c.x, c.y, c.ang, m.L / 2 + .45, 0);
    p = P(f.x, f.y, 3); glow(p.x, p.y, 26, 'rgba(255,240,180,.55)', a);
  });
  var n = townShown();
  for (var i = 0; i < n; i++) { var q = TOWN[i]; if (q.t === 'neon' && onScreen(q.x, q.y)) { p = P(q.x + q.w / 2, q.y + q.d, q.h * .55); glow(p.x, p.y, 80, hexA(q.n, .35), a); } }
  ctx.globalCompositeOperation = 'source-over';
}

/* ---------- the frame ---------- */
function drawGem(x, y, r) {
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * .85, y - r * .25); ctx.lineTo(x, y + r); ctx.lineTo(x - r * .85, y - r * .25); ctx.closePath();
  ctx.fillStyle = '#6fe3ff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
}
/* ---------- the cached background ----------
   Grass, streets, the road, the lot paint and the town behind the lot hardly ever change, so they are drawn once
   into an offscreen canvas (with a margin for panning) and copied to the screen each frame. It is redrawn only when
   the layout changes, the town grows, or the zoom drifts; while pinching, the old copy is simply scaled. */
var BG = { cv: null, key: '', ox: 0, oy: 0, k: 1, m: 0 };
function bgKey() { return [S.theme, S.lvl.space, roadTier(), washLanes(), S.deckAnim > .02 ? 1 : 0, shopTier(), Math.min(S.lvl.ev, builtCols()), townShown(), cv.width, cv.height].join(); }
function inBg(p) { return p.y + p.d < RY - .45; }   // town plots north of the road never have anything moving behind them
function bakeBg(key) {
  var m = Math.round(Math.max(cv.width, cv.height) * .3), main = ctx, k = T.k, th = TH(), i;
  if (!BG.cv) BG.cv = document.createElement('canvas');
  if (BG.cv.width !== cv.width + 2 * m || BG.cv.height !== cv.height + 2 * m) { BG.cv.width = cv.width + 2 * m; BG.cv.height = cv.height + 2 * m; }
  ctx = BG.cv.getContext('2d'); SEAMS = true;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  var g = ctx.createLinearGradient(0, 0, 0, BG.cv.height); g.addColorStop(0, th.bg[0]); g.addColorStop(1, th.bg[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, BG.cv.width, BG.cv.height);
  var ox = T.ox + m, oy = T.oy + m;
  ctx.setTransform(k, 0, 0, k, ox, oy);
  V.x0 = -ox / k; V.x1 = (BG.cv.width - ox) / k; V.y0 = -oy / k; V.y1 = (BG.cv.height - oy) / k;
  ZOFF = 0;
  drawGround();
  var L = [], n = townShown();
  for (i = 0; i < n; i++) if (TOWN[i].t === 'house' && inBg(TOWN[i]) && onScreen(TOWN[i].x, TOWN[i].y)) drawHouseGround(TOWN[i]);   // yards first, under everything
  for (i = 0; i < n; i++) (function (p, i) { if (inBg(p) && onScreen(p.x, p.y)) L.push({ d: p.x + p.y + p.d + (p.kind === 'ell' ? .9 : 0), f: function () { drawPlot(p, i); } }); })(TOWN[i], i);
  STREET_TREES.forEach(function (t) { if (onScreen(t[0], t[1])) L.push({ d: t[0] + t[1], f: function () { drawTreeKind(t[2] ? TH().tree2 : TH().tree, t[0], t[1], .75); } }); });
  S.spots.forEach(function (s) { if (unlocked(s) && evBay(s)) L.push({ d: s.x + s.y + 50, f: function () { drawChargerPost(s); } }); });
  L.sort(function (a, b) { return a.d - b.d; }); L.forEach(function (o) { o.f(); });
  SEAMS = false; ctx = main;
  BG.key = key; BG.ox = T.ox; BG.oy = T.oy; BG.k = k; BG.m = m; BG.n = (BG.n || 0) + 1;
}
function drawBg(interacting) {
  var key = bgKey(), s = T.k / BG.k, m = BG.m;
  var dx = T.ox - (BG.ox + m) * s, dy = T.oy - (BG.oy + m) * s, dw = (BG.cv ? BG.cv.width : 0) * s, dh = (BG.cv ? BG.cv.height : 0) * s;
  var uncovered = dx > 0 || dy > 0 || dx + dw < cv.width || dy + dh < cv.height;
  // never leave a bare edge: if the copy would not fill the screen, redraw it now, mid-gesture or not
  if (!BG.cv || key !== BG.key || uncovered || Math.abs(s - 1) > (interacting ? .4 : .01)) {
    bakeBg(key); s = 1; dx = T.ox - BG.ox - BG.m; dy = T.oy - BG.oy - BG.m; dw = BG.cv.width; dh = BG.cv.height; uncovered = false;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (s === 1) ctx.drawImage(BG.cv, Math.round(dx), Math.round(dy)); else ctx.drawImage(BG.cv, dx, dy, dw, dh);
}
function draw() {
  computeT();
  var k = T.k, th = TH(), i;
  drawBg(perfNow() - lastInput < 600);
  ctx.setTransform(k, 0, 0, k, T.ox, T.oy);
  V.x0 = -T.ox / k; V.x1 = (cv.width - T.ox) / k; V.y0 = -T.oy / k; V.y1 = (cv.height - T.oy) / k;
  ZOFF = 0;
  if (!SET.saver) drawCloudShadows();

  // three passes, back to front: everything north of the road, then the road, then the far side
  var north = [], road = [], south = [], ex = EXX(), sp = shopSpan();
  var put = function (y, o) { (y < RY - .45 ? north : y < RY + 8 ? road : south).push(o); };
  var n = townShown();
  for (i = 0; i < n; i++) (function (p, i) { if (!inBg(p) && onScreen(p.x, p.y)) put(p.y + p.d, { d: p.x + p.y + p.d, f: function () { drawPlot(p, i); } }); })(TOWN[i], i);
  if (S.deckAnim > .02) north.push({ d: GX0 + GY1, f: drawGarage });
  north.push({ d: sp[0] + shopFrontY() - .2, f: drawMarket });
  if (S.lvl.wash) north.push({ d: WX0 + WYS[0] + .55, f: drawWash });
  north.push({ d: -1.85 + 8.75, f: drawBooth });
  road.push({ d: ENX - .5 + 9.35, f: function () { drawArm(ENX - .5, S.gate); } }, { d: ex - .5 + 9.35, f: function () { drawArm(ex - .5, S.gate2 || 0); } }, { d: -2 + 9.75, f: drawEntranceSign });
  if (S.lvl.ads >= 3) road.push({ d: -11.2 + 9.2, f: drawBillboard });
  if (S.lvl.valet >= 1) north.push({ d: -1.85 + 7.6, f: drawValet });
  lotLamps().forEach(function (l) { (l[1] > 9.4 ? road : north).push({ d: l[0] + l[1], f: function () { drawLotLamp(l[0], l[1]); } }); });
  S.spots.forEach(function (s) { if (unlocked(s) && evBay(s) && s.car && s.car.state === 'parked') north.push({ d: s.x + s.y + (s.row === 'N' ? .1 : .9), f: function () { drawCable(s); } }); });
  S.cars.forEach(function (c) { if (!hiddenCar(c) && onScreen(c.x, c.y)) put(c.y, { d: c.x + c.y, f: function () { drawCar(c); } }); });
  S.traffic.forEach(function (c) { if (onScreen(c.x, c.y)) road.push({ d: c.x + c.y, f: function () { drawCar(c); } }); });
  S.walkers.forEach(function (w) { if (w.state !== 'inside' && onScreen(w.x, w.y)) north.push({ d: w.x + w.y + .05, f: function () { drawWalker(w); } }); });
  roadObjects(road);
  var byDepth = function (a, b) { return a.d - b.d; };
  [north, road, south].forEach(function (L) { L.sort(byDepth); L.forEach(function (o) { o.f(); }); });
  nightPass();
  ctx.setTransform(k, 0, 0, k, T.ox, T.oy);
  var hot = S.hype > .5;
  S.fx.forEach(function (f) {
    var q;
    if (f.kind === 'bub') { q = P(f.x + f.vx * f.t * .02, f.y, f.z + f.t * 22); ctx.globalAlpha = Math.max(0, 1 - f.t / 1.4); circle(q.x, q.y, 2.5 + f.t * 2, 'rgba(255,255,255,.85)'); }
    else if (f.kind === 'gem') { q = P(f.x, f.y, 50 + f.t * 40); ctx.globalAlpha = Math.max(0, 1 - f.t / 1.4); drawGem(q.x, q.y, 9); label('+1', q.x + 18, q.y, 13, '#fff'); }
    else if (f.kind === 'pop') { q = P(f.x, f.y, f.z); var r = f.t / .8; ctx.globalAlpha = Math.max(0, 1 - r); for (var j = 0; j < 8; j++) { var an = j * Math.PI / 4; circle(q.x + Math.cos(an) * 40 * r, q.y + Math.sin(an) * 20 * r - 20 * r, 5 * (1 - r) + 1, j % 2 ? '#ffd04a' : '#ffffff'); } }
    else if (f.kind === 'ring') { ctx.globalAlpha = Math.max(0, 1 - f.t / .7); ctx.beginPath(); ctx.arc(f.lx, f.ly, 6 + f.t * 70, 0, Math.PI * 2); ctx.lineWidth = 3; ctx.strokeStyle = hot ? '#ffb0dc' : '#ffffff'; ctx.stroke(); }
    else if (f.kind === 'tapc') { ctx.globalAlpha = Math.max(0, 1 - f.t / .7); label(f.txt, f.lx, f.ly - 14 - f.t * 40, 13, '#ffe38a'); }
    ctx.globalAlpha = 1;
  });
  S.particles.forEach(function (p) {
    var q = P(p.x, p.y, 34 + p.t * 30), s = p.big ? 1.5 : 1;
    ctx.globalAlpha = Math.min(1, (1.2 - p.t) * 2.2);
    circle(q.x - 17 * s, q.y, 8.5 * s, '#ffd04a', 2.4); label('$', q.x - 17 * s, q.y + .5, 11 * s, '#3b2f5c');
    label(p.txt, q.x + 6 * s, q.y, 16 * s, hot ? '#ffd1ec' : '#fff');
    ctx.globalAlpha = 1;
  });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  var dpr = T.dpr;
  S.fx.forEach(function (f) {
    if (f.kind !== 'conf') return;
    var x = (f.x + f.vx * f.t) * cv.width, y = (f.y + f.vy * f.t) * cv.height;
    ctx.save(); ctx.translate(x, y); ctx.rotate(f.r + f.t * 6); ctx.globalAlpha = Math.max(0, 1 - f.t / 3);
    ctx.fillStyle = f.c; ctx.fillRect(-4 * dpr, -2.5 * dpr, 8 * dpr, 5 * dpr); ctx.restore();
  });
}

var lastInput = -1e9;
function perfNow() { return performance.now(); }
/* ---------- touch: tap to hustle, drag to look around, pinch or scroll to zoom ---------- */
var PTR = {}, pinch = null, dragged = false;
function ptrCount() { return Object.keys(PTR).length; }
function cssPt(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
function tapAt(sx, sy) {
  var l = toLot(sx, sy);
  for (var i = 0; i < S.cars.length; i++) {
    var c = S.cars[i];
    if (c.vip && !hiddenCar(c) && Math.hypot(l.x - c.hx, l.y - (c.hy - 10)) < 52) { collectVip(c); return; }
  }
  tapLot(l.x, l.y);
}
cv.addEventListener('pointerdown', function (e) {
  audioUnlock(); lastInput = perfNow();
  var p = cssPt(e); PTR[e.pointerId] = { x: p.x, y: p.y, sx: p.x, sy: p.y, t: performance.now() };
  try { cv.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
  if (ptrCount() === 1) dragged = false;
  if (ptrCount() === 2) { dragged = true; pinch = null; }
});
cv.addEventListener('pointermove', function (e) {
  var q = PTR[e.pointerId]; if (!q) return;
  lastInput = perfNow();
  var p = cssPt(e), ids = Object.keys(PTR);
  if (ids.length === 1) {
    if (!dragged && Math.hypot(p.x - q.sx, p.y - q.sy) > 9) dragged = true;
    if (dragged) { panBy(p.x - q.x, p.y - q.y); tutEvent('pan'); }
  } else if (ids.length >= 2) {
    var a = PTR[ids[0]], b = PTR[ids[1]];
    q.x = p.x; q.y = p.y;
    var d = Math.hypot(b.x - a.x, b.y - a.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    if (pinch) { zoomAt(mx, my, d / Math.max(1, pinch.d)); panBy(mx - pinch.mx, my - pinch.my); tutEvent('pan'); }
    pinch = { d: d, mx: mx, my: my };
    return;
  }
  q.x = p.x; q.y = p.y;
});
function ptrEnd(e) {
  var q = PTR[e.pointerId]; if (!q) return;
  delete PTR[e.pointerId];
  if (ptrCount() < 2) pinch = null;
  if (e.type === 'pointerup' && !dragged && ptrCount() === 0 && performance.now() - q.t < 600) tapAt(q.x, q.y);
}
cv.addEventListener('pointerup', ptrEnd);
cv.addEventListener('pointercancel', ptrEnd);
cv.addEventListener('wheel', function (e) {
  e.preventDefault(); lastInput = perfNow();
  var p = cssPt(e); zoomAt(p.x, p.y, Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0015)));
}, { passive: false });
// iOS Safari sends its own pinch gestures; the canvas handles zoom itself
['gesturestart', 'gesturechange'].forEach(function (n) { document.addEventListener(n, function (e) { e.preventDefault(); }, { passive: false }); });
