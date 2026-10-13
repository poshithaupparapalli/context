/**
 * Builds the extension into extension/dist.
 *
 * Chrome content scripts and service workers can't use shared ES-module
 * chunks, so each entry is built as its own self-contained bundle:
 *   - options page + static files (manifest, icons, fonts)
 *   - content.js     (IIFE, React UI inside a shadow root)
 *   - background.js  (IIFE service worker)
 *
 * Usage: node scripts/build.mjs [--watch]
 */
import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { build } from "vite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const watch = process.argv.includes("--watch");
const require = createRequire(import.meta.url);

const FONT_FILES = [
  ["@fontsource/instrument-serif", "instrument-serif-latin-400-normal"],
  ["@fontsource/instrument-serif", "instrument-serif-latin-400-italic"],
  ["@fontsource/instrument-serif", "instrument-serif-latin-ext-400-normal"],
  ["@fontsource/instrument-serif", "instrument-serif-latin-ext-400-italic"],
  ["@fontsource-variable/dm-sans", "dm-sans-latin-wght-normal"],
  ["@fontsource-variable/dm-sans", "dm-sans-latin-wght-italic"],
  ["@fontsource-variable/dm-sans", "dm-sans-latin-ext-wght-normal"],
  ["@fontsource/ibm-plex-mono", "ibm-plex-mono-latin-400-normal"],
  ["@fontsource/ibm-plex-mono", "ibm-plex-mono-latin-500-normal"],
  ["@fontsource/ibm-plex-mono", "ibm-plex-mono-latin-ext-400-normal"],
];

function copyFonts() {
  const out = join(dist, "fonts");
  mkdirSync(out, { recursive: true });
  for (const [pkg, file] of FONT_FILES) {
    const pkgDir = dirname(require.resolve(`${pkg}/package.json`));
    const src = join(pkgDir, "files", `${file}.woff2`);
    if (!existsSync(src)) throw new Error(`Missing font file: ${src}`);
    copyFileSync(src, join(out, `${file}.woff2`));
  }
}

const common = {
  root,
  configFile: false,
  logLevel: "info",
  define: { "process.env.NODE_ENV": JSON.stringify(watch ? "development" : "production") },
  plugins: [react()],
};

const lib = (entry, fileName, name) => ({
  ...common,
  publicDir: false,
  build: {
    outDir: dist,
    emptyOutDir: false,
    minify: !watch,
    sourcemap: watch ? "inline" : false,
    watch: watch ? {} : null,
    lib: { entry: join(root, entry), formats: ["iife"], name, fileName: () => fileName },
  },
});

rmSync(dist, { recursive: true, force: true });

await build({
  ...common,
  base: "./",
  publicDir: join(root, "public"),
  build: {
    outDir: dist,
    emptyOutDir: false,
    minify: !watch,
    watch: watch ? {} : null,
    rollupOptions: { input: { options: join(root, "options.html") } },
  },
});
copyFonts();
await build(lib("src/content/index.tsx", "content.js", "ContextContent"));
await build(lib("src/background/index.ts", "background.js", "ContextBackground"));

console.log(watch ? "\nWatching for changes. Reload the extension in chrome://extensions after edits.\n" : "\nExtension built to extension/dist\n");
