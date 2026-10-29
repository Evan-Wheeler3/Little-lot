/* ---------- the world: one big ground that fills the screen ---------- */
var DECOR = (function () {
  var seed = 11, out = [], x, y;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  var PASTEL = ['#ffd9b8', '#cfe8ff', '#ffe8a8', '#e0d4ff', '#ffc9d6', '#c9f2d9'], ROOF = ['#ff7a6b', '#5d7bd8', '#e0a63a', '#8b6bd0', '#d8566e'];
  var TOW = ['#7fb5ff', '#ffb27a', '#b79bff', '#ff9ccf', '#6fd6c4', '#ffd04a'];
  for (x = -22; x <= 30; x += 3.4) for (y = -22; y <= 30; y += 3.4) {
    var px = x + (rnd() - .5) * 1.8, py = y + (rnd() - .5) * 1.8;
    if (px > -9 && px < 14.5 && py > -2.8 && py < 7.8) continue;   // keep the lot area clear
    if (px > -13 && px < -0.5 && py > -9 && py < 1.4) continue;     // the plot for the garage
    if (py > .9 && py < 4.1) continue;                              // keep the road clear
    if (px > 6 && px < 17 && py < 1) continue;                      // nothing tall right behind the garage
    if (rnd() < .5) continue;
    var r = rnd(), back = py < -2.6, d = { x: px, y: py };
    if (back && r < .38) { d.t = 'tower'; d.w = 1.4 + rnd() * 1.2; d.d = 1.3 + rnd() * 1; d.h = 70 + rnd() * 90; d.c = TOW[Math.floor(rnd() * 6)]; }
    else if (r < .55) { d.t = 'house'; d.w = 1.6; d.d = 1.3; d.h = 22 + rnd() * 8; d.c = PASTEL[Math.floor(rnd() * 6)]; d.r = ROOF[Math.floor(rnd() * 5)]; }
    else if (r < .78) { d.t = 'pine'; d.s = .8 + rnd() * .5; }
    else if (r < .92) { d.t = 'tree'; d.s = .8 + rnd() * .5; }
    else { d.t = 'bush'; }
    out.push(d);
  }
  // trees that frame the entrance
  out.push({ t: 'tree', x: -2.4, y: -1.2, s: 1.1 }, { t: 'pine', x: -1.4, y: -1.8, s: 1 }, { t: 'tree', x: -6.8, y: 5.6, s: 1.1 }, { t: 'pine', x: 11.6, y: 0.4, s: 1.1 }, { t: 'tree', x: 11.8, y: 5.6, s: 1.1 });
  return out;
})();
function isFront(d) { return d.y > 5.3 || (d.x > 10.3 && d.y > 1); }
function drawDecor(d) {
  if (d.t === 'pine') drawPine(d.x, d.y, d.s); else if (d.t === 'tree') drawTree(d.x, d.y, d.s);
  else if (d.t === 'bush') drawBush(d.x, d.y); else if (d.t === 'house') drawHouse(d); else drawTower(d);
}
var V = { x0: 0, x1: 0, y0: 0, y1: 0 };
function onScreen(x, y) { var p = P(x, y, 0); return p.x > V.x0 - 140 && p.x < V.x1 + 140 && p.y > V.y0 - 220 && p.y < V.y1 + 120; }

function drawGround() {
  ZOFF = 0;
  var cs = [{ u: V.x0, v: V.y0 }, { u: V.x1, v: V.y0 }, { u: V.x0, v: V.y1 }, { u: V.x1, v: V.y1 }], i, mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
  cs.forEach(function (c) {
    var u = (c.u - OX) / HW, v = (c.v - OY) / HH, x = (u + v) / 2, y = (v - u) / 2;
    mnx = Math.min(mnx, x); mxx = Math.max(mxx, x); mny = Math.min(mny, y); mxy = Math.max(mxy, y);
  });
  var gx0 = Math.floor((mnx - 3) / 2) * 2, gx1 = Math.ceil((mxx + 3) / 2) * 2, gy0 = Math.floor((mny - 3) / 2) * 2, gy1 = Math.ceil((mxy + 3) / 2) * 2, x, y;
  for (x = gx0; x < gx1; x += 2) for (y = gy0; y < gy1; y += 2) {
    var h = ((x * 7 + y * 13) % 5 + 5) % 5, col = ((x + y) / 2 & 1) ? '#93d86d' : '#9bde75';
    if (h === 0) col = '#a6e27f';
    poly([P(x, y), P(x + 2, y), P(x + 2, y + 2), P(x, y + 2)], col);
  }
  var R0 = gx0 - 4, R1 = gx1 + 4;
  // sidewalks, road and lane dashes
  poly([P(R0, 1.35), P(R1, 1.35), P(R1, 3.65), P(R0, 3.65)], '#d9d2c0');
  poly([P(R0, 1.7), P(R1, 1.7), P(R1, 3.3), P(R0, 3.3)], '#6c7898');
  poly([P(R0, 2), P(R1, 2), P(R1, 3), P(R0, 3)], '#64708f');
  for (x = Math.floor(R0 / 1.5) * 1.5; x < R1; x += 1.5) poly([P(x, 2.47), P(x + .7, 2.47), P(x + .7, 2.53), P(x, 2.53)], 'rgba(255,255,255,.55)', null, 0);
  // apron around the lot
  poly([P(X0 - .5, -.5), P(X1 + .5, -.5), P(X1 + .5, 5.5), P(X0 - .5, 5.5)], '#c9d1e4');
  if (S.deckAnim > .02) drawGarageGround();
}

