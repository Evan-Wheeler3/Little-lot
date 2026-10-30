/* ---------- garage furniture ---------- */
var AWN = ['#ff7a6b', '#5db8ff', '#ffd04a', '#5fd6a4', '#b79bff', '#ff9ccf'];
function drawShops(fl) {
  var n = COLS(), x0 = 2, x1 = 2 + n, h = fl === 0 ? 40 : 34, i, c;
  var lit = {};
  S.walkers.forEach(function (w) { if (w.fl === fl && w.state === 'inside') lit[w.door] = true; });
  prism(x0, .1, 0, x1, .86, h, '#fff0d4');
  prism(x0 - .06, .06, h, x1 + .06, .9, h + 5, '#ff8a7a');
  for (i = 0; i < n; i++) {
    c = 2 + i;
    poly([P(c + .3, .86, 0), P(c + .7, .86, 0), P(c + .7, .86, 18), P(c + .3, .86, 18)], lit[c] ? '#ffe28a' : '#6e5a9e', null, 0);
    poly([P(c + .06, .86, 27), P(c + .5, .86, 27), P(c + .5, 1.07, 20), P(c + .06, 1.07, 20)], shade(AWN[i % 6], FT));
    poly([P(c + .5, .86, 27), P(c + .94, .86, 27), P(c + .94, 1.07, 20), P(c + .5, 1.07, 20)], shade('#ffffff', .96));
    poly([P(c + .06, 1.07, 20), P(c + .5, 1.07, 20), P(c + .5, 1.07, 18), P(c + .06, 1.07, 18)], shade(AWN[i % 6], .8));
  }
  if (fl === 0) faceText('MARKET', P((x0 + x1) / 2, .86, h - 6), 'L', 10, '#ff8a7a');
  if (S.lvl.shop >= 10) for (i = 0; i < n; i += 2) {   // sale flags along the roof
    c = 2 + i + .5;
    prism(c - .02, .45, h + 5, c + .02, .49, h + 22, '#6b6590');
    poly([P(c + .02, .47, h + 22), P(c + .42, .47, h + 18), P(c + .02, .47, h + 14)], i % 4 ? '#5fd6a4' : '#ffd04a', null, 0);
  }
  if (S.lvl.shop >= 25) { prism(x0 + 1.2, .2, h + 5, x0 + 2.8, .4, h + 20, '#ff7a6b'); faceText('SALE', P(x0 + 2, .4, h + 12.5), 'L', 9, '#fff'); }
}
function drawPlanter(x, y) {
  prism(x - .18, y - .14, 0, x + .18, y + .14, 6, '#c98a5a');
  cone(x - .07, y, .12, 6, 14, '#4dc476', 5); cone(x + .08, y + .02, .11, 6, 12, '#5fd6a4', 5);
  var f = P(x, y, 14); circle(f.x - 3, f.y, 2, '#ff9ccf'); circle(f.x + 3, f.y + 1, 2, '#ffd04a');
}
// EV charger at the back of a bay; a cable and a pulse when a car is plugged in
function drawCharger(s) {
  var bx = s.x + .16, by = s.row === 'N' ? 1.1 : 3.9;
  prism(bx - .06, by - .05, 0, bx + .06, by + .05, 15, '#e9edf7');
  prism(bx - .07, by - .06, 15, bx + .07, by + .06, 18, '#2fae7c');
  var p = P(bx, by + (s.row === 'N' ? .05 : -.05), 10);
  ctx.fillStyle = '#ffd04a'; ctx.beginPath(); ctx.moveTo(p.x + 1, p.y - 4); ctx.lineTo(p.x - 2, p.y + .5); ctx.lineTo(p.x, p.y + .5); ctx.lineTo(p.x - 1, p.y + 4); ctx.lineTo(p.x + 2, p.y - .5); ctx.lineTo(p.x, p.y - .5); ctx.closePath(); ctx.fill();
  if (s.car && s.car.state === 'parked') {
    var cp = P(s.car.x, s.car.y, 8), on = REDUCE ? 1 : .6 + .4 * Math.sin(S.t * 5 + s.x);
    ctx.globalAlpha = on; line(p, cp, 1.6, '#2fae7c'); ctx.globalAlpha = 1;
  }
}
// billboard by the road once advertising gets going
function drawBillboard() {
  var x = -1.3, y = 4.9;
  poly([P(x - .9, y - .2), P(x + .9, y - .2), P(x + .9, y + .3), P(x - .9, y + .3)], 'rgba(40,30,80,.14)', null, 0);
  prism(x - .6, y - .04, 0, x - .52, y + .04, 30, '#6b6590'); prism(x + .52, y - .04, 0, x + .6, y + .04, 30, '#6b6590');
  prism(x - .85, y - .07, 30, x + .85, y + .07, 64, '#fffaf0');
  poly([P(x - .78, y + .071, 60), P(x + .78, y + .071, 60), P(x + .78, y + .071, 34), P(x - .78, y + .071, 34)], S.lvl.ads >= 25 ? '#ff7a6b' : '#3d8bff', null, 0);
  faceText('PARK', P(x - .25, y + .072, 50), 'L', 9, '#ffffff'); faceText('& SHOP', P(x + .2, y + .072, 41), 'L', 7, '#ffd04a');
}
function drawValet() {
  var x = -2.05, y = 3.85;
  prism(x - .14, y - .12, 0, x + .14, y + .12, 13, '#3d8bff'); prism(x - .17, y - .15, 13, x + .17, y + .15, 15, '#ffd04a');
  drawWalker({ x: x + .3, y: y + .05, moving: false, id: 7, color: '#3b2f5c', hair: '#2a2438' });
}
/* ---------- the car wash, south of the road past the lot ---------- */
function washBusy() { return S.cars.some(function (c) { return c.inWash; }); }
function drawWashGround() {
  poly([P(WIN - .45, 3.65), P(WIN + .45, 3.65), P(WIN + .45, WY + .45), P(WIN - .45, WY + .45)], '#6c7898');
  poly([P(WIN - .45, WY - .45), P(WOUT + .45, WY - .45), P(WOUT + .45, WY + .45), P(WIN - .45, WY + .45)], '#6c7898');
  poly([P(WOUT - .45, 3.65), P(WOUT + .45, 3.65), P(WOUT + .45, WY + .45), P(WOUT - .45, WY + .45)], '#6c7898');
  poly([P(WX0 - .1, WY - .7), P(WX1 + .1, WY - .7), P(WX1 + .1, WY + .7), P(WX0 - .1, WY + .7)], '#c9d1e4');
}
function drawWash() {
  var y0 = WY - .5, y1 = WY + .5, h = 26, busy = washBusy(), i;
  prism(WX0, y0, 0, WX1, y0 + .12, h, '#7fd6f0');
  prism(WX0, y1 - .12, 0, WX1, y1, h, '#7fd6f0');
  // see-through window strip with spinning brushes
  poly([P(WX0 + .15, y1, h - 6), P(WX1 - .15, y1, h - 6), P(WX1 - .15, y1, 6), P(WX0 + .15, y1, 6)], '#2c2749', null, 0);
  for (i = 0; i < 4; i++) {
    var bx = WX0 + .35 + i * .37, ph = (busy && !REDUCE ? S.t * 9 : 0) + i;
    poly([P(bx - .1, y1 + .01, 7), P(bx + .1, y1 + .01, 7), P(bx + .1, y1 + .01, h - 7), P(bx - .1, y1 + .01, h - 7)], i % 2 ? '#5db8ff' : '#ff7a6b', null, 0);
    for (var k = 0; k < 3; k++) { var zz = 9 + ((ph * 3 + k * 5) % 14); line(P(bx - .1, y1 + .012, zz), P(bx + .1, y1 + .012, zz), 1.5, 'rgba(255,255,255,.6)', 'butt'); }
  }
  prism(WX0 - .06, y0 - .06, h, WX1 + .06, y1 + .06, h + 5, '#5db8ff');
  prism(WX0 + .5, WY - .15, h + 5, WX1 - .5, WY + .15, h + 20, '#ffffff');
  faceText('WASH', P((WX0 + WX1) / 2, WY + .15, h + 12.5), 'L', 9, '#3d8bff');
  poly([P(WX1 + .001, y0 + .12, 0), P(WX1 + .001, y1 - .12, 0), P(WX1 + .001, y1 - .12, 20), P(WX1 + .001, y0 + .12, 20)], '#2c2749', null, 0);
  if (busy && !REDUCE && Math.random() < .3) S.fx.push({ kind: 'bub', x: WX0 + Math.random() * (WX1 - WX0), y: WY + .3, z: 10 + Math.random() * 12, t: 0, vx: (Math.random() - .5) * 8 });
}
function drawBooth() {
  var open = freeCount() > 0;
  prism(-3.95, 3.2, 0, -2.95, 4.05, 30, '#fff0c4');
  poly([P(-3.8, 4.05, 24), P(-3.1, 4.05, 24), P(-3.1, 4.05, 12), P(-3.8, 4.05, 12)], '#9ad4ff', null, 0);
  frustum(-3.45, 3.62, 1.4, 1.3, 1.0, .9, 30, 40, 0, 0, shade('#ff7a6b', FT), shade('#ff7a6b', FL), shade('#ff7a6b', FR));
  cone(-3.45, 3.62, .12, 40, 52, open ? '#58e08a' : '#ff5d5d', 6);
}
function drawGate() {
  prism(-3.55, 2.84, 0, -3.35, 3.02, 14, '#ff7a6b');
  var th = S.gate * 1.25, L = 0.9;
  var a = P(-3.45, 2.93, 13), b = P(-3.45, 2.93 - L * Math.cos(th), 13 + 40 * Math.sin(th));
  line(a, b, 8, '#b8453b', 'butt');
  for (var i = 0; i < 6; i++) {
    var u0 = i / 6, u1 = (i + 1) / 6;
    line({ x: a.x + (b.x - a.x) * u0, y: a.y + (b.y - a.y) * u0 }, { x: a.x + (b.x - a.x) * u1, y: a.y + (b.y - a.y) * u1 }, 5.4, i % 2 ? '#ff6b5e' : '#ffffff', 'butt');
  }
  circle(a.x, a.y, 3.6, '#ffd04a');
}
function drawPoleSign(x, y, h, w, txt) {
  poly([P(x - .45, y - .3), P(x + .45, y - .3), P(x + .45, y + .3), P(x - .45, y + .3)], 'rgba(40,30,80,.16)', null, 0);
  prism(x - .05, y - .05, 0, x + .05, y + .05, h, '#6b6590');
  prism(x - w, y - .07, h, x + w, y + .07, h + w * 62, '#3d8bff');
  faceText(txt, P(x, y + .07, h + w * 31), 'L', w * 52, '#ffffff');
}
function drawEntranceSign() {
  var n = freeCount(), x = -2.6, y = 1.15;
  poly([P(x - .7, y - .3), P(x + .7, y - .3), P(x + .7, y + .3), P(x - .7, y + .3)], 'rgba(40,30,80,.16)', null, 0);
  prism(x - .55, y - .05, 0, x - .47, y + .05, 40, '#6b6590'); prism(x + .47, y - .05, 0, x + .55, y + .05, 40, '#6b6590');
  prism(x - .7, y - .08, 40, x + .7, y + .08, 72, n ? '#2fae7c' : '#e0584f');
  faceText(n ? 'FREE' : 'LOT', P(x, y + .08, 65), 'L', 9, '#e9fff4');
  faceText(n ? String(n) : 'FULL', P(x, y + .08, 50), 'L', n > 99 ? 15 : 19, '#ffffff');
}
function drawLamp(s) {
  var by = s.row === 'N' ? 1.08 : 3.92;
  prism(s.x + .47, by - .03, 0, s.x + .53, by + .03, 30, '#7a7aa0');
  cone(s.x + .5, by, .12, 30, 40, s.car ? '#ff5d5d' : '#58e08a', 5);
}
function freeCount() { return activeSpots().filter(function (s) { return !s.car; }).length + garFree(); }

