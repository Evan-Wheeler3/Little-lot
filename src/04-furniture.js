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

