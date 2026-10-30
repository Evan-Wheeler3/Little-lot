/* ---------- the world: a laid-out town around the lot, dressed for each spot on the map ---------- */
// ground: three grass colours; bg: the sky-to-ground fill; tree: the local tree; home: what fills a house plot; water: sea south of this y
var THEMES = {
  park: { ground: ['#93d86d', '#9bde75', '#a6e27f'], bg: ['#a9e585', '#8bd566'], tree: 'tree', tree2: 'pine', home: 'house' },
  beach: { ground: ['#bfe39a', '#c6e8a4', '#b6dc90'], bg: ['#ffeec0', '#f0d58e'], tree: 'palm', tree2: 'palm', home: 'house', water: 21.5, sand: true, wall: ['#fff3d6', '#cfe8ff', '#ffe0ec', '#d9f5e6'] },
  city: { ground: ['#b9c0cf', '#c2c8d6', '#aeb6c6'], bg: ['#c9d0dd', '#b0b8c8'], tree: 'tree', tree2: 'bush', home: 'tower' },
  snow: { ground: ['#eef5ff', '#e4eefb', '#f8fbff'], bg: ['#f4f9ff', '#dfeaf8'], tree: 'snowpine', tree2: 'snowpine', home: 'house', roof: '#f4f8ff' },
  desert: { ground: ['#f0c98a', '#ecc07c', '#f5d39c'], bg: ['#f8dca6', '#eabf7a'], tree: 'cactus', tree2: 'rock', home: 'house', wall: ['#f4c9a0', '#e8b48a', '#f7dcb8'], roof: '#d9a56e' },
  neon: { ground: ['#3d3768', '#433d72', '#383262'], bg: ['#3b3470', '#26214a'], tree: 'tree', tree2: 'bush', home: 'neon', night: .65 },
  harbor: { ground: ['#8fd3a0', '#97d9a8', '#86cb98'], bg: ['#9fdcb0', '#7fc898'], tree: 'tree', tree2: 'pine', home: 'house', water: 21.5 }
};
function TH() { return THEMES[S.theme] || THEMES.park; }

