// Balance simulator: plays the real game logic at high speed with a simple bot and prints the pace.
// Usage: node scripts/sim.js [hours=3] [taps per second=2]     (needs Playwright: npm i -D playwright)
// The bot buys the upgrade with the best income gain per dollar, claims goals, greets some golden cars,
// takes rush hours, taps at the given rate and franchises once the star payout is worth it.
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png' };
const server = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0);
const PORT = server.address().port;
const { chromium } = require('playwright');
const HOURS = +process.argv[2] || 3, TAPS = +(process.argv[3] || 2);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:' + PORT + '/?debug');
  await p.waitForTimeout(500);
  await p.evaluate((TAPS) => {
    const L = window.__ll, S = L.S;
    localStorage.clear(); L.applySave(null); S.tut = 99;
    window.simlog = []; window.simT = 0; window.firsts = {}; window.runStart = 0; window.runs = [];
    window.simStep = function (secs) {
      const dt = 0.05;
      for (let i = 0; i < secs / dt; i++) {
        L.update(dt); simT += dt;
        // taps
        if (TAPS && Math.random() < TAPS * dt) L.tapLot(300, 300);
        if (i % 20 === 0) bot();
      }
    };
    function econAfter(k) {
      const it = L.ITEMS[k], save = JSON.stringify(S.lvl);
      const before = L.econRate(); it.apply(); const after = L.econRate();
      const lv = JSON.parse(save); for (const q in lv) S.lvl[q] = lv[q];
      return after - before;
    }
    function bot() {
      S.cars.forEach(c => { if (c.vip && c.state !== 'ghide' && Math.random() < .2) L.collectVip(c); });
      if (S.rushReady > 0) L.startRush();
      L.GORDER.forEach(k => { if (L.goalReady(k)) L.claimGoal(k); });
      for (let n = 0; n < 5; n++) {
        let best = null, bs = 0;
        for (const k in L.ITEMS) {
          const pl = L.plan(k, 1); if (!pl.ok) continue;
          const g = econAfter(k);
          let sc = g / pl.cost;
          if (['concierge', 'promoter', 'crew', 'manager'].includes(k)) sc = pl.cost < S.money * .3 ? 1e9 : 0;
          if (sc > bs) { bs = sc; best = k; }
        }
        if (!best) break;
        const pl = L.plan(best, 1); S.money -= pl.cost; L.ITEMS[best].apply();
        const key = best + L.ITEMS[best].lvl();
        if (['garage1','wash1','space1','space2','ev1','garage4','sign3','concierge1'].includes(key) && !firsts[key + '@' + S.franchises]) firsts[key + '@' + S.franchises] = Math.round((simT - runStart) / 60 * 10) / 10;
      }
      const g = L.starsGain(), runMin = (simT - runStart) / 60;
      if (g >= 1 && (g >= Math.max(3, Math.ceil(S.stars * 0.6)) || runMin > 90)) {
        runs.push({ run: S.franchises, min: Math.round(runMin), gain: g, earned: L.fmt(S.totalRun), loc: L.LOC().name });
        L.doFranchise(); runStart = simT;
        ['gold','tap','blue','head','lucky','rush','night','sleep'].forEach(k => { for (let z = 0; z < 20; z++) if (!L.buyPerk(k)) break; });
        document.getElementById('panel').hidden = true;
      }
    }
  }, TAPS);
  for (let m = 0; m < HOURS * 60; m++) {
    await p.evaluate(() => simStep(60));
    if (m % 5 === 4 || m < 5) {
      const r = await p.evaluate(() => { const L = __ll, S = L.S; return { t: Math.round(simT / 60), fr: S.franchises, stars: S.stars, money: L.fmt(S.money), rate: L.fmt(L.econRate()), fee: S.lvl.fee, ads: S.lvl.ads, gar: S.lvl.garage, wash: S.lvl.wash, cars: S.served, gems: S.gems, goals: Object.values(S.goal).reduce((a,b)=>a+b,0), gain: L.starsGain() }; });
      console.log(JSON.stringify(r));
    }
  }
  console.log(await p.evaluate(() => JSON.stringify({ firsts, runs })));
  console.log('errors', errs.slice(0, 5));
  await b.close(); server.close();
})();
