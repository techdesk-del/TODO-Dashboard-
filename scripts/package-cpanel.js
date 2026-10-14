const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const standaloneDir = path.join(rootDir, '.next', 'standalone');
const publicSrc = path.join(rootDir, 'public');
const publicDest = path.join(standaloneDir, 'public');
const staticSrc = path.join(rootDir, '.next', 'static');
const staticDest = path.join(standaloneDir, '.next', 'static');
const envSrc = path.join(rootDir, '.env');
const envDest = path.join(standaloneDir, '.env');
const zipFile = path.join(rootDir, 'urbangaon-cpanel-ready.zip');

console.log('Packaging standalone build for cPanel...');

// 1. Copy public directory
if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, publicDest, { recursive: true, force: true });
  console.log('✓ Copied public folder');
}


// 2. Copy .next/static directory
if (fs.existsSync(staticSrc)) {
  fs.cpSync(staticSrc, staticDest, { recursive: true, force: true });
  console.log('✓ Copied .next/static folder');
}

// 3. Copy .env
if (fs.existsSync(envSrc)) {
  fs.copyFileSync(envSrc, envDest);
  console.log('✓ Copied .env');
}

// 4. Create ZIP
if (fs.existsSync(zipFile)) {
  fs.unlinkSync(zipFile);
}

console.log('Compressing into urbangaon-cpanel-ready.zip ...');
execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${standaloneDir}\\*' -DestinationPath '${zipFile}' -Force"`, {
  stdio: 'inherit'
});

const stats = fs.statSync(zipFile);
console.log(`SUCCESS! Created ${zipFile} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
