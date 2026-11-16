import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
console.log("[copy-to-dist] cwd:", cwd);

// Diagnostic: show what was actually created by the build
const dirsToCheck = [".output", ".output/public", ".output/public/assets", "dist"];
for (const dir of dirsToCheck) {
  const full = path.resolve(cwd, dir);
  if (fs.existsSync(full)) {
    const items = fs.readdirSync(full);
    console.log(`[copy-to-dist] EXISTS  ${dir}/ → ${items.length} items: ${items.slice(0, 8).join(", ")}`);
  } else {
    console.log(`[copy-to-dist] MISSING ${dir}/`);
  }
}

const src = path.resolve(cwd, ".output/public");

if (!fs.existsSync(src)) {
  // Vercel build failed to produce .output/public — try to find assets elsewhere
  console.error("[copy-to-dist] FATAL: .output/public not found after build.");
  console.error("[copy-to-dist] Contents of .output (if it exists):");
  const outputRoot = path.resolve(cwd, ".output");
  if (fs.existsSync(outputRoot)) {
    console.error("  ", fs.readdirSync(outputRoot).join(", "));
  } else {
    console.error("  .output does not exist either. vite build likely failed completely.");
  }
  process.exit(1);
}

const dest = path.resolve(cwd, "dist");

// Clean and copy
if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true, force: true });
}

fs.cpSync(src, dest, { recursive: true });

const entries = fs.readdirSync(dest);
console.log(`[copy-to-dist] ✓ Copied .output/public → dist  (${entries.length} entries)`);
console.log(`[copy-to-dist]   ${entries.join(", ")}`);

// Verify index.html exists in dist
const indexPath = path.resolve(dest, "index.html");
if (fs.existsSync(indexPath)) {
  const size = fs.statSync(indexPath).size;
  console.log(`[copy-to-dist] ✓ dist/index.html exists (${size} bytes)`);
} else {
  console.error("[copy-to-dist] ✗ WARNING: dist/index.html missing — app will show blank page");
}

// Verify assets exist
const assetsDir = path.resolve(dest, "assets");
if (fs.existsSync(assetsDir)) {
  const assets = fs.readdirSync(assetsDir);
  console.log(`[copy-to-dist] ✓ dist/assets/ has ${assets.length} files: ${assets.slice(0, 5).join(", ")}`);
} else {
  console.error("[copy-to-dist] ✗ WARNING: dist/assets/ missing — JS/CSS will 404");
}
