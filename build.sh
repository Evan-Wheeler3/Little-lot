#!/bin/sh
# Joins the source files in src/ into game.js (the file the page loads), and a test copy that exposes internals.
cd "$(dirname "$0")" || exit 1
cat src/*.js > game.js && node --check game.js || exit 1
echo "built game.js"
