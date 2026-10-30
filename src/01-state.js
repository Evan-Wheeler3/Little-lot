(function () {
'use strict';
var cv = document.getElementById('scene'), ctx = cv.getContext('2d');
var HW = 40, HH = 20, OX = 300, OY = 110;
var INK = '#3b2f5c';
var REDUCE = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
var ZOFF = 0;
var VERSION = '1.1.1';

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
  cars: [], traffic: [], walkers: [], spots: [], particles: [], fx: [], earn: [], pad: 0, padTarget: 0, w: 400, h: 600,
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
