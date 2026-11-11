const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const zipFile = path.join(rootDir, 'urbangaon-nas-ds925.zip');

console.log('🚀 Packaging UrbanGaon AI Todo Platform for Synology DS925+ Deployment...');

// Remove existing zip if present
if (fs.existsSync(zipFile)) {
  fs.unlinkSync(zipFile);
  console.log('🗑️ Removed existing zip file');
}

// Ensure .env exists (fallback to .env.nas.example if missing)
const envPath = path.join(rootDir, '.env');
const envExamplePath = path.join(rootDir, '.env.nas.example');
if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envPath);
  console.log('✓ Created .env from .env.nas.example');
}

// List of explicit folders and files to include in NAS deployment package
const itemsToInclude = [
  'app',
  'backend',
  'frontend',
  'public',
  'scripts',
  'shared',
  'Dockerfile',
  'docker-compose.yml',
  'package.json',
  'package-lock.json',
  'next.config.ts',
  'tsconfig.json',
  '.env.nas.example',
  '.env'
].filter(item => fs.existsSync(path.join(rootDir, item)));

console.log(`📦 Bundling ${itemsToInclude.length} core assets (node_modules and .next safely excluded)...`);

const cmd = `tar -a -c -f "${zipFile}" ${itemsToInclude.map(i => `"${i}"`).join(' ')}`;
execSync(cmd, { cwd: rootDir, stdio: 'inherit' });

if (fs.existsSync(zipFile)) {
  const stats = fs.statSync(zipFile);
  const sizeMb = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`\n🎉 SUCCESS! Synology DS925+ Deployment Package Created:`);
  console.log(`📁 File: ${zipFile}`);
  console.log(`📊 Size: ${sizeMb} MB`);
} else {
  console.error('❌ Failed to create zip archive');
  process.exit(1);
}

