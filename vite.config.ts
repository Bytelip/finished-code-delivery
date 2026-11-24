// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// Never set ssr.external or resolve.external: the Worker has no runtime module resolution, so
// the build fails. Never add compression (compressPublicAssets, vite-plugin-compression):
// hosting already compresses at the edge.
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import basicSsl from "@vitejs/plugin-basic-ssl";

const isHttps = process.env["VITE_HTTPS"] === "true";
const basePath = process.env["VITE_BASE_PATH"] || "/";
// Never enable HTTPS plugin during production builds — it breaks Vercel/Netlify bundling
const isDev = process.env["NODE_ENV"] !== "production";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    base: basePath,
    plugins: isHttps && isDev ? [basicSsl()] : [],
    server: {
      host: "0.0.0.0",
      port: 8080,
      allowedHosts: true,
    },
    build: {
      chunkSizeWarningLimit: 2500,
    },
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
        process.env["VITE_SUPABASE_URL"] ||
        "https://enutgngbsatwgpemwzgx.supabase.co"
      ),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
        process.env["VITE_SUPABASE_ANON_KEY"] ||
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVudXRnbmdic2F0d2dwZW13emd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ3MjM0MTEsImV4cCI6MjExMDI5OTQxMX0.0IaWgZGSfTyy1Qe6ipZtrHBAVLDJ_anskVOp8i6ST8Y"
      ),
    },
  },
});
