/* Little Lot accounts: email sign-in and one cloud save per account, using a Supabase project.
   Works without any setup too: when config.js is empty the game runs as guest-only. */
(function () {
'use strict';
var CFG = window.LL_CONFIG || {};
var ENABLED = !!(CFG.SUPABASE_URL && CFG.SUPABASE_KEY);
var BASE = String(CFG.SUPABASE_URL || '').replace(/\/+$/, '');
var AUTH_KEY = 'littlelot.auth', GUEST_KEY = 'littlelot.v1';
var game = null, session = null, status = 'guest', lastSaved = 0, isDirty = false, timer = 0, pushing = false, refreshing = null, pending = null;
var ui = null;   // set by the interface half of this file

/* ---------- storage ---------- */
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
function readSlot(k) { try { var j = JSON.parse(lsGet(k) || 'null'); return j && j.v === 1 ? j : null; } catch (e) { return null; } }
function loadSession() {
  try { var j = JSON.parse(lsGet(AUTH_KEY) || 'null'); return j && j.access_token && j.user && j.user.id ? j : null; } catch (e) { return null; }
}
function storeSession(s) { session = s; if (s) lsSet(AUTH_KEY, JSON.stringify(s)); else lsDel(AUTH_KEY); }
function slotKey() { var s = session || loadSession(); return s ? GUEST_KEY + '.' + s.user.id : GUEST_KEY; }
if (ENABLED) session = loadSession();

/* ---------- Supabase requests ---------- */
function api(path, o) {
  o = o || {};
  var h = { apikey: CFG.SUPABASE_KEY, 'Content-Type': 'application/json' }, k;
  if (o.token) h.Authorization = 'Bearer ' + o.token;
  if (o.headers) for (k in o.headers) h[k] = o.headers[k];
  return fetch(BASE + path, { method: o.method || 'GET', headers: h, body: o.body ? JSON.stringify(o.body) : undefined, keepalive: !!o.keepalive })
    .then(function (r) {
      return r.text().then(function (t) {
        var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { /* not json */ }
        return { ok: r.ok, status: r.status, json: j };
      });
    });
}
function toSession(j) {
  return {
    access_token: j.access_token, refresh_token: j.refresh_token,
    expires_at: j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600),
    user: { id: j.user.id, email: j.user.email }
  };
}
function expireSession() { storeSession(null); setStatus('expired'); }
function fresh() {
  if (!session) return Promise.reject(new Error('signed-out'));
  if (session.expires_at - 60 > Date.now() / 1000) return Promise.resolve(session.access_token);
  if (!refreshing) {
    refreshing = api('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: session.refresh_token } })
      .then(function (r) {
        refreshing = null;
        if (r.ok && r.json && r.json.access_token) { storeSession(toSession(r.json)); return session.access_token; }
        if (r.status === 400 || r.status === 401 || r.status === 403) expireSession();
        throw new Error('refresh');
      }, function (e) { refreshing = null; throw e; });
  }
  return refreshing;
}
function friendly(r) {
  var j = r && r.json || {}, code = String(j.error_code || j.code || ''), msg = String(j.msg || j.message || j.error_description || j.error || '');
  if (r && r.status === 429 || /rate_limit/.test(code)) return 'Too many tries. Wait a few minutes and try again.';
  if (code === 'invalid_credentials' || /invalid login/i.test(msg)) return 'That email and password do not match.';
  if (code === 'user_already_exists' || /already (been )?registered/i.test(msg)) return 'That email already has an account. Try logging in.';
  if (code === 'email_not_confirmed' || /not confirmed/i.test(msg)) return 'Confirm your email first. We sent a link when you signed up.';
  if (code === 'weak_password' || /password/i.test(msg) && /(short|least|weak)/i.test(msg)) return 'Choose a longer password (8 characters or more).';
  if (code === 'same_password' || /different from the old/i.test(msg)) return 'Pick a password you have not used on this account.';
  if (code === 'signup_disabled') return 'New sign-ups are switched off right now.';
  return 'Something went wrong. Please try again.';
}
var NETWORK = 'Cannot reach the server. Check your connection and try again.';

/* ---------- cloud save ---------- */
function setStatus(s) { status = s; if (ui) ui.refresh(); }
function pull() {
  return fresh().then(function (t) { return api('/rest/v1/saves?select=data,lifetime&user_id=eq.' + session.user.id + '&limit=1', { token: t }); })
    .then(function (r) { if (!r.ok) throw new Error('pull ' + r.status); return r.json && r.json[0] ? r.json[0].data : null; });
}
// Only writes when this device has at least as much lifetime progress as the cloud copy.
// Resolves 'saved', or 'behind' when the cloud already holds more progress (played elsewhere).
function push(keepalive) {
  var snap = game.snapshot(), life = +snap.lifetime || 0, uid, tok;
  return fresh().then(function (t) {
    tok = t; uid = session.user.id;
    return api('/rest/v1/saves?user_id=eq.' + uid + '&lifetime=lte.' + life, {
      method: 'PATCH', token: tok, keepalive: keepalive,
      headers: { Prefer: 'return=representation' }, body: { data: snap, lifetime: life, updated_at: new Date().toISOString() }
    });
  }).then(function (r) {
    if (!r.ok) throw new Error('push ' + r.status);
    if (r.json && r.json.length) return 'saved';
    return api('/rest/v1/saves?on_conflict=user_id', {
      method: 'POST', token: tok, keepalive: keepalive,
      headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: { user_id: uid, data: snap, lifetime: life, updated_at: new Date().toISOString() }
    }).then(function (r2) {
      if (!r2.ok) throw new Error('push ' + r2.status);
      return r2.json && r2.json.length ? 'saved' : 'behind';
    });
  });
}
function adoptCloud(cloud) {
  game.load(slotKey(), cloud); game.away(cloud);
  isDirty = false; lastSaved = Date.now(); setStatus('ok');
  if (ui) ui.toast('Loaded your latest lot from the cloud');
}
function flush(keepalive) {
  timer = 0;
  if (!session || !isDirty || pushing || !game) return Promise.resolve();
  pushing = true; setStatus('syncing');
  return push(keepalive).then(function (res) {
    pushing = false;
    if (res === 'behind') return pull().then(function (cloud) { if (cloud) adoptCloud(cloud); else setStatus('ok'); });
    isDirty = false; lastSaved = Date.now(); setStatus('ok');
  }).catch(function () { pushing = false; if (session) setStatus('offline'); });
}
function dirty() {
  if (!session || !ENABLED) return;
  isDirty = true;
  if (!timer) timer = setTimeout(function () { flush(false); }, 15000);
}
// Run when the game starts with a stored session, and again after each sign-in.
// Keeps whichever copy has more lifetime progress, so playing on two devices never loses work.
function enter(s, fromKey) {
  var prev = fromKey || (game ? game.key() : GUEST_KEY);
  if (game) game.save();
  storeSession(s);
  var key = slotKey(), local = readSlot(key);
  setStatus('syncing');
  return pull().then(function (cloud) {
    var cl = cloud ? +cloud.lifetime || 0 : -1, lo = local ? +local.lifetime || 0 : -1, guest = prev === GUEST_KEY ? readSlot(GUEST_KEY) : null;
    if (cloud && cl > lo) { game.load(key, cloud); game.away(cloud); if (ui) ui.toast('Loaded your saved lot'); isDirty = false; lastSaved = Date.now(); setStatus('ok'); return; }
    if (local) { game.load(key); }
    else if (guest && +guest.lifetime > 0) { game.load(key, guest); if (ui) ui.toast('Your progress is now saved to this account'); }
    else { game.load(key); }
    isDirty = true; return flush(false);
  }).catch(function () { if (game && game.key() !== key) game.load(key); setStatus('offline'); });
}
function signOut() {
  var tok = session && session.access_token;
  var done = function () {
    storeSession(null); isDirty = false; setStatus('guest');
    game.load(GUEST_KEY);
    if (ui) ui.toast('Logged out');
  };
  var p = isDirty && session ? flush(false) : Promise.resolve();
  return p.then(function () { if (tok) api('/auth/v1/logout', { method: 'POST', token: tok }).catch(function () { /* best effort */ }); done(); }, done);
}
document.addEventListener('visibilitychange', function () {
  if (document.hidden && session && isDirty && game && session.expires_at - 30 > Date.now() / 1000) { pushing = false; flush(true); }
});

/* ---------- interface ---------- */
var $ = function (id) { return document.getElementById(id); };
var modal = $('acctModal'), views = ['vGuest', 'vUser', 'vReset', 'vCheck', 'vOff'], mode = 'login', view = 'vGuest', busy = false, toastT = 0, lastFocus = null;

function show(v) {
  view = v;
  views.forEach(function (id) { $(id).hidden = id !== v; });
  $('guestBtn').hidden = v === 'vReset';
  $('acctTitle').textContent = v === 'vUser' ? 'Your account' : v === 'vReset' ? 'New password' : v === 'vCheck' ? 'Check your email' : v === 'vOff' ? 'Account' : (mode === 'signup' ? 'Create account' : 'Log in');
}
function setMode(m) {
  mode = m;
  [].forEach.call($('authTabs').querySelectorAll('[data-mode]'), function (b) { b.setAttribute('aria-selected', b.getAttribute('data-mode') === m ? 'true' : 'false'); });
  $('authGo').textContent = m === 'signup' ? 'Create account' : 'Log in';
  $('authPass').setAttribute('autocomplete', m === 'signup' ? 'new-password' : 'current-password');
  $('forgotBtn').hidden = m === 'signup';
  $('guestNote').textContent = m === 'signup' ? 'Your progress on this device comes with you.' : 'Log in to load your saved lot.';
  setErr('authErr', '');
  if (view === 'vGuest') $('acctTitle').textContent = m === 'signup' ? 'Create account' : 'Log in';
}
function setErr(id, t) { var e = $(id); e.textContent = t || ''; e.hidden = !t; }
function setBusy(b, btnId, label) { busy = b; var el = $(btnId); el.disabled = b; if (b) { el.dataset.l = el.textContent; el.textContent = 'Working...'; } else if (el.dataset.l) { el.textContent = label || el.dataset.l; } }
function openModal() {
  if (!ENABLED) show('vOff');
  else if (view === 'vReset') show('vReset');
  else if (session) show('vUser');
  else show(view === 'vCheck' || view === 'vReset' ? view : 'vGuest');
  refreshUi();
  lastFocus = document.activeElement; modal.hidden = false;
  var f = modal.querySelector('input:not([hidden])') || $('acctClose'); setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 30);
}
function closeModal() { modal.hidden = true; if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
function toast(t) {
  var el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(toastT);
  toastT = setTimeout(function () { el.hidden = true; }, 3800);
}
function ago(ms) {
  var s = Math.round((Date.now() - ms) / 1000);
  return s < 10 ? 'just now' : s < 90 ? s + ' seconds ago' : s < 5400 ? Math.round(s / 60) + ' minutes ago' : Math.round(s / 3600) + ' hours ago';
}
function refreshUi() {
  var btn = $('acctBtn'), letter = $('acctLetter'), dot = $('acctDot');
  var signed = !!session;
  btn.classList.toggle('in', signed);
  letter.hidden = !signed; if (signed) letter.textContent = (session.user.email || '?').charAt(0);
  dot.hidden = !(status === 'offline' || status === 'expired');
  btn.title = signed ? 'Signed in as ' + session.user.email : 'Account';
  btn.setAttribute('aria-label', btn.title);
  if (signed) {
    $('userEmail').textContent = session.user.email;
    $('syncNote').textContent = status === 'syncing' ? 'Saving...' : status === 'offline' ? 'Cannot reach the cloud right now. Your lot is safe on this device and will save when you are back online.' : lastSaved ? 'Saved to your account ' + ago(lastSaved) + '.' : 'Signed in.';
  } else if (status === 'expired' && view === 'vGuest') {
    $('guestNote').textContent = 'Your session ended. Log in again to keep saving to your account.';
  }
}
ui = { refresh: function () { refreshUi(); }, toast: toast };

function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function finish(s) {
  closeModal(); setBusy(false, 'authGo');
  return enter(s).then(function () { refreshUi(); });
}
function onAuth(ev) {
  ev.preventDefault(); if (busy) return;
  var email = $('authEmail').value.trim().toLowerCase(), pass = $('authPass').value;
  if (!validEmail(email)) return setErr('authErr', 'Enter a valid email address.');
  if (pass.length < 8) return setErr('authErr', 'Use 8 characters or more for the password.');
  setErr('authErr', ''); setBusy(true, 'authGo');
  var signup = mode === 'signup';
  var req = signup
    ? api('/auth/v1/signup?redirect_to=' + encodeURIComponent(location.origin + location.pathname), { method: 'POST', body: { email: email, password: pass } })
    : api('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: email, password: pass } });
  req.then(function (r) {
    var j = r.json || {};
    if (!r.ok) { setBusy(false, 'authGo'); setErr('authErr', friendly(r)); return; }
    if (j.access_token && j.user) { $('authPass').value = ''; return finish(toSession(j)); }
    // sign-up with email confirmation switched on: no session until the link is opened
    setBusy(false, 'authGo');
    var u = j.user || j;
    if (u.identities && u.identities.length === 0) return setErr('authErr', 'That email already has an account. Try logging in.');
    $('authPass').value = '';
    $('checkNote').textContent = 'We sent a link to ' + email + '. Open it to confirm your email, then log in here. Your progress on this device is kept.';
    show('vCheck');
  }).catch(function () { setBusy(false, 'authGo'); setErr('authErr', NETWORK); });
}
function onForgot() {
  var email = $('authEmail').value.trim().toLowerCase();
  if (!validEmail(email)) return setErr('authErr', 'Type your email above first, then tap Forgot password.');
  setErr('authErr', '');
  api('/auth/v1/recover?redirect_to=' + encodeURIComponent(location.origin + location.pathname), { method: 'POST', body: { email: email } })
    .then(function (r) {
      if (!r.ok) return setErr('authErr', friendly(r));
      $('checkNote').textContent = 'If ' + email + ' has an account, we sent a link to reset the password.';
      show('vCheck');
    }).catch(function () { setErr('authErr', NETWORK); });
}
function onReset(ev) {
  ev.preventDefault(); if (busy) return;
  var p = $('newPass').value;
  if (p.length < 8) return setErr('resetErr', 'Use 8 characters or more for the password.');
  setErr('resetErr', ''); setBusy(true, 'resetGo');
  fresh().then(function (t) { return api('/auth/v1/user', { method: 'PUT', token: t, body: { password: p } }); }).then(function (r) {
    setBusy(false, 'resetGo');
    if (!r.ok) return setErr('resetErr', friendly(r));
    $('newPass').value = ''; toast('Password updated'); closeModal(); return enter(session).then(refreshUi);
  }).catch(function () { setBusy(false, 'resetGo'); setErr('resetErr', NETWORK); });
}

/* links from emails arrive as #access_token=...&type=signup|recovery */
function readHash() {
  var h = location.hash.replace(/^#/, '');
  if (!ENABLED || (h.indexOf('access_token=') < 0 && h.indexOf('error=') < 0)) return;
  var p = {}; h.split('&').forEach(function (kv) { var a = kv.split('='); p[a[0]] = decodeURIComponent((a[1] || '').replace(/\+/g, ' ')); });
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ }
  if (p.error) { pending = { error: 'That link has expired. Request a new one and try again.' }; return; }
  pending = { p: p };
}
function runPending() {
  if (!pending) return false;
  var x = pending; pending = null;
  if (x.error) { toast(x.error); return true; }
  var p = x.p;
  api('/auth/v1/user', { token: p.access_token }).then(function (r) {
    if (!r.ok || !r.json || !r.json.id) { toast('That link has expired. Request a new one and try again.'); return; }
    var s = { access_token: p.access_token, refresh_token: p.refresh_token, expires_at: +p.expires_at || Math.floor(Date.now() / 1000) + (+p.expires_in || 3600), user: { id: r.json.id, email: r.json.email } };
    if (p.type === 'recovery') { storeSession(s); show('vReset'); openModal(); setStatus('syncing'); return; }
    toast('Email confirmed'); return enter(s).then(refreshUi);
  }).catch(function () { toast(NETWORK); });
  return true;
}

/* ---------- wiring ---------- */
$('acctBtn').addEventListener('click', openModal);
$('acctClose').addEventListener('click', closeModal);
$('guestBtn').addEventListener('click', closeModal);
modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) closeModal(); });
$('authTabs').addEventListener('click', function (e) { var b = e.target.closest('[data-mode]'); if (b) setMode(b.getAttribute('data-mode')); });
$('authForm').addEventListener('submit', onAuth);
$('forgotBtn').addEventListener('click', onForgot);
$('resetForm').addEventListener('submit', onReset);
$('checkBack').addEventListener('click', function () { setMode('login'); show('vGuest'); });
$('saveNow').addEventListener('click', function () { isDirty = true; flush(false).then(refreshUi); });
$('logoutBtn').addEventListener('click', function () { closeModal(); signOut().then(refreshUi); });
setMode('login'); show(ENABLED ? 'vGuest' : 'vOff');
readHash();

window.LLAuth = {
  slotKey: slotKey,
  dirty: dirty,
  attach: function (g) {
    game = g;
    refreshUi();
    if (!ENABLED) return;
    if (runPending()) return;
    if (session) enter(session).then(refreshUi);
  }
};
})();
