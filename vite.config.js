import { defineConfig } from 'vite';
import { cpSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

// The home page (index.html → world/main.js) is bundled by Vite.
// Every other room (tools.html, y2k.html …) is still plain static HTML/CSS/JS:
// copy those files into dist untouched so the deployed site is complete.
const KEEP_OUT = new Set(['node_modules', 'dist', 'world', '.git', '.github', '.claude', 'index.html', 'lab.html',
  'package.json', 'package-lock.json', 'vite.config.js', 'LiangJung-Portfolio.html', 'README.md', '.gitignore']);

function copyStaticRooms() {
  return {
    name: 'copy-static-rooms',
    apply: 'build',
    closeBundle() {
      const root = resolve('.'), out = resolve('dist');
      for (const name of readdirSync(root)) {
        if (KEEP_OUT.has(name)) continue;
        const src = join(root, name);
        cpSync(src, join(out, name), { recursive: statSync(src).isDirectory(), force: false, errorOnExist: false });
      }
    }
  };
}

export default defineConfig({
  base: './',
  publicDir: false,
  server: { port: 5173, strictPort: true },
  build: {
    outDir: 'dist',
    assetsDir: 'w',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1200,
    rollupOptions: { input: { index: resolve('index.html') } }
  },
  plugins: [copyStaticRooms()]
});
