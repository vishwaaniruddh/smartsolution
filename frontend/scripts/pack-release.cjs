const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..'); // frontend folder
const projectRoot = path.resolve(rootDir, '..'); // lead workspace folder
const releaseDir = path.join(projectRoot, 'release'); // release folder in project root

console.log('🚀 Starting full production build and packaging...');

// 1. Build Frontend
console.log('📦 Building frontend (Vite)...');
try {
  execSync('npm run build', { stdio: 'inherit', cwd: rootDir });
} catch (e) {
  console.error('Frontend build failed!');
  process.exit(1);
}

// Helper: Copy directory recursively
function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
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

// 3. Copy frontend built files (dist) to release root
console.log('📂 Copying frontend build...');
copyDirSync(path.join(rootDir, 'dist'), releaseDir);

// 3.1 Post-process release/index.html to inject dynamic asset loading script
console.log('🔧 Injecting dynamic runtime asset loader into index.html...');
const releaseIndexHtmlPath = path.join(releaseDir, 'index.html');
let htmlContent = fs.readFileSync(releaseIndexHtmlPath, 'utf8');

const jsMatch = htmlContent.match(/src="(?:\.\/)?assets\/(index-[a-zA-Z0-9_-]+\.js)"/);
const cssMatch = htmlContent.match(/href="(?:\.\/)?assets\/(index-[a-zA-Z0-9_-]+\.css)"/);

if (!jsMatch || !cssMatch) {
  console.error('❌ Could not parse JS/CSS production build assets from index.html!');
  process.exit(1);
}

const jsFile = jsMatch[1];
const cssFile = cssMatch[1];
console.log(`Detected JS bundle: ${jsFile}`);
console.log(`Detected CSS bundle: ${cssFile}`);

const dynamicScript = `
  <script>
    (function() {
      let path = window.location.pathname;
      if (path.endsWith('/') && path !== '/') {
        path = path.slice(0, -1);
      }
      const routerPaths = [
        '/superadmin/tenants',
        '/sa/dashboard',
        '/sa/leads',
        '/sa/pipeline',
        '/sa/tasks',
        '/sa/sales',
        '/login',
        '/leads',
        '/pipeline',
        '/sales',
        '/contacts',
        '/users',
        '/reports',
        '/settings',
        '/help'
      ];
      let basePath = '';
      let matched = false;
      for (const rPath of routerPaths) {
        if (path.endsWith(rPath)) {
          basePath = path.slice(0, -rPath.length);
          matched = true;
          break;
        }
      }
      if (!matched && path !== '/') {
        basePath = path;
      }
      window.__basePath__ = basePath;
      
      // Inject CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.crossOrigin = 'anonymous';
      link.href = basePath + '/assets/${cssFile}';
      document.head.appendChild(link);

      // Inject JS
      const script = document.createElement('script');
      script.type = 'module';
      script.crossOrigin = 'anonymous';
      script.src = basePath + '/assets/${jsFile}';
      document.head.appendChild(script);

      // Inject Favicon
      const fav = document.createElement('link');
      fav.rel = 'icon';
      fav.type = 'image/svg+xml';
      fav.href = basePath + '/favicon.svg';
      document.head.appendChild(fav);
    })();
  </script>
`;

// Remove original script, link and favicon tags
htmlContent = htmlContent.replace(/<link rel="icon" type="image\/svg\+xml" href=".*?" \/>/, '');
htmlContent = htmlContent.replace(/<script type="module" crossorigin src=".*?"><\/script>/, '');
htmlContent = htmlContent.replace(/<link rel="stylesheet" crossorigin href=".*?">/, '');

// Insert the dynamic loader script into head
htmlContent = htmlContent.replace('</head>', `${dynamicScript}\n  </head>`);

fs.writeFileSync(releaseIndexHtmlPath, htmlContent, 'utf8');
console.log('✅ Dynamic asset loader injected successfully!');


// 4. Copy backend API folder to release/api
console.log('📂 Copying API backend files...');
const apiSrc = path.join(projectRoot, 'api');
const apiDest = path.join(releaseDir, 'api');
copyDirSync(apiSrc, apiDest);

console.log('✅ Success! Everything is packed into the "release" folder.');
console.log(`Location: ${releaseDir}`);
console.log('You can now upload all contents inside the "release" directory directly to the server\'s public_html folder.');
