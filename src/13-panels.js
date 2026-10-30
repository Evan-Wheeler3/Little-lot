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
      (st === 'here' ? '<em class="here">You are here</em>' : st === 'next' ? '<em>' + (starsGain() > 0 ? 'Ready to franchise' : 'Franchise to open') + '</em>' : st === 'done' ? '<em class="ok">Visited</em>' : '') + '</div></li>';
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
  return '<div class="arrive" style="background:' + THEMES[L.theme].bg[0] + '"><b>x' + fmtX(frMult()) + '</b><span>income boost</span></div>' +
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
