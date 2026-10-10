// src/index.html + fonts + SQLite code ko "www" folder me tayyar karta hai (APK isi folder se banta hai).
// Fonts internet se nahi, app ke andar hi rehte hain, taake design offline bhi wahi rahe.
const fs = require('fs');
const path = require('path');

const root = __dirname;
const www = path.join(root, 'www');

fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(path.join(www, 'fonts'), { recursive: true });
fs.copyFileSync(path.join(root, 'index.html'), path.join(www, 'index.html'));

const fonts = [
  ['Bricolage Grotesque', '@fontsource/bricolage-grotesque', [500, 700]],
  ['Figtree', '@fontsource/figtree', [400, 600]]
];

let css = '';
for (const [family, pkg, weights] of fonts) {
  const dir = path.join(root, 'node_modules', pkg, 'files');
  if (!fs.existsSync(dir)) { console.warn('Font package not found (system font use hoga): ' + pkg); continue; }
  for (const w of weights) {
    const file = path.basename(pkg) + '-latin-' + w + '-normal.woff2';
    if (!fs.existsSync(path.join(dir, file))) { console.warn('Font file missing: ' + file); continue; }
    fs.copyFileSync(path.join(dir, file), path.join(www, 'fonts', file));
    css += '@font-face{font-family:"' + family + '";font-style:normal;font-weight:' + w +
           ';font-display:swap;src:url("' + file + '") format("woff2")}\n';
  }
}
fs.writeFileSync(path.join(www, 'fonts', 'fonts.css'), css);

// SQLite wala code (src/db.js) ko ek file me jorna (www/db.bundle.js)
try {
  require('esbuild').buildSync({
    entryPoints: [path.join(root, 'db.js')],
    bundle: true,
    format: 'iife',
    outfile: path.join(www, 'db.bundle.js'),
    minify: true,
    target: 'es2019',
    logLevel: 'warning'
  });
} catch (e) {
  console.error('SQLite bundle nahi bana: ' + e.message);
  process.exit(1);   // build ruk jaye, taake bina SQLite ke APK na bane
}
console.log('www ready');
