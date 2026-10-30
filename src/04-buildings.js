/* ---------- the market: a corner store that grows into a mega mall with the Market level ---------- */
var SHOP_TIERS = [0, 5, 15, 30, 60];
var SHOP_NAMES = ['Corner store', 'Market', 'Market hall', 'Shopping mall', 'Mega mall'];
var AWN = ['#ff7a6b', '#5db8ff', '#ffd04a', '#5fd6a4', '#b79bff', '#ff9ccf'];
function shopTier(l) { l = l === undefined ? S.lvl.shop : l; var t = 0; for (var i = 1; i < SHOP_TIERS.length; i++) if (l >= SHOP_TIERS[i]) t = i; return t; }
function shopSpan() { return [[1, 4.2], [.2, 7.6], [-.4, 9.8], [-.8, 10.4], [-.8, 10.4]][shopTier()]; }
function shopDoors() {
  var sp = shopSpan(), t = shopTier(), n = [2, 5, 7, 6, 6][t], out = [], i, w = sp[1] - sp[0];
  for (i = 0; i < n; i++) out.push(sp[0] + w * (i + .5) / n);
  if (t >= 3) out.push((sp[0] + sp[1]) / 2);   // the mall's glass atrium
  return out;
}
function nearestDoor(x) { var d = shopDoors(), best = d[0]; d.forEach(function (q) { if (Math.abs(q - x) < Math.abs(best - x)) best = q; }); return best; }
function drawMarket() {
  var t = shopTier(), sp = shopSpan(), x0 = sp[0], x1 = sp[1], y1 = shopFrontY(), y0 = y1 - 2.1, i;
  var h = [26, 30, 50, 56, 56][t], body = ['#fff0d4', '#fff0d4', '#ffe6c9', '#f4ecff', '#eef4ff'][t], trim = ['#ff8a7a', '#ff8a7a', '#e06a5a', '#8b6bd0', '#3d8bff'][t];
  var lit = {}, doors = shopDoors();
  S.walkers.forEach(function (w) { if (w.state === 'inside') lit[w.door] = true; });
  poly([P(x0 - .4, y1), P(x1 + .4, y1), P(x1 + .4, y1 + .7), P(x0 - .4, y1 + .7)], 'rgba(40,30,80,.12)', null, 0);
  if (t === 4) {   // the mega mall's tower behind
    var tx0 = (x0 + x1) / 2 - .4, tx1 = tx0 + 2.6;
    prism(tx0, y0 - .2, 0, tx1, y0 + 1.6, 168, '#7fb5ff');
    for (i = 1; i < 12; i++) { line(P(tx0, y0 + 1.6, i * 14), P(tx1, y0 + 1.6, i * 14), 1.6, 'rgba(255,255,255,.55)'); line(P(tx1, y0 - .2, i * 14), P(tx1, y0 + 1.6, i * 14), 1.6, 'rgba(255,255,255,.35)'); }
    prism(tx0 + .2, y0, 168, tx1 - .2, y0 + 1.4, 196, '#ffffff');
    faceText('LITTLE LOT', P((tx0 + tx1) / 2, y0 + 1.4, 182), 'L', 10, '#3d8bff');
  }
  prism(x0, y0, 0, x1, y1, h, body);
  prism(x0 - .06, y0 - .06, h, x1 + .06, y1 + .06, h + 5, trim);
  if (t >= 2) {   // upper floor windows
    winL(x0 + .2, x1 - .2, y1, 30, h - 4, Math.round((x1 - x0) * 1.4), 1, t >= 3 ? '#bfe6ff' : '#9ad4ff');
    winR(x1, y0 + .2, y1 - .2, 30, h - 4, 3, 1, '#bfe6ff');
    prism(x0, y1 - .02, 26, x1, y1 + .1, 29, trim);
  }
  doors.forEach(function (dx, j) {
    var on = lit[dx], w = t >= 3 && j === doors.length - 1 ? .9 : .32;
    poly([P(dx - w, y1 + .01, 0), P(dx + w, y1 + .01, 0), P(dx + w, y1 + .01, 18), P(dx - w, y1 + .01, 18)], on ? '#ffe28a' : '#6e5a9e', null, 0);
    if (t < 3) {   // striped awning over each door
      var c = AWN[j % 6];
      poly([P(dx - .44, y1, 26), P(dx, y1, 26), P(dx, y1 + .22, 19), P(dx - .44, y1 + .22, 19)], shade(c, FT));
      poly([P(dx, y1, 26), P(dx + .44, y1, 26), P(dx + .44, y1 + .22, 19), P(dx, y1 + .22, 19)], shade('#ffffff', .96));
      poly([P(dx - .44, y1 + .22, 19), P(dx + .44, y1 + .22, 19), P(dx + .44, y1 + .22, 17), P(dx - .44, y1 + .22, 17)], shade(c, .8));
    } else if (w < .5) {
      poly([P(dx - .5, y1 + .02, 21), P(dx + .5, y1 + .02, 21), P(dx + .5, y1 + .02, 25), P(dx - .5, y1 + .02, 25)], AWN[j % 6], null, 0);
    }
  });
  if (t >= 3) {   // glass atrium in the middle
    var ax = doors[doors.length - 1];
    prism(ax - 1.2, y0 + .4, 0, ax + 1.2, y1 + .3, h + 22, '#8fd0f5');
    for (i = 1; i < 6; i++) line(P(ax - 1.2, y1 + .3, i * (h + 22) / 6), P(ax + 1.2, y1 + .3, i * (h + 22) / 6), 1.5, 'rgba(255,255,255,.6)');
    for (i = 1; i < 4; i++) line(P(ax - 1.2 + i * .6, y1 + .3, 0), P(ax - 1.2 + i * .6, y1 + .3, h + 22), 1.5, 'rgba(255,255,255,.6)');
    poly([P(ax - .7, y1 + .31, 0), P(ax + .7, y1 + .31, 0), P(ax + .7, y1 + .31, 20), P(ax - .7, y1 + .31, 20)], lit[ax] ? '#ffe28a' : '#5a7fa8', null, 0);
    faceText(t === 4 ? 'MEGA MALL' : 'MALL', P(ax, y1 + .31, h + 12), 'L', t === 4 ? 11 : 14, '#ffffff');
    // anchor stores at each end
    prism(x0, y0 + .3, 0, x0 + 1.6, y1 + .15, h + 8, '#ff9ccf'); prism(x1 - 1.6, y0 + .3, 0, x1, y1 + .15, h + 8, '#5fd6a4');
    faceText('SHOES', P(x0 + .8, y1 + .15, h), 'L', 8, '#fff'); faceText('FOOD', P(x1 - .8, y1 + .15, h), 'L', 8, '#fff');
  } else {
    var sw = t === 0 ? 1.3 : 2.4, sx = (x0 + x1) / 2;
    prism(sx - sw / 2, y1 - .3, h + 5, sx + sw / 2, y1 - .15, h + 18, '#ffffff');
    faceText(['STORE', 'MARKET', 'MARKET HALL'][t], P(sx, y1 - .15, h + 11.5), 'L', t === 2 ? 8 : 9, trim);
  }
  if (t >= 2) for (i = 0; i < 3; i++) prism(x0 + 1 + i * 2.5, y0 + .5, h + 5, x0 + 1.7 + i * 2.5, y0 + 1.1, h + 11, '#c9cfdd');   // rooftop units
  if (t >= 1) { drawPlanter(x0 - .2, y1 + .45); drawPlanter(x1 + .2, y1 + .45); }
}
function drawPlanter(x, y) {
  prism(x - .18, y - .14, 0, x + .18, y + .14, 6, '#c98a5a');
  cone(x - .07, y, .12, 6, 14, '#4dc476', 5); cone(x + .08, y + .02, .11, 6, 12, '#5fd6a4', 5);
  var f = P(x, y, 14); circle(f.x - 3, f.y, 2, '#ff9ccf'); circle(f.x + 3, f.y + 1, 2, '#ffd04a');
}

