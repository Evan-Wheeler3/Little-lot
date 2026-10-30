(function () {
'use strict';
var cv = document.getElementById('scene'), ctx = cv.getContext('2d');
var LW = 720, LH = 440, HW = 40, HH = 20, OX = 300, OY = 110, X0 = -2, X1 = 10;
var INK = '#3b2f5c';
var CAR_COLORS = ['#ff7a6b', '#5fd6a4', '#5db8ff', '#b79bff', '#ff9ccf', '#ff9f5a', '#7fe0e0'];
var REDUCE = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
var SAVE_KEY = 'littlelot.v1';
var ZOFF = 0;
// The garage is its own building to the left of the market, clear of the main lot.
// Footprint x GX0..GX1, y GY0..GY1; cars turn in at GIN, come out at GOUT; shoppers use the side door at GPED.
var GX0 = -10.2, GX1 = -4.2, GY0 = -6.6, GY1 = -0.6, GIN = -6.7, GOUT = -5.7, GPED = -4.7;
var DH = 34, PERDECK = 9, SPAWNX = -12, GAR_PAY = 1.8, FEEG = 1.15;

var S = {
  money: 25, totalRun: 0, lifetime: 0, stars: 0, tok: 0, franchises: 0,
  lvl: { space: 0, garage: 0, fee: 0, ads: 0, gate: 0, sign: 0, walk: 0, express: 0, valet: 0, shop: 0 },
  perk: { gold: 0, head: 0, rush: 0 },
  goal: { cars: 0, cash: 0, fee: 0, deck: 0, vip: 0, rush: 0, star: 0 },
  served: 0, vips: 0, rushes: 0, bestFee: 0, bestDeck: 0,
  rush: 0, rushWait: 90, rushReady: 0,
  t: 0, id: 0, spawnT: 0.5, vipT: 40, gate: 0, deckAnim: 0, camTop: 8, camLeft: -56, camSet: false,
  cars: [], walkers: [], spots: [], particles: [], earn: [], pad: 0, padTarget: 0, w: 400, h: 600, viewW: 720,
  tab: 'build', qty: 1, confirmFr: false,
  clouds: [{ x: 70, y: 120, s: 1, v: 6 }, { x: 330, y: 88, s: 0.8, v: 4 }, { x: 560, y: 150, s: 1.15, v: 5 }, { x: 760, y: 100, s: 0.9, v: 5 }]
};
var GS = [];   // garage slots: { car, color }
// level ceilings. Parking fee and shop deals never run out; the speed lines are long but finite
// Only the main lot's bays (the lot is only so wide) and the three guidance steps have a ceiling; everything else goes on forever
var MAXL = { space: 2, garage: 99, fee: Infinity, ads: Infinity, gate: Infinity, sign: 3, walk: Infinity, express: Infinity, valet: Infinity, shop: Infinity };

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
// Milestones: every upgrade line with no ceiling pays a bonus at level 10, 25, 50, 75, 100 and every 25 levels after that
function msCount(l) { return l < 10 ? 0 : l < 25 ? 1 : 1 + Math.floor(l / 25); }
function msNext(l) { return l < 10 ? 10 : (Math.floor(l / 25) + 1) * 25; }
function goalCount() { var n = 0, k; for (k in S.goal) n += S.goal[k]; return n; }
function mult() { return (1 + 0.35 * S.stars) * Math.pow(1.15, S.perk.gold) * Math.pow(1.02, goalCount()); }
function rushFee() { return S.rush > 0 ? 1.5 : 1; }
function fee() { return 3 * Math.pow(FEEG, S.lvl.fee) * Math.pow(2, msCount(S.lvl.fee)) * (S.lvl.sign >= 3 ? 1.2 : 1) * mult() * rushFee(); }
// every visit: park, step out, walk to the shops, shop, walk back with a bag, step in, drive off
// speed lines have diminishing returns: each level helps, none ever stops helping
function speedMul() { return 1 + 4 * (1 - Math.pow(0.93, S.lvl.gate)) + 0.06 * S.lvl.sign + 0.5 * (1 - Math.pow(0.9, S.lvl.valet)); }
function walkSpeed() { return 0.8 * (1 + 5 * (1 - Math.pow(0.93, S.lvl.walk))); }
function doorTime() { return 0.8 / (1 + 0.5 * S.lvl.valet); }
// shop visits shrink towards half a second: curbside pickup
function visitAvg() { return 0.5 + 4.5 * Math.pow(0.93, S.lvl.express); }
function errandTime() { return 0.5 + (2.5 + Math.random() * 4) * Math.pow(0.93, S.lvl.express); }
function tipRate() { return 0.05 * S.lvl.shop * Math.pow(1.3, msCount(S.lvl.shop)); }
function demand() { return Math.min(14, 0.42 * Math.pow(1.06, S.lvl.ads) * Math.pow(1.5, msCount(S.lvl.ads))) * (S.rush > 0 ? 2.5 : 1); }
function gapBase() { return 1 / demand(); }
function dwellAvg() { return 2 * doorTime() + 4.8 / walkSpeed() + visitAvg(); }
function dwellGarage() { return dwellAvg() + 21 / walkSpeed(); }   // the garage is a longer walk from the market
// the garage can only go so high until you franchise: a nudge to start over, not a wall
function maxDecks() { return 4 + 3 * S.franchises; }
function garCap() { return S.lvl.garage * PERDECK; }
function ensureSpots() {
  if (S.spots.length) return;
  for (var x = 2; x <= 7; x++) { S.spots.push({ fl: 0, x: x, y: 1, row: 'N', car: null }); S.spots.push({ fl: 0, x: x, y: 3, row: 'S', car: null }); }
}
function ensureSlots() { while (GS.length < garCap()) GS.push({ car: null, color: null }); }
function garFree() { var n = 0, cap = garCap(), i; for (i = 0; i < cap; i++) if (GS[i] && !GS[i].car) n++; return n; }
function unlocked(s) { return s.x < 2 + COLS(); }
function activeSpots() { return S.spots.filter(unlocked); }
function totalSpots() { return activeSpots().length + garCap(); }
function parkedCount() {
  var n = S.cars.filter(function (c) { return c.state === 'parked' || c.state === 'wantout'; }).length;
  return n + (garCap() - garFree());
}
// what the lot earns each second if drivers keep coming (used for away earnings, rewards and balancing)
function econRate() {
  var D = demand() / (S.rush > 0 ? 2.5 : 1), nM = activeSpots().length, nG = garCap();
  var capM = nM / (dwellAvg() + 3) * 0.85, capG = nG ? nG / (dwellGarage() + 3) * 0.85 : 0;
  var fM = Math.min(D, capM), fG = Math.min(D - fM, capG);
  return (fM + fG * GAR_PAY) * (fee() / rushFee()) * (1 + tipRate());
}
var STAR_BASE = 40000;
function starsTotal() { return Math.floor(Math.cbrt(S.lifetime / STAR_BASE)); }
function starsGain() { return Math.max(0, starsTotal() - S.stars); }
function headStart() { return S.perk.head ? 200 * Math.pow(3, S.perk.head - 1) : 0; }

/* ---------- save and load ---------- */
// Each account has its own save slot. Guests use littlelot.v1; signed-in players use littlelot.v1.<account id>.
var GUEST_KEY = 'littlelot.v1', saveKey = GUEST_KEY;
function snapshot() {
  return {
    v: 1, money: S.money, totalRun: S.totalRun, lifetime: S.lifetime, stars: S.stars, fr: S.franchises, tok: S.tok,
    lvl: S.lvl, perk: S.perk, goal: S.goal, served: S.served, vips: S.vips, rushes: S.rushes, bestFee: S.bestFee, bestDeck: S.bestDeck,
    time: Date.now()
  };
}
function readSave(key) {
  try { var j = JSON.parse(localStorage.getItem(key) || 'null'); return j && j.v === 1 ? j : null; } catch (e) { return null; }
}
function save() {
  try { localStorage.setItem(saveKey, JSON.stringify(snapshot())); } catch (e) { /* storage can be unavailable; the game still runs */ }
  if (window.LLAuth && window.LLAuth.dirty) window.LLAuth.dirty();
}
function num(v, lo) { v = +v; return isFinite(v) ? Math.max(lo || 0, v) : (lo || 0); }
// put a save (or a brand new lot when j is null) into the running game
function applySave(j) {
  var k;
  S.money = 25; S.totalRun = 0; S.lifetime = 0; S.stars = 0; S.franchises = 0; S.tok = 0;
  S.served = 0; S.vips = 0; S.rushes = 0; S.bestFee = 0; S.bestDeck = 0;
  for (k in S.lvl) S.lvl[k] = 0;
  for (k in S.perk) S.perk[k] = 0;
  for (k in S.goal) S.goal[k] = 0;
  if (j) {
    S.money = num(j.money); S.totalRun = num(j.totalRun); S.lifetime = num(j.lifetime);
    S.stars = Math.floor(num(j.stars)); S.franchises = Math.floor(num(j.fr)); S.tok = Math.floor(num(j.tok));
    S.served = num(j.served); S.vips = num(j.vips); S.rushes = num(j.rushes);
    for (k in S.lvl) S.lvl[k] = Math.min(MAXL[k], Math.floor(num(j.lvl && j.lvl[k])));
    if (j.lvl && j.lvl.garage === undefined && j.floors) S.lvl.garage = Math.floor(num(j.floors));   // saves from the stacked-floor version
    S.lvl.garage = Math.min(S.lvl.garage, maxDecks());
    for (k in S.perk) S.perk[k] = Math.floor(num(j.perk && j.perk[k]));
    for (k in S.goal) S.goal[k] = Math.floor(num(j.goal && j.goal[k]));
    S.bestFee = Math.max(S.lvl.fee, num(j.bestFee)); S.bestDeck = Math.max(S.lvl.garage, num(j.bestDeck));
  }
  S.spots = []; ensureSpots(); GS = []; ensureSlots();
  S.deckAnim = S.lvl.garage; S.camSet = false; S.rush = 0; S.rushReady = 0; S.rushWait = 90;
  clearCars(); seedParked();
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

/* ---------- cars ---------- */
var moneyChanged = true;
function makeCar(spot, parked, vip) {
  var cx = spot.x + .5, cy = spot.y + .5;
  var c = {
    id: ++S.id, fl: 0, vip: !!vip, spot: spot, hx: 0, hy: 0,
    color: vip ? '#ffd04a' : CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
    x: parked ? cx : SPAWNX, y: parked ? cy : 2.5, heading: parked ? (spot.row === 'N' ? 3 : 1) : 0,
    state: parked ? 'parked' : 'in', path: parked ? [] : [{ x: cx, y: 2.5 }, { x: cx, y: cy }],
    timer: 0, phase: 0, moving: false
  };
  spot.car = c; S.cars.push(c); return c;
}
// a driver who heads for the garage: reserves a slot, turns in off the road and disappears inside
function makeGarCar(slot, parked) {
  var col = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
  var c = {
    id: ++S.id, fl: 0, g: true, gi: slot, vip: false, spot: null, hx: 0, hy: 0, color: col, door: 2 + Math.floor(Math.random() * COLS()),
    x: parked ? GOUT : SPAWNX, y: parked ? GY1 : 2.5, heading: 0, state: parked ? 'ghide' : 'gin',
    path: parked ? [] : [{ x: GIN, y: 2.5 }, { x: GIN, y: GY1 }], timer: 0, phase: 0, moving: false
  };
  GS[slot].car = c; GS[slot].color = col; S.cars.push(c); return c;
}
/* ---------- walkers: the reason people park ---------- */
// main lot: from the car door, along the painted bay line (crossing the lane for the front row), to the shop door
function walkPath(spot) {
  var cx = spot.x + .5, xb = spot.x + 1, cy = spot.y + .5, p = [{ x: cx + .28, y: cy }, { x: xb, y: cy }];
  if (spot.row === 'S') { p.push({ x: xb, y: 3.05 }); p.push({ x: xb, y: 1.95 }); }
  p.push({ x: xb, y: .93 }); p.push({ x: cx, y: .93 }); p.push({ x: cx, y: .88 });
  return p;
}
// garage: out of the side door, down the path to the market walkway, along it to a shop door
function gWalkPath(door) {
  var dx = door + .5;
  return [{ x: GPED, y: GY1 + .12 }, { x: GPED, y: .97 }, { x: dx, y: .97 }, { x: dx, y: .93 }, { x: dx, y: .88 }];
}
function makeWalker(car, inside) {
  var g = !!car.g, door = g ? car.door : car.spot.x, path = g ? gWalkPath(door) : walkPath(car.spot), w = {
    id: ++S.id, car: car, fl: 0, g: g, door: door, row: g ? 'N' : car.spot.row, path: path, back: path.slice().reverse().slice(1),
    x: path[0].x, y: path[0].y, state: inside ? 'inside' : 'to', timer: inside ? 1 + Math.random() * 4 : 0, moving: false, bag: !!inside,
    color: SHIRT[Math.floor(Math.random() * SHIRT.length)], hair: HAIR[Math.floor(Math.random() * HAIR.length)]
  };
  if (!inside) w.path = path.slice(1);
  if (inside) { w.x = path[path.length - 1].x; w.y = .88; }
  S.walkers.push(w); return w;
}
function stepWalker(w, dt) {
  w.moving = false;
  if (w.state === 'inside') {
    w.timer -= dt;
    if (w.timer <= 0) {
      w.state = 'back'; w.bag = true; w.path = w.back.slice();
      var tip = fee() * tipRate() * (w.g ? GAR_PAY : 1);
      if (tip > 0) { addMoney(tip); S.particles.push({ x: w.x, y: .88, fl: 0, t: 0, txt: '+' + fmtSmall(tip) }); S.earn.push({ t: S.t, v: tip }); }
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
function walkerInLane(x0, x1) {
  for (var i = 0; i < S.walkers.length; i++) {
    var w = S.walkers[i];
    if (w.state === 'inside') continue;
    if (Math.abs(w.y - 2.5) < .75 && w.x >= x0 && w.x <= x1) return true;
  }
  return false;
}
var lastBackup = -99;
var HIDDEN = { parked: 1, wantout: 1, ghide: 1, gwait: 1 };
// drivers fill the main lot first and spill into the garage when it is busy (some like the covered bays anyway)
function spawn(vip) {
  var free = S.spots.filter(function (s) { return unlocked(s) && !s.car; }), gf = vip ? 0 : garFree();
  var queued = S.cars.filter(function (c) { return c.state === 'wait'; }).length;
  if ((!free.length && !gf) || queued) {   // everything is full: the driver joins the queue on the street
    if (vip || queued >= 5 || S.cars.some(function (c) { return !HIDDEN[c.state] && c.x < SPAWNX + 2.3 && Math.abs(c.y - 2.5) < .6; })) return false;
    var q = { id: ++S.id, fl: 0, vip: false, spot: null, hx: 0, hy: 0, color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)], x: SPAWNX, y: 2.5, heading: 0, state: 'wait', path: [{ x: -3.9, y: 2.5 }], timer: 28, phase: 0, moving: false };
    S.cars.push(q);
    if (S.t - lastBackup > 45) { lastBackup = S.t; note('Lot full! Cars are backing up. Build more space, or speed up shop visits.'); }
    return true;
  }
  var busy = S.cars.some(function (c) { return !HIDDEN[c.state] && c.x < SPAWNX + 2.3 && Math.abs(c.y - 2.5) < .6; });
  if (busy) { S.spawnT = Math.min(S.spawnT, 0.3); return false; }
  var toG = false;
  if (gf) toG = !free.length || Math.random() < (free.length / activeSpots().length < .3 ? .7 : .25);
  if (toG) {
    var open = [], i;
    for (i = 0; i < garCap(); i++) if (!GS[i].car) open.push(i);
    makeGarCar(open[Math.floor(Math.random() * open.length)], false);
    return true;
  }
  // drivers like the bays near the shops and near the gate
  var wts = free.map(function (s) { return (s.row === 'N' ? 3 : 1) * (1 + (7 - s.x) * .15); });
  var tot = wts.reduce(function (a, b) { return a + b; }, 0), r = Math.random() * tot, pick = 0;
  for (var q = 0; q < wts.length; q++) { r -= wts[q]; if (r <= 0) { pick = q; break; } }
  makeCar(free[pick], false, vip);
  return true;
}
function blockedAhead(c) {
  if (c.heading !== 0) return false;
  for (var i = 0; i < S.cars.length; i++) {
    var o = S.cars[i];
    if (o === c || HIDDEN[o.state]) continue;
    if (Math.abs(o.y - c.y) < .65 && o.x > c.x && o.x - c.x < 1.7) return true;
  }
  return walkerInLane(c.x - .1, c.x + 1.1);
}
function roadClearFor(c) {
  for (var i = 0; i < S.cars.length; i++) {
    var o = S.cars[i];
    if (o === c || HIDDEN[o.state]) continue;
    // someone still reversing out of a bay claims the lane around their column straight away
    if (o.state === 'out' && o.path[0] && o.path[0].rev) { if (Math.abs(o.x - c.x) < 1.9) return false; continue; }
    if (o.state === 'gout' && o.y < 1.7 && Math.abs(o.x - c.x) < .8) return false;   // still on the garage driveway
    if (Math.abs(o.y - 2.5) < .9 && o.x > c.x - 2.0 && o.x < c.x + 1.7) return false;
  }
  return !walkerInLane(c.x - 1.1, c.x + 1.1);
}
function addMoney(a) { S.money += a; S.totalRun += a; S.lifetime += a; moneyChanged = true; }
function payCar(c) {
  var a = fee() * (c.vip ? 3 : 1) * (c.g ? GAR_PAY : 1);
  addMoney(a); S.served++;
  S.particles.push({ x: c.x, y: c.g ? 1 : c.y, fl: 0, t: 0, txt: '+' + fmtSmall(a) });
  S.earn.push({ t: S.t, v: a });
}
function stepCar(c, dt) {
  c.moving = false;
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
      else { payCar(c); c.state = 'gwait'; c.x = GOUT; c.y = GY1; }
    }
    return;
  }
  if (c.state === 'gwait') {   // waits at the garage exit for a gap in the traffic
    if (roadClearFor(c)) { GS[c.gi].car = null; c.state = 'gout'; c.heading = 1; c.path = [{ x: GOUT, y: 2.5 }, { x: 14.5, y: 2.5 }]; }
    return;
  }
  if (c.state === 'wantout') {
    if (roadClearFor(c)) { c.state = 'out'; c.path = [{ x: c.x, y: 2.5, rev: true }, { x: 14.5, y: 2.5 }]; }
    return;
  }
  if (c.state === 'wait') {
    var front = true, i;
    for (i = 0; i < S.cars.length; i++) if (S.cars[i].state === 'wait' && S.cars[i].x > c.x) front = false;
    var fs = front ? S.spots.filter(function (s) { return unlocked(s) && !s.car; }) : [];
    if (fs.length) {   // a bay opened up: take the one nearest the gate
      var sp = fs[Math.floor(Math.random() * fs.length)];
      sp.car = c; c.spot = sp; c.state = 'in'; c.path = [{ x: sp.x + .5, y: 2.5 }, { x: sp.x + .5, y: sp.y + .5 }]; c.timer = 0;
    } else if (c.x < GIN - .7 && garFree() > 0) {   // or a garage bay, if they have not passed the garage yet
      var open = [];
      for (i = 0; i < garCap(); i++) if (!GS[i].car) open.push(i);
      var gi = open[Math.floor(Math.random() * open.length)];
      c.g = true; c.gi = gi; c.door = 2 + Math.floor(Math.random() * COLS()); GS[gi].car = c; GS[gi].color = c.color;
      c.state = 'gin'; c.path = [{ x: GIN, y: 2.5 }, { x: GIN, y: GY1 }];
    } else if (!c.moving) {
      c.timer -= dt;
      if (c.timer <= 0) { c.state = 'leave'; c.path = [{ x: 14.5, y: 2.5 }]; S.lost = (S.lost || 0) + 1; S.particles.push({ x: c.x, y: 2.5, fl: 0, t: 0, txt: 'Full!' }); }
    }
    if (c.state === 'wait' && !c.path[0]) { c.moving = false; return; }
  }
  var tg = c.path[0];
  if (!tg) {
    if (c.state === 'in') { c.state = 'parked'; c.phase = 0; c.timer = doorTime(); }
    else if (c.state === 'gin') { c.state = 'ghide'; c.phase = 0; c.timer = doorTime(); }
    return;
  }
  var dx = tg.x - c.x, dy = tg.y - c.y, dist = Math.hypot(dx, dy), roadLeg = Math.abs(dx) > Math.abs(dy);
  if (!tg.rev) c.heading = roadLeg ? (dx > 0 ? 0 : 2) : (dy > 0 ? 1 : 3);
  if (roadLeg && blockedAhead(c)) return;
  if (c.state === 'gout' && !roadLeg && c.y > 1.0 && c.y < 1.8 && !roadClearFor(c)) return;   // do not pull out in front of traffic
  var st = (roadLeg || c.g ? 2.1 : 1.2) * speedMul() * dt;
  c.moving = true;
  if (dist <= st) {
    c.x = tg.x; c.y = tg.y; c.path.shift();
    if (c.state === 'out' && c.path.length === 1 && c.spot) { c.spot.car = null; c.spot = null; }
  } else { c.x += dx / dist * st; c.y += dy / dist * st; }
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
}
function clearCars() { S.cars = []; S.walkers = []; S.spots.forEach(function (s) { s.car = null; }); GS.forEach(function (g) { g.car = null; g.color = null; }); }

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
  S.cars = S.cars.filter(function (c) { return !((c.state === 'out' || c.state === 'gout' || c.state === 'leave') && c.x >= 14.4); });
  var open = S.cars.some(function (c) { return (c.state === 'in' || c.state === 'gout') && c.heading === 0 && c.x > -4.7 && c.x < -2.4; });
  S.gate += ((open ? 1 : 0) - S.gate) * Math.min(1, dt * 7);
  S.particles.forEach(function (p) { p.t += dt; });
  S.particles = S.particles.filter(function (p) { return p.t < 1.2; });
  S.pad += (S.padTarget - S.pad) * Math.min(1, dt * 8);
  var dd = S.lvl.garage - S.deckAnim; S.deckAnim += Math.abs(dd) < .01 ? dd : dd * Math.min(1, dt * 2.2) + Math.sign(dd) * Math.min(Math.abs(dd), dt * .35);
  stepCam(dt); tickMeta(dt);
}

/* ---------- goals, rush hour and franchise perks: the reasons to keep playing ---------- */
var GDEF = {
  cars: { name: 'Happy drivers', tint: '#bde6ff', tgt: function (t) { return Math.round(30 * Math.pow(2.5, t)); }, val: function () { return S.served; }, txt: function (n) { return 'Park ' + fmt(n) + ' cars'; } },
  cash: { name: 'Big earner', tint: '#ffe38a', tgt: function (t) { return 2000 * Math.pow(4.5, t); }, val: function () { return S.lifetime; }, txt: function (n) { return 'Earn $' + fmt(n) + ' in total'; } },
  fee: { name: 'Price setter', tint: '#ffd9c7', tgt: function (t) { return 5 * (t + 1); }, val: function () { return S.bestFee; }, txt: function (n) { return 'Reach parking fee level ' + n; } },
  deck: { name: 'Sky high', tint: '#e3d9ff', tgt: function (t) { return t + 1; }, val: function () { return S.bestDeck; }, txt: function (n) { return 'Build garage floor ' + n; } },
  vip: { name: 'Meet and greet', tint: '#fff0a8', tgt: function (t) { return Math.round(3 * Math.pow(1.9, t)); }, val: function () { return S.vips; }, txt: function (n) { return 'Tap ' + n + ' golden cars'; } },
  rush: { name: 'Rush job', tint: '#ffc7bd', tgt: function (t) { return Math.round(2 * Math.pow(1.8, t)); }, val: function () { return S.rushes; }, txt: function (n) { return 'Ride out ' + n + ' rush hours'; } },
  star: { name: 'Chain owner', tint: '#d6f0c8', tgt: function (t) { return Math.round(3 * Math.pow(1.7, t)); }, val: function () { return S.stars; }, txt: function (n) { return 'Collect ' + n + ' franchise stars'; } }
};
var GORDER = ['cars', 'cash', 'fee', 'deck', 'vip', 'rush', 'star'];
function goalTarget(k) { return GDEF[k].tgt(S.goal[k]); }
function goalReady(k) { return GDEF[k].val() >= goalTarget(k); }
function goalsReady() { var n = 0; GORDER.forEach(function (k) { if (goalReady(k)) n++; }); return n; }
function goalCash() { return Math.max(econRate() * 90, fee() * 10); }
function claimGoal(k) {
  if (!goalReady(k)) return false;
  var cash = goalCash(); S.goal[k]++; addMoney(cash);
  note('Goal complete! +2% income forever and $' + fmt(cash));
  return true;
}
// rush hour: now and then a rush is on offer; taking it brings a wave of extra drivers who pay more
function rushLen() { return 40 + 10 * S.perk.rush; }
function rushGap() { return (150 + Math.random() * 90) * Math.pow(.93, S.perk.rush); }
function startRush() {
  if (S.rushReady <= 0) return false;
  S.rushReady = 0; S.rush = rushLen(); S.rushes++; S.spawnT = 0; moneyChanged = true;
  return true;
}
function tickMeta(dt) {
  if (S.rush > 0) { S.rush -= dt; if (S.rush <= 0) { S.rush = 0; S.rushWait = rushGap(); } }
  else if (S.rushReady > 0) { S.rushReady -= dt; if (S.rushReady <= 0) { S.rushReady = 0; S.rushWait = rushGap() * .5; } }
  else { S.rushWait -= dt; if (S.rushWait <= 0) S.rushReady = 60; }
  if (S.lvl.fee > S.bestFee) S.bestFee = S.lvl.fee;
  if (S.lvl.garage > S.bestDeck) S.bestDeck = S.lvl.garage;
}
// permanent perks bought with franchise tokens; they survive every franchise
var PDEF = {
  gold: { name: 'Golden rates', tint: '#ffe38a', cost: function (l) { return Math.ceil(2 * Math.pow(1.8, l)); }, now: function () { return 'All income x' + Math.pow(1.15, S.perk.gold).toFixed(2); }, next: 'All income +15%' },
  head: { name: 'Head start', tint: '#d6f0c8', cost: function (l) { return Math.ceil(Math.pow(3, l)); }, now: function () { return S.perk.head ? 'New lots start with $' + fmt(headStart()) : 'New lots start with $25'; }, next: 'Start each franchise with 3x more cash' },
  rush: { name: 'Rush master', tint: '#ffc7bd', cost: function (l) { return Math.ceil(2 * Math.pow(1.7, l)); }, now: function () { return 'Rush hours last ' + rushLen() + 's'; }, next: '+10s of rush, and rushes come sooner' }
};
var PORDER = ['gold', 'head', 'rush'];
function buyPerk(k) {
  var c = PDEF[k].cost(S.perk[k]); if (S.tok < c) return false;
  S.tok -= c; S.perk[k]++; moneyChanged = true; return true;
}

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

/* ---------- the garage: a square building left of the market, floors stack up ---------- */
var BAND = ['#ff7a6b', '#ffd04a', '#5fd6a4', '#5db8ff', '#b79bff', '#ff9ccf'];
function drawGarageGround() {
  var a = GIN - .5, b = GOUT + .5;
  poly([P(GX0 - .6, GY0 - .6), P(GX1 + .6, GY0 - .6), P(GX1 + .6, GY1 + .5), P(GX0 - .6, GY1 + .5)], '#c9d1e4');
  poly([P(a, GY1), P(b, GY1), P(b, 2.0), P(a, 2.0)], '#6c7898');                       // driveway, across the pavement
  poly([P(GPED - .4, GY1), P(GPED + .4, GY1), P(GPED + .4, 1.0), P(GPED - .4, 1.0)], '#ece3cc');   // side-door path
  poly([P(GPED - .4, .72), P(2, .72), P(2, 1.3), P(GPED - .4, 1.3)], '#ece3cc');       // walkway to the market
  line(P((GIN + GOUT) / 2, GY1 + .3), P((GIN + GOUT) / 2, 1.7), 2, 'rgba(255,255,255,.6)', 'butt');
  poly([P(GIN, .6), P(GIN + .17, .9), P(GIN + .06, .9), P(GIN + .06, 1.3), P(GIN - .06, 1.3), P(GIN - .06, .9), P(GIN - .17, .9)], 'rgba(255,255,255,.6)', null, 0);
  poly([P(GOUT, 1.3), P(GOUT + .17, 1.0), P(GOUT + .06, 1.0), P(GOUT + .06, .6), P(GOUT - .06, .6), P(GOUT - .06, 1.0), P(GOUT - .17, 1.0)], 'rgba(255,255,255,.6)', null, 0);
}
// a parked car seen through an opening: south face looks along x, east face along y
function chipS(x, z, col) {
  var y = GY1 + .02;
  poly([P(x + .12, y, z + 6), P(x + .88, y, z + 6), P(x + .88, y, z + 13), P(x + .12, y, z + 13)], shade(col, FL), null, 0);
  poly([P(x + .26, y, z + 13), P(x + .74, y, z + 13), P(x + .64, y, z + 19), P(x + .36, y, z + 19)], shade(col, 1.04), null, 0);
  poly([P(x + .33, y, z + 14), P(x + .67, y, z + 14), P(x + .6, y, z + 18), P(x + .4, y, z + 18)], '#cfeaff', null, 0);
  [.3, .7].forEach(function (u) { var p = P(x + u, y, z + 6); circle(p.x, p.y, 3.2, '#2a2438'); });
}
function chipE(y, z, col) {
  var x = GX1 + .02;
  poly([P(x, y + .12, z + 6), P(x, y + .88, z + 6), P(x, y + .88, z + 13), P(x, y + .12, z + 13)], shade(col, FR), null, 0);
  poly([P(x, y + .26, z + 13), P(x, y + .74, z + 13), P(x, y + .64, z + 19), P(x, y + .36, z + 19)], shade(col, FR * 1.08), null, 0);
  poly([P(x, y + .33, z + 14), P(x, y + .67, z + 14), P(x, y + .6, z + 18), P(x, y + .4, z + 18)], '#a7cbe8', null, 0);
  [.3, .7].forEach(function (u) { var p = P(x, y + u, z + 6); circle(p.x, p.y, 3.2, '#2a2438'); });
}
function slotChip(d, z0, j) {
  var s = GS[d * PERDECK + j];
  if (!s || !s.car) return;
  if (j < 3) chipS(GX0 + j, z0, s.color); else chipE(GY0 + (j - 3), z0, s.color);
}
function deckDetail(d, z0) {
  var j, k;
  for (j = 0; j < PERDECK; j++) slotChip(d, z0, j);
  if (d === 0) {
    poly([P(GIN - .5, GY1 + .02, 0), P(GOUT + .5, GY1 + .02, 0), P(GOUT + .5, GY1 + .02, 21), P(GIN - .5, GY1 + .02, 21)], '#2c2749', null, 0);     // car doorway
    poly([P(GIN - .5, GY1 + .03, 28), P(GOUT + .5, GY1 + .03, 28), P(GOUT + .5, GY1 + .03, 22), P(GIN - .5, GY1 + .03, 22)], '#3d8bff', null, 0);
    faceText('IN', P(GIN, GY1 + .03, 25), 'L', 6.5, '#e9fff4'); faceText('OUT', P(GOUT, GY1 + .03, 25), 'L', 6.5, '#ffe2dc');
    poly([P(GPED - .27, GY1 + .02, 0), P(GPED + .27, GY1 + .02, 0), P(GPED + .27, GY1 + .02, 19), P(GPED - .27, GY1 + .02, 19)], '#ffe28a', null, 0);   // shoppers' door
    poly([P(GPED - .27, GY1 + .03, 24), P(GPED + .27, GY1 + .03, 24), P(GPED + .27, GY1 + .03, 20), P(GPED - .27, GY1 + .03, 20)], '#ff8a7a', null, 0);
  } else {
    poly([P(GIN - .5, GY1 + .02, z0 + 4), P(GOUT + .5, GY1 + .02, z0 + 4), P(GOUT + .5, GY1 + .02, z0 + 22), P(GIN - .5, GY1 + .02, z0 + 22)], '#7a82c0', null, 0);   // ramp and stairs
    for (k = 1; k < 5; k++) line(P(GIN - .5, GY1 + .03, z0 + 4 + k * 3.6), P(GOUT + .5, GY1 + .03, z0 + 4 + k * 3.6), 1.5, 'rgba(255,255,255,.35)', 'butt');
    poly([P(GPED - .27, GY1 + .02, z0 + 6), P(GPED + .27, GY1 + .02, z0 + 6), P(GPED + .27, GY1 + .02, z0 + 20), P(GPED - .27, GY1 + .02, z0 + 20)], '#9ad4ff', null, 0);
  }
  for (k = 0; k <= 6; k++) prism(GX0 + k - .09, GY1 - .09, z0, GX0 + k + .09, GY1 + .09, z0 + DH - 6, '#e9edf7');
  for (k = 0; k < 6; k++) prism(GX1 - .09, GY0 + k - .09, z0, GX1 + .09, GY0 + k + .09, z0 + DH - 6, '#e9edf7');
  prism(GX0, GY1 - .03, z0, GX1, GY1 + .07, z0 + 5, '#d6dcea');
  prism(GX1 - .03, GY0, z0, GX1 + .07, GY1, z0 + 5, '#d6dcea');
}
function drawGarage() {
  var n = Math.ceil(S.deckAnim - .001), d, z0, r, dh, top = 0;
  for (d = 0; d < n; d++) {
    r = Math.min(1, S.deckAnim - d); dh = DH * r; z0 = d * DH; top = z0 + dh;
    prism(GX0, GY0, z0, GX1, GY1, z0 + dh, '#5a5389');
    if (r > .98) deckDetail(d, z0);
    prism(GX0 - .14, GY0 - .14, Math.max(z0, z0 + dh - 6), GX1 + .14, GY1 + .14, z0 + dh, BAND[d % 6]);
  }
  if (S.deckAnim - (n - 1) < .98) return;
  // the roof
  ZOFF = top;
  prism(GX0, GY0, 0, GX1, GY0 + .14, 5, '#e4e9f5'); prism(GX0, GY0, 0, GX0 + .14, GY1, 5, '#e4e9f5');
  prism(GX0 + .3, GY0 + .3, 0, GX0 + 1.5, GY0 + 1.4, 20, '#e9edf7');
  winL(GX0 + .5, GX0 + 1.3, GY0 + 1.4, 7, 15, 2, 1, '#9ad4ff');
  drawPoleSign(GX1 - 1.3, GY1 - 1.3, 44, .45, 'P');
  prism(GX0, GY1 - .14, 0, GX1, GY1, 5, '#e4e9f5'); prism(GX1 - .14, GY0, 0, GX1, GY1, 5, '#e4e9f5');
  ZOFF = 0;
}

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

/* ---------- upgrades ---------- */
var ICON = {
  space: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><path d="M16.5 14v6M13.5 17h6"/></svg>',
  garage: '<svg viewBox="0 0 24 24"><path d="M3.5 20V9L12 4l8.5 5v11M7 20v-6h10v6M7 17h10"/></svg>',
  fee: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M14.5 9.2c-.6-.8-1.5-1.1-2.5-1.1-1.4 0-2.4.7-2.4 1.8 0 2.6 5 1.4 5 4 0 1.1-1 1.9-2.6 1.9-1.1 0-2-.4-2.7-1.2M12 6.5v1.6M12 15.8v1.7"/></svg>',
  gate: '<svg viewBox="0 0 24 24"><path d="M5 19V9M5 11h14M9 11v-2M13 11v-2M17 11v-2"/></svg>',
  sign: '<svg viewBox="0 0 24 24"><path d="M12 20V11"/><circle cx="12" cy="7.5" r="3.5"/><path d="M8 20h8"/></svg>',
  ads: '<svg viewBox="0 0 24 24"><path d="M4 10v4h3l6 4V6L7 10zM16.5 9a4 4 0 010 6M18.5 6.5a7.5 7.5 0 010 11"/></svg>',
  walk: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5.5" r="2.3"/><path d="M12 8.5v5l-3 6M12 13.5l3.5 5.5M9 11l3-2.5 3 2.5"/></svg>',
  express: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="7.5"/><path d="M12 8.5V13l3 2M9.5 3.5h5"/></svg>',
  valet: '<svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="3.6"/><path d="M11.6 12H20M17 12v3M20 12v2.5"/></svg>',
  shop: '<svg viewBox="0 0 24 24"><path d="M5 9h14l-1 10H6zM9 9V7a3 3 0 016 0v2"/></svg>',
  goal: '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9L3.5 9.7l5.9-.8z"/></svg>'
};
function msNote(l) { return 'Level ' + msNext(l) + ' doubles it again'; }
var ITEMS = {
  space: { tab: 'build', name: 'More spaces', tint: '#bde6ff', icon: 'space', multi: false,
    lvl: function () { return S.lvl.space; }, max: function () { return MAXL.space; },
    cost: function (l) { return [60, 220][l]; },
    now: function () { return COLS() * 2 + ' spaces in the lot'; }, next: function () { return 'Opens 2 more bays by the market'; },
    apply: function () { S.lvl.space++; } },
  garage: { tab: 'build', name: 'Garage floors', tint: '#e3d9ff', icon: 'garage', multi: false,
    lvl: function () { return S.lvl.garage; }, max: function () { return maxDecks(); },
    cost: function (l) { return 400 * Math.pow(3.4, l); },
    now: function () { var n = S.lvl.garage; return n ? n + (n === 1 ? ' floor, ' : ' floors, ') + garCap() + ' garage spaces' : 'No garage yet'; },
    next: function () { var n = S.lvl.garage; return n >= maxDecks() ? 'Franchise to build higher' : n ? 'Floor ' + (n + 1) + ': ' + PERDECK + ' more spaces' : 'A garage beside the market, ' + PERDECK + ' spaces a floor'; },
    apply: function () { S.lvl.garage++; ensureSlots(); } },
  gate: { tab: 'speed', name: 'Wider lanes', tint: '#ffc7bd', icon: 'gate', multi: true,
    lvl: function () { return S.lvl.gate; }, max: function () { return MAXL.gate; },
    cost: function (l) { return 40 * Math.pow(1.7, l); },
    now: function () { return 'Cars drive at ' + Math.round(speedMul() * 100) + '%'; }, next: function () { return 'Cars drive faster, with diminishing returns'; },
    apply: function () { S.lvl.gate++; } },
  walk: { tab: 'speed', name: 'Sidewalks', tint: '#d6f0c8', icon: 'walk', multi: true,
    lvl: function () { return S.lvl.walk; }, max: function () { return MAXL.walk; },
    cost: function (l) { return 25 * Math.pow(1.65, l); },
    now: function () { return 'Shoppers walk at ' + Math.round(walkSpeed() / 0.8 * 100) + '%'; }, next: function () { return 'Faster walking (garage shoppers walk further)'; },
    apply: function () { S.lvl.walk++; } },
  express: { tab: 'speed', name: 'Express shopping', tint: '#ffe6b8', icon: 'express', multi: true,
    lvl: function () { return S.lvl.express; }, max: function () { return MAXL.express; },
    cost: function (l) { return 45 * Math.pow(1.6, l); },
    now: function () { return (S.lvl.express >= 30 ? 'Curbside pickup: ' : 'Visits last about ') + visitAvg().toFixed(1) + 's'; }, next: function () { return 'Shorter shop visits, down towards half a second'; },
    apply: function () { S.lvl.express++; } },
  valet: { tab: 'speed', name: 'Valet', tint: '#d9e4ff', icon: 'valet', multi: true,
    lvl: function () { return S.lvl.valet; }, max: function () { return MAXL.valet; },
    cost: function (l) { return 120 * Math.pow(2.2, l); },
    now: function () { return 'Doors and parking ' + Math.round((1 + 0.5 * S.lvl.valet) * 100) + '%'; }, next: function () { return 'Quicker doors, quicker parking'; },
    apply: function () { S.lvl.valet++; } },
  shop: { tab: 'biz', name: 'Shop deals', tint: '#ffd9c7', icon: 'shop', multi: true, ms: true,
    lvl: function () { return S.lvl.shop; }, max: function () { return MAXL.shop; },
    cost: function (l) { return 50 * Math.pow(1.55, l); },
    now: function () { return S.lvl.shop ? 'Shops pay $' + fmtSmall(fee() * tipRate()) + ' a visit' : 'Shops pay nothing yet'; },
    next: function () { return 'Shops pay +5% of the fee per visit'; },
    apply: function () { S.lvl.shop++; } },
  sign: { tab: 'build', name: 'Guidance', tint: '#c9f2d9', icon: 'sign', multi: false,
    lvl: function () { return S.lvl.sign; }, max: function () { return MAXL.sign; },
    cost: function (l) { return [20, 90, 500][l]; },
    now: function () { return ['No signs yet', 'Bay lights on', 'Lights and entrance sign', 'Card payments on'][S.lvl.sign]; },
    next: function () { return ['Lights show free bays', 'Sign counts free bays', '+20% fee, pay by card'][S.lvl.sign]; },
    apply: function () { S.lvl.sign++; } },
  fee: { tab: 'biz', name: 'Parking fee', tint: '#ffe38a', icon: 'fee', multi: true, ms: true,
    lvl: function () { return S.lvl.fee; }, max: function () { return MAXL.fee; },
    cost: function (l) { return 14 * Math.pow(1.5, l); },
    now: function () { return '$' + fmtSmall(fee()) + ' per car'; }, next: function () { return 'Fee x' + FEEG; },
    apply: function () { S.lvl.fee++; } },
  ads: { tab: 'biz', name: 'Advertising', tint: '#ffd1ec', icon: 'ads', multi: true,
    lvl: function () { return S.lvl.ads; }, max: function () { return MAXL.ads; },
    cost: function (l) { return 30 * Math.pow(1.5, l); },
    now: function () { return 'A car every ' + gapBase().toFixed(2) + 's' + (totalSpots() / (dwellAvg() + 3) < demand() ? ' (your spaces are the limit)' : ''); }, next: function () { return 'About 6% more cars'; },
    apply: function () { S.lvl.ads++; } }
};
var TABS = { build: ['space', 'garage', 'sign'], speed: ['gate', 'walk', 'express', 'valet'], biz: ['fee', 'ads', 'shop'] };
var TABNOTE = {
  build: 'More room for cars. Drivers use the main lot first, then the garage. When both are full, cars queue on the street and lose patience, so keep building.',
  speed: 'Every visit: park, step out, walk to the shops, shop, walk back, leave. Speed up any step to free the bay sooner.',
  biz: 'Earn more from each visit and bring more cars in. Fees and shop deals never run out.',
  goals: 'Finish goals for +2% income each, forever, plus a cash bonus. Every goal has another one after it.',
  fr: ''
};
function plan(k, mode) {
  var it = ITEMS[k], l = it.lvl(), mx = it.max(), n = 0, cost = 0, c;
  if (l >= mx) return { n: 0, cost: 0, ok: false, maxed: true };
  if (it.multi && mode === 'max') {
    while (l + n < mx) { c = it.cost(l + n); if (!isFinite(c) || cost + c > S.money) break; cost += c; n++; }
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
var toastEl = document.getElementById('toast'), toastT = 0;
function note(t) {
  toastEl.textContent = t; toastEl.hidden = false; clearTimeout(toastT);
  toastT = setTimeout(function () { toastEl.hidden = true; }, 3400);
}

function btnHtml(k) {
  var p = plan(k, S.qty);
  if (p.maxed) return k === 'garage' ? 'Franchise for more' : 'Maxed';
  return '<span class="c">$</span>' + fmt(p.cost) + (p.n > 1 ? ' <small>x' + p.n + '</small>' : '');
}
function cardHtml(k) {
  var it = ITEMS[k], l = it.lvl(), mx = it.max(), pips = '';
  if (mx <= 12) { for (var i = 0; i < mx; i++) pips += '<span class="pip' + (i < l ? ' on' : '') + '"></span>'; }
  else pips = '<span class="lbl2">Level ' + l + '</span>';
  var maxed = l >= mx, sub = maxed && k !== 'garage' ? 'Fully upgraded' : it.next();
  if (it.ms) sub += ' · ' + msNote(l);
  return '<article class="card" id="card-' + k + '"><h3><span class="ico" style="background:' + it.tint + '">' + ICON[it.icon] + '</span>' + it.name + '</h3>' +
    '<p class="now">' + it.now() + '</p><div class="pips" aria-hidden="true">' + pips + '</div>' +
    '<p>' + sub + '</p>' +
    '<button class="buy" type="button" data-up="' + k + '" id="buy-' + k + '">' + btnHtml(k) + '</button></article>';
}
function goalHtml(k) {
  var d = GDEF[k], tg = goalTarget(k), v = Math.min(d.val(), tg), pct = Math.max(0, Math.min(100, v / tg * 100)), ok = goalReady(k);
  return '<article class="card goal" id="goal-' + k + '"><h3><span class="ico" style="background:' + d.tint + '">' + ICON.goal + '</span>' + d.name + '</h3>' +
    '<p class="now">' + d.txt(tg) + '</p><div class="meter" role="img" aria-label="Progress"><i style="width:' + pct + '%"></i></div>' +
    '<p>' + fmt(v) + ' / ' + fmt(tg) + ' · done ' + S.goal[k] + '</p>' +
    '<button class="buy" type="button" data-goal="' + k + '"' + (ok ? '' : ' disabled') + '>' + (ok ? 'Claim +2% and $' + fmt(goalCash()) : 'Keep going') + '</button></article>';
}
function perkHtml(k) {
  var d = PDEF[k], c = d.cost(S.perk[k]);
  return '<article class="card" id="perk-' + k + '"><h3><span class="ico" style="background:' + d.tint + '">' + ICON.goal + '</span>' + d.name + '</h3>' +
    '<p class="now">' + d.now() + '</p><span class="lbl2">Level ' + S.perk[k] + '</span><p>' + d.next + '</p>' +
    '<button class="buy" type="button" data-perk="' + k + '"' + (S.tok >= c ? '' : ' disabled') + '>' + c + ' &#9733; tokens</button></article>';
}
function frHtml() {
  var gain = starsGain();
  var base = Math.pow(starsTotal(), 3) * STAR_BASE, nxt = Math.pow(starsTotal() + 1, 3) * STAR_BASE;
  var pct = Math.max(0, Math.min(100, (S.lifetime - base) / (nxt - base) * 100));
  var h = '<div class="fr"><h3><span style="color:#f0a300;-webkit-text-stroke:1.5px var(--ink)">&#9733;</span> Franchise</h3>' +
    '<p>Sell this lot and open a new one from scratch. Each star adds 35% to all income forever, you get a token per star to spend on perks, and every franchise lets you build 3 more garage floors.</p>' +
    '<div class="row"><div class="stat"><small>Stars</small>' + S.stars + '</div>' +
    '<div class="stat"><small>Income bonus</small>+' + Math.round((mult() - 1) * 100) + '%</div>' +
    '<div class="stat"><small>Earned this lot</small>$<span id="fr-run">' + fmt(S.totalRun) + '</span></div>' +
    '<div class="stat"><small>Stars if you sell now</small><span id="fr-gain">+' + gain + '</span></div>' +
    '<div class="stat"><small>Tokens</small>' + S.tok + '</div></div>' +
    '<div class="meter" role="img" aria-label="Progress to the next star"><i id="fr-bar" style="width:' + pct + '%"></i></div>' +
    '<p id="fr-note">Next star after $' + fmt(nxt) + ' earned in total (lifetime $' + fmt(S.lifetime) + ').</p>';
  if (!S.confirmFr) h += '<button class="buy" type="button" id="fr-go"' + (gain < 1 ? ' disabled' : '') + '>' + (gain < 1 ? 'Earn more to franchise' : 'Franchise now (+' + gain + ' stars)') + '</button>';
  else h += '<p>This resets your money, garage and upgrades. Stars, tokens, perks and goals stay.</p><div class="btns"><button class="buy danger" type="button" id="fr-yes">Yes, start over</button><button class="buy ghost" type="button" id="fr-no">Keep playing</button></div>';
  h += '</div><p class="tabnote">Perks (spend tokens, they last through every franchise)</p>';
  PORDER.forEach(function (k) { h += perkHtml(k); });
  return h;
}
function buildTray() {
  var h = '';
  if (S.tab === 'fr') h = frHtml();
  else if (S.tab === 'goals') { h += '<p class="tabnote">' + TABNOTE.goals + '</p>'; GORDER.forEach(function (k) { h += goalHtml(k); }); }
  else { h += '<p class="tabnote">' + TABNOTE[S.tab] + '</p>'; TABS[S.tab].forEach(function (k) { h += cardHtml(k); }); }
  tray.innerHTML = h;
  qtyEl.hidden = S.tab === 'fr' || S.tab === 'goals';
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
  var frReady = starsGain() > 0, gr = goalsReady();
  [].forEach.call(tabsEl.querySelectorAll('[data-tab]'), function (tb) {
    var t = tb.getAttribute('data-tab'), d = tb.querySelector('.dot'); if (!d) return;
    d.hidden = t === 'fr' ? !frReady : t === 'goals' ? !gr : !TABS[t].some(function (k) { return plan(k, 1).ok; });
  });
  var n = ready + (frReady ? 1 : 0) + gr, bd = document.getElementById('badge');
  bd.hidden = !n; bd.textContent = n;
  openBtn.classList.toggle('ready', n > 0);
  var go = document.getElementById('fr-go');
  if (go) { go.disabled = starsGain() < 1; }
  if (S.tab === 'goals') GORDER.forEach(function (k) {
    var b = document.querySelector('#goal-' + k + ' .buy'); if (!b) return;
    var ok = goalReady(k); if (b.disabled === ok) { buildTray(); return; }
  });
}
function updateFr() {
  var a = document.getElementById('fr-run'); if (!a) return;
  a.textContent = fmt(S.totalRun);
  document.getElementById('fr-gain').textContent = '+' + starsGain();
  var base = Math.pow(starsTotal(), 3) * STAR_BASE, nxt = Math.pow(starsTotal() + 1, 3) * STAR_BASE;
  document.getElementById('fr-bar').style.width = Math.max(0, Math.min(100, (S.lifetime - base) / (nxt - base) * 100)) + '%';
  document.getElementById('fr-note').textContent = 'Next star after $' + fmt(nxt) + ' earned in total (lifetime $' + fmt(S.lifetime) + ').';
  var go = document.getElementById('fr-go');
  if (go) { var g = starsGain(); go.textContent = g < 1 ? 'Earn more to franchise' : 'Franchise now (+' + g + ' stars)'; }
}
function doFranchise() {
  var g = starsGain(); if (g < 1) return;
  S.stars += g; S.tok += g; S.franchises++; S.money = 25 + headStart(); S.totalRun = 0;
  Object.keys(S.lvl).forEach(function (k) { S.lvl[k] = 0; });
  S.spots = []; ensureSpots(); GS = []; ensureSlots(); S.deckAnim = 0; clearCars(); seedParked();
  S.confirmFr = false; S.tab = 'build'; S.spawnT = 0.5; moneyChanged = true; buildTray(); save();
  note('New franchise open! Income x' + mult().toFixed(2));
}

tray.addEventListener('click', function (e) {
  var id = e.target.closest('button') && e.target.closest('button').id;
  if (id === 'fr-go') { S.confirmFr = true; buildTray(); return; }
  if (id === 'fr-no') { S.confirmFr = false; buildTray(); return; }
  if (id === 'fr-yes') { doFranchise(); return; }
  var gb = e.target.closest('[data-goal]');
  if (gb) { if (claimGoal(gb.getAttribute('data-goal'))) { moneyChanged = true; buildTray(); save(); } return; }
  var pb = e.target.closest('[data-perk]');
  if (pb) { if (buyPerk(pb.getAttribute('data-perk'))) { buildTray(); save(); } return; }
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
  var txt = parkedCount() + ' / ' + totalSpots();
  if (txt !== lastParked) { lastParked = txt; elParked.textContent = txt; }
  starPill.hidden = !(S.stars > 0); if (S.stars > 0) elStars.textContent = S.stars;
  if (S.tab === 'fr' && S.t - lastFr > 0.5) { lastFr = S.t; updateFr(); }
  if (S.t - lastGoalChk > 1) {
    lastGoalChk = S.t; refreshTray();
    var gr = goalsReady(); if (gr > lastGoals) note('A goal is ready! Open Upgrades, then Goals.'); lastGoals = gr;
    if (S.tab === 'goals' && sheet.classList.contains('open')) buildTray();
  }
  var rb = rushBtn;
  if (S.rush > 0) { rb.hidden = false; rb.disabled = true; rb.className = 'rush on'; rb.textContent = 'Rush hour ' + Math.ceil(S.rush) + 's'; }
  else if (S.rushReady > 0) { rb.hidden = false; rb.disabled = false; rb.className = 'rush'; rb.textContent = 'Rush hour! Tap (' + Math.ceil(S.rushReady) + 's)'; }
  else rb.hidden = true;
}
var rushBtn = document.getElementById('rushBtn'), lastGoalChk = 0, lastGoals = 0;
rushBtn.addEventListener('click', function () { if (startRush()) { note('Rush hour! More drivers, and every car pays 50% more.'); save(); } });

/* ---------- VIP car tap ---------- */
cv.addEventListener('pointerdown', function (e) {
  var r = cv.getBoundingClientRect();
  var lx = ((e.clientX - r.left) * T.dpr - T.ox) / T.k, ly = ((e.clientY - r.top) * T.dpr - T.oy) / T.k;
  for (var i = 0; i < S.cars.length; i++) {
    var c = S.cars[i];
    if (c.vip && Math.hypot(lx - c.hx, ly - c.hy) < 46) {
      var bonus = Math.max(fee() * 25, econRate() * 45);
      addMoney(bonus); c.vip = false; S.vips++;
      S.particles.push({ x: c.x, y: c.y, fl: 0, t: 0, txt: '+' + fmt(bonus) });
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
