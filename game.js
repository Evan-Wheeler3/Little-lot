(function () {
'use strict';
var cv = document.getElementById('scene'), ctx = cv.getContext('2d');
var HW = 40, HH = 20, OX = 300, OY = 110, X0 = -2, X1 = 10;
var INK = '#3b2f5c';
var CAR_COLORS = ['#ff7a6b', '#5fd6a4', '#5db8ff', '#b79bff', '#ff9ccf', '#ff9f5a', '#7fe0e0', '#f4f1ea', '#5a6488', '#e8505b'];
var REDUCE = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
var ZOFF = 0;
// The garage is its own building to the left of the market, clear of the main lot.
// Footprint x GX0..GX1, y GY0..GY1; cars turn in at GIN, come out at GOUT; shoppers use the side door at GPED.
var GX0 = -10.2, GX1 = -4.2, GY0 = -6.6, GY1 = -0.6, GIN = -6.7, GOUT = -5.7, GPED = -4.7;
var DH = 34, PERDECK = 9, SPAWNX = -12, GAR_PAY = 1.8, FEEG = 1.15;
// The car wash sits south of the road past the lot: leaving cars turn down at WIN, roll through the tunnel WX0..WX1 at WY and rejoin at WOUT
var WX0 = 11.3, WX1 = 13.1, WY = 4.9, WIN = 10.7, WOUT = 13.7;
var VERSION = '1.0.0';

var S = {
  money: 25, totalRun: 0, lifetime: 0, stars: 0, tok: 0, franchises: 0, gems: 10,
  lvl: { space: 0, garage: 0, fee: 0, ads: 0, gate: 0, sign: 0, walk: 0, express: 0, valet: 0, shop: 0, wash: 0, ev: 0, concierge: 0, promoter: 0, crew: 0, manager: 0 },
  perk: { gold: 0, head: 0, rush: 0, tap: 0, night: 0, sleep: 0, lucky: 0, blue: 0 },
  goal: { cars: 0, cash: 0, fee: 0, deck: 0, vip: 0, rush: 0, star: 0, fever: 0, wash: 0 },
  served: 0, vips: 0, rushes: 0, fevers: 0, washes: 0, taps: 0, bestFee: 0, bestDeck: 0,
  pass: false, starter: false, boostEnd: 0, daily: { day: 0, last: '' }, tut: 0, tutVip: false, iap: [],
  rush: 0, rushWait: 90, rushReady: 0, hype: 0, fever: 0, parade: 0, tod: 0.85,
  t: 0, id: 0, spawnT: 0.5, vipT: 40, gate: 0, deckAnim: 0, camSet: false,
  cam: { l: -56, t: 8, r: 734, b: 420 }, view: { z: 1, x: 0, y: 0, user: false },
  cars: [], walkers: [], spots: [], particles: [], fx: [], earn: [], pad: 0, padTarget: 0, w: 400, h: 600,
  tab: 'build', qty: 1, confirmFr: false,
  clouds: [{ x: -6, y: -8, s: 1, v: .22 }, { x: 6, y: 2, s: .8, v: .16 }, { x: 14, y: -4, s: 1.2, v: .2 }, { x: -14, y: 8, s: .9, v: .18 }]
};
var GS = [];   // garage slots: { car, color }
// Only the main lot's bays, the guidance steps, EV chargers and the one-off staff have a ceiling; everything else goes on forever
var MAXL = { space: 2, garage: 99, fee: Infinity, ads: Infinity, gate: Infinity, sign: 3, walk: Infinity, express: Infinity, valet: Infinity, shop: Infinity, wash: Infinity, ev: 6, concierge: 1, promoter: 1, crew: 10, manager: 6 };
var PMAX = { gold: Infinity, head: Infinity, rush: 10, tap: 10, night: 10, sleep: 5, lucky: 10, blue: 4 };

/* ---------- settings: stored apart from the save so they stay per device ---------- */
var SET_KEY = 'littlelot.settings';
var SET = { sfx: true, music: true, haptics: true, daynight: true, notify: true, sci: false };
(function () { try { var j = JSON.parse(localStorage.getItem(SET_KEY) || 'null'); if (j) for (var k in SET) if (typeof j[k] === 'boolean') SET[k] = j[k]; } catch (e) { /* defaults */ } })();
function saveSettings() { try { localStorage.setItem(SET_KEY, JSON.stringify(SET)); } catch (e) { /* ignore */ } }

/* ---------- numbers ---------- */
var SUF = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd', 'Td', 'Qad', 'Qid'];
function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 1000) return String(Math.floor(n + 1e-9));
  if (SET.sci && n >= 1e6) return n.toExponential(2).replace('e+', 'e');
  var e = Math.floor(Math.log10(n) / 3);
  if (e >= SUF.length) return n.toExponential(2).replace('e+', 'e');
  var v = n / Math.pow(1000, e), d = v < 10 ? 2 : v < 100 ? 1 : 0, s = v.toFixed(d);
  if (parseFloat(s) >= 1000 && e + 1 < SUF.length) { e++; v = n / Math.pow(1000, e); s = v.toFixed(2); }
  return s + SUF[e];
}
function fmtX(n) { return n < 100 ? String(Math.round(n * 10) / 10) : fmt(n); }   // multipliers like x1.5
function fmtSmall(n) { return n < 10 ? (Math.round(n * 100) / 100).toString() : fmt(n); }
function fmtRate(r) { return r < 10 ? r.toFixed(1) : fmt(r); }
function fmtTime(s) {
  s = Math.round(s);
  if (s < 90) return s + ' sec';
  if (s < 5400) return Math.round(s / 60) + ' min';
  return (s / 3600).toFixed(1) + ' hours';
}
function fmtClock(s) {
  s = Math.max(0, Math.ceil(s));
  var h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60;
  return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (x < 10 ? '0' : '') + x;
}

/* ---------- the map: every franchise opens the next spot along the road ---------- */
// mods: fee, demand and walk multiply; vip makes golden cars come more often; fever adds seconds of Fever; rush adds seconds of rush hour
var LOCS = [
  { name: 'Maple Street', theme: 'park', mult: 1, perk: 'Where it all began', mods: {} },
  { name: 'Palm Beach', theme: 'beach', mult: 1.25, perk: 'Beach crowds: +25% drivers', mods: { demand: 1.25 } },
  { name: 'Downtown', theme: 'city', mult: 1.5, perk: 'City prices: +30% parking fee', mods: { fee: 1.3 } },
  { name: 'Frosty Peaks', theme: 'snow', mult: 1.75, perk: 'Ski trips: golden cars twice as often', mods: { vip: 2 } },
  { name: 'Cactus Springs', theme: 'desert', mult: 2, perk: 'Wide streets: shoppers walk 30% faster', mods: { walk: 1.3 } },
  { name: 'Neon City', theme: 'neon', mult: 2.5, perk: 'Night life: Fever lasts 6s longer', mods: { fever: 6 } },
  { name: 'Harbor Point', theme: 'harbor', mult: 3, perk: 'Ferry rush: rush hours last 20s longer', mods: { rush: 20 } }
];
function locAt(i) {
  if (i < LOCS.length) return LOCS[i];
  var b = LOCS[1 + (i - 1) % (LOCS.length - 1)], lap = Math.floor((i - 1) / (LOCS.length - 1));
  return { name: b.name + ' ' + ['', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][Math.min(9, lap)], theme: b.theme, mult: 3 + 0.25 * (i - LOCS.length + 1), perk: b.perk, mods: b.mods };
}
function LOC() { return locAt(S.franchises); }
function mod(k, d) { var v = LOC().mods[k]; return v === undefined ? d : v; }

/* ---------- economy ---------- */
function COLS() { return 4 + S.lvl.space; }
// Milestones: every upgrade line with no ceiling pays a bonus at level 10, 25, 50, 75, 100 and every 25 levels after that
function msCount(l) { return l < 10 ? 0 : l < 25 ? 1 : 1 + Math.floor(l / 25); }
function msNext(l) { return l < 10 ? 10 : (Math.floor(l / 25) + 1) * 25; }
function goalCount() { var n = 0, k; for (k in S.goal) n += S.goal[k]; return n; }
function boostOn() { return S.boostEnd > Date.now(); }
// everything that multiplies income and lasts; the timed x2 boost sits on top
function baseMult() { return (1 + 0.35 * S.stars) * Math.pow(1.15, S.perk.gold) * (1 + 0.02 * goalCount()) * LOC().mult * (S.pass ? 2 : 1); }
function mult() { return baseMult() * (boostOn() ? 2 : 1); }
function rushFee() { return S.rush > 0 ? 1.5 : 1; }
function fee() { return 3 * Math.pow(FEEG, S.lvl.fee) * Math.pow(2, msCount(S.lvl.fee)) * (S.lvl.sign >= 3 ? 1.2 : 1) * mod('fee', 1) * mult() * rushFee(); }
// every visit: park, step out, walk to the shops, shop, walk back with a bag, step in, drive off
// speed lines have diminishing returns: each level helps, none ever stops helping
function speedMul() { return 1 + 4 * (1 - Math.pow(0.93, S.lvl.gate)) + 0.06 * S.lvl.sign + 0.5 * (1 - Math.pow(0.9, S.lvl.valet)); }
function walkSpeed() { return 0.8 * (1 + 5 * (1 - Math.pow(0.93, S.lvl.walk))) * mod('walk', 1); }
function doorTime() { return 0.8 / (1 + 0.5 * S.lvl.valet); }
// shop visits shrink towards half a second: curbside pickup
function visitAvg() { return 0.5 + 4.5 * Math.pow(0.93, S.lvl.express); }
function errandTime() { return 0.5 + (2.5 + Math.random() * 4) * Math.pow(0.93, S.lvl.express); }
function tipRate() { return 0.05 * S.lvl.shop * Math.pow(1.3, msCount(S.lvl.shop)); }
function demand() { return Math.min(14, 0.42 * Math.pow(1.06, S.lvl.ads) * Math.pow(1.5, msCount(S.lvl.ads)) * mod('demand', 1)) * (S.rush > 0 ? 2.5 : 1); }
function gapBase() { return 1 / demand(); }
function dwellAvg() { return 2 * doorTime() + 4.8 / walkSpeed() + visitAvg(); }
function dwellGarage() { return dwellAvg() + 21 / walkSpeed(); }   // the garage is a longer walk from the market
// the garage can only go so high until you franchise: a nudge to start over, not a wall
function maxDecks() { return 4 + 3 * S.franchises; }
function garCap() { return S.lvl.garage * PERDECK; }
// car wash: some leaving drivers pull in for a wash that pays a share of the fee
function washChance() { return S.lvl.wash ? Math.min(0.65, 0.2 + 0.025 * (S.lvl.wash - 1)) : 0; }
function washPrice() { return fee() * 0.6 * Math.pow(1.08, S.lvl.wash - 1) * Math.pow(2, msCount(S.lvl.wash)); }
// EV chargers sit on whole columns of bays nearest the gate; a car parked at one pays half again
var EV_BONUS = 0.5;
function evBay(s) { return s.x < 2 + Math.min(S.lvl.ev, COLS()); }
/* ---------- hustle: taps fill the meter, a full meter starts Fever ---------- */
function tapPower() { return 0.055 * (1 + 0.25 * S.perk.tap); }
function feverLen() { return 10 + 2 * S.perk.tap + mod('fever', 0); }
function flow() { return S.fever > 0 ? 2.5 : 1 + 0.9 * S.hype; }
function feverPay() { return S.fever > 0 ? 2 : 1; }
/* ---------- away from the lot ---------- */
function awayRate() { return Math.min(1, 0.4 + 0.08 * S.perk.sleep + 0.05 * S.lvl.manager); }
function awayCap() { return (4 + 2 * S.perk.night) * (S.pass ? 2 : 1) * 3600; }
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
  var fM = Math.min(D, capM), fG = Math.min(D - fM, capG), f = fee() / rushFee();
  var evFrac = Math.min(S.lvl.ev, COLS()) / COLS();
  var wash = Math.min((fM + fG) * washChance(), 0.55 * speedMul()) * (S.lvl.wash ? washPrice() / rushFee() : 0);
  return (fM * (1 + EV_BONUS * evFrac) + fG * GAR_PAY) * f * (1 + tipRate()) + wash;
}
function econBase() { return econRate() / (boostOn() ? 2 : 1); }
var STAR_BASE = 1e6;
// stars come from everything you have ever earned: franchising pays out the stars earned since the last time.
// Lifetime (not per-lot) earnings keep the curve fair: every run is quicker than the last without running away.
function starsTotal() { return Math.floor(Math.pow(S.lifetime / STAR_BASE, 0.25)); }
function starsGain() { return Math.max(0, starsTotal() - S.stars); }
function starAt(n) { return Math.pow(n, 4) * STAR_BASE; }
function headStart() { return S.perk.head ? 200 * Math.pow(3, S.perk.head - 1) : 0; }

