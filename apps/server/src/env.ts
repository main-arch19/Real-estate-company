import "dotenv/config";

/** Centralized, typed access to server environment. */
export const env = {
  port: Number(process.env.PORT ?? 8787),
  profileEncryptionKey:
    process.env.PROFILE_ENCRYPTION_KEY ?? "dev-only-change-me-32byteslong-secret",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
};

export const hasAnthropic = env.anthropicApiKey.length > 0;
export const hasSupabase =
  env.supabaseUrl.length > 0 && env.supabaseServiceKey.length > 0;
