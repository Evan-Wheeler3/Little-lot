/* ---------- cars and people ---------- */
// body: length L and width W in tiles, body height b; cabin length cl and width cw as shares of the body, cabin height ch, slid co along the car
var CARS = {
  sedan: { L: .74, W: .44, b: 7.5, cl: .55, cw: .86, ch: 6.5, co: -.04, w: 30 },
  hatch: { L: .62, W: .42, b: 7.5, cl: .6, cw: .86, ch: 7, co: -.1, w: 20 },
  suv: { L: .8, W: .48, b: 9, cl: .66, cw: .88, ch: 7, co: -.06, w: 16 },
  van: { L: .84, W: .48, b: 9, cl: .82, cw: .92, ch: 8, co: -.04, w: 10 },
  pickup: { L: .84, W: .46, b: 7, cl: .34, cw: .88, ch: 7, co: .14, bed: true, w: 10 },
  taxi: { L: .74, W: .44, b: 7.5, cl: .55, cw: .86, ch: 6.5, co: -.04, sign: true, color: '#ffd04a', w: 6 },
  sport: { L: .78, W: .46, b: 5.5, cl: .42, cw: .8, ch: 5, co: -.08, w: 6 },
  limo: { L: 1.0, W: .46, b: 7.5, cl: .7, cw: .86, ch: 6.5, co: -.04, color: '#ffd04a', w: 0 }
};
var CAR_KEYS = Object.keys(CARS);
function pickCar() {
  var tot = 0, r, i;
  CAR_KEYS.forEach(function (k) { tot += CARS[k].w; });
  r = Math.random() * tot;
  for (i = 0; i < CAR_KEYS.length; i++) { r -= CARS[CAR_KEYS[i]].w; if (r <= 0) return CAR_KEYS[i]; }
  return 'sedan';
}
function carColor(type) { return CARS[type].color || CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]; }
function facePoly(cx, cy, a, u, v0, v1, z0, z1, col) {
  var p = orel(cx, cy, a, u, v0), q = orel(cx, cy, a, u, v1);
  poly([P(p.x, p.y, z1), P(q.x, q.y, z1), P(q.x, q.y, z0), P(p.x, p.y, z0)], col, null, 0);
}
function drawCar(c) {
  var m = CARS[c.type] || CARS.sedan, a = c.ang, L = m.L, W = m.W, hl = L / 2, hw = W / 2, i;
  var bob = (c.moving && !REDUCE) ? Math.sin(S.t * 16 + c.id) * .7 : 0, zb = 3 + bob;
  var al = Math.max(0, Math.min(1, (c.x - SPAWNX) / .8, (15 - c.x) / .8));
  if (c.g) al = Math.min(al, Math.max(0, Math.min(1, (c.y - GY1 + .05) / .9)));   // drive into / out of the garage doorway
  if (c.inWash) al = Math.min(al, Math.max(0, Math.min(1, (WX0 + .2 - c.x) / .5, (c.x - WX1 + .2) / .5)));
  if (al <= 0) return;
  ctx.globalAlpha = al;
  var sh = [orel(c.x, c.y, a, hl + .05, -hw - .05), orel(c.x, c.y, a, hl + .05, hw + .05), orel(c.x, c.y, a, -hl - .05, hw + .05), orel(c.x, c.y, a, -hl - .05, -hw - .05)];
  poly(sh.map(function (p) { return P(p.x, p.y); }), 'rgba(40,30,80,.22)', null, 0);
  // speed streaks when the lot is hustling
  var fl = flow();
  if (c.moving && fl > 1.25 && !REDUCE) [-.14, .14].forEach(function (v) {
    var p = orel(c.x, c.y, a, -hl - .08, v), q = orel(c.x, c.y, a, -hl - .08 - .3 * (fl - 1), v);
    line(P(p.x, p.y, zb + 5), P(q.x, q.y, zb + 5), 2, 'rgba(255,255,255,.7)');
  });
  var wh = [[.3, -.5], [.3, .5], [-.3, .5], [-.3, -.5]].map(function (w) { return orel(c.x, c.y, a, w[0] * L, w[1] * W); });
  wh.sort(function (p, q) { return (p.x + p.y) - (q.x + q.y); });
  wh.forEach(function (w) { var p = P(w.x, w.y, 3.4); circle(p.x, p.y, 3.7, '#2d2842'); circle(p.x, p.y, 1.5, '#d7d1ea'); });
  var col = c.color, glass = '#9ad4ff', zt = zb + m.b;
  obox(c.x, c.y, a, hl, hw, zb, zt, .97, .93, 0, col, function () { return col; });
  // lights on the end the camera sees: headlights at the front, tail lights at the back
  var ca = Math.cos(a), sa = Math.sin(a);
  if (ca + sa > .02) { facePoly(c.x, c.y, a, hl + .004, -hw * .8, -hw * .4, zb + 2.5, zb + 5, '#fff3a8'); facePoly(c.x, c.y, a, hl + .004, hw * .4, hw * .8, zb + 2.5, zb + 5, '#fff3a8'); }
  else if (ca + sa < -.02) { facePoly(c.x, c.y, a, -hl - .004, -hw * .8, -hw * .45, zb + 3, zb + 5.5, '#ff5a5a'); facePoly(c.x, c.y, a, -hl - .004, hw * .45, hw * .8, zb + 3, zb + 5.5, '#ff5a5a'); }
  if (m.bed) {   // the pickup's open bed behind the cab
    var bp = [orel(c.x, c.y, a, -hl * .9, -hw * .78), orel(c.x, c.y, a, -hl * .9, hw * .78), orel(c.x, c.y, a, -hl * .12, hw * .78), orel(c.x, c.y, a, -hl * .12, -hw * .78)];
    poly(bp.map(function (p) { return P(p.x, p.y, zt + .2); }), shade(col, .62), null, 0);
  }
  obox(c.x + ca * m.co * L, c.y + sa * m.co * L, a, hl * m.cl, hw * m.cw, zt, zt + m.ch, .74, .8, 0, shade(col, 1.08), function (f) { return f === 0 || f === 2 ? '#bfe6ff' : glass; });
  if (m.sign) obox(c.x + ca * m.co * L, c.y + sa * m.co * L, a, .07, .12, zt + m.ch, zt + m.ch + 3.5, 1, 1, 0, '#ffffff', function () { return '#ff7a6b'; });
  var hp = P(c.x, c.y, 18); c.hx = hp.x; c.hy = hp.y;
  if (c.vip) {
    var tp = P(c.x, c.y, 42 + (REDUCE ? 0 : Math.sin(S.t * 5) * 3)), pulse = REDUCE ? 1 : 1 + Math.sin(S.t * 7) * .12;
    if (!REDUCE) for (i = 0; i < 3; i++) { var sp = S.t * 2 + i * 2.1; circle(tp.x + Math.cos(sp) * 17, tp.y + Math.sin(sp) * 8, 2.2, '#fffbe0'); }
    star(tp.x, tp.y, 11 * pulse, '#fff27a');
    label('TAP', tp.x, tp.y - 19, 11, '#fff');
  }
  ctx.globalAlpha = 1;
}
var SHIRT = ['#ff7a6b', '#5db8ff', '#ffd04a', '#5fd6a4', '#b79bff', '#ff9ccf', '#ff9f5a'];
var HAIR = ['#3b2f5c', '#7a4a2b', '#e0b04a', '#2a2438', '#a8532f'];
function drawWalker(w) {
  var x = w.x, y = w.y, s = (w.moving && !REDUCE) ? Math.sin(S.t * 13 + w.id) : 0, bob = (w.moving && !REDUCE) ? Math.abs(s) * 1.1 : 0;
  poly([P(x - .1, y - .08), P(x + .1, y - .08), P(x + .1, y + .08), P(x - .1, y + .08)], 'rgba(40,30,80,.2)', null, 0);
  prism(x - .07, y - .04, 0, x - .01, y + .02, 5.5 + s * 1.4, '#3b2f5c');
  prism(x + .01, y - .04, 0, x + .07, y + .02, 5.5 - s * 1.4, '#3b2f5c');
  prism(x - .09, y - .06, 5 + bob, x + .09, y + .06, 13 + bob, w.color);
  prism(x - .06, y - .05, 13 + bob, x + .06, y + .05, 18.5 + bob, '#ffd9bd');
  prism(x - .07, y - .06, 17 + bob, x + .07, y + .06, 20 + bob, w.hair);
  if (w.bag) prism(x + .1, y - .04, 4 + bob, x + .17, y + .05, 11 + bob, '#ffd04a');
}

