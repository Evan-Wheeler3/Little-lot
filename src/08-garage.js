/* ---------- the garage: a square building left of the market, floors stack up ---------- */
var BAND = ['#ff7a6b', '#ffd04a', '#5fd6a4', '#5db8ff', '#b79bff', '#ff9ccf'];
function drawGarageGround() {
  var a = GIN - .5, b = GOUT + .5;
  poly([P(GX0 - .6, GY0 - .6), P(GX1 + .6, GY0 - .6), P(GX1 + .6, GY1 + .5), P(GX0 - .6, GY1 + .5)], '#c9d1e4');
  poly([P(a, GY1), P(b, GY1), P(b, 2.0), P(a, 2.0)], '#6c7898');                       // driveway, across the pavement
  poly([P(GPED - .4, GY1), P(GPED + .4, GY1), P(GPED + .4, 1.0), P(GPED - .4, 1.0)], '#ece3cc');   // side-door path
  poly([P(GPED - .4, .72), P(2, .72), P(2, 1.3), P(GPED - .4, 1.3)], '#ece3cc');       // walkway to the market
  line(P((GIN + GOUT) / 2, GY1 + .3), P((GIN + GOUT) / 2, 1.7), 2, 'rgba(255,255,255,.6)', 'butt');
  poly([P(GIN, .6), P(GIN + .17, .9), P(GIN + .06, .9), P(GIN + .06, 1.3), P(GIN - .06, 1.3), P(GIN - .06, .9), P(GIN - .17, .9)], 'rgba(255,255,255,.6)', null, 0);
  poly([P(GOUT, 1.3), P(GOUT + .17, 1.0), P(GOUT + .06, 1.0), P(GOUT + .06, .6), P(GOUT - .06, .6), P(GOUT - .06, 1.0), P(GOUT - .17, 1.0)], 'rgba(255,255,255,.6)', null, 0);
}
// a parked car seen through an opening: south face looks along x, east face along y
function chipS(x, z, col) {
  var y = GY1 + .02;
  poly([P(x + .12, y, z + 6), P(x + .88, y, z + 6), P(x + .88, y, z + 13), P(x + .12, y, z + 13)], shade(col, FL), null, 0);
  poly([P(x + .26, y, z + 13), P(x + .74, y, z + 13), P(x + .64, y, z + 19), P(x + .36, y, z + 19)], shade(col, 1.04), null, 0);
  poly([P(x + .33, y, z + 14), P(x + .67, y, z + 14), P(x + .6, y, z + 18), P(x + .4, y, z + 18)], '#cfeaff', null, 0);
  [.3, .7].forEach(function (u) { var p = P(x + u, y, z + 6); circle(p.x, p.y, 3.2, '#2a2438'); });
}
function chipE(y, z, col) {
  var x = GX1 + .02;
  poly([P(x, y + .12, z + 6), P(x, y + .88, z + 6), P(x, y + .88, z + 13), P(x, y + .12, z + 13)], shade(col, FR), null, 0);
  poly([P(x, y + .26, z + 13), P(x, y + .74, z + 13), P(x, y + .64, z + 19), P(x, y + .36, z + 19)], shade(col, FR * 1.08), null, 0);
  poly([P(x, y + .33, z + 14), P(x, y + .67, z + 14), P(x, y + .6, z + 18), P(x, y + .4, z + 18)], '#a7cbe8', null, 0);
  [.3, .7].forEach(function (u) { var p = P(x, y + u, z + 6); circle(p.x, p.y, 3.2, '#2a2438'); });
}
function slotChip(d, z0, j) {
  var s = GS[d * PERDECK + j];
  if (!s || !s.car) return;
  if (j < 3) chipS(GX0 + j, z0, s.color); else chipE(GY0 + (j - 3), z0, s.color);
}
function deckDetail(d, z0) {
  var j, k;
  for (j = 0; j < PERDECK; j++) slotChip(d, z0, j);
  if (d === 0) {
    poly([P(GIN - .5, GY1 + .02, 0), P(GOUT + .5, GY1 + .02, 0), P(GOUT + .5, GY1 + .02, 21), P(GIN - .5, GY1 + .02, 21)], '#2c2749', null, 0);     // car doorway
    poly([P(GIN - .5, GY1 + .03, 28), P(GOUT + .5, GY1 + .03, 28), P(GOUT + .5, GY1 + .03, 22), P(GIN - .5, GY1 + .03, 22)], '#3d8bff', null, 0);
    faceText('IN', P(GIN, GY1 + .03, 25), 'L', 6.5, '#e9fff4'); faceText('OUT', P(GOUT, GY1 + .03, 25), 'L', 6.5, '#ffe2dc');
    poly([P(GPED - .27, GY1 + .02, 0), P(GPED + .27, GY1 + .02, 0), P(GPED + .27, GY1 + .02, 19), P(GPED - .27, GY1 + .02, 19)], '#ffe28a', null, 0);   // shoppers' door
    poly([P(GPED - .27, GY1 + .03, 24), P(GPED + .27, GY1 + .03, 24), P(GPED + .27, GY1 + .03, 20), P(GPED - .27, GY1 + .03, 20)], '#ff8a7a', null, 0);
  } else {
    poly([P(GIN - .5, GY1 + .02, z0 + 4), P(GOUT + .5, GY1 + .02, z0 + 4), P(GOUT + .5, GY1 + .02, z0 + 22), P(GIN - .5, GY1 + .02, z0 + 22)], '#7a82c0', null, 0);   // ramp and stairs
    for (k = 1; k < 5; k++) line(P(GIN - .5, GY1 + .03, z0 + 4 + k * 3.6), P(GOUT + .5, GY1 + .03, z0 + 4 + k * 3.6), 1.5, 'rgba(255,255,255,.35)', 'butt');
    poly([P(GPED - .27, GY1 + .02, z0 + 6), P(GPED + .27, GY1 + .02, z0 + 6), P(GPED + .27, GY1 + .02, z0 + 20), P(GPED - .27, GY1 + .02, z0 + 20)], '#9ad4ff', null, 0);
  }
  for (k = 0; k <= 6; k++) prism(GX0 + k - .09, GY1 - .09, z0, GX0 + k + .09, GY1 + .09, z0 + DH - 6, '#e9edf7');
  for (k = 0; k < 6; k++) prism(GX1 - .09, GY0 + k - .09, z0, GX1 + .09, GY0 + k + .09, z0 + DH - 6, '#e9edf7');
  prism(GX0, GY1 - .03, z0, GX1, GY1 + .07, z0 + 5, '#d6dcea');
  prism(GX1 - .03, GY0, z0, GX1 + .07, GY1, z0 + 5, '#d6dcea');
}
function drawGarage() {
  var n = Math.ceil(S.deckAnim - .001), d, z0, r, dh, top = 0;
  for (d = 0; d < n; d++) {
    r = Math.min(1, S.deckAnim - d); dh = DH * r; z0 = d * DH; top = z0 + dh;
    prism(GX0, GY0, z0, GX1, GY1, z0 + dh, '#5a5389');
    if (r > .98) deckDetail(d, z0);
    prism(GX0 - .14, GY0 - .14, Math.max(z0, z0 + dh - 6), GX1 + .14, GY1 + .14, z0 + dh, BAND[d % 6]);
  }
  if (S.deckAnim - (n - 1) < .98) return;
  // the roof
  ZOFF = top;
  prism(GX0, GY0, 0, GX1, GY0 + .14, 5, '#e4e9f5'); prism(GX0, GY0, 0, GX0 + .14, GY1, 5, '#e4e9f5');
  prism(GX0 + .3, GY0 + .3, 0, GX0 + 1.5, GY0 + 1.4, 20, '#e9edf7');
  winL(GX0 + .5, GX0 + 1.3, GY0 + 1.4, 7, 15, 2, 1, '#9ad4ff');
  drawPoleSign(GX1 - 1.3, GY1 - 1.3, 44, .45, 'P');
  prism(GX0, GY1 - .14, 0, GX1, GY1, 5, '#e4e9f5'); prism(GX1 - .14, GY0, 0, GX1, GY1, 5, '#e4e9f5');
  ZOFF = 0;
}