/* ---------- lot fixtures ---------- */
function freeCount() { return activeSpots().filter(function (s) { return !s.car; }).length + garFree(); }
function drawBooth() {
  var x = -1.85, y = 8.75, open = freeCount() > 0;
  prism(x - .32, y - .3, 0, x + .32, y + .3, 26, '#fff0c4');
  poly([P(x - .22, y + .3, 22), P(x + .22, y + .3, 22), P(x + .22, y + .3, 11), P(x - .22, y + .3, 11)], '#9ad4ff', null, 0);
  frustum(x, y, .9, .85, .6, .55, 26, 34, 0, 0, shade('#ff7a6b', FT), shade('#ff7a6b', FL), shade('#ff7a6b', FR));
  cone(x, y, .09, 34, 44, open ? '#58e08a' : '#ff5d5d', 6);
}
// barrier arms across the entry and exit lanes, lifted while a car passes
function drawArm(x, open) {
  var y = 9.35, L = .95;
  prism(x - .08, y - .08, 0, x + .08, y + .08, 13, '#ff7a6b');
  var th = open * 1.25, a = P(x, y, 12), b = P(x + L * Math.cos(th), y, 12 + 38 * Math.sin(th));
  line(a, b, 7, '#b8453b', 'butt');
  for (var i = 0; i < 6; i++) {
    var u0 = i / 6, u1 = (i + 1) / 6;
    line({ x: a.x + (b.x - a.x) * u0, y: a.y + (b.y - a.y) * u0 }, { x: a.x + (b.x - a.x) * u1, y: a.y + (b.y - a.y) * u1 }, 4.6, i % 2 ? '#ff6b5e' : '#ffffff', 'butt');
  }
  circle(a.x, a.y, 3.2, '#ffd04a');
}
function drawEntranceSign() {
  var n = freeCount(), x = -2.0, y = 9.75;
  prism(x - .04, y - .04, 0, x + .04, y + .04, 54, '#6b6590');
  prism(x - .55, y - .07, 54, x + .55, y + .07, 82, n ? '#2fae7c' : '#e0584f');
  faceText(n ? 'FREE' : 'LOT', P(x, y + .07, 76), 'L', 8, '#e9fff4');
  faceText(n ? String(n) : 'FULL', P(x, y + .07, 63), 'L', n > 99 ? 12 : 16, '#ffffff');
}
function drawLotLamp(x, y) {
  prism(x - .04, y - .04, 0, x + .04, y + .04, 40, '#7a7aa0');
  prism(x - .2, y - .06, 40, x + .2, y + .06, 43, '#7a7aa0');
  prism(x - .2, y - .07, 37.5, x - .1, y + .07, 40, '#fff3c4'); prism(x + .1, y - .07, 37.5, x + .2, y + .07, 40, '#fff3c4');
}
// lamp posts on the lines where bay rows meet, every third column
function lotLamps() {
  var out = [], k, c, n = unitCount();
  for (k = 0; k <= n; k++) {
    var y = k === 0 ? 9.5 : unitY0(k - 1);
    var cols = Math.max(unitCols(k), k ? unitCols(k - 1) : 0);
    for (c = 0; c <= cols; c += 3) out.push([c, y]);
  }
  return out;
}
// EV charger at the back of a bay: the post is baked into the background, the cable to a plugged-in car pulses live
function chargerAt(s) { return { x: s.x + .18, y: s.row === 'N' ? s.y + .1 : s.y + .9 }; }
function drawChargerPost(s) {
  var c = chargerAt(s), bx = c.x, by = c.y;
  prism(bx - .06, by - .05, 0, bx + .06, by + .05, 15, '#e9edf7');
  prism(bx - .07, by - .06, 15, bx + .07, by + .06, 18, '#2fae7c');
  var p = P(bx + .07, by, 10);
  ctx.fillStyle = '#ffd04a'; ctx.beginPath(); ctx.moveTo(p.x + 1, p.y - 4); ctx.lineTo(p.x - 2, p.y + .5); ctx.lineTo(p.x, p.y + .5); ctx.lineTo(p.x - 1, p.y + 4); ctx.lineTo(p.x + 2, p.y - .5); ctx.lineTo(p.x, p.y - .5); ctx.closePath(); ctx.fill();
}
function drawCable(s) {
  var c = chargerAt(s), p = P(c.x + .07, c.y, 10), cp = P(s.car.x, s.car.y, 8), on = REDUCE ? 1 : .6 + .4 * Math.sin(S.t * 5 + s.x);
  ctx.globalAlpha = on; line(p, cp, 1.6, '#2fae7c'); ctx.globalAlpha = 1;
}
function drawBillboard() {
  var x = -11.2, y = 9.2;
  prism(x - .6, y - .04, 0, x - .52, y + .04, 30, '#6b6590'); prism(x + .52, y - .04, 0, x + .6, y + .04, 30, '#6b6590');
  prism(x - .85, y - .07, 30, x + .85, y + .07, 64, '#fffaf0');
  poly([P(x - .78, y + .071, 60), P(x + .78, y + .071, 60), P(x + .78, y + .071, 34), P(x - .78, y + .071, 34)], S.lvl.ads >= 25 ? '#ff7a6b' : '#3d8bff', null, 0);
  faceText('PARK', P(x - .25, y + .072, 50), 'L', 9, '#ffffff'); faceText('& SHOP', P(x + .2, y + .072, 41), 'L', 7, '#ffd04a');
}
function drawValet() {
  var x = -1.85, y = 7.6;
  prism(x - .14, y - .12, 0, x + .14, y + .12, 13, '#3d8bff'); prism(x - .17, y - .15, 13, x + .17, y + .15, 15, '#ffd04a');
  for (var i = 0; i < Math.min(3, 1 + Math.floor(S.lvl.valet / 10)); i++) drawWalker({ x: x - .1 + i * .22, y: y + .32, moving: false, id: 7 + i, color: '#3b2f5c', hair: '#2a2438' });
}

