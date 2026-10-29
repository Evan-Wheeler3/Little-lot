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

var T = { ox: 0, oy: 0, k: 1, dpr: 1 };
// the camera widens and rises as the garage goes up, so the lot and the building both stay in view
function camTarget() {
  if (S.deckAnim < .02) return { top: 8, left: -56 };
  return { top: Math.min(8, -226 - S.deckAnim * DH - 18), left: -140 };
}
function stepCam(dt) {
  var t = camTarget(), k = S.camSet ? Math.min(1, dt * 3) : 1;
  S.camTop += (t.top - S.camTop) * k; S.camLeft += (t.left - S.camLeft) * k; S.camSet = true;
}
function hiddenCar(c) { return c.state === 'ghide' || c.state === 'gwait'; }
function draw() {
  var dpr = cv.width / S.w, VX = S.camLeft, VY = S.camTop, VW = 734 - VX, VH = 420 - VY;
  var topPad = 84, botPad = 100 + S.pad, availH = Math.max(120, S.h - topPad - botPad);
  var sc = Math.min(S.w / VW, availH / VH), k = sc * dpr;
  T.k = k; T.dpr = dpr;
  T.ox = ((S.w - VW * sc) / 2 - VX * sc) * dpr; T.oy = (topPad + (availH - VH * sc) / 2 - VY * sc) * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  var g = ctx.createLinearGradient(0, 0, 0, cv.height); g.addColorStop(0, '#a9e585'); g.addColorStop(1, '#8bd566');
  ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(k, 0, 0, k, T.ox, T.oy);
  V.x0 = -T.ox / k; V.x1 = (cv.width - T.ox) / k; V.y0 = -T.oy / k; V.y1 = (cv.height - T.oy) / k;
  ZOFF = 0;
  drawGround();

  var back = [], front = [], objs = [];
  DECOR.forEach(function (d) { if (onScreen(d.x, d.y)) (isFront(d) ? front : back).push({ d: d.x + d.y, f: function () { drawDecor(d); } }); });
  if (S.deckAnim > .02) back.push({ d: GX1 + GY1, f: drawGarage });
  front.push({ d: -3, f: drawBooth }, { d: -2.9, f: drawGate }, { d: -1.5, f: drawEntranceSign });
  var byDepth = function (a, b) { return a.d - b.d; };
  back.sort(byDepth); back.forEach(function (o) { o.f(); });

  drawMarkings();
  objs.push({ d: -5, f: function () { drawShops(0); } });
  if (S.lvl.sign >= 1) S.spots.forEach(function (s) { if (unlocked(s)) objs.push({ d: s.x + .5 + (s.row === 'N' ? 1.08 : 3.92), f: function () { drawLamp(s); } }); });
  S.cars.forEach(function (c) { if (!hiddenCar(c)) objs.push({ d: c.x + c.y, f: function () { drawCar(c); } }); });
  S.walkers.forEach(function (w) { if (w.state !== 'inside') objs.push({ d: w.x + w.y + .05, f: function () { drawWalker(w); } }); });
  objs.sort(byDepth); objs.forEach(function (o) { o.f(); });
  front.sort(byDepth); front.forEach(function (o) { o.f(); });
  S.particles.forEach(function (p) {
    var q = P(p.x, p.y, 34 + p.t * 30);
    ctx.globalAlpha = Math.min(1, (1.2 - p.t) * 2.2);
    circle(q.x - 17, q.y, 8.5, '#ffd04a', 2.4); label('$', q.x - 17, q.y + .5, 11, '#3b2f5c');
    label(p.txt, q.x + 6, q.y, 16, '#fff');
    ctx.globalAlpha = 1;
  });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  var h1 = ctx.createLinearGradient(0, 0, 0, 190 * dpr); h1.addColorStop(0, 'rgba(166,228,132,.78)'); h1.addColorStop(1, 'rgba(166,228,132,0)');
  ctx.fillStyle = h1; ctx.fillRect(0, 0, cv.width, 190 * dpr);
  var h2 = ctx.createLinearGradient(0, cv.height - 170 * dpr, 0, cv.height); h2.addColorStop(0, 'rgba(139,213,102,0)'); h2.addColorStop(1, 'rgba(139,213,102,.8)');
  ctx.fillStyle = h2; ctx.fillRect(0, cv.height - 170 * dpr, cv.width, 170 * dpr);
}

