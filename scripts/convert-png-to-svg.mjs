import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

/** Read PNG width/height from IHDR chunk (bytes 16–23). */
function getPngDimensions(buffer) {
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function pngToSvg(pngPath) {
  const buffer = readFileSync(pngPath);
  const { width, height } = getPngDimensions(buffer);
  const base64 = buffer.toString("base64");
  const svgPath = pngPath.replace(/\.png$/i, ".svg");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image width="${width}" height="${height}" xlink:href="data:image/png;base64,${base64}"/>
</svg>
`;

  writeFileSync(svgPath, svg);
  return svgPath;
}

function walkPngFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...walkPngFiles(full));
      continue;
    }
    if (!entry.endsWith(".png")) continue;
    if (entry.includes("preview")) continue;
    results.push(full);
  }
  return results;
}

const skipBasenames = new Set([
  "logo-neatly.png",
  "neatly-logo-white.png",
  "logo-white.png",
  "logo-gereen.png",
]);

const dirs = [
  path.join(ROOT, "public/images/icon"),
  path.join(ROOT, "public/icons/icon"),
];

let converted = 0;
for (const dir of dirs) {
  for (const pngPath of walkPngFiles(dir)) {
    if (skipBasenames.has(path.basename(pngPath))) continue;
    pngToSvg(pngPath);
    converted += 1;
    console.log("converted:", path.relative(ROOT, pngPath));
  }
}

console.log(`Done. ${converted} PNG(s) → SVG.`);
