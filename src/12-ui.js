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
  rep: function () { return ['x' + fmtX(repMul()), CLASS_NAMES[repTier()].toLowerCase()]; },
  ev: function () { return [Math.min(S.lvl.ev, builtCols()) * 2, 'charging bays']; },
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
    if (S.tut === 3) h += '<p class="tutnote">Tap a yellow button to buy. Every upgrade makes the lot earn more.</p>';
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

