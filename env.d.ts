/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL — public, safe in the frontend bundle. */
  readonly VITE_SUPABASE_URL: string;
  /** Supabase anon key — public, safe in the frontend bundle. */
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Comma-separated emails that skip the subscription gate. */
  readonly VITE_ADMIN_EMAILS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
