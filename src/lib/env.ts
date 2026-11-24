export interface AppEnv {
  supabaseUrl: string;
  supabasePublishableKey: string;
  isSupabaseConfigured: boolean;
}

export function getAppEnv(): AppEnv {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
  const key =
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
    '';

  return {
    supabaseUrl: url,
    supabasePublishableKey: key,
    isSupabaseConfigured: url.length > 0 && key.length > 0,
  };
}
