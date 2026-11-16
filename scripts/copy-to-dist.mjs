import fs from "node:fs";
import path from "node:path";

const src = path.resolve(process.cwd(), ".output/public");
const dest = path.resolve(process.cwd(), "dist");

// Clean dist
if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true, force: true });
}

// Copy .output/public → dist
fs.cpSync(src, dest, { recursive: true });
console.log(`Copied .output/public → dist (${fs.readdirSync(dest).length} entries)`);
