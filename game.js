(function () {
'use strict';
var cv = document.getElementById('scene'), ctx = cv.getContext('2d');
var LW = 720, LH = 440, HW = 40, HH = 20, OX = 300, OY = 110, X0 = -2, X1 = 10, FH = 96;
var INK = '#3b2f5c';
var CAR_COLORS = ['#ff7a6b', '#5fd6a4', '#5db8ff', '#b79bff', '#ff9ccf', '#ff9f5a', '#7fe0e0'];
var REDUCE = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
var SAVE_KEY = 'littlelot.v1';
var ZOFF = 0;

var S = {
  money: 25, totalRun: 0, lifetime: 0, stars: 0, franchises: 0, floors: 0,
  lvl: { space: 0, fee: 0, ads: 0, gate: 0, sign: 0, walk: 0, express: 0, valet: 0, shop: 0 },
  t: 0, id: 0, spawnT: 0.5, vipT: 40, gate: 0, camF: 0,
  cars: [], walkers: [], spots: [], particles: [], earn: [], pad: 0, padTarget: 0, w: 400, h: 600, viewW: 720,
  tab: 'build', qty: 1, confirmFr: false,
  clouds: [{ x: 70, y: 120, s: 1, v: 6 }, { x: 330, y: 88, s: 0.8, v: 4 }, { x: 560, y: 150, s: 1.15, v: 5 }, { x: 760, y: 100, s: 0.9, v: 5 }]
};
var MAXL = { space: 2, fee: 80, ads: 40, gate: 10, sign: 3, walk: 10, express: 10, valet: 5, shop: 60 };

/* ---------- numbers ---------- */
var SUF = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 1000) return String(Math.floor(n + 1e-9));
  var e = Math.floor(Math.log10(n) / 3);
  if (e >= SUF.length) return n.toExponential(2).replace('e+', 'e');
  var v = n / Math.pow(1000, e), d = v < 10 ? 2 : v < 100 ? 1 : 0, s = v.toFixed(d);
  if (parseFloat(s) >= 1000 && e + 1 < SUF.length) { e++; v = n / Math.pow(1000, e); s = v.toFixed(2); }
  return s + SUF[e];
}
function fmtSmall(n) { return n < 10 ? (Math.round(n * 100) / 100).toString() : fmt(n); }
function fmtRate(r) { return r < 10 ? r.toFixed(1) : fmt(r); }
function fmtTime(s) {
  s = Math.round(s);
  if (s < 90) return s + ' sec';
  if (s < 5400) return Math.round(s / 60) + ' min';
  return (s / 3600).toFixed(1) + ' hours';
}

/* ---------- economy ---------- */
function COLS() { return 4 + S.lvl.space; }
function mult() { return 1 + 0.35 * S.stars; }
function fee() { return 2 * Math.pow(1.28, S.lvl.fee) * (S.lvl.sign >= 3 ? 1.2 : 1) * mult(); }
// every visit: park, step out, walk to the shops, shop, walk back with a bag, step in, drive off
function speedMul() { return 1 + 0.12 * S.lvl.gate + 0.06 * S.lvl.sign + 0.08 * S.lvl.valet; }
function walkSpeed() { return 0.8 * (1 + 0.2 * S.lvl.walk); }
function doorTime() { return 0.8 / (1 + 0.5 * S.lvl.valet); }
function errandTime() { return (3 + Math.random() * 4) / (1 + 0.06 * S.lvl.express); }
function tipRate() { return 0.12 * S.lvl.shop; }
function gapBase() { return Math.max(0.25, 2.4 * Math.pow(0.94, S.lvl.ads)); }
function dwellAvg() { return 2 * doorTime() + 4.8 / walkSpeed() + 5 / (1 + 0.06 * S.lvl.express); }
function maxFloors() { return 2 + S.franchises; }
function ensureFloorSpots(fl) {
  if (S.spots.some(function (s) { return s.fl === fl; })) return;
  for (var x = 2; x <= 7; x++) {
    S.spots.push({ fl: fl, x: x, y: 1, row: 'N', car: null });
    S.spots.push({ fl: fl, x: x, y: 3, row: 'S', car: null });
  }
}
function unlocked(s) { return s.x < 2 + COLS() && s.fl <= S.floors; }
function activeSpots() { return S.spots.filter(unlocked); }
function totalSpots() { return activeSpots().length; }
function econRate() {
  var sp = totalSpots(), cap = sp / (dwellAvg() + 3), demand = 1 / gapBase();
  return Math.min(demand, cap * 0.85) * fee() * (1 + tipRate());
}
function starsTotal() { return Math.floor(Math.sqrt(S.lifetime / 10000)); }
function starsGain() { return Math.max(0, starsTotal() - S.stars); }

/* ---------- save and load ---------- */
// Each account has its own save slot. Guests use littlelot.v1; signed-in players use littlelot.v1.<account id>.
var GUEST_KEY = 'littlelot.v1', saveKey = GUEST_KEY;
function snapshot() {
  return {
    v: 1, money: S.money, totalRun: S.totalRun, lifetime: S.lifetime, stars: S.stars, fr: S.franchises,
    floors: S.floors, lvl: S.lvl, time: Date.now()
  };
}
function readSave(key) {
  try { var j = JSON.parse(localStorage.getItem(key) || 'null'); return j && j.v === 1 ? j : null; } catch (e) { return null; }
}
function save() {
  try { localStorage.setItem(saveKey, JSON.stringify(snapshot())); } catch (e) { /* storage can be unavailable; the game still runs */ }
  if (window.LLAuth && window.LLAuth.dirty) window.LLAuth.dirty();
}
// put a save (or a brand new lot when j is null) into the running game
function applySave(j) {
  var k, f;
  S.money = 25; S.totalRun = 0; S.lifetime = 0; S.stars = 0; S.franchises = 0; S.floors = 0;
  for (k in S.lvl) S.lvl[k] = 0;
  if (j) {
    S.money = Math.max(0, +j.money || 0); S.totalRun = +j.totalRun || 0; S.lifetime = +j.lifetime || 0;
    S.stars = Math.max(0, Math.floor(+j.stars || 0)); S.franchises = Math.max(0, Math.floor(+j.fr || 0));
    S.floors = Math.min(Math.max(0, Math.floor(+j.floors || 0)), maxFloors());
    for (k in S.lvl) S.lvl[k] = Math.min(MAXL[k], Math.max(0, Math.floor(+(j.lvl && j.lvl[k]) || 0)));
  }
  S.spots = [];
  for (f = 0; f <= S.floors; f++) ensureFloorSpots(f);
  S.camF = S.floors; clearCars(); seedParked();
}

