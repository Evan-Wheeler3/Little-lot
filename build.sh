#!/bin/sh
# Joins the source files in src/ into game.js (the file the page loads), and a test copy that exposes internals.
cd "$(dirname "$0")" || exit 1
cat src/*.js > game.js && node --check game.js || exit 1
[ -n "$TEST" ] || { echo "built game.js"; exit 0; }
head -n -1 game.js > ../game_test.js
cat >> ../game_test.js <<'EOT'
window.__ll = { S: S, GS: function () { return GS; }, ITEMS: ITEMS, plan: plan, econRate: econRate, fee: fee, demand: demand, starsGain: starsGain, doFranchise: doFranchise, addMoney: addMoney, update: update, draw: draw, spawn: spawn, claimGoal: claimGoal, goalReady: goalReady, goalsReady: goalsReady, GDEF: GDEF, GORDER: GORDER, buyPerk: buyPerk, startRush: startRush, applySave: applySave, snapshot: snapshot, garCap: garCap, garFree: garFree, totalSpots: totalSpots, mult: mult, tipRate: tipRate, dwellAvg: dwellAvg, maxDecks: maxDecks, PDEF: PDEF, goalCash: goalCash, fmt: fmt, headStart: headStart };
})();
EOT
echo "built game.js and ../game_test.js"