/* ---------- the town: plots along real streets, revealed nearest-first as the lot levels up ---------- */
var TOWN = [], STREET_TREES = [];
var BACK_ST = [-7.5, -6.5], SIDE_W = [-13, -12], SIDE_E = [19.5, 20.5], FRONT_Y = 19.2;
function buildTown() {
  var th = TH(), seed = 11, out = [], x, y;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  var PASTEL = th.wall || ['#ffd9b8', '#cfe8ff', '#ffe8a8', '#e0d4ff', '#ffc9d6', '#c9f2d9'], ROOF = ['#ff7a6b', '#5d7bd8', '#e0a63a', '#8b6bd0', '#d8566e'];
  var TOW = S.theme === 'neon' ? ['#5a4fa0', '#4a3f8a', '#6a4fa8', '#3f4a8a'] : ['#7fb5ff', '#ffb27a', '#b79bff', '#ff9ccf', '#6fd6c4', '#ffd04a'];
  var NEON = ['#ff4fd8', '#4ff0ff', '#ffe14f', '#7dff6a'];
  // one plot: usually a house of some shape, sometimes a pocket park or a pair of trees
  var KINDS = ['gable', 'gable', 'hip', 'flat', 'two', 'ell'], ROOFS = th.roof ? [th.roof] : ['#ff7a6b', '#5d7bd8', '#e0a63a', '#8b6bd0', '#d8566e', '#6d6a86', '#4fae8a'];
  function home(px, py, w, d, facing) {
    var r = rnd(), p = { x: px, y: py, w: w, d: d };
    if (r < .1) { p.t = 'park'; p.s = .85 + rnd() * .35; return p; }
    if (th.home !== 'house') { p.t = th.home; p.h = 36 + rnd() * 50; p.c = TOW[Math.floor(rnd() * TOW.length)]; p.n = NEON[Math.floor(rnd() * 4)]; return p; }
    // a house a bit smaller than its plot, set back by a random amount, with its own look
    var hw = w * (.62 + rnd() * .22), hd = d * (.58 + rnd() * .2);
    p.t = 'house'; p.kind = KINDS[Math.floor(rnd() * KINDS.length)];
    p.x = px + (w - hw) * (.2 + rnd() * .6); p.y = py + (d - hd) * (facing === 'S' ? .25 + rnd() * .3 : .5 + rnd() * .3); p.w = hw; p.d = hd;
    if (p.kind === 'ell') { p.d = hd * .75; p.y = Math.min(p.y, py + d - p.d - .95); }   // room for the front wing
    p.h = p.kind === 'two' ? 30 + rnd() * 6 : 17 + rnd() * 6;
    p.c = PASTEL[Math.floor(rnd() * PASTEL.length)]; p.r = ROOFS[Math.floor(rnd() * ROOFS.length)];
    p.face = facing === 'E' ? 'E' : 'S'; p.ridge = facing === 'E' || rnd() < .3 ? 'y' : 'x';
    p.chimney = rnd() < .45; p.porch = rnd() < .45; p.garage = p.kind !== 'ell' && rnd() < .3 && p.x + p.w + .8 < px + w + .4;
    p.lawn = .93 + rnd() * .08; p.drive = facing === 'S' ? (py + d) - (p.y + p.d) : 0;
    if (rnd() < .4) p.tree = { x: px + (rnd() < .5 ? .25 : w - .25), y: py + .3 + rnd() * (d - .5), s: .55 + rnd() * .25 };
    return p;
  }
  var pw;
  for (x = -16.8; x < 24; x += pw) { pw = 1.9 + rnd() * 1.1; out.push(home(x, -10 + rnd() * .3, pw - .25, 1.9, 'S')); }
  for (x = -16.8; x < 24; x += pw) { pw = 1.9 + rnd() * 1.1; out.push(home(x, -6.1, pw - .25, 1.7, 'N')); }
  for (y = -4.8; y < 7.4; y += pw) { pw = 2 + rnd() * .8; out.push(home(-15.6, y, 1.9, pw - .25, 'E')); out.push(home(-11.6, y, 1.8, pw - .25, 'W')); }
  for (y = -4.8; y < 7.4; y += pw) { pw = 2 + rnd() * .8; out.push(home(17.2, y, 1.8, pw - .25, 'W')); out.push(home(21.1, y, 1.9, pw - .25, 'E')); }
  for (x = -16; x < 25; x += 2.6) {   // across the main road, beyond the widest highway
    if (th.water) { out.push({ t: S.theme === 'harbor' ? 'box' : 'umbrella', x: x + .4, y: FRONT_Y + .3, n: 1 + Math.floor(rnd() * 3), c: ['#ff7a6b', '#5db8ff', '#ffd04a', '#ff9ccf'][Math.floor(rnd() * 4)], cs: ['#ff7a6b', '#3d8bff', '#ffd04a', '#5fd6a4'] }); continue; }
    out.push(home(x, FRONT_Y, 2.3, 1.6, 'N'));
  }
  for (y = -13.6; y > -22; y -= 3.5) for (x = -17; x < 26; x += 3.1) {   // the skyline at the back
    if (rnd() < .25) continue;
    out.push({ t: S.theme === 'neon' ? 'neon' : 'tower', x: x + rnd() * .6, y: y + rnd() * .6, w: 1.5 + rnd(), d: 1.4 + rnd() * .8, h: 70 + rnd() * 110 * (S.theme === 'city' ? 1.5 : 1), c: TOW[Math.floor(rnd() * TOW.length)], n: NEON[Math.floor(rnd() * 4)], sky: true });
  }
  // never build inside the space the lot, market, garage and car wash can grow into (the mega mall tower reaches y -2.9)
  var KEEP = [[GX0 - .6, -3.4, WRX + .9, RY]];
  out = out.filter(function (p) { var w = p.w || 1, d = p.d || 1; return !KEEP.some(function (k) { return p.x < k[2] && p.x + w > k[0] && p.y < k[3] && p.y + d > k[1]; }); });
  // nearest plots appear first
  out.forEach(function (p) { p.dist = Math.hypot(p.x - 4, (p.y - 4) * 1.3) + (p.sky ? 6 : 0); });
  out.sort(function (a, b) { return a.dist - b.dist; });
  TOWN = out;
  STREET_TREES = [];
  for (x = -15.5; x < 24; x += 4.6) { STREET_TREES.push([x, BACK_ST[0] - .25, 0]); STREET_TREES.push([x + 2.3, BACK_ST[1] + .25, 1]); }
  for (y = -4; y < 8; y += 3.4) { STREET_TREES.push([SIDE_W[0] - .3, y, 0]); STREET_TREES.push([SIDE_E[1] + .3, y + 1.7, 1]); }
  lastShown = -1;
}
// the town fills in with every upgrade you buy this run
function levelSum() { var n = 0, k; for (k in S.lvl) n += Math.min(30, S.lvl[k]); return n; }
function townShown() { return Math.min(TOWN.length, 14 + Math.floor(levelSum() * 1.1)); }
function drawPlot(p) {
  switch (p.t) {
    case 'house': if (!inBg(p)) drawHouseGround(p); drawHouse(p); if (p.tree) drawTreeKind(TH().tree, p.tree.x, p.tree.y, p.tree.s); break;
    case 'park': var th = TH(); drawTreeKind(th.tree, p.x + .45, p.y + .5, p.s); drawTreeKind(th.tree2, p.x + 1.2, p.y + 1, p.s * .85); break;
    case 'umbrella': drawUmbrella(p.x, p.y, p.c); break;
    case 'box': drawContainers(p); break;
    case 'neon': drawNeonTower(p); break;
    default: drawTower(p);
  }
}
// new houses arrive with a puff of sparkles
var lastShown = -1;
function townGrowth() {
  var n = townShown();
  if (lastShown >= 0 && n > lastShown && S.t > 1) for (var i = lastShown; i < n; i++) { var p = TOWN[i]; S.fx.push({ kind: 'pop', x: p.x + p.w / 2, y: p.y + p.d / 2, z: 20, t: 0 }); }
  lastShown = n;
}
function drawTreeKind(t, x, y, s) {
  switch (t) {
    case 'pine': drawPine(x, y, s); break;
    case 'palm': drawPalm(x, y, s); break;
    case 'snowpine': drawSnowPine(x, y, s); break;
    case 'cactus': drawCactus(x, y, s); break;
    case 'rock': drawRock(x, y, s, '#d9a56e'); break;
    case 'bush': drawBush(x, y); break;
    default: drawTree(x, y, s);
  }
}
var V = { x0: 0, x1: 0, y0: 0, y1: 0 };
function onScreen(x, y) { var p = P(x, y, 0); return p.x > V.x0 - 140 && p.x < V.x1 + 140 && p.y > V.y0 - 260 && p.y < V.y1 + 120; }

