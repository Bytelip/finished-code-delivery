import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/context/ThemeContext";
import { ThemeStudioModal } from "@/components/theme/ThemeStudioModal";
import { LanguageProvider } from "@/context/LanguageContext";
import { LocalizedText } from "@/components/i18n/LocalizedText";

function NotFoundComponent() {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          {<LocalizedText text={"Page not found"} />}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {<LocalizedText text={"The page you're looking for doesn't exist or has been moved."} />}
        </p>
        <div className="mt-6 flex justify-center">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              try {
                void router.navigate({ to: "/", replace: true });
              } catch {
                window.location.href = "/";
              }
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 shadow-[0_0_20px_rgba(34,211,238,0.3)] cursor-pointer"
          >
            {<LocalizedText text={"Go home"} />}
          </a>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  const errorMessage =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {<LocalizedText text={"This page didn't load"} />}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {
            <LocalizedText
              text={"Something went wrong on our end. You can try refreshing or head back home."}
            />
          }
        </p>
        {errorMessage && (
          <div className="mt-4 p-3 rounded-lg bg-red-950/40 border border-red-500/20 text-xs font-mono text-red-300 text-left overflow-auto max-h-32">
            {errorMessage}
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {<LocalizedText text={"Try again"} />}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {<LocalizedText text={"Go home"} />}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AgroSpace Nexus" },
      {
        name: "description",
        content: "Precision agriculture and multi-hazard HUD powered by satellite telemetry.",
      },
      { property: "og:title", content: "AgroSpace Nexus" },
      {
        property: "og:description",
        content: "Precision agriculture and multi-hazard HUD powered by satellite telemetry.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "AgroSpace Nexus" },
      { property: "og:image", content: `${import.meta.env.BASE_URL}satellite.svg` },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "AgroSpace Nexus — NASA Orbital Agricultural Intelligence",
      },
      {
        name: "twitter:description",
        content:
          "Satellite-powered farm HUD: plant health, soil moisture, groundwater, crop water budgets and 8 hazard alerts.",
      },
      { name: "twitter:image", content: `${import.meta.env.BASE_URL}satellite.svg` },
      { name: "theme-color", content: "#050912" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "AgroSpace" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
    links: [
      { rel: "manifest", href: `${import.meta.env.BASE_URL}manifest.json` },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: `${import.meta.env.BASE_URL}favicon.ico`, type: "image/x-icon" },
    ],
    scripts: [
      {
        src: "https://accounts.google.com/gsi/client",
        async: true,
        defer: true,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const THEME_BOOT_SCRIPT = `(function(){try{var r=document.documentElement;var m=localStorage.getItem('agrospace-mode');var t=localStorage.getItem('agrospace-theme');var vt=['orbital-emerald','solar-harvest','midnight-nebula','arctic-telemetry'];var th=vt.indexOf(t)!==-1?t:'orbital-emerald';var md=m==='light'||m==='dark'?m:'dark';r.setAttribute('data-theme',th);if(md==='light'){r.classList.remove('dark');r.classList.add('light');r.style.colorScheme='light';}else{r.classList.add('dark');r.classList.remove('light');r.style.colorScheme='dark';}var raw=localStorage.getItem('agrospace-custom-theme-draft');if(raw){var c=JSON.parse(raw);var hx=/^#[0-9a-fA-F]{6}$/;var rm={sharp:['0.25rem','0.15rem','0.25rem','0.35rem','0.5rem','0.625rem'],balanced:['0.5rem','0.375rem','0.5rem','0.75rem','1rem','1.25rem'],rounded:['0.875rem','0.625rem','0.875rem','1.25rem','1.75rem','2rem']};var rs=rm[c.cornerRadius]||rm.balanced;r.style.setProperty('--radius',rs[0]);r.style.setProperty('--ui-radius-sm',rs[1]);r.style.setProperty('--ui-radius-md',rs[2]);r.style.setProperty('--ui-radius-lg',rs[3]);r.style.setProperty('--ui-radius-xl',rs[4]);r.style.setProperty('--ui-radius-2xl',rs[5]);if(typeof c.blurPx==='number'){r.style.setProperty('--hud-blur',Math.min(32,Math.max(0,Math.round(c.blurPx)))+'px');}var hexRgb=function(h){var v=parseInt(h.slice(1),16);return[(v>>16)&255,(v>>8)&255,v&255];};var lum=function(h){var rgb=hexRgb(h).map(function(x){var s=x/255;return s<=0.03928?s/12.92:Math.pow((s+0.055)/1.055,2.4);});return 0.2126*rgb[0]+0.7152*rgb[1]+0.0722*rgb[2];};if(hx.test(c.accent||'')){r.style.setProperty('--accent',c.accent);r.style.setProperty('--primary',c.accent);r.style.setProperty('--ring',c.accent);r.style.setProperty('--primary-foreground',lum(c.accent)>0.36?'#041019':'#FFFFFF');}if(hx.test(c.canvas||'')){r.style.setProperty('--bg-canvas',c.canvas);r.style.setProperty('--background',c.canvas);}if(hx.test(c.surface||'')){r.style.setProperty('--bg-surface',c.surface);r.style.setProperty('--popover',c.surface);var rgb=hexRgb(c.surface);var op=typeof c.glassOpacity==='number'?Math.min(0.96,Math.max(0.35,c.glassOpacity)):0.82;var g='rgba('+rgb[0]+','+rgb[1]+','+rgb[2]+','+op+')';r.style.setProperty('--bg-glass',g);r.style.setProperty('--card',g);}if(hx.test(c.textOverride||'')){r.style.setProperty('--text-primary',c.textOverride);r.style.setProperty('--foreground',c.textOverride);}}}catch(e){}})();`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // After a new deploy, an already-open page may request old script files that no longer exist.
  // Reload once to pick up the fresh index instead of leaving a blank screen.
  useEffect(() => {
    const onPreloadError = (event: Event) => {
      const key = "agrospace:chunk-reload";
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      event.preventDefault();
      window.location.reload();
    };
    window.addEventListener("vite:preloadError", onPreloadError);
    const clearFlag = window.setTimeout(
      () => sessionStorage.removeItem("agrospace:chunk-reload"),
      10000,
    );
    return () => {
      window.removeEventListener("vite:preloadError", onPreloadError);
      window.clearTimeout(clearFlag);
    };
  }, []);

  // Register PWA Service Worker in production
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      !window.location.hostname.includes("localhost")
    ) {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
        // Silently ignore registration error on unsupported hosts
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
          <ThemeStudioModal />
          {/* Toaster positioned at bottom-right in dark obsidian glass */}
          <Toaster position="bottom-right" duration={2500} className="bottom-20 right-5 z-50" />
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