/* ---------- save and load ---------- */
// Each account has its own save slot. Guests use littlelot.v1; signed-in players use littlelot.v1.<account id>.
var GUEST_KEY = 'littlelot.v1', saveKey = GUEST_KEY;
function snapshot() {
  return {
    v: 1, money: S.money, totalRun: S.totalRun, lifetime: S.lifetime, stars: S.stars, fr: S.franchises, tok: S.tok, gems: S.gems,
    lvl: S.lvl, perk: S.perk, goal: S.goal, served: S.served, vips: S.vips, rushes: S.rushes, fevers: S.fevers, washes: S.washes, taps: S.taps,
    bestFee: S.bestFee, bestDeck: S.bestDeck, pass: S.pass, starter: S.starter, boostEnd: S.boostEnd, daily: S.daily, tut: S.tut, tutVip: S.tutVip,
    iap: S.iap.slice(-60), time: Date.now()
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
  var k, oldTheme = S.theme;
  S.money = 25; S.totalRun = 0; S.lifetime = 0; S.stars = 0; S.franchises = 0; S.tok = 0; S.gems = 10;
  S.served = 0; S.vips = 0; S.rushes = 0; S.fevers = 0; S.washes = 0; S.taps = 0; S.bestFee = 0; S.bestDeck = 0;
  S.pass = false; S.starter = false; S.boostEnd = 0; S.daily = { day: 0, last: '' }; S.tut = 0; S.tutVip = false; S.iap = [];
  for (k in S.lvl) S.lvl[k] = 0;
  for (k in S.perk) S.perk[k] = 0;
  for (k in S.goal) S.goal[k] = 0;
  if (j) {
    S.money = num(j.money); S.totalRun = num(j.totalRun); S.lifetime = num(j.lifetime);
    S.stars = Math.floor(num(j.stars)); S.franchises = Math.floor(num(j.fr)); S.tok = Math.floor(num(j.tok));
    S.gems = j.gems === undefined ? 10 : Math.floor(num(j.gems));
    S.served = num(j.served); S.vips = num(j.vips); S.rushes = num(j.rushes); S.fevers = num(j.fevers); S.washes = num(j.washes); S.taps = num(j.taps);
    for (k in S.lvl) S.lvl[k] = Math.min(MAXL[k], Math.floor(num(j.lvl && j.lvl[k])));
    if (j.lvl && j.lvl.garage === undefined && j.floors) S.lvl.garage = Math.floor(num(j.floors));   // saves from the stacked-floor version
    S.lvl.garage = Math.min(S.lvl.garage, maxDecks());
    for (k in S.perk) S.perk[k] = Math.min(PMAX[k], Math.floor(num(j.perk && j.perk[k])));
    for (k in S.goal) S.goal[k] = Math.floor(num(j.goal && j.goal[k]));
    S.bestFee = Math.max(S.lvl.fee, num(j.bestFee)); S.bestDeck = Math.max(S.lvl.garage, num(j.bestDeck));
    S.pass = !!j.pass; S.starter = !!j.starter; S.boostEnd = num(j.boostEnd);
    if (j.daily) S.daily = { day: Math.floor(num(j.daily.day)) % 7, last: String(j.daily.last || '') };
    // players from before the tutorial already know the lot
    S.tut = j.tut === undefined ? (S.lifetime > 500 ? 99 : 0) : Math.floor(num(j.tut)); S.tutVip = !!j.tutVip || S.vips > 0;
    if (Array.isArray(j.iap)) S.iap = j.iap.filter(function (x) { return typeof x === 'string'; });
  }
  S.spots = []; ensureSpots(); GS = []; ensureSlots();
  S.deckAnim = S.lvl.garage; S.camSet = false; S.rush = 0; S.rushReady = 0; S.rushWait = 90; S.hype = 0; S.fever = 0; S.parade = 0;
  S.theme = LOC().theme; if (S.theme !== oldTheme) buildDecor();
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
// oriented box for things that turn (cars): centre cx,cy, heading ang, half length hl, half width hw.
// The top can shrink (tl, tw) and slide along the heading (off). side(i) picks a colour per face: 0 front, 1 left, 2 back, 3 right.
var OB_SX = [1, 1, -1, -1], OB_SY = [-1, 1, 1, -1];
function obox(cx, cy, ang, hl, hw, z0, z1, tl, tw, off, top, side) {
  var ca = Math.cos(ang), sa = Math.sin(ang), b = [], t = [], i, fs = [];
  for (i = 0; i < 4; i++) {
    var u = OB_SX[i] * hl, v = OB_SY[i] * hw, ut = off + OB_SX[i] * hl * tl, vt = OB_SY[i] * hw * tw;
    b.push({ x: cx + ca * u - sa * v, y: cy + sa * u + ca * v }); t.push({ x: cx + ca * ut - sa * vt, y: cy + sa * ut + ca * vt });
  }
  for (i = 0; i < 4; i++) {
    var j = (i + 1) % 4, nx = (b[i].x + b[j].x) / 2 - cx, ny = (b[i].y + b[j].y) / 2 - cy, l = Math.hypot(nx, ny) || 1;
    nx /= l; ny /= l;
    if (nx + ny <= 0.02) continue;   // faces away from the camera
    var px = Math.max(0, nx), py = Math.max(0, ny), k = (FR * px + FL * py) / (px + py);
    fs.push({ d: nx + ny, i: i, j: j, k: k });
  }
  fs.sort(function (p, q) { return p.d - q.d; });
  fs.forEach(function (f) {
    var face = f.i === 0 ? 0 : f.i === 1 ? 1 : f.i === 2 ? 2 : 3;
    poly([P(b[f.i].x, b[f.i].y, z0), P(b[f.j].x, b[f.j].y, z0), P(t[f.j].x, t[f.j].y, z1), P(t[f.i].x, t[f.i].y, z1)], shade(side(face), f.k));
  });
  poly([P(t[0].x, t[0].y, z1), P(t[1].x, t[1].y, z1), P(t[2].x, t[2].y, z1), P(t[3].x, t[3].y, z1)], shade(top, FT));
  return b;
}
// a point on a turned car: along the heading by u, across by v
function orel(cx, cy, ang, u, v) { var ca = Math.cos(ang), sa = Math.sin(ang); return { x: cx + ca * u - sa * v, y: cy + sa * u + ca * v }; }
function mix(a, b, t) {
  var x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
  var r = (x >> 16) + ((y >> 16) - (x >> 16)) * t, g = ((x >> 8) & 255) + (((y >> 8) & 255) - ((x >> 8) & 255)) * t, bl = (x & 255) + ((y & 255) - (x & 255)) * t;
  return '#' + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(bl)).toString(16).slice(1);
}
// soft light for the night pass (drawn with 'lighter')
function glow(x, y, r, col, a) {
  var g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1;
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

/* ---------- cars ---------- */
var moneyChanged = true;
var HEAD_ANG = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
function makeCar(spot, parked, vip) {
  var cx = spot.x + .5, cy = spot.y + .5, type = vip ? 'limo' : pickCar(), hd = parked ? (spot.row === 'N' ? 3 : 1) : 0;
  var c = {
    id: ++S.id, fl: 0, vip: !!vip, spot: spot, hx: 0, hy: 0, type: type, color: carColor(type), v: 0, ang: HEAD_ANG[hd],
    x: parked ? cx : SPAWNX, y: parked ? cy : 2.5, heading: hd,
    state: parked ? 'parked' : 'in', path: parked ? [] : [{ x: cx, y: 2.5 }, { x: cx, y: cy, stop: true }],
    timer: 0, phase: 0, moving: false
  };
  spot.car = c; S.cars.push(c); return c;
}
// a driver who heads for the garage: reserves a slot, turns in off the road and disappears inside
function makeGarCar(slot, parked) {
  var type = pickCar(), col = carColor(type);
  var c = {
    id: ++S.id, fl: 0, g: true, gi: slot, vip: false, spot: null, hx: 0, hy: 0, color: col, type: type, v: 0, ang: 0, door: 2 + Math.floor(Math.random() * COLS()),
    x: parked ? GOUT : SPAWNX, y: parked ? GY1 : 2.5, heading: 0, state: parked ? 'ghide' : 'gin',
    path: parked ? [] : [{ x: GIN, y: 2.5 }, { x: GIN, y: GY1, stop: true }], timer: 0, phase: 0, moving: false
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
      var tip = fee() * tipRate() * (w.g ? GAR_PAY : 1) * feverPay();
      if (tip > 0) { earn(tip); popText(w.x, .88, '+' + fmtSmall(tip)); }
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
function queueCar() {
  var type = pickCar();
  var q = { id: ++S.id, fl: 0, vip: false, spot: null, hx: 0, hy: 0, type: type, color: carColor(type), v: 0, ang: 0, x: SPAWNX, y: 2.5, heading: 0, state: 'wait', path: [{ x: -3.9, y: 2.5, stop: true }], timer: 28, phase: 0, moving: false };
  S.cars.push(q);
}
function entranceBusy() { return S.cars.some(function (c) { return !HIDDEN[c.state] && c.x < SPAWNX + 2.3 && Math.abs(c.y - 2.5) < .6; }); }
// drivers fill the main lot first and spill into the garage when it is busy (some like the covered bays anyway)
function spawn(vip) {
  var free = S.spots.filter(function (s) { return unlocked(s) && !s.car; }), gf = vip ? 0 : garFree();
  var queued = S.cars.filter(function (c) { return c.state === 'wait'; }).length;
  if ((!free.length && !gf) || queued) {   // everything is full: the driver joins the queue on the street
    if (vip || queued >= 5 || entranceBusy()) return false;
    queueCar();
    if (S.t - lastBackup > 45 && S.tut >= TUT.length) { lastBackup = S.t; note('Lot full! Cars are backing up. Build more space, or speed up shop visits.'); }
    return true;
  }
  if (entranceBusy()) { S.spawnT = Math.min(S.spawnT, 0.3); return false; }
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
  return Math.abs(c.y - 2.5) < .7 && walkerInLane(c.x - .1, c.x + 1.1);
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
// leaving drivers head east; some pull into the car wash on the way
function exitRoute(x) {
  var washing = S.cars.filter(function (c) { return c.washing; }).length;
  if (S.lvl.wash && x < WIN - .3 && washing < 3 && Math.random() < washChance())
    return [{ x: WIN, y: 2.5 }, { x: WIN, y: WY }, { x: WOUT, y: WY, washEnd: true }, { x: WOUT, y: 2.5, join: true }, { x: 14.5, y: 2.5 }];
  return [{ x: 14.5, y: 2.5 }];
}
function addMoney(a) { S.money += a; S.totalRun += a; S.lifetime += a; moneyChanged = true; }
// steady income (cars, tips, washes, taps) also feeds the $/s readout; one-off bonuses do not
function earn(a) { addMoney(a); S.earn.push({ t: S.t, v: a }); }
function popText(x, y, txt, big) { S.particles.push({ x: x, y: y, fl: 0, t: 0, txt: txt, big: !!big }); }
function payCar(c) {
  var ev = !c.g && c.spot && evBay(c.spot);
  var a = fee() * (c.vip ? 3 : 1) * (c.g ? GAR_PAY : 1) * (ev ? 1 + EV_BONUS : 1) * feverPay();
  earn(a); S.served++;
  popText(c.x, c.g ? 1 : c.y, '+' + fmtSmall(a));
  sfx('coin');
}
function payWash(c) {
  var a = washPrice() * feverPay();
  earn(a); S.washes++;
  popText(WX1, WY, '+' + fmtSmall(a));
}
function turnTo(c, want, dt) {
  var d = want - c.ang;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  c.ang += d * Math.min(1, dt * 9);
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
      else { payCar(c); c.state = 'gwait'; c.x = GOUT; c.y = GY1; c.ang = Math.PI / 2; c.v = 0; }
    }
    return;
  }
  if (c.state === 'gwait') {   // waits at the garage exit for a gap in the traffic
    if (roadClearFor(c)) { GS[c.gi].car = null; c.state = 'gout'; c.heading = 1; c.path = [{ x: GOUT, y: 2.5 }].concat(exitRoute(GOUT)); c.washing = c.path.length > 2; }
    return;
  }
  if (c.state === 'wantout') {
    if (roadClearFor(c)) { c.state = 'out'; c.path = [{ x: c.x, y: 2.5, rev: true }].concat(exitRoute(c.x)); c.washing = c.path.length > 2; }
    return;
  }
  if (c.state === 'wait') {
    var front = true, i;
    for (i = 0; i < S.cars.length; i++) if (S.cars[i].state === 'wait' && S.cars[i].x > c.x) front = false;
    var fs = front ? S.spots.filter(function (s) { return unlocked(s) && !s.car; }) : [];
    if (fs.length) {   // a bay opened up
      var sp = fs[Math.floor(Math.random() * fs.length)];
      sp.car = c; c.spot = sp; c.state = 'in'; c.path = [{ x: sp.x + .5, y: 2.5 }, { x: sp.x + .5, y: sp.y + .5, stop: true }]; c.timer = 0;
    } else if (c.x < GIN - .7 && garFree() > 0) {   // or a garage bay, if they have not passed the garage yet
      var open = [];
      for (i = 0; i < garCap(); i++) if (!GS[i].car) open.push(i);
      var gi = open[Math.floor(Math.random() * open.length)];
      c.g = true; c.gi = gi; c.door = 2 + Math.floor(Math.random() * COLS()); GS[gi].car = c; GS[gi].color = c.color;
      c.state = 'gin'; c.path = [{ x: GIN, y: 2.5 }, { x: GIN, y: GY1, stop: true }];
    } else if (!c.moving) {
      c.timer -= dt;
      if (c.timer <= 0) { c.state = 'leave'; c.path = [{ x: 14.5, y: 2.5 }]; S.lost = (S.lost || 0) + 1; popText(c.x, 2.5, 'Full!'); }
    }
    if (c.state === 'wait' && !c.path[0]) { c.v = 0; return; }
  }
  var tg = c.path[0];
  if (!tg) {
    if (c.state === 'in') { c.state = 'parked'; c.phase = 0; c.timer = doorTime(); c.v = 0; c.heading = c.spot.row === 'N' ? 3 : 1; }
    else if (c.state === 'gin') { c.state = 'ghide'; c.phase = 0; c.timer = doorTime(); c.v = 0; }
    return;
  }
  var dx = tg.x - c.x, dy = tg.y - c.y, dist = Math.hypot(dx, dy), roadLeg = Math.abs(dx) > Math.abs(dy);
  if (!tg.rev) c.heading = roadLeg ? (dx > 0 ? 0 : 2) : (dy > 0 ? 1 : 3);
  if (roadLeg && blockedAhead(c)) { c.v = 0; return; }
  if (c.state === 'gout' && !roadLeg && c.y > 1.0 && c.y < 1.8 && !roadClearFor(c)) { c.v = 0; return; }   // do not pull out in front of traffic
  if (tg.join && c.y > 3.3 && !roadClearFor(c)) { c.v = 0; return; }   // out of the wash: wait for a gap
  var vt = (roadLeg || c.g ? 2.1 : 1.2) * speedMul() * (tg.rev ? .7 : 1);
  if (c.path.length === 1 || tg.stop) vt = Math.min(vt, .45 + dist * 3);   // ease into the bay
  c.v += (vt - c.v) * Math.min(1, dt * 4.5);
  var st = c.v * dt;
  c.moving = st > 0.0005;
  if (dist > 0.001) turnTo(c, Math.atan2(dy, dx) + (tg.rev ? Math.PI : 0), dt);
  // round the corners: start on the next leg a little early
  var cut = (c.path.length > 1 && !tg.rev && !tg.stop && !tg.join) ? .22 : 0;
  if (dist <= st + cut) {
    if (!cut) { c.x = tg.x; c.y = tg.y; } else { c.x += dx / dist * Math.min(st, dist); c.y += dy / dist * Math.min(st, dist); }
    c.path.shift();
    if (tg.rev && c.spot) { c.spot.car = null; c.spot = null; }
    if (tg.washEnd) { c.inWash = false; c.washing = false; }
  } else { c.x += dx / dist * st; c.y += dy / dist * st; }
  if (c.washing && Math.abs(c.y - WY) < .3) {
    var inside = c.x > WX0 - .1 && c.x < WX1 + .1;
    if (c.inWash && c.x >= WX1 && !c.washPaid) { c.washPaid = true; payWash(c); }
    c.inWash = inside;
  }
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

/* ---------- hustle: taps, Fever and the golden cars ---------- */
function startFever() {
  S.fever = feverLen(); S.hype = 1; S.fevers++;
  sfx('fever'); buzz('heavy'); moneyChanged = true;
  for (var i = 0; i < 26; i++) S.fx.push({ kind: 'conf', x: Math.random(), y: -.05 - Math.random() * .2, t: 0, vx: (Math.random() - .5) * .2, vy: .25 + Math.random() * .35, c: SHIRT[i % SHIRT.length], r: Math.random() * 6 });
}
// a tap on the lot: everyone hurries, and a few coins drop
function tapLot(lx, ly) {
  S.taps++;
  S.fx.push({ kind: 'ring', lx: lx, ly: ly, t: 0 });
  var coin = fee() * 0.04 * feverPay();
  earn(coin);
  S.fx.push({ kind: 'tapc', lx: lx, ly: ly, t: 0, txt: '+' + fmtSmall(coin) });
  if (S.fever <= 0) { S.hype = Math.min(1, S.hype + tapPower()); if (S.hype >= 1) startFever(); }
  sfx('tap', S.hype); buzz('light');
  tutEvent('tap');
}
function vipBonus() { return Math.max(fee() * 25, econRate() * 45) * (1 + 0.3 * S.perk.lucky); }
function collectVip(c) {
  var bonus = vipBonus();
  addMoney(bonus); c.vip = false; S.vips++;
  popText(c.x, c.y, '+' + fmt(bonus), true);
  if (Math.random() < .3) { S.gems++; S.fx.push({ kind: 'gem', x: c.x, y: c.y, t: 0 }); }
  sfx('vip'); buzz('medium'); save();
}
function vipGap() { return (55 + Math.random() * 60) / (1 + 0.2 * S.perk.lucky) / mod('vip', 1); }
function tickHype(dt) {
  if (S.fever > 0) {
    S.fever -= dt; S.hype = Math.max(0, S.fever / feverLen());
    if (S.fever <= 0) { S.fever = 0; S.hype = 0; moneyChanged = true; }
    return;
  }
  S.hype = Math.max(0, Math.min(1, S.hype + (0.006 * S.lvl.crew - (0.1 * S.hype + 0.025)) * dt));
}

/* ---------- frame ---------- */
function update(dt) {
  S.t += dt;
  tickHype(dt);
  var fdt = dt * flow();   // the whole lot runs faster while it hustles
  S.spawnT -= fdt;
  if (S.spawnT <= 0) { spawn(false); if (S.spawnT <= 0) S.spawnT = gapBase() * (.75 + Math.random() * .5); }
  S.vipT -= dt;
  if (S.parade > 0 && S.vipT > 3) S.vipT = 3;
  if (S.vipT <= 0) {
    var ok = spawn(true);
    if (ok && S.parade > 0) S.parade--;
    S.vipT = ok ? (S.parade > 0 ? 3 : vipGap()) : 6;
  }
  S.walkers.forEach(function (w) { stepWalker(w, fdt); });
  S.walkers = S.walkers.filter(function (w) { return !w.done; });
  S.cars.forEach(function (c) {
    stepCar(c, fdt);
    if (c.vip && !HIDDEN[c.state]) {
      c.vt = (c.vt || 0) + dt;
      if (c.vt > 1 && !S.tutVip && S.tut >= TUT.length) { S.tutVip = true; tip('Tap the golden car for a big bonus!', 6); }
      if (S.lvl.concierge && c.vt > 2.5) collectVip(c);
    }
  });
  S.cars = S.cars.filter(function (c) { return !((c.state === 'out' || c.state === 'gout' || c.state === 'leave') && c.x >= 14.4); });
  var open = S.cars.some(function (c) { return (c.state === 'in' || c.state === 'gout') && c.heading === 0 && c.x > -4.7 && c.x < -2.4; });
  S.gate += ((open ? 1 : 0) - S.gate) * Math.min(1, dt * 7);
  S.particles.forEach(function (p) { p.t += dt; });
  S.particles = S.particles.filter(function (p) { return p.t < 1.2; });
  S.fx.forEach(function (f) { f.t += dt; });
  S.fx = S.fx.filter(function (f) { return f.t < (f.kind === 'conf' ? 3 : f.kind === 'bub' ? 1.4 : f.kind === 'gem' ? 1.4 : .7); });
  S.pad += (S.padTarget - S.pad) * Math.min(1, dt * 8);
  var dd = S.lvl.garage - S.deckAnim; S.deckAnim += Math.abs(dd) < .01 ? dd : dd * Math.min(1, dt * 2.2) + Math.sign(dd) * Math.min(Math.abs(dd), dt * .35);
  if (SET.daynight) S.tod = (S.tod + dt / 480) % 1;   // an eight-minute day
  S.clouds.forEach(function (c) { c.x += c.v * dt; if (c.x > 30) c.x = -30; });
  if (S.lvl.promoter && S.rushReady > 0) startRush();
  stepCam(dt); tickMeta(dt);
}
/* ---------- goals, rush hour and franchise perks: the reasons to keep playing ---------- */
var GDEF = {
  cars: { name: 'Happy drivers', tint: '#bde6ff', tgt: function (t) { return Math.round(30 * Math.pow(2.5, t)); }, val: function () { return S.served; }, txt: function (n) { return 'Park ' + fmt(n) + ' cars'; } },
  cash: { name: 'Big earner', tint: '#ffe38a', tgt: function (t) { return 2000 * Math.pow(4.5, t); }, val: function () { return S.lifetime; }, txt: function (n) { return 'Earn $' + fmt(n) + ' in total'; } },
  fee: { name: 'Price setter', tint: '#ffd9c7', tgt: function (t) { return 5 * (t + 1); }, val: function () { return S.bestFee; }, txt: function (n) { return 'Reach parking fee level ' + n; } },
  fever: { name: 'Fever pitch', tint: '#ffc7e8', tgt: function (t) { return Math.round(2 * Math.pow(1.9, t)); }, val: function () { return S.fevers; }, txt: function (n) { return 'Hit Fever ' + n + ' times'; } },
  deck: { name: 'Sky high', tint: '#e3d9ff', tgt: function (t) { return t + 1; }, val: function () { return S.bestDeck; }, txt: function (n) { return 'Build garage floor ' + n; } },
  vip: { name: 'Meet and greet', tint: '#fff0a8', tgt: function (t) { return Math.round(3 * Math.pow(1.9, t)); }, val: function () { return S.vips; }, txt: function (n) { return 'Tap ' + n + ' golden cars'; } },
  wash: { name: 'Squeaky clean', tint: '#c7f0ff', tgt: function (t) { return Math.round(25 * Math.pow(2.4, t)); }, val: function () { return S.washes; }, txt: function (n) { return 'Wash ' + fmt(n) + ' cars'; } },
  rush: { name: 'Rush job', tint: '#ffc7bd', tgt: function (t) { return Math.round(2 * Math.pow(1.8, t)); }, val: function () { return S.rushes; }, txt: function (n) { return 'Ride out ' + n + ' rush hours'; } },
  star: { name: 'Chain owner', tint: '#d6f0c8', tgt: function (t) { return Math.round(3 * Math.pow(1.7, t)); }, val: function () { return S.stars; }, txt: function (n) { return 'Collect ' + n + ' franchise stars'; } }
};
var GORDER = ['cars', 'cash', 'fee', 'fever', 'deck', 'vip', 'wash', 'rush', 'star'];
var GOAL_GEMS = 3;
function goalTarget(k) { return GDEF[k].tgt(S.goal[k]); }
function goalReady(k) { return GDEF[k].val() >= goalTarget(k); }
function goalsReady() { var n = 0; GORDER.forEach(function (k) { if (goalReady(k)) n++; }); return n; }
function goalCash() { return Math.max(econRate() * 90, fee() * 10); }
function claimGoal(k) {
  if (!goalReady(k)) return false;
  var cash = goalCash(); S.goal[k]++; addMoney(cash); S.gems += GOAL_GEMS;
  note('Goal complete! +2% income forever, $' + fmt(cash) + ' and ' + GOAL_GEMS + ' gems');
  sfx('claim'); buzz('medium');
  return true;
}
// rush hour: now and then a rush is on offer; taking it brings a wave of extra drivers who pay more
function rushLen() { return 40 + 10 * S.perk.rush + mod('rush', 0); }
function rushGap() { return (150 + Math.random() * 90) * Math.pow(.93, S.perk.rush); }
function startRush() {
  if (S.rushReady <= 0) return false;
  S.rushReady = 0; S.rush = rushLen(); S.rushes++; S.spawnT = 0; moneyChanged = true;
  sfx('rush');
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
var BLUE = ['Start with every bay built', '...and all the guidance signs', '...and one garage floor', '...and a car wash and 2 EV columns'];
var PDEF = {
  gold: { name: 'Golden rates', tint: '#ffe38a', icon: 'fee', cost: function (l) { return Math.ceil(2 * Math.pow(1.8, l)); }, now: function () { return 'All income x' + Math.pow(1.15, S.perk.gold).toFixed(2); }, next: 'All income +15%' },
  head: { name: 'Head start', tint: '#d6f0c8', icon: 'space', cost: function (l) { return Math.ceil(Math.pow(3, l)); }, now: function () { return S.perk.head ? 'New lots start with $' + fmt(25 + headStart()) : 'New lots start with $25'; }, next: 'Start each franchise with 3x more cash' },
  tap: { name: 'Hustle', tint: '#ffc7e8', icon: 'tap', cost: function (l) { return Math.ceil(2 * Math.pow(1.6, l)); }, now: function () { return 'Taps +' + Math.round(25 * S.perk.tap) + '%, Fever ' + feverLen() + 's'; }, next: 'Taps fill the meter 25% faster, Fever +2s' },
  lucky: { name: 'Lucky drivers', tint: '#fff0a8', icon: 'goal', cost: function (l) { return Math.ceil(2 * Math.pow(1.75, l)); }, now: function () { return 'Golden cars pay x' + (1 + 0.3 * S.perk.lucky).toFixed(1); }, next: 'Golden cars +20% more often, +30% bonus' },
  rush: { name: 'Rush master', tint: '#ffc7bd', icon: 'ads', cost: function (l) { return Math.ceil(2 * Math.pow(1.7, l)); }, now: function () { return 'Rush hours last ' + rushLen() + 's'; }, next: '+10s of rush, and rushes come sooner' },
  night: { name: 'Night watch', tint: '#d9e4ff', icon: 'moon', cost: function (l) { return Math.ceil(1.5 * Math.pow(1.9, l)); }, now: function () { return 'Earn while away for ' + Math.round(awayCap() / 3600) + ' hours'; }, next: '+2 hours of away earnings' },
  sleep: { name: 'Overnight rates', tint: '#e3d9ff', icon: 'moon', cost: function (l) { return Math.ceil(3 * Math.pow(2, l)); }, now: function () { return 'Away earnings at ' + Math.round(awayRate() * 100) + '%'; }, next: 'Earn 8% more while away' },
  blue: { name: 'Blueprints', tint: '#c9f2d9', icon: 'garage', cost: function (l) { return [3, 8, 20, 50][l] || Infinity; }, now: function () { return S.perk.blue ? BLUE[S.perk.blue - 1] : 'New lots start empty'; }, next: '' }
};
var PORDER = ['gold', 'head', 'tap', 'lucky', 'rush', 'night', 'sleep', 'blue'];
function perkNext(k) { return k === 'blue' ? (BLUE[S.perk.blue] || '') : PDEF[k].next; }
function buyPerk(k) {
  if (S.perk[k] >= PMAX[k]) return false;
  var c = PDEF[k].cost(S.perk[k]); if (S.tok < c) return false;
  S.tok -= c; S.perk[k]++; moneyChanged = true; sfx('buy'); return true;
}
// what blueprints build before the first car arrives
function applyBlueprints() {
  var b = S.perk.blue;
  if (b >= 1) S.lvl.space = MAXL.space;
  if (b >= 2) S.lvl.sign = MAXL.sign;
  if (b >= 3) S.lvl.garage = 1;
  if (b >= 4) { S.lvl.wash = 1; S.lvl.ev = 2; }
}

/* ---------- boosts, gems and the daily gift ---------- */
var BOOST_MAX = 48 * 3600 * 1000;
function addBoost(sec) {
  var now = Date.now();
  S.boostEnd = Math.min(now + BOOST_MAX, Math.max(now, S.boostEnd) + sec * 1000); moneyChanged = true;
}
function warp(sec) { var a = econBase() * sec; addMoney(a); return a; }
// gem shop: things to spend gems on; every one helps the run you are on
var SHOP = {
  boost1: { name: 'Double income', sub: 'x2 income for 1 hour', cost: 30, tint: '#ffe38a', icon: 'fee', buy: function () { addBoost(3600); return 'x2 income for an hour!'; } },
  warp1: { name: 'Time warp', sub: function () { return 'Get 1 hour of earnings now: $' + fmt(econBase() * 3600); }, cost: 40, tint: '#d9e4ff', icon: 'express', buy: function () { return '+$' + fmt(warp(3600)); } },
  fever: { name: 'Instant Fever', sub: function () { return feverLen() + 's of double speed and double cash'; }, cost: 6, tint: '#ffc7e8', icon: 'tap', buy: function () { if (S.fever > 0) return false; startFever(); return 'Fever!'; } },
  parade: { name: 'Golden parade', sub: '5 golden cars, one after another', cost: 15, tint: '#fff0a8', icon: 'goal', buy: function () { S.parade += 5; S.vipT = 0; return 'Golden cars on the way!'; } },
  boost4: { name: 'Double income', sub: 'x2 income for 4 hours', cost: 100, tint: '#ffe38a', icon: 'fee', buy: function () { addBoost(4 * 3600); return 'x2 income for 4 hours!'; } },
  warp8: { name: 'Big time warp', sub: function () { return 'Get 8 hours of earnings now: $' + fmt(econBase() * 8 * 3600); }, cost: 240, tint: '#d9e4ff', icon: 'express', buy: function () { return '+$' + fmt(warp(8 * 3600)); } }
};
var SORDER = ['boost1', 'warp1', 'fever', 'parade', 'boost4', 'warp8'];
function buyShop(k) {
  var it = SHOP[k];
  if (S.gems < it.cost) { sfx('no'); return false; }
  var msg = it.buy(); if (msg === false) return false;
  S.gems -= it.cost; sfx('buy'); buzz('medium'); note(msg); save(); return true;
}
function dayKey(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function today() { return dayKey(new Date()); }
function yesterday() { var d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); }
var DAILY = [
  { txt: 'Cash', icon: 'fee', give: function () { var a = Math.max(500, econBase() * 900); addMoney(a); return '$' + fmt(a); } },
  { txt: '10 gems', icon: 'gem', give: function () { S.gems += 10; return '10 gems'; } },
  { txt: 'x2 for 1h', icon: 'fee', give: function () { addBoost(3600); return 'x2 income for 1 hour'; } },
  { txt: '15 gems', icon: 'gem', give: function () { S.gems += 15; return '15 gems'; } },
  { txt: '2h warp', icon: 'express', give: function () { var a = Math.max(2000, warp(7200)); return '$' + fmt(a); } },
  { txt: '20 gems', icon: 'gem', give: function () { S.gems += 20; return '20 gems'; } },
  { txt: '50 gems', icon: 'gem', big: true, give: function () { S.gems += 50; S.parade += 3; S.vipT = Math.min(S.vipT, 4); return '50 gems and a golden parade'; } }
];
// the streak carries on if you came back yesterday; miss a day and it starts again at day 1
function dailyDay() { return S.daily.last === yesterday() ? S.daily.day : 0; }
function dailyReady() { return S.daily.last !== today(); }
function claimDaily() {
  if (!dailyReady()) return null;
  var d = dailyDay(), msg = DAILY[d].give();
  if (S.pass) { S.gems += 5; msg += ' (+5 Golden Pass gems)'; }
  S.daily = { day: (d + 1) % 7, last: today() };
  sfx('claim'); buzz('medium'); save();
  return msg;
}
/* ---------- the world: one big ground that fills the screen, dressed for each spot on the map ---------- */
// ground: three tile colours; bg: the sky-to-ground fill; mix: decor weights; water: sea past this y
var THEMES = {
  park: { ground: ['#93d86d', '#9bde75', '#a6e27f'], bg: ['#a9e585', '#8bd566'], mix: { house: 3, pine: 2.3, tree: 1.5, bush: 1 }, towers: .38 },
  beach: { ground: ['#f3dfa2', '#f6e4ad', '#ead08c'], bg: ['#ffeec0', '#f0d58e'], mix: { palm: 4, umbrella: 1.5, house: 2.2, rock: .6 }, towers: .2, water: 8.6 },
  city: { ground: ['#b9c0cf', '#c2c8d6', '#aeb6c6'], bg: ['#c9d0dd', '#b0b8c8'], mix: { tower: 5, tree: 2, bush: 1 }, towers: .7 },
  snow: { ground: ['#eef5ff', '#e4eefb', '#f8fbff'], bg: ['#f4f9ff', '#dfeaf8'], mix: { snowpine: 5, house: 2.2, rock: .8 }, towers: .2, roof: '#f4f8ff' },
  desert: { ground: ['#f0c98a', '#ecc07c', '#f5d39c'], bg: ['#f8dca6', '#eabf7a'], mix: { cactus: 4, rock: 2.5, house: 2 }, towers: .1, wall: ['#f4c9a0', '#e8b48a', '#f7dcb8'] },
  neon: { ground: ['#3d3768', '#433d72', '#383262'], bg: ['#3b3470', '#26214a'], mix: { neon: 5, tree: 1.5, bush: 1 }, towers: .7, night: .65 },
  harbor: { ground: ['#8fd3a0', '#97d9a8', '#86cb98'], bg: ['#9fdcb0', '#7fc898'], mix: { box: 3, house: 2, tree: 1.5, pine: 1 }, towers: .3, water: 8.6 }
};
function TH() { return THEMES[S.theme] || THEMES.park; }
var DECOR = [];
function buildDecor() {
  var th = TH(), seed = 11, out = [], x, y, k, tot = 0;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  function pick() { var r = rnd() * tot; for (k in th.mix) { r -= th.mix[k]; if (r <= 0) return k; } return 'bush'; }
  for (k in th.mix) tot += th.mix[k];
  var PASTEL = th.wall || ['#ffd9b8', '#cfe8ff', '#ffe8a8', '#e0d4ff', '#ffc9d6', '#c9f2d9'], ROOF = ['#ff7a6b', '#5d7bd8', '#e0a63a', '#8b6bd0', '#d8566e'];
  var TOW = S.theme === 'neon' ? ['#5a4fa0', '#4a3f8a', '#6a4fa8', '#3f4a8a'] : ['#7fb5ff', '#ffb27a', '#b79bff', '#ff9ccf', '#6fd6c4', '#ffd04a'];
  var NEON = ['#ff4fd8', '#4ff0ff', '#ffe14f', '#7dff6a'], UMB = ['#ff7a6b', '#5db8ff', '#ffd04a', '#ff9ccf'], BOX = ['#ff7a6b', '#3d8bff', '#ffd04a', '#5fd6a4', '#b79bff'];
  for (x = -22; x <= 30; x += 3.4) for (y = -22; y <= 30; y += 3.4) {
    var px = x + (rnd() - .5) * 1.8, py = y + (rnd() - .5) * 1.8;
    if (px > -9 && px < 14.5 && py > -2.8 && py < 7.8) continue;   // keep the lot and the car wash clear
    if (px > -13 && px < -0.5 && py > -9 && py < 1.4) continue;     // the plot for the garage
    if (py > .9 && py < 4.1) continue;                              // keep the road clear
    if (px > 6 && px < 17 && py < 1) continue;                      // nothing tall right behind the market
    if (th.water && py > th.water - .8) continue;                   // the sea
    if (rnd() < .5) continue;
    var r = rnd(), back = py < -2.6, d = { x: px, y: py }, t = (back && r < th.towers) ? 'tower' : pick();
    if (t === 'tower' || t === 'neon') { d.t = t; d.w = 1.4 + rnd() * 1.2; d.d = 1.3 + rnd() * 1; d.h = (back ? 70 : 40) + rnd() * (back ? 90 : 60); d.c = TOW[Math.floor(rnd() * TOW.length)]; d.n = NEON[Math.floor(rnd() * 4)]; }
    else if (t === 'house') { d.t = 'house'; d.w = 1.6; d.d = 1.3; d.h = 22 + rnd() * 8; d.c = PASTEL[Math.floor(rnd() * PASTEL.length)]; d.r = th.roof || ROOF[Math.floor(rnd() * 5)]; }
    else if (t === 'umbrella') { d.t = t; d.c = UMB[Math.floor(rnd() * 4)]; }
    else if (t === 'box') { d.t = t; d.n = 1 + Math.floor(rnd() * 3); d.cs = [BOX[Math.floor(rnd() * 5)], BOX[Math.floor(rnd() * 5)], BOX[Math.floor(rnd() * 5)]]; }
    else { d.t = t; d.s = .8 + rnd() * .5; }
    out.push(d);
  }
  // greenery that frames the entrance, in the local style
  var fr = { park: ['tree', 'pine'], beach: ['palm', 'palm'], city: ['tree', 'bush'], snow: ['snowpine', 'snowpine'], desert: ['cactus', 'rock'], neon: ['tree', 'bush'], harbor: ['tree', 'pine'] }[S.theme] || ['tree', 'pine'];
  [[-2.4, -1.2, 1.1], [-1.4, -1.8, 1], [-6.8, 5.6, 1.1], [15.2, 0.4, 1.1], [15.4, 6.2, 1.1]].forEach(function (p, i) { out.push({ t: fr[i % 2], x: p[0], y: p[1], s: p[2] }); });
  DECOR = out;
}
function isFront(d) { return d.y > 5.3 || (d.x > 10.3 && d.y > 1); }
function drawDecor(d) {
  switch (d.t) {
    case 'pine': drawPine(d.x, d.y, d.s); break;
    case 'tree': drawTree(d.x, d.y, d.s); break;
    case 'bush': drawBush(d.x, d.y); break;
    case 'house': drawHouse(d); break;
    case 'palm': drawPalm(d.x, d.y, d.s); break;
    case 'snowpine': drawSnowPine(d.x, d.y, d.s); break;
    case 'cactus': drawCactus(d.x, d.y, d.s); break;
    case 'rock': drawRock(d.x, d.y, d.s, S.theme === 'desert' ? '#d9a56e' : null); break;
    case 'umbrella': drawUmbrella(d.x, d.y, d.c); break;
    case 'box': drawContainers(d); break;
    case 'neon': drawNeonTower(d); break;
    default: drawTower(d);
  }
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
  var th = TH(), G = th.ground;
  for (x = gx0; x < gx1; x += 2) for (y = gy0; y < gy1; y += 2) {
    if (th.water && y >= th.water) continue;
    var h = ((x * 7 + y * 13) % 5 + 5) % 5, col = ((x + y) / 2 & 1) ? G[0] : G[1];
    if (h === 0) col = G[2];
    poly([P(x, y), P(x + 2, y), P(x + 2, y + 2), P(x, y + 2)], col);
  }
  if (th.water) {   // shoreline and sea with drifting wave lines
    var wy = th.water;
    poly([P(gx0, wy - .4), P(gx1, wy - .4), P(gx1, wy + .2), P(gx0, wy + .2)], '#f6e7b8');
    poly([P(gx0, wy + .2), P(gx1, wy + .2), P(gx1, gy1 + 4), P(gx0, gy1 + 4)], '#5fc6ec');
    var off = REDUCE ? 0 : (S.t * .25) % 3;
    for (x = gx0; x < gx1; x += 3) for (y = wy + 1; y < gy1 + 4; y += 1.6) {
      var xx = x + off + (y * 1.7) % 3;
      line(P(xx, y), P(xx + .8, y), 2, 'rgba(255,255,255,.45)');
    }
    if (S.theme === 'harbor') { prism(1, wy - .3, 0, 9, wy + .6, 6, '#b9a58a'); for (x = 1.5; x < 9; x += 1.5) prism(x, wy + .45, 0, x + .12, wy + .57, 14, '#7a6a56'); }
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
  if (S.lvl.wash) drawWashGround();
  drawCloudShadows();
}


// soft shadows of passing clouds slide across the whole scene
function drawCloudShadows() {
  if (REDUCE) return;
  S.clouds.forEach(function (c) {
    var p = P(c.x, c.y);
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, .5);
    ctx.fillStyle = 'rgba(40,30,80,.07)';
    ctx.beginPath(); [[0, 0, 120], [110, 30, 90], [-100, 40, 80]].forEach(function (a) { ctx.moveTo(a[0] * c.s + a[2] * c.s, a[1] * c.s); ctx.arc(a[0] * c.s, a[1] * c.s, a[2] * c.s, 0, Math.PI * 2); }); ctx.fill();
    ctx.restore();
  });
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
/* ---------- sound: every effect and the music are synthesised, so there are no audio files ---------- */
var AC = null, sfxBus = null, musBus = null, lastSfx = {}, musT = 0, musStep = 0, musTimer = 0;
function audioUnlock() {
  if (AC) { if (AC.state === 'suspended' && !document.hidden) AC.resume(); return; }
  var C = window.AudioContext || window.webkitAudioContext; if (!C) return;
  try { AC = new C(); } catch (e) { AC = null; return; }
  var comp = AC.createDynamicsCompressor(); comp.connect(AC.destination);
  sfxBus = AC.createGain(); sfxBus.gain.value = .55; sfxBus.connect(comp);
  musBus = AC.createGain(); musBus.gain.value = SET.music ? .5 : 0; musBus.connect(comp);
  startMusic();
}
function setMusic(on) { if (musBus) musBus.gain.setTargetAtTime(on ? .5 : 0, AC.currentTime, .3); }
function tone(f, t0, dur, type, vol, f2, bus) {
  var o = AC.createOscillator(), g = AC.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + .012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(bus || sfxBus); o.start(t0); o.stop(t0 + dur + .05);
}
var GAP = { coin: .07, tap: .03, vip: .3, buy: .05 };
function sfx(k, x) {
  if (!AC || !SET.sfx || document.hidden || AC.state !== 'running') return;
  var n = AC.currentTime;
  if (GAP[k] && n - (lastSfx[k] || 0) < GAP[k]) return;
  lastSfx[k] = n;
  switch (k) {
    case 'coin': var f = 1250 + Math.random() * 250; tone(f, n, .08, 'sine', .07); tone(f * 1.5, n + .045, .12, 'sine', .06); break;
    case 'tap': tone(260 + 520 * (x || 0), n, .07, 'triangle', .16, 180 + 400 * (x || 0)); break;
    case 'buy': [523, 659, 784].forEach(function (f, i) { tone(f, n + i * .055, .14, 'square', .045); }); break;
    case 'claim': [784, 988, 1175, 1568].forEach(function (f, i) { tone(f, n + i * .07, .22, 'sine', .09); }); break;
    case 'vip': tone(440, n, .14, 'square', .06); tone(554, n + .16, .2, 'square', .06); [1320, 1760].forEach(function (f, i) { tone(f, n + .3 + i * .06, .18, 'sine', .07); }); break;
    case 'fever': tone(300, n, .5, 'sawtooth', .05, 1400); [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, n + .3 + i * .06, .25, 'triangle', .08); }); break;
    case 'rush': [0, .18, .36].forEach(function (d) { tone(880, n + d, .12, 'square', .05); }); break;
    case 'no': tone(170, n, .16, 'sawtooth', .06, 120); break;
    case 'franchise': [523, 659, 784, 1047, 784, 1047, 1319].forEach(function (f, i) { tone(f, n + i * .11, .35, 'triangle', .09); }); break;
  }
}
// gentle generative music: a four-chord loop, a soft bass, and a few plucked notes over the top
var CHORDS = [[261.6, 329.6, 392], [220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7]];
var PENTA = [523.3, 587.3, 659.3, 784, 880, 1046.5];
function startMusic() {
  musT = AC.currentTime + .1; musStep = 0;
  clearInterval(musTimer);
  musTimer = setInterval(function () {
    if (!AC || AC.state !== 'running') return;
    var beat = 60 / 88 / 2;   // eighth notes
    while (musT < AC.currentTime + .4) {
      var ch = CHORDS[Math.floor(musStep / 8) % 4], s = musStep % 8;
      if (SET.music) {
        if (s === 0) ch.forEach(function (f) { tone(f, musT, beat * 8.5, 'triangle', .022, 0, musBus); });
        if (s === 0 || s === 4) tone(ch[0] / 2, musT, beat * 3, 'sine', .07, 0, musBus);
        if (s % 2 === 1 && Math.random() < .4) tone(PENTA[Math.floor(Math.random() * PENTA.length)], musT, beat * 1.6, 'triangle', .025, 0, musBus);
      }
      musT += beat; musStep++;
    }
  }, 120);
}
document.addEventListener('visibilitychange', function () {
  if (!AC) return;
  if (document.hidden) AC.suspend(); else { AC.resume(); musT = AC.currentTime + .1; }
});

/* ---------- the native app shell (Capacitor) when there is one ---------- */
function plugin(n) { var c = window.Capacitor; return c && c.Plugins && c.Plugins[n]; }
function isNative() { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }
function buzz(kind) {
  if (!SET.haptics) return;
  var H = plugin('Haptics');
  if (H && isNative()) { var p = H.impact({ style: kind === 'heavy' ? 'HEAVY' : kind === 'medium' ? 'MEDIUM' : 'LIGHT' }); if (p && p.catch) p.catch(function () {}); return; }
  if (navigator.vibrate) try { navigator.vibrate(kind === 'light' ? 6 : kind === 'medium' ? 15 : 30); } catch (e) { /* ignore */ }
}
// local reminders: when away earnings fill up, and when tomorrow's gift is ready
function notifyAsk() {
  var LN = plugin('LocalNotifications'); if (!LN || !isNative() || !SET.notify) return;
  LN.requestPermissions().catch(function () {});
}
function notifyPlan() {
  var LN = plugin('LocalNotifications'); if (!LN || !isNative()) return;
  LN.cancel({ notifications: [{ id: 1 }, { id: 2 }] }).catch(function () {}).then(function () {
    if (!SET.notify || S.tut < 99) return;
    var full = new Date(Date.now() + awayCap() * 1000), gift = new Date(); gift.setDate(gift.getDate() + 1); gift.setHours(10, 0, 0, 0);
    var list = [{ id: 1, title: 'Your lot is packed!', body: 'Away earnings have filled up. Come collect $' + fmt(econBase() * awayCap() * awayRate()) + '.', schedule: { at: full } }];
    list.push({ id: 2, title: 'Daily gift ready', body: 'Day ' + (dailyReady() ? dailyDay() + 1 : (S.daily.day + 1)) + ' of your streak is waiting at Little Lot.', schedule: { at: gift } });
    return LN.schedule({ notifications: list });
  }).catch(function () {});
}
/* ---------- in-app purchases: real money only works in the App Store build (cordova-plugin-purchase) ---------- */
// Product ids must match the ones created in App Store Connect. Set IAP_PREFIX in config.js to your bundle id.
var IAP_PREFIX = (window.LL_CONFIG && window.LL_CONFIG.IAP_PREFIX) || 'com.littlelot.game';
var IAP = {
  gems_s: { id: IAP_PREFIX + '.gems.small', gems: 100, name: 'Handful of gems', price: '$0.99' },
  gems_m: { id: IAP_PREFIX + '.gems.medium', gems: 550, name: 'Bag of gems', price: '$4.99', tag: '+10%' },
  gems_l: { id: IAP_PREFIX + '.gems.large', gems: 1200, name: 'Chest of gems', price: '$9.99', tag: '+20%' },
  gems_xl: { id: IAP_PREFIX + '.gems.huge', gems: 3200, name: 'Vault of gems', price: '$19.99', tag: 'Best value' },
  pass: { id: IAP_PREFIX + '.goldenpass', once: true, name: 'Golden Pass', price: '$6.99' },
  starter: { id: IAP_PREFIX + '.starter', once: true, name: 'Starter pack', price: '$1.99' }
};
var IORDER = ['gems_s', 'gems_m', 'gems_l', 'gems_xl'];
var store = null, iapReady = false;
function iapKey(id) { for (var k in IAP) if (IAP[k].id === id) return k; return null; }
function grant(k, txId) {
  var it = IAP[k]; if (!it) return;
  if (txId && S.iap.indexOf(txId) >= 0) return;   // already given for this transaction
  if (txId) S.iap.push(txId);
  if (k === 'pass') { if (S.pass) return; S.pass = true; note('Golden Pass active: x2 income forever!'); }
  else if (k === 'starter') { if (S.starter) return; S.starter = true; S.gems += 300; addBoost(4 * 3600); note('Starter pack: 300 gems and 4 hours of x2 income!'); }
  else { S.gems += it.gems; note('+' + it.gems + ' gems. Thank you!'); }
  sfx('claim'); buzz('heavy'); moneyChanged = true; save(); if (typeof refreshPanels === 'function') refreshPanels();
}
function iapInit() {
  var C = window.CdvPurchase;
  if (!C || !C.store) return;
  store = C.store;
  var A = C.Platform.APPLE_APPSTORE;
  store.register(Object.keys(IAP).map(function (k) { return { id: IAP[k].id, type: IAP[k].once ? C.ProductType.NON_CONSUMABLE : C.ProductType.CONSUMABLE, platform: A }; }));
  store.when().approved(function (t) {
    (t.products || []).forEach(function (p) { var k = iapKey(p.id); if (k) grant(k, IAP[k].once ? null : t.transactionId); });
    t.finish();
  }).productUpdated(function (p) {
    var k = iapKey(p.id); if (!k) return;
    if (p.pricing && p.pricing.price) IAP[k].price = p.pricing.price;
    if (IAP[k].once && p.owned) grant(k, null);
    if (typeof refreshPanels === 'function') refreshPanels();
  });
  store.initialize([A]).then(function () { iapReady = true; if (typeof refreshPanels === 'function') refreshPanels(); });
}
function iapBuy(k) {
  if (!store || !iapReady) { note('Purchases are available in the Little Lot app on the App Store.'); return; }
  var p = store.get(IAP[k].id), o = p && p.getOffer();
  if (!o) { note('That item is not available right now. Try again later.'); return; }
  store.order(o).then(function (err) { if (err && err.code !== window.CdvPurchase.ErrorCode.PAYMENT_CANCELLED) note('The purchase did not go through. You were not charged.'); });
}
function iapRestore() {
  if (!store) { note('Restore works in the Little Lot app on the App Store.'); return; }
  note('Restoring purchases...');
  store.restorePurchases().then(function () { note(S.pass || S.starter ? 'Purchases restored.' : 'No purchases to restore on this Apple ID.'); });
}
document.addEventListener('deviceready', iapInit, false);
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
  goal: '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9L3.5 9.7l5.9-.8z"/></svg>',
  wash: '<svg viewBox="0 0 24 24"><path d="M4 20v-9l8-5 8 5v9M8 20v-5h8v5"/><circle cx="9" cy="5" r="1.4"/><circle cx="14" cy="3.6" r="1"/></svg>',
  ev: '<svg viewBox="0 0 24 24"><path d="M13 3L6 13h5l-1 8 7-10h-5z"/></svg>',
  concierge: '<svg viewBox="0 0 24 24"><path d="M4 17h16M6 17a6 6 0 0112 0M12 8V6M10 6h4"/></svg>',
  promoter: '<svg viewBox="0 0 24 24"><path d="M4 10v4h3l6 4V6L7 10zM17 8l3-2M17 16l3 2M18 12h3"/></svg>',
  crew: '<svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="2.6"/><circle cx="16" cy="8" r="2.6"/><path d="M3.5 19c.6-3 2.4-4.6 4.5-4.6s3.9 1.6 4.5 4.6M11.5 19c.6-3 2.4-4.6 4.5-4.6s3.9 1.6 4.5 4.6"/></svg>',
  manager: '<svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M8.5 10h7M8.5 14h7M8.5 18h4"/></svg>',
  tap: '<svg viewBox="0 0 24 24"><path d="M9 11V5.5a1.6 1.6 0 013.2 0V11M12.2 10V8.6a1.6 1.6 0 013.2 0V11M15.4 10.4a1.6 1.6 0 013.2 0V15c0 3.3-2.4 6-5.6 6h-1.4c-2.2 0-3.6-1-4.7-2.7L4.6 15a1.6 1.6 0 012.6-1.8L9 15"/></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M19 15.5A8 8 0 018.5 5 7.5 7.5 0 1019 15.5z"/></svg>',
  gem: '<svg viewBox="0 0 24 24"><path d="M6 4h12l3 5-9 11L3 9z M3 9h18M9 4l3 16M15 4l-3 16"/></svg>'
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
ITEMS.ads.ms = true;
ITEMS.wash = { tab: 'build', name: 'Car wash', tint: '#c7f0ff', icon: 'wash', multi: true, ms: true,
  lvl: function () { return S.lvl.wash; }, max: function () { return MAXL.wash; },
  cost: function (l) { return 8000 * Math.pow(1.45, l); },
  now: function () { return S.lvl.wash ? Math.round(washChance() * 100) + '% of drivers pay $' + fmtSmall(washPrice()) : 'No car wash yet'; },
  next: function () { return S.lvl.wash ? 'More drivers stop, and each wash pays more' : 'Build a wash by the road: leaving cars pay to get clean'; },
  apply: function () { S.lvl.wash++; } };
ITEMS.ev = { tab: 'biz', name: 'EV chargers', tint: '#c9f2d9', icon: 'ev', multi: false,
  lvl: function () { return S.lvl.ev; }, max: function () { return Math.min(MAXL.ev, COLS()); },
  cost: function (l) { return 600 * Math.pow(3, l); },
  now: function () { var n = Math.min(S.lvl.ev, COLS()) * 2; return n ? n + ' charging bays pay +' + Math.round(EV_BONUS * 100) + '%' : 'No chargers yet'; },
  next: function () { return S.lvl.ev >= COLS() && S.lvl.ev < MAXL.ev ? 'Build more spaces first' : 'Chargers on 2 more bays: those cars pay +50%'; },
  apply: function () { S.lvl.ev++; } };
ITEMS.concierge = { tab: 'staff', name: 'Concierge', tint: '#fff0a8', icon: 'concierge', multi: false,
  lvl: function () { return S.lvl.concierge; }, max: function () { return 1; },
  cost: function () { return 3000; },
  now: function () { return S.lvl.concierge ? 'Greets every golden car for you' : 'You greet golden cars yourself'; },
  next: function () { return 'Taps golden cars for you, full bonus'; },
  apply: function () { S.lvl.concierge = 1; } };
ITEMS.promoter = { tab: 'staff', name: 'Promoter', tint: '#ffc7bd', icon: 'promoter', multi: false,
  lvl: function () { return S.lvl.promoter; }, max: function () { return 1; },
  cost: function () { return 40000; },
  now: function () { return S.lvl.promoter ? 'Starts every rush hour for you' : 'You start rush hours yourself'; },
  next: function () { return 'Never miss a rush hour again'; },
  apply: function () { S.lvl.promoter = 1; } };
ITEMS.crew = { tab: 'staff', name: 'Hype crew', tint: '#ffc7e8', icon: 'crew', multi: false,
  lvl: function () { return S.lvl.crew; }, max: function () { return MAXL.crew; },
  cost: function (l) { return 900 * Math.pow(2.6, l); },
  now: function () { return S.lvl.crew ? 'Keeps the lot hustling on its own' : 'The meter only fills when you tap'; },
  next: function () { return 'Fills the hustle meter a little, all the time'; },
  apply: function () { S.lvl.crew++; } };
ITEMS.manager = { tab: 'staff', name: 'Night manager', tint: '#d9e4ff', icon: 'manager', multi: false,
  lvl: function () { return S.lvl.manager; }, max: function () { return MAXL.manager; },
  cost: function (l) { return 6000 * Math.pow(3.5, l); },
  now: function () { return 'Away earnings at ' + Math.round(awayRate() * 100) + '%'; },
  next: function () { return 'Earn 5% more while you are away'; },
  apply: function () { S.lvl.manager++; } };
var TABS = { build: ['space', 'garage', 'sign', 'wash'], speed: ['gate', 'walk', 'express', 'valet'], biz: ['fee', 'ads', 'shop', 'ev'], staff: ['concierge', 'promoter', 'crew', 'manager'] };
var TABNOTE = {
  build: 'More room for cars. Drivers use the main lot first, then the garage. When both are full, cars queue on the street and lose patience, so keep building.',
  speed: 'Every visit: park, step out, walk to the shops, shop, walk back, leave. Speed up any step to free the bay sooner.',
  biz: 'Earn more from each visit and bring more cars in. Fees and shop deals never run out.',
  staff: 'Hire help so the lot runs itself: golden cars, rush hours, the hustle meter and away earnings.',
  goals: 'Finish goals for +2% income each, forever, plus cash and 3 gems. Every goal has another one after it.',
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
  toastEl.classList.remove('in'); void toastEl.offsetWidth; toastEl.classList.add('in');
  toastT = setTimeout(function () { toastEl.hidden = true; }, 3400);
}

function btnHtml(k) {
  var p = plan(k, S.qty);
  if (p.maxed) return k === 'garage' ? 'Franchise for more' : k === 'ev' && S.lvl.ev < MAXL.ev ? 'Needs more space' : ITEMS[k].tab === 'staff' && MAXL[k] === 1 ? 'Hired' : 'Maxed';
  return '<span class="c">$</span>' + fmt(p.cost) + (p.n > 1 ? ' <small>x' + p.n + '</small>' : '');
}
function cardHtml(k) {
  var it = ITEMS[k], l = it.lvl(), mx = it.max(), pips = '';
  if (mx <= 12) { for (var i = 0; i < mx; i++) pips += '<span class="pip' + (i < l ? ' on' : '') + '"></span>'; }
  else pips = '<span class="lbl2">Level ' + l + '</span>';
  var maxed = l >= mx, sub = maxed && k !== 'garage' && !(k === 'ev' && l < MAXL.ev) ? 'Fully upgraded' : it.next();
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
    '<button class="buy" type="button" data-goal="' + k + '"' + (ok ? '' : ' disabled') + '>' + (ok ? 'Claim $' + fmt(goalCash()) + ' +' + GOAL_GEMS + '<i class="gi"></i>' : 'Keep going') + '</button></article>';
}
function perkHtml(k) {
  var d = PDEF[k], c = d.cost(S.perk[k]), maxed = S.perk[k] >= PMAX[k];
  return '<article class="card" id="perk-' + k + '"><h3><span class="ico" style="background:' + d.tint + '">' + ICON[d.icon] + '</span>' + d.name + '</h3>' +
    '<p class="now">' + d.now() + '</p><span class="lbl2">Level ' + S.perk[k] + (isFinite(PMAX[k]) ? ' / ' + PMAX[k] : '') + '</span><p>' + (maxed ? 'Fully upgraded' : perkNext(k)) + '</p>' +
    '<button class="buy" type="button" data-perk="' + k + '"' + (!maxed && S.tok >= c ? '' : ' disabled') + '>' + (maxed ? 'Maxed' : c + ' &#9733; tokens') + '</button></article>';
}
function frHtml() {
  var gain = starsGain();
  var base = starAt(starsTotal()), nxt = starAt(starsTotal() + 1);
  var pct = Math.max(0, Math.min(100, (S.lifetime - base) / (nxt - base) * 100));
  var h = '<div class="fr"><h3><span style="color:#f0a300;-webkit-text-stroke:1.5px var(--ink)">&#9733;</span> Franchise</h3>' +
    '<p>Sell this lot and open the next one on the map. Each star adds 35% to all income forever, you get a token per star to spend on perks, 5 gems, and 3 more garage floors to build.</p>' +
    '<div class="nextloc"><small>Next stop</small><b>' + locAt(S.franchises + 1).name + '</b><span>x' + fmtX(locAt(S.franchises + 1).mult) + ' income · ' + locAt(S.franchises + 1).perk + '</span></div>' +
    '<div class="row"><div class="stat"><small>Stars</small>' + S.stars + '</div>' +
    '<div class="stat"><small>Income bonus</small>+' + Math.round((mult() - 1) * 100) + '%</div>' +
    '<div class="stat"><small>Earned in total</small>$<span id="fr-run">' + fmt(S.lifetime) + '</span></div>' +
    '<div class="stat"><small>Stars if you sell now</small><span id="fr-gain">+' + gain + '</span></div>' +
    '<div class="stat"><small>Tokens</small>' + S.tok + '</div></div>' +
    '<div class="meter" role="img" aria-label="Progress to the next star"><i id="fr-bar" style="width:' + pct + '%"></i></div>' +
    '<p id="fr-note">Next star when your lifetime earnings reach $' + fmt(nxt) + ' (now $' + fmt(S.lifetime) + ').</p>';
  if (!S.confirmFr) h += '<button class="buy" type="button" id="fr-go"' + (gain < 1 ? ' disabled' : '') + '>' + (gain < 1 ? 'Earn more to franchise' : 'Franchise now (+' + gain + ' stars)') + '</button>';
  else h += '<p>This resets your money, garage, upgrades and staff. Stars, tokens, perks, goals, gems and boosts stay.</p><div class="btns"><button class="buy danger" type="button" id="fr-yes">Yes, start over</button><button class="buy ghost" type="button" id="fr-no">Keep playing</button></div>';
  h += '</div><p class="tabnote">Perks (spend tokens, they last through every franchise)</p>';
  PORDER.forEach(function (k) { h += perkHtml(k); });
  return h;
}
function buildTray() {
  var h = '';
  if (S.tab === 'fr') h = frHtml();
  else if (S.tab === 'goals') { h += '<p class="tabnote">' + TABNOTE.goals + '</p>'; GORDER.forEach(function (k) { h += goalHtml(k); }); }
  else {
    if (S.tut === 3) h += '<p class="tutnote">Tap a yellow button to buy. Every upgrade makes the lot earn more.</p>';
    h += '<p class="tabnote">' + TABNOTE[S.tab] + '</p>'; TABS[S.tab].forEach(function (k) { h += cardHtml(k); });
  }
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
  a.textContent = fmt(S.lifetime);
  document.getElementById('fr-gain').textContent = '+' + starsGain();
  var base = starAt(starsTotal()), nxt = starAt(starsTotal() + 1);
  document.getElementById('fr-bar').style.width = Math.max(0, Math.min(100, (S.lifetime - base) / (nxt - base) * 100)) + '%';
  document.getElementById('fr-note').textContent = 'Next star when your lifetime earnings reach $' + fmt(nxt) + ' (now $' + fmt(S.lifetime) + ').';
  var go = document.getElementById('fr-go');
  if (go) { var g = starsGain(); go.textContent = g < 1 ? 'Earn more to franchise' : 'Franchise now (+' + g + ' stars)'; }
}
function doFranchise() {
  var g = starsGain(); if (g < 1) return;
  S.stars += g; S.tok += g; S.franchises++; S.gems += 5; S.money = 25 + headStart(); S.totalRun = 0;
  Object.keys(S.lvl).forEach(function (k) { S.lvl[k] = 0; });
  applyBlueprints();
  S.theme = LOC().theme; buildDecor();
  S.spots = []; ensureSpots(); GS = []; ensureSlots(); S.deckAnim = S.lvl.garage; clearCars(); seedParked();
  S.confirmFr = false; S.tab = 'build'; S.spawnT = 0.5; S.hype = 0; S.fever = 0; S.view.user = false; moneyChanged = true; buildTray(); save();
  setSheet(false); sfx('franchise'); buzz('heavy');
  for (var i = 0; i < 40; i++) S.fx.push({ kind: 'conf', x: Math.random(), y: -.05 - Math.random() * .3, t: 0, vx: (Math.random() - .5) * .2, vy: .25 + Math.random() * .35, c: SHIRT[i % SHIRT.length], r: Math.random() * 6 });
  showArrival();
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
  var nb = e.target.closest('[data-nav]');
  if (nb) { openPanel(nb.getAttribute('data-nav')); return; }
  var b = e.target.closest('[data-up]'); if (!b) return;
  var k = b.getAttribute('data-up'), p = plan(k, S.qty);
  if (p.maxed || !p.ok) return;
  S.money -= p.cost; for (var i = 0; i < p.n; i++) ITEMS[k].apply();
  moneyChanged = true; buildTray(); save(); sfx('buy'); buzz('light'); tutEvent('buy');
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
  if (o) { closeBtn.focus({ preventScroll: true }); tutEvent('open'); } else openBtn.focus({ preventScroll: true });
}
openBtn.addEventListener('click', function () { setSheet(!sheet.classList.contains('open')); });
closeBtn.addEventListener('click', function () { setSheet(false); });
scrim.addEventListener('click', function () { setSheet(false); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && sheet.classList.contains('open')) setSheet(false); });
if ('inert' in sheet) sheet.inert = true;

/* ---------- panels: shop, map, settings, daily gift and new-location arrivals share one dialog ---------- */
var panelEl = document.getElementById('panel'), panelBody = document.getElementById('panelBody'), panelTitle = document.getElementById('panelTitle');
var panelName = '', panelFocus = null, resetStep = 0;
var GEM = '<i class="gi" aria-hidden="true"></i>';
var TITLES = { shop: 'Shop', map: 'Map', settings: 'Settings', daily: 'Daily gift', arrive: '' };
function openPanel(n) {
  if (n === 'fr') { closePanel(); S.tab = 'fr'; buildTray(); setSheet(true); return; }
  if (!panelName) panelFocus = document.activeElement;
  panelName = n; resetStep = 0; renderPanel();
  panelEl.hidden = false; panelEl.querySelector('.modal-card').scrollTop = 0;
  setTimeout(function () { try { document.getElementById('panelClose').focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 30);
}
function closePanel() {
  if (!panelName) return;
  panelName = ''; panelEl.hidden = true;
  if (panelFocus && panelFocus.focus) try { panelFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
}
function refreshPanels() { if (panelName && panelName !== 'settings') renderPanel(); }
function renderPanel() {
  var n = panelName, h = '';
  panelTitle.textContent = n === 'arrive' ? 'Welcome to ' + LOC().name + '!' : TITLES[n];
  panelEl.setAttribute('data-p', n);
  if (n === 'shop') h = shopHtml(); else if (n === 'map') h = mapHtml(); else if (n === 'settings') h = setHtml();
  else if (n === 'daily') h = dailyHtml(); else if (n === 'arrive') h = arriveHtml();
  panelBody.innerHTML = h;
}
function shopHtml() {
  var h = '<div class="gembar">' + GEM + '<b>' + fmt(S.gems) + '</b><span>gems</span></div>';
  if (boostOn()) h += '<p class="pnote">x2 income active for ' + fmtClock((S.boostEnd - Date.now()) / 1000) + '. More time stacks up to 48 hours.</p>';
  h += '<h3 class="ph">Boosts</h3><div class="pgrid">';
  SORDER.forEach(function (k) {
    var it = SHOP[k], sub = typeof it.sub === 'function' ? it.sub() : it.sub;
    h += '<article class="card"><h3><span class="ico" style="background:' + it.tint + '">' + ICON[it.icon] + '</span>' + it.name + '</h3><p>' + sub + '</p>' +
      '<button class="buy" type="button" data-shop="' + k + '"' + (S.gems >= it.cost ? '' : ' disabled') + '>' + it.cost + GEM + '</button></article>';
  });
  h += '</div>';
  if (!S.pass) h += '<article class="feat pass"><div><h3>Golden Pass</h3><ul><li>x2 income forever, on every lot</li><li>Away earnings last twice as long</li><li>+5 gems with every daily gift</li></ul></div>' +
    '<button class="buy" type="button" data-iap="pass">' + IAP.pass.price + '</button></article>';
  else h += '<p class="pnote owned">Golden Pass active: x2 income, double away time, +5 daily gems.</p>';
  if (!S.starter) h += '<article class="feat starter"><div><h3>Starter pack</h3><ul><li>300 gems</li><li>4 hours of x2 income</li><li>One per player</li></ul></div>' +
    '<button class="buy" type="button" data-iap="starter">' + IAP.starter.price + '</button></article>';
  h += '<h3 class="ph">Gems</h3><div class="pgrid">';
  IORDER.forEach(function (k) {
    var it = IAP[k];
    h += '<article class="card gemcard">' + (it.tag ? '<span class="tag">' + it.tag + '</span>' : '') + '<div class="gemstack">' + GEM + '<b>' + it.gems + '</b></div><p>' + it.name + '</p>' +
      '<button class="buy" type="button" data-iap="' + k + '">' + it.price + '</button></article>';
  });
  h += '</div><p class="pnote">' + (store ? 'Gems also come from goals, golden cars, franchising and the daily gift.' : 'Gem packs and the Golden Pass are sold in the iPhone app. You can earn gems everywhere: goals, golden cars, franchising and the daily gift.') + '</p>';
  h += '<button class="linkbtn" type="button" data-act="restore">Restore purchases</button>';
  return h;
}
function mapHtml() {
  var cur = S.franchises, last = Math.max(cur + 2, LOCS.length - 1), h = '<p class="pnote">Every franchise opens the next stop on the road. Each one pays more, and each has its own perk.</p><ol class="road">', i;
  for (i = 0; i <= last; i++) {
    var L = locAt(i), th = THEMES[L.theme], st = i < cur ? 'done' : i === cur ? 'here' : i === cur + 1 ? 'next' : 'locked';
    h += '<li class="stop ' + st + '"><span class="dotm" style="background:' + th.ground[0] + ';border-color:' + (st === 'locked' ? '#cdbf9b' : 'var(--ink)') + '">' + (st === 'done' ? '&#10003;' : i + 1) + '</span>' +
      '<div><b>' + L.name + '</b><span class="mult">x' + fmtX(L.mult) + ' income</span><small>' + L.perk + '</small>' +
      (st === 'here' ? '<em class="here">You are here</em>' : st === 'next' ? '<em>' + (starsGain() > 0 ? 'Ready: franchise for +' + starsGain() + ' stars' : 'Franchise to open') + '</em>' : st === 'done' ? '<em class="ok">Visited</em>' : '') + '</div></li>';
  }
  h += '</ol><button class="buy" type="button" data-act="fr">Franchising</button>';
  return h;
}
// inside the app the policy opens in Safari from the published site, so the game never navigates away
function privacyUrl() { var u = (window.LL_CONFIG || {}).SITE_URL; return isNative() && u ? u.replace(/\/?$/, '/') + 'privacy.html' : 'privacy.html'; }
var SETS = [['sfx', 'Sound effects'], ['music', 'Music'], ['haptics', 'Vibration'], ['daynight', 'Day and night'], ['notify', 'Reminders'], ['sci', 'Scientific numbers']];
function setHtml() {
  var cfg = window.LL_CONFIG || {}, h = '<div class="toggles">';
  SETS.forEach(function (s) {
    h += '<label class="tog"><span>' + s[1] + '</span><input type="checkbox" role="switch" data-set="' + s[0] + '"' + (SET[s[0]] ? ' checked' : '') + '><i aria-hidden="true"></i></label>';
  });
  h += '</div><div class="setbtns">' +
    '<button class="buy ghost" type="button" data-act="restore">Restore purchases</button>' +
    '<button class="buy ghost" type="button" data-act="tutorial">Show the tips again</button>' +
    '<a class="buy ghost" href="' + privacyUrl() + '" target="_blank" rel="noopener">Privacy policy</a>' +
    (cfg.SUPPORT_EMAIL ? '<a class="buy ghost" href="mailto:' + cfg.SUPPORT_EMAIL + '?subject=Little%20Lot">Contact support</a>' : '') +
    '<button class="buy danger" type="button" data-act="reset">' + (resetStep ? 'Tap again to erase everything' : 'Reset progress') + '</button></div>' +
    '<p class="pnote small">Little Lot ' + VERSION + '. Made with care. Lifetime earnings $' + fmt(S.lifetime) + ', ' + fmt(S.served) + ' cars parked, ' + fmt(S.taps) + ' taps.</p>';
  return h;
}
function dailyHtml() {
  var ready = dailyReady(), d = ready ? dailyDay() : (S.daily.day + 6) % 7, h = '<p class="pnote">Come back every day. Miss a day and the streak starts over.' + (S.pass ? ' Golden Pass adds 5 gems to each gift.' : '') + '</p><div class="days">';
  DAILY.forEach(function (x, i) {
    var st = i < d ? 'got' : i === d ? (ready ? 'today' : 'got') : 'soon';
    h += '<div class="day ' + st + (x.big ? ' big' : '') + '"><small>Day ' + (i + 1) + '</small><span class="ico">' + (x.icon === 'gem' ? GEM : ICON[x.icon]) + '</span><b>' + x.txt + '</b>' + (st === 'got' ? '<i class="chk">&#10003;</i>' : '') + '</div>';
  });
  h += '</div><button class="buy" type="button" data-act="daily"' + (ready ? '' : ' disabled') + '>' + (ready ? 'Claim day ' + (d + 1) : 'Come back tomorrow') + '</button>';
  return h;
}
function arriveHtml() {
  var L = LOC();
  return '<div class="arrive" style="background:' + THEMES[L.theme].bg[0] + '"><b>x' + fmtX(L.mult) + '</b><span>location income</span></div>' +
    '<p class="pnote">' + L.perk + '. You have ' + S.stars + ' stars (+' + Math.round(0.35 * S.stars * 100) + '% income) and ' + S.tok + ' tokens to spend on perks.</p>' +
    '<div class="setbtns"><button class="buy" type="button" data-act="close">Open the lot</button><button class="buy ghost" type="button" data-act="perks">Spend tokens</button></div>';
}
function showArrival() { openPanel('arrive'); }
panelEl.addEventListener('click', function (e) {
  if (e.target === panelEl) { closePanel(); return; }
  var b = e.target.closest('button, input'); if (!b) return;
  var k;
  if ((k = b.getAttribute('data-shop'))) { if (buyShop(k)) renderPanel(); return; }
  if ((k = b.getAttribute('data-iap'))) { iapBuy(k); return; }
  if ((k = b.getAttribute('data-set'))) {
    SET[k] = b.checked; saveSettings();
    if (k === 'music') setMusic(SET.music);
    if (k === 'daynight' && !SET.daynight) S.tod = 0;
    if (k === 'notify') { if (SET.notify) notifyAsk(); notifyPlan(); }
    if (k === 'sci') { moneyChanged = true; buildTray(); }
    return;
  }
  switch (b.getAttribute('data-act')) {
    case 'restore': iapRestore(); break;
    case 'fr': openPanel('fr'); break;
    case 'close': closePanel(); break;
    case 'perks': openPanel('fr'); break;
    case 'daily': var m = claimDaily(); if (m) { note('Day gift: ' + m); moneyChanged = true; renderPanel(); } break;
    case 'tutorial': S.tut = 0; tutN = 0; closePanel(); showTut(); break;
    case 'reset':
      if (!resetStep) { resetStep = 1; renderPanel(); return; }
      closePanel(); applySave(null); S.tut = 0; moneyChanged = true; buildTray(); save();
      if (window.LLAuth && window.LLAuth.reset) window.LLAuth.reset();
      note('Fresh start! Your lot has been reset.'); showTut(); break;
  }
});
document.getElementById('panelClose').addEventListener('click', closePanel);
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panelName) closePanel(); });
['shop', 'map', 'settings', 'daily'].forEach(function (n) {
  var b = document.getElementById(n + 'Btn'); if (b) b.addEventListener('click', function () { audioUnlock(); openPanel(n); });
});
document.getElementById('gemPill').addEventListener('click', function () { openPanel('shop'); });

/* ---------- tips: a short tutorial, then the odd hint ---------- */
var TUT = [
  { t: 'Tap anywhere on the lot to make everyone hustle!', ev: 'tap', n: 5 },
  { t: 'Fill the meter for FEVER: double speed and double cash. Keep tapping!', ev: 'tap', n: 14 },
  { t: 'Open Upgrades to grow your lot.', ev: 'open' },
  { t: 'Buy an upgrade. Yellow buttons are ones you can afford.', ev: 'buy' },
  { t: 'Pinch to zoom, drag to look around.', ev: 'pan', wait: 9 }
];
var tipEl = document.getElementById('tip'), tipT = 0, tutN = 0, tutAt = 0;
function tip(t, secs) {
  if (S.tut < TUT.length) return;
  tipEl.textContent = t; tipEl.hidden = false; clearTimeout(tipT);
  tipT = setTimeout(function () { if (S.tut >= TUT.length) tipEl.hidden = true; }, (secs || 5) * 1000);
}
function showTut() {
  if (sheet.classList.contains('open')) buildTray();   // the buy step shows its hint inside the sheet
  if (S.tut >= TUT.length) { tipEl.hidden = true; return; }
  tipEl.textContent = TUT[S.tut].t; tipEl.hidden = false; tutAt = S.t;
}
function tutEvent(ev) {
  if (S.tut >= TUT.length) return;
  var st = TUT[S.tut];
  if (st.ev !== ev) return;
  if (++tutN < (st.n || 1)) return;
  tutNext();
}
function tutNext() {
  S.tut++; tutN = 0;
  if (S.tut >= TUT.length) { S.tut = 99; note('You are all set! Goals, golden cars and the map keep it growing.'); notifyAsk(); save(); }
  showTut();
}
function tickTut() { if (S.tut < TUT.length && TUT[S.tut].wait && S.t - tutAt > TUT[S.tut].wait) tutNext(); }
/* ---------- HUD ---------- */
function $id(id) { return document.getElementById(id); }
var elMoney = $id('money'), elParked = $id('parked'), pill = $id('moneyPill'), elWallet = $id('wallet'), elRate = $id('rate');
var elStars = $id('stars'), starPill = $id('starPill'), elGems = $id('gems'), boostChip = $id('boostChip'), boostT = $id('boostT');
var hypeEl = $id('hype'), hypeFill = $id('hypeFill'), hypeTxt = $id('hypeTxt'), recenterBtn = $id('recenter');
var dailyDot = $id('dailyDot'), shopDot = $id('shopDot'), rushBtn = $id('rushBtn');
var lastMoney = -1, lastParked = '', lastRate = '', lastFr = 0, lastGoalChk = 0, lastGoals = 0, lastGems = -1, lastHype = '';
function hud() {
  if (moneyChanged || S.money !== lastMoney) {
    moneyChanged = false;
    if (S.money > lastMoney && lastMoney >= 0 && !REDUCE) { pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump'); }
    lastMoney = S.money; var m = fmt(S.money); elMoney.textContent = m; elWallet.textContent = m; refreshTray();
  }
  if (S.gems !== lastGems) { lastGems = S.gems; elGems.textContent = fmt(S.gems); }
  S.earn = S.earn.filter(function (e) { return S.t - e.t < 10; });
  var sum = 0; S.earn.forEach(function (e) { sum += e.v; });
  var rt = '$' + fmtRate(sum / Math.max(4, Math.min(10, S.t))) + '/s';
  if (rt !== lastRate) { lastRate = rt; elRate.textContent = rt; }
  var txt = parkedCount() + ' / ' + totalSpots();
  if (txt !== lastParked) { lastParked = txt; elParked.textContent = txt; }
  starPill.hidden = !(S.stars > 0); if (S.stars > 0) elStars.textContent = S.stars;
  var bo = boostOn(); boostChip.hidden = !bo; if (bo) boostT.textContent = fmtClock((S.boostEnd - Date.now()) / 1000);
  // the hustle meter
  var hs = S.fever > 0 ? 'f' + Math.ceil(S.fever) : 'h' + Math.round(S.hype * 50);
  if (hs !== lastHype) {
    lastHype = hs;
    hypeFill.style.width = Math.round(S.hype * 100) + '%';
    hypeEl.classList.toggle('fever', S.fever > 0);
    hypeTxt.textContent = S.fever > 0 ? 'FEVER! x2 cash · ' + Math.ceil(S.fever) + 's' : S.hype > .02 ? 'Hustle x' + flow().toFixed(1) + ' · keep tapping!' : 'Tap the lot to hustle';
  }
  recenterBtn.hidden = !S.view.user;
  dailyDot.hidden = !dailyReady();
  shopDot.hidden = S.gems < 30;
  if (S.tab === 'fr' && S.t - lastFr > 0.5) { lastFr = S.t; updateFr(); }
  if (S.t - lastGoalChk > 1) {
    lastGoalChk = S.t; refreshTray(); tickTut();
    var gr = goalsReady(); if (gr > lastGoals) { note('A goal is ready! Open Upgrades, then Goals.'); sfx('claim'); } lastGoals = gr;
    if (S.tab === 'goals' && sheet.classList.contains('open')) buildTray();
  }
  if (S.rush > 0) { rushBtn.hidden = false; rushBtn.disabled = true; rushBtn.className = 'rush on'; rushBtn.textContent = 'Rush hour ' + Math.ceil(S.rush) + 's'; }
  else if (S.rushReady > 0) { rushBtn.hidden = false; rushBtn.disabled = false; rushBtn.className = 'rush'; rushBtn.textContent = 'Rush hour! Tap (' + Math.ceil(S.rushReady) + 's)'; }
  else rushBtn.hidden = true;
}
rushBtn.addEventListener('click', function () { if (startRush()) { note('Rush hour! More drivers, and every car pays 50% more.'); save(); } });
recenterBtn.addEventListener('click', function () { S.view.user = false; });

/* ---------- away earnings ---------- */
var awayEarn = 0, welcome = $id('welcome'), AWAY_X2 = 10;
// what the lot made while nobody watched: a share of the steady rate, up to a time cap, plus any x2 boost that was running
function awayAmount(elapsed, leftAt) {
  var cap = awayCap(), t = Math.min(elapsed, cap), now = Date.now();
  var boosted = Math.max(0, Math.min(S.boostEnd, now) - Math.max(leftAt, now - t * 1000)) / 1000;
  return econBase() * (t + boosted) * awayRate();
}
function showAway(elapsed, leftAt) {
  if (elapsed < 45) return;
  var e = awayAmount(elapsed, leftAt);
  if (e < 1) return;
  awayEarn = e;
  $id('welAmt').textContent = fmt(e);
  var capped = elapsed > awayCap();
  $id('welText').textContent = 'You were away for ' + fmtTime(elapsed) + '. Your lot kept parking cars at ' + Math.round(awayRate() * 100) + '% speed' + (capped ? ', up to ' + Math.round(awayCap() / 3600) + ' hours.' : '.');
  $id('welTip').hidden = !capped && awayRate() >= 1;
  $id('welTip').textContent = capped ? 'Earn for longer with the Night watch perk' + (S.pass ? '.' : ' or the Golden Pass.') : 'Raise the rate with a Night manager or the Overnight rates perk.';
  var x2 = $id('welX2'); x2.disabled = S.gems < AWAY_X2; x2.innerHTML = 'Collect x2 · ' + AWAY_X2 + GEM;
  welcome.hidden = false; $id('welBtn').focus({ preventScroll: true });
}
function collectAway(x2) {
  if (x2) { if (S.gems < AWAY_X2) return; S.gems -= AWAY_X2; awayEarn *= 2; }
  addMoney(awayEarn); popText(4, 2, '+' + fmt(awayEarn), true); awayEarn = 0; welcome.hidden = true; sfx('claim'); save();
  if (dailyReady() && S.tut >= 99) setTimeout(function () { if (!panelName) openPanel('daily'); }, 400);
}
$id('welBtn').addEventListener('click', function () { collectAway(false); });
$id('welX2').addEventListener('click', function () { collectAway(true); });
var hiddenAt = 0;
document.addEventListener('visibilitychange', function () {
  if (document.hidden) { hiddenAt = Date.now(); save(); notifyPlan(); }
  else if (hiddenAt && welcome.hidden) { showAway((Date.now() - hiddenAt) / 1000, hiddenAt); hiddenAt = 0; last = performance.now(); }
});
window.addEventListener('pagehide', save);
setInterval(save, 8000);

/* ---------- boot ---------- */
function fit() {
  var r = $id('stage').getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
  S.w = Math.max(1, r.width); S.h = Math.max(1, r.height);
  cv.width = Math.max(1, Math.round(S.w * dpr)); cv.height = Math.max(1, Math.round(S.h * dpr));
  if (sheet.classList.contains('open')) S.padTarget = Math.max(0, sheet.offsetHeight - 80);
}
window.addEventListener('resize', fit);
if (window.LLAuth && window.LLAuth.slotKey) saveKey = window.LLAuth.slotKey();
var saved = readSave(saveKey);
buildDecor();
applySave(saved);
fit(); buildTray(); stepCam(0); S.view.z = defaultZoom();
if (saved && saved.time) showAway((Date.now() - saved.time) / 1000, saved.time);
if (welcome.hidden && dailyReady() && S.tut >= 99) openPanel('daily');
showTut();
[].forEach.call(document.querySelectorAll('a[href="privacy.html"]'), function (a) { a.href = privacyUrl(); });
var last = performance.now();
function loop(now) {
  var dt = Math.min(.05, (now - last) / 1000); last = now;
  update(dt); draw(); hud();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
// the first touch anywhere starts the sound (browsers need a gesture)
document.addEventListener('pointerdown', audioUnlock, { once: true });
if (!window.CdvPurchase) setTimeout(function () { if (window.CdvPurchase && !store) iapInit(); }, 1500);

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
    S.confirmFr = false; moneyChanged = true; buildTray(); showTut();
    return j;
  },
  away: function (j) { if (j && j.time) showAway((Date.now() - j.time) / 1000, j.time); },
  save: save,
  note: note
};
if (window.LLAuth && window.LLAuth.attach) window.LLAuth.attach(window.LittleLot);
// ?debug exposes the internals for testing and balancing
if (/[?&]debug\b/.test(location.search)) window.__ll = { S: S, ITEMS: ITEMS, PDEF: PDEF, plan: plan, econRate: econRate, update: update, doFranchise: doFranchise, starsGain: starsGain, buyPerk: buyPerk, claimGoal: claimGoal, goalReady: goalReady, GORDER: GORDER, applySave: applySave, snapshot: snapshot, tapLot: tapLot, nightAmt: nightAmt, daylight: daylight, fee: fee, mult: mult, flow: flow, startRush: startRush, collectVip: collectVip, buildTray: buildTray, fmt: fmt, LOC: LOC };
})();