/* ---------- ground: grass, streets, the main road and the lot surface ---------- */
function quad(x0, y0, x1, y1, col) { poly([P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)], col); }
function quadA(x0, y0, x1, y1, col) { poly([P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)], col, null, 0); }
function kerb(x0, y0, x1, y1) { prism(x0, y0, 0, x1, y1, 1.8, '#e2ddd0'); }
function drawGround() {
  ZOFF = 0;
  var cs = [{ u: V.x0, v: V.y0 }, { u: V.x1, v: V.y0 }, { u: V.x0, v: V.y1 }, { u: V.x1, v: V.y1 }], mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9, x, y;
  cs.forEach(function (c) {
    var u = (c.u - OX) / HW, v = (c.v - OY) / HH, px = (u + v) / 2, py = (v - u) / 2;
    mnx = Math.min(mnx, px); mxx = Math.max(mxx, px); mny = Math.min(mny, py); mxy = Math.max(mxy, py);
  });
  var gx0 = Math.floor((mnx - 3) / 2) * 2, gx1 = Math.ceil((mxx + 3) / 2) * 2, gy0 = Math.floor((mny - 3) / 2) * 2, gy1 = Math.ceil((mxy + 3) / 2) * 2;
  var th = TH(), G = th.ground;
  for (x = gx0; x < gx1; x += 2) for (y = gy0; y < gy1; y += 2) {
    if (th.water && y >= th.water) continue;
    var h = ((x * 7 + y * 13) % 5 + 5) % 5;
    quad(x, y, x + 2, y + 2, h === 0 ? G[2] : ((x + y) / 2 & 1) ? G[0] : G[1]);
  }
  if (th.water) {   // beach and sea with drifting wave lines
    var wy = th.water;
    quad(gx0, wy - 1.6, gx1, wy + .2, '#f6e7b8');
    quad(gx0, wy + .2, gx1, gy1 + 4, '#5fc6ec');
    var off = REDUCE ? 0 : (S.t * .25) % 3;
    for (x = gx0; x < gx1; x += 3) for (y = wy + 1; y < gy1 + 4; y += 1.6) { var xx = x + off + (y * 1.7) % 3; line(P(xx, y), P(xx + .8, y), 2, 'rgba(255,255,255,.45)'); }
  }
  // town streets
  var SW = '#d9d2c0', AS = '#6c7898';
  quad(-18, BACK_ST[0] - .45, 26, BACK_ST[1] + .45, SW); quad(-18, BACK_ST[0], 26, BACK_ST[1], AS);
  [SIDE_W, SIDE_E].forEach(function (s) { quad(s[0] - .45, -22, s[1] + .45, RY, SW); quad(s[0], -22, s[1], RY, AS); });
  for (x = -17; x < 26; x += 1.5) quadA(x, -7.03, x + .7, -6.97, 'rgba(255,255,255,.5)');
  drawRoad();
  drawLotGround();
}
// the main road: lanes, kerbs, sidewalks and markings for its tier
function drawRoad() {
  var R = ROAD(), t = roadTier(), x0 = -26, x1 = 34, ye = RY + R.w, x;
  quad(x0, RY - .55, x1, RY, '#d9d2c0');                        // north sidewalk
  quad(x0, RY, x1, ye, '#5f6a86');
  if (t === 3) { quad(x0, RY, x1, RY + .12, '#6c7898'); quad(x0, ye - .2, x1, ye, '#6c7898'); }
  quad(x0, ye, x1, ye + .7, '#d9d2c0');                          // south sidewalk
  for (x = x0; x < x1; x += 2) quadA(x, ye + .33, x + .04, ye + .7, 'rgba(120,110,90,.18)');
  // edge lines
  quadA(x0, RY + .08, x1, RY + .13, 'rgba(255,255,255,.8)'); quadA(x0, ye - .13, x1, ye - .08, 'rgba(255,255,255,.8)');
  // lane dividers between lanes going the same way
  for (var i = 0; i < R.lanes.length - 1; i++) {
    var a = R.lanes[i], b = R.lanes[i + 1];
    if (a[1] !== b[1] || b[0] - a[0] > 1.05) continue;
    var my = (a[0] + b[0]) / 2;
    for (x = x0; x < x1; x += 1.6) quadA(x, my - .03, x + .8, my + .03, 'rgba(255,255,255,.7)');
  }
  if (t === 0) for (x = x0; x < x1; x += 1.6) quadA(x, 10.97, x + .9, 11.03, '#ffd04a');
  if (t === 1) { quadA(x0, 11.93, x1, 11.98, '#ffd04a'); quadA(x0, 12.02, x1, 12.07, '#ffd04a'); }
  if (R.med) {
    var m = R.med;
    if (m[2] === 'grass') { quad(x0, m[0], x1, m[1], TH().ground[0]); kerb(x0, m[0], x1, m[0] + .08); kerb(x0, m[1] - .08, x1, m[1]); }
    else { quadA(x0, m[0] - .08, x1, m[0] - .03, '#ffd04a'); quadA(x0, m[1] + .03, x1, m[1] + .08, '#ffd04a'); prism(x0, m[0] + .1, 0, x1, m[1] - .1, 7, '#d6d9e2'); }
  }
  // driveways cross the north sidewalk
  var dw = [[ENX - .5, ENX + .5], [EXX() - .5, EXX() + .5]];
  if (S.deckAnim > .02) dw.push([GIN - .5, GOUT + .5]);
  if (S.lvl.wash) { dw.push([WEX - .5, WEX + .5]); dw.push([WRX - .5, WRX + .5]); }
  dw.forEach(function (d) { quad(d[0], RY - .55, d[1], RY + .02, '#6c7898'); });
}
// the lot: asphalt, kerbs, painted bays, wheel stops, lane arrows, the walkway and the plaza
function drawLotGround() {
  var ex = EXX(), ty = topY(), n = unitCount(), k, c, s, x;
  var sp = shopSpan(), wx0 = Math.min(-1.6, S.deckAnim > .02 ? GX1 + .6 : -1.6), wx1 = Math.max(sp[1] + .6, ex + .6);
  quad(wx0, ty - 1, wx1, ty, '#ece3cc');                                          // walkway and market plaza
  for (x = Math.ceil(wx0); x < wx1; x++) quadA(x, ty - 1, x + .03, ty, 'rgba(120,110,90,.15)');
  quad(sp[0] - .5, ty - 3.4, sp[1] + .5, ty - 1, '#e6dcc4');
  if (S.deckAnim > .02) { quad(GX1 + .6, GDOOR - .4, GX1 + 1.5, ty - .5, '#ece3cc'); quad(GX1, GDOOR - .4, GX1 + 1.5, GDOOR + .4, '#ece3cc'); }
  quad(-1.3, ty, ex + .6, 9.5, '#626e8a');                                        // asphalt
  for (k = 0; k < n; k++) {
    var y0 = unitY0(k), cols = unitCols(k);
    if (cols < COLS_MAX) {   // bays not built yet: rough gravel with dashed outlines
      quad(cols, y0, ex - .5, y0 + 1, '#8c8f9c'); quad(cols, y0 + 2, ex - .5, y0 + 3, '#8c8f9c');
      ctx.setLineDash([4, 4]); ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(255,255,255,.7)';
      [y0, y0 + 2].forEach(function (yy) { for (var cc = cols; cc < Math.min(COLS_MAX, ex - .5); cc++) { var a = P(cc + .08, yy + .08), b = P(cc + .92, yy + .08), q = P(cc + .92, yy + .92), d = P(cc + .08, yy + .92); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(q.x, q.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.stroke(); } });
      ctx.setLineDash([]);
    }
    for (x = .8; x < ex - 1; x += 2.6) {   // arrows down the aisle
      var ay = y0 + 1.5;
      poly([P(x - .35, ay - .06), P(x + .05, ay - .06), P(x + .05, ay - .2), P(x + .4, ay), P(x + .05, ay + .2), P(x + .05, ay + .06), P(x - .35, ay + .06)], 'rgba(255,255,255,.55)', null, 0);
    }
  }
  S.spots.forEach(function (s) {
    if (!unlocked(s)) return;
    if (evBay(s)) quadA(s.x + .05, s.y + .05, s.x + .95, s.y + .95, 'rgba(47,174,124,.35)');
    var back = s.row === 'N' ? s.y + .03 : s.y + .97, front = s.row === 'N' ? s.y + 1 : s.y;
    line(P(s.x, s.y + .02), P(s.x, s.y + .98), 2, 'rgba(255,255,255,.9)', 'butt');
    line(P(s.x + 1, s.y + .02), P(s.x + 1, s.y + .98), 2, 'rgba(255,255,255,.9)', 'butt');
    line(P(s.x, back), P(s.x + 1, back), 2, 'rgba(255,255,255,.75)', 'butt');
    var wy = s.row === 'N' ? s.y + .16 : s.y + .76;
    prism(s.x + .25, wy, 0, s.x + .75, wy + .08, 1.6, '#d9d6cc');                // wheel stop
  });
  // entry and exit lanes: arrows, and kerbs round the lot
  for (var yy = 9; yy > aisleY(n - 1) + .5; yy -= 2.2) {
    poly([P(ENX - .06, yy + .35), P(ENX - .06, yy - .05), P(ENX - .2, yy - .05), P(ENX, yy - .4), P(ENX + .2, yy - .05), P(ENX + .06, yy - .05), P(ENX + .06, yy + .35)], 'rgba(255,255,255,.55)', null, 0);
    poly([P(ex - .06, yy - .75), P(ex - .06, yy - .35), P(ex - .2, yy - .35), P(ex, yy), P(ex + .2, yy - .35), P(ex + .06, yy - .35), P(ex + .06, yy - .75)], 'rgba(255,255,255,.55)', null, 0);
  }
  kerb(-1.42, ty, -1.3, 9.5); kerb(ex + .6, ty, ex + .72, 9.5);
  kerb(-1.3, ty - .1, ex + .72, ty);
  kerb(-.2, 9.4, ex - .5, 9.5);
  if (S.deckAnim > .02) { quad(GIN - .5, GY1, GOUT + .5, RY, '#6c7898'); line(P((GIN + GOUT) / 2, GY1 + .1), P((GIN + GOUT) / 2, RY - .6), 2, 'rgba(255,255,255,.6)', 'butt'); }
  if (S.lvl.wash) {
    var wn = washLanes(), yN = WYS[wn - 1] - .5;
    quad(WEX - .5, yN, WEX + .5, RY, '#6c7898'); quad(WRX - .5, yN, WRX + .5, RY, '#6c7898');
    for (k = 0; k < wn; k++) quad(WEX - .5, WYS[k] - .5, WRX + .5, WYS[k] + .5, '#6c7898');
    quad(WX0 - .2, yN - .3, WX1 + .2, WYS[0] + .65, '#c9d1e4');
    for (k = 0; k < wn; k++) quad(WX0 - .2, WYS[k] - .45, WX1 + .2, WYS[k] + .45, '#7b87a8');
    if (wn > 1) quad(WEX - .5, yN, WEX + .5, WYS[0] + .5, '#6c7898');
  }
}
// soft shadows of passing clouds slide across the whole scene
function drawCloudShadows() {
  if (REDUCE) return;
  S.clouds.forEach(function (c) {
    var p = P(c.x, c.y);
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, .5);
    ctx.fillStyle = 'rgba(40,30,80,.07)';
    ctx.beginPath(); [[0, 0, 120], [110, 30, 90], [-100, 40, 80]].forEach(function (a) { ctx.moveTo(a[0] * c.s + a[2] * c.s, a[1] * c.s); ctx.arc(a[0] * c.s, a[1] * c.s, a[2] * c.s, 0, Math.PI * 2); }); ctx.fill();
    ctx.restore();
  });
}
// things standing along the road: street lamps, median trees, the highway gantry
function roadObjects(out) {
  var R = ROAD(), t = roadTier(), ex = EXX(), avoid = [ENX, ex, GIN, GOUT, WEX, WRX, -1.85, -2];
  [-16.5, -12.6, -9.8, 2.3, 6.4, 14.1, 18.3, 23, 27].forEach(function (x) {
    if (avoid.some(function (a) { return Math.abs(a - x) < .9; })) return;
    out.push({ d: x + RY - .3, f: function () { drawStreetLamp(x, RY - .25); } });
  });
  var ye = RY + R.w + .45;
  for (var x = -15; x < 28; x += 4.2) (function (x) { out.push({ d: x + ye, f: function () { drawTreeKind(TH().tree, x, ye + .3, .8); } }); })(x);
  if (R.med && R.med[2] === 'grass') for (x = -14; x < 28; x += 3) (function (x) { out.push({ d: x + 12.6, f: function () { drawTreeKind(TH().tree, x, 12.6, .7); } }); })(x);
  if (t === 3) out.push({ d: -9 + 17, f: drawGantry });
}
function drawStreetLamp(x, y) {
  prism(x - .04, y - .04, 0, x + .04, y + .04, 44, '#6b6590');
  prism(x - .04, y - .04, 44, x + .04, y + .34, 47, '#6b6590');
  prism(x - .08, y + .22, 40, x + .08, y + .4, 45, '#fff3c4');
}
function drawGantry() {
  var x = -9, ya = RY - .2, yb = RY + ROAD().w + .2;
  prism(x - .08, ya - .08, 0, x + .08, ya + .08, 58, '#9aa3b8'); prism(x - .08, yb - .08, 0, x + .08, yb + .08, 58, '#9aa3b8');
  prism(x - .06, ya, 54, x + .06, yb, 58, '#9aa3b8');
  prism(x + .06, RY + .3, 34, x + .12, RY + 2.6, 54, '#2f8a57');
  faceText('LITTLE LOT', P(x + .121, RY + 1.45, 48), 'R', 7, '#ffffff'); faceText('EXIT 1/2 MI', P(x + .121, RY + 1.45, 40), 'R', 6, '#ffffff');
}
