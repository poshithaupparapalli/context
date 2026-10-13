/**
 * Renders the extension icons (cobalt square, paper-coloured open "c" with a
 * dot) from an SVG into public/icons. Run with `npm run icons -w extension`.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const out = join(resolve(dirname(fileURLToPath(import.meta.url)), ".."), "public", "icons");
mkdirSync(out, { recursive: true });

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="10" fill="#2638D9"/>
  <path d="M88 44.5A33 33 0 1 0 88 83.5" fill="none" stroke="#F6F4EE" stroke-width="13" stroke-linecap="butt"/>
  <circle cx="94" cy="34" r="8" fill="#A8C4DA"/>
</svg>`;

for (const size of [16, 32, 48, 128]) {
  const png = new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
  writeFileSync(join(out, `icon-${size}.png`), png);
}
writeFileSync(join(out, "icon.svg"), svg);
console.log("icons written to", out);