/* ---------- low-poly toolkit: flat-shaded facets, no outlines ---------- */
if (!ctx.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
  };
}
var FT = 1.14, FL = .95, FR = .74;   // light from the top-left: top brightest, +y face mid, +x face darkest
function P(x, y, z) { return { x: OX + (x - y) * HW, y: OY + (x + y) * HH - (z || 0) - ZOFF }; }
function shade(hex, f) {
  var r, g, b, m;
  if (hex.charAt(0) === 'r') { m = hex.match(/\d+/g); r = +m[0]; g = +m[1]; b = +m[2]; }
  else { var n = parseInt(hex.slice(1), 16); r = n >> 16; g = (n >> 8) & 255; b = n & 255; }
  if (f < 1) { r *= f; g *= f; b *= f; } else { r += (255 - r) * (f - 1); g += (255 - g) * (f - 1); b += (255 - b) * (f - 1); }
  return 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';
}
function poly(pts, fill, edge, ew) {
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
  for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (ew !== 0) { ctx.lineWidth = ew || 1; ctx.strokeStyle = edge || fill; ctx.lineJoin = 'round'; ctx.stroke(); }
}
// box: draws the three faces the camera can see
function prism(x0, y0, z0, x1, y1, z1, c) {
  poly([P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), P(x0, y1, z0)], shade(c, FL));
  poly([P(x1, y1, z1), P(x1, y0, z1), P(x1, y0, z0), P(x1, y1, z0)], shade(c, FR));
  poly([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], shade(c, FT));
}
// tapered box: base rectangle at z0, smaller top rectangle at z1 (optionally shifted by tx,ty)
function frustum(cx, cy, w, d, w2, d2, z0, z1, tx, ty, cT, cL, cR) {
  var a0 = cx - w / 2, a1 = cx + w / 2, b0 = cy - d / 2, b1 = cy + d / 2;
  var t0 = cx + tx - w2 / 2, t1 = cx + tx + w2 / 2, u0 = cy + ty - d2 / 2, u1 = cy + ty + d2 / 2;
  poly([P(a0, b1, z0), P(a1, b1, z0), P(t1, u1, z1), P(t0, u1, z1)], cL);
  poly([P(a1, b1, z0), P(a1, b0, z0), P(t1, u0, z1), P(t1, u1, z1)], cR);
  poly([P(t0, u0, z1), P(t1, u0, z1), P(t1, u1, z1), P(t0, u1, z1)], cT);
}
// faceted cone / pyramid standing on the ground at (cx,cy)
function cone(cx, cy, r, z0, z1, col, n) {
  n = n || 6;
  var fs = [], i, a0, a1, m, apex = P(cx, cy, z1);
  for (i = 0; i < n; i++) { a0 = i / n * 6.2832 + .4; a1 = (i + 1) / n * 6.2832 + .4; m = (a0 + a1) / 2; fs.push({ a0: a0, a1: a1, m: m }); }
  fs.sort(function (p, q) { return (Math.cos(p.m) + Math.sin(p.m)) - (Math.cos(q.m) + Math.sin(q.m)); });
  fs.forEach(function (f) {
    var k = .86 + .13 * (Math.sin(f.m) - Math.cos(f.m));
    poly([P(cx + Math.cos(f.a0) * r, cy + Math.sin(f.a0) * r, z0), P(cx + Math.cos(f.a1) * r, cy + Math.sin(f.a1) * r, z0), apex], shade(col, k));
  });
}
function circle(x, y, r, fill, lw) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke(); }
}
function line(a, b, w, col, cap) {
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  ctx.lineWidth = w; ctx.strokeStyle = col; ctx.lineCap = cap || 'round'; ctx.stroke();
}
function label(txt, x, y, size, fill) {
  ctx.font = '700 ' + size + 'px Fredoka, "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 3.2; ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.strokeText(txt, x, y);
  ctx.fillStyle = fill; ctx.fillText(txt, x, y);
}
// text lying on a face: kind 'L' = the +y face, 'R' = the +x face
function faceText(txt, p, kind, size, fill) {
  ctx.save(); ctx.translate(p.x, p.y); ctx.transform(1, kind === 'L' ? .5 : -.5, 0, 1, 0, 0);
  ctx.font = '700 ' + size + 'px Fredoka, "Trebuchet MS", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = fill; ctx.fillText(txt, 0, 0); ctx.restore();
}
function star(cx, cy, r, fill) {
  ctx.beginPath();
  for (var i = 0; i < 10; i++) {
    var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r;
    ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
}
// windows on a +y face (L) or a +x face (R)
function winL(x0, x1, y, z0, z1, cols, rows, col) {
  var cw = (x1 - x0) / cols, rh = (z1 - z0) / rows, c, r;
  for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
    var a = x0 + c * cw + cw * .2, b = x0 + (c + 1) * cw - cw * .2, za = z0 + r * rh + rh * .22, zb = z0 + (r + 1) * rh - rh * .22;
    poly([P(a, y, zb), P(b, y, zb), P(b, y, za), P(a, y, za)], col, null, 0);
  }
}
function winR(x, y0, y1, z0, z1, cols, rows, col) {
  var cw = (y1 - y0) / cols, rh = (z1 - z0) / rows, c, r;
  for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
    var a = y0 + c * cw + cw * .2, b = y0 + (c + 1) * cw - cw * .2, za = z0 + r * rh + rh * .22, zb = z0 + (r + 1) * rh - rh * .22;
    poly([P(x, a, zb), P(x, b, zb), P(x, b, za), P(x, a, za)], shade(col, .8), null, 0);
  }
}

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
  var a = c.fl === 0 ? Math.max(0, Math.min(1, (c.x + 7) / .8, (15 - c.x) / .8)) : Math.max(0, Math.min(1, (c.x + 2.2) / .9, (10.6 - c.x) / .9));
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
  var n = freeCount(), x = -4.9, y = 1.15;
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
function freeCount() { return activeSpots().filter(function (s) { return !s.car; }).length; }

