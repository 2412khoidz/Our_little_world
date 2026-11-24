import { getAppEnv } from '../env';
import { createDevLanBackend } from './devLanBackend';
import { createSupabaseBackend } from './supabaseBackend';
import { createUnconfiguredBackend } from './unconfiguredBackend';
import type { WorldBackend } from './types';

let singletonBackend: WorldBackend | null = null;

export function getWorldBackend(): WorldBackend {
  if (singletonBackend) return singletonBackend;
  const env = getAppEnv();
  if (env.isSupabaseConfigured) {
    singletonBackend = createSupabaseBackend();
  } else if (import.meta.env.DEV) {
    singletonBackend = createDevLanBackend();
  } else {
    singletonBackend = createUnconfiguredBackend();
  }
  return singletonBackend;
}
