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

