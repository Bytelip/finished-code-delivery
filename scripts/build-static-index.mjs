import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function generateStaticIndex() {
  try {
    // Nitro writes either .output/{server,public} or dist/{server,client} depending on preset.
    const layouts = [
      { server: ".output/server/index.mjs", public: ".output/public" },
      { server: "dist/server/index.mjs", public: "dist/client" },
    ];
    const layout = (
      await Promise.all(
        layouts.map(async (l) => ((await exists(path.resolve(process.cwd(), l.server))) ? l : null)),
      )
    ).find(Boolean);
    if (!layout) {
      console.error("No server build found in .output/server or dist/server");
      process.exitCode = 1;
      return;
    }
    const serverEntryPath = path.resolve(process.cwd(), layout.server);
    const serverModule = await import(pathToFileURL(serverEntryPath).href);
    const handler = serverModule.default;

    if (!handler || typeof handler.fetch !== "function") {
      console.warn("No handler.fetch found in .output/server/index.mjs");
      return;
    }

    const res = await handler.fetch(new Request("http://localhost/"), {}, {
      waitUntil() {},
      passThroughOnException() {},
    });
    let html = await res.text();

    if (!html || !html.includes("<!DOCTYPE html>")) {
      console.warn("Did not receive valid HTML from server handler");
      return;
    }

    // Escape any null-byte delimiters in the streamed hydration payload to keep files valid UTF-8 text
    html = html.replace(/\0/g, "\\u0000");

    // Keep root-absolute "/assets/..." URLs. Relative "./assets/" resolves against the current
    // path (e.g. /farm/123 -> /farm/assets/x.js), which the host answers with HTML and the
    // browser rejects with "Expected a JavaScript-or-Wasm module script". Only rewrite when the
    // site is deployed under a sub-path (GitHub Pages), using that absolute sub-path.
    const basePath = process.env.VITE_BASE_PATH || "/";
    if (basePath !== "/") {
      const basePrefix = basePath.endsWith("/") ? basePath : `${basePath}/`;
      html = html.replace(
        /(href|src|content)="\/(assets|manifest\.json|favicon\.ico|satellite\.svg|sw\.js)/g,
        `$1="${basePrefix}$2`,
      );
      html = html.replace(/"\/assets\//g, `"${basePrefix}assets/`);
    }

    // Write index.html next to the built client assets
    const outputPublicIndex = path.resolve(process.cwd(), layout.public, "index.html");
    await fs.writeFile(outputPublicIndex, html, "utf-8");
    console.log(`Successfully generated ${layout.public}/index.html for static deployment`);

    // Ensure .nojekyll exists for GitHub Pages
    const noJekyllPath = path.resolve(process.cwd(), layout.public, ".nojekyll");
    await fs.writeFile(noJekyllPath, "", "utf-8");

  } catch (err) {
    console.error("Error generating static index.html:", err);
    process.exitCode = 1;
  }
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

generateStaticIndex();
