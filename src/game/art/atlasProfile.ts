export const USE_PRIVATE_ART = import.meta.env.VITE_OLW_PRIVATE_ART === true;
export const ART_ATLAS_PATH = USE_PRIVATE_ART ? '/assets/private-unified' : '/assets/unified';
export const AVATAR_ATLAS_KEY = 'avatar-atlas';
export const AVATAR_ATLAS_URL = ART_ATLAS_PATH + '/avatars.png';
