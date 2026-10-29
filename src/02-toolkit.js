/* ---------- low-poly toolkit: flat-shaded facets, no outlines ---------- */
if (!ctx.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
  };
}
var FT = 1.14, FL = .95, FR = .74;   // light from the top-left: top brightest, +y face mid, +x face darkest
function P(x, y, z) { return { x: OX + (x - y) * HW, y: OY + (x + y) * HH - (z || 0) - ZOFF }; }
function shade(hex, f) {
  var r, g, b, m;
  if (hex.charAt(0) === 'r') { m = hex.match(/\d+/g); r = +m[0]; g = +m[1]; b = +m[2]; }
  else { var n = parseInt(hex.slice(1), 16); r = n >> 16; g = (n >> 8) & 255; b = n & 255; }
  if (f < 1) { r *= f; g *= f; b *= f; } else { r += (255 - r) * (f - 1); g += (255 - g) * (f - 1); b += (255 - b) * (f - 1); }
  return 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';
}
function poly(pts, fill, edge, ew) {
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
  for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (ew !== 0) { ctx.lineWidth = ew || 1; ctx.strokeStyle = edge || fill; ctx.lineJoin = 'round'; ctx.stroke(); }
}
// box: draws the three faces the camera can see
function prism(x0, y0, z0, x1, y1, z1, c) {
  poly([P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), P(x0, y1, z0)], shade(c, FL));
  poly([P(x1, y1, z1), P(x1, y0, z1), P(x1, y0, z0), P(x1, y1, z0)], shade(c, FR));
  poly([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], shade(c, FT));
}
// tapered box: base rectangle at z0, smaller top rectangle at z1 (optionally shifted by tx,ty)
function frustum(cx, cy, w, d, w2, d2, z0, z1, tx, ty, cT, cL, cR) {
  var a0 = cx - w / 2, a1 = cx + w / 2, b0 = cy - d / 2, b1 = cy + d / 2;
  var t0 = cx + tx - w2 / 2, t1 = cx + tx + w2 / 2, u0 = cy + ty - d2 / 2, u1 = cy + ty + d2 / 2;
  poly([P(a0, b1, z0), P(a1, b1, z0), P(t1, u1, z1), P(t0, u1, z1)], cL);
  poly([P(a1, b1, z0), P(a1, b0, z0), P(t1, u0, z1), P(t1, u1, z1)], cR);
  poly([P(t0, u0, z1), P(t1, u0, z1), P(t1, u1, z1), P(t0, u1, z1)], cT);
}
// faceted cone / pyramid standing on the ground at (cx,cy)
function cone(cx, cy, r, z0, z1, col, n) {
  n = n || 6;
  var fs = [], i, a0, a1, m, apex = P(cx, cy, z1);
  for (i = 0; i < n; i++) { a0 = i / n * 6.2832 + .4; a1 = (i + 1) / n * 6.2832 + .4; m = (a0 + a1) / 2; fs.push({ a0: a0, a1: a1, m: m }); }
  fs.sort(function (p, q) { return (Math.cos(p.m) + Math.sin(p.m)) - (Math.cos(q.m) + Math.sin(q.m)); });
  fs.forEach(function (f) {
    var k = .86 + .13 * (Math.sin(f.m) - Math.cos(f.m));
    poly([P(cx + Math.cos(f.a0) * r, cy + Math.sin(f.a0) * r, z0), P(cx + Math.cos(f.a1) * r, cy + Math.sin(f.a1) * r, z0), apex], shade(col, k));
  });
}
function circle(x, y, r, fill, lw) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke(); }
}
function line(a, b, w, col, cap) {
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  ctx.lineWidth = w; ctx.strokeStyle = col; ctx.lineCap = cap || 'round'; ctx.stroke();
}
function label(txt, x, y, size, fill) {
  ctx.font = '700 ' + size + 'px Fredoka, "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 3.2; ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.strokeText(txt, x, y);
  ctx.fillStyle = fill; ctx.fillText(txt, x, y);
}
// text lying on a face: kind 'L' = the +y face, 'R' = the +x face
function faceText(txt, p, kind, size, fill) {
  ctx.save(); ctx.translate(p.x, p.y); ctx.transform(1, kind === 'L' ? .5 : -.5, 0, 1, 0, 0);
  ctx.font = '700 ' + size + 'px Fredoka, "Trebuchet MS", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = fill; ctx.fillText(txt, 0, 0); ctx.restore();
}
function star(cx, cy, r, fill) {
  ctx.beginPath();
  for (var i = 0; i < 10; i++) {
    var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r;
    ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
}
// windows on a +y face (L) or a +x face (R)
function winL(x0, x1, y, z0, z1, cols, rows, col) {
  var cw = (x1 - x0) / cols, rh = (z1 - z0) / rows, c, r;
  for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
    var a = x0 + c * cw + cw * .2, b = x0 + (c + 1) * cw - cw * .2, za = z0 + r * rh + rh * .22, zb = z0 + (r + 1) * rh - rh * .22;
    poly([P(a, y, zb), P(b, y, zb), P(b, y, za), P(a, y, za)], col, null, 0);
  }
}
function winR(x, y0, y1, z0, z1, cols, rows, col) {
  var cw = (y1 - y0) / cols, rh = (z1 - z0) / rows, c, r;
  for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
    var a = y0 + c * cw + cw * .2, b = y0 + (c + 1) * cw - cw * .2, za = z0 + r * rh + rh * .22, zb = z0 + (r + 1) * rh - rh * .22;
    poly([P(x, a, zb), P(x, b, zb), P(x, b, za), P(x, a, za)], shade(col, .8), null, 0);
  }
}