/* ---------- props ---------- */
function drawPine(x, y, s) {
  s = s || 1;
  poly([P(x - .4 * s, y - .3 * s), P(x + .4 * s, y - .3 * s), P(x + .4 * s, y + .3 * s), P(x - .4 * s, y + .3 * s)], 'rgba(40,30,80,.16)', null, 0);
  prism(x - .06, y - .06, 0, x + .06, y + .06, 9 * s, '#9a6a46');
  cone(x, y, .46 * s, 6 * s, 32 * s, '#2fae68', 7);
  cone(x, y, .37 * s, 20 * s, 46 * s, '#3cc57a', 7);
  cone(x, y, .27 * s, 34 * s, 62 * s, '#58da8f', 7);
}
function drawTree(x, y, s) {
  s = s || 1;
  poly([P(x - .45 * s, y - .35 * s), P(x + .45 * s, y - .35 * s), P(x + .45 * s, y + .35 * s), P(x - .45 * s, y + .35 * s)], 'rgba(40,30,80,.16)', null, 0);
  prism(x - .07, y - .07, 0, x + .07, y + .07, 12 * s, '#a77450');
  cone(x, y, .56 * s, 10 * s, 34 * s, '#43bb6b', 6);
  cone(x, y, .4 * s, 26 * s, 50 * s, '#6bdb8c', 6);
}
function drawBush(x, y) { cone(x, y, .32, 0, 12, '#4dc476', 6); }
function drawHouse(d) {
  var x0 = d.x, x1 = d.x + d.w, y0 = d.y, y1 = d.y + d.d, h = d.h, ym = (y0 + y1) / 2, zr = h + d.h * .55;
  prism(x0, y0, 0, x1, y1, h, d.c);
  poly([P(x0 - .08, y1 + .08, h), P(x1 + .08, y1 + .08, h), P(x1 + .08, ym, zr), P(x0 - .08, ym, zr)], shade(d.r, FT));
  poly([P(x1, y1, h), P(x1, y0, h), P(x1, ym, zr)], shade(d.c, FR));
  poly([P(x1 + .08, y1 + .08, h), P(x1 + .08, ym, zr), P(x1 + .08, y0 - .08, h)], shade(d.r, FR));
  winL(x0 + .15, x1 - .15, y1, h * .3, h * .85, 2, 1, '#9ad4ff');
  poly([P(x0 + d.w * .42, y1, h * .6), P(x0 + d.w * .58, y1, h * .6), P(x0 + d.w * .58, y1, 0), P(x0 + d.w * .42, y1, 0)], '#7a5a9a', null, 0);
}
function drawTower(d) {
  var x0 = d.x, x1 = d.x + d.w, y0 = d.y, y1 = d.y + d.d, h = d.h;
  prism(x0, y0, 0, x1, y1, h, d.c);
  winL(x0 + .1, x1 - .1, y1, 8, h - 8, Math.max(2, Math.round(d.w * 1.6)), Math.round(h / 22), '#cfeaff');
  winR(x1, y0 + .1, y1 - .1, 8, h - 8, Math.max(2, Math.round(d.d * 1.6)), Math.round(h / 22), '#cfeaff');
  prism(x0 + .15, y0 + .15, h, x1 - .15, y1 - .15, h + 7, shade(d.c, 1.06));
}

