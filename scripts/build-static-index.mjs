import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function generateStaticIndex() {
  try {
    const serverEntryPath = path.resolve(process.cwd(), ".output/server/index.mjs");
    const serverModule = await import(pathToFileURL(serverEntryPath).href);
    const handler = serverModule.default;

    if (!handler || typeof handler.fetch !== "function") {
      console.warn("No handler.fetch found in .output/server/index.mjs");
      return;
    }

    const res = await handler.fetch(new Request("http://localhost/"), {});
    let html = await res.text();

    if (!html || !html.includes("<!DOCTYPE html>")) {
      console.warn("Did not receive valid HTML from server handler");
      return;
    }

    // Escape any null-byte delimiters in the streamed hydration payload to keep files valid UTF-8 text
    html = html.replace(/\0/g, "\\u0000");

    // Convert root-absolute asset URLs to relative paths (e.g. "/assets/" -> "./assets/")
    // This allows the bundle to work seamlessly both on root domains (GoDaddy / Vercel)
    // and subpath deployments (GitHub Pages: /finished-code-delivery/)
    html = html.replace(/(href|src|content)="\/(assets|manifest\.json|favicon\.ico|satellite\.svg|sw\.js)/g, '$1="./$2');
    html = html.replace(/"\/assets\//g, '"./assets/');

    // Write to .output/public/index.html
    const outputPublicIndex = path.resolve(process.cwd(), ".output/public/index.html");
    await fs.writeFile(outputPublicIndex, html, "utf-8");
    console.log("Successfully generated .output/public/index.html for static deployment");

    // Ensure .nojekyll exists in .output/public for GitHub Pages
    const noJekyllPath = path.resolve(process.cwd(), ".output/public/.nojekyll");
    await fs.writeFile(noJekyllPath, "", "utf-8");

    // Also write to public/index.html so it persists in Git for GitHub Pages & GoDaddy
    const publicIndex = path.resolve(process.cwd(), "public/index.html");
    await fs.writeFile(publicIndex, html, "utf-8");
    console.log("Successfully wrote public/index.html for Git sync");
  } catch (err) {
    console.error("Error generating static index.html:", err);
  }
}

generateStaticIndex();
