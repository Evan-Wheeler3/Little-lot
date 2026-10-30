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
