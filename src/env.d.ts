/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OLW_PRIVATE_AUDIO?: boolean;
  readonly VITE_OLW_PRIVATE_ART?: boolean;
  readonly VITE_OLW_EXTENDED_WORLD?: boolean;
  readonly VITE_OLW_PREVIEW_PROFILE?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_OLW_DEV_LAN?: boolean | string;
  readonly VITE_OLW_AUTO_TEST_IDENTITY?: string;
}
