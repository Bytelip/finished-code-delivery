import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Assembles the static site Vercel serves from `dist/`.
// Fails loudly when index.html points at a script/style file that isn't there: a missing
// file is answered with an HTML page and the browser shows a blank screen with
// "Expected a JavaScript-or-Wasm module script but the server responded with text/html".
const cwd = process.cwd();
const candidates = [".output/public", "dist/client"];
const srcRel = candidates.find((dir) => fs.existsSync(path.resolve(cwd, dir, "index.html")));
const dest = path.resolve(cwd, "dist");

if (srcRel) {
  const src = path.resolve(cwd, srcRel);
  // Stage outside dist/ first: the source may itself live inside dist/.
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), "agrospace-dist-"));
  fs.cpSync(src, staging, { recursive: true });

  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(staging, dest, { recursive: true });
  fs.rmSync(staging, { recursive: true, force: true });
  console.log(`[copy-to-dist] Copied ${srcRel} -> dist (${fs.readdirSync(dest).length} entries)`);
} else if (fs.existsSync(path.join(dest, "index.html"))) {
  console.log(`[copy-to-dist] Using committed pre-built dist (${fs.readdirSync(dest).length} entries)`);
} else {
  console.error(`[copy-to-dist] FATAL: no built index.html in ${candidates.join(" or ")} or dist/`);
  process.exit(1);
}

const html = fs.readFileSync(path.join(dest, "index.html"), "utf-8");
const refs = [...new Set([...html.matchAll(/["'(](?:\.?\/)?(assets\/[^"')?#\s]+)/g)].map((m) => m[1]))];
const missing = refs.filter((ref) => !fs.existsSync(path.join(dest, ref)));
if (missing.length) {
  console.error(`[copy-to-dist] FATAL: index.html references missing files:\n  ${missing.join("\n  ")}`);
  process.exit(1);
}
if (/(?:src|href)="\.\/assets\//.test(html)) {
  console.error('[copy-to-dist] FATAL: index.html uses relative "./assets/" paths; nested URLs would break.');
  process.exit(1);
}
console.log(`[copy-to-dist] OK: all ${refs.length} referenced asset files exist in dist/assets`);