/* ---------- cars ---------- */
var moneyChanged = true;
function makeCar(spot, parked, vip) {
  var cx = spot.x + .5, cy = spot.y + .5;
  var c = {
    id: ++S.id, fl: spot.fl, vip: !!vip, spot: spot, hx: 0, hy: 0,
    color: vip ? '#ffd04a' : CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
    x: parked ? cx : (spot.fl === 0 ? -6 : -2.3), y: parked ? cy : 2.5, heading: parked ? (spot.row === 'N' ? 3 : 1) : 0,
    state: parked ? 'parked' : 'in', path: parked ? [] : [{ x: cx, y: 2.5 }, { x: cx, y: cy }],
    timer: 0, phase: 0, moving: false
  };
  spot.car = c; S.cars.push(c);
}
/* ---------- walkers: the reason people park ---------- */
// route from the car door, along the painted bay line (crossing the lane for the front row), to the shop door
function walkPath(spot) {
  var cx = spot.x + .5, xb = spot.x + 1, cy = spot.y + .5, p = [{ x: cx + .28, y: cy }, { x: xb, y: cy }];
  if (spot.row === 'S') { p.push({ x: xb, y: 3.05 }); p.push({ x: xb, y: 1.95 }); }
  p.push({ x: xb, y: .93 }); p.push({ x: cx, y: .93 }); p.push({ x: cx, y: .88 });
  return p;
}
function makeWalker(car, inside) {
  var path = walkPath(car.spot), w = {
    id: ++S.id, car: car, fl: car.fl, door: car.spot.x, row: car.spot.row, path: path, back: path.slice().reverse().slice(1),
    x: path[0].x, y: path[0].y, state: inside ? 'inside' : 'to', timer: inside ? 1 + Math.random() * 4 : 0, moving: false, bag: !!inside,
    color: SHIRT[Math.floor(Math.random() * SHIRT.length)], hair: HAIR[Math.floor(Math.random() * HAIR.length)]
  };
  if (!inside) w.path = path.slice(1);
  if (inside) { w.x = cx(path); w.y = .88; }
  S.walkers.push(w); return w;
  function cx(p) { return p[p.length - 1].x; }
}
function stepWalker(w, dt) {
  w.moving = false;
  if (w.state === 'inside') {
    w.timer -= dt;
    if (w.timer <= 0) {
      w.state = 'back'; w.bag = true; w.path = w.back.slice();
      var tip = fee() * tipRate();
      if (tip > 0) { addMoney(tip); S.particles.push({ x: w.x, y: .88, fl: w.fl, t: 0, txt: '+' + fmtSmall(tip) }); S.earn.push({ t: S.t, v: tip }); }
    }
    return;
  }
  var tg = w.path[0];
  if (!tg) {
    if (w.state === 'to') { w.state = 'inside'; w.timer = errandTime(); }
    else { w.done = true; if (w.car && w.car.spot) { w.car.phase = 2; w.car.timer = doorTime(); } }
    return;
  }
  var dx = tg.x - w.x, dy = tg.y - w.y, dist = Math.hypot(dx, dy), st = walkSpeed() * dt;
  w.moving = true;
  if (dist <= st) { w.x = tg.x; w.y = tg.y; w.path.shift(); } else { w.x += dx / dist * st; w.y += dy / dist * st; }
}
function walkerInLane(fl, x0, x1) {
  for (var i = 0; i < S.walkers.length; i++) {
    var w = S.walkers[i];
    if (w.fl !== fl || w.state === 'inside') continue;
    if (Math.abs(w.y - 2.5) < .75 && w.x >= x0 && w.x <= x1) return true;
  }
  return false;
}
// people take the lowest floor that still has a free space
function spawn(vip) {
  for (var f = 0; f <= S.floors; f++) {
    var free = S.spots.filter(function (s) { return s.fl === f && unlocked(s) && !s.car; });
    if (!free.length) continue;
    var busy = S.cars.some(function (c) { return c.fl === f && c.x < (f === 0 ? -3.4 : 0.3) && Math.abs(c.y - 2.5) < .6; });
    if (busy) { S.spawnT = Math.min(S.spawnT, 0.3); return false; }
    // drivers like the bays near the shops and near the gate
    var wts = free.map(function (s) { return (s.row === 'N' ? 3 : 1) * (1 + (7 - s.x) * .15); });
    var tot = wts.reduce(function (a, b) { return a + b; }, 0), r = Math.random() * tot, pick = 0;
    for (var q = 0; q < wts.length; q++) { r -= wts[q]; if (r <= 0) { pick = q; break; } }
    makeCar(free[pick], false, vip);
    return true;
  }
  return false;
}
function blockedAhead(c) {
  if (c.heading !== 0) return false;
  for (var i = 0; i < S.cars.length; i++) {
    var o = S.cars[i];
    if (o === c || o.fl !== c.fl || o.state === 'parked' || o.state === 'wantout') continue;
    if (Math.abs(o.y - c.y) < .65 && o.x > c.x && o.x - c.x < 1.7) return true;
  }
  return walkerInLane(c.fl, c.x - .1, c.x + 1.1);
}
function roadClearFor(c) {
  for (var i = 0; i < S.cars.length; i++) {
    var o = S.cars[i];
    if (o === c || o.fl !== c.fl || (o.state !== 'in' && o.state !== 'out')) continue;
    // someone still reversing out of a bay claims the lane around their column straight away
    if (o.state === 'out' && o.path[0] && o.path[0].rev) { if (Math.abs(o.x - c.x) < 1.9) return false; continue; }
    if (Math.abs(o.y - 2.5) < .9 && o.x > c.x - 2.0 && o.x < c.x + 1.7) return false;
  }
  return !walkerInLane(c.fl, c.x - 1.1, c.x + 1.1);
}
function addMoney(a) { S.money += a; S.totalRun += a; S.lifetime += a; moneyChanged = true; }
function payCar(c) {
  var a = fee() * (c.vip ? 3 : 1);
  addMoney(a);
  S.particles.push({ x: c.x, y: c.y, fl: c.fl, t: 0, txt: '+' + fmtSmall(a) });
  S.earn.push({ t: S.t, v: a });
}
function stepCar(c, dt) {
  c.moving = false;
  if (c.state === 'parked') {
    if (c.phase === 0) { c.timer -= dt; if (c.timer <= 0) { makeWalker(c, false); c.phase = 1; } }       // step out
    else if (c.phase === 2) { c.timer -= dt; if (c.timer <= 0) { payCar(c); c.state = 'wantout'; } }      // step back in, then pay
    return;
  }
  if (c.state === 'wantout') {
    if (roadClearFor(c)) { c.state = 'out'; c.path = [{ x: c.x, y: 2.5, rev: true }, { x: c.fl === 0 ? 14.5 : 10.7, y: 2.5 }]; }
    return;
  }
  var tg = c.path[0];
  if (!tg) { if (c.state === 'in') { c.state = 'parked'; c.phase = 0; c.timer = doorTime(); } return; }
  var dx = tg.x - c.x, dy = tg.y - c.y, dist = Math.hypot(dx, dy), roadLeg = Math.abs(dx) > Math.abs(dy);
  if (!tg.rev) c.heading = roadLeg ? (dx > 0 ? 0 : 2) : (dy > 0 ? 1 : 3);
  if (roadLeg && blockedAhead(c)) return;
  var st = (roadLeg ? 2.1 : 1.2) * speedMul() * dt;
  c.moving = true;
  if (dist <= st) {
    c.x = tg.x; c.y = tg.y; c.path.shift();
    if (c.state === 'out' && c.path.length === 1 && c.spot) { c.spot.car = null; c.spot = null; }
  } else { c.x += dx / dist * st; c.y += dy / dist * st; }
}
// keep the number of cars sensible after loading a save or after a reset
function seedParked() {
  var spots = activeSpots(), n = Math.min(spots.length, Math.max(2, Math.round(spots.length * 0.4)));
  spots.sort(function () { return Math.random() - .5; });
  for (var i = 0; i < n; i++) if (!spots[i].car) {
    makeCar(spots[i], true, false);
    var car = spots[i].car;
    if (Math.random() < .55) { car.phase = 1; makeWalker(car, true); }      // someone is mid-shop
    else { car.phase = 2; car.timer = 1 + Math.random() * 3; }              // someone is walking back to the car
  }
}
function clearCars() { S.cars = []; S.walkers = []; S.spots.forEach(function (s) { s.car = null; }); }

