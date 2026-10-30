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
var STAR_BASE = 20000;
// stars come from what this lot earned, so a stronger start means more stars from the next run
function starsGain() { return Math.floor(Math.pow(S.totalRun / STAR_BASE, 0.25)); }
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

