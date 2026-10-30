/* ---------- in-app purchases: real money only works in the App Store build (cordova-plugin-purchase) ---------- */
// Product ids must match the ones created in App Store Connect. Set IAP_PREFIX in config.js to your bundle id.
var IAP_PREFIX = (window.LL_CONFIG && window.LL_CONFIG.IAP_PREFIX) || 'com.littlelot.game';
var IAP = {
  gems_s: { id: IAP_PREFIX + '.gems.small', gems: 100, name: 'Handful of gems', price: '$0.99' },
  gems_m: { id: IAP_PREFIX + '.gems.medium', gems: 550, name: 'Bag of gems', price: '$4.99', tag: '+10%' },
  gems_l: { id: IAP_PREFIX + '.gems.large', gems: 1200, name: 'Chest of gems', price: '$9.99', tag: '+20%' },
  gems_xl: { id: IAP_PREFIX + '.gems.huge', gems: 3200, name: 'Vault of gems', price: '$19.99', tag: 'Best value' },
  pass: { id: IAP_PREFIX + '.goldenpass', once: true, name: 'Golden Pass', price: '$6.99' },
  starter: { id: IAP_PREFIX + '.starter', once: true, name: 'Starter pack', price: '$1.99' }
};
var IORDER = ['gems_s', 'gems_m', 'gems_l', 'gems_xl'];
var store = null, iapReady = false;
function iapKey(id) { for (var k in IAP) if (IAP[k].id === id) return k; return null; }
function grant(k, txId) {
  var it = IAP[k]; if (!it) return;
  if (txId && S.iap.indexOf(txId) >= 0) return;   // already given for this transaction
  if (txId) S.iap.push(txId);
  if (k === 'pass') { if (S.pass) return; S.pass = true; note('Golden Pass active: x2 income forever!'); }
  else if (k === 'starter') { if (S.starter) return; S.starter = true; S.gems += 300; addBoost(4 * 3600); note('Starter pack: 300 gems and 4 hours of x2 income!'); }
  else { S.gems += it.gems; note('+' + it.gems + ' gems. Thank you!'); }
  sfx('claim'); buzz('heavy'); moneyChanged = true; save(); if (typeof refreshPanels === 'function') refreshPanels();
}
function iapInit() {
  var C = window.CdvPurchase;
  if (!C || !C.store) return;
  store = C.store;
  var A = C.Platform.APPLE_APPSTORE;
  store.register(Object.keys(IAP).map(function (k) { return { id: IAP[k].id, type: IAP[k].once ? C.ProductType.NON_CONSUMABLE : C.ProductType.CONSUMABLE, platform: A }; }));
  store.when().approved(function (t) {
    (t.products || []).forEach(function (p) { var k = iapKey(p.id); if (k) grant(k, IAP[k].once ? null : t.transactionId); });
    t.finish();
  }).productUpdated(function (p) {
    var k = iapKey(p.id); if (!k) return;
    if (p.pricing && p.pricing.price) IAP[k].price = p.pricing.price;
    if (IAP[k].once && p.owned) grant(k, null);
    if (typeof refreshPanels === 'function') refreshPanels();
  });
  store.initialize([A]).then(function () { iapReady = true; if (typeof refreshPanels === 'function') refreshPanels(); });
}
function iapBuy(k) {
  if (!store || !iapReady) { note('Purchases are available in the Little Lot app on the App Store.'); return; }
  var p = store.get(IAP[k].id), o = p && p.getOffer();
  if (!o) { note('That item is not available right now. Try again later.'); return; }
  store.order(o).then(function (err) { if (err && err.code !== window.CdvPurchase.ErrorCode.PAYMENT_CANCELLED) note('The purchase did not go through. You were not charged.'); });
}
function iapRestore() {
  if (!store) { note('Restore works in the Little Lot app on the App Store.'); return; }
  note('Restoring purchases...');
  store.restorePurchases().then(function () { note(S.pass || S.starter ? 'Purchases restored.' : 'No purchases to restore on this Apple ID.'); });
}
document.addEventListener('deviceready', iapInit, false);