/* ---------- frame ---------- */
function update(dt) {
  S.t += dt;
  S.spawnT -= dt;
  if (S.spawnT <= 0) { spawn(false); if (S.spawnT <= 0) S.spawnT = gapBase() * (.75 + Math.random() * .5); }
  S.vipT -= dt;
  if (S.vipT <= 0) { S.vipT = spawn(true) ? 55 + Math.random() * 60 : 6; }
  S.walkers.forEach(function (w) { stepWalker(w, dt); });
  S.walkers = S.walkers.filter(function (w) { return !w.done; });
  S.cars.forEach(function (c) { stepCar(c, dt); });
  S.cars = S.cars.filter(function (c) { return !(c.state === 'out' && c.x >= (c.fl === 0 ? 14.4 : 10.6)); });
  var open = S.cars.some(function (c) { return c.fl === 0 && c.state === 'in' && c.heading === 0 && c.x > -4.7 && c.x < -2.4; });
  S.gate += ((open ? 1 : 0) - S.gate) * Math.min(1, dt * 7);
  S.particles.forEach(function (p) { p.t += dt; });
  S.particles = S.particles.filter(function (p) { return p.t < 1.2; });
  S.pad += (S.padTarget - S.pad) * Math.min(1, dt * 8);
  S.camF += (S.floors - S.camF) * Math.min(1, dt * 3);
}