/* ---------- the car wash: one tunnel, more lanes at levels 10, 25 and 50 ---------- */
var WEX = 11.9;   // the lane cars take off the road into the wash
function washLaneCars(i) { return S.cars.filter(function (c) { return c.washLane === i; }).length; }
function drawWash() {
  var n = washLanes(), yS = WYS[0] + .55, yN = WYS[n - 1] - .55, h = 26, i, k;
  for (i = 0; i <= n; i++) { var wy = i < n ? WYS[i] + .55 : yN + .1; prism(WX0, wy - .1, 0, WX1, wy, h, '#7fd6f0'); }
  // a window on the front shows the first lane's brushes
  poly([P(WX0 + .15, yS, h - 6), P(WX1 - .15, yS, h - 6), P(WX1 - .15, yS, 6), P(WX0 + .15, yS, 6)], '#2c2749', null, 0);
  var busy = S.cars.some(function (c) { return c.inWash && c.washLane === 0; });
  for (i = 0; i < 4; i++) {
    var bx = WX0 + .4 + i * .52, ph = (busy && !REDUCE ? S.t * 9 : 0) + i;
    poly([P(bx - .12, yS + .01, 7), P(bx + .12, yS + .01, 7), P(bx + .12, yS + .01, h - 7), P(bx - .12, yS + .01, h - 7)], i % 2 ? '#5db8ff' : '#ff7a6b', null, 0);
    for (k = 0; k < 3; k++) { var zz = 9 + ((ph * 3 + k * 5) % 14); line(P(bx - .12, yS + .012, zz), P(bx + .12, yS + .012, zz), 1.5, 'rgba(255,255,255,.6)', 'butt'); }
  }
  prism(WX0 - .06, yN - .06, h, WX1 + .06, yS + .06, h + 5, '#5db8ff');
  for (i = 0; i < n; i++) {   // exits on the east side, and a sign over each lane
    poly([P(WX1 + .001, WYS[i] - .42, 0), P(WX1 + .001, WYS[i] + .42, 0), P(WX1 + .001, WYS[i] + .42, 20), P(WX1 + .001, WYS[i] - .42, 20)], '#2c2749', null, 0);
    if (S.cars.some(function (c) { return c.inWash && c.washLane === i; }) && !REDUCE && Math.random() < .3)
      S.fx.push({ kind: 'bub', x: WX0 + Math.random() * (WX1 - WX0), y: WYS[i] + .3, z: h + 2 + Math.random() * 8, t: 0, vx: (Math.random() - .5) * 8 });
  }
  var mx = (WX0 + WX1) / 2;
  prism(mx - .8, (yN + yS) / 2 - .15, h + 5, mx + .8, (yN + yS) / 2 + .15, h + 21, '#ffffff');
  faceText(n > 1 ? n + '-LANE WASH' : 'WASH', P(mx, (yN + yS) / 2 + .15, h + 13), 'L', n > 1 ? 6.5 : 9, '#3d8bff');
}

