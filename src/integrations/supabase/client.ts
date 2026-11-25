import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { brokeredPreviewStorage } from "./previewAuthStorage";

export const MISSING_SUPABASE_ENV_MESSAGE =
  "Missing Supabase environment variables in deployment settings";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

// The public URL can be reachable only from the browser, so server requests go to the runtime URL of the same backend.
function serverSupabaseUrl(publicUrl: string, supabaseKey: string): string | undefined {
  if (typeof window !== "undefined" || typeof process === "undefined") return undefined;
  const serverUrl = process.env["SUPABASE_URL"]?.trim().replace(/\/+$/, "");
  if (
    !serverUrl ||
    serverUrl === publicUrl ||
    process.env["SUPABASE_PUBLISHABLE_KEY"]?.trim() !== supabaseKey
  ) {
    return undefined;
  }
  return serverUrl;
}

function createMissingEnvFetch(): typeof fetch {
  return async () => {
    throw new Error(MISSING_SUPABASE_ENV_MESSAGE);
  };
}

function createSupabaseFetch(supabaseUrl: string, supabaseKey: string): typeof fetch {
  const publicUrl = supabaseUrl.trim().replace(/\/+$/, "");
  const serverUrl = serverSupabaseUrl(publicUrl, supabaseKey);
  return async (input, init) => {
    if (!publicUrl || !supabaseKey) {
      throw new Error(MISSING_SUPABASE_ENV_MESSAGE);
    }

    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    // New Supabase API keys are opaque strings, not bearer JWTs.
    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    const requestUrl: string =
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    if (serverUrl && requestUrl.startsWith(`${publicUrl}/`)) {
      const target = serverUrl + requestUrl.slice(publicUrl.length);
      const request =
        typeof input === "string" || input instanceof URL ? target : new Request(target, input);
      try {
        return await fetch(request, { ...init, headers });
      } catch (err) {
        console.warn(`[Supabase] Server URL request failed, falling back to public URL:`, err);
      }
    }

    try {
      return await fetch(input, { ...init, headers });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[Supabase Fetch Error] ${errMsg} targeting ${requestUrl}`);
      if (
        errMsg.toLowerCase().includes("failed to fetch") ||
        errMsg.toLowerCase().includes("networkerror")
      ) {
        throw new TypeError(
          `Unable to connect to Supabase at ${publicUrl} (Failed to fetch). Verify your internet connection, confirm that your Supabase project is active (not paused), and verify CORS/URL configuration in Supabase Dashboard.`,
        );
      }
      throw err;
    }
  };
}

export function getSupabaseCredentials(): { url: string; key: string } {
  const envUrl =
    typeof import.meta !== "undefined" && import.meta.env
      ? import.meta.env.VITE_SUPABASE_URL
      : undefined;
  const procUrl =
    typeof process !== "undefined" && process.env
      ? process.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"]
      : undefined;

  const envKey =
    typeof import.meta !== "undefined" && import.meta.env
      ? import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
      : undefined;
  const procKey =
    typeof process !== "undefined" && process.env
      ? process.env["VITE_SUPABASE_ANON_KEY"] ||
        process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
        process.env["SUPABASE_ANON_KEY"] ||
        process.env["SUPABASE_PUBLISHABLE_KEY"]
      : undefined;

  const url = (envUrl || procUrl || "").trim().replace(/\/+$/, "");
  const key = (envKey || procKey || "").trim();

  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseCredentials();
  return Boolean(url && key);
}

function createSupabaseClient() {
  const { url: supabaseUrl, key: supabaseKey } = getSupabaseCredentials();

  if (!supabaseUrl || !supabaseKey) {
    console.error(`[Supabase] ${MISSING_SUPABASE_ENV_MESSAGE}`);
    return createClient<Database>("https://missing-supabase-env.invalid", "missing-supabase-key", {
      global: {
        fetch: createMissingEnvFetch(),
      },
      auth: {
        storage: brokeredPreviewStorage(),
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    });
  }

  return createClient<Database>(supabaseUrl, supabaseKey, {
    global: {
      fetch: createSupabaseFetch(supabaseUrl, supabaseKey),
    },
    auth: {
      storage: brokeredPreviewStorage(),
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