/* ---------- the world: one big ground that fills the screen ---------- */
var DECOR = (function () {
  var seed = 11, out = [], x, y;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  var PASTEL = ['#ffd9b8', '#cfe8ff', '#ffe8a8', '#e0d4ff', '#ffc9d6', '#c9f2d9'], ROOF = ['#ff7a6b', '#5d7bd8', '#e0a63a', '#8b6bd0', '#d8566e'];
  var TOW = ['#7fb5ff', '#ffb27a', '#b79bff', '#ff9ccf', '#6fd6c4', '#ffd04a'];
  for (x = -22; x <= 30; x += 3.4) for (y = -22; y <= 30; y += 3.4) {
    var px = x + (rnd() - .5) * 1.8, py = y + (rnd() - .5) * 1.8;
    if (px > -9 && px < 14.5 && py > -2.8 && py < 7.8) continue;   // keep the garage area clear
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
  out.push({ t: 'tree', x: -6.4, y: 0.6, s: 1.1 }, { t: 'pine', x: -4.6, y: 0.2, s: 1 }, { t: 'tree', x: -6.8, y: 5.6, s: 1.1 }, { t: 'pine', x: 11.6, y: 0.4, s: 1.1 }, { t: 'tree', x: 11.8, y: 5.6, s: 1.1 });
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
  // apron around the garage
  poly([P(X0 - .5, -.5), P(X1 + .5, -.5), P(X1 + .5, 5.5), P(X0 - .5, 5.5)], '#c9d1e4');
}

/* ---------- the garage: solid concrete decks, pillars, open sides ---------- */
var SLAB = 14, FLCOL = ['#ff7a6b', '#ffd04a', '#5fd6a4', '#5db8ff', '#b79bff', '#ff9ccf'];
var PIL_F = [-1.7, 1.4, 4.4, 7.4, 9.7], PIL_R = [.3, 1.4, 3.6];
function drawMarkings(fl) {
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
    if (s.fl !== fl || !unlocked(s) || s.car) return;
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
function drawSlab(f) {
  var band = FLCOL[(f - 1) % 6];
  prism(X0, 0, -SLAB, X1, 5, 0, '#d6dcea');
  poly([P(X0, 5, -2), P(X1, 5, -2), P(X1, 5, -SLAB + 2), P(X0, 5, -SLAB + 2)], shade(band, FL));
  poly([P(X1, 5, -2), P(X1, 0, -2), P(X1, 0, -SLAB + 2), P(X1, 5, -SLAB + 2)], shade(band, FR));
  faceText('LEVEL ' + (f + 1), P(X0 + 2.2, 5, -7), 'L', 9, '#ffffff');
}
function wallsBack() {
  var c = '#e4e9f5';
  prism(X0, 0, 0, X1, .12, 7, c);
  prism(X0, .12, 0, X0 + .12, 2, 7, c); prism(X0, 3, 0, X0 + .12, 5, 7, c);
}
function wallsFront() {
  var c = '#e4e9f5';
  prism(X0, 4.88, 0, X1, 5, 7, c);
  prism(X1 - .12, .12, 0, X1, 2, 7, c); prism(X1 - .12, 3, 0, X1, 4.88, 7, c);
}
function drawPillar(px, py) { prism(px - .11, py - .11, 0, px + .11, py + .11, FH - SLAB, '#e9edf7'); }

var T = { ox: 0, oy: 0, k: 1, dpr: 1 };
function draw() {
  var dpr = cv.width / S.w, F = S.camF, VX = -56, VW = 790, VY = 8 - F * FH, VH = 412 + F * FH;
  var topPad = 84, botPad = 100 + S.pad, availH = Math.max(120, S.h - topPad - botPad);
  var sc = Math.min(S.w / VW, availH / VH), k = sc * dpr;
  T.k = k; T.dpr = dpr;
  T.ox = ((S.w - VW * sc) / 2 - VX * sc) * dpr; T.oy = (topPad + (availH - VH * sc) / 2 - VY * sc) * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  var g = ctx.createLinearGradient(0, 0, 0, cv.height); g.addColorStop(0, '#a9e585'); g.addColorStop(1, '#8bd566');
  ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(k, 0, 0, k, T.ox, T.oy);
  V.x0 = -T.ox / k; V.x1 = (cv.width - T.ox) / k; V.y0 = -T.oy / k; V.y1 = (cv.height - T.oy) / k;
  drawGround();

  var f, back = [], front = [], i;
  DECOR.forEach(function (d) { if (onScreen(d.x, d.y)) (isFront(d) ? front : back).push({ d: d.x + d.y, f: function () { drawDecor(d); } }); });
  front.push({ d: -3, f: drawBooth }, { d: -2.9, f: drawGate }, { d: -1.5, f: drawEntranceSign });
  var byDepth = function (a, b) { return a.d - b.d; };
  back.sort(byDepth); back.forEach(function (o) { o.f(); });

  for (f = 0; f <= S.floors; f++) {
    ZOFF = f * FH;
    if (f > 0) drawSlab(f);
    drawMarkings(f);
    if (f > 0) wallsBack();
    var objs = [], top = f === S.floors;
    objs.push({ d: -5, f: function () { drawShops(f); } });
    if (!top) {
      PIL_F.forEach(function (px) { objs.push({ d: px + 4.85, f: function () { drawPillar(px, 4.85); } }); });
      PIL_R.forEach(function (py) { objs.push({ d: 9.7 + py, f: function () { drawPillar(9.7, py); } }); });
    } else if (f > 0) objs.push({ d: .1, f: function () { drawPoleSign(-1.2, .7, 46, .45, 'P'); } });
    if (S.lvl.sign >= 1) S.spots.forEach(function (s) { if (s.fl === f && unlocked(s)) objs.push({ d: s.x + .5 + (s.row === 'N' ? 1.08 : 3.92), f: function () { drawLamp(s); } }); });
    S.cars.forEach(function (c) { if (c.fl === f) objs.push({ d: c.x + c.y, f: function () { drawCar(c); } }); });
    S.walkers.forEach(function (w) { if (w.fl === f && w.state !== 'inside') objs.push({ d: w.x + w.y + .05, f: function () { drawWalker(w); } }); });
    objs.sort(byDepth); objs.forEach(function (o) { o.f(); });
    if (f > 0) wallsFront();
    if (!top) {   // shade under the deck above, seen through the open sides
      poly([P(X0, 5, 0), P(X1, 5, 0), P(X1, 5, FH - SLAB), P(X0, 5, FH - SLAB)], 'rgba(36,26,70,.17)', null, 0);
      poly([P(X1, 5, 0), P(X1, 0, 0), P(X1, 0, FH - SLAB), P(X1, 5, FH - SLAB)], 'rgba(36,26,70,.26)', null, 0);
    }
  }
  ZOFF = 0;
  front.sort(byDepth); front.forEach(function (o) { o.f(); });
  S.particles.forEach(function (p) {
    ZOFF = p.fl * FH;
    var q = P(p.x, p.y, 34 + p.t * 30);
    ctx.globalAlpha = Math.min(1, (1.2 - p.t) * 2.2);
    circle(q.x - 17, q.y, 8.5, '#ffd04a', 2.4); label('$', q.x - 17, q.y + .5, 11, '#3b2f5c');
    label(p.txt, q.x + 6, q.y, 16, '#fff');
    ctx.globalAlpha = 1;
  });
  ZOFF = 0;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  var h1 = ctx.createLinearGradient(0, 0, 0, 190 * dpr); h1.addColorStop(0, 'rgba(166,228,132,.78)'); h1.addColorStop(1, 'rgba(166,228,132,0)');
  ctx.fillStyle = h1; ctx.fillRect(0, 0, cv.width, 190 * dpr);
  var h2 = ctx.createLinearGradient(0, cv.height - 170 * dpr, 0, cv.height); h2.addColorStop(0, 'rgba(139,213,102,0)'); h2.addColorStop(1, 'rgba(139,213,102,.8)');
  ctx.fillStyle = h2; ctx.fillRect(0, cv.height - 170 * dpr, cv.width, 170 * dpr);
}

/* ---------- upgrades ---------- */
var ICON = {
  space: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><path d="M16.5 14v6M13.5 17h6"/></svg>',
  floor: '<svg viewBox="0 0 24 24"><path d="M4 9l8-4 8 4-8 4zM4 13l8 4 8-4M4 17l8 4 8-4"/></svg>',
  fee: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M14.5 9.2c-.6-.8-1.5-1.1-2.5-1.1-1.4 0-2.4.7-2.4 1.8 0 2.6 5 1.4 5 4 0 1.1-1 1.9-2.6 1.9-1.1 0-2-.4-2.7-1.2M12 6.5v1.6M12 15.8v1.7"/></svg>',
  gate: '<svg viewBox="0 0 24 24"><path d="M5 19V9M5 11h14M9 11v-2M13 11v-2M17 11v-2"/></svg>',
  sign: '<svg viewBox="0 0 24 24"><path d="M12 20V11"/><circle cx="12" cy="7.5" r="3.5"/><path d="M8 20h8"/></svg>',
  ads: '<svg viewBox="0 0 24 24"><path d="M4 10v4h3l6 4V6L7 10zM16.5 9a4 4 0 010 6M18.5 6.5a7.5 7.5 0 010 11"/></svg>',
  walk: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5.5" r="2.3"/><path d="M12 8.5v5l-3 6M12 13.5l3.5 5.5M9 11l3-2.5 3 2.5"/></svg>',
  express: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="7.5"/><path d="M12 8.5V13l3 2M9.5 3.5h5"/></svg>',
  valet: '<svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="3.6"/><path d="M11.6 12H20M17 12v3M20 12v2.5"/></svg>',
  shop: '<svg viewBox="0 0 24 24"><path d="M5 9h14l-1 10H6zM9 9V7a3 3 0 016 0v2"/></svg>'
};
var ITEMS = {
  space: { tab: 'build', name: 'More spaces', tint: '#bde6ff', icon: 'space', multi: false,
    lvl: function () { return S.lvl.space; }, max: function () { return MAXL.space; },
    cost: function (l) { return [60, 200][l] * (1 + S.floors); },
    now: function () { return COLS() * 2 + ' spaces per floor'; }, next: function () { return 'Opens 2 more on every floor'; },
    apply: function () { S.lvl.space++; } },
  floor: { tab: 'build', name: 'Build a floor', tint: '#e3d9ff', icon: 'floor', multi: false,
    lvl: function () { return S.floors; }, max: function () { return maxFloors(); },
    cost: function (l) { return 400 * Math.pow(3.5, l); },
    now: function () { return (S.floors + 1) + (S.floors ? ' floors' : ' floor') + ', ' + totalSpots() + ' spaces'; },
    next: function () { return S.floors >= maxFloors() ? 'Franchise to build higher' : 'Adds ' + COLS() * 2 + ' spaces on top'; },
    apply: function () { S.floors++; ensureFloorSpots(S.floors); } },
  gate: { tab: 'speed', name: 'Wider lanes', tint: '#ffc7bd', icon: 'gate', multi: true,
    lvl: function () { return S.lvl.gate; }, max: function () { return MAXL.gate; },
    cost: function (l) { return 40 * Math.pow(1.9, l); },
    now: function () { return 'Cars drive at ' + Math.round(speedMul() * 100) + '%'; }, next: function () { return 'Cars drive 12% faster'; },
    apply: function () { S.lvl.gate++; } },
  walk: { tab: 'speed', name: 'Sidewalks', tint: '#d6f0c8', icon: 'walk', multi: true,
    lvl: function () { return S.lvl.walk; }, max: function () { return MAXL.walk; },
    cost: function (l) { return 25 * Math.pow(1.75, l); },
    now: function () { return 'Shoppers walk at ' + Math.round(walkSpeed() / 0.8 * 100) + '%'; }, next: function () { return 'Walking 20% faster'; },
    apply: function () { S.lvl.walk++; } },
  express: { tab: 'speed', name: 'Express shopping', tint: '#ffe6b8', icon: 'express', multi: true,
    lvl: function () { return S.lvl.express; }, max: function () { return MAXL.express; },
    cost: function (l) { return 45 * Math.pow(1.8, l); },
    now: function () { return 'Visits last about ' + (5 / (1 + 0.06 * S.lvl.express)).toFixed(1) + 's'; }, next: function () { return 'Shorter shop visits'; },
    apply: function () { S.lvl.express++; } },
  valet: { tab: 'speed', name: 'Valet', tint: '#d9e4ff', icon: 'valet', multi: true,
    lvl: function () { return S.lvl.valet; }, max: function () { return MAXL.valet; },
    cost: function (l) { return 120 * Math.pow(2.3, l); },
    now: function () { return 'Doors and parking ' + Math.round((1 + 0.5 * S.lvl.valet) * 100) + '%'; }, next: function () { return 'Quicker doors, quicker parking'; },
    apply: function () { S.lvl.valet++; } },
  shop: { tab: 'biz', name: 'Shop deals', tint: '#ffd9c7', icon: 'shop', multi: true,
    lvl: function () { return S.lvl.shop; }, max: function () { return MAXL.shop; },
    cost: function (l) { return 50 * Math.pow(1.55, l); },
    now: function () { return S.lvl.shop ? 'Shops pay $' + fmtSmall(fee() * tipRate()) + ' a visit' : 'Shops pay nothing yet'; },
    next: function () { return 'Shops pay you 12% of the fee per visit'; },
    apply: function () { S.lvl.shop++; } },
  sign: { tab: 'build', name: 'Guidance', tint: '#c9f2d9', icon: 'sign', multi: false,
    lvl: function () { return S.lvl.sign; }, max: function () { return MAXL.sign; },
    cost: function (l) { return [20, 90, 500][l]; },
    now: function () { return ['No signs yet', 'Bay lights on', 'Lights and entrance sign', 'Card payments on'][S.lvl.sign]; },
    next: function () { return ['Lights show free bays', 'Sign counts free bays', '+20% fee, pay by card'][S.lvl.sign]; },
    apply: function () { S.lvl.sign++; } },
  fee: { tab: 'biz', name: 'Parking fee', tint: '#ffe38a', icon: 'fee', multi: true,
    lvl: function () { return S.lvl.fee; }, max: function () { return MAXL.fee; },
    cost: function (l) { return 15 * Math.pow(1.55, l); },
    now: function () { return '$' + fmtSmall(fee()) + ' per car'; }, next: function () { return 'Fee x1.28'; },
    apply: function () { S.lvl.fee++; } },
  ads: { tab: 'biz', name: 'Advertising', tint: '#ffd1ec', icon: 'ads', multi: true,
    lvl: function () { return S.lvl.ads; }, max: function () { return MAXL.ads; },
    cost: function (l) { return 30 * Math.pow(1.5, l); },
    now: function () { return 'A car every ' + gapBase().toFixed(2) + 's'; }, next: function () { return 'About 6% more cars'; },
    apply: function () { S.lvl.ads++; } }
};
var TABS = { build: ['space', 'floor', 'sign'], speed: ['gate', 'walk', 'express', 'valet'], biz: ['fee', 'ads', 'shop'] };
var TABNOTE = {
  build: 'More room for cars. Drivers fill the lowest floor first.',
  speed: 'Every visit: park, step out, walk to the shops, shop, walk back, leave. Speed up any step to free the bay sooner.',
  biz: 'Earn more from each visit and bring more cars in.'
};
function plan(k, mode) {
  var it = ITEMS[k], l = it.lvl(), mx = it.max(), n = 0, cost = 0, c;
  if (l >= mx) return { n: 0, cost: 0, ok: false, maxed: true };
  if (it.multi && mode === 'max') {
    while (l + n < mx) { c = it.cost(l + n); if (cost + c > S.money) break; cost += c; n++; }
    if (n === 0) return { n: 1, cost: it.cost(l), ok: false };
    return { n: n, cost: cost, ok: true };
  }
  var want = it.multi ? +mode : 1;
  while (l + n < mx && n < want) { cost += it.cost(l + n); n++; }
  return { n: n, cost: cost, ok: cost <= S.money };
}

var tray = document.getElementById('tray'), tabsEl = document.getElementById('tabs'), qtyEl = document.getElementById('qty');
var sheet = document.getElementById('sheet'), scrim = document.getElementById('scrim');
var openBtn = document.getElementById('openBtn'), closeBtn = document.getElementById('closeBtn');

function btnHtml(k) {
  var p = plan(k, S.qty);
  if (p.maxed) return k === 'floor' ? 'Max height' : 'Maxed';
  return '<span class="c">$</span>' + fmt(p.cost) + (p.n > 1 ? ' <small>x' + p.n + '</small>' : '');
}
function cardHtml(k) {
  var it = ITEMS[k], l = it.lvl(), mx = it.max(), pips = '';
  if (mx <= 12) { for (var i = 0; i < mx; i++) pips += '<span class="pip' + (i < l ? ' on' : '') + '"></span>'; }
  else pips = '<span class="lbl2">Level ' + l + '</span>';
  var maxed = l >= mx;
  return '<article class="card" id="card-' + k + '"><h3><span class="ico" style="background:' + it.tint + '">' + ICON[it.icon] + '</span>' + it.name + '</h3>' +
    '<p class="now">' + it.now() + '</p><div class="pips" aria-hidden="true">' + pips + '</div>' +
    '<p>' + (maxed && k !== 'floor' ? 'Fully upgraded' : it.next()) + '</p>' +
    '<button class="buy" type="button" data-up="' + k + '" id="buy-' + k + '">' + btnHtml(k) + '</button></article>';
}
function frHtml() {
  var gain = starsGain();
  var base = Math.pow(starsTotal(), 2) * 10000, nxt = Math.pow(starsTotal() + 1, 2) * 10000;
  var pct = Math.max(0, Math.min(100, (S.lifetime - base) / (nxt - base) * 100));
  var h = '<div class="fr"><h3><span style="color:#f0a300;-webkit-text-stroke:1.5px var(--ink)">&#9733;</span> Franchise</h3>' +
    '<p>Sell this lot and open a new one from scratch. Each star adds 35% to all income forever, and every franchise lets you build one more floor.</p>' +
    '<div class="row"><div class="stat"><small>Stars</small>' + S.stars + '</div>' +
    '<div class="stat"><small>Income bonus</small>+' + Math.round((mult() - 1) * 100) + '%</div>' +
    '<div class="stat"><small>Earned this lot</small>$<span id="fr-run">' + fmt(S.totalRun) + '</span></div>' +
    '<div class="stat"><small>Stars if you sell now</small><span id="fr-gain">+' + gain + '</span></div></div>' +
    '<div class="meter" role="img" aria-label="Progress to the next star"><i id="fr-bar" style="width:' + pct + '%"></i></div>' +
    '<p id="fr-note">Next star after $' + fmt(nxt) + ' earned in total (lifetime $' + fmt(S.lifetime) + ').</p>';
  if (!S.confirmFr) h += '<button class="buy" type="button" id="fr-go"' + (gain < 1 ? ' disabled' : '') + '>' + (gain < 1 ? 'Earn more to franchise' : 'Franchise now (+' + gain + ' stars)') + '</button>';
  else h += '<p>This resets your money, floors and upgrades. Stars stay.</p><div class="btns"><button class="buy danger" type="button" id="fr-yes">Yes, start over</button><button class="buy ghost" type="button" id="fr-no">Keep playing</button></div>';
  return h + '</div>';
}
function buildTray() {
  var h = '';
  if (S.tab === 'fr') h = frHtml();
  else { h += '<p class="tabnote">' + TABNOTE[S.tab] + '</p>'; TABS[S.tab].forEach(function (k) { h += cardHtml(k); }); }
  tray.innerHTML = h;
  qtyEl.hidden = S.tab === 'fr';
  [].forEach.call(tabsEl.querySelectorAll('[data-tab]'), function (b) { b.setAttribute('aria-selected', b.getAttribute('data-tab') === S.tab ? 'true' : 'false'); });
  [].forEach.call(qtyEl.querySelectorAll('[data-qty]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-qty')) === String(S.qty) ? 'true' : 'false'); });
  refreshTray();
  if (sheet.classList.contains('open')) S.padTarget = Math.max(0, sheet.offsetHeight - 80);
}
function refreshTray() {
  var ready = 0;
  Object.keys(ITEMS).forEach(function (k) {
    var p1 = plan(k, 1); if (p1.ok) ready++;
    var b = document.getElementById('buy-' + k); if (!b) return;
    var p = plan(k, S.qty);
    b.disabled = !!p.maxed || !p.ok;
    var html = btnHtml(k); if (b.innerHTML !== html) b.innerHTML = html;
  });
  var frReady = starsGain() > 0;
  [].forEach.call(tabsEl.querySelectorAll('[data-tab]'), function (tb) {
    var t = tb.getAttribute('data-tab'), d = tb.querySelector('.dot'); if (!d) return;
    d.hidden = t === 'fr' ? !frReady : !TABS[t].some(function (k) { return plan(k, 1).ok; });
  });
  var n = ready + (frReady ? 1 : 0), bd = document.getElementById('badge');
  bd.hidden = !n; bd.textContent = n;
  openBtn.classList.toggle('ready', n > 0);
  var go = document.getElementById('fr-go');
  if (go) { go.disabled = starsGain() < 1; }
}
function updateFr() {
  var a = document.getElementById('fr-run'); if (!a) return;
  a.textContent = fmt(S.totalRun);
  document.getElementById('fr-gain').textContent = '+' + starsGain();
  var base = Math.pow(starsTotal(), 2) * 10000, nxt = Math.pow(starsTotal() + 1, 2) * 10000;
  document.getElementById('fr-bar').style.width = Math.max(0, Math.min(100, (S.lifetime - base) / (nxt - base) * 100)) + '%';
  document.getElementById('fr-note').textContent = 'Next star after $' + fmt(nxt) + ' earned in total (lifetime $' + fmt(S.lifetime) + ').';
  var go = document.getElementById('fr-go');
  if (go) { var g = starsGain(); go.textContent = g < 1 ? 'Earn more to franchise' : 'Franchise now (+' + g + ' stars)'; }
}
function doFranchise() {
  var g = starsGain(); if (g < 1) return;
  S.stars += g; S.franchises++; S.money = 25; S.totalRun = 0; S.floors = 0;
  Object.keys(S.lvl).forEach(function (k) { S.lvl[k] = 0; });
  S.spots = []; ensureFloorSpots(0); clearCars(); seedParked(); S.confirmFr = false; S.tab = 'build';
  S.spawnT = 0.5; moneyChanged = true; buildTray(); save();
}

