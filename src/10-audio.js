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
