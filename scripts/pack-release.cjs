const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const releaseDir = path.join(rootDir, 'release');

console.log('🚀 Starting full production build and pack...');

// 1. Build Frontend
console.log('📦 Building frontend (Vite)...');
try {
  execSync('npm run build', { stdio: 'inherit', cwd: path.join(rootDir, 'frontend') });
} catch (e) {
  console.error('Frontend build failed!');
  process.exit(1);
}

// Helper: Copy directory recursively with optional excludes
function copyDirSync(src, dest, excludePaths = []) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    // Check if the current path should be excluded
    const relativePath = path.relative(rootDir, srcPath).replace(/\\/g, '/');
    if (excludePaths.some(ex => relativePath.startsWith(ex))) {
      continue;
    }
    
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath, excludePaths);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 2. Clean and setup release directory
console.log('🧹 Cleaning old release folder...');
if (fs.existsSync(releaseDir)) {
  fs.rmSync(releaseDir, { recursive: true, force: true });
}
fs.mkdirSync(releaseDir, { recursive: true });

// 3. Copy frontend (dist)
console.log('📂 Copying frontend build files...');
copyDirSync(path.join(rootDir, 'frontend', 'dist'), releaseDir);

// 4. Setup api/ folder
console.log('📂 Setting up api/ folder...');
const apiDestDir = path.join(releaseDir, 'api');
const apiSrcDir = path.join(rootDir, 'api');

// Copy API folder excluding api/uploads files (but we will recreate the uploads folder empty)
copyDirSync(apiSrcDir, apiDestDir, ['api/uploads']);

// Create empty uploads directory in release/api/uploads
const uploadsDestDir = path.join(apiDestDir, 'uploads');
if (!fs.existsSync(uploadsDestDir)) {
  fs.mkdirSync(uploadsDestDir, { recursive: true });
}

console.log('✅ Success! Everything is packed into the "release" folder.');
console.log('You can now deploy the contents of the "release" directory to production.');