tray.addEventListener('click', function (e) {
  var id = e.target.closest('button') && e.target.closest('button').id;
  if (id === 'fr-go') { S.confirmFr = true; buildTray(); return; }
  if (id === 'fr-no') { S.confirmFr = false; buildTray(); return; }
  if (id === 'fr-yes') { doFranchise(); return; }
  var b = e.target.closest('[data-up]'); if (!b) return;
  var k = b.getAttribute('data-up'), p = plan(k, S.qty);
  if (p.maxed || !p.ok) return;
  S.money -= p.cost; for (var i = 0; i < p.n; i++) ITEMS[k].apply();
  moneyChanged = true; buildTray(); save();
  var card = document.getElementById('card-' + k); if (card && !REDUCE) card.classList.add('pop');
});
tabsEl.addEventListener('click', function (e) {
  var b = e.target.closest('[data-tab]'); if (!b) return;
  S.tab = b.getAttribute('data-tab'); S.confirmFr = false; buildTray();
});
qtyEl.addEventListener('click', function (e) {
  var b = e.target.closest('[data-qty]'); if (!b) return;
  S.qty = b.getAttribute('data-qty') === 'max' ? 'max' : +b.getAttribute('data-qty'); buildTray();
});

/* ---------- sheet ---------- */
function setSheet(o) {
  sheet.classList.toggle('open', o); scrim.classList.toggle('on', o);
  sheet.setAttribute('aria-hidden', o ? 'false' : 'true');
  if ('inert' in sheet) sheet.inert = !o;
  openBtn.setAttribute('aria-expanded', o ? 'true' : 'false');
  S.padTarget = o ? Math.max(0, sheet.offsetHeight - 80) : 0;
  if (o) closeBtn.focus({ preventScroll: true }); else openBtn.focus({ preventScroll: true });
}
openBtn.addEventListener('click', function () { setSheet(!sheet.classList.contains('open')); });
closeBtn.addEventListener('click', function () { setSheet(false); });
scrim.addEventListener('click', function () { setSheet(false); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && sheet.classList.contains('open')) setSheet(false); });
if ('inert' in sheet) sheet.inert = true;

