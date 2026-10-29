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

