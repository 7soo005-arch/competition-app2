/* ==========================================================================
   COMPETITION MANAGEMENT SYSTEM - CROSS-PLATFORM BUILD SCRIPT (build.js)
   ========================================================================== */

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');

// Clean and recreate public output directory for Vercel
if (fs.existsSync(publicDir)) {
  fs.rmSync(publicDir, { recursive: true, force: true });
}
fs.mkdirSync(publicDir, { recursive: true });

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

const itemsToCopy = [
  'index.html',
  'css',
  'js',
  'lib',
  'src',
  'manifest.json',
  'sw.js',
  'supabase_schema.sql',
  'vercel.json'
];

itemsToCopy.forEach((item) => {
  const srcPath = path.join(__dirname, item);
  const destPath = path.join(publicDir, item);
  copyRecursiveSync(srcPath, destPath);
  console.log(`Copied ${item} -> public/${item}`);
});

console.log('Build completed successfully! All assets packaged into public/ for Vercel deployment.');
