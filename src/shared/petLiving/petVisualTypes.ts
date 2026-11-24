export type CatCoatVariantId = 'ginger-tabby' | 'cream-puff' | 'calico-patch';
export type CatAccessoryId = 'none' | 'ribbon_rose' | 'scarf_mint' | 'bell_gold';
export type PetFacing = 'south' | 'east' | 'north' | 'west';

export type PetAnimState =
  | 'idle_south'
  | 'idle_east'
  | 'idle_north'
  | 'idle_west'
  | 'walk_south'
  | 'walk_east'
  | 'walk_north'
  | 'walk_west'
  | 'run_south'
  | 'run_east'
  | 'run_north'
  | 'run_west'
  | 'sit_south'
  | 'sit_east'
  | 'sit_north'
  | 'sit_west'
  | 'lie_down'
  | 'sleep'
  | 'wake_yawn_stretch'
  | 'sniff'
  | 'eat'
  | 'drink'
  | 'pet_purr'
  | 'happy_hop'
  | 'play_pounce'
  | 'box_peek'
  | 'groom';

export interface CatVariantSpec {
  id: CatCoatVariantId;
  defaultNameVi: string;
  titleVi: string;
  silhouetteVi: string;
  earShape: 'pointed' | 'rounded' | 'tufted';
  tailStyle: 'curled_striped' | 'fluffy_round' | 'bob_tipped';
  bodyRoundness: 'slim' | 'chubby' | 'medium';
  palette: {
    outline: string;
    primary: string;
    primaryShadow: string;
    secondary: string;
    belly: string;
    innerEar: string;
    cheek: string;
    eye: string;
    patchDark?: string;
    stripe?: string;
  };
}

export const CAT_VARIANTS: readonly CatVariantSpec[] = [
  {
    id: 'ginger-tabby',
    defaultNameVi: 'Quýt',
    titleVi: 'Mèo Vàng Cam Tinh Nghịch',
    silhouetteVi: 'Tai nhọn tinh anh, sọc trán chữ M, tất kem ấm áp và đuôi vằn cong',
    earShape: 'pointed',
    tailStyle: 'curled_striped',
    bodyRoundness: 'slim',
    palette: {
      outline: '#3b2420',
      primary: '#e8954d',
      primaryShadow: '#c76e2e',
      secondary: '#f6ba72',
      belly: '#fff1d9',
      innerEar: '#f09ba8',
      cheek: '#f48fa1',
      eye: '#2d1c19',
      stripe: '#b55622',
    },
  },
  {
    id: 'cream-puff',
    defaultNameVi: 'Mochi',
    titleVi: 'Mèo Trắng Kem Tròn Trịa',
    silhouetteVi: 'Thân tròn mập mạp như bánh bao, tai bo mềm, má hồng và đuôi bông xù',
    earShape: 'rounded',
    tailStyle: 'fluffy_round',
    bodyRoundness: 'chubby',
    palette: {
      outline: '#463332',
      primary: '#fcf3e6',
      primaryShadow: '#e2cfb9',
      secondary: '#e8c298',
      belly: '#ffffff',
      innerEar: '#f5b0ba',
      cheek: '#f69eb0',
      eye: '#332229',
      patchDark: '#d8ab7e',
    },
  },
  {
    id: 'calico-patch',
    defaultNameVi: 'Bông',
    titleVi: 'Mèo Tam Thể Đuôi Bông',
    silhouetteVi: 'Mảng màu cam – cacao bất đối xứng, chỏm tai nhẹ và đuôi bông chấm màu',
    earShape: 'tufted',
    tailStyle: 'bob_tipped',
    bodyRoundness: 'medium',
    palette: {
      outline: '#382321',
      primary: '#fbf6ef',
      primaryShadow: '#dcd1c7',
      secondary: '#eb9b52',
      belly: '#ffffff',
      innerEar: '#f2a1ad',
      cheek: '#f495a7',
      eye: '#2a332b',
      patchDark: '#69473a',
      stripe: '#cf742e',
    },
  },
] as const;

export const CAT_ACCESSORIES: readonly {
  id: CatAccessoryId;
  labelVi: string;
  color: string;
  accent: string;
}[] = [
  { id: 'none', labelVi: 'Tự nhiên', color: '#000000', accent: '#000000' },
  { id: 'ribbon_rose', labelVi: 'Nơ hồng pastel', color: '#e56f89', accent: '#ffd3dd' },
  { id: 'scarf_mint', labelVi: 'Khăn cổ bạc hà', color: '#6cb39c', accent: '#daf4ea' },
  { id: 'bell_gold', labelVi: 'Vòng chuông vàng', color: '#c45b4f', accent: '#f6cb5a' },
] as const;