function drawPalm(x, y, s) {
  s = s || 1;
  poly([P(x - .4 * s, y - .3 * s), P(x + .4 * s, y - .3 * s), P(x + .4 * s, y + .3 * s), P(x - .4 * s, y + .3 * s)], 'rgba(40,30,80,.14)', null, 0);
  var i, lean = .03 * s, top;
  for (i = 0; i < 6; i++) prism(x - .06 + lean * i, y - .06 - lean * i * .5, i * 8 * s, x + .06 + lean * i, y + .06 - lean * i * .5, (i + 1) * 8 * s + .5, i % 2 ? '#b78a5a' : '#a77a4c');
  top = P(x + lean * 6, y - lean * 3, 48 * s);
  var sway = REDUCE ? 0 : Math.sin(S.t * 1.3 + x) * .06;
  for (i = 0; i < 6; i++) {
    var th = i / 6 * Math.PI * 2 + .3 + sway, ex = Math.cos(th) * 30 * s, ey = Math.sin(th) * 13 * s + 9 * s;
    ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.quadraticCurveTo(top.x + ex * .5 - ey * .3, top.y + ey * .2 - 10 * s, top.x + ex, top.y + ey);
    ctx.quadraticCurveTo(top.x + ex * .5 + ey * .3, top.y + ey * .5, top.x, top.y + 2);
    ctx.fillStyle = shade(i % 2 ? '#3cc57a' : '#2fae68', Math.sin(th) > 0 ? .9 : 1.05); ctx.fill();
  }
  circle(top.x - 3, top.y + 3, 2.6 * s, '#7a4a2b'); circle(top.x + 2, top.y + 4, 2.6 * s, '#8b5a33');
}
function drawSnowPine(x, y, s) {
  s = s || 1;
  poly([P(x - .4 * s, y - .3 * s), P(x + .4 * s, y - .3 * s), P(x + .4 * s, y + .3 * s), P(x - .4 * s, y + .3 * s)], 'rgba(40,50,110,.14)', null, 0);
  prism(x - .06, y - .06, 0, x + .06, y + .06, 9 * s, '#8a6a56');
  cone(x, y, .46 * s, 6 * s, 32 * s, '#2f8f6a', 7);
  cone(x, y, .37 * s, 20 * s, 46 * s, '#e9f3ff', 7);
  cone(x, y, .27 * s, 34 * s, 62 * s, '#ffffff', 7);
}
function drawCactus(x, y, s) {
  s = s || 1;
  poly([P(x - .3, y - .2), P(x + .3, y - .2), P(x + .3, y + .2), P(x - .3, y + .2)], 'rgba(90,50,30,.14)', null, 0);
  prism(x - .09, y - .09, 0, x + .09, y + .09, 34 * s, '#4fb36a');
  prism(x - .32, y - .06, 14 * s, x - .09, y + .06, 19 * s, '#45a35f'); prism(x - .32, y - .06, 14 * s, x - .22, y + .06, 27 * s, '#4fb36a');
  prism(x + .09, y - .06, 20 * s, x + .3, y + .06, 25 * s, '#45a35f'); prism(x + .2, y - .06, 20 * s, x + .3, y + .06, 31 * s, '#4fb36a');
  var f = P(x, y, 36 * s); circle(f.x, f.y, 3, '#ff9ccf');
}
function drawRock(x, y, s, c) { cone(x, y, .38 * (s || 1), 0, 14 * (s || 1), c || '#b9b1c9', 5); }
function drawUmbrella(x, y, c) {
  poly([P(x - .55, y - .4), P(x + .55, y - .4), P(x + .55, y + .4), P(x - .55, y + .4)], 'rgba(40,30,80,.12)', null, 0);
  prism(x - .03, y - .03, 0, x + .03, y + .03, 26, '#f4f1ea');
  cone(x, y, .62, 22, 32, c, 8);
  prism(x + .15, y + .1, 0, x + .65, y + .35, 3, '#fff6dc');
}
function drawContainers(d) {
  var i;
  for (i = 0; i < d.n; i++) prism(d.x, d.y, i * 14, d.x + 1.6, d.y + .7, i * 14 + 13.5, d.cs[i % d.cs.length]);
}
function drawNeonTower(d) {
  drawTower(d);
  var x1 = d.x + d.w, y1 = d.y + d.d, k;
  for (k = 1; k < 4; k++) line(P(d.x, y1, d.h * k / 4), P(x1, y1, d.h * k / 4), 2, d.n);
  for (k = 1; k < 4; k++) line(P(x1, d.y, d.h * k / 4), P(x1, y1, d.h * k / 4), 2, d.n);
}
