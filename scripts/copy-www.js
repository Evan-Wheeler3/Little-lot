// Copies the playable game into www/, the folder Capacitor packs into the iOS app.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'www');
const FILES = ['index.html', 'style.css', 'game.js', 'auth.js', 'config.js', 'manifest.webmanifest', 'privacy.html'];
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
FILES.forEach(f => fs.copyFileSync(path.join(root, f), path.join(out, f)));
fs.cpSync(path.join(root, 'assets'), path.join(out, 'assets'), { recursive: true });
console.log('copied the game into www/');
