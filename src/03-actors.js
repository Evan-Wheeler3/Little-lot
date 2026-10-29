/* ---------- cars and people ---------- */
function wheel(cx, cy, ex, r) {
  var i, pts = [], th;
  for (i = 0; i < 8; i++) { th = i * Math.PI / 4 + Math.PI / 8; pts.push({ x: cx + ex * .894 * Math.cos(th) * r, y: cy + .447 * Math.cos(th) * r - Math.sin(th) * r }); }
  poly(pts, '#2d2842');
  pts = pts.map(function (p) { return { x: cx + (p.x - cx) * .42, y: cy + (p.y - cy) * .42 }; });
  poly(pts, '#d7d1ea');
}
function lightQuad(face, a, fix, zb, col) {
  if (face === 'R') poly([P(fix, a - .05, zb + 5.5), P(fix, a + .05, zb + 5.5), P(fix, a + .05, zb + 2), P(fix, a - .05, zb + 2)], col, null, 0);
  else poly([P(a - .05, fix, zb + 5.5), P(a + .05, fix, zb + 5.5), P(a + .05, fix, zb + 2), P(a - .05, fix, zb + 2)], col, null, 0);
}
function drawCar(c) {
  var h = c.heading, ax = h === 0 || h === 2, L = .74, W = .46;
  var dx = ax ? L : W, dy = ax ? W : L;
  var x0 = c.x - dx / 2, x1 = c.x + dx / 2, y0 = c.y - dy / 2, y1 = c.y + dy / 2;
  var bob = (c.moving && !REDUCE) ? Math.sin(S.t * 16 + c.id) * .8 : 0, zb = 3 + bob;
  var a = Math.max(0, Math.min(1, (c.x - SPAWNX) / .8, (15 - c.x) / .8));
  if (c.g) a = Math.min(a, Math.max(0, Math.min(1, (c.y - GY1 + .05) / .9)));   // drive into / out of the garage doorway
  ctx.globalAlpha = a;
  poly([P(x0 - .05, y0 - .05), P(x1 + .05, y0 - .05), P(x1 + .05, y1 + .05), P(x0 - .05, y1 + .05)], 'rgba(40,30,80,.22)', null, 0);
  var col = c.color;
  frustum(c.x, c.y, dx, dy, dx * .95, dy * .92, zb, zb + 8, 0, 0, shade(col, FT), shade(col, FL), shade(col, FR));
  // wheels on the side the camera sees
  if (ax) { wheel(P(x0 + dx * .24, y1, zb + 1).x, P(x0 + dx * .24, y1, zb + 1).y, 1, 4.8); wheel(P(x1 - dx * .24, y1, zb + 1).x, P(x1 - dx * .24, y1, zb + 1).y, 1, 4.8); }
  else { wheel(P(x1, y0 + dy * .24, zb + 1).x, P(x1, y0 + dy * .24, zb + 1).y, -1, 4.8); wheel(P(x1, y1 - dy * .24, zb + 1).x, P(x1, y1 - dy * .24, zb + 1).y, -1, 4.8); }
  var ux = h === 0 ? 1 : h === 2 ? -1 : 0, uy = h === 1 ? 1 : h === 3 ? -1 : 0;
  var cw = ax ? .4 : .34, cd = ax ? .34 : .4, glass = '#9ad4ff';
  frustum(c.x - ux * .05, c.y - uy * .05, cw, cd, cw * .66, cd * .66, zb + 8, zb + 15, -ux * .04, -uy * .04, shade(col, 1.08), shade(glass, FL), shade(glass, FR));
  var lc = (h === 0 || h === 1) ? '#fff3a8' : '#ff5a5a';
  if (ax) { lightQuad('R', y0 + dy * .24, x1, zb, lc); lightQuad('R', y1 - dy * .24, x1, zb, lc); }
  else { lightQuad('L', x0 + dx * .24, y1, zb, lc); lightQuad('L', x1 - dx * .24, y1, zb, lc); }
  var hp = P(c.x, c.y, 18); c.hx = hp.x; c.hy = hp.y;
  if (c.vip) {
    var tp = P(c.x, c.y, 40 + (REDUCE ? 0 : Math.sin(S.t * 5) * 3)), pulse = REDUCE ? 1 : 1 + Math.sin(S.t * 7) * .12;
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

