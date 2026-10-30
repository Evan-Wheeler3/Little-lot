/* ---------- the world: one big ground that fills the screen, dressed for each spot on the map ---------- */
// ground: three tile colours; bg: the sky-to-ground fill; mix: decor weights; water: sea past this y
var THEMES = {
  park: { ground: ['#93d86d', '#9bde75', '#a6e27f'], bg: ['#a9e585', '#8bd566'], mix: { house: 3, pine: 2.3, tree: 1.5, bush: 1 }, towers: .38 },
  beach: { ground: ['#f3dfa2', '#f6e4ad', '#ead08c'], bg: ['#ffeec0', '#f0d58e'], mix: { palm: 4, umbrella: 1.5, house: 2.2, rock: .6 }, towers: .2, water: 8.6 },
  city: { ground: ['#b9c0cf', '#c2c8d6', '#aeb6c6'], bg: ['#c9d0dd', '#b0b8c8'], mix: { tower: 5, tree: 2, bush: 1 }, towers: .7 },
  snow: { ground: ['#eef5ff', '#e4eefb', '#f8fbff'], bg: ['#f4f9ff', '#dfeaf8'], mix: { snowpine: 5, house: 2.2, rock: .8 }, towers: .2, roof: '#f4f8ff' },
  desert: { ground: ['#f0c98a', '#ecc07c', '#f5d39c'], bg: ['#f8dca6', '#eabf7a'], mix: { cactus: 4, rock: 2.5, house: 2 }, towers: .1, wall: ['#f4c9a0', '#e8b48a', '#f7dcb8'] },
  neon: { ground: ['#3d3768', '#433d72', '#383262'], bg: ['#3b3470', '#26214a'], mix: { neon: 5, tree: 1.5, bush: 1 }, towers: .7, night: .65 },
  harbor: { ground: ['#8fd3a0', '#97d9a8', '#86cb98'], bg: ['#9fdcb0', '#7fc898'], mix: { box: 3, house: 2, tree: 1.5, pine: 1 }, towers: .3, water: 8.6 }
};
function TH() { return THEMES[S.theme] || THEMES.park; }
var DECOR = [];
function buildDecor() {
  var th = TH(), seed = 11, out = [], x, y, k, tot = 0;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  function pick() { var r = rnd() * tot; for (k in th.mix) { r -= th.mix[k]; if (r <= 0) return k; } return 'bush'; }
  for (k in th.mix) tot += th.mix[k];
  var PASTEL = th.wall || ['#ffd9b8', '#cfe8ff', '#ffe8a8', '#e0d4ff', '#ffc9d6', '#c9f2d9'], ROOF = ['#ff7a6b', '#5d7bd8', '#e0a63a', '#8b6bd0', '#d8566e'];
  var TOW = S.theme === 'neon' ? ['#5a4fa0', '#4a3f8a', '#6a4fa8', '#3f4a8a'] : ['#7fb5ff', '#ffb27a', '#b79bff', '#ff9ccf', '#6fd6c4', '#ffd04a'];
  var NEON = ['#ff4fd8', '#4ff0ff', '#ffe14f', '#7dff6a'], UMB = ['#ff7a6b', '#5db8ff', '#ffd04a', '#ff9ccf'], BOX = ['#ff7a6b', '#3d8bff', '#ffd04a', '#5fd6a4', '#b79bff'];
  for (x = -22; x <= 30; x += 3.4) for (y = -22; y <= 30; y += 3.4) {
    var px = x + (rnd() - .5) * 1.8, py = y + (rnd() - .5) * 1.8;
    if (px > -9 && px < 14.5 && py > -2.8 && py < 7.8) continue;   // keep the lot and the car wash clear
    if (px > -13 && px < -0.5 && py > -9 && py < 1.4) continue;     // the plot for the garage
    if (py > .9 && py < 4.1) continue;                              // keep the road clear
    if (px > 6 && px < 17 && py < 1) continue;                      // nothing tall right behind the market
    if (th.water && py > th.water - .8) continue;                   // the sea
    if (rnd() < .5) continue;
    var r = rnd(), back = py < -2.6, d = { x: px, y: py }, t = (back && r < th.towers) ? 'tower' : pick();
    if (t === 'tower' || t === 'neon') { d.t = t; d.w = 1.4 + rnd() * 1.2; d.d = 1.3 + rnd() * 1; d.h = (back ? 70 : 40) + rnd() * (back ? 90 : 60); d.c = TOW[Math.floor(rnd() * TOW.length)]; d.n = NEON[Math.floor(rnd() * 4)]; }
    else if (t === 'house') { d.t = 'house'; d.w = 1.6; d.d = 1.3; d.h = 22 + rnd() * 8; d.c = PASTEL[Math.floor(rnd() * PASTEL.length)]; d.r = th.roof || ROOF[Math.floor(rnd() * 5)]; }
    else if (t === 'umbrella') { d.t = t; d.c = UMB[Math.floor(rnd() * 4)]; }
    else if (t === 'box') { d.t = t; d.n = 1 + Math.floor(rnd() * 3); d.cs = [BOX[Math.floor(rnd() * 5)], BOX[Math.floor(rnd() * 5)], BOX[Math.floor(rnd() * 5)]]; }
    else { d.t = t; d.s = .8 + rnd() * .5; }
    out.push(d);
  }
  // greenery that frames the entrance, in the local style
  var fr = { park: ['tree', 'pine'], beach: ['palm', 'palm'], city: ['tree', 'bush'], snow: ['snowpine', 'snowpine'], desert: ['cactus', 'rock'], neon: ['tree', 'bush'], harbor: ['tree', 'pine'] }[S.theme] || ['tree', 'pine'];
  [[-2.4, -1.2, 1.1], [-1.4, -1.8, 1], [-6.8, 5.6, 1.1], [15.2, 0.4, 1.1], [15.4, 6.2, 1.1]].forEach(function (p, i) { out.push({ t: fr[i % 2], x: p[0], y: p[1], s: p[2] }); });
  DECOR = out;
}
function isFront(d) { return d.y > 5.3 || (d.x > 10.3 && d.y > 1); }
function drawDecor(d) {
  switch (d.t) {
    case 'pine': drawPine(d.x, d.y, d.s); break;
    case 'tree': drawTree(d.x, d.y, d.s); break;
    case 'bush': drawBush(d.x, d.y); break;
    case 'house': drawHouse(d); break;
    case 'palm': drawPalm(d.x, d.y, d.s); break;
    case 'snowpine': drawSnowPine(d.x, d.y, d.s); break;
    case 'cactus': drawCactus(d.x, d.y, d.s); break;
    case 'rock': drawRock(d.x, d.y, d.s, S.theme === 'desert' ? '#d9a56e' : null); break;
    case 'umbrella': drawUmbrella(d.x, d.y, d.c); break;
    case 'box': drawContainers(d); break;
    case 'neon': drawNeonTower(d); break;
    default: drawTower(d);
  }
}
var V = { x0: 0, x1: 0, y0: 0, y1: 0 };
function onScreen(x, y) { var p = P(x, y, 0); return p.x > V.x0 - 140 && p.x < V.x1 + 140 && p.y > V.y0 - 220 && p.y < V.y1 + 120; }

