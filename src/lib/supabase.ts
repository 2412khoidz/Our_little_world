import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getAppEnv } from './env';

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient;
  const env = getAppEnv();
  if (!env.isSupabaseConfigured) {
    throw new Error('Supabase chưa được cấu hình trong biến môi trường.');
  }
  cachedClient = createClient(env.supabaseUrl, env.supabasePublishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 15,
      },
    },
  });
  return cachedClient;
}