export interface PetAnimSpec {
  key: PetAnimState;
  labelVi: string;
  frameCount: number;
  fps: number;
  loop: boolean;
}

export const PET_FRAME_SIZE = 24;

export const PET_ANIMATION_SPECS: readonly PetAnimSpec[] = [
  { key: 'idle_south', labelVi: 'Đứng thở (Nam)', frameCount: 6, fps: 7, loop: true },
  { key: 'idle_east', labelVi: 'Đứng thở (Đông)', frameCount: 6, fps: 7, loop: true },
  { key: 'idle_north', labelVi: 'Đứng thở (Bắc)', frameCount: 6, fps: 7, loop: true },
  { key: 'idle_west', labelVi: 'Đứng thở (Tây)', frameCount: 6, fps: 7, loop: true },
  { key: 'walk_south', labelVi: 'Đi bộ (Nam)', frameCount: 6, fps: 10, loop: true },
  { key: 'walk_east', labelVi: 'Đi bộ (Đông)', frameCount: 6, fps: 10, loop: true },
  { key: 'walk_north', labelVi: 'Đi bộ (Bắc)', frameCount: 6, fps: 10, loop: true },
  { key: 'walk_west', labelVi: 'Đi bộ (Tây)', frameCount: 6, fps: 10, loop: true },
  { key: 'run_south', labelVi: 'Chạy lon ton (Nam)', frameCount: 4, fps: 14, loop: true },
  { key: 'run_east', labelVi: 'Chạy lon ton (Đông)', frameCount: 4, fps: 14, loop: true },
  { key: 'run_north', labelVi: 'Chạy lon ton (Bắc)', frameCount: 4, fps: 14, loop: true },
  { key: 'run_west', labelVi: 'Chạy lon ton (Tây)', frameCount: 4, fps: 14, loop: true },
  { key: 'sit_south', labelVi: 'Ngồi ngoan (Nam)', frameCount: 4, fps: 5, loop: true },
  { key: 'sit_east', labelVi: 'Ngồi ngoan (Đông)', frameCount: 4, fps: 5, loop: true },
  { key: 'sit_north', labelVi: 'Ngồi ngoan (Bắc)', frameCount: 4, fps: 5, loop: true },
  { key: 'sit_west', labelVi: 'Ngồi ngoan (Tây)', frameCount: 4, fps: 5, loop: true },
  { key: 'lie_down', labelVi: 'Nằm thư giãn', frameCount: 4, fps: 4, loop: true },
  { key: 'sleep', labelVi: 'Cuộn tròn ngủ', frameCount: 6, fps: 4, loop: true },
  { key: 'wake_yawn_stretch', labelVi: 'Thức dậy · Ngáp & Duỗi', frameCount: 6, fps: 5, loop: false },
  { key: 'sniff', labelVi: 'Đánh hơi tò mò', frameCount: 4, fps: 7, loop: true },
  { key: 'eat', labelVi: 'Ăn ngon miệng', frameCount: 4, fps: 8, loop: true },
  { key: 'drink', labelVi: 'Liếm nước', frameCount: 4, fps: 8, loop: true },
  { key: 'pet_purr', labelVi: 'Híp mắt rừ rừ', frameCount: 4, fps: 6, loop: true },
  { key: 'happy_hop', labelVi: 'Nhảy mừng vui vẻ', frameCount: 4, fps: 9, loop: true },
  { key: 'play_pounce', labelVi: 'Rình & Vồ đồ chơi', frameCount: 6, fps: 9, loop: true },
  { key: 'box_peek', labelVi: 'Ló đầu trong hộp giấy', frameCount: 4, fps: 5, loop: true },
  { key: 'groom', labelVi: 'Liếm chân chải lông', frameCount: 4, fps: 6, loop: true },
] as const;

export const LIVING_ITEM_ICONS = [
  'kibble_bowl_empty',
  'kibble_bowl_full',
  'water_bowl_empty',
  'water_bowl_full',
  'food_kibble',
  'food_grilled_fish',
  'food_salmon_treat',
  'food_warm_broth',
  'water_pitcher_empty',
  'water_pitcher_full',
  'yarn_ball',
  'toy_ball',
  'cardboard_box',
  'scratching_post',
  'pet_cushion',
] as const;

export type LivingItemIconId = (typeof LIVING_ITEM_ICONS)[number];
