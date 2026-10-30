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