function drawGround() {
  ZOFF = 0;
  var cs = [{ u: V.x0, v: V.y0 }, { u: V.x1, v: V.y0 }, { u: V.x0, v: V.y1 }, { u: V.x1, v: V.y1 }], i, mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
  cs.forEach(function (c) {
    var u = (c.u - OX) / HW, v = (c.v - OY) / HH, x = (u + v) / 2, y = (v - u) / 2;
    mnx = Math.min(mnx, x); mxx = Math.max(mxx, x); mny = Math.min(mny, y); mxy = Math.max(mxy, y);
  });
  var gx0 = Math.floor((mnx - 3) / 2) * 2, gx1 = Math.ceil((mxx + 3) / 2) * 2, gy0 = Math.floor((mny - 3) / 2) * 2, gy1 = Math.ceil((mxy + 3) / 2) * 2, x, y;
  var th = TH(), G = th.ground;
  for (x = gx0; x < gx1; x += 2) for (y = gy0; y < gy1; y += 2) {
    if (th.water && y >= th.water) continue;
    var h = ((x * 7 + y * 13) % 5 + 5) % 5, col = ((x + y) / 2 & 1) ? G[0] : G[1];
    if (h === 0) col = G[2];
    poly([P(x, y), P(x + 2, y), P(x + 2, y + 2), P(x, y + 2)], col);
  }
  if (th.water) {   // shoreline and sea with drifting wave lines
    var wy = th.water;
    poly([P(gx0, wy - .4), P(gx1, wy - .4), P(gx1, wy + .2), P(gx0, wy + .2)], '#f6e7b8');
    poly([P(gx0, wy + .2), P(gx1, wy + .2), P(gx1, gy1 + 4), P(gx0, gy1 + 4)], '#5fc6ec');
    var off = REDUCE ? 0 : (S.t * .25) % 3;
    for (x = gx0; x < gx1; x += 3) for (y = wy + 1; y < gy1 + 4; y += 1.6) {
      var xx = x + off + (y * 1.7) % 3;
      line(P(xx, y), P(xx + .8, y), 2, 'rgba(255,255,255,.45)');
    }
    if (S.theme === 'harbor') { prism(1, wy - .3, 0, 9, wy + .6, 6, '#b9a58a'); for (x = 1.5; x < 9; x += 1.5) prism(x, wy + .45, 0, x + .12, wy + .57, 14, '#7a6a56'); }
  }
  var R0 = gx0 - 4, R1 = gx1 + 4;
  // sidewalks, road and lane dashes
  poly([P(R0, 1.35), P(R1, 1.35), P(R1, 3.65), P(R0, 3.65)], '#d9d2c0');
  poly([P(R0, 1.7), P(R1, 1.7), P(R1, 3.3), P(R0, 3.3)], '#6c7898');
  poly([P(R0, 2), P(R1, 2), P(R1, 3), P(R0, 3)], '#64708f');
  for (x = Math.floor(R0 / 1.5) * 1.5; x < R1; x += 1.5) poly([P(x, 2.47), P(x + .7, 2.47), P(x + .7, 2.53), P(x, 2.53)], 'rgba(255,255,255,.55)', null, 0);
  // apron around the lot
  poly([P(X0 - .5, -.5), P(X1 + .5, -.5), P(X1 + .5, 5.5), P(X0 - .5, 5.5)], '#c9d1e4');
  if (S.deckAnim > .02) drawGarageGround();
  if (S.lvl.wash) drawWashGround();
  drawCloudShadows();
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
