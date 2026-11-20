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
import { LanguageProvider } from "@/context/LanguageContext";
import { LocalizedText } from "@/components/i18n/LocalizedText";

function NotFoundComponent() {
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
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {<LocalizedText text={"Go home"} />}
          </Link>
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

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
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
          {/* Toaster positioned at bottom-right in dark obsidian glass */}
          <Toaster position="bottom-right" duration={2500} className="bottom-20 right-5 z-50" />
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
