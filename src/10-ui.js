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
    now: function () { return 'Cars drive at ' + Math.round(speedMul() * 100) + '%'; }, next: function () { return 'Cars drive 12% faster'; },
    apply: function () { S.lvl.gate++; } },
  walk: { tab: 'speed', name: 'Sidewalks', tint: '#d6f0c8', icon: 'walk', multi: true,
    lvl: function () { return S.lvl.walk; }, max: function () { return MAXL.walk; },
    cost: function (l) { return 25 * Math.pow(1.65, l); },
    now: function () { return 'Shoppers walk at ' + Math.round(walkSpeed() / 0.8 * 100) + '%'; }, next: function () { return 'Walking 20% faster (garage shoppers walk further)'; },
    apply: function () { S.lvl.walk++; } },
  express: { tab: 'speed', name: 'Express shopping', tint: '#ffe6b8', icon: 'express', multi: true,
    lvl: function () { return S.lvl.express; }, max: function () { return MAXL.express; },
    cost: function (l) { return 45 * Math.pow(1.6, l); },
    now: function () { return 'Visits last about ' + (5 / (1 + 0.06 * S.lvl.express)).toFixed(1) + 's'; }, next: function () { return 'Shorter shop visits'; },
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
  build: 'More room for cars. Drivers use the main lot first, then the garage when it fills up.',
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
    '<p>Sell this lot and open a new one from scratch. Each star adds 35% to all income forever, you get a token per star to spend on perks, and every franchise lets you build 2 more garage floors.</p>' +
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