/* ---------- the garage: open decks you can see into, a glass stair tower, a roof with a big P ---------- */
var BAND = ['#ff7a6b', '#ffd04a', '#5fd6a4', '#5db8ff', '#b79bff', '#ff9ccf'];
// where each of a deck's nine slots shows: five along the south face, four along the east face
function slotPos(j) { return j < 5 ? { x: GX0 + .75 + 1.15 * j, y: GY1 - .48, a: Math.PI / 2 } : { x: GX1 - .48, y: GY0 + .9 + 1.25 * (j - 5), a: 0 }; }
function drawGarageCars(d, z0) {
  for (var j = 0; j < PERDECK; j++) {
    var s = GS[d * PERDECK + j];
    if (!s || !s.car) continue;
    var p = slotPos(j);
    if (d === 0 && j >= 1 && j <= 3) continue;   // the ground-floor doorway
    ZOFF = z0 + 4; carLite(p.x, p.y, p.a, s.type, s.color); ZOFF = 0;
  }
}
// cars seen through the garage openings: just body and cabin, they are small and half hidden
function carLite(x, y, a, type, col) {
  var m = CARS[type] || CARS.sedan, hl = m.L / 2, hw = m.W / 2, ca = Math.cos(a), sa = Math.sin(a);
  obox(x, y, a, hl, hw, 2, 2 + m.b, .97, .93, 0, col, function () { return col; });
  obox(x + ca * m.co * m.L, y + sa * m.co * m.L, a, hl * m.cl, hw * m.cw, 2 + m.b, 2 + m.b + m.ch, .74, .8, 0, shade(col, 1.08), function () { return '#9ad4ff'; });
}
function drawDeck(d, z0, top) {
  var x, y;
  prism(GX0 - .1, GY0 - .1, z0, GX1 + .1, GY1 + .1, z0 + 4, '#d3d8e4');                   // floor slab
  prism(GX0, GY0, z0 + 4, GX1, GY1, z0 + top, '#45416a');                                // the shady inside
  for (x = GX0 + .3; x < GX1; x += 1.2) poly([P(x, GY1 - .01, z0 + top - 3), P(x + .5, GY1 - .01, z0 + top - 3), P(x + .5, GY1 - .01, z0 + top - 1.5), P(x, GY1 - .01, z0 + top - 1.5)], '#fff3c4', null, 0);
  drawGarageCars(d, z0);
  if (d === 0) {   // entrance and exit with barrier signs, and the shoppers' door on the east side
    prism(GX0, GY1 - .12, z0 + 4, GIN - .55, GY1, z0 + 12, BAND[0]);
    prism(GOUT + .55, GY1 - .12, z0 + 4, GX1, GY1, z0 + 12, BAND[0]);
    poly([P(GIN - .5, GY1 + .02, 23), P(GOUT + .5, GY1 + .02, 23), P(GOUT + .5, GY1 + .02, 29), P(GIN - .5, GY1 + .02, 29)], '#3d8bff', null, 0);
    faceText('IN', P(GIN, GY1 + .03, 26), 'L', 6.5, '#e9fff4'); faceText('OUT', P(GOUT, GY1 + .03, 26), 'L', 6.5, '#ffe2dc');
    poly([P(GX1 + .01, GDOOR - .3, 0), P(GX1 + .01, GDOOR + .3, 0), P(GX1 + .01, GDOOR + .3, 19), P(GX1 + .01, GDOOR - .3, 19)], '#ffe28a', null, 0);
  } else {
    prism(GX0, GY1 - .12, z0 + 4, GX1, GY1, z0 + 12, BAND[d % 6]);
    prism(GX1 - .12, GY0, z0 + 4, GX1, GY1, z0 + 12, BAND[d % 6]);
  }
  for (x = 0; x <= 3; x++) prism(GX0 + x * 2 - .1, GY1 - .1, z0 + 4, GX0 + x * 2 + .1, GY1 + .1, z0 + top, '#e9edf7');
  for (y = 0; y < 3; y++) prism(GX1 - .1, GY0 + y * 2 - .1, z0 + 4, GX1 + .1, GY0 + y * 2 + .1, z0 + top, '#e9edf7');
}
function drawGarage() {
  var n = Math.ceil(S.deckAnim - .001), d, z0 = 0, r, topZ = 0;
  for (d = 0; d < n; d++) {
    r = Math.min(1, S.deckAnim - d); z0 = d * DH; topZ = z0 + DH * r;
    if (r > .98) drawDeck(d, z0, DH);
    else { prism(GX0 - .1, GY0 - .1, z0, GX1 + .1, GY1 + .1, z0 + 4, '#d3d8e4'); prism(GX0, GY0, z0 + 4, GX1, GY1, topZ, '#c9cfdd'); }
  }
  if (S.deckAnim - (n - 1) < .98) return;
  // roof deck
  prism(GX0 - .1, GY0 - .1, topZ, GX1 + .1, GY1 + .1, topZ + 4, '#c9cfdd');
  ZOFF = topZ + 4;
  for (var c = 1; c < 5; c++) line(P(GX0 + c * 1.2, GY0 + .6), P(GX0 + c * 1.2, GY0 + 2.4), 1.6, 'rgba(255,255,255,.8)');
  for (c = 1; c < 5; c++) line(P(GX0 + c * 1.2, GY1 - 2.4), P(GX0 + c * 1.2, GY1 - .6), 1.6, 'rgba(255,255,255,.8)');
  prism(GX0, GY1 - .14, 0, GX1, GY1, 6, BAND[n % 6]); prism(GX1 - .14, GY0, 0, GX1, GY1, 6, BAND[n % 6]);
  drawLotLamp(GX0 + 3, GY0 + 3);
  drawPoleSign(GX1 - 1.6, GY1 - 1.4, 40, .5, 'P');
  ZOFF = 0;
  // glass stair tower standing against the north-east corner
  var sx0 = GX1, sx1 = GX1 + .9, sy0 = GY0 + .3, sy1 = GY0 + 1.5, sh = topZ + 22;
  prism(sx0, sy0, 0, sx1, sy1, sh, '#7fc3ef');
  for (d = 1; d <= n; d++) { line(P(sx0, sy1, d * DH), P(sx1, sy1, d * DH), 1.5, 'rgba(255,255,255,.7)'); line(P(sx1, sy0, d * DH), P(sx1, sy1, d * DH), 1.5, 'rgba(255,255,255,.5)'); }
  prism(sx0 - .05, sy0 - .05, sh, sx1 + .05, sy1 + .05, sh + 4, '#e9edf7');
}
function drawPoleSign(x, y, h, w, txt) {
  poly([P(x - .45, y - .3), P(x + .45, y - .3), P(x + .45, y + .3), P(x - .45, y + .3)], 'rgba(40,30,80,.16)', null, 0);
  prism(x - .05, y - .05, 0, x + .05, y + .05, h, '#6b6590');
  prism(x - w, y - .07, h, x + w, y + .07, h + w * 62, '#3d8bff');
  faceText(txt, P(x, y + .07, h + w * 31), 'L', w * 52, '#ffffff');
}
