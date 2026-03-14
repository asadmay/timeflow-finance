import { build } from 'esbuild';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const outdir = 'dist';

// Clean dist directory
if (fs.existsSync(outdir)) {
  fs.rmSync(outdir, { recursive: true });
}
fs.mkdirSync(outdir);
fs.mkdirSync(path.join(outdir, 'client'));

// Build client with Vite
console.log('Building client...');
try {
  execSync('npx vite build', { stdio: 'inherit' });
} catch (e) {
  console.error('Client build failed:', e);
  process.exit(1);
}

// Build server with esbuild
console.log('Building server...');
try {
  await build({
    entryPoints: ['server/index.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: path.join(outdir, 'server.js'),
    packages: 'external',
    define: {
      'process.env.NODE_ENV': '"production"'
    }
  });
} catch (e) {
  console.error('Server build failed:', e);
  process.exit(1);
}

console.log('Build complete!');
