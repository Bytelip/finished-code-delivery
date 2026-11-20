import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Assembles the static site Vercel serves from `dist/`.
// Fails loudly when index.html points at a script/style file that isn't there: a missing
// file is answered with an HTML page and the browser shows a blank screen with
// "Expected a JavaScript-or-Wasm module script but the server responded with text/html".
const cwd = process.cwd();
const candidates = [
  ".vercel/output/static",
  ".output/public",
  "dist/client",
];
const srcRel = candidates.find((dir) => fs.existsSync(path.resolve(cwd, dir, "index.html")));
const dest = path.resolve(cwd, "dist");

if (srcRel) {
  try {
    const src = path.resolve(cwd, srcRel);
    if (src !== dest) {
      // Stage outside dist/ first: the source may itself live inside dist/.
      const staging = fs.mkdtempSync(path.join(os.tmpdir(), "agrospace-dist-"));
      fs.cpSync(src, staging, { recursive: true });

      fs.rmSync(dest, { recursive: true, force: true });
      fs.cpSync(staging, dest, { recursive: true });
      fs.rmSync(staging, { recursive: true, force: true });
      console.log(`[copy-to-dist] Copied ${srcRel} -> dist (${fs.readdirSync(dest).length} entries)`);
    }
  } catch (copyErr) {
    console.warn(`[copy-to-dist] Warning: Failed copying from ${srcRel}: ${copyErr.message}`);
    if (fs.existsSync(path.join(dest, "index.html"))) {
      console.log(`[copy-to-dist] Falling back to pre-built dist (${fs.readdirSync(dest).length} entries)`);
    } else {
      throw copyErr;
    }
  }
} else if (fs.existsSync(path.join(dest, "index.html"))) {
  console.log(`[copy-to-dist] Using committed pre-built dist (${fs.readdirSync(dest).length} entries)`);
} else {
  console.error(`[copy-to-dist] FATAL: no built index.html in ${candidates.join(" or ")} or dist/`);
  process.exit(1);
}

let html = fs.readFileSync(path.join(dest, "index.html"), "utf-8");
if (/(?:src|href)="\.\/assets\//.test(html)) {
  console.log('[copy-to-dist] Converting relative "./assets/" paths to absolute "/assets/" in index.html');
  html = html.replace(/(href|src|content)="\.\/assets\//g, '$1="/assets/');
  html = html.replace(/"\.\/assets\//g, '"/assets/');
  fs.writeFileSync(path.join(dest, "index.html"), html, "utf-8");
}

const refs = [...new Set([...html.matchAll(/["'(](?:\.?\/)?(assets\/[^"')?#\s]+)/g)].map((m) => m[1]))];
const missing = refs.filter((ref) => !fs.existsSync(path.join(dest, ref)));
if (missing.length) {
  console.error(`[copy-to-dist] FATAL: index.html references missing files:\n  ${missing.join("\n  ")}`);
  process.exit(1);
}
console.log(`[copy-to-dist] OK: all ${refs.length} referenced asset files exist in dist/assets`);
