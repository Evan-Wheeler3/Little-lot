(function () {
'use strict';
var cv = document.getElementById('scene'), ctx = cv.getContext('2d');
var HW = 40, HH = 20, OX = 300, OY = 110;
var INK = '#3b2f5c';
var REDUCE = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
var ZOFF = 0;
var VERSION = '1.1.5';

/* ---------- the layout (x runs east along the road, y runs south towards the camera) ----------
   Main road along x, north edge at RY; customers drive the lane nearest the lot (LANE0) and the road widens to the south.
   The lot sits north of the road: up to three units, each a bay row, an aisle and a bay row, ten columns wide.
   Cars enter up the entry lane (west edge, x ENX), drive east along an aisle to their bay, and leave down the exit lane (east edge).
   The market stands behind (north of) the top unit and moves back as the lot grows.
   The garage is west of the entry lane with its own driveway; the car wash is east, fed from the exit lane. */
var RY = 10, LANE0 = 10.5, ENX = -0.7, COLS_MAX = 10, UNITS = 3, SPAWNX = -18, DESPAWNX = 30;
var GX0 = -8.4, GX1 = -2.4, GY0 = 3.5, GY1 = 9.5, GIN = -5.9, GOUT = -4.9, GDOOR = 3.9;
var DH = 30, PERDECK = 9, GAR_PAY = 1.8, FEEG = 1.15;
var WX0 = 12.6, WX1 = 15.0, WRX = 16.2, WYS = [8.9, 7.7, 6.5, 5.3];

var S = {
  money: 25, totalRun: 0, lifetime: 0, stars: 0, tok: 0, franchises: 0, gems: 10,
  lvl: { space: 0, garage: 0, wash: 0, shop: 0, gate: 0, walk: 0, express: 0, valet: 0, fee: 0, ads: 0, rep: 0, ev: 0, concierge: 0, promoter: 0, crew: 0, manager: 0 },
  perk: { hustle: 0, gold: 0, head: 0, tap: 0, lucky: 0, rush: 0, night: 0, sleep: 0, blue: 0 },
  goal: { cars: 0, cash: 0, fee: 0, maxed: 0, deck: 0, vip: 0, wash: 0, rush: 0, fr: 0 },
  served: 0, vips: 0, rushes: 0, maxes: 0, washes: 0, taps: 0, bestFee: 0, bestDeck: 0,
  pass: false, starter: false, boostEnd: 0, daily: { day: 0, last: '' }, tut: 0, tutVip: false, iap: [],
  rush: 0, rushWait: 90, rushReady: 0, hype: 0, hlock: 0, atMax: false, parade: 0, tod: 0.85,
  t: 0, id: 0, spawnT: 0.5, vipT: 40, trafT: 0, gate: 0, deckAnim: 0, camSet: false, built: {},
  cam: { l: 0, t: 0, r: 700, b: 400 }, view: { z: 1, x: 0, y: 0, user: false },
  cars: [], traffic: [], walkers: [], spots: [], particles: [], fx: [], earn: [], pad: 0, padTarget: 0, w: 400, h: 600, safeT: 0, safeB: 0,
  tab: 'build', qty: 1, confirmFr: false,
  clouds: [{ x: -6, y: -8, s: 1, v: .22 }, { x: 6, y: 2, s: .8, v: .16 }, { x: 14, y: -4, s: 1.2, v: .2 }, { x: -14, y: 8, s: .9, v: .18 }]
};
var GS = [];   // garage slots: { car, color, type }
var MAXL = { space: 26, garage: 99, wash: Infinity, shop: Infinity, gate: Infinity, walk: Infinity, express: Infinity, valet: Infinity, fee: Infinity, ads: Infinity, rep: Infinity, ev: 30, concierge: 20, promoter: 20, crew: 15, manager: 12 };
var PMAX = { hustle: 17, gold: Infinity, head: Infinity, tap: 10, lucky: 10, rush: 10, night: 10, sleep: 5, blue: 4 };

/* ---------- settings: stored apart from the save so they stay per device ---------- */
var SET_KEY = 'littlelot.settings';
var SET = { sfx: true, music: true, haptics: true, daynight: true, notify: true, sci: false, saver: false };
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
function fmtX(n) { return n < 100 ? String(Math.round(n * 100) / 100) : fmt(n); }   // multipliers like x1.35
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
function pct(x) { return Math.round(x * 100) + '%'; }

/* ---------- the map: every franchise opens the next spot along the road, each with its own perk ---------- */
// mods: fee, demand and walk multiply; vip makes golden cars come more often; hustle slows the meter's drain; rush adds seconds of rush hour
var LOCS = [
  { name: 'Maple Street', theme: 'park', perk: 'Where it all began', mods: {} },
  { name: 'Palm Beach', theme: 'beach', perk: 'Beach crowds: +25% drivers', mods: { demand: 1.25 } },
  { name: 'Downtown', theme: 'city', perk: 'City prices: +30% parking fee', mods: { fee: 1.3 } },
  { name: 'Frosty Peaks', theme: 'snow', perk: 'Ski trips: golden cars twice as often', mods: { vip: 2 } },
  { name: 'Cactus Springs', theme: 'desert', perk: 'Wide streets: shoppers walk 30% faster', mods: { walk: 1.3 } },
  { name: 'Neon City', theme: 'neon', perk: 'Night life: the hustle meter drains half as fast', mods: { hustle: .5 } },
  { name: 'Harbor Point', theme: 'harbor', perk: 'Ferry rush: rush hours last 20s longer', mods: { rush: 20 } }
];
function locAt(i) {
  if (i < LOCS.length) return LOCS[i];
  var b = LOCS[1 + (i - 1) % (LOCS.length - 1)], lap = Math.floor((i - 1) / (LOCS.length - 1));
  return { name: b.name + ' ' + ['', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][Math.min(9, lap)], theme: b.theme, perk: b.perk, mods: b.mods };
}
function LOC() { return locAt(S.franchises); }
function mod(k, d) { var v = LOC().mods[k]; return v === undefined ? d : v; }

/* ---------- the lot's shape, from the Parking lot level ---------- */
function builtCols() { return 4 + S.lvl.space; }                 // columns of bay pairs, filled unit by unit
function unitCols(k) { return Math.max(0, Math.min(COLS_MAX, builtCols() - COLS_MAX * k)); }
function unitCount() { return Math.ceil(builtCols() / COLS_MAX); }
function unitY0(k) { return 6.5 - 3 * k; }                        // north edge of unit k (unit 0 is next to the road)
function aisleY(k) { return unitY0(k) + 1.5; }
function topY() { return unitY0(unitCount() - 1); }               // north edge of the lot
function walkY() { return topY() - .5; }                          // the walkway in front of the market
function shopFrontY() { return topY() - 1.05; }
function EXX() { return Math.min(COLS_MAX, unitCols(0)) + .7; }   // centre of the exit lane, just past the first unit's last column

/* ---------- the road, from the Road level: 2 lanes, then 4, then a boulevard, then a 6-lane highway ---------- */
function roadTier() { var g = S.lvl.gate; return g < 5 ? 0 : g < 15 ? 1 : g < 30 ? 2 : 3; }
var ROADS = [
  { w: 2, lanes: [[10.5, 1], [11.5, -1]], name: 'Two-lane street' },
  { w: 4, lanes: [[10.5, 1], [11.5, 1], [12.5, -1], [13.5, -1]], name: 'Four-lane avenue' },
  { w: 5.2, lanes: [[10.5, 1], [11.5, 1], [13.7, -1], [14.7, -1]], med: [12, 13.2, 'grass'], name: 'Boulevard' },
  { w: 6.8, lanes: [[10.5, 1], [11.5, 1], [12.5, 1], [14.1, -1], [15.1, -1], [16.1, -1]], med: [13, 13.6, 'wall'], name: 'Six-lane highway' }
];
function ROAD() { return ROADS[roadTier()]; }
function roadEnd() { return RY + ROAD().w; }

/* ---------- economy ---------- */
// Milestones: every endless upgrade line doubles its effect at level 10, 25, 50, 75, 100 and every 25 levels after that
function msCount(l) { return l < 10 ? 0 : l < 25 ? 1 : 1 + Math.floor(l / 25); }
function msNext(l) { return l < 10 ? 10 : (Math.floor(l / 25) + 1) * 25; }
function boostOn() { return S.boostEnd > Date.now(); }
// the franchise bonus: +35% income for every franchise point you have ever earned
function frMult(p) { return 1 + 0.35 * (p === undefined ? S.stars : p); }
function baseMult() { return frMult() * (1 + 0.25 * S.perk.gold) * (S.pass ? 2 : 1); }
function mult() { return baseMult() * (boostOn() ? 2 : 1); }
function rushFee() { return S.rush > 0 ? 1.5 : 1; }
// reputation brings nicer cars: each class pays x1.5, and every level adds 5%
var REP_TIERS = [0, 5, 15, 30, 50, 80];
var CLASS_NAMES = ['Small cars', 'Family cars', 'SUVs and trucks', 'Sports cars', 'Luxury cars', 'Supercars'];
function repTier(l) { l = l === undefined ? S.lvl.rep : l; var t = 0; for (var i = 1; i < REP_TIERS.length; i++) if (l >= REP_TIERS[i]) t = i; return t; }
function repMul(l) { l = l === undefined ? S.lvl.rep : l; return Math.pow(1.05, l) * Math.pow(1.5, repTier(l)); }
function fee() { return 3 * Math.pow(FEEG, S.lvl.fee) * Math.pow(2, msCount(S.lvl.fee)) * repMul() * mod('fee', 1) * mult() * rushFee(); }
// every visit: drive in, park, walk to the market, shop, walk back, drive out. Each step has an upgrade.
function speedMul() { return 1 + 3 * (1 - Math.pow(0.94, S.lvl.gate)) + 0.5 * (1 - Math.pow(0.9, S.lvl.valet)); }
function walkSpeed() { return 0.8 * (1 + 5 * (1 - Math.pow(0.93, S.lvl.walk))) * mod('walk', 1); }
function doorTime() { return 0.8 / (1 + 0.5 * S.lvl.valet); }
function visitAvg() { return 0.5 + 4.5 * Math.pow(0.93, S.lvl.express); }
function errandTime() { return 0.5 + (2.5 + Math.random() * 4) * Math.pow(0.93, S.lvl.express); }
function tipRate() { return 0.05 * S.lvl.shop * Math.pow(1.3, msCount(S.lvl.shop)); }
// drivers per second who want to park: advertising, a bigger road and the location bring more
function roadTraffic() { return 1 + 0.35 * roadTier() + 0.01 * S.lvl.gate; }
function demand() { return Math.min(18, 0.42 * Math.pow(1.06, S.lvl.ads) * Math.pow(1.5, msCount(S.lvl.ads)) * roadTraffic() * mod('demand', 1)) * (S.rush > 0 ? 2.5 : 1); }
function gapBase() { return 1 / demand(); }
// the garage can only go so high until you franchise: a nudge to start over, not a wall
function maxDecks() { return 4 + 2 * S.franchises; }
function garCap() { return S.lvl.garage * PERDECK; }
// car wash: some leaving drivers pull in for a wash that pays a share of the fee; more lanes at levels 10, 25 and 50
function washLanes() { var l = S.lvl.wash; return !l ? 0 : l < 10 ? 1 : l < 25 ? 2 : l < 50 ? 3 : 4; }
function washChance() { return S.lvl.wash ? Math.min(0.7, 0.2 + 0.02 * (S.lvl.wash - 1)) : 0; }
function washPrice() { return fee() * 0.6 * Math.pow(1.08, Math.max(0, S.lvl.wash - 1)) * Math.pow(2, msCount(S.lvl.wash)); }
// EV chargers go in column by column, from the gate end of the first row; a car at a charger pays half again
var EV_BONUS = 0.5;
function evBay(s) { return s.n < S.lvl.ev; }
/* ---------- hustle: steady taps fill the meter, which multiplies all income; it drains when you stop ---------- */
function hustleCap() { return 3 + S.perk.hustle; }
function hustleMul() { return 1 + (hustleCap() - 1) * S.hype; }
function tapPower() { return 0.05 * (1 + 0.2 * S.perk.tap); }
function drainRate() { return 0.06 * Math.pow(0.9, S.lvl.crew) * mod('hustle', 1); }
function flow() { return 1 + 0.6 * S.hype; }                   // the lot also moves a little faster
/* ---------- staff ---------- */
function vipMul() { return (1 + 0.25 * S.lvl.concierge) * (1 + 0.3 * S.perk.lucky); }
/* ---------- away from the lot ---------- */
function awayRate() { return Math.min(1, 0.4 + 0.08 * S.perk.sleep + 0.05 * S.lvl.manager); }
function awayCap() { return (4 + 2 * S.perk.night) * (S.pass ? 2 : 1) * 3600; }

/* ---------- bays ---------- */
// every bay: unit k, column c, row N or S; n is its order along the gate end (used for EV chargers)
function ensureSpots() {
  if (S.spots.length) return;
  for (var k = 0; k < UNITS; k++) for (var c = 0; c < COLS_MAX; c++) {
    var y0 = unitY0(k);
    S.spots.push({ k: k, c: c, x: c, y: y0, row: 'N', car: null, n: k * COLS_MAX + c });
    S.spots.push({ k: k, c: c, x: c, y: y0 + 2, row: 'S', car: null, n: k * COLS_MAX + c });
  }
}
function ensureSlots() { while (GS.length < garCap()) GS.push({ car: null, color: null }); }
function garFree() { var n = 0, cap = garCap(), i; for (i = 0; i < cap; i++) if (GS[i] && !GS[i].car) n++; return n; }
function unlocked(s) { return s.c < unitCols(s.k); }
function activeSpots() { return S.spots.filter(unlocked); }
function totalSpots() { return activeSpots().length + garCap(); }
function parkedCount() {
  var n = S.cars.filter(function (c) { return c.state === 'parked' || c.state === 'wantout'; }).length;
  return n + (garCap() - garFree());
}
// average trip lengths, for the steady-state income estimate
function lotTrip() {
  var sp = activeSpots(), drive = 0, walk = 0, ex = EXX(), fy = shopFrontY();
  sp.forEach(function (s) { var ay = aisleY(s.k); drive += 2 * (LANE0 - ay) + (ex - ENX); walk += 2 * (s.y + .5 - fy + 1.5); });
  return { drive: drive / Math.max(1, sp.length), walk: walk / Math.max(1, sp.length) };
}
function dwellAvg() { var t = lotTrip(); return 2 * doorTime() + t.walk / walkSpeed() + visitAvg() + t.drive / (2.1 * speedMul()) + 2; }
function dwellGarage() { return 2 * doorTime() + 2 * (GY0 + 1 - shopFrontY() + 6) / walkSpeed() + visitAvg() + 3; }
// what the lot earns each second if drivers keep coming, without hustle (used for away earnings, rewards and balancing)
function econRate() {
  var D = demand() / (S.rush > 0 ? 2.5 : 1), nM = activeSpots().length, nG = garCap();
  var capM = nM / dwellAvg() * 0.85, capG = nG ? nG / dwellGarage() * 0.85 : 0;
  var fM = Math.min(D, capM), fG = Math.min(D - fM, capG), f = fee() / rushFee();
  var evFrac = Math.min(1, S.lvl.ev * 2 / Math.max(1, nM));
  var wash = Math.min(fM * washChance(), 0.5 * washLanes() * speedMul()) * (S.lvl.wash ? washPrice() / rushFee() : 0);
  return (fM * (1 + EV_BONUS * evFrac) + fG * GAR_PAY) * f * (1 + tipRate()) + wash;
}
function econBase() { return econRate() / (boostOn() ? 2 : 1); }
// franchise points come from everything you have ever earned; franchising pays out the points earned since last time
var STAR_BASE = 3e6;
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
    lvl: S.lvl, perk: S.perk, goal: S.goal, served: S.served, vips: S.vips, rushes: S.rushes, maxes: S.maxes, washes: S.washes, taps: S.taps,
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
  var k;
  S.money = 25; S.totalRun = 0; S.lifetime = 0; S.stars = 0; S.franchises = 0; S.tok = 0; S.gems = 10;
  S.served = 0; S.vips = 0; S.rushes = 0; S.maxes = 0; S.washes = 0; S.taps = 0; S.bestFee = 0; S.bestDeck = 0;
  S.pass = false; S.starter = false; S.boostEnd = 0; S.daily = { day: 0, last: '' }; S.tut = 0; S.tutVip = false; S.iap = [];
  for (k in S.lvl) S.lvl[k] = 0;
  for (k in S.perk) S.perk[k] = 0;
  for (k in S.goal) S.goal[k] = 0;
  if (j) {
    S.money = num(j.money); S.totalRun = num(j.totalRun); S.lifetime = num(j.lifetime);
    S.stars = Math.floor(num(j.stars)); S.franchises = Math.floor(num(j.fr)); S.tok = Math.floor(num(j.tok));
    S.gems = j.gems === undefined ? 10 : Math.floor(num(j.gems));
    S.served = num(j.served); S.vips = num(j.vips); S.rushes = num(j.rushes); S.maxes = num(j.maxes); S.washes = num(j.washes); S.taps = num(j.taps);
    for (k in S.lvl) S.lvl[k] = Math.min(MAXL[k], Math.floor(num(j.lvl && j.lvl[k])));
    S.lvl.garage = Math.min(S.lvl.garage, maxDecks());
    for (k in S.perk) S.perk[k] = Math.min(PMAX[k], Math.floor(num(j.perk && j.perk[k])));
    for (k in S.goal) S.goal[k] = Math.floor(num(j.goal && j.goal[k]));
    S.bestFee = Math.max(S.lvl.fee, num(j.bestFee)); S.bestDeck = Math.max(S.lvl.garage, num(j.bestDeck));
    S.pass = !!j.pass; S.starter = !!j.starter; S.boostEnd = num(j.boostEnd);
    if (j.daily) S.daily = { day: Math.floor(num(j.daily.day)) % 7, last: String(j.daily.last || '') };
    S.tut = j.tut === undefined ? (S.lifetime > 500 ? 99 : 0) : Math.floor(num(j.tut)); S.tutVip = !!j.tutVip || S.vips > 0;
    if (Array.isArray(j.iap)) S.iap = j.iap.filter(function (x) { return typeof x === 'string'; });
  }
  S.spots = []; ensureSpots(); GS = []; ensureSlots();
  S.deckAnim = S.lvl.garage; S.camSet = false; S.rush = 0; S.rushReady = 0; S.rushWait = 90; S.hype = 0; S.hlock = 0; S.parade = 0;
  S.theme = LOC().theme; buildTown();
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
// SEAMS: a thin same-colour outline hides hairline gaps between faces. It doubles the drawing cost,
// so it is only switched on while the still parts of the world are baked into the cached background.
var SEAMS = false;
function poly(pts, fill, edge, ew) {
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
  for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (ew > 0 || (ew === undefined && SEAMS)) { ctx.lineWidth = ew || 1; ctx.strokeStyle = edge || fill; ctx.lineJoin = 'round'; ctx.stroke(); }
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
// soft light for the night pass (drawn with 'lighter'): one small pre-rendered sprite per colour, stretched into place
var GLOWS = {};
function glow(x, y, r, col, a) {
  var sp = GLOWS[col];
  if (!sp) {
    sp = GLOWS[col] = document.createElement('canvas'); sp.width = sp.height = 64;
    var g2 = sp.getContext('2d'), g = g2.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); g2.fillStyle = g; g2.fillRect(0, 0, 64, 64);
  }
  ctx.globalAlpha = a; ctx.drawImage(sp, x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1;
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
  mini: { L: .56, W: .38, b: 6.5, cl: .62, cw: .86, ch: 6, co: -.06 },
  hatch: { L: .62, W: .42, b: 7.5, cl: .6, cw: .86, ch: 7, co: -.1 },
  sedan: { L: .74, W: .44, b: 7.5, cl: .55, cw: .86, ch: 6.5, co: -.04 },
  wagon: { L: .8, W: .44, b: 7.5, cl: .76, cw: .88, ch: 6.5, co: -.06 },
  van: { L: .84, W: .48, b: 9, cl: .82, cw: .92, ch: 8, co: -.04 },
  taxi: { L: .74, W: .44, b: 7.5, cl: .55, cw: .86, ch: 6.5, co: -.04, sign: true, color: '#ffd04a' },
  suv: { L: .8, W: .48, b: 9, cl: .66, cw: .88, ch: 7, co: -.06 },
  pickup: { L: .84, W: .46, b: 7, cl: .34, cw: .88, ch: 7, co: .14, bed: true },
  sport: { L: .78, W: .46, b: 5.5, cl: .42, cw: .8, ch: 5, co: -.08 },
  lux: { L: .92, W: .46, b: 7.5, cl: .58, cw: .86, ch: 6.5, co: -.08 },
  super: { L: .84, W: .5, b: 4.5, cl: .34, cw: .76, ch: 4, co: -.06, low: true },
  limo: { L: 1.0, W: .46, b: 7.5, cl: .7, cw: .86, ch: 6.5, co: -.04, color: '#ffd04a' }
};
// the six classes Reputation unlocks, from rattly small cars to supercars
var CLASS_TYPES = [['mini', 'hatch'], ['sedan', 'wagon', 'van', 'taxi'], ['suv', 'pickup', 'sedan'], ['sport', 'suv'], ['lux', 'sport'], ['super', 'lux']];
var CLASS_COLORS = [
  ['#c9a27a', '#9fb3a0', '#b5a8c9', '#d49a8a', '#a8b8c8', '#c8c08a'],
  ['#ff7a6b', '#5fd6a4', '#5db8ff', '#b79bff', '#ff9ccf', '#ff9f5a', '#f4f1ea'],
  ['#5a6488', '#e8505b', '#f4f1ea', '#3d8bff', '#4f9a6a', '#b0b4c8'],
  ['#ff3b3b', '#ffd400', '#2e8bff', '#ff7a00', '#16c79a'],
  ['#1f1d2b', '#e8e8ee', '#3a3f58', '#6b1f2e', '#c9b27a'],
  ['#ff2d55', '#ffd400', '#2ee6a8', '#ff7a00', '#7b5cff', '#f4f4f8']
];
// newer classes show up more often than older ones
function pickCar() {
  var t = repTier(), w = [], tot = 0, i, r;
  for (i = 0; i <= t; i++) { w.push(i === t ? 3 : i === t - 1 ? 1.5 : .5); tot += w[i]; }
  r = Math.random() * tot;
  for (i = 0; i <= t; i++) { r -= w[i]; if (r <= 0) break; }
  i = Math.min(i, t);
  var ts = CLASS_TYPES[i], type = ts[Math.floor(Math.random() * ts.length)], cs = CLASS_COLORS[i];
  return { type: type, color: CARS[type].color || cs[Math.floor(Math.random() * cs.length)] };
}
function facePoly(cx, cy, a, u, v0, v1, z0, z1, col) {
  var p = orel(cx, cy, a, u, v0), q = orel(cx, cy, a, u, v1);
  poly([P(p.x, p.y, z1), P(q.x, q.y, z1), P(q.x, q.y, z0), P(p.x, p.y, z0)], col, null, 0);
}
function drawCar(c) {
  var m = CARS[c.type] || CARS.sedan, a = c.ang, L = m.L, W = m.W, hl = L / 2, hw = W / 2, i;
  var bob = (c.moving && !REDUCE) ? Math.sin(S.t * 16 + c.id) * .7 : 0, zb = 3 + bob;
  var al = 1;
  if (c.g) al = Math.min(al, Math.max(0, Math.min(1, (c.y - GY1 + .05) / .9)));   // drive into / out of the garage doorway
  if (c.inWash) al = Math.min(al, Math.max(0, Math.min(1, (WX0 + .3 - c.x) / .5, (c.x - WX1 + .3) / .5)));
  if (al <= 0) return;
  ctx.globalAlpha = al;
  var sh = [orel(c.x, c.y, a, hl + .05, -hw - .05), orel(c.x, c.y, a, hl + .05, hw + .05), orel(c.x, c.y, a, -hl - .05, hw + .05), orel(c.x, c.y, a, -hl - .05, -hw - .05)];
  poly(sh.map(function (p) { return P(p.x, p.y); }), 'rgba(40,30,80,.22)', null, 0);
  // speed streaks when the lot is hustling
  var fl = flow();
  if (c.moving && fl > 1.2 && !REDUCE) [-.14, .14].forEach(function (v) {
    var p = orel(c.x, c.y, a, -hl - .08, v), q = orel(c.x, c.y, a, -hl - .08 - .3 * (fl - 1), v);
    line(P(p.x, p.y, zb + 5), P(q.x, q.y, zb + 5), 2, 'rgba(255,255,255,.7)');
  });
  var wh = [[.3, -.5], [.3, .5], [-.3, .5], [-.3, -.5]].map(function (w) { return orel(c.x, c.y, a, w[0] * L, w[1] * W); });
  wh.sort(function (p, q) { return (p.x + p.y) - (q.x + q.y); });
  // all four tyres in one fill, then all four hubs in one fill
  var wp = wh.map(function (w) { return P(w.x, w.y, 3.4); });
  ctx.beginPath(); wp.forEach(function (p) { ctx.moveTo(p.x + 3.7, p.y); ctx.arc(p.x, p.y, 3.7, 0, 6.2832); }); ctx.fillStyle = '#2d2842'; ctx.fill();
  ctx.beginPath(); wp.forEach(function (p) { ctx.moveTo(p.x + 1.5, p.y); ctx.arc(p.x, p.y, 1.5, 0, 6.2832); }); ctx.fillStyle = '#d7d1ea'; ctx.fill();
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
  obox(c.x + ca * m.co * L, c.y + sa * m.co * L, a, hl * m.cl, hw * m.cw, zt, zt + m.ch, m.low ? .6 : .74, .8, 0, shade(col, 1.08), function (f) { return f === 0 || f === 2 ? '#bfe6ff' : glass; });
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
/* ---------- houses: real roofs and a few shapes ----------
   d: x, y, w, d (footprint), h (wall height), c (walls), r (roof), kind (gable | hip | flat | two | ell),
   ridge ('x' or 'y'), face ('S' or 'E': which visible side has the front door), plus chimney, porch, garage. */
var RO = .12;   // roof overhang
// gable roof with the ridge along x: back slope, the gable wall on the east end, front slope, trim
function roofGableX(x0, y0, x1, y1, h, rh, r, c) {
  var ym = (y0 + y1) / 2, t = h + rh;
  poly([P(x0 - RO, y0 - RO, h), P(x1 + RO, y0 - RO, h), P(x1 + RO, ym, t), P(x0 - RO, ym, t)], shade(r, .78));
  poly([P(x1, y0, h), P(x1, y1, h), P(x1, ym, t)], shade(c, FR));
  poly([P(x0 - RO, y1 + RO, h), P(x1 + RO, y1 + RO, h), P(x1 + RO, ym, t), P(x0 - RO, ym, t)], shade(r, 1.02));
  line(P(x1 + RO, y1 + RO, h), P(x1 + RO, ym, t), 1.6, shade(r, .62)); line(P(x1 + RO, ym, t), P(x1 + RO, y0 - RO, h), 1.6, shade(r, .62));
}
// gable roof with the ridge along y: the gable wall faces the front (south)
function roofGableY(x0, y0, x1, y1, h, rh, r, c) {
  var xm = (x0 + x1) / 2, t = h + rh;
  poly([P(x0 - RO, y0 - RO, h), P(x0 - RO, y1 + RO, h), P(xm, y1 + RO, t), P(xm, y0 - RO, t)], shade(r, .86));
  poly([P(x0, y1, h), P(x1, y1, h), P(xm, y1, t)], shade(c, FL));
  poly([P(x1 + RO, y0 - RO, h), P(x1 + RO, y1 + RO, h), P(xm, y1 + RO, t), P(xm, y0 - RO, t)], shade(r, .74));
  line(P(x0 - RO, y1 + RO, h), P(xm, y1 + RO, t), 1.6, shade(r, .62)); line(P(xm, y1 + RO, t), P(x1 + RO, y1 + RO, h), 1.6, shade(r, .62));
}
// hip roof: four slopes up to a short ridge
function roofHip(x0, y0, x1, y1, h, rh, r) {
  var alongX = x1 - x0 >= y1 - y0, t = h + rh, a = x0 - RO, b = x1 + RO, c0 = y0 - RO, c1 = y1 + RO;
  if (alongX) {
    var ym = (y0 + y1) / 2, ri = (y1 - y0) / 2;
    poly([P(a, c0, h), P(b, c0, h), P(x1 - ri, ym, t), P(x0 + ri, ym, t)], shade(r, .78));
    poly([P(a, c0, h), P(x0 + ri, ym, t), P(a, c1, h)], shade(r, .86));
    poly([P(b, c0, h), P(b, c1, h), P(x1 - ri, ym, t)], shade(r, .74));
    poly([P(a, c1, h), P(b, c1, h), P(x1 - ri, ym, t), P(x0 + ri, ym, t)], shade(r, 1.02));
  } else {
    var xm = (x0 + x1) / 2, rj = (x1 - x0) / 2;
    poly([P(a, c0, h), P(xm, y0 + rj, t), P(xm, y1 - rj, t), P(a, c1, h)], shade(r, .86));
    poly([P(a, c0, h), P(b, c0, h), P(xm, y0 + rj, t)], shade(r, .78));
    poly([P(b, c0, h), P(b, c1, h), P(xm, y1 - rj, t), P(xm, y0 + rj, t)], shade(r, .74));
    poly([P(a, c1, h), P(b, c1, h), P(xm, y1 - rj, t)], shade(r, 1.02));
  }
}
function roofFlat(x0, y0, x1, y1, h, r) {
  prism(x0 - .04, y0 - .04, h, x1 + .04, y1 + .04, h + 3, shade(r, 1.05));
  poly([P(x0 + .12, y0 + .12, h + 3), P(x1 - .12, y0 + .12, h + 3), P(x1 - .12, y1 - .12, h + 3), P(x0 + .12, y1 - .12, h + 3)], shade(r, .82), null, 0);
}
function houseBox(x0, y0, x1, y1, h, c, face, rows, door) {
  prism(x0, y0, 0, x1, y1, h, c);
  var w = x1 - x0, d = y1 - y0, glass = '#9ad4ff';
  winL(x0 + .12, x1 - .12, y1, h * .18, h * .9, Math.max(1, Math.round(w * 1.4)), rows, glass);
  winR(x1, y0 + .12, y1 - .12, h * .18, h * .9, Math.max(1, Math.round(d * 1.2)), rows, glass);
  if (!door) return;
  if (face === 'E') { var dy = y0 + d * .55; poly([P(x1 + .005, dy - .12, 0), P(x1 + .005, dy + .12, 0), P(x1 + .005, dy + .12, 14), P(x1 + .005, dy - .12, 14)], '#7a5a9a', null, 0); }
  else { var dx = x0 + w * .5; poly([P(dx - .12, y1 + .005, 0), P(dx + .12, y1 + .005, 0), P(dx + .12, y1 + .005, 14), P(dx - .12, y1 + .005, 14)], '#7a5a9a', null, 0); }
}
// yard, driveway and hedges, drawn under the house
function drawHouseGround(d) {
  var g = TH().ground[2], x0 = d.x - .15, y0 = d.y - .15, x1 = d.x + d.w + .15, y1 = d.y + d.d + .15;
  poly([P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)], shade(g, d.lawn || .96));
  if (d.drive) { var dx = d.x + d.w * (d.face === 'E' ? .5 : .78); poly([P(dx - .2, d.y + d.d), P(dx + .2, d.y + d.d), P(dx + .2, y1 + d.drive), P(dx - .2, y1 + d.drive)], '#e2ddd0'); }
}
function drawHouse(d) {
  var x0 = d.x, y0 = d.y, x1 = d.x + d.w, y1 = d.y + d.d, h = d.h, r = d.r, c = d.c;
  if (d.garage) {   // attached single garage on the east side, lower flat roof
    var gx0 = x1, gx1 = x1 + .75, gy0 = y1 - .85;
    prism(gx0, gy0, 0, gx1, y1, 14, shade(c, .97));
    poly([P(gx0 + .1, y1 + .005, 0), P(gx1 - .1, y1 + .005, 0), P(gx1 - .1, y1 + .005, 11), P(gx0 + .1, y1 + .005, 11)], '#e9edf7', null, 0);
    for (var k = 1; k < 4; k++) line(P(gx0 + .1, y1 + .006, k * 2.8), P(gx1 - .1, y1 + .006, k * 2.8), 1, 'rgba(120,120,150,.5)', 'butt');
    roofFlat(gx0, gy0, gx1, y1, 14, r);
  }
  if (d.kind === 'ell') {   // a wing sticking out to the front on the west side
    var wx1 = x0 + d.w * .48, wy1 = y1 + .9;
    houseBox(x0, y0, x1, y1, h, c, d.face, 1, false);
    roofGableX(x0, y0, x1, y1, h, d.d * 11, r, c);
    houseBox(x0, y1, wx1, wy1, h, shade(c, 1.02), 'S', 1, true);
    roofGableY(x0, y1 - .2, wx1, wy1, h, (wx1 - x0) * 11, r, c);
  } else {
    var rows = d.kind === 'two' ? 2 : 1;
    houseBox(x0, y0, x1, y1, h, c, d.face, rows, true);
    if (d.kind === 'flat') roofFlat(x0, y0, x1, y1, h, r);
    else if (d.kind === 'hip') roofHip(x0, y0, x1, y1, h, Math.min(d.w, d.d) * 9, r);
    else if (d.ridge === 'y') roofGableY(x0, y0, x1, y1, h, d.w * 11, r, c);
    else roofGableX(x0, y0, x1, y1, h, d.d * 11, r, c);
  }
  if (d.chimney && d.kind !== 'flat') prism(x0 + d.w * .22, y0 + d.d * .3, h, x0 + d.w * .22 + .2, y0 + d.d * .3 + .2, h + (d.kind === 'hip' ? 16 : d.d * 11 + 4), shade(c, .8));
  if (d.porch && d.face !== 'E' && d.kind !== 'ell') {   // a little roof on posts over the front door
    var px = x0 + d.w * .5;
    prism(px - .3, y1 + .3, 0, px - .26, y1 + .34, 12, '#f4f1ea'); prism(px + .26, y1 + .3, 0, px + .3, y1 + .34, 12, '#f4f1ea');
    prism(px - .38, y1, 12, px + .38, y1 + .4, 14, shade(r, .9));
  }
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
/* ---------- the market: a corner store that grows into a mega mall with the Market level ---------- */
var SHOP_TIERS = [0, 5, 15, 30, 60];
var SHOP_NAMES = ['Corner store', 'Market', 'Market hall', 'Shopping mall', 'Mega mall'];
var AWN = ['#ff7a6b', '#5db8ff', '#ffd04a', '#5fd6a4', '#b79bff', '#ff9ccf'];
function shopTier(l) { l = l === undefined ? S.lvl.shop : l; var t = 0; for (var i = 1; i < SHOP_TIERS.length; i++) if (l >= SHOP_TIERS[i]) t = i; return t; }
function shopSpan() { return [[1, 4.2], [.2, 7.6], [-.4, 9.8], [-.8, 10.4], [-.8, 10.4]][shopTier()]; }
function shopDoors() {
  var sp = shopSpan(), t = shopTier(), n = [2, 5, 7, 6, 6][t], out = [], i, w = sp[1] - sp[0];
  for (i = 0; i < n; i++) out.push(sp[0] + w * (i + .5) / n);
  if (t >= 3) out.push((sp[0] + sp[1]) / 2);   // the mall's glass atrium
  return out;
}
function nearestDoor(x) { var d = shopDoors(), best = d[0]; d.forEach(function (q) { if (Math.abs(q - x) < Math.abs(best - x)) best = q; }); return best; }
function drawMarket() {
  var t = shopTier(), sp = shopSpan(), x0 = sp[0], x1 = sp[1], y1 = shopFrontY(), y0 = y1 - 2.1, i;
  var h = [26, 30, 50, 56, 56][t], body = ['#fff0d4', '#fff0d4', '#ffe6c9', '#f4ecff', '#eef4ff'][t], trim = ['#ff8a7a', '#ff8a7a', '#e06a5a', '#8b6bd0', '#3d8bff'][t];
  var lit = {}, doors = shopDoors();
  S.walkers.forEach(function (w) { if (w.state === 'inside') lit[w.door] = true; });
  poly([P(x0 - .4, y1), P(x1 + .4, y1), P(x1 + .4, y1 + .7), P(x0 - .4, y1 + .7)], 'rgba(40,30,80,.12)', null, 0);
  if (t >= 3) { drawMall(t, x0, x1, y0, y1, lit, doors); return; }
  if (t === 4) {   // the mega mall's tower behind
    var tx0 = (x0 + x1) / 2 - .4, tx1 = tx0 + 2.6;
    prism(tx0, y0 - .2, 0, tx1, y0 + 1.6, 168, '#7fb5ff');
    for (i = 1; i < 12; i++) { line(P(tx0, y0 + 1.6, i * 14), P(tx1, y0 + 1.6, i * 14), 1.6, 'rgba(255,255,255,.55)'); line(P(tx1, y0 - .2, i * 14), P(tx1, y0 + 1.6, i * 14), 1.6, 'rgba(255,255,255,.35)'); }
    prism(tx0 + .2, y0, 168, tx1 - .2, y0 + 1.4, 196, '#ffffff');
    faceText('LITTLE LOT', P((tx0 + tx1) / 2, y0 + 1.4, 182), 'L', 10, '#3d8bff');
  }
  prism(x0, y0, 0, x1, y1, h, body);
  prism(x0 - .06, y0 - .06, h, x1 + .06, y1 + .06, h + 5, trim);
  if (t >= 2) {   // upper floor windows
    winL(x0 + .2, x1 - .2, y1, 30, h - 4, Math.round((x1 - x0) * 1.4), 1, t >= 3 ? '#bfe6ff' : '#9ad4ff');
    winR(x1, y0 + .2, y1 - .2, 30, h - 4, 3, 1, '#bfe6ff');
    prism(x0, y1 - .02, 26, x1, y1 + .1, 29, trim);
  }
  doors.forEach(function (dx, j) {
    var on = lit[dx], w = t >= 3 && j === doors.length - 1 ? .9 : .32;
    poly([P(dx - w, y1 + .01, 0), P(dx + w, y1 + .01, 0), P(dx + w, y1 + .01, 18), P(dx - w, y1 + .01, 18)], on ? '#ffe28a' : '#6e5a9e', null, 0);
    if (t < 3) {   // striped awning over each door
      var c = AWN[j % 6];
      poly([P(dx - .44, y1, 26), P(dx, y1, 26), P(dx, y1 + .22, 19), P(dx - .44, y1 + .22, 19)], shade(c, FT));
      poly([P(dx, y1, 26), P(dx + .44, y1, 26), P(dx + .44, y1 + .22, 19), P(dx, y1 + .22, 19)], shade('#ffffff', .96));
      poly([P(dx - .44, y1 + .22, 19), P(dx + .44, y1 + .22, 19), P(dx + .44, y1 + .22, 17), P(dx - .44, y1 + .22, 17)], shade(c, .8));
    } else if (w < .5) {
      poly([P(dx - .5, y1 + .02, 21), P(dx + .5, y1 + .02, 21), P(dx + .5, y1 + .02, 25), P(dx - .5, y1 + .02, 25)], AWN[j % 6], null, 0);
    }
  });
  if (t >= 3) {   // glass atrium in the middle
    var ax = doors[doors.length - 1];
    prism(ax - 1.2, y0 + .4, 0, ax + 1.2, y1 + .3, h + 22, '#8fd0f5');
    for (i = 1; i < 6; i++) line(P(ax - 1.2, y1 + .3, i * (h + 22) / 6), P(ax + 1.2, y1 + .3, i * (h + 22) / 6), 1.5, 'rgba(255,255,255,.6)');
    for (i = 1; i < 4; i++) line(P(ax - 1.2 + i * .6, y1 + .3, 0), P(ax - 1.2 + i * .6, y1 + .3, h + 22), 1.5, 'rgba(255,255,255,.6)');
    poly([P(ax - .7, y1 + .31, 0), P(ax + .7, y1 + .31, 0), P(ax + .7, y1 + .31, 20), P(ax - .7, y1 + .31, 20)], lit[ax] ? '#ffe28a' : '#5a7fa8', null, 0);
    faceText(t === 4 ? 'MEGA MALL' : 'MALL', P(ax, y1 + .31, h + 12), 'L', t === 4 ? 11 : 14, '#ffffff');
    // anchor stores at each end
    prism(x0, y0 + .3, 0, x0 + 1.6, y1 + .15, h + 8, '#ff9ccf'); prism(x1 - 1.6, y0 + .3, 0, x1, y1 + .15, h + 8, '#5fd6a4');
    faceText('SHOES', P(x0 + .8, y1 + .15, h), 'L', 8, '#fff'); faceText('FOOD', P(x1 - .8, y1 + .15, h), 'L', 8, '#fff');
  } else {
    var sw = t === 0 ? 1.3 : 2.4, sx = (x0 + x1) / 2;
    prism(sx - sw / 2, y1 - .3, h + 5, sx + sw / 2, y1 - .15, h + 18, '#ffffff');
    faceText(['STORE', 'MARKET', 'MARKET HALL'][t], P(sx, y1 - .15, h + 11.5), 'L', t === 2 ? 8 : 9, trim);
  }
  if (t >= 2) for (i = 0; i < 3; i++) prism(x0 + 1 + i * 2.5, y0 + .5, h + 5, x0 + 1.7 + i * 2.5, y0 + 1.1, h + 11, '#c9cfdd');   // rooftop units
  if (t >= 1) { drawPlanter(x0 - .2, y1 + .45); drawPlanter(x1 + .2, y1 + .45); }
}
// the mall: one clean block with a glass shopfront, store signs above it and a canopy over the main entrance.
// The mega mall is taller, adds a second glass floor and a glass dome on the roof.
function drawMall(t, x0, x1, y0, y1, lit, doors) {
  var mega = t === 4, h = mega ? 62 : 44, body = mega ? '#eef2ff' : '#f6f0ff', trim = mega ? '#3d8bff' : '#8b6bd0', i;
  var ax = doors[doors.length - 1], w = x1 - x0;
  prism(x0, y0, 0, x1, y1, h, body);
  prism(x0 - .06, y0 - .06, h, x1 + .06, y1 + .06, h + 4, trim);
  // ground floor shopfront: one glass band with mullions
  poly([P(x0 + .15, y1 + .01, 4), P(x1 - .15, y1 + .01, 4), P(x1 - .15, y1 + .01, 22), P(x0 + .15, y1 + .01, 22)], '#a9dcf7', null, 0);
  for (i = 1; i < w * 2; i++) line(P(x0 + .15 + i * .5, y1 + .012, 4), P(x0 + .15 + i * .5, y1 + .012, 22), 1.2, 'rgba(255,255,255,.7)', 'butt');
  doors.forEach(function (dx, j) {
    if (j === doors.length - 1) return;
    poly([P(dx - .28, y1 + .015, 4), P(dx + .28, y1 + .015, 4), P(dx + .28, y1 + .015, 17), P(dx - .28, y1 + .015, 17)], lit[dx] ? '#ffe28a' : '#6e7fb0', null, 0);
    poly([P(dx - .42, y1 + .015, 25), P(dx + .42, y1 + .015, 25), P(dx + .42, y1 + .015, 31), P(dx - .42, y1 + .015, 31)], AWN[j % 6], null, 0);   // store sign
  });
  if (mega) {   // second floor glass and a sign band
    poly([P(x0 + .15, y1 + .01, 36), P(x1 - .15, y1 + .01, 36), P(x1 - .15, y1 + .01, 54), P(x0 + .15, y1 + .01, 54)], '#bfe6ff', null, 0);
    for (i = 1; i < w * 2; i++) line(P(x0 + .15 + i * .5, y1 + .012, 36), P(x0 + .15 + i * .5, y1 + .012, 54), 1.2, 'rgba(255,255,255,.7)', 'butt');
  }
  winR(x1, y0 + .2, y1 - .2, 6, h - 8, 3, mega ? 2 : 1, '#bfe6ff');
  // main entrance: a canopy on two posts over glass doors, the name above
  poly([P(ax - .7, y1 + .02, 0), P(ax + .7, y1 + .02, 0), P(ax + .7, y1 + .02, 20), P(ax - .7, y1 + .02, 20)], lit[ax] ? '#ffe28a' : '#5a7fa8', null, 0);
  prism(ax - .95, y1 + .55, 0, ax - .85, y1 + .65, 22, '#e9edf7'); prism(ax + .85, y1 + .55, 0, ax + .95, y1 + .65, 22, '#e9edf7');
  prism(ax - 1.05, y1, 22, ax + 1.05, y1 + .7, 25, trim);
  faceText(mega ? 'MEGA MALL' : 'MALL', P(ax, y1 + .02, mega ? 45 : 35), 'L', mega ? 10 : 12, trim);
  // roof: skylights, units, and the mega mall's glass dome
  ZOFF = h + 4;
  for (i = 0; i < 3; i++) prism(x0 + .8 + i * (w / 3), y0 + .5, 0, x0 + 1.5 + i * (w / 3), y0 + 1.1, 6, '#c9cfdd');
  if (mega) { frustum(ax, (y0 + y1) / 2, 2.2, 1.4, 1.2, .7, 0, 14, 0, 0, '#cfeeff', shade('#8fd0f5', FL), shade('#8fd0f5', FR)); prism(ax - .1, (y0 + y1) / 2 - .1, 14, ax + .1, (y0 + y1) / 2 + .1, 22, '#e9edf7'); }
  else quadA(ax - 1, y0 + .4, ax + 1, y1 - .4, '#cfeeff');
  ZOFF = 0;
  drawPlanter(x0 - .2, y1 + .45); drawPlanter(x1 + .2, y1 + .45);
}
function drawPlanter(x, y) {
  prism(x - .18, y - .14, 0, x + .18, y + .14, 6, '#c98a5a');
  cone(x - .07, y, .12, 6, 14, '#4dc476', 5); cone(x + .08, y + .02, .11, 6, 12, '#5fd6a4', 5);
  var f = P(x, y, 14); circle(f.x - 3, f.y, 2, '#ff9ccf'); circle(f.x + 3, f.y + 1, 2, '#ffd04a');
}

/* ---------- lot fixtures ---------- */
function freeCount() { return activeSpots().filter(function (s) { return !s.car; }).length + garFree(); }
function drawBooth() {
  var x = -1.85, y = 8.75, open = freeCount() > 0;
  prism(x - .32, y - .3, 0, x + .32, y + .3, 26, '#fff0c4');
  poly([P(x - .22, y + .3, 22), P(x + .22, y + .3, 22), P(x + .22, y + .3, 11), P(x - .22, y + .3, 11)], '#9ad4ff', null, 0);
  frustum(x, y, .9, .85, .6, .55, 26, 34, 0, 0, shade('#ff7a6b', FT), shade('#ff7a6b', FL), shade('#ff7a6b', FR));
  cone(x, y, .09, 34, 44, open ? '#58e08a' : '#ff5d5d', 6);
}
// barrier arms across the entry and exit lanes, lifted while a car passes
function drawArm(x, open) {
  var y = 9.35, L = .95;
  prism(x - .08, y - .08, 0, x + .08, y + .08, 13, '#ff7a6b');
  var th = open * 1.25, a = P(x, y, 12), b = P(x + L * Math.cos(th), y, 12 + 38 * Math.sin(th));
  line(a, b, 7, '#b8453b', 'butt');
  for (var i = 0; i < 6; i++) {
    var u0 = i / 6, u1 = (i + 1) / 6;
    line({ x: a.x + (b.x - a.x) * u0, y: a.y + (b.y - a.y) * u0 }, { x: a.x + (b.x - a.x) * u1, y: a.y + (b.y - a.y) * u1 }, 4.6, i % 2 ? '#ff6b5e' : '#ffffff', 'butt');
  }
  circle(a.x, a.y, 3.2, '#ffd04a');
}
function drawEntranceSign() {
  var n = freeCount(), x = -2.0, y = 9.75;
  prism(x - .04, y - .04, 0, x + .04, y + .04, 54, '#6b6590');
  prism(x - .55, y - .07, 54, x + .55, y + .07, 82, n ? '#2fae7c' : '#e0584f');
  faceText(n ? 'FREE' : 'LOT', P(x, y + .07, 76), 'L', 8, '#e9fff4');
  faceText(n ? String(n) : 'FULL', P(x, y + .07, 63), 'L', n > 99 ? 12 : 16, '#ffffff');
}
function drawLotLamp(x, y) {
  prism(x - .04, y - .04, 0, x + .04, y + .04, 40, '#7a7aa0');
  prism(x - .2, y - .06, 40, x + .2, y + .06, 43, '#7a7aa0');
  prism(x - .2, y - .07, 37.5, x - .1, y + .07, 40, '#fff3c4'); prism(x + .1, y - .07, 37.5, x + .2, y + .07, 40, '#fff3c4');
}
// lamp posts on the lines where bay rows meet, every third column
function lotLamps() {
  var out = [], k, c, n = unitCount();
  for (k = 0; k <= n; k++) {
    var y = k === 0 ? 9.5 : unitY0(k - 1);
    var cols = Math.max(unitCols(k), k ? unitCols(k - 1) : 0);
    for (c = 0; c <= cols; c += 3) out.push([c, y]);
  }
  return out;
}
// EV charger at the back of a bay: the post is baked into the background, the cable to a plugged-in car pulses live
function chargerAt(s) { return { x: s.x + .18, y: s.row === 'N' ? s.y + .1 : s.y + .9 }; }
function drawChargerPost(s) {
  var c = chargerAt(s), bx = c.x, by = c.y;
  prism(bx - .06, by - .05, 0, bx + .06, by + .05, 15, '#e9edf7');
  prism(bx - .07, by - .06, 15, bx + .07, by + .06, 18, '#2fae7c');
  var p = P(bx + .07, by, 10);
  ctx.fillStyle = '#ffd04a'; ctx.beginPath(); ctx.moveTo(p.x + 1, p.y - 4); ctx.lineTo(p.x - 2, p.y + .5); ctx.lineTo(p.x, p.y + .5); ctx.lineTo(p.x - 1, p.y + 4); ctx.lineTo(p.x + 2, p.y - .5); ctx.lineTo(p.x, p.y - .5); ctx.closePath(); ctx.fill();
}
function drawCable(s) {
  var c = chargerAt(s), p = P(c.x + .07, c.y, 10), cp = P(s.car.x, s.car.y, 8), on = REDUCE ? 1 : .6 + .4 * Math.sin(S.t * 5 + s.x);
  ctx.globalAlpha = on; line(p, cp, 1.6, '#2fae7c'); ctx.globalAlpha = 1;
}
function drawBillboard() {
  var x = -11.2, y = 9.2;
  prism(x - .6, y - .04, 0, x - .52, y + .04, 30, '#6b6590'); prism(x + .52, y - .04, 0, x + .6, y + .04, 30, '#6b6590');
  prism(x - .85, y - .07, 30, x + .85, y + .07, 64, '#fffaf0');
  poly([P(x - .78, y + .071, 60), P(x + .78, y + .071, 60), P(x + .78, y + .071, 34), P(x - .78, y + .071, 34)], S.lvl.ads >= 25 ? '#ff7a6b' : '#3d8bff', null, 0);
  faceText('PARK', P(x - .25, y + .072, 50), 'L', 9, '#ffffff'); faceText('& SHOP', P(x + .2, y + .072, 41), 'L', 7, '#ffd04a');
}
function drawValet() {
  var x = -1.85, y = 7.6;
  prism(x - .14, y - .12, 0, x + .14, y + .12, 13, '#3d8bff'); prism(x - .17, y - .15, 13, x + .17, y + .15, 15, '#ffd04a');
  for (var i = 0; i < Math.min(3, 1 + Math.floor(S.lvl.valet / 10)); i++) drawWalker({ x: x - .1 + i * .22, y: y + .32, moving: false, id: 7 + i, color: '#3b2f5c', hair: '#2a2438' });
}

/* ---------- the car wash: one tunnel, more lanes at levels 10, 25 and 50 ---------- */
var WEX = 11.9;   // the lane cars take off the road into the wash
function washLaneCars(i) { return S.cars.filter(function (c) { return c.washLane === i; }).length; }
function drawWash() {
  var n = washLanes(), yS = WYS[0] + .55, yN = WYS[n - 1] - .55, h = 26, i, k;
  for (i = 0; i <= n; i++) { var wy = i < n ? WYS[i] + .55 : yN + .1; prism(WX0, wy - .1, 0, WX1, wy, h, '#7fd6f0'); }
  // a window on the front shows the first lane's brushes
  poly([P(WX0 + .15, yS, h - 6), P(WX1 - .15, yS, h - 6), P(WX1 - .15, yS, 6), P(WX0 + .15, yS, 6)], '#2c2749', null, 0);
  var busy = S.cars.some(function (c) { return c.inWash && c.washLane === 0; });
  for (i = 0; i < 4; i++) {
    var bx = WX0 + .4 + i * .52, ph = (busy && !REDUCE ? S.t * 9 : 0) + i;
    poly([P(bx - .12, yS + .01, 7), P(bx + .12, yS + .01, 7), P(bx + .12, yS + .01, h - 7), P(bx - .12, yS + .01, h - 7)], i % 2 ? '#5db8ff' : '#ff7a6b', null, 0);
    for (k = 0; k < 3; k++) { var zz = 9 + ((ph * 3 + k * 5) % 14); line(P(bx - .12, yS + .012, zz), P(bx + .12, yS + .012, zz), 1.5, 'rgba(255,255,255,.6)', 'butt'); }
  }
  prism(WX0 - .06, yN - .06, h, WX1 + .06, yS + .06, h + 5, '#5db8ff');
  for (i = 0; i < n; i++) {   // exits on the east side, and a sign over each lane
    poly([P(WX1 + .001, WYS[i] - .42, 0), P(WX1 + .001, WYS[i] + .42, 0), P(WX1 + .001, WYS[i] + .42, 20), P(WX1 + .001, WYS[i] - .42, 20)], '#2c2749', null, 0);
    if (S.cars.some(function (c) { return c.inWash && c.washLane === i; }) && !REDUCE && Math.random() < .3)
      S.fx.push({ kind: 'bub', x: WX0 + Math.random() * (WX1 - WX0), y: WYS[i] + .3, z: h + 2 + Math.random() * 8, t: 0, vx: (Math.random() - .5) * 8 });
  }
  var mx = (WX0 + WX1) / 2;
  prism(mx - .8, (yN + yS) / 2 - .15, h + 5, mx + .8, (yN + yS) / 2 + .15, h + 21, '#ffffff');
  faceText(n > 1 ? n + '-LANE WASH' : 'WASH', P(mx, (yN + yS) / 2 + .15, h + 13), 'L', n > 1 ? 6.5 : 9, '#3d8bff');
}

/* ---------- the garage: open decks you can see into, a glass stair tower, a roof with a big P ---------- */
var BAND = ['#ff7a6b', '#ffd04a', '#5fd6a4', '#5db8ff', '#b79bff', '#ff9ccf'];
// where each of a deck's nine slots shows: five along the south face, four along the east face
function slotPos(j) { return j < 5 ? { x: GX0 + .75 + 1.15 * j, y: GY1 - .48, a: Math.PI / 2 } : { x: GX1 - .48, y: GY0 + .9 + 1.25 * (j - 5), a: 0 }; }
function drawGarageCars(d, z0) {
  for (var j = 0; j < PERDECK; j++) {
    var s = GS[d * PERDECK + j];
    if (!s || !s.car) continue;
    var p = slotPos(j);
    if (d === 0 && j >= 1 && j <= 3) continue;   // the ground-floor doorway
    ZOFF = z0 + 4; carLite(p.x, p.y, p.a, s.type, s.color); ZOFF = 0;
  }
}
// cars seen through the garage openings: just body and cabin, they are small and half hidden
function carLite(x, y, a, type, col) {
  var m = CARS[type] || CARS.sedan, hl = m.L / 2, hw = m.W / 2, ca = Math.cos(a), sa = Math.sin(a);
  obox(x, y, a, hl, hw, 2, 2 + m.b, .97, .93, 0, col, function () { return col; });
  obox(x + ca * m.co * m.L, y + sa * m.co * m.L, a, hl * m.cl, hw * m.cw, 2 + m.b, 2 + m.b + m.ch, .74, .8, 0, shade(col, 1.08), function () { return '#9ad4ff'; });
}
function drawDeck(d, z0, top) {
  var x, y;
  prism(GX0 - .1, GY0 - .1, z0, GX1 + .1, GY1 + .1, z0 + 4, '#d3d8e4');                   // floor slab
  prism(GX0, GY0, z0 + 4, GX1, GY1, z0 + top, '#45416a');                                // the shady inside
  for (x = GX0 + .3; x < GX1; x += 1.2) poly([P(x, GY1 - .01, z0 + top - 3), P(x + .5, GY1 - .01, z0 + top - 3), P(x + .5, GY1 - .01, z0 + top - 1.5), P(x, GY1 - .01, z0 + top - 1.5)], '#fff3c4', null, 0);
  drawGarageCars(d, z0);
  if (d === 0) {   // entrance and exit with barrier signs, and the shoppers' door on the east side
    prism(GX0, GY1 - .12, z0 + 4, GIN - .55, GY1, z0 + 12, BAND[0]);
    prism(GOUT + .55, GY1 - .12, z0 + 4, GX1, GY1, z0 + 12, BAND[0]);
    poly([P(GIN - .5, GY1 + .02, 23), P(GOUT + .5, GY1 + .02, 23), P(GOUT + .5, GY1 + .02, 29), P(GIN - .5, GY1 + .02, 29)], '#3d8bff', null, 0);
    faceText('IN', P(GIN, GY1 + .03, 26), 'L', 6.5, '#e9fff4'); faceText('OUT', P(GOUT, GY1 + .03, 26), 'L', 6.5, '#ffe2dc');
    poly([P(GX1 + .01, GDOOR - .3, 0), P(GX1 + .01, GDOOR + .3, 0), P(GX1 + .01, GDOOR + .3, 19), P(GX1 + .01, GDOOR - .3, 19)], '#ffe28a', null, 0);
  } else {
    prism(GX0, GY1 - .12, z0 + 4, GX1, GY1, z0 + 12, BAND[d % 6]);
    prism(GX1 - .12, GY0, z0 + 4, GX1, GY1, z0 + 12, BAND[d % 6]);
  }
  for (x = 0; x <= 3; x++) prism(GX0 + x * 2 - .1, GY1 - .1, z0 + 4, GX0 + x * 2 + .1, GY1 + .1, z0 + top, '#e9edf7');
  for (y = 0; y < 3; y++) prism(GX1 - .1, GY0 + y * 2 - .1, z0 + 4, GX1 + .1, GY0 + y * 2 + .1, z0 + top, '#e9edf7');
}
function drawGarage() {
  var n = Math.ceil(S.deckAnim - .001), d, z0 = 0, r, topZ = 0;
  for (d = 0; d < n; d++) {
    r = Math.min(1, S.deckAnim - d); z0 = d * DH; topZ = z0 + DH * r;
    if (r > .98) drawDeck(d, z0, DH);
    else { prism(GX0 - .1, GY0 - .1, z0, GX1 + .1, GY1 + .1, z0 + 4, '#d3d8e4'); prism(GX0, GY0, z0 + 4, GX1, GY1, topZ, '#c9cfdd'); }
  }
  if (S.deckAnim - (n - 1) < .98) return;
  // roof deck
  prism(GX0 - .1, GY0 - .1, topZ, GX1 + .1, GY1 + .1, topZ + 4, '#c9cfdd');
  ZOFF = topZ + 4;
  for (var c = 1; c < 5; c++) line(P(GX0 + c * 1.2, GY0 + .6), P(GX0 + c * 1.2, GY0 + 2.4), 1.6, 'rgba(255,255,255,.8)');
  for (c = 1; c < 5; c++) line(P(GX0 + c * 1.2, GY1 - 2.4), P(GX0 + c * 1.2, GY1 - .6), 1.6, 'rgba(255,255,255,.8)');
  prism(GX0, GY1 - .14, 0, GX1, GY1, 6, BAND[n % 6]); prism(GX1 - .14, GY0, 0, GX1, GY1, 6, BAND[n % 6]);
  drawLotLamp(GX0 + 3, GY0 + 3);
  drawPoleSign(GX1 - 1.6, GY1 - 1.4, 40, .5, 'P');
  ZOFF = 0;
  // glass stair tower standing against the north-east corner
  var sx0 = GX1, sx1 = GX1 + .9, sy0 = GY0 + .3, sy1 = GY0 + 1.5, sh = topZ + 22;
  prism(sx0, sy0, 0, sx1, sy1, sh, '#7fc3ef');
  for (d = 1; d <= n; d++) { line(P(sx0, sy1, d * DH), P(sx1, sy1, d * DH), 1.5, 'rgba(255,255,255,.7)'); line(P(sx1, sy0, d * DH), P(sx1, sy1, d * DH), 1.5, 'rgba(255,255,255,.5)'); }
  prism(sx0 - .05, sy0 - .05, sh, sx1 + .05, sy1 + .05, sh + 4, '#e9edf7');
}
function drawPoleSign(x, y, h, w, txt) {
  poly([P(x - .45, y - .3), P(x + .45, y - .3), P(x + .45, y + .3), P(x - .45, y + .3)], 'rgba(40,30,80,.16)', null, 0);
  prism(x - .05, y - .05, 0, x + .05, y + .05, h, '#6b6590');
  prism(x - w, y - .07, h, x + w, y + .07, h + w * 62, '#3d8bff');
  faceText(txt, P(x, y + .07, h + w * 31), 'L', w * 52, '#ffffff');
}
/* ---------- cars ---------- */
var moneyChanged = true;
var HIDDEN = { parked: 1, wantout: 1, ghide: 1, gwait: 1 };
function newCar(type, color, x, y, ang, state) {
  return { id: ++S.id, type: type, color: color, x: x, y: y, ang: ang, v: 0, state: state, path: [], timer: 0, phase: 0, moving: false, blockT: 0, ghost: 0, hx: 0, hy: 0 };
}
function bayPath(s) { var ay = aisleY(s.k); return [{ x: ENX, y: LANE0 }, { x: ENX, y: ay }, { x: s.c + .5, y: ay }, { x: s.c + .5, y: s.y + .5, stop: true }]; }
function makeCar(spot, parked, vip) {
  var pc = vip ? { type: 'limo', color: '#ffd04a' } : pickCar();
  var c = newCar(pc.type, pc.color, SPAWNX, LANE0, 0, parked ? 'parked' : 'in');
  c.vip = !!vip; c.spot = spot;
  if (parked) { c.x = spot.c + .5; c.y = spot.y + .5; c.ang = spot.row === 'N' ? -Math.PI / 2 : Math.PI / 2; }
  else c.path = bayPath(spot);
  spot.car = c; S.cars.push(c); return c;
}
// a driver who heads for the garage: reserves a slot, turns up the driveway and disappears inside
function makeGarCar(slot, parked) {
  var pc = pickCar(), c = newCar(pc.type, pc.color, parked ? GOUT : SPAWNX, parked ? GY1 : LANE0, 0, parked ? 'ghide' : 'gin');
  c.g = true; c.gi = slot;
  if (!parked) c.path = [{ x: GIN, y: LANE0 }, { x: GIN, y: GY1 - .1, stop: true }];
  GS[slot].car = c; GS[slot].color = pc.color; GS[slot].type = pc.type; S.cars.push(c); return c;
}
/* ---------- walkers: the reason people park ---------- */
// from the car door, north along the painted bay line (across any aisles), along the walkway to the nearest market door
function walkPath(spot) {
  var cx = spot.c + .5, cy = spot.y + .5, xb = spot.c + 1, wy = walkY(), door = nearestDoor(xb), fy = shopFrontY() + .05;
  return { door: door, p: [{ x: cx + .28, y: cy }, { x: xb, y: cy }, { x: xb, y: wy }, { x: door, y: wy }, { x: door, y: fy }] };
}
// garage: out of the side door, past the stair tower, up to the walkway and along to a door
function gWalkPath() {
  var wy = walkY(), door = nearestDoor(0), fy = shopFrontY() + .05, sx = GX1 + 1.05;
  return { door: door, p: [{ x: GX1 + .15, y: GDOOR }, { x: sx, y: GDOOR }, { x: sx, y: wy }, { x: door, y: wy }, { x: door, y: fy }] };
}
function makeWalker(car, inside) {
  var g = !!car.g, wp = g ? gWalkPath() : walkPath(car.spot), path = wp.p, w = {
    id: ++S.id, car: car, g: g, door: wp.door, path: path, back: path.slice().reverse().slice(1),
    x: path[0].x, y: path[0].y, state: inside ? 'inside' : 'to', timer: inside ? 1 + Math.random() * 4 : 0, moving: false, bag: !!inside,
    color: SHIRT[Math.floor(Math.random() * SHIRT.length)], hair: HAIR[Math.floor(Math.random() * HAIR.length)]
  };
  if (!inside) w.path = path.slice(1);
  else { w.x = path[path.length - 1].x; w.y = path[path.length - 1].y; }
  S.walkers.push(w); return w;
}
// when the market moves or grows, shoppers on the way pop back to their cars
function resetWalkers() {
  S.walkers.forEach(function (w) { if (w.car) { w.car.phase = 2; w.car.timer = .5 + Math.random(); } });
  S.walkers = [];
}
function stepWalker(w, dt) {
  w.moving = false;
  if (w.state === 'inside') {
    w.timer -= dt;
    if (w.timer <= 0) {
      w.state = 'back'; w.bag = true; w.path = w.back.slice();
      var tip = fee() * tipRate() * (w.g ? GAR_PAY : 1) * hustleMul();
      if (tip > 0) { earn(tip); popText(w.x, w.y, '+' + fmtSmall(tip)); }
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
/* ---------- arriving: drivers fill the lot first and spill into the garage, or queue on the road ---------- */
var lastBackup = -99;
function entranceBusy() { return S.cars.some(function (c) { return !HIDDEN[c.state] && c.x < SPAWNX + 2 && Math.abs(c.y - LANE0) < .4; }); }
function spawn(vip) {
  var free = S.spots.filter(function (s) { return unlocked(s) && !s.car; }), gf = vip ? 0 : garFree();
  var queued = S.cars.filter(function (c) { return c.state === 'wait'; }).length;
  if ((!free.length && !gf) || queued) {   // everything is full: the driver joins the queue on the road
    if (vip || queued >= 5 || entranceBusy()) return false;
    var pc = pickCar(), q = newCar(pc.type, pc.color, SPAWNX, LANE0, 0, 'wait');
    q.path = [{ x: GIN - 1.3, y: LANE0, stop: true }]; q.timer = 30; S.cars.push(q);
    if (S.t - lastBackup > 45 && S.tut >= TUT.length) { lastBackup = S.t; note('Lot full · build more bays'); }
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
  // drivers like bays close to the market and close to the entry lane
  var top = unitCount() - 1;
  var wts = free.map(function (s) { return (1 + (COLS_MAX - s.c) * .12) * (s.k === top ? 2 : 1) * (s.row === 'N' ? 1.3 : 1); });
  var tot = wts.reduce(function (a, b) { return a + b; }, 0), r = Math.random() * tot, pick = 0;
  for (var q2 = 0; q2 < wts.length; q2++) { r -= wts[q2]; if (r <= 0) { pick = q2; break; } }
  makeCar(free[pick], false, vip);
  return true;
}
/* ---------- driving ---------- */
// anything in the way, straight ahead of the direction of travel?
function blocked(c, dx, dy) {
  var i, o, rx, ry, al, la;
  if (c.ghost <= 0) for (i = 0; i < S.cars.length; i++) {
    o = S.cars[i];
    if (o === c || HIDDEN[o.state]) continue;
    rx = o.x - c.x; ry = o.y - c.y; al = rx * dx + ry * dy;
    if (al <= .05 || al > 1.05) continue;
    la = Math.abs(rx * dy - ry * dx);
    if (la < .45) return true;
  }
  for (i = 0; i < S.walkers.length; i++) {
    o = S.walkers[i];
    if (o.state === 'inside') continue;
    rx = o.x - c.x; ry = o.y - c.y; al = rx * dx + ry * dy;
    if (al > 0 && al < .8 && Math.abs(rx * dy - ry * dx) < .5) return true;
  }
  return false;
}
// is there a gap in the customer lane for a car pulling out at x?
function laneClear(c, x) {
  for (var i = 0; i < S.cars.length; i++) {
    var o = S.cars[i];
    if (o === c || HIDDEN[o.state]) continue;
    if (Math.abs(o.y - LANE0) >= .5 || o.x <= x - 2.6 || o.x >= x + 1.3) continue;
    if (o.x < x - .6 && o.v < .05) continue;   // a stopped car behind the merge (the queue) never moves into it
    return false;
  }
  return true;
}
// room to back out of a bay into the aisle?
function aisleClear(c) {
  var ay = aisleY(c.spot.k), cx = c.spot.c + .5;
  for (var i = 0; i < S.cars.length; i++) {
    var o = S.cars[i];
    if (o === c || HIDDEN[o.state]) continue;
    if (Math.abs(o.y - ay) < .7 && Math.abs(o.x - cx) < 1.5) return false;
    if (o.path[0] && o.path[0].rev && o.spot && o.spot.k === c.spot.k && Math.abs(o.x - cx) < 1.8) return false;
  }
  return true;
}
// after paying: onto the road and away, sometimes by way of the car wash
function roadOut(x) {
  var n = washLanes(), best = -1, bn = 2, i;
  if (n && x < WEX - .6 && Math.random() < washChance()) for (i = 0; i < n; i++) { var k = washLaneCars(i); if (k < bn) { bn = k; best = i; } }
  if (best < 0) return { lane: -1, p: [{ x: DESPAWNX, y: LANE0 }] };
  return { lane: best, p: [{ x: WEX, y: LANE0 }, { x: WEX, y: WYS[best] }, { x: WRX, y: WYS[best], washEnd: true }, { x: WRX, y: LANE0, join: true }, { x: DESPAWNX, y: LANE0 }] };
}
function setExit(c, pre, x) { var r = roadOut(x); c.path = pre.concat(r.p); c.washLane = r.lane >= 0 ? r.lane : undefined; c.washPaid = false; }
function addMoney(a) { S.money += a; S.totalRun += a; S.lifetime += a; moneyChanged = true; }
// rewards (goals, gifts, time warps) are spending money, but do not count as earnings for goals or the franchise bonus
function giveMoney(a) { S.money += a; moneyChanged = true; }
// steady income (cars, tips, washes, taps) also feeds the $/s readout; one-off bonuses do not
function earn(a) { addMoney(a); S.earn.push({ t: S.t, v: a }); }
function popText(x, y, txt, big) { S.particles.push({ x: x, y: y, t: 0, txt: txt, big: !!big }); }
function payCar(c) {
  var ev = !c.g && c.spot && evBay(c.spot);
  var a = fee() * (c.vip ? 3 : 1) * (c.g ? GAR_PAY : 1) * (ev ? 1 + EV_BONUS : 1) * hustleMul();
  earn(a); S.served++;
  popText(c.g ? GOUT : c.x, c.g ? GY1 : c.y, '+' + fmtSmall(a));
  sfx('coin');
}
function payWash(c) {
  var a = washPrice() * hustleMul();
  earn(a); S.washes++;
  popText(WX1, WYS[c.washLane], '+' + fmtSmall(a));
}
function turnTo(c, want, dt) {
  var d = want - c.ang;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  c.ang += d * Math.min(1, dt * 9);
}
function stepCar(c, dt) {
  c.moving = false;
  if (c.ghost > 0) c.ghost -= dt;
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
      else { payCar(c); c.state = 'gwait'; c.x = GOUT; c.y = GY1 - .1; c.ang = Math.PI / 2; c.v = 0; }
    }
    return;
  }
  if (c.state === 'gwait') {   // waits at the garage exit for a gap in the traffic
    var busy = S.cars.some(function (o) { return o !== c && o.state === 'gout' && o.y < LANE0 - .3; });   // one car on the driveway at a time
    if (!busy) { GS[c.gi].car = null; c.state = 'gout'; setExit(c, [{ x: GOUT, y: LANE0, join: true }], GOUT); }
    return;
  }
  if (c.state === 'wantout') {
    if (aisleClear(c)) { c.state = 'out'; var ay = aisleY(c.spot.k); setExit(c, [{ x: c.x, y: ay, rev: true }, { x: EXX(), y: ay }, { x: EXX(), y: LANE0, join: true }], EXX()); }
    return;
  }
  if (c.state === 'wait') {
    var front = true, i;
    for (i = 0; i < S.cars.length; i++) if (S.cars[i].state === 'wait' && S.cars[i].x > c.x) front = false;
    var fs = front ? S.spots.filter(function (s) { return unlocked(s) && !s.car; }) : [];
    if (fs.length) {   // a bay opened up
      var sp = fs[Math.floor(Math.random() * fs.length)];
      sp.car = c; c.spot = sp; c.state = 'in'; c.path = bayPath(sp);
    } else if (front && c.x < GIN && garFree() > 0) {   // or a garage bay
      var open = [];
      for (i = 0; i < garCap(); i++) if (!GS[i].car) open.push(i);
      var gi = open[Math.floor(Math.random() * open.length)];
      c.g = true; c.gi = gi; GS[gi].car = c; GS[gi].color = c.color; GS[gi].type = c.type;
      c.state = 'gin'; c.path = [{ x: GIN, y: LANE0 }, { x: GIN, y: GY1 - .1, stop: true }];
    } else if (!c.path[0]) {
      c.timer -= dt;
      if (c.timer <= 0) { c.state = 'leave'; c.path = [{ x: DESPAWNX, y: LANE0 }]; S.lost = (S.lost || 0) + 1; popText(c.x, LANE0, 'Full!'); }
    }
    if (c.state === 'wait' && !c.path[0]) { c.v = 0; return; }
  }
  var tg = c.path[0];
  if (!tg) {
    if (c.state === 'in') { c.state = 'parked'; c.phase = 0; c.timer = doorTime(); c.v = 0; }
    else if (c.state === 'gin') { c.state = 'ghide'; c.phase = 0; c.timer = doorTime(); c.v = 0; }
    return;
  }
  var dx = tg.x - c.x, dy = tg.y - c.y, dist = Math.hypot(dx, dy);
  var ux = dist > .001 ? dx / dist : 0, uy = dist > .001 ? dy / dist : 0;
  if (tg.join && c.y < LANE0 - .45 && LANE0 - c.y < 1.25 && !laneClear(c, tg.x)) {   // wait at the kerb for a gap...
    c.mergeT = (c.mergeT || 0) + dt;
    if (c.mergeT < 3) { c.v = 0; return; }   // ...but after a few seconds, nose in: traffic in the lane brakes for us
  }
  if (blocked(c, ux, uy)) {
    c.v = 0; c.blockT += dt;
    if (c.blockT > 5) { c.ghost = 1.2; c.blockT = 0; }   // never stay jammed: squeeze past
    return;
  }
  c.blockT = 0;
  var onRoad = Math.abs(c.y - LANE0) < .3 && Math.abs(dx) > Math.abs(dy);
  var vt = (onRoad ? 2.2 : 1.4) * speedMul() * (tg.rev ? .6 : 1);
  if (tg.stop || c.path.length === 1 && c.state !== 'out' && c.state !== 'gout' && c.state !== 'leave') vt = Math.min(vt, .45 + dist * 3);   // ease into the bay
  c.v += (vt - c.v) * Math.min(1, dt * 4.5);
  var st = c.v * dt;
  c.moving = st > 0.0005;
  if (dist > .001) turnTo(c, Math.atan2(dy, dx) + (tg.rev ? Math.PI : 0), dt);
  // round the corners: start on the next leg a little early
  var cut = (c.path.length > 1 && !tg.rev && !tg.stop && !tg.join) ? .22 : 0;
  if (dist <= st + cut) {
    if (!cut) { c.x = tg.x; c.y = tg.y; } else { c.x += ux * Math.min(st, dist); c.y += uy * Math.min(st, dist); }
    c.path.shift();
    if (tg.rev && c.spot) { c.spot.car = null; c.spot = null; }
    if (tg.washEnd) { c.inWash = false; c.washLane = undefined; }
  } else { c.x += ux * st; c.y += uy * st; }
  if (c.washLane !== undefined && Math.abs(c.y - WYS[c.washLane]) < .3) {
    if (c.inWash && c.x >= WX1 - .1 && !c.washPaid) { c.washPaid = true; payWash(c); }
    c.inWash = c.x > WX0 - .1 && c.x < WX1 + .2;
  }
}
/* ---------- through traffic on the other lanes: just passing, but it makes the road feel alive ---------- */
function stepTraffic(dt) {
  var lanes = ROAD().lanes.slice(1), tier = roadTier();
  S.trafT -= dt;
  if (S.trafT <= 0 && S.traffic.length < 40) {
    S.trafT = (1.6 + Math.random() * 2.4) / lanes.length / (1 + .25 * tier);
    var ln = lanes[Math.floor(Math.random() * lanes.length)], dir = ln[1], x = dir > 0 ? SPAWNX : DESPAWNX;
    var clear = !S.traffic.some(function (o) { return Math.abs(o.y - ln[0]) < .1 && Math.abs(o.x - x) < 2; });
    if (clear) { var pc = pickCar(); S.traffic.push({ id: ++S.id, x: x, y: ln[0], dir: dir, ang: dir > 0 ? 0 : Math.PI, v: (2.4 + Math.random() * .9) * (1 + .15 * tier), type: pc.type, color: pc.color, moving: true }); }
  }
  S.traffic.forEach(function (c) {
    var v = c.v;
    S.traffic.forEach(function (o) { if (o !== c && Math.abs(o.y - c.y) < .1) { var d = (o.x - c.x) * c.dir; if (d > 0 && d < 1.4) v = Math.min(v, o.v * .9); } });
    c.x += c.dir * v * dt;
  });
  S.traffic = S.traffic.filter(function (c) { return c.x > SPAWNX - 1 && c.x < DESPAWNX + 1 && ROAD().lanes.some(function (l) { return Math.abs(l[0] - c.y) < .05; }); });
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
  S.traffic = [];
  for (i = 0; i < 6; i++) { stepTraffic(.01); S.traffic.forEach(function (c) { c.x += c.dir * (3 + Math.random() * 20); }); }
}
function clearCars() { S.cars = []; S.walkers = []; S.traffic = []; S.spots.forEach(function (s) { s.car = null; }); GS.forEach(function (g) { g.car = null; g.color = null; }); }

/* ---------- hustle: steady tapping fills the meter, which multiplies income; it drains when you stop ---------- */
// a tap on the lot: coins drop and the meter rises
function tapLot(lx, ly) {
  S.taps++;
  S.fx.push({ kind: 'ring', lx: lx, ly: ly, t: 0 });
  var coin = fee() * 0.04 * hustleMul();
  earn(coin);
  S.fx.push({ kind: 'tapc', lx: lx, ly: ly, t: 0, txt: '+' + fmtSmall(coin) });
  S.hype = Math.min(1, S.hype + tapPower());
  sfx('tap', S.hype); buzz('light');
  tutEvent('tap');
}
function tickHype(dt) {
  if (S.hlock > 0) { S.hlock = Math.max(0, S.hlock - dt); S.hype = 1; }
  else S.hype = Math.max(0, S.hype - drainRate() * dt);
  if (S.hype >= .99 && !S.atMax) {   // a full meter: confetti, and it counts for the goal
    S.atMax = true; S.maxes++; sfx('max'); buzz('heavy'); moneyChanged = true;
    for (var i = 0; i < 22; i++) S.fx.push({ kind: 'conf', x: Math.random(), y: -.05 - Math.random() * .2, t: 0, vx: (Math.random() - .5) * .2, vy: .25 + Math.random() * .35, c: SHIRT[i % SHIRT.length], r: Math.random() * 6 });
  } else if (S.hype < .85) S.atMax = false;
}
function vipBonus() { return Math.max(fee() * 25, econRate() * 45) * vipMul(); }
function collectVip(c) {
  var bonus = vipBonus();
  addMoney(bonus); c.vip = false; S.vips++;
  popText(c.x, c.y, '+' + fmt(bonus), true);
  if (Math.random() < .3) { S.gems++; S.fx.push({ kind: 'gem', x: c.x, y: c.y, t: 0 }); }
  sfx('vip'); buzz('medium'); save();
}
function vipGap() { return (55 + Math.random() * 60) / (1 + 0.2 * S.perk.lucky) / mod('vip', 1); }

/* ---------- frame ---------- */
var lastUnits = 0, lastShop = -1;
function update(dt) {
  S.t += dt;
  tickHype(dt);
  var fdt = dt * flow();   // the lot moves a little faster while it hustles
  S.spawnT -= fdt;
  if (S.spawnT <= 0) { spawn(false); if (S.spawnT <= 0) S.spawnT = gapBase() * (.75 + Math.random() * .5); }
  S.vipT -= dt;
  if (S.parade > 0 && S.vipT > 3) S.vipT = 3;
  if (S.vipT <= 0) {
    var ok = spawn(true);
    if (ok && S.parade > 0) S.parade--;
    S.vipT = ok ? (S.parade > 0 ? 3 : vipGap()) : 6;
  }
  if (unitCount() !== lastUnits || shopTier() !== lastShop) { if (lastShop >= 0) resetWalkers(); lastUnits = unitCount(); lastShop = shopTier(); }
  S.walkers.forEach(function (w) { stepWalker(w, fdt); });
  S.walkers = S.walkers.filter(function (w) { return !w.done; });
  S.cars.forEach(function (c) {
    stepCar(c, fdt);
    if (c.vip && !HIDDEN[c.state]) {
      c.vt = (c.vt || 0) + dt;
      if (c.vt > 1 && !S.tutVip && S.tut >= TUT.length) { S.tutVip = true; tip('Tap golden cars for a bonus!', 5); }
      if (S.lvl.concierge && c.vt > 2.5) collectVip(c);
    }
  });
  S.cars = S.cars.filter(function (c) { return !((c.state === 'out' || c.state === 'gout' || c.state === 'leave') && c.x >= DESPAWNX - .1); });
  stepTraffic(fdt);
  var ex = EXX(), op1 = 0, op2 = 0;
  S.cars.forEach(function (c) {
    if (c.y > 8.4 && c.y < 10.3) { if (Math.abs(c.x - ENX) < .5 && c.state === 'in') op1 = 1; if (Math.abs(c.x - ex) < .5 && c.state === 'out') op2 = 1; }
  });
  S.gate += (op1 - S.gate) * Math.min(1, dt * 7); S.gate2 = (S.gate2 || 0) + (op2 - (S.gate2 || 0)) * Math.min(1, dt * 7);
  S.particles.forEach(function (p) { p.t += dt; });
  S.particles = S.particles.filter(function (p) { return p.t < 1.2; });
  S.fx.forEach(function (f) { f.t += dt; });
  S.fx = S.fx.filter(function (f) { return f.t < (f.kind === 'conf' ? 3 : f.kind === 'bub' ? 1.4 : f.kind === 'gem' ? 1.4 : f.kind === 'pop' ? .8 : .7); });
  S.pad += (S.padTarget - S.pad) * Math.min(1, dt * 8);
  var dd = S.lvl.garage - S.deckAnim; S.deckAnim += Math.abs(dd) < .01 ? dd : dd * Math.min(1, dt * 2.2) + Math.sign(dd) * Math.min(Math.abs(dd), dt * .35);
  if (SET.daynight) S.tod = (S.tod + dt / 480) % 1;   // an eight-minute day
  S.clouds.forEach(function (c) { c.x += c.v * dt; if (c.x > 30) c.x = -30; });
  if (S.lvl.promoter && S.rushReady > 0) startRush();
  stepCam(dt); tickMeta(dt); townGrowth();
}
/* ---------- goals, rush hour and franchise perks: the reasons to keep playing ---------- */
var GDEF = {
  cars: { name: 'Happy drivers', tint: '#bde6ff', tgt: function (t) { return Math.round(30 * Math.pow(2.5, t)); }, val: function () { return S.served; }, txt: function (n) { return 'Park ' + fmt(n) + ' cars'; } },
  cash: { name: 'Big earner', tint: '#ffe38a', tgt: function (t) { return 2000 * Math.pow(4.5, t); }, val: function () { return S.lifetime; }, txt: function (n) { return 'Earn $' + fmt(n) + ' in total'; } },
  fee: { name: 'Price setter', tint: '#ffd9c7', tgt: function (t) { return 5 * (t + 1); }, val: function () { return S.bestFee; }, txt: function (n) { return 'Reach parking fee level ' + n; } },
  maxed: { name: 'Full hustle', tint: '#ffc7e8', tgt: function (t) { return Math.round(2 * Math.pow(1.9, t)); }, val: function () { return S.maxes; }, txt: function (n) { return 'Fill the hustle meter ' + n + ' times'; } },
  deck: { name: 'Sky high', tint: '#e3d9ff', tgt: function (t) { return t + 1; }, val: function () { return S.bestDeck; }, txt: function (n) { return 'Build garage floor ' + n; } },
  vip: { name: 'Meet and greet', tint: '#fff0a8', tgt: function (t) { return Math.round(3 * Math.pow(1.9, t)); }, val: function () { return S.vips; }, txt: function (n) { return 'Greet ' + n + ' golden cars'; } },
  wash: { name: 'Squeaky clean', tint: '#c7f0ff', tgt: function (t) { return Math.round(25 * Math.pow(2.4, t)); }, val: function () { return S.washes; }, txt: function (n) { return 'Wash ' + fmt(n) + ' cars'; } },
  rush: { name: 'Rush job', tint: '#ffc7bd', tgt: function (t) { return Math.round(2 * Math.pow(1.8, t)); }, val: function () { return S.rushes; }, txt: function (n) { return 'Ride out ' + n + ' rush hours'; } },
  fr: { name: 'Chain owner', tint: '#d6f0c8', tgt: function (t) { return t + 1; }, val: function () { return S.franchises; }, txt: function (n) { return 'Franchise ' + n + (n === 1 ? ' time' : ' times'); } }
};
var GORDER = ['cars', 'cash', 'fee', 'maxed', 'deck', 'vip', 'wash', 'rush', 'fr'];
var GOAL_GEMS = 3;
function goalTarget(k) { return GDEF[k].tgt(S.goal[k]); }
function goalReady(k) { return GDEF[k].val() >= goalTarget(k); }
function goalsReady() { var n = 0; GORDER.forEach(function (k) { if (goalReady(k)) n++; }); return n; }
function goalCash() { return Math.max(econRate() * 60, fee() * 10); }
function claimGoal(k) {
  if (!goalReady(k)) return false;
  var cash = goalCash(); S.goal[k]++; giveMoney(cash); S.gems += GOAL_GEMS;
  note('Goal done · +$' + fmt(cash) + ' · +' + GOAL_GEMS + ' gems');
  sfx('claim'); buzz('medium');
  return true;
}
// rush hour: now and then a rush is on offer; taking it brings a wave of extra drivers who pay more
function rushLen() { return 40 + 10 * S.perk.rush + 5 * Math.max(0, S.lvl.promoter - 1) + mod('rush', 0); }
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
// the token shop: permanent upgrades bought with franchise tokens. Each says exactly what the next level does.
var BLUE = ['Every new lot starts with 6 more columns of bays', '...and the road starts as a four-lane avenue', '...and one garage floor', '...and a car wash and 4 EV columns'];
var PDEF = {
  hustle: { big: function () { return ['x' + hustleCap(), 'max hustle']; }, up: '+1', name: 'Hustle power', tint: '#ffc7e8', icon: 'tap', cost: function (l) { return Math.ceil(2 * Math.pow(1.5, l)); },
    now: function () { return 'Full meter: x' + hustleCap() + ' income'; }, next: function () { return 'Full meter: x' + (hustleCap() + 1) + ' income'; } },
  gold: { big: function () { return ['+' + 25 * S.perk.gold + '%', 'all income']; }, up: '+25%', name: 'Better rates', tint: '#ffe38a', icon: 'fee', cost: function (l) { return Math.ceil(2 * Math.pow(1.6, l)); },
    now: function () { return 'All income +' + 25 * S.perk.gold + '%'; }, next: function () { return 'All income +' + 25 * (S.perk.gold + 1) + '%'; } },
  tap: { big: function () { return [(tapPower() * 100).toFixed(1) + '%', 'meter per tap']; }, up: '+1%', name: 'Quick fingers', tint: '#ffd9c7', icon: 'tap', cost: function (l) { return Math.ceil(2 * Math.pow(1.6, l)); },
    now: function () { return 'Each tap fills ' + (tapPower() * 100).toFixed(1) + '% of the meter'; }, next: function () { return 'Each tap fills ' + (5 * (1 + 0.2 * (S.perk.tap + 1))).toFixed(1) + '%'; } },
  head: { big: function () { return ['$' + fmt(25 + headStart()), 'starting cash']; }, up: 'x3 cash', name: 'Head start', tint: '#d6f0c8', icon: 'space', cost: function (l) { return Math.ceil(Math.pow(3, l)); },
    now: function () { return 'New lots start with $' + fmt(25 + headStart()); }, next: function () { return 'New lots start with $' + fmt(25 + 200 * Math.pow(3, S.perk.head)); } },
  lucky: { big: function () { return ['x' + fmtX(1 + 0.3 * S.perk.lucky), 'golden car bonus']; }, up: '+30%', name: 'Lucky drivers', tint: '#fff0a8', icon: 'goal', cost: function (l) { return Math.ceil(2 * Math.pow(1.75, l)); },
    now: function () { return 'Golden cars x' + fmtX(1 + 0.3 * S.perk.lucky) + ' bonus'; }, next: function () { return 'x' + fmtX(1 + 0.3 * (S.perk.lucky + 1)) + ' bonus, and 20% more often'; } },
  rush: { big: function () { return [rushLen() + 's', 'rush hours']; }, up: '+10s', name: 'Rush master', tint: '#ffc7bd', icon: 'ads', cost: function (l) { return Math.ceil(2 * Math.pow(1.7, l)); },
    now: function () { return 'Rush hours last ' + rushLen() + 's'; }, next: function () { return rushLen() + 10 + 's, and they come 7% sooner'; } },
  night: { big: function () { return [Math.round(awayCap() / 3600) + 'h', 'away earning time']; }, up: '+2h', name: 'Night watch', tint: '#d9e4ff', icon: 'moon', cost: function (l) { return Math.ceil(1.5 * Math.pow(1.9, l)); },
    now: function () { return 'Earn while away for ' + Math.round(awayCap() / 3600) + 'h'; }, next: function () { return 'Earn while away for ' + Math.round(awayCap() / 3600 + 2 * (S.pass ? 2 : 1)) + 'h'; } },
  sleep: { big: function () { return [pct(awayRate()), 'away earnings']; }, up: '+8%', name: 'Overnight rates', tint: '#e3d9ff', icon: 'moon', cost: function (l) { return Math.ceil(3 * Math.pow(2, l)); },
    now: function () { return 'Away earnings at ' + pct(awayRate()); }, next: function () { return 'Away earnings at ' + pct(Math.min(1, awayRate() + .08)); } },
  blue: { big: function () { return [S.perk.blue + '/4', 'blueprints']; }, up: '+1', name: 'Blueprints', tint: '#c9f2d9', icon: 'garage', cost: function (l) { return [3, 8, 20, 50][l] || Infinity; },
    now: function () { return S.perk.blue ? BLUE[S.perk.blue - 1] : 'New lots start from scratch'; }, next: function () { return BLUE[S.perk.blue] || ''; } }
};
var PORDER = ['hustle', 'gold', 'tap', 'head', 'lucky', 'rush', 'night', 'sleep', 'blue'];
function buyPerk(k) {
  if (S.perk[k] >= PMAX[k]) return false;
  var c = PDEF[k].cost(S.perk[k]); if (S.tok < c) return false;
  S.tok -= c; S.perk[k]++; moneyChanged = true; sfx('buy'); return true;
}
// what blueprints build before the first car arrives
function applyBlueprints() {
  var b = S.perk.blue;
  if (b >= 1) S.lvl.space = 6;
  if (b >= 2) S.lvl.gate = 5;
  if (b >= 3) S.lvl.garage = 1;
  if (b >= 4) { S.lvl.wash = 1; S.lvl.ev = 4; }
}

/* ---------- boosts, gems and the daily gift ---------- */
var BOOST_MAX = 48 * 3600 * 1000;
function addBoost(sec) {
  var now = Date.now();
  S.boostEnd = Math.min(now + BOOST_MAX, Math.max(now, S.boostEnd) + sec * 1000); moneyChanged = true;
}
function warp(sec) { var a = econBase() * sec; giveMoney(a); return a; }
// gem shop: things to spend gems on; every one helps the run you are on
var SHOP = {
  boost1: { name: 'Double income', sub: 'x2 income for 1 hour', cost: 30, tint: '#ffe38a', icon: 'fee', buy: function () { addBoost(3600); return 'x2 income for an hour!'; } },
  warp1: { name: 'Time warp', sub: function () { return 'Get 1 hour of earnings now: $' + fmt(econBase() * 3600); }, cost: 40, tint: '#d9e4ff', icon: 'express', buy: function () { return '+$' + fmt(warp(3600)); } },
  lock: { name: 'Hustle lock', sub: function () { return 'Meter stays full (x' + hustleCap() + ' income) for 2 minutes'; }, cost: 8, tint: '#ffc7e8', icon: 'tap', buy: function () { S.hlock += 120; return 'Hustle locked at x' + hustleCap() + '!'; } },
  parade: { name: 'Golden parade', sub: '5 golden cars, one after another', cost: 15, tint: '#fff0a8', icon: 'goal', buy: function () { S.parade += 5; S.vipT = 0; return 'Golden cars on the way!'; } },
  boost4: { name: 'Double income', sub: 'x2 income for 4 hours', cost: 100, tint: '#ffe38a', icon: 'fee', buy: function () { addBoost(4 * 3600); return 'x2 income for 4 hours!'; } },
  warp8: { name: 'Big time warp', sub: function () { return 'Get 8 hours of earnings now: $' + fmt(econBase() * 8 * 3600); }, cost: 240, tint: '#d9e4ff', icon: 'express', buy: function () { return '+$' + fmt(warp(8 * 3600)); } }
};
var SORDER = ['boost1', 'warp1', 'lock', 'parade', 'boost4', 'warp8'];
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
  { txt: 'Cash', icon: 'fee', give: function () { var a = Math.max(500, econBase() * 900); giveMoney(a); return '$' + fmt(a); } },
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
/* ---------- the world: a laid-out town around the lot, dressed for each spot on the map ---------- */
// ground: three grass colours; bg: the sky-to-ground fill; tree: the local tree; home: what fills a house plot; water: sea south of this y
var THEMES = {
  park: { ground: ['#93d86d', '#9bde75', '#a6e27f'], bg: ['#a9e585', '#8bd566'], tree: 'tree', tree2: 'pine', home: 'house' },
  beach: { ground: ['#bfe39a', '#c6e8a4', '#b6dc90'], bg: ['#ffeec0', '#f0d58e'], tree: 'palm', tree2: 'palm', home: 'house', water: 21.5, sand: true, wall: ['#fff3d6', '#cfe8ff', '#ffe0ec', '#d9f5e6'] },
  city: { ground: ['#b9c0cf', '#c2c8d6', '#aeb6c6'], bg: ['#c9d0dd', '#b0b8c8'], tree: 'tree', tree2: 'bush', home: 'tower' },
  snow: { ground: ['#eef5ff', '#e4eefb', '#f8fbff'], bg: ['#f4f9ff', '#dfeaf8'], tree: 'snowpine', tree2: 'snowpine', home: 'house', roof: '#f4f8ff' },
  desert: { ground: ['#f0c98a', '#ecc07c', '#f5d39c'], bg: ['#f8dca6', '#eabf7a'], tree: 'cactus', tree2: 'rock', home: 'house', wall: ['#f4c9a0', '#e8b48a', '#f7dcb8'], roof: '#d9a56e' },
  neon: { ground: ['#3d3768', '#433d72', '#383262'], bg: ['#3b3470', '#26214a'], tree: 'tree', tree2: 'bush', home: 'neon', night: .65 },
  harbor: { ground: ['#8fd3a0', '#97d9a8', '#86cb98'], bg: ['#9fdcb0', '#7fc898'], tree: 'tree', tree2: 'pine', home: 'house', water: 21.5 }
};
function TH() { return THEMES[S.theme] || THEMES.park; }

/* ---------- the town: plots along real streets, revealed nearest-first as the lot levels up ---------- */
var TOWN = [], STREET_TREES = [];
var BACK_ST = [-7.5, -6.5], SIDE_W = [-13, -12], SIDE_E = [19.5, 20.5], FRONT_Y = 19.2;
function buildTown() {
  var th = TH(), seed = 11, out = [], x, y;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  var PASTEL = th.wall || ['#ffd9b8', '#cfe8ff', '#ffe8a8', '#e0d4ff', '#ffc9d6', '#c9f2d9'], ROOF = ['#ff7a6b', '#5d7bd8', '#e0a63a', '#8b6bd0', '#d8566e'];
  var TOW = S.theme === 'neon' ? ['#5a4fa0', '#4a3f8a', '#6a4fa8', '#3f4a8a'] : ['#7fb5ff', '#ffb27a', '#b79bff', '#ff9ccf', '#6fd6c4', '#ffd04a'];
  var NEON = ['#ff4fd8', '#4ff0ff', '#ffe14f', '#7dff6a'];
  // one plot: usually a house of some shape, sometimes a pocket park or a pair of trees
  var KINDS = ['gable', 'gable', 'hip', 'flat', 'two', 'ell'], ROOFS = th.roof ? [th.roof] : ['#ff7a6b', '#5d7bd8', '#e0a63a', '#8b6bd0', '#d8566e', '#6d6a86', '#4fae8a'];
  function home(px, py, w, d, facing) {
    var r = rnd(), p = { x: px, y: py, w: w, d: d };
    if (r < .1) { p.t = 'park'; p.s = .85 + rnd() * .35; return p; }
    if (th.home !== 'house') { p.t = th.home; p.h = 36 + rnd() * 50; p.c = TOW[Math.floor(rnd() * TOW.length)]; p.n = NEON[Math.floor(rnd() * 4)]; return p; }
    // a house a bit smaller than its plot, set back by a random amount, with its own look
    var hw = w * (.62 + rnd() * .22), hd = d * (.58 + rnd() * .2);
    p.t = 'house'; p.kind = KINDS[Math.floor(rnd() * KINDS.length)];
    p.x = px + (w - hw) * (.2 + rnd() * .6); p.y = py + (d - hd) * (facing === 'S' ? .25 + rnd() * .3 : .5 + rnd() * .3); p.w = hw; p.d = hd;
    if (p.kind === 'ell') { p.d = hd * .75; p.y = Math.min(p.y, py + d - p.d - .95); }   // room for the front wing
    p.h = p.kind === 'two' ? 30 + rnd() * 6 : 17 + rnd() * 6;
    p.c = PASTEL[Math.floor(rnd() * PASTEL.length)]; p.r = ROOFS[Math.floor(rnd() * ROOFS.length)];
    p.face = facing === 'E' ? 'E' : 'S'; p.ridge = facing === 'E' || rnd() < .3 ? 'y' : 'x';
    p.chimney = rnd() < .45; p.porch = rnd() < .45; p.garage = p.kind !== 'ell' && rnd() < .3 && p.x + p.w + .8 < px + w + .4;
    p.lawn = .93 + rnd() * .08; p.drive = facing === 'S' ? (py + d) - (p.y + p.d) : 0;
    if (rnd() < .4) p.tree = { x: px + (rnd() < .5 ? .25 : w - .25), y: py + .3 + rnd() * (d - .5), s: .55 + rnd() * .25 };
    return p;
  }
  var pw;
  for (x = -16.8; x < 24; x += pw) { pw = 1.9 + rnd() * 1.1; out.push(home(x, -10 + rnd() * .3, pw - .25, 1.9, 'S')); }
  for (x = -16.8; x < 24; x += pw) { pw = 1.9 + rnd() * 1.1; out.push(home(x, -6.1, pw - .25, 1.7, 'N')); }
  for (y = -4.8; y < 7.4; y += pw) { pw = 2 + rnd() * .8; out.push(home(-15.6, y, 1.9, pw - .25, 'E')); out.push(home(-11.6, y, 1.8, pw - .25, 'W')); }
  for (y = -4.8; y < 7.4; y += pw) { pw = 2 + rnd() * .8; out.push(home(17.2, y, 1.8, pw - .25, 'W')); out.push(home(21.1, y, 1.9, pw - .25, 'E')); }
  for (x = -16; x < 25; x += 2.6) {   // across the main road, beyond the widest highway
    if (th.water) { out.push({ t: S.theme === 'harbor' ? 'box' : 'umbrella', x: x + .4, y: FRONT_Y + .3, n: 1 + Math.floor(rnd() * 3), c: ['#ff7a6b', '#5db8ff', '#ffd04a', '#ff9ccf'][Math.floor(rnd() * 4)], cs: ['#ff7a6b', '#3d8bff', '#ffd04a', '#5fd6a4'] }); continue; }
    out.push(home(x, FRONT_Y, 2.3, 1.6, 'N'));
  }
  for (y = -13.6; y > -22; y -= 3.5) for (x = -17; x < 26; x += 3.1) {   // the skyline at the back
    if (rnd() < .25) continue;
    out.push({ t: S.theme === 'neon' ? 'neon' : 'tower', x: x + rnd() * .6, y: y + rnd() * .6, w: 1.5 + rnd(), d: 1.4 + rnd() * .8, h: 70 + rnd() * 110 * (S.theme === 'city' ? 1.5 : 1), c: TOW[Math.floor(rnd() * TOW.length)], n: NEON[Math.floor(rnd() * 4)], sky: true });
  }
  // never build inside the space the lot, market, garage and car wash can grow into (the mega mall tower reaches y -2.9)
  var KEEP = [[GX0 - .6, -3.4, WRX + .9, RY]];
  out = out.filter(function (p) { var w = p.w || 1, d = p.d || 1; return !KEEP.some(function (k) { return p.x < k[2] && p.x + w > k[0] && p.y < k[3] && p.y + d > k[1]; }); });
  // nearest plots appear first
  out.forEach(function (p) { p.dist = Math.hypot(p.x - 4, (p.y - 4) * 1.3) + (p.sky ? 6 : 0); });
  out.sort(function (a, b) { return a.dist - b.dist; });
  TOWN = out;
  STREET_TREES = [];
  for (x = -15.5; x < 24; x += 4.6) { STREET_TREES.push([x, BACK_ST[0] - .25, 0]); STREET_TREES.push([x + 2.3, BACK_ST[1] + .25, 1]); }
  for (y = -4; y < 8; y += 3.4) { STREET_TREES.push([SIDE_W[0] - .3, y, 0]); STREET_TREES.push([SIDE_E[1] + .3, y + 1.7, 1]); }
  lastShown = -1;
}
// the town fills in with every upgrade you buy this run
function levelSum() { var n = 0, k; for (k in S.lvl) n += Math.min(30, S.lvl[k]); return n; }
function townShown() { return Math.min(TOWN.length, 14 + Math.floor(levelSum() * 1.1)); }
function drawPlot(p) {
  switch (p.t) {
    case 'house': if (!inBg(p)) drawHouseGround(p); drawHouse(p); if (p.tree) drawTreeKind(TH().tree, p.tree.x, p.tree.y, p.tree.s); break;
    case 'park': var th = TH(); drawTreeKind(th.tree, p.x + .45, p.y + .5, p.s); drawTreeKind(th.tree2, p.x + 1.2, p.y + 1, p.s * .85); break;
    case 'umbrella': drawUmbrella(p.x, p.y, p.c); break;
    case 'box': drawContainers(p); break;
    case 'neon': drawNeonTower(p); break;
    default: drawTower(p);
  }
}
// new houses arrive with a puff of sparkles
var lastShown = -1;
function townGrowth() {
  var n = townShown();
  if (lastShown >= 0 && n > lastShown && S.t > 1) for (var i = lastShown; i < n; i++) { var p = TOWN[i]; S.fx.push({ kind: 'pop', x: p.x + p.w / 2, y: p.y + p.d / 2, z: 20, t: 0 }); }
  lastShown = n;
}
function drawTreeKind(t, x, y, s) {
  switch (t) {
    case 'pine': drawPine(x, y, s); break;
    case 'palm': drawPalm(x, y, s); break;
    case 'snowpine': drawSnowPine(x, y, s); break;
    case 'cactus': drawCactus(x, y, s); break;
    case 'rock': drawRock(x, y, s, '#d9a56e'); break;
    case 'bush': drawBush(x, y); break;
    default: drawTree(x, y, s);
  }
}
var V = { x0: 0, x1: 0, y0: 0, y1: 0 };
function onScreen(x, y) { var p = P(x, y, 0); return p.x > V.x0 - 140 && p.x < V.x1 + 140 && p.y > V.y0 - 260 && p.y < V.y1 + 120; }

/* ---------- ground: grass, streets, the main road and the lot surface ---------- */
function quad(x0, y0, x1, y1, col) { poly([P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)], col); }
function quadA(x0, y0, x1, y1, col) { poly([P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)], col, null, 0); }
function kerb(x0, y0, x1, y1) { prism(x0, y0, 0, x1, y1, 1.8, '#e2ddd0'); }
function drawGround() {
  ZOFF = 0;
  var cs = [{ u: V.x0, v: V.y0 }, { u: V.x1, v: V.y0 }, { u: V.x0, v: V.y1 }, { u: V.x1, v: V.y1 }], mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9, x, y;
  cs.forEach(function (c) {
    var u = (c.u - OX) / HW, v = (c.v - OY) / HH, px = (u + v) / 2, py = (v - u) / 2;
    mnx = Math.min(mnx, px); mxx = Math.max(mxx, px); mny = Math.min(mny, py); mxy = Math.max(mxy, py);
  });
  var gx0 = Math.floor((mnx - 3) / 2) * 2, gx1 = Math.ceil((mxx + 3) / 2) * 2, gy0 = Math.floor((mny - 3) / 2) * 2, gy1 = Math.ceil((mxy + 3) / 2) * 2;
  var th = TH(), G = th.ground;
  for (x = gx0; x < gx1; x += 2) for (y = gy0; y < gy1; y += 2) {
    if (th.water && y >= th.water) continue;
    var h = ((x * 7 + y * 13) % 5 + 5) % 5;
    quad(x, y, x + 2, y + 2, h === 0 ? G[2] : ((x + y) / 2 & 1) ? G[0] : G[1]);
  }
  if (th.water) {   // beach and sea with drifting wave lines
    var wy = th.water;
    quad(gx0, wy - 1.6, gx1, wy + .2, '#f6e7b8');
    quad(gx0, wy + .2, gx1, gy1 + 4, '#5fc6ec');
    var off = REDUCE ? 0 : (S.t * .25) % 3;
    for (x = gx0; x < gx1; x += 3) for (y = wy + 1; y < gy1 + 4; y += 1.6) { var xx = x + off + (y * 1.7) % 3; line(P(xx, y), P(xx + .8, y), 2, 'rgba(255,255,255,.45)'); }
  }
  // town streets
  var SW = '#d9d2c0', AS = '#6c7898';
  quad(-18, BACK_ST[0] - .45, 26, BACK_ST[1] + .45, SW); quad(-18, BACK_ST[0], 26, BACK_ST[1], AS);
  [SIDE_W, SIDE_E].forEach(function (s) { quad(s[0] - .45, -22, s[1] + .45, RY, SW); quad(s[0], -22, s[1], RY, AS); });
  for (x = -17; x < 26; x += 1.5) quadA(x, -7.03, x + .7, -6.97, 'rgba(255,255,255,.5)');
  drawRoad();
  drawLotGround();
}
// the main road: lanes, kerbs, sidewalks and markings for its tier
function drawRoad() {
  var R = ROAD(), t = roadTier(), x0 = -26, x1 = 34, ye = RY + R.w, x;
  quad(x0, RY - .55, x1, RY, '#d9d2c0');                        // north sidewalk
  quad(x0, RY, x1, ye, '#5f6a86');
  if (t === 3) { quad(x0, RY, x1, RY + .12, '#6c7898'); quad(x0, ye - .2, x1, ye, '#6c7898'); }
  quad(x0, ye, x1, ye + .7, '#d9d2c0');                          // south sidewalk
  for (x = x0; x < x1; x += 2) quadA(x, ye + .33, x + .04, ye + .7, 'rgba(120,110,90,.18)');
  // edge lines
  quadA(x0, RY + .08, x1, RY + .13, 'rgba(255,255,255,.8)'); quadA(x0, ye - .13, x1, ye - .08, 'rgba(255,255,255,.8)');
  // lane dividers between lanes going the same way
  for (var i = 0; i < R.lanes.length - 1; i++) {
    var a = R.lanes[i], b = R.lanes[i + 1];
    if (a[1] !== b[1] || b[0] - a[0] > 1.05) continue;
    var my = (a[0] + b[0]) / 2;
    for (x = x0; x < x1; x += 1.6) quadA(x, my - .03, x + .8, my + .03, 'rgba(255,255,255,.7)');
  }
  if (t === 0) for (x = x0; x < x1; x += 1.6) quadA(x, 10.97, x + .9, 11.03, '#ffd04a');
  if (t === 1) { quadA(x0, 11.93, x1, 11.98, '#ffd04a'); quadA(x0, 12.02, x1, 12.07, '#ffd04a'); }
  if (R.med) {
    var m = R.med;
    if (m[2] === 'grass') { quad(x0, m[0], x1, m[1], TH().ground[0]); kerb(x0, m[0], x1, m[0] + .08); kerb(x0, m[1] - .08, x1, m[1]); }
    else { quadA(x0, m[0] - .08, x1, m[0] - .03, '#ffd04a'); quadA(x0, m[1] + .03, x1, m[1] + .08, '#ffd04a'); prism(x0, m[0] + .1, 0, x1, m[1] - .1, 7, '#d6d9e2'); }
  }
  // driveways cross the north sidewalk
  var dw = [[ENX - .5, ENX + .5], [EXX() - .5, EXX() + .5]];
  if (S.deckAnim > .02) dw.push([GIN - .5, GOUT + .5]);
  if (S.lvl.wash) { dw.push([WEX - .5, WEX + .5]); dw.push([WRX - .5, WRX + .5]); }
  dw.forEach(function (d) { quad(d[0], RY - .55, d[1], RY + .02, '#6c7898'); });
}
// the lot: asphalt, kerbs, painted bays, wheel stops, lane arrows, the walkway and the plaza
function drawLotGround() {
  var ex = EXX(), ty = topY(), n = unitCount(), k, c, s, x;
  var sp = shopSpan(), wx0 = Math.min(-1.6, S.deckAnim > .02 ? GX1 + .6 : -1.6), wx1 = Math.max(sp[1] + .6, ex + .6);
  quad(wx0, ty - 1, wx1, ty, '#ece3cc');                                          // walkway and market plaza
  for (x = Math.ceil(wx0); x < wx1; x++) quadA(x, ty - 1, x + .03, ty, 'rgba(120,110,90,.15)');
  quad(sp[0] - .5, ty - 3.4, sp[1] + .5, ty - 1, '#e6dcc4');
  if (S.deckAnim > .02) { quad(GX1 + .6, GDOOR - .4, GX1 + 1.5, ty - .5, '#ece3cc'); quad(GX1, GDOOR - .4, GX1 + 1.5, GDOOR + .4, '#ece3cc'); }
  quad(-1.3, ty, ex + .6, 9.5, '#626e8a');                                        // asphalt
  for (k = 0; k < n; k++) {
    var y0 = unitY0(k), cols = unitCols(k);
    if (cols < COLS_MAX) {   // bays not built yet: rough gravel with dashed outlines
      quad(cols, y0, ex - .5, y0 + 1, '#8c8f9c'); quad(cols, y0 + 2, ex - .5, y0 + 3, '#8c8f9c');
      ctx.setLineDash([4, 4]); ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(255,255,255,.7)';
      [y0, y0 + 2].forEach(function (yy) { for (var cc = cols; cc < Math.min(COLS_MAX, ex - .5); cc++) { var a = P(cc + .08, yy + .08), b = P(cc + .92, yy + .08), q = P(cc + .92, yy + .92), d = P(cc + .08, yy + .92); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(q.x, q.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.stroke(); } });
      ctx.setLineDash([]);
    }
    for (x = .8; x < ex - 1; x += 2.6) {   // arrows down the aisle
      var ay = y0 + 1.5;
      poly([P(x - .35, ay - .06), P(x + .05, ay - .06), P(x + .05, ay - .2), P(x + .4, ay), P(x + .05, ay + .2), P(x + .05, ay + .06), P(x - .35, ay + .06)], 'rgba(255,255,255,.55)', null, 0);
    }
  }
  S.spots.forEach(function (s) {
    if (!unlocked(s)) return;
    if (evBay(s)) quadA(s.x + .05, s.y + .05, s.x + .95, s.y + .95, 'rgba(47,174,124,.35)');
    var back = s.row === 'N' ? s.y + .03 : s.y + .97, front = s.row === 'N' ? s.y + 1 : s.y;
    line(P(s.x, s.y + .02), P(s.x, s.y + .98), 2, 'rgba(255,255,255,.9)', 'butt');
    line(P(s.x + 1, s.y + .02), P(s.x + 1, s.y + .98), 2, 'rgba(255,255,255,.9)', 'butt');
    line(P(s.x, back), P(s.x + 1, back), 2, 'rgba(255,255,255,.75)', 'butt');
    var wy = s.row === 'N' ? s.y + .16 : s.y + .76;
    prism(s.x + .25, wy, 0, s.x + .75, wy + .08, 1.6, '#d9d6cc');                // wheel stop
  });
  // entry and exit lanes: arrows, and kerbs round the lot
  for (var yy = 9; yy > aisleY(n - 1) + .5; yy -= 2.2) {
    poly([P(ENX - .06, yy + .35), P(ENX - .06, yy - .05), P(ENX - .2, yy - .05), P(ENX, yy - .4), P(ENX + .2, yy - .05), P(ENX + .06, yy - .05), P(ENX + .06, yy + .35)], 'rgba(255,255,255,.55)', null, 0);
    poly([P(ex - .06, yy - .75), P(ex - .06, yy - .35), P(ex - .2, yy - .35), P(ex, yy), P(ex + .2, yy - .35), P(ex + .06, yy - .35), P(ex + .06, yy - .75)], 'rgba(255,255,255,.55)', null, 0);
  }
  kerb(-1.42, ty, -1.3, 9.5); kerb(ex + .6, ty, ex + .72, 9.5);
  kerb(-1.3, ty - .1, ex + .72, ty);
  kerb(-.2, 9.4, ex - .5, 9.5);
  if (S.deckAnim > .02) { quad(GIN - .5, GY1, GOUT + .5, RY, '#6c7898'); line(P((GIN + GOUT) / 2, GY1 + .1), P((GIN + GOUT) / 2, RY - .6), 2, 'rgba(255,255,255,.6)', 'butt'); }
  if (S.lvl.wash) {
    var wn = washLanes(), yN = WYS[wn - 1] - .5;
    quad(WEX - .5, yN, WEX + .5, RY, '#6c7898'); quad(WRX - .5, yN, WRX + .5, RY, '#6c7898');
    for (k = 0; k < wn; k++) quad(WEX - .5, WYS[k] - .5, WRX + .5, WYS[k] + .5, '#6c7898');
    quad(WX0 - .2, yN - .3, WX1 + .2, WYS[0] + .65, '#c9d1e4');
    for (k = 0; k < wn; k++) quad(WX0 - .2, WYS[k] - .45, WX1 + .2, WYS[k] + .45, '#7b87a8');
    if (wn > 1) quad(WEX - .5, yN, WEX + .5, WYS[0] + .5, '#6c7898');
  }
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
// things standing along the road: street lamps, median trees, the highway gantry
function roadObjects(out) {
  var R = ROAD(), t = roadTier(), ex = EXX(), avoid = [ENX, ex, GIN, GOUT, WEX, WRX, -1.85, -2];
  [-16.5, -12.6, -9.8, 2.3, 6.4, 14.1, 18.3, 23, 27].forEach(function (x) {
    if (avoid.some(function (a) { return Math.abs(a - x) < .9; })) return;
    out.push({ d: x + RY - .3, f: function () { drawStreetLamp(x, RY - .25); } });
  });
  var ye = RY + R.w + .45;
  for (var x = -15; x < 28; x += 4.2) (function (x) { out.push({ d: x + ye, f: function () { drawTreeKind(TH().tree, x, ye + .3, .8); } }); })(x);
  if (R.med && R.med[2] === 'grass') for (x = -14; x < 28; x += 3) (function (x) { out.push({ d: x + 12.6, f: function () { drawTreeKind(TH().tree, x, 12.6, .7); } }); })(x);
  if (t === 3) out.push({ d: -9 + 17, f: drawGantry });
}
function drawStreetLamp(x, y) {
  prism(x - .04, y - .04, 0, x + .04, y + .04, 44, '#6b6590');
  prism(x - .04, y - .04, 44, x + .04, y + .34, 47, '#6b6590');
  prism(x - .08, y + .22, 40, x + .08, y + .4, 45, '#fff3c4');
}
function drawGantry() {
  var x = -9, ya = RY - .2, yb = RY + ROAD().w + .2;
  prism(x - .08, ya - .08, 0, x + .08, ya + .08, 58, '#9aa3b8'); prism(x - .08, yb - .08, 0, x + .08, yb + .08, 58, '#9aa3b8');
  prism(x - .06, ya, 54, x + .06, yb, 58, '#9aa3b8');
  prism(x + .06, RY + .3, 34, x + .12, RY + 2.6, 54, '#2f8a57');
  faceText('LITTLE LOT', P(x + .121, RY + 1.45, 48), 'R', 7, '#ffffff'); faceText('EXIT 1/2 MI', P(x + .121, RY + 1.45, 40), 'R', 6, '#ffffff');
}
/* ---------- camera ---------- */
var T = { ox: 0, oy: 0, k: 1, dpr: 1 };
// the camera frames what is built: the lot, the market, the road, and the garage and car wash once they exist
function camTarget() {
  var ex = EXX(), x0 = S.deckAnim > .02 ? GX0 - .8 : -2.6, x1 = S.lvl.wash ? WRX + 1 : Math.max(ex + 1.5, shopSpan()[1] + 1);
  var y0 = topY() - 3.6, y1 = RY + ROAD().w + 1.2, zt = Math.max([30, 36, 56, 80, 200][shopTier()], S.deckAnim * DH + 30);
  var l = P(x0, y1).x, r = P(x1, y0).x, t = Math.min(P(x0, y0, zt * .6).y, P(GX1, GY0, S.deckAnim > .02 ? S.deckAnim * DH + 40 : 0).y), b = P(x1, y1).y;
  return { l: l - 20, t: t - 10, r: r + 20, b: b + 10 };
}
// phones held upright get a closer look; pinch out to see everything
function defaultZoom() {
  var c = S.cam, availH = Math.max(120, S.h - 242 - S.safeT - S.safeB), fit = Math.min(S.w / (c.r - c.l), availH / (c.b - c.t));
  return Math.max(1, Math.min(2, .74 / fit));
}
function stepCam(dt) {
  var t = camTarget(), k = S.camSet ? Math.min(1, dt * 3) : 1, v = S.view, e;
  for (e in t) S.cam[e] += (t[e] - S.cam[e]) * k;
  S.camSet = true;
  if (!v.user) {   // ease back to the default framing
    var q = Math.min(1, dt * 4);
    v.z += (defaultZoom() - v.z) * q; v.x += (0 - v.x) * q; v.y += (0 - v.y) * q;
  }
}
var ZMIN = .45, ZMAX = 4;
function clampView() {
  var v = S.view, c = S.cam, w = (c.r - c.l) * .7 + 200, h = (c.b - c.t) * .7 + 200;
  v.z = Math.max(ZMIN, Math.min(ZMAX, v.z));
  v.x = Math.max(-w, Math.min(w, v.x)); v.y = Math.max(-h, Math.min(h, v.y));
}
function computeT() {
  var dpr = cv.width / S.w, c = S.cam, VW = c.r - c.l, VH = c.b - c.t, v = S.view;
  var topPad = 92 + S.safeT, botPad = 150 + S.safeB + S.pad, availH = Math.max(120, S.h - topPad - botPad);
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
  var a = dk, p, ex = EXX();
  lotLamps().forEach(function (l) { p = P(l[0], l[1], 36); glow(p.x, p.y + 16, 60, 'rgba(255,230,160,.5)', a); });
  [-16.5, -12.6, -9.8, 2.3, 6.4, 14.1, 18.3, 23, 27].forEach(function (x) { p = P(x, RY + .1, 40); glow(p.x, p.y + 18, 64, 'rgba(255,226,150,.45)', a); });
  shopDoors().forEach(function (dx) { p = P(dx, shopFrontY() + .1, 10); glow(p.x, p.y, 34, 'rgba(255,220,130,.6)', a); });
  p = P(-2, 9.75, 70); glow(p.x, p.y, 30, freeCount() ? 'rgba(90,240,140,.6)' : 'rgba(255,90,90,.6)', a);
  if (S.lvl.wash) WYS.slice(0, washLanes()).forEach(function (wy) { p = P(WX1, wy, 10); glow(p.x, p.y, 40, 'rgba(120,210,255,.5)', a); });
  if (S.deckAnim > .5) for (var d = 0; d < Math.floor(S.deckAnim); d++) { p = P((GX0 + GX1) / 2, GY1, d * DH + 20); glow(p.x, p.y, 70, 'rgba(255,230,160,.35)', a); }
  S.cars.concat(S.traffic).forEach(function (c) {
    if (hiddenCar(c) || c.state === 'parked' || c.state === 'wantout' || c.inWash) return;
    var m = CARS[c.type] || CARS.sedan, f = orel(c.x, c.y, c.ang, m.L / 2 + .45, 0);
    p = P(f.x, f.y, 3); glow(p.x, p.y, 26, 'rgba(255,240,180,.55)', a);
  });
  var n = townShown();
  for (var i = 0; i < n; i++) { var q = TOWN[i]; if (q.t === 'neon' && onScreen(q.x, q.y)) { p = P(q.x + q.w / 2, q.y + q.d, q.h * .55); glow(p.x, p.y, 80, hexA(q.n, .35), a); } }
  ctx.globalCompositeOperation = 'source-over';
}

/* ---------- the frame ---------- */
function drawGem(x, y, r) {
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * .85, y - r * .25); ctx.lineTo(x, y + r); ctx.lineTo(x - r * .85, y - r * .25); ctx.closePath();
  ctx.fillStyle = '#6fe3ff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
}
/* ---------- the cached background ----------
   Grass, streets, the road, the lot paint and the town behind the lot hardly ever change, so they are drawn once
   into an offscreen canvas (with a margin for panning) and copied to the screen each frame. It is redrawn only when
   the layout changes, the town grows, or the zoom drifts; while pinching, the old copy is simply scaled. */
var BG = { cv: null, key: '', ox: 0, oy: 0, k: 1, m: 0 };
function bgKey() { return [S.theme, S.lvl.space, roadTier(), washLanes(), S.deckAnim > .02 ? 1 : 0, shopTier(), Math.min(S.lvl.ev, builtCols()), townShown(), cv.width, cv.height].join(); }
function inBg(p) { return p.y + p.d < RY - .45; }   // town plots north of the road never have anything moving behind them
function bakeBg(key) {
  var m = Math.round(Math.max(cv.width, cv.height) * .3), main = ctx, k = T.k, th = TH(), i;
  if (!BG.cv) BG.cv = document.createElement('canvas');
  if (BG.cv.width !== cv.width + 2 * m || BG.cv.height !== cv.height + 2 * m) { BG.cv.width = cv.width + 2 * m; BG.cv.height = cv.height + 2 * m; }
  ctx = BG.cv.getContext('2d'); SEAMS = true;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  var g = ctx.createLinearGradient(0, 0, 0, BG.cv.height); g.addColorStop(0, th.bg[0]); g.addColorStop(1, th.bg[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, BG.cv.width, BG.cv.height);
  var ox = T.ox + m, oy = T.oy + m;
  ctx.setTransform(k, 0, 0, k, ox, oy);
  V.x0 = -ox / k; V.x1 = (BG.cv.width - ox) / k; V.y0 = -oy / k; V.y1 = (BG.cv.height - oy) / k;
  ZOFF = 0;
  drawGround();
  var L = [], n = townShown();
  for (i = 0; i < n; i++) if (TOWN[i].t === 'house' && inBg(TOWN[i]) && onScreen(TOWN[i].x, TOWN[i].y)) drawHouseGround(TOWN[i]);   // yards first, under everything
  for (i = 0; i < n; i++) (function (p, i) { if (inBg(p) && onScreen(p.x, p.y)) L.push({ d: p.x + p.y + p.d + (p.kind === 'ell' ? .9 : 0), f: function () { drawPlot(p, i); } }); })(TOWN[i], i);
  STREET_TREES.forEach(function (t) { if (onScreen(t[0], t[1])) L.push({ d: t[0] + t[1], f: function () { drawTreeKind(t[2] ? TH().tree2 : TH().tree, t[0], t[1], .75); } }); });
  S.spots.forEach(function (s) { if (unlocked(s) && evBay(s)) L.push({ d: s.x + s.y + 50, f: function () { drawChargerPost(s); } }); });
  L.sort(function (a, b) { return a.d - b.d; }); L.forEach(function (o) { o.f(); });
  SEAMS = false; ctx = main;
  BG.key = key; BG.ox = T.ox; BG.oy = T.oy; BG.k = k; BG.m = m; BG.n = (BG.n || 0) + 1;
}
function drawBg(interacting) {
  var key = bgKey(), s = T.k / BG.k, m = BG.m;
  var dx = T.ox - (BG.ox + m) * s, dy = T.oy - (BG.oy + m) * s, dw = (BG.cv ? BG.cv.width : 0) * s, dh = (BG.cv ? BG.cv.height : 0) * s;
  var uncovered = dx > 0 || dy > 0 || dx + dw < cv.width || dy + dh < cv.height;
  // never leave a bare edge: if the copy would not fill the screen, redraw it now, mid-gesture or not
  if (!BG.cv || key !== BG.key || uncovered || Math.abs(s - 1) > (interacting ? .4 : .01)) {
    bakeBg(key); s = 1; dx = T.ox - BG.ox - BG.m; dy = T.oy - BG.oy - BG.m; dw = BG.cv.width; dh = BG.cv.height; uncovered = false;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (s === 1) ctx.drawImage(BG.cv, Math.round(dx), Math.round(dy)); else ctx.drawImage(BG.cv, dx, dy, dw, dh);
}
function draw() {
  computeT();
  var k = T.k, th = TH(), i;
  drawBg(perfNow() - lastInput < 600);
  ctx.setTransform(k, 0, 0, k, T.ox, T.oy);
  V.x0 = -T.ox / k; V.x1 = (cv.width - T.ox) / k; V.y0 = -T.oy / k; V.y1 = (cv.height - T.oy) / k;
  ZOFF = 0;
  if (!SET.saver) drawCloudShadows();

  // three passes, back to front: everything north of the road, then the road, then the far side
  var north = [], road = [], south = [], ex = EXX(), sp = shopSpan();
  var put = function (y, o) { (y < RY - .45 ? north : y < RY + 8 ? road : south).push(o); };
  var n = townShown();
  for (i = 0; i < n; i++) (function (p, i) { if (!inBg(p) && onScreen(p.x, p.y)) put(p.y + p.d, { d: p.x + p.y + p.d, f: function () { drawPlot(p, i); } }); })(TOWN[i], i);
  if (S.deckAnim > .02) north.push({ d: GX0 + GY1, f: drawGarage });
  north.push({ d: sp[0] + shopFrontY() - .2, f: drawMarket });
  if (S.lvl.wash) north.push({ d: WX0 + WYS[0] + .55, f: drawWash });
  north.push({ d: -1.85 + 8.75, f: drawBooth });
  road.push({ d: ENX - .5 + 9.35, f: function () { drawArm(ENX - .5, S.gate); } }, { d: ex - .5 + 9.35, f: function () { drawArm(ex - .5, S.gate2 || 0); } }, { d: -2 + 9.75, f: drawEntranceSign });
  if (S.lvl.ads >= 3) road.push({ d: -11.2 + 9.2, f: drawBillboard });
  if (S.lvl.valet >= 1) north.push({ d: -1.85 + 7.6, f: drawValet });
  lotLamps().forEach(function (l) { (l[1] > 9.4 ? road : north).push({ d: l[0] + l[1], f: function () { drawLotLamp(l[0], l[1]); } }); });
  S.spots.forEach(function (s) { if (unlocked(s) && evBay(s) && s.car && s.car.state === 'parked') north.push({ d: s.x + s.y + (s.row === 'N' ? .1 : .9), f: function () { drawCable(s); } }); });
  S.cars.forEach(function (c) { if (!hiddenCar(c) && onScreen(c.x, c.y)) put(c.y, { d: c.x + c.y, f: function () { drawCar(c); } }); });
  S.traffic.forEach(function (c) { if (onScreen(c.x, c.y)) road.push({ d: c.x + c.y, f: function () { drawCar(c); } }); });
  S.walkers.forEach(function (w) { if (w.state !== 'inside' && onScreen(w.x, w.y)) north.push({ d: w.x + w.y + .05, f: function () { drawWalker(w); } }); });
  roadObjects(road);
  var byDepth = function (a, b) { return a.d - b.d; };
  [north, road, south].forEach(function (L) { L.sort(byDepth); L.forEach(function (o) { o.f(); }); });
  nightPass();
  ctx.setTransform(k, 0, 0, k, T.ox, T.oy);
  var hot = S.hype > .5;
  S.fx.forEach(function (f) {
    var q;
    if (f.kind === 'bub') { q = P(f.x + f.vx * f.t * .02, f.y, f.z + f.t * 22); ctx.globalAlpha = Math.max(0, 1 - f.t / 1.4); circle(q.x, q.y, 2.5 + f.t * 2, 'rgba(255,255,255,.85)'); }
    else if (f.kind === 'gem') { q = P(f.x, f.y, 50 + f.t * 40); ctx.globalAlpha = Math.max(0, 1 - f.t / 1.4); drawGem(q.x, q.y, 9); label('+1', q.x + 18, q.y, 13, '#fff'); }
    else if (f.kind === 'pop') { q = P(f.x, f.y, f.z); var r = f.t / .8; ctx.globalAlpha = Math.max(0, 1 - r); for (var j = 0; j < 8; j++) { var an = j * Math.PI / 4; circle(q.x + Math.cos(an) * 40 * r, q.y + Math.sin(an) * 20 * r - 20 * r, 5 * (1 - r) + 1, j % 2 ? '#ffd04a' : '#ffffff'); } }
    else if (f.kind === 'ring') { ctx.globalAlpha = Math.max(0, 1 - f.t / .7); ctx.beginPath(); ctx.arc(f.lx, f.ly, 6 + f.t * 70, 0, Math.PI * 2); ctx.lineWidth = 3; ctx.strokeStyle = hot ? '#ffb0dc' : '#ffffff'; ctx.stroke(); }
    else if (f.kind === 'tapc') { ctx.globalAlpha = Math.max(0, 1 - f.t / .7); label(f.txt, f.lx, f.ly - 14 - f.t * 40, 13, '#ffe38a'); }
    ctx.globalAlpha = 1;
  });
  S.particles.forEach(function (p) {
    var q = P(p.x, p.y, 34 + p.t * 30), s = p.big ? 1.5 : 1;
    ctx.globalAlpha = Math.min(1, (1.2 - p.t) * 2.2);
    circle(q.x - 17 * s, q.y, 8.5 * s, '#ffd04a', 2.4); label('$', q.x - 17 * s, q.y + .5, 11 * s, '#3b2f5c');
    label(p.txt, q.x + 6 * s, q.y, 16 * s, hot ? '#ffd1ec' : '#fff');
    ctx.globalAlpha = 1;
  });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  var dpr = T.dpr;
  S.fx.forEach(function (f) {
    if (f.kind !== 'conf') return;
    var x = (f.x + f.vx * f.t) * cv.width, y = (f.y + f.vy * f.t) * cv.height;
    ctx.save(); ctx.translate(x, y); ctx.rotate(f.r + f.t * 6); ctx.globalAlpha = Math.max(0, 1 - f.t / 3);
    ctx.fillStyle = f.c; ctx.fillRect(-4 * dpr, -2.5 * dpr, 8 * dpr, 5 * dpr); ctx.restore();
  });
}

var lastInput = -1e9;
function perfNow() { return performance.now(); }
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
  audioUnlock(); lastInput = perfNow();
  var p = cssPt(e); PTR[e.pointerId] = { x: p.x, y: p.y, sx: p.x, sy: p.y, t: performance.now() };
  try { cv.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
  if (ptrCount() === 1) dragged = false;
  if (ptrCount() === 2) { dragged = true; pinch = null; }
});
cv.addEventListener('pointermove', function (e) {
  var q = PTR[e.pointerId]; if (!q) return;
  lastInput = perfNow();
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
  e.preventDefault(); lastInput = perfNow();
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
function setMusic(on) { if (!musBus) return; if (on && AC.state === 'suspended') AC.resume(); musBus.gain.setTargetAtTime(on ? .5 : 0, AC.currentTime, .3); audioNap(); }
function tone(f, t0, dur, type, vol, f2, bus) {
  var o = AC.createOscillator(), g = AC.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + .012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(bus || sfxBus); o.start(t0); o.stop(t0 + dur + .05);
}
var GAP = { coin: .07, tap: .03, vip: .3, buy: .05 };
// with the music off, the audio engine sleeps between sound effects instead of running all the time
var sleepT = 0;
function audioNap() {
  clearTimeout(sleepT);
  if (AC && !SET.music) sleepT = setTimeout(function () { if (AC && !SET.music && AC.state === 'running') AC.suspend(); }, 3000);
}
function sfx(k, x) {
  if (!AC || !SET.sfx || document.hidden) return;
  if (AC.state === 'suspended' && !SET.music) { AC.resume(); audioNap(); return; }   // wakes up for the next sound
  if (AC.state !== 'running') return;
  audioNap();
  var n = AC.currentTime;
  if (GAP[k] && n - (lastSfx[k] || 0) < GAP[k]) return;
  lastSfx[k] = n;
  switch (k) {
    case 'coin': var f = 1250 + Math.random() * 250; tone(f, n, .08, 'sine', .07); tone(f * 1.5, n + .045, .12, 'sine', .06); break;
    case 'tap': tone(260 + 520 * (x || 0), n, .07, 'triangle', .16, 180 + 400 * (x || 0)); break;
    case 'buy': [523, 659, 784].forEach(function (f, i) { tone(f, n + i * .055, .14, 'square', .045); }); break;
    case 'claim': [784, 988, 1175, 1568].forEach(function (f, i) { tone(f, n + i * .07, .22, 'sine', .09); }); break;
    case 'vip': tone(440, n, .14, 'square', .06); tone(554, n + .16, .2, 'square', .06); [1320, 1760].forEach(function (f, i) { tone(f, n + .3 + i * .06, .18, 'sine', .07); }); break;
    case 'max': tone(300, n, .5, 'sawtooth', .05, 1400); [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, n + .3 + i * .06, .25, 'triangle', .08); }); break;
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
  if (document.hidden) AC.suspend(); else if (SET.music) { AC.resume(); musT = AC.currentTime + .1; }
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
  if (!store || !iapReady) { note('Purchases are in the App Store app'); return; }
  var p = store.get(IAP[k].id), o = p && p.getOffer();
  if (!o) { note('Not available right now'); return; }
  store.order(o).then(function (err) { if (err && err.code !== window.CdvPurchase.ErrorCode.PAYMENT_CANCELLED) note('Purchase failed · not charged'); });
}
function iapRestore() {
  if (!store) { note('Restore works in the App Store app'); return; }
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
// Every upgrade says what it does in plain words, then shows Now -> Next with real numbers.
// show() describes the current state; the card calls it at the next level too to show what you get.
var ITEMS = {
  space: { tab: 'build', name: 'Parking lot', tint: '#bde6ff', icon: 'space', multi: true,
    what: 'Paint 2 more bays. Each row fills to 10, then a new row opens and the market moves back.',
    cost: function (l) { return 60 * Math.pow(1.68, l); }, show: function () { return activeSpots().length + ' bays'; } },
  garage: { tab: 'build', name: 'Garage', tint: '#e3d9ff', icon: 'garage', multi: false,
    what: 'Covered parking, 9 bays a floor. Garage drivers pay x1.8 but walk further.',
    cost: function (l) { return 600 * Math.pow(3.6, l); }, show: function () { return S.lvl.garage ? S.lvl.garage + (S.lvl.garage === 1 ? ' floor, ' : ' floors, ') + garCap() + ' bays' : 'Not built'; } },
  wash: { tab: 'build', name: 'Car wash', tint: '#c7f0ff', icon: 'wash', multi: true, ms: true,
    what: 'Leaving drivers stop for a wash. Another lane opens at levels 10, 25 and 50.',
    cost: function (l) { return 15000 * Math.pow(1.55, l); }, show: function () { return S.lvl.wash ? washLanes() + (washLanes() > 1 ? ' lanes' : ' lane') + ', $' + fmtSmall(washPrice() / rushFee()) + ' a wash' : 'Not built'; } },
  shop: { tab: 'build', name: 'Market', tint: '#ffd9c7', icon: 'shop', multi: true, ms: true,
    what: 'Better shops, and shoppers tip you every visit. The building grows at levels 5, 15, 30 and 60.',
    cost: function (l) { return 80 * Math.pow(1.62, l); }, show: function () { return S.lvl.shop ? '$' + fmtSmall(fee() / rushFee() * tipRate()) + ' tip a visit' : 'No tips yet'; } },
  gate: { tab: 'speed', name: 'Road', tint: '#ffc7bd', icon: 'gate', multi: true,
    what: 'Widen the road: faster cars and more traffic. 4 lanes at level 5, a boulevard at 15, a highway at 30.',
    cost: function (l) { return 60 * Math.pow(1.75, l); }, show: function () { return pct(speedMul()) + ' speed, x' + fmtX(roadTraffic()) + ' traffic'; } },
  walk: { tab: 'speed', name: 'Sidewalks', tint: '#d6f0c8', icon: 'walk', multi: true,
    what: 'Shoppers walk to the market and back faster.',
    cost: function (l) { return 30 * Math.pow(1.7, l); }, show: function () { return pct(walkSpeed() / 0.8 / mod('walk', 1)) + ' walking speed'; } },
  express: { tab: 'speed', name: 'Express checkout', tint: '#ffe6b8', icon: 'express', multi: true,
    what: 'Shorter shop visits, down towards half a second.',
    cost: function (l) { return 50 * Math.pow(1.7, l); }, show: function () { return visitAvg().toFixed(1) + 's in the shop'; } },
  valet: { tab: 'speed', name: 'Valets', tint: '#d9e4ff', icon: 'valet', multi: true,
    what: 'Quicker parking and quicker in and out of cars. More valets show up at the stand.',
    cost: function (l) { return 120 * Math.pow(2.1, l); }, show: function () { return doorTime().toFixed(2) + 's per door'; } },
  fee: { tab: 'biz', name: 'Parking fee', tint: '#ffe38a', icon: 'fee', multi: true, ms: true,
    what: 'Every car pays 15% more.',
    cost: function (l) { return 14 * Math.pow(1.5, l); }, show: function () { return '$' + fmtSmall(fee() / rushFee()) + ' a car'; } },
  ads: { tab: 'biz', name: 'Advertising', tint: '#ffd1ec', icon: 'ads', multi: true, ms: true,
    what: 'About 6% more drivers want to park.',
    cost: function (l) { return 30 * Math.pow(1.56, l); }, show: function () { return Math.round(demand() / (S.rush > 0 ? 2.5 : 1) * 60) + ' drivers a minute'; } },
  rep: { tab: 'biz', name: 'Reputation', tint: '#fff0a8', icon: 'goal', multi: true,
    what: 'Nicer cars that pay more: +5% a level, and every new class of car pays x1.5.',
    cost: function (l) { return 2000 * Math.pow(1.8, l); }, show: function () { return CLASS_NAMES[repTier()] + ', x' + fmtX(repMul()) + ' fee'; } },
  ev: { tab: 'biz', name: 'EV chargers', tint: '#c9f2d9', icon: 'ev', multi: true,
    what: 'Chargers on 2 more bays. Cars at a charger pay +50%.',
    cost: function (l) { return 1500 * Math.pow(1.75, l); }, show: function () { return Math.min(S.lvl.ev, builtCols()) * 2 + ' charging bays'; } },
  concierge: { tab: 'staff', name: 'Concierge', tint: '#fff0a8', icon: 'concierge', multi: true,
    what: 'Greets every golden car for you. Each level makes golden cars pay 25% more.',
    cost: function (l) { return 3000 * Math.pow(2.1, l); }, show: function () { return S.lvl.concierge ? 'Greets for you, x' + fmtX(vipMul()) + ' bonus' : 'Not hired'; } },
  promoter: { tab: 'staff', name: 'Promoter', tint: '#ffc7bd', icon: 'promoter', multi: true,
    what: 'Starts every rush hour for you. Each level after the first adds 5s to rush hours.',
    cost: function (l) { return 25000 * Math.pow(2.2, l); }, show: function () { return S.lvl.promoter ? 'Starts rushes, ' + rushLen() + 's long' : 'Not hired'; } },
  crew: { tab: 'staff', name: 'Hype crew', tint: '#ffc7e8', icon: 'crew', multi: true,
    what: 'Keeps the crowd going: the hustle meter drains 10% slower each level.',
    cost: function (l) { return 900 * Math.pow(2.4, l); }, show: function () { return 'Full meter lasts ' + Math.round(1 / drainRate()) + 's'; } },
  manager: { tab: 'staff', name: 'Night manager', tint: '#d9e4ff', icon: 'manager', multi: true,
    what: 'Runs the lot while you are away: +5% away earnings each level.',
    cost: function (l) { return 6000 * Math.pow(2.8, l); }, show: function () { return 'Away earnings at ' + pct(awayRate()); } }
};
Object.keys(ITEMS).forEach(function (k) {
  var it = ITEMS[k];
  it.lvl = function () { return S.lvl[k]; };
  it.max = function () { return k === 'garage' ? maxDecks() : k === 'ev' ? Math.min(MAXL.ev, builtCols()) : MAXL[k]; };
  it.apply = function () { S.lvl[k]++; if (k === 'garage') ensureSlots(); };
});
// the green number next to each stat: what buying adds. val() is the stat as a number; up(a, b) turns old and new into "+2 bays" or "+15%".
function upAdd(unit, f) { return function (a, b) { return '+' + (f ? f(b - a) : fmtSmall(b - a)) + unit; }; }
function upPct(a, b) { return a > 0 ? '+' + Math.max(1, Math.round((b / a - 1) * 100)) + '%' : 'Opens'; }
function upLess(a, b) { return '-' + (a - b).toFixed(a - b < .1 ? 2 : 1) + 's'; }
function upHire(f) { return function (a, b) { return a ? f(a, b) : 'Hire'; }; }
var UPS = {
  space: [function () { return activeSpots().length; }, upAdd('')],
  garage: [function () { return garCap(); }, upAdd('')],
  wash: [function () { return S.lvl.wash ? washPrice() / rushFee() : 0; }, function (a, b) { return a ? upPct(a, b) : 'Opens'; }],
  shop: [function () { return fee() / rushFee() * tipRate(); }, function (a, b) { return a ? upPct(a, b) : '+$' + fmtSmall(b); }],
  gate: [speedMul, upPct], walk: [walkSpeed, upPct], express: [visitAvg, upLess], valet: [doorTime, upLess],
  fee: [function () { return fee(); }, upPct], ads: [demand, upPct], rep: [function () { return repMul(); }, upPct],
  ev: [function () { return Math.min(S.lvl.ev, builtCols()) * 2; }, upAdd('')],
  concierge: [function () { return S.lvl.concierge ? vipMul() : 0; }, upHire(upPct)],
  promoter: [function () { return S.lvl.promoter ? rushLen() : 0; }, upHire(upAdd('s'))],
  crew: [function () { return 1 / drainRate(); }, upAdd('s', function (d) { return Math.round(d); })],
  manager: [function () { return awayRate() * 100; }, upAdd('%', function (d) { return Math.round(d); })]
};
function valAt(k, l) { var o = S.lvl[k]; S.lvl[k] = l; var r = UPS[k][0](); S.lvl[k] = o; return r; }
function upText(k, n) { var l = S.lvl[k]; return UPS[k][1](valAt(k, l), valAt(k, l + n)); }
// what the card would say at another level
function showAt(k, l) { var o = S.lvl[k]; S.lvl[k] = l; if (k === 'garage') ensureSlots(); var r = ITEMS[k].show(); S.lvl[k] = o; return r; }
// the next landmark on a line: a new row, building, road, lane, class of car or milestone doubling
function landmark(k, l) {
  var i;
  if (k === 'space') return 4 + l < 11 ? 'Lv 7 → 2nd row' : 4 + l < 21 ? 'Lv 17 → 3rd row' : '';
  if (k === 'shop') for (i = 0; i < SHOP_TIERS.length; i++) if (SHOP_TIERS[i] > l) return 'Lv ' + SHOP_TIERS[i] + ' → ' + SHOP_NAMES[i];
  if (k === 'gate') { var R = [[5, '4 lanes'], [15, 'Boulevard'], [30, 'Highway']]; for (i = 0; i < 3; i++) if (R[i][0] > l) return 'Lv ' + R[i][0] + ' → ' + R[i][1]; }
  if (k === 'rep') for (i = 0; i < REP_TIERS.length; i++) if (REP_TIERS[i] > l) return 'Lv ' + REP_TIERS[i] + ' → ' + CLASS_NAMES[i];
  if (k === 'wash' && l >= 1 && l < 50) return 'Lv ' + (l < 10 ? 10 : l < 25 ? 25 : 50) + ' → +1 lane';
  if (k === 'garage' && l >= maxDecks()) return 'Franchise to build higher';
  if (ITEMS[k].ms) return 'Lv ' + msNext(l) + ' → x2';
  return '';
}
// the big number on each card, and the few words under it
var BIG = {
  space: function () { return [activeSpots().length, 'bays']; },
  garage: function () { return S.lvl.garage ? [garCap(), 'garage bays'] : ['None', 'garage']; },
  wash: function () { return S.lvl.wash ? ['$' + fmtSmall(washPrice() / rushFee()), 'per wash'] : ['None', 'car wash']; },
  shop: function () { return ['$' + fmtSmall(fee() / rushFee() * tipRate()), 'tip per shopper']; },
  gate: function () { return [pct(speedMul()), 'car speed']; },
  walk: function () { return [pct(walkSpeed() / 0.8 / mod('walk', 1)), 'walk speed']; },
  express: function () { return [visitAvg().toFixed(1) + 's', 'in the shop']; },
  valet: function () { return [doorTime().toFixed(2) + 's', 'per car door']; },
  fee: function () { return ['$' + fmtSmall(fee() / rushFee()), 'per car']; },
  ads: function () { return [Math.round(demand() / (S.rush > 0 ? 2.5 : 1) * 60), 'drivers a minute']; },
  rep: function () { return ['+' + Math.round((repMul() - 1) * 100) + '%', 'fares from nicer cars'] ; },
  ev: function () { return [Math.min(S.lvl.ev, builtCols()) * 2, 'bays paying +50% fares']; },
  concierge: function () { return S.lvl.concierge ? ['x' + fmtX(vipMul()), 'golden car bonus'] : ['Off', 'greets golden cars']; },
  promoter: function () { return S.lvl.promoter ? [rushLen() + 's', 'auto rush hours'] : ['Off', 'starts rush hours']; },
  crew: function () { return [Math.round(1 / drainRate()) + 's', 'full meter lasts']; },
  manager: function () { return [pct(awayRate()), 'away earnings']; }
};
var TABS = { build: ['space', 'garage', 'wash', 'shop'], speed: ['gate', 'walk', 'express', 'valet'], biz: ['fee', 'ads', 'rep', 'ev'], staff: ['concierge', 'promoter', 'crew', 'manager'] };
var TABNOTE = {
  build: 'Grow the place. Drivers use the lot first, then the garage. When both are full, cars queue on the road and give up.',
  speed: 'Every visit: drive in, park, walk to the market, shop, walk back, drive out. Speed up any step to free the bay sooner.',
  biz: 'Earn more from each visit and bring more drivers in.',
  staff: 'Hire help so the lot runs itself, and level them up.',
  goals: 'Finish goals for cash and 3 gems each. Every goal has another one after it.',
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

// a puff of sparkles where the upgrade shows up on the lot
function buildPop(k) {
  var sp = shopSpan(), at = { space: [builtCols() > 10 ? (builtCols() - 1) % 10 + .5 : builtCols() - .5, aisleY(unitCount() - 1)], garage: [(GX0 + GX1) / 2, GY1, S.lvl.garage * DH],
    wash: [(WX0 + WX1) / 2, WYS[0], 30], shop: [(sp[0] + sp[1]) / 2, shopFrontY(), 30], gate: [4, RY + 1], ev: [Math.max(0, S.lvl.ev - 1) % 10 + .5, unitY0(Math.floor((S.lvl.ev - 1) / 10)) + .5],
    valet: [-1.85, 7.6], ads: [-11.2, 9.2, 50] }[k] || [4, aisleY(0)];
  S.fx.push({ kind: 'pop', x: at[0], y: at[1], z: at[2] || 10, t: 0 });
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
  if (p.maxed) return k === 'garage' ? 'Franchise for more' : k === 'ev' && S.lvl.ev < MAXL.ev ? 'Build more bays' : 'Maxed';
  return '<span class="c">$</span>' + fmt(p.cost) + (p.n > 1 ? ' <small>x' + p.n + '</small>' : '');
}
function bigStat(v, unit, up) {
  return '<div class="big"><b>' + v + '</b>' + (up ? '<span class="up">' + up + '</span>' : '') + '<small>' + unit + '</small></div>';
}
function cardStat(k, n) { var b = BIG[k](); return bigStat(b[0], b[1], n ? upText(k, n) : ''); }
function cardHtml(k) {
  var it = ITEMS[k], l = it.lvl(), mx = it.max(), p = plan(k, S.qty), maxed = l >= mx, lm = landmark(k, l);
  return '<article class="card up" id="card-' + k + '" title="' + it.what + '"><h3><span class="ico" style="background:' + it.tint + '">' + ICON[it.icon] + '</span>' + it.name + '<span class="lv">Lv ' + l + '</span></h3>' +
    '<div class="nnw" id="nn-' + k + '">' + cardStat(k, maxed ? 0 : Math.max(1, p.n || 1)) + '</div>' +
    (lm ? '<p class="lm">' + lm + '</p>' : '') +
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
  var d = PDEF[k], c = d.cost(S.perk[k]), maxed = S.perk[k] >= PMAX[k], b = d.big();
  return '<article class="card up" id="perk-' + k + '"><h3><span class="ico" style="background:' + d.tint + '">' + ICON[d.icon] + '</span>' + d.name + '<span class="lv">Lv ' + S.perk[k] + (isFinite(PMAX[k]) ? '/' + PMAX[k] : '') + '</span></h3>' +
    '<div class="nnw">' + bigStat(b[0], b[1], maxed ? '' : d.up) + '</div>' +
    '<button class="buy" type="button" data-perk="' + k + '"' + (!maxed && S.tok >= c ? '' : ' disabled') + '>' + (maxed ? 'Maxed' : c + ' <i class="tk"></i>') + '</button></article>';
}
function frHtml() {
  var gain = starsGain(), base = starAt(starsTotal()), nxt = starAt(starsTotal() + 1), nl = locAt(S.franchises + 1);
  var pc = Math.max(0, Math.min(100, (S.lifetime - base) / (nxt - base) * 100));
  var h = '<div class="fr"><h3>Franchise</h3>' +
    '<p>Sell this lot and open the next one on the map. You keep your income bonus, tokens, gems and goals. The new lot starts from scratch, and you can build its garage 2 floors higher.</p>' +
    '<div class="frbig"><div><small>Income bonus</small><b>x' + fmtX(frMult()) + '</b>' + (gain ? '<span>&rarr; x' + fmtX(frMult(S.stars + gain)) + '</span>' : '') + '</div>' +
    '<div><small>Tokens</small><b>' + S.tok + '</b>' + (gain ? '<span>+' + gain + '</span>' : '') + '</div></div>' +
    '<div class="meter" role="img" aria-label="Progress to the next bonus step"><i id="fr-bar" style="width:' + pc + '%"></i></div>' +
    '<p id="fr-note">' + frNote() + '</p>' +
    '<div class="nextloc"><small>Next stop</small><b>' + nl.name + '</b><span>' + nl.perk + '</span></div>';
  if (!S.confirmFr) h += '<button class="buy" type="button" id="fr-go"' + (gain < 1 ? ' disabled' : '') + '>' + frBtn() + '</button>';
  else h += '<p>This resets your money, buildings, upgrades and staff.</p><div class="btns"><button class="buy danger" type="button" id="fr-yes">Yes, sell this lot</button><button class="buy ghost" type="button" id="fr-no">Keep playing</button></div>';
  h += '</div><p class="tabnote">Token shop: permanent upgrades that last through every franchise. You have ' + S.tok + ' <i class="tk"></i>.</p>';
  PORDER.forEach(function (k) { h += perkHtml(k); });
  return h;
}
function frNote() { return 'Every $' + fmt(starAt(starsTotal() + 1) - starAt(starsTotal())) + ' more you earn adds +35% income and 1 token. Next step at $' + fmt(starAt(starsTotal() + 1)) + ' earned in total (now $' + fmt(S.lifetime) + ').'; }
function frBtn() { var g = starsGain(); return g < 1 ? 'Earn more to franchise' : 'Sell for x' + fmtX(frMult(S.stars + g)) + ' income and ' + g + (g === 1 ? ' token' : ' tokens'); }
function buildTray() {
  var h = '';
  if (S.tab === 'fr') h = frHtml();
  else if (S.tab === 'goals') { h += '<p class="tabnote">' + TABNOTE.goals + '</p>'; GORDER.forEach(function (k) { h += goalHtml(k); }); }
  else {
    if (S.tut === 3) h += '<p class="tutnote">Tap a yellow button to buy</p>';
    TABS[S.tab].forEach(function (k) { h += cardHtml(k); });
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
    if (S.qty !== 1 && b.dataset.n !== String(p.n)) {   // buying several: show where that many levels gets you
      b.dataset.n = p.n; var nn = document.getElementById('nn-' + k), it = ITEMS[k];
      if (nn && !p.maxed) nn.innerHTML = cardStat(k, Math.max(1, p.n));
    }
  });
  var frReady = starsGain() > 0, gr = goalsReady();
  [].forEach.call(tabsEl.querySelectorAll('[data-tab]'), function (tb) {
    var t = tb.getAttribute('data-tab'), d = tb.querySelector('.dot'); if (!d) return;
    d.hidden = t === 'fr' ? !frReady : t === 'goals' ? !gr : !TABS[t].some(function (k) { return plan(k, 1).ok; });
  });
  var n = ready + (frReady ? 1 : 0) + gr, bd = document.getElementById('badge');
  bd.hidden = !n; bd.textContent = n;
  openBtn.classList.toggle('ready', n > 0);
  if (S.tab === 'goals') GORDER.forEach(function (k) {
    var b = document.querySelector('#goal-' + k + ' .buy'); if (!b) return;
    var ok = goalReady(k); if (b.disabled === ok) { buildTray(); return; }
  });
}
function updateFr() {
  var bar = document.getElementById('fr-bar'); if (!bar) return;
  var base = starAt(starsTotal()), nxt = starAt(starsTotal() + 1);
  bar.style.width = Math.max(0, Math.min(100, (S.lifetime - base) / (nxt - base) * 100)) + '%';
  document.getElementById('fr-note').textContent = frNote();
  var go = document.getElementById('fr-go');
  if (go) { go.textContent = frBtn(); go.disabled = starsGain() < 1; }
  if (starsGain() !== lastGain) { lastGain = starsGain(); buildTray(); }
}
var lastGain = -1;
function doFranchise() {
  var g = starsGain(); if (g < 1) return;
  S.stars += g; S.tok += g; S.franchises++; S.gems += 5; S.money = 25 + headStart(); S.totalRun = 0;
  Object.keys(S.lvl).forEach(function (k) { S.lvl[k] = 0; });
  applyBlueprints();
  S.theme = LOC().theme; buildTown();
  S.spots = []; ensureSpots(); GS = []; ensureSlots(); S.deckAnim = S.lvl.garage; clearCars(); seedParked();
  S.confirmFr = false; S.tab = 'build'; S.spawnT = 0.5; S.hype = 0; S.view.user = false; moneyChanged = true; buildTray(); save();
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
  moneyChanged = true; buildTray(); save(); sfx('buy'); buzz('light'); tutEvent('buy'); buildPop(k);
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
  var cur = S.franchises, last = Math.max(cur + 2, LOCS.length - 1), h = '<p class="pnote">Every franchise opens the next stop on the road, each with its own look and its own perk.</p><ol class="road">', i;
  for (i = 0; i <= last; i++) {
    var L = locAt(i), th = THEMES[L.theme], st = i < cur ? 'done' : i === cur ? 'here' : i === cur + 1 ? 'next' : 'locked';
    h += '<li class="stop ' + st + '"><span class="dotm" style="background:' + th.ground[0] + ';border-color:' + (st === 'locked' ? '#cdbf9b' : 'var(--ink)') + '">' + (st === 'done' ? '&#10003;' : i + 1) + '</span>' +
      '<div><b>' + L.name + '</b><small>' + L.perk + '</small>' +
      (st === 'here' ? '<em class="here">You are here</em>' : st === 'next' ? '<em>' + (starsGain() > 0 ? 'Ready: franchise for x' + fmtX(frMult(S.stars + starsGain())) + ' income' : 'Franchise to open') + '</em>' : st === 'done' ? '<em class="ok">Visited</em>' : '') + '</div></li>';
  }
  h += '</ol><button class="buy" type="button" data-act="fr">Franchising</button>';
  return h;
}
// inside the app the policy opens in Safari from the published site, so the game never navigates away
function privacyUrl() { var u = (window.LL_CONFIG || {}).SITE_URL; return isNative() && u ? u.replace(/\/?$/, '/') + 'privacy.html' : 'privacy.html'; }
var SETS = [['saver', 'Battery saver'], ['sfx', 'Sound effects'], ['music', 'Music'], ['haptics', 'Vibration'], ['daynight', 'Day and night'], ['notify', 'Reminders'], ['sci', 'Scientific numbers']];
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
  return '<div class="arrive" style="background:' + THEMES[L.theme].bg[0] + '"><b>x' + fmtX(frMult()) + '</b><span>income bonus</span></div>' +
    '<p class="pnote">' + L.perk + '. You have ' + S.tok + ' tokens to spend in the token shop on permanent upgrades.</p>' +
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
    if (k === 'saver') fit();
    return;
  }
  switch (b.getAttribute('data-act')) {
    case 'restore': iapRestore(); break;
    case 'fr': openPanel('fr'); break;
    case 'close': closePanel(); break;
    case 'perks': openPanel('fr'); break;
    case 'daily': var m = claimDaily(); if (m) { note('Gift: ' + m); moneyChanged = true; renderPanel(); } break;
    case 'tutorial': S.tut = 0; tutN = 0; closePanel(); showTut(); break;
    case 'reset':
      if (!resetStep) { resetStep = 1; renderPanel(); return; }
      closePanel(); applySave(null); S.tut = 0; moneyChanged = true; buildTray(); save();
      if (window.LLAuth && window.LLAuth.reset) window.LLAuth.reset();
      note('Progress reset'); showTut(); break;
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
  { t: 'Tap the lot to hustle!', ev: 'tap', n: 5 },
  { t: 'Keep tapping: a fuller meter means bigger fares', ev: 'tap', n: 12 },
  { t: 'Open Upgrades to grow your lot', ev: 'open' },
  { t: 'Buy an upgrade', ev: 'buy' },
  { t: 'Pinch to zoom, drag to look around', ev: 'pan', wait: 9 }
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
  if (S.tut >= TUT.length) { S.tut = 99; note('You are all set!'); notifyAsk(); save(); }
  showTut();
}
function tickTut() { if (S.tut < TUT.length && TUT[S.tut].wait && S.t - tutAt > TUT[S.tut].wait) tutNext(); }
/* ---------- HUD ---------- */
function $id(id) { return document.getElementById(id); }
var elMoney = $id('money'), elParked = $id('parked'), pill = $id('moneyPill'), elWallet = $id('wallet'), elRate = $id('rate');
var elStars = $id('stars'), starPill = $id('starPill'), elGems = $id('gems'), boostChip = $id('boostChip'), boostT = $id('boostT');
var hypeEl = $id('hype'), hypeFill = $id('hypeFill'), hypeTxt = $id('hypeTxt'), recenterBtn = $id('recenter');
var dailyDot = $id('dailyDot'), shopDot = $id('shopDot'), rushBtn = $id('rushBtn');
var hglow = $id('hglow'), fades = $id('stage'), lastHudT = 0, lastTrayT = 0, lastGlow = -1, lastTheme = null;
var lastMoney = -1, lastParked = '', lastRate = '', lastFr = 0, lastGoalChk = 0, lastGoals = 0, lastGems = -1, lastHype = '';
function hud() {
  var tnow = perfNow();
  if ((moneyChanged || S.money !== lastMoney) && tnow - lastHudT > 200) {   // a few times a second is plenty for text
    moneyChanged = false; lastHudT = tnow;
    if (S.money > lastMoney && lastMoney >= 0 && !REDUCE) { pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump'); }
    lastMoney = S.money; var m = fmt(S.money); if (elMoney.textContent !== m) { elMoney.textContent = m; elWallet.textContent = m; }
    if (sheet.classList.contains('open') || tnow - lastTrayT > 1000) { lastTrayT = tnow; refreshTray(); }
  }
  var ho = S.hype < .05 ? 0 : Math.round(S.hype * 20) / 20;
  if (ho !== lastGlow) { lastGlow = ho; hglow.style.opacity = ho; hglow.classList.toggle('hot', ho > .5 && !REDUCE); }
  if (TH() !== lastTheme) { lastTheme = TH(); fades.style.setProperty('--bg0', lastTheme.bg[0]); fades.style.setProperty('--bg1', lastTheme.bg[1]); }
  if (S.gems !== lastGems) { lastGems = S.gems; elGems.textContent = fmt(S.gems); }
  S.earn = S.earn.filter(function (e) { return S.t - e.t < 10; });
  var sum = 0; S.earn.forEach(function (e) { sum += e.v; });
  var rt = '$' + fmtRate(sum / Math.max(4, Math.min(10, S.t))) + '/s';
  if (rt !== lastRate) { lastRate = rt; elRate.textContent = rt; }
  var txt = parkedCount() + ' / ' + totalSpots();
  if (txt !== lastParked) { lastParked = txt; elParked.textContent = txt; }
  starPill.hidden = !(S.stars > 0); if (S.stars > 0) elStars.textContent = 'x' + fmtX(frMult());
  var bo = boostOn(); boostChip.hidden = !bo; if (bo) boostT.textContent = fmtClock((S.boostEnd - Date.now()) / 1000);
  // the hustle meter
  var hs = Math.round(S.hype * 200) + '|' + Math.ceil(S.hlock) + '|' + hustleCap();
  if (hs !== lastHype) {
    lastHype = hs;
    hypeFill.style.width = (S.hype * 100).toFixed(1) + '%';
    hypeEl.classList.toggle('fever', S.hype > .98);
    hypeEl.classList.toggle('on', S.hype > .02);
    hypeTxt.textContent = S.hlock > 0 ? 'Hustle x' + hustleCap() + ' locked · ' + Math.ceil(S.hlock) + 's' : S.hype > .02 ? 'Hustle x' + hustleMul().toFixed(1) + ' income · max x' + hustleCap() : 'Tap the lot to hustle · up to x' + hustleCap() + ' income';
  }
  recenterBtn.hidden = !S.view.user || sheet.classList.contains('open') || !panelEl.hidden;
  dailyDot.hidden = !dailyReady();
  shopDot.hidden = S.gems < 30;
  if (S.tab === 'fr' && S.t - lastFr > 0.5) { lastFr = S.t; updateFr(); }
  if (S.t - lastGoalChk > 1) {
    lastGoalChk = S.t; refreshTray(); tickTut();
    var gr = goalsReady(); if (gr > lastGoals) { note('Goal ready to claim'); sfx('claim'); } lastGoals = gr;
    if (S.tab === 'goals' && sheet.classList.contains('open')) buildTray();
  }
  if (S.rush > 0) { rushBtn.hidden = false; rushBtn.disabled = true; rushBtn.className = 'rush on'; rushBtn.textContent = 'Rush hour ' + Math.ceil(S.rush) + 's'; }
  else if (S.rushReady > 0) { rushBtn.hidden = false; rushBtn.disabled = false; rushBtn.className = 'rush'; rushBtn.textContent = 'Rush hour! Tap (' + Math.ceil(S.rushReady) + 's)'; }
  else rushBtn.hidden = true;
}
rushBtn.addEventListener('click', function () { if (startRush()) { note('Rush hour · +50% fares'); save(); } });
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
  var r = $id('stage').getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, SET.saver ? 1.5 : 2);
  S.w = Math.max(1, r.width); S.h = Math.max(1, r.height);
  var sp = $id('safeProbe'); S.safeT = sp ? sp.offsetHeight : 0; S.safeB = sp ? parseFloat(getComputedStyle(sp).paddingBottom) || 0 : 0;   // notch and home bar
  cv.width = Math.max(1, Math.round(S.w * dpr)); cv.height = Math.max(1, Math.round(S.h * dpr));
  if (sheet.classList.contains('open')) S.padTarget = Math.max(0, sheet.offsetHeight - 80);
}
window.addEventListener('resize', fit);
if (window.LLAuth && window.LLAuth.slotKey) saveKey = window.LLAuth.slotKey();
var saved = readSave(saveKey);
applySave(saved);
fit(); buildTray(); stepCam(0); S.view.z = defaultZoom();
if (saved && saved.time) showAway((Date.now() - saved.time) / 1000, saved.time);
if (welcome.hidden && dailyReady() && S.tut >= 99) openPanel('daily');
showTut();
[].forEach.call(document.querySelectorAll('a[href="privacy.html"]'), function (a) { a.href = privacyUrl(); });
/* ---------- frame pacing: smooth while you play, gentle on the battery while you watch ----------
   60 fps while touching, zooming or while something is animating in; 30 fps when just watching
   (and always with Battery saver). High refresh screens (120 Hz) never draw more than that. */
var last = performance.now(), lastFrame = 0;
function busy() {
  var v = S.view, c = S.cam, t = camTarget();
  return perfNow() - lastInput < 2500 || sheet.classList.contains('open') !== (S.padTarget > 0) || Math.abs(S.pad - S.padTarget) > 2 ||
    Math.abs(S.deckAnim - S.lvl.garage) > .01 || Math.abs(c.l - t.l) + Math.abs(c.t - t.t) + Math.abs(c.r - t.r) + Math.abs(c.b - t.b) > 2 ||
    (!v.user && Math.abs(v.z - defaultZoom()) > .005);
}
function loop(now) {
  requestAnimationFrame(loop);
  var fps = SET.saver || !busy() ? 30 : 60;
  if (now - lastFrame < 1000 / fps - 4) return;
  lastFrame = now;
  var dt = Math.min(.1, (now - last) / 1000); last = now;
  if (dt > .03) { update(dt / 2); update(dt / 2); } else update(dt);   // keep simulation steps small
  draw(); hud();
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
if (/[?&]debug\b/.test(location.search)) window.__ll = { S: S, BG: BG, draw: draw, hud: hud, drawGround: drawGround, drawGarage: drawGarage, drawMarket: drawMarket, nightPass: nightPass, computeT: computeT, TOWN: function () { return TOWN; }, drawPlot: drawPlot, drawCar: drawCar, townShown: townShown, ctx: ctx, ITEMS: ITEMS, PDEF: PDEF, plan: plan, econRate: econRate, update: update, doFranchise: doFranchise, starsGain: starsGain, buyPerk: buyPerk, claimGoal: claimGoal, goalReady: goalReady, GORDER: GORDER, applySave: applySave, snapshot: snapshot, tapLot: tapLot, nightAmt: nightAmt, daylight: daylight, fee: fee, mult: mult, flow: flow, startRush: startRush, collectVip: collectVip, buildTray: buildTray, fmt: fmt, LOC: LOC };
})();