/* ---------- HUD ---------- */
var elMoney = document.getElementById('money'), elParked = document.getElementById('parked'), pill = document.getElementById('moneyPill');
var elWallet = document.getElementById('wallet'), elRate = document.getElementById('rate');
var elStars = document.getElementById('stars'), starPill = document.getElementById('starPill');
var lastMoney = -1, lastParked = '', lastRate = '', lastFr = 0;
function hud() {
  if (moneyChanged || S.money !== lastMoney) {
    moneyChanged = false;
    if (S.money > lastMoney && lastMoney >= 0 && !REDUCE) { pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump'); }
    lastMoney = S.money; var m = fmt(S.money); elMoney.textContent = m; elWallet.textContent = m; refreshTray();
  }
  S.earn = S.earn.filter(function (e) { return S.t - e.t < 12; });
  var sum = 0; S.earn.forEach(function (e) { sum += e.v; });
  var rt = '$' + fmtRate(sum / Math.max(4, Math.min(12, S.t))) + '/s';
  if (rt !== lastRate) { lastRate = rt; elRate.textContent = rt; }
  var n = S.cars.filter(function (c) { return c.state === 'parked' || c.state === 'wantout'; }).length;
  var txt = n + ' / ' + totalSpots();
  if (txt !== lastParked) { lastParked = txt; elParked.textContent = txt; }
  starPill.hidden = !(S.stars > 0); if (S.stars > 0) elStars.textContent = S.stars;
  if (S.tab === 'fr' && S.t - lastFr > 0.5) { lastFr = S.t; updateFr(); }
}

/* ---------- VIP car tap ---------- */
cv.addEventListener('pointerdown', function (e) {
  var r = cv.getBoundingClientRect();
  var lx = ((e.clientX - r.left) * T.dpr - T.ox) / T.k, ly = ((e.clientY - r.top) * T.dpr - T.oy) / T.k;
  for (var i = 0; i < S.cars.length; i++) {
    var c = S.cars[i];
    if (c.vip && Math.hypot(lx - c.hx, ly - c.hy) < 46) {
      var bonus = Math.max(fee() * 25, econRate() * 45);
      addMoney(bonus); c.vip = false;
      S.particles.push({ x: c.x, y: c.y, fl: c.fl, t: 0, txt: '+' + fmt(bonus) });
      save(); return;
    }
  }
});

/* ---------- away earnings ---------- */
var awayEarn = 0, welcome = document.getElementById('welcome');
function showAway(elapsed) {
  if (elapsed < 45) return;
  var e = econRate() * Math.min(elapsed, 8 * 3600) * 0.5;
  if (e < 1) return;
  awayEarn = e;
  document.getElementById('welAmt').textContent = fmt(e);
  document.getElementById('welText').textContent = 'You were away for ' + fmtTime(elapsed) + '. Your lot kept parking cars at half speed.';
  welcome.hidden = false; document.getElementById('welBtn').focus({ preventScroll: true });
}
document.getElementById('welBtn').addEventListener('click', function () {
  addMoney(awayEarn); awayEarn = 0; welcome.hidden = true; save();
});
var hiddenAt = 0;
document.addEventListener('visibilitychange', function () {
  if (document.hidden) { hiddenAt = Date.now(); save(); }
  else if (hiddenAt && welcome.hidden) { showAway((Date.now() - hiddenAt) / 1000); hiddenAt = 0; last = performance.now(); }
});
window.addEventListener('pagehide', save);
setInterval(save, 8000);

/* ---------- boot ---------- */
function fit() {
  var r = document.getElementById('stage').getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
  S.w = Math.max(1, r.width); S.h = Math.max(1, r.height);
  cv.width = Math.max(1, Math.round(S.w * dpr)); cv.height = Math.max(1, Math.round(S.h * dpr));
  if (sheet.classList.contains('open')) S.padTarget = Math.max(0, sheet.offsetHeight - 80);
}
window.addEventListener('resize', fit);
if (window.LLAuth && window.LLAuth.slotKey) saveKey = window.LLAuth.slotKey();
var saved = readSave(saveKey);
applySave(saved);
fit(); buildTray();
if (saved && saved.time) showAway((Date.now() - saved.time) / 1000);
var last = performance.now();
function loop(now) {
  var dt = Math.min(.05, (now - last) / 1000); last = now;
  update(dt); draw(); hud();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// what the account code needs from the game
window.LittleLot = {
  snapshot: snapshot,
  key: function () { return saveKey; },
  // switch to another save slot (another account) and load whatever is in it, or the data passed in
  load: function (key, data) {
    saveKey = key;
    var j = data || readSave(key);
    applySave(j);
    if (data) { try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { /* ignore */ } }
    S.confirmFr = false; moneyChanged = true; buildTray();
    return j;
  },
  away: function (j) { if (j && j.time) showAway((Date.now() - j.time) / 1000); },
  save: save
};
if (window.LLAuth && window.LLAuth.attach) window.LLAuth.attach(window.LittleLot);
})();
