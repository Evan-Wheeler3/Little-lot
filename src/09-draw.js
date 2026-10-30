/* ---------- the main lot: markings, camera and the frame ---------- */
function drawMarkings() {
  var n = COLS(), c, ex;
  poly([P(X0, 2), P(X1, 2), P(X1, 3), P(X0, 3)], '#7b87a8');
  poly([P(2, 1), P(2 + n, 1), P(2 + n, 2), P(2, 2)], '#9eaac8');
  poly([P(2, 3), P(2 + n, 3), P(2 + n, 4), P(2, 4)], '#9eaac8');
  poly([P(2, 0), P(2 + n, 0), P(2 + n, 1), P(2, 1)], '#ece3cc');
  if (n < 6) {   // bays that are not built yet: a dashed outline
    ctx.setLineDash([5, 5]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineJoin = 'round';
    [1, 3].forEach(function (yy) {
      var a = P(2 + n + .06, yy + .06), b = P(8 - .06, yy + .06), c2 = P(8 - .06, yy + .94), d = P(2 + n + .06, yy + .94);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c2.x, c2.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.stroke();
    });
    ctx.setLineDash([]);
  }
  if (S.lvl.walk >= 3) for (c = 3; c < 2 + n; c++) for (ex = 0; ex < 4; ex++) {   // zebra crossings where shoppers cross the lane
    var zy = 2.06 + ex * .25;
    poly([P(c - .16, zy), P(c + .16, zy), P(c + .16, zy + .13), P(c - .16, zy + .13)], 'rgba(255,255,255,.8)', null, 0);
  }
  S.spots.forEach(function (s) {   // EV bays are painted green
    if (!unlocked(s) || !evBay(s)) return;
    poly([P(s.x + .06, s.y + .06), P(s.x + .94, s.y + .06), P(s.x + .94, s.y + .94), P(s.x + .06, s.y + .94)], 'rgba(47,174,124,.28)', null, 0);
  });
  if (S.lvl.sign >= 1) S.spots.forEach(function (s) {
    if (!unlocked(s) || s.car) return;
    poly([P(s.x + .1, s.y + .08), P(s.x + .9, s.y + .08), P(s.x + .9, s.y + .92), P(s.x + .1, s.y + .92)], 'rgba(88,224,138,.42)', null, 0);
  });
  for (c = 2; c <= 2 + n; c++) {
    line(P(c, 1.06), P(c, 1.94), 2.4, 'rgba(255,255,255,.9)', 'butt');
    line(P(c, 3.06), P(c, 3.94), 2.4, 'rgba(255,255,255,.9)', 'butt');
  }
  [-1.2, 0.3, 8.3, 9.4].forEach(function (ax) {
    poly([P(ax - .45, 2.43), P(ax + .05, 2.43), P(ax + .05, 2.25), P(ax + .5, 2.5), P(ax + .05, 2.75), P(ax + .05, 2.57), P(ax - .45, 2.57)], 'rgba(255,255,255,.5)', null, 0);
  });
}


function drawStreetLamp(x, y) {
  prism(x - .04, y - .04, 0, x + .04, y + .04, 44, '#6b6590');
  prism(x - .04, y - .04, 44, x + .04, y + .34, 47, '#6b6590');
  prism(x - .08, y + .22, 40, x + .08, y + .4, 45, '#fff3c4');
}
var LAMPS = [[-9.6, 1.42], [-1.6, 1.42], [9.4, 1.42], [12.8, 3.58]];

/* ---------- camera ---------- */
var T = { ox: 0, oy: 0, k: 1, dpr: 1 };
// what the camera frames by default: the lot, plus the garage and car wash once they are built
function camTarget() {
  var b = { l: -56, t: 8, r: 734, b: 420 };
  if (S.deckAnim > .02) { b.l = -140; b.t = Math.min(8, -226 - S.deckAnim * DH - 18); }
  if (S.lvl.wash) b.b = 490;
  return b;
}
// phones held upright get a closer look at the lot; pinch out to see everything
function defaultZoom() { return S.w < S.h ? Math.min(1.6, Math.max(1, S.h / S.w * .7)) : 1; }
function stepCam(dt) {
  var t = camTarget(), k = S.camSet ? Math.min(1, dt * 3) : 1, v = S.view, e;
  for (e in t) S.cam[e] += (t[e] - S.cam[e]) * k;
  S.camSet = true;
  if (!v.user) {   // ease back to the default framing
    var q = Math.min(1, dt * 4);
    v.z += (defaultZoom() - v.z) * q; v.x += (0 - v.x) * q; v.y += (0 - v.y) * q;
  }
}
var ZMIN = .5, ZMAX = 4;
function clampView() {
  var v = S.view, c = S.cam, w = (c.r - c.l) * .65, h = (c.b - c.t) * .65 + 150;
  v.z = Math.max(ZMIN, Math.min(ZMAX, v.z));
  v.x = Math.max(-w, Math.min(w, v.x)); v.y = Math.max(-h, Math.min(h, v.y));
}
function computeT() {
  var dpr = cv.width / S.w, c = S.cam, VW = c.r - c.l, VH = c.b - c.t, v = S.view;
  var topPad = 92, botPad = 150 + S.pad, availH = Math.max(120, S.h - topPad - botPad);
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
  var a = dk, p;
  LAMPS.forEach(function (l) { p = P(l[0], l[1] + .3, 40); glow(p.x, p.y + 20, 70, 'rgba(255,226,150,.55)', a); });
  if (S.lvl.sign >= 1) activeSpots().forEach(function (s) { p = P(s.x + .5, s.row === 'N' ? 1.08 : 3.92, 38); glow(p.x, p.y + 14, 46, 'rgba(255,230,160,.5)', a); });
  for (var i = 0; i < COLS(); i++) { p = P(2.5 + i, .9, 10); glow(p.x, p.y, 30, 'rgba(255,220,130,.6)', a); }
  p = P(-3.45, 3.62, 46); glow(p.x, p.y, 26, freeCount() ? 'rgba(90,240,140,.7)' : 'rgba(255,90,90,.7)', a);
  if (S.lvl.wash) { p = P((WX0 + WX1) / 2, WY + .5, 14); glow(p.x, p.y, 56, 'rgba(120,210,255,.55)', a); }
  if (S.deckAnim > .5) { p = P(GOUT - .5, GY1, 12); glow(p.x, p.y, 60, 'rgba(255,220,140,.5)', a); }
  S.cars.forEach(function (c) {
    if (hiddenCar(c) || c.state === 'parked' || c.state === 'wantout') return;
    var m = CARS[c.type] || CARS.sedan, f = orel(c.x, c.y, c.ang, m.L / 2 + .45, 0);
    p = P(f.x, f.y, 3); glow(p.x, p.y, 26, 'rgba(255,240,180,.55)', a);
  });
  DECOR.forEach(function (d) { if (d.t === 'neon' && onScreen(d.x, d.y)) { p = P(d.x + d.w / 2, d.y + d.d, d.h * .55); glow(p.x, p.y, 80, hexA(d.n, .35), a); } });
  ctx.globalCompositeOperation = 'source-over';
}

/* ---------- the frame ---------- */
function drawGem(x, y, r) {
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * .85, y - r * .25); ctx.lineTo(x, y + r); ctx.lineTo(x - r * .85, y - r * .25); ctx.closePath();
  ctx.fillStyle = '#6fe3ff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
}
function draw() {
  computeT();
  var k = T.k, th = TH();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  var g = ctx.createLinearGradient(0, 0, 0, cv.height); g.addColorStop(0, th.bg[0]); g.addColorStop(1, th.bg[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(k, 0, 0, k, T.ox, T.oy);
  V.x0 = -T.ox / k; V.x1 = (cv.width - T.ox) / k; V.y0 = -T.oy / k; V.y1 = (cv.height - T.oy) / k;
  ZOFF = 0;
  drawGround();

  var back = [], front = [], objs = [];
  DECOR.forEach(function (d) { if (onScreen(d.x, d.y)) (isFront(d) ? front : back).push({ d: d.x + d.y, f: function () { drawDecor(d); } }); });
  if (S.deckAnim > .02) back.push({ d: GX1 + GY1, f: drawGarage });
  front.push({ d: -3, f: drawBooth }, { d: -2.9, f: drawGate }, { d: -1.5, f: drawEntranceSign });
  if (S.lvl.ads >= 3) front.push({ d: 3.6, f: drawBillboard });
  if (S.lvl.valet >= 1) front.push({ d: 1.8, f: drawValet });
  var byDepth = function (a, b) { return a.d - b.d; };
  back.sort(byDepth); back.forEach(function (o) { o.f(); });

  drawMarkings();
  objs.push({ d: -5, f: function () { drawShops(0); } });
  LAMPS.forEach(function (l) { objs.push({ d: l[0] + l[1], f: function () { drawStreetLamp(l[0], l[1]); } }); });
  if (S.lvl.sign >= 2) objs.push({ d: 1.6, f: function () { drawPlanter(1.6, .5); } }, { d: 2.6 + COLS(), f: function () { drawPlanter(2.4 + COLS(), .5); } });
  if (S.lvl.wash) objs.push({ d: WX1 + WY + .5, f: drawWash });
  if (S.lvl.sign >= 1) S.spots.forEach(function (s) { if (unlocked(s)) objs.push({ d: s.x + .5 + (s.row === 'N' ? 1.08 : 3.92), f: function () { drawLamp(s); } }); });
  S.spots.forEach(function (s) { if (unlocked(s) && evBay(s)) objs.push({ d: s.x + .16 + (s.row === 'N' ? 1.1 : 3.9), f: function () { drawCharger(s); } }); });
  S.cars.forEach(function (c) { if (!hiddenCar(c)) objs.push({ d: c.x + c.y, f: function () { drawCar(c); } }); });
  S.walkers.forEach(function (w) { if (w.state !== 'inside') objs.push({ d: w.x + w.y + .05, f: function () { drawWalker(w); } }); });
  objs.sort(byDepth); objs.forEach(function (o) { o.f(); });
  front.sort(byDepth); front.forEach(function (o) { o.f(); });
  nightPass();
  ctx.setTransform(k, 0, 0, k, T.ox, T.oy);
  S.fx.forEach(function (f) {
    var q;
    if (f.kind === 'bub') { q = P(f.x + f.vx * f.t * .02, f.y, f.z + f.t * 22); ctx.globalAlpha = Math.max(0, 1 - f.t / 1.4); circle(q.x, q.y, 2.5 + f.t * 2, 'rgba(255,255,255,.85)'); }
    else if (f.kind === 'gem') { q = P(f.x, f.y, 50 + f.t * 40); ctx.globalAlpha = Math.max(0, 1 - f.t / 1.4); drawGem(q.x, q.y, 9); label('+1', q.x + 18, q.y, 13, '#fff'); }
    else if (f.kind === 'ring') { ctx.globalAlpha = Math.max(0, 1 - f.t / .7); ctx.beginPath(); ctx.arc(f.lx, f.ly, 6 + f.t * 70, 0, Math.PI * 2); ctx.lineWidth = 3; ctx.strokeStyle = S.fever > 0 ? '#ff9ccf' : '#ffffff'; ctx.stroke(); }
    else if (f.kind === 'tapc') { ctx.globalAlpha = Math.max(0, 1 - f.t / .7); label(f.txt, f.lx, f.ly - 14 - f.t * 40, 13, '#ffe38a'); }
    ctx.globalAlpha = 1;
  });
  S.particles.forEach(function (p) {
    var q = P(p.x, p.y, 34 + p.t * 30), s = p.big ? 1.5 : 1;
    ctx.globalAlpha = Math.min(1, (1.2 - p.t) * 2.2);
    circle(q.x - 17 * s, q.y, 8.5 * s, '#ffd04a', 2.4); label('$', q.x - 17 * s, q.y + .5, 11 * s, '#3b2f5c');
    label(p.txt, q.x + 6 * s, q.y, 16 * s, S.fever > 0 ? '#ffd1ec' : '#fff');
    ctx.globalAlpha = 1;
  });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  var dpr = T.dpr;
  if (S.fever > 0) {   // Fever: a pink glow pulsing at the edges
    var pu = REDUCE ? .5 : .5 + .5 * Math.sin(S.t * 8);
    var rg = ctx.createRadialGradient(cv.width / 2, cv.height / 2, Math.min(cv.width, cv.height) * .35, cv.width / 2, cv.height / 2, Math.max(cv.width, cv.height) * .75);
    rg.addColorStop(0, 'rgba(255,120,200,0)'); rg.addColorStop(1, 'rgba(255,120,200,' + (.22 + .12 * pu) + ')');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, cv.width, cv.height);
  }
  S.fx.forEach(function (f) {
    if (f.kind !== 'conf') return;
    var x = (f.x + f.vx * f.t) * cv.width, y = (f.y + f.vy * f.t) * cv.height;
    ctx.save(); ctx.translate(x, y); ctx.rotate(f.r + f.t * 6); ctx.globalAlpha = Math.max(0, 1 - f.t / 3);
    ctx.fillStyle = f.c; ctx.fillRect(-4 * dpr, -2.5 * dpr, 8 * dpr, 5 * dpr); ctx.restore();
  });
  var h1 = ctx.createLinearGradient(0, 0, 0, 190 * dpr); h1.addColorStop(0, hexA(th.bg[0], .78)); h1.addColorStop(1, hexA(th.bg[0], 0));
  ctx.fillStyle = h1; ctx.fillRect(0, 0, cv.width, 190 * dpr);
  var h2 = ctx.createLinearGradient(0, cv.height - 170 * dpr, 0, cv.height); h2.addColorStop(0, hexA(th.bg[1], 0)); h2.addColorStop(1, hexA(th.bg[1], .8));
  ctx.fillStyle = h2; ctx.fillRect(0, cv.height - 170 * dpr, cv.width, 170 * dpr);
}

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
  audioUnlock();
  var p = cssPt(e); PTR[e.pointerId] = { x: p.x, y: p.y, sx: p.x, sy: p.y, t: performance.now() };
  try { cv.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
  if (ptrCount() === 1) dragged = false;
  if (ptrCount() === 2) { dragged = true; pinch = null; }
});
cv.addEventListener('pointermove', function (e) {
  var q = PTR[e.pointerId]; if (!q) return;
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
  e.preventDefault();
  var p = cssPt(e); zoomAt(p.x, p.y, Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0015)));
}, { passive: false });
// iOS Safari sends its own pinch gestures; the canvas handles zoom itself
['gesturestart', 'gesturechange'].forEach(function (n) { document.addEventListener(n, function (e) { e.preventDefault(); }, { passive: false }); });
