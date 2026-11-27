/**
 * Canonical deep-farming content definitions synthesized from verified MIT donors:
 * - Harvest Hollow (github.com/KrasimirKralev/harvest-hollow @ 9b23e1a)
 * - Meadowbrook / webfarmville (github.com/Shiz0id/webfarmville @ c420bc2)
 * - Greens (github.com/fernforge-arcade/greens @ 3f32fd8)
 * - Hollowmere (github.com/robintrepte/hollowmere.tretu.de @ a7a8e5a)
 *
 * Pure TypeScript, zero DOM/React/Phaser imports, Node 24 type-stripping compatible (.ts imports).
 */
import type { ProceduralIconSpec, ProceduralIconShape } from '../art/donorProceduralIconSpec.ts';
import { registerProceduralIconSpecs } from '../art/donorProceduralIconSpec.ts';
import type {
  ItemDefinition,
  ItemGroup,
  ItemQuality,
  ItemRecipeInput,
  SellChannel,
} from '../economy/types.ts';

const ALL_QUALITIES: readonly ItemQuality[] = ['normal', 'silver', 'gold'];
const MARKET_CROP: readonly SellChannel[] = ['shipping_bin', 'npc_general', 'order_board'];
const MARKET_FLOWER: readonly SellChannel[] = ['shipping_bin', 'npc_flower', 'order_board'];
const MARKET_ARTISAN: readonly SellChannel[] = ['shipping_bin', 'npc_general', 'order_board', 'restaurant'];

export interface StarterCanonicalMetadata {
  readonly descriptionVi: string;
  readonly category: string;
  readonly iconSpec: ProceduralIconSpec;
  readonly sources: readonly string[];
  readonly uses: readonly string[];
  readonly donorSource: string;
}

export const STARTER_ITEM_METADATA: Readonly<Record<string, StarterCanonicalMetadata>> = {
  // K5 Starters
  pet_kibble_basic: {
    descriptionVi: 'Phần hạt ấm bụng miễn phí hằng ngày cho bé mèo cam Quýt.',
    category: 'pet_food',
    iconSpec: { shape: 'animal_feed', primary: '#d9914e', secondary: '#b56e32', accent: '#f7d699' },
    sources: ['starter'],
    uses: ['feed_pet'],
    donorSource: 'olw-starter',
  },
  gift_flower_bouquet: {
    descriptionVi: 'Món quà nhỏ giữ trong ngăn riêng để tạo bất ngờ cho người thương.',
    category: 'gift',
    iconSpec: { shape: 'bouquet', primary: '#f47ca0', secondary: '#ffe680', accent: '#5fb865' },
    sources: ['starter'],
    uses: ['gift_partner', 'keepsake'],
    donorSource: 'olw-starter',
  },
  gift_strawberry_cake: {
    descriptionVi: 'Miếng bánh dâu xinh xắn có thể gửi kèm thư tay.',
    category: 'gift',
    iconSpec: { shape: 'pie_slice', primary: '#f8d2d8', secondary: '#e8485c', accent: '#fff4df' },
    sources: ['starter'],
    uses: ['gift_partner'],
    donorSource: 'olw-starter',
  },
  gift_plush_cat: {
    descriptionVi: 'Gối ôm nho nhỏ mang hơi ấm căn nhà chung.',
    category: 'gift',
    iconSpec: { shape: 'gift_box', primary: '#f4a154', secondary: '#fce2c4', accent: '#d96b38' },
    sources: ['starter'],
    uses: ['gift_partner', 'keepsake'],
    donorSource: 'olw-starter',
  },
  gift_star_jar: {
    descriptionVi: 'Những ngôi sao giấy gấp tay lưu giữ lời chúc.',
    category: 'keepsake',
    iconSpec: { shape: 'jam_jar', primary: '#ffe378', secondary: '#9ed8f4', accent: '#fff9cc' },
    sources: ['starter'],
    uses: ['keepsake', 'gift_partner'],
    donorSource: 'olw-starter',
  },
  letter_stationery_pink: {
    descriptionVi: 'Bộ giấy thư màu phấn hồng cho những lời nhắn ấm áp.',
    category: 'stationery',
    iconSpec: { shape: 'gift_box', primary: '#f8bdd0', secondary: '#fff5f8', accent: '#df6b94' },
    sources: ['starter'],
    uses: ['stationery', 'gift_partner'],
    donorSource: 'olw-starter',
  },

  // Base 34 Economy Starters
  seed_wheat: {
    descriptionVi: 'Hạt giống lúa mì dễ trồng, nảy mầm nhanh quanh mùa.',
    category: 'seed',
    iconSpec: { shape: 'seed_packet', primary: '#e8c456', secondary: '#b38d2b' },
    sources: ['shop', 'seed_maker'],
    uses: ['plant'],
    donorSource: 'olw-v020+harvest-hollow@9b23e1a',
  },
  seed_carrot: {
    descriptionVi: 'Hạt giống cà rốt ngọt giòn cho mùa Xuân.',
    category: 'seed',
    iconSpec: { shape: 'seed_packet', primary: '#f08a2c', secondary: '#55a044' },
    sources: ['shop', 'seed_maker'],
    uses: ['plant'],
    donorSource: 'olw-v020+harvest-hollow@9b23e1a',
  },
  seed_tomato: {
    descriptionVi: 'Hạt giống cà chua mọng nước, cho thu hoạch nhiều lần trong mùa Hè.',
    category: 'seed',
    iconSpec: { shape: 'seed_packet', primary: '#e8463a', secondary: '#4d913a' },
    sources: ['shop', 'seed_maker'],
    uses: ['plant'],
    donorSource: 'olw-v020+greens@3f32fd8',
  },
  seed_strawberry: {
    descriptionVi: 'Hạt giống dâu tây Xuân thơm ngọt, tái sinh nhiều đợt.',
    category: 'seed',
    iconSpec: { shape: 'seed_packet', primary: '#e23b4e', secondary: '#ffe46b' },
    sources: ['shop', 'seed_maker'],
    uses: ['plant'],
    donorSource: 'olw-v020+greens@3f32fd8',
  },
  seed_sunflower: {
    descriptionVi: 'Hạt giống hướng dương vàng rực mùa Hè.',
    category: 'seed',
    iconSpec: { shape: 'seed_packet', primary: '#ffd21f', secondary: '#7a4d22' },
    sources: ['shop', 'seed_maker'],
    uses: ['plant'],
    donorSource: 'olw-v020+harvest-hollow@9b23e1a',
  },
  seed_rose_pink: {
    descriptionVi: 'Hạt giống hồng phấn trồng trang trí và lai hoa hiếm.',
    category: 'flower_seed',
    iconSpec: { shape: 'seed_packet', primary: '#f48fb1', secondary: '#5ca348' },
    sources: ['shop'],
    uses: ['plant_flower'],
    donorSource: 'olw-v020',
  },
  seed_cabbage: {
    descriptionVi: 'Hạt giống bắp cải xanh mướt mùa Xuân.',
    category: 'seed',
    iconSpec: { shape: 'seed_packet', primary: '#8fc85a', secondary: '#4f8c36' },
    sources: ['shop', 'seed_maker'],
    uses: ['plant'],
    donorSource: 'olw-v020+greens@3f32fd8',
  },
  wild_herb: {
    descriptionVi: 'Thảo mộc hái ngoài bờ rào, dùng nấu ăn và pha chế.',
    category: 'forage',
    iconSpec: { shape: 'herb_bundle', primary: '#56a84c', secondary: '#82d16c' },
    sources: ['foraging'],
    uses: ['cook_recipe', 'workshop_recipe', 'sell_bin'],
    donorSource: 'olw-v020',
  },
  wood_branch: {
    descriptionVi: 'Cành gỗ nhặt quanh nông trại, dùng đóng đồ và ủ phân.',
    category: 'material',
    iconSpec: { shape: 'stalk', primary: '#8c5f34', secondary: '#634121' },
    sources: ['foraging'],
    uses: ['workshop_recipe', 'sell_bin'],
    donorSource: 'olw-v020',
  },
  bait_free_worm: {
    descriptionVi: 'Mồi giun miễn phí luôn sẵn trong hộp cần câu.',
    category: 'bait',
    iconSpec: { shape: 'root', primary: '#e39088', secondary: '#b8665e' },
    sources: ['starter', 'shop'],
    uses: ['fishing' as unknown as string],
    donorSource: 'olw-v022',
  },
  bait_shrimp: {
    descriptionVi: 'Mồi tép tươi tăng tỉ lệ cá hiếm cắn câu.',
    category: 'bait',
    iconSpec: { shape: 'berry', primary: '#f5986e', secondary: '#f8d2ba' },
    sources: ['shop'],
    uses: ['fishing' as unknown as string, 'sell_bin'],
    donorSource: 'olw-v022',
  },
  carp_pond: {
    descriptionVi: 'Cá chép ao quen thuộc, chế biến món ăn ấm bụng.',
    category: 'fish',
    iconSpec: { shape: 'fish', primary: '#a6b4c8', secondary: '#7689a3', accent: '#f4c76e' },
    sources: ['fishing'],
    uses: ['cook_recipe', 'sell_bin', 'order_board'],
    donorSource: 'olw-v022',
  },
  koi_pastel: {
    descriptionVi: 'Cá koi pastel quý hiếm dưới mặt hồ phẳng lặng.',
    category: 'fish',
    iconSpec: { shape: 'fish', primary: '#f7b2c4', secondary: '#ffffff', accent: '#f59e42' },
    sources: ['fishing'],
    uses: ['cook_recipe', 'sell_bin', 'order_board'],
    donorSource: 'olw-v022',
  },
  lotus_trout: {
    descriptionVi: 'Cá hồi sen thịt chắc ngọt dùng làm món thượng hạng.',
    category: 'fish',
    iconSpec: { shape: 'fish', primary: '#f28b82', secondary: '#80b5a4', accent: '#ffe082' },
    sources: ['fishing'],
    uses: ['cook_recipe', 'sell_bin', 'order_board'],
    donorSource: 'olw-v022',
  },
  wheat: {
    descriptionVi: 'Bó lúa mì vàng óng xay bột và làm thức ăn chăn nuôi.',
    category: 'crop',
    iconSpec: { shape: 'stalk', primary: '#e8c456', secondary: '#caa032' },
    sources: ['farming'],
    uses: ['workshop_recipe', 'sell_bin', 'order_board', 'seed_maker'],
    donorSource: 'olw-v021+greens@3f32fd8',
  },
  carrot: {
    descriptionVi: 'Củ cà rốt cam tươi nấu súp và làm thức ăn cho thỏ.',
    category: 'crop',
    iconSpec: { shape: 'root', primary: '#f08a2c', secondary: '#5aa644' },
    sources: ['farming'],
    uses: ['cook_recipe', 'workshop_recipe', 'sell_bin', 'order_board', 'seed_maker'],
    donorSource: 'olw-v021+harvest-hollow@9b23e1a',
  },
  tomato: {
    descriptionVi: 'Cà chua chín mọng chế biến sốt và salad mùa Hè.',
    category: 'crop',
    iconSpec: { shape: 'round_fruit', primary: '#e8463a', secondary: '#4d913a', accent: '#ff8a7a' },
    sources: ['farming'],
    uses: ['cook_recipe', 'workshop_recipe', 'sell_bin', 'order_board', 'seed_maker'],
    donorSource: 'olw-v021+greens@3f32fd8',
  },
  strawberry: {
    descriptionVi: 'Dâu tây chín đỏ làm mứt, bánh tart và quà tặng.',
    category: 'crop',
    iconSpec: { shape: 'berry', primary: '#e23b4e', secondary: '#59a643', accent: '#ffe46b' },
    sources: ['farming'],
    uses: ['cook_recipe', 'workshop_recipe', 'sell_bin', 'order_board', 'gift_partner', 'seed_maker'],
    donorSource: 'olw-v021+greens@3f32fd8',
  },
  sunflower: {
    descriptionVi: 'Hoa hướng dương ép dầu hoặc cắm thành bó rực rỡ.',
    category: 'crop',
    iconSpec: { shape: 'flower', primary: '#ffd21f', secondary: '#7a4d22', accent: '#5aa644' },
    sources: ['farming'],
    uses: ['workshop_recipe', 'craft_bouquet', 'sell_bin', 'order_board', 'seed_maker'],
    donorSource: 'olw-v021+harvest-hollow@9b23e1a',
  },
  rose_pink: {
    descriptionVi: 'Hoa hồng phấn nở dịu nhẹ, lai được hoa anh đào hiếm.',
    category: 'flower',
    iconSpec: { shape: 'flower', primary: '#f48fb1', secondary: '#c94f7c', accent: '#5ca348' },
    sources: ['flower_breed', 'farming'],
    uses: ['craft_bouquet', 'workshop_recipe', 'gift_partner', 'sell_bin', 'order_board'],
    donorSource: 'olw-v021+webfarmville@c420bc2',
  },
  rose_sakura: {
    descriptionVi: 'Đóa hồng sakura lai quý hiếm từ vườn hoa chung.',
    category: 'hybrid_flower',
    iconSpec: { shape: 'flower', primary: '#ffc1d6', secondary: '#ff7fa9', accent: '#ffe9f2' },
    sources: ['flower_breed'],
    uses: ['craft_bouquet', 'gift_partner', 'sell_bin', 'order_board'],
    donorSource: 'olw-v021+webfarmville@c420bc2',
  },
  cabbage: {
    descriptionVi: 'Bắp cải cuộn lá giòn ngọt, ủ dưa hoặc nấu súp.',
    category: 'crop',
    iconSpec: { shape: 'head', primary: '#9ad96a', secondary: '#65ad42' },
    sources: ['farming'],
    uses: ['cook_recipe', 'workshop_recipe', 'sell_bin', 'order_board', 'seed_maker'],
    donorSource: 'olw-v021+greens@3f32fd8',
  },
  peach: {
    descriptionVi: 'Trái đào chín hồng thu hoạch định kỳ từ cây đào vườn cây ăn quả.',
    category: 'fruit',
    iconSpec: { shape: 'round_fruit', primary: '#f89c78', secondary: '#ffd0b6', accent: '#5fa845' },
    sources: ['orchard'],
    uses: ['cook_recipe', 'workshop_recipe', 'sell_bin', 'order_board', 'gift_partner'],
    donorSource: 'olw-v021+webfarmville@c420bc2',
  },
  sugar_pack: {
    descriptionVi: 'Gói đường tinh luyện làm trà, mứt và bánh ngọt.',
    category: 'pantry',
    iconSpec: { shape: 'flour_sack', primary: '#ffffff', secondary: '#d8e6f0', accent: '#f08fa8' },
    sources: ['shop'],
    uses: ['cook_recipe', 'workshop_recipe', 'sell_bin'],
    donorSource: 'olw-v030',
  },
  spice: {
    descriptionVi: 'Lọ gia vị thơm nồng cho món bánh và súp nóng hổi.',
    category: 'pantry',
    iconSpec: { shape: 'jam_jar', primary: '#c85a32', secondary: '#e8a878', accent: '#fff1cc' },
    sources: ['shop'],
    uses: ['cook_recipe', 'workshop_recipe', 'sell_bin'],
    donorSource: 'olw-v030',
  },
  ribbon: {
    descriptionVi: 'Dải ruy băng lụa gói bó hoa và hộp quà thủ công.',
    category: 'pantry',
    iconSpec: { shape: 'gift_box', primary: '#f06292', secondary: '#f8bbd0', accent: '#ffe082' },
    sources: ['shop'],
    uses: ['craft_bouquet', 'workshop_recipe', 'sell_bin'],
    donorSource: 'olw-v030',
  },
  flour: {
    descriptionVi: 'Bột mì xay mịn tại cối xay gió cho hầu hết món bánh.',
    category: 'artisan',
    iconSpec: { shape: 'flour_sack', primary: '#f5ebd6', secondary: '#d4be98', accent: '#a87d48' },
    sources: ['workshop'],
    uses: ['cook_recipe', 'workshop_recipe', 'sell_bin', 'order_board'],
    donorSource: 'olw-v030+harvest-hollow@9b23e1a',
  },
  carrot_soup: {
    descriptionVi: 'Chén súp cà rốt kem mịn thơm thảo mộc.',
    category: 'dish',
    iconSpec: { shape: 'bowl_soup', primary: '#f08a2c', secondary: '#f8d290', accent: '#5aa644' },
    sources: ['cooking'],
    uses: ['sell_bin', 'order_board', 'gift_partner'],
    donorSource: 'olw-v030',
  },
  herb_carp: {
    descriptionVi: 'Cá chép om thảo mộc đậm đà hương đồng nội.',
    category: 'dish',
    iconSpec: { shape: 'platter', primary: '#d9a468', secondary: '#5ca348', accent: '#f4e2c2' },
    sources: ['cooking'],
    uses: ['sell_bin', 'order_board', 'gift_partner'],
    donorSource: 'olw-v030',
  },
  peach_tea: {
    descriptionVi: 'Ly trà đào ủ mát dịu ngọt cho buổi chiều cùng nhau.',
    category: 'dish',
    iconSpec: { shape: 'cup_drink', primary: '#f89c78', secondary: '#ffdfc8', accent: '#62ad4a' },
    sources: ['cooking'],
    uses: ['sell_bin', 'order_board', 'gift_partner'],
    donorSource: 'olw-v030',
  },
  strawberry_tart: {
    descriptionVi: 'Bánh tart dâu giòn rụm rắc chút gia vị ấm.',
    category: 'dish',
    iconSpec: { shape: 'pie_slice', primary: '#e23b4e', secondary: '#f2c88c', accent: '#fff4df' },
    sources: ['cooking'],
    uses: ['sell_bin', 'order_board', 'gift_partner'],
    donorSource: 'olw-v030',
  },
  koinori_platter: {
    descriptionVi: 'Đĩa cá koi hấp rau củ theo phong cách bếp nhà.',
    category: 'dish',
    iconSpec: { shape: 'platter', primary: '#f7b2c4', secondary: '#9ad96a', accent: '#f08a2c' },
    sources: ['cooking'],
    uses: ['sell_bin', 'order_board', 'gift_partner'],
    donorSource: 'olw-v030',
  },
  sakura_bouquet: {
    descriptionVi: 'Bó hoa anh đào phối hồng phấn và hướng dương buộc ruy băng.',
    category: 'bouquet',
    iconSpec: { shape: 'bouquet', primary: '#f48fb1', secondary: '#ffd21f', accent: '#e91e63' },
    sources: ['workshop'],
    uses: ['gift_partner', 'sell_bin', 'order_board'],
    donorSource: 'olw-v030+webfarmville@c420bc2',
  },
  wood_chair: {
    descriptionVi: 'Chiếc ghế gỗ nhỏ đóng tay vững chắc cho hiên nhà.',
    category: 'craft',
    iconSpec: { shape: 'gift_box', primary: '#a87444', secondary: '#7a5029', accent: '#d29e68' },
    sources: ['workshop'],
    uses: ['sell_bin', 'order_board'],
    donorSource: 'olw-v030',
  },
};

interface CompactDeepItem {
  readonly sku: string;
  readonly nameVi: string;
  readonly descriptionVi: string;
  readonly group: ItemGroup;
  readonly category: string;
  readonly milestone: 'V0.2.2' | 'V0.3.0';
  readonly storeBuy?: number | null;
  readonly sellPrice: number;
  readonly batchQty?: number;
  readonly batchDurationMs?: number;
  readonly laborMilli?: number;
  readonly depreciation?: number;
  readonly inputs?: readonly ItemRecipeInput[];
  readonly qualityTiers?: readonly ItemQuality[];
  readonly forageable?: boolean;
  readonly stackLimit?: number;
  readonly sellChannels?: readonly SellChannel[];
  readonly orderMultiplierBp?: number | null;
  readonly sources: readonly string[];
  readonly uses: readonly string[];
  readonly iconSpec: ProceduralIconSpec;
  readonly donorSource: string;
}

const ITEMS_RAW: CompactDeepItem[] = [];

function addSeedAndCropPair(opts: {
  id: string;
  nameVi: string;
  group: 'grain' | 'veg' | 'fruit' | 'flower';
  seedBuy: number;
  cropSell: number;
  growSec: number;
  yieldQty?: number;
  shape: ProceduralIconShape;
  c1: string;
  c2: string;
  donor: string;
  descCrop: string;
  extraUses?: readonly string[];
}) {
  const seedSku = `seed_${opts.id}`;
  const isFlower = opts.group === 'flower';
  const yieldQty = opts.yieldQty ?? 1;
  ITEMS_RAW.push({
    sku: seedSku,
    nameVi: `Hạt giống ${opts.nameVi.toLowerCase()}`,
    descriptionVi: `Gói hạt giống ${opts.nameVi.toLowerCase()} theo mùa.`,
    group: 'seed',
    category: isFlower ? 'flower_seed' : 'seed',
    milestone: 'V0.2.2',
    storeBuy: opts.seedBuy,
    sellPrice: Math.max(1, Math.floor(opts.seedBuy / 2)),
    stackLimit: 999,
    sellChannels: ['shipping_bin', 'npc_general'],
    sources: ['shop', 'seed_maker'],
    uses: [isFlower ? 'plant_flower' : 'plant', 'sell_bin'],
    iconSpec: { shape: 'seed_packet', primary: opts.c1, secondary: opts.c2 },
    donorSource: opts.donor,
  });
  ITEMS_RAW.push({
    sku: opts.id,
    nameVi: opts.nameVi,
    descriptionVi: opts.descCrop,
    group: opts.group,
    category: isFlower ? 'flower' : 'crop',
    milestone: 'V0.2.2',
    storeBuy: null,
    sellPrice: opts.cropSell,
    batchQty: yieldQty,
    batchDurationMs: opts.growSec * 1_000,
    laborMilli: 600,
    depreciation: 1,
    inputs: [{ sku: seedSku, qty: 1 }],
    qualityTiers: ALL_QUALITIES,
    stackLimit: 999,
    sellChannels: isFlower ? MARKET_FLOWER : MARKET_CROP,
    orderMultiplierBp: 14_500,
    sources: isFlower ? ['farming', 'flower_breed'] : ['farming'],
    uses: opts.extraUses ?? ['workshop_recipe', 'cook_recipe', 'sell_bin', 'order_board', 'seed_maker'],
    iconSpec: { shape: opts.shape, primary: opts.c1, secondary: opts.c2 },
    donorSource: opts.donor,
  });
}

// ---------------------------------------------------------------------------
// 1. 34 Deep Field Crops + 34 Seeds (plus 6 existing = 40 field crops!)
// ---------------------------------------------------------------------------
// Spring (Greens + Hollowmere + Harvest Hollow)
addSeedAndCropPair({ id: 'lettuce', nameVi: 'Xà lách giòn', group: 'veg', seedBuy: 12, cropSell: 18, growSec: 480, shape: 'leafy', c1: '#7cc04f', c2: '#9ad96a', donor: 'greens@3f32fd8', descCrop: 'Xà lách lá non mùa Xuân, dùng trộn salad hoặc cho thỏ ăn.' });
addSeedAndCropPair({ id: 'spinach', nameVi: 'Cải bó xôi', group: 'veg', seedBuy: 16, cropSell: 14, growSec: 600, yieldQty: 2, shape: 'leafy', c1: '#3f8a36', c2: '#56a345', donor: 'greens@3f32fd8', descCrop: 'Rau chân vịt trồng tốt cả Xuân và Thu.' });
addSeedAndCropPair({ id: 'kale', nameVi: 'Cải xoăn', group: 'veg', seedBuy: 22, cropSell: 26, growSec: 720, shape: 'leafy', c1: '#2f7a3a', c2: '#45924f', donor: 'greens@3f32fd8+hollowmere@a7a8e5a', descCrop: 'Lá cải xoăn chịu lạnh tốt qua Xuân, Thu và Đông.' });
addSeedAndCropPair({ id: 'parsnip', nameVi: 'Củ cải vàng', group: 'veg', seedBuy: 10, cropSell: 17, growSec: 420, shape: 'root', c1: '#e8d8a0', c2: '#5da644', donor: 'greens@3f32fd8+hollowmere@a7a8e5a', descCrop: 'Loại củ mùa Xuân cổ điển thơm bùi khi hầm súp.' });
addSeedAndCropPair({ id: 'potato', nameVi: 'Khoai tây', group: 'veg', seedBuy: 18, cropSell: 15, growSec: 720, yieldQty: 2, shape: 'root', c1: '#c79a5e', c2: '#639b41', donor: 'greens@3f32fd8+harvest-hollow@9b23e1a', descCrop: 'Khoai tây nhiều củ, làm bánh mì khoai tây hoặc nghiền tinh bột.' });
addSeedAndCropPair({ id: 'cauliflower', nameVi: 'Súp lơ trắng', group: 'veg', seedBuy: 28, cropSell: 42, growSec: 1200, shape: 'head', c1: '#f4f0e0', c2: '#6cae44', donor: 'greens@3f32fd8+hollowmere@a7a8e5a', descCrop: 'Bông cải trắng lớn nặng tay, giá trị cao dịp đầu Xuân.' });
addSeedAndCropPair({ id: 'snap_pea', nameVi: 'Đậu Hà Lan', group: 'veg', seedBuy: 18, cropSell: 14, growSec: 660, yieldQty: 2, shape: 'vine', c1: '#7cc04f', c2: '#4f8c36', donor: 'greens@3f32fd8', descCrop: 'Giàn đậu giòn ngọt cho thu hoạch lại liên tục.' });
addSeedAndCropPair({ id: 'radish', nameVi: 'Củ cải đỏ', group: 'veg', seedBuy: 10, cropSell: 16, growSec: 420, shape: 'root', c1: '#d23b4e', c2: '#5ca348', donor: 'greens@3f32fd8+hollowmere@a7a8e5a', descCrop: 'Củ cải đỏ tươi mát, muối chua giòn rụm.' });
addSeedAndCropPair({ id: 'scallion', nameVi: 'Hành lá', group: 'veg', seedBuy: 8, cropSell: 12, growSec: 360, shape: 'stalk', c1: '#9ad96a', c2: '#f0f5ea', donor: 'greens@3f32fd8', descCrop: 'Hành xanh lên mầm rất nhanh, nêm hầu hết món mặn.' });
addSeedAndCropPair({ id: 'rhubarb', nameVi: 'Đại hoàng', group: 'fruit', seedBuy: 36, cropSell: 52, growSec: 1440, shape: 'stalk', c1: '#c83a5a', c2: '#6cae44', donor: 'hollowmere@a7a8e5a', descCrop: 'Cuống chua thanh chuyên dùng làm bánh nướng mùa Xuân.' });

// Summer
addSeedAndCropPair({ id: 'corn', nameVi: 'Bắp ngô', group: 'grain', seedBuy: 32, cropSell: 20, growSec: 1080, yieldQty: 2, shape: 'stalk', c1: '#f2d04b', c2: '#5da644', donor: 'greens@3f32fd8+harvest-hollow@9b23e1a+webfarmville@c420bc2', descCrop: 'Cây ngô mọc xuyên suốt Hè sang Thu, xay bột bắp và làm cám.' });
addSeedAndCropPair({ id: 'blueberry', nameVi: 'Việt quất', group: 'fruit', seedBuy: 34, cropSell: 18, growSec: 1080, yieldQty: 3, shape: 'berry', c1: '#4d5bd6', c2: '#3f7a38', donor: 'harvest-hollow@9b23e1a+hollowmere@a7a8e5a', descCrop: 'Bụi việt quất trĩu quả xanh biếc, làm mứt và bánh muffin.' });
addSeedAndCropPair({ id: 'melon', nameVi: 'Dưa lưới', group: 'fruit', seedBuy: 36, cropSell: 56, growSec: 1500, shape: 'round_fruit', c1: '#e89a9a', c2: '#6cae44', donor: 'hollowmere@a7a8e5a+webfarmville@c420bc2', descCrop: 'Trái dưa ngọt mát căng mọng giữa trưa Hè.' });
addSeedAndCropPair({ id: 'hot_pepper', nameVi: 'Ớt đỏ cay', group: 'veg', seedBuy: 20, cropSell: 16, growSec: 600, yieldQty: 2, shape: 'vine', c1: '#e8301a', c2: '#4f8c36', donor: 'harvest-hollow@9b23e1a+hollowmere@a7a8e5a', descCrop: 'Ớt đỏ cay nồng, ngâm dấm hoặc nghiền bột ớt paprika.' });
addSeedAndCropPair({ id: 'bell_pepper', nameVi: 'Ớt chuông ngọt', group: 'veg', seedBuy: 24, cropSell: 20, growSec: 780, yieldQty: 2, shape: 'round_fruit', c1: '#3fae4f', c2: '#2d7a3a', donor: 'greens@3f32fd8', descCrop: 'Ớt chuông giòn ngọt dùng xào nấu và làm bếp gia đình.' });
addSeedAndCropPair({ id: 'cucumber', nameVi: 'Dưa leo', group: 'veg', seedBuy: 20, cropSell: 18, growSec: 660, yieldQty: 2, shape: 'vine', c1: '#4f8c36', c2: '#8fc85a', donor: 'greens@3f32fd8', descCrop: 'Dưa leo mát lành tái thu hoạch đều đặn.' });
addSeedAndCropPair({ id: 'zucchini', nameVi: 'Bí ngòi', group: 'veg', seedBuy: 22, cropSell: 22, growSec: 780, yieldQty: 2, shape: 'vine', c1: '#3f7a2e', c2: '#7cc04f', donor: 'greens@3f32fd8', descCrop: 'Bí ngòi xanh đậm nấu súp rau củ rất hợp vị.' });
addSeedAndCropPair({ id: 'broccoli', nameVi: 'Bông cải xanh', group: 'veg', seedBuy: 26, cropSell: 38, growSec: 960, shape: 'head', c1: '#3f7a2e', c2: '#56a345', donor: 'greens@3f32fd8', descCrop: 'Bông cải xanh giàu dinh dưỡng cho bữa cơm chung.' });
addSeedAndCropPair({ id: 'basil', nameVi: 'Húng quế', group: 'veg', seedBuy: 14, cropSell: 16, growSec: 420, shape: 'leafy', c1: '#559c3c', c2: '#7cc04f', donor: 'greens@3f32fd8', descCrop: 'Rau thơm húng quế nấu bơ thảo mộc và món Ý.' });
addSeedAndCropPair({ id: 'starfruit', nameVi: 'Khế sao vàng', group: 'fruit', seedBuy: 96, cropSell: 140, growSec: 2700, shape: 'round_fruit', c1: '#f8e858', c2: '#6cae44', donor: 'greens@3f32fd8+hollowmere@a7a8e5a', descCrop: 'Loại quả ngôi sao quý hiếm chín rực dưới nắng Hè.' });

// Fall
addSeedAndCropPair({ id: 'pumpkin', nameVi: 'Bí ngô', group: 'veg', seedBuy: 40, cropSell: 62, growSec: 1800, shape: 'round_fruit', c1: '#f2852a', c2: '#558b3a', donor: 'greens@3f32fd8+harvest-hollow@9b23e1a+hollowmere@a7a8e5a', descCrop: 'Bí ngô tròn căng mùa Thu làm bánh bí ngô và súp kem.' });
addSeedAndCropPair({ id: 'cranberry', nameVi: 'Nam việt quất', group: 'fruit', seedBuy: 42, cropSell: 24, growSec: 960, yieldQty: 3, shape: 'berry', c1: '#c8203a', c2: '#528038', donor: 'hollowmere@a7a8e5a+webfarmville@c420bc2', descCrop: 'Quả đỏ chua nhẹ nấu sốt nam việt quất cho đại tiệc.' });
addSeedAndCropPair({ id: 'eggplant', nameVi: 'Cà tím', group: 'veg', seedBuy: 14, cropSell: 18, growSec: 600, yieldQty: 2, shape: 'round_fruit', c1: '#6a3a8a', c2: '#4d8f3c', donor: 'hollowmere@a7a8e5a+webfarmville@c420bc2', descCrop: 'Cà tím bóng mượt mùa Thu cho thu hoạch nhiều lần.' });
addSeedAndCropPair({ id: 'yam', nameVi: 'Khoai mỡ', group: 'veg', seedBuy: 28, cropSell: 42, growSec: 1200, shape: 'root', c1: '#c86a4a', c2: '#7a5a3a', donor: 'hollowmere@a7a8e5a', descCrop: 'Khoai mỡ bùi dẻo nướng mật ong thơm lừng.' });
addSeedAndCropPair({ id: 'grape', nameVi: 'Nho tím', group: 'fruit', seedBuy: 32, cropSell: 26, growSec: 1080, yieldQty: 2, shape: 'berry', c1: '#8a4ab0', c2: '#569844', donor: 'greens@3f32fd8+hollowmere@a7a8e5a', descCrop: 'Chùm nho tím mọng, phơi làm nho khô hoặc làm mứt.' });
addSeedAndCropPair({ id: 'bok_choy', nameVi: 'Cải thìa', group: 'veg', seedBuy: 16, cropSell: 24, growSec: 540, shape: 'leafy', c1: '#7ac85a', c2: '#dfe8c0', donor: 'greens@3f32fd8+hollowmere@a7a8e5a', descCrop: 'Cải thìa lớn nhanh cuối Thu dùng cho cơm hộp cá koi.' });
addSeedAndCropPair({ id: 'beet', nameVi: 'Củ dền đường', group: 'veg', seedBuy: 18, cropSell: 26, growSec: 720, shape: 'root', c1: '#a02a4a', c2: '#5fa845', donor: 'hollowmere@a7a8e5a', descCrop: 'Củ dền đỏ thẫm ép đường củ dền tinh khiết tại cối xay.' });
addSeedAndCropPair({ id: 'artichoke', nameVi: 'Atiso xanh', group: 'veg', seedBuy: 24, cropSell: 36, growSec: 960, shape: 'head', c1: '#6a9a5a', c2: '#9ad96a', donor: 'greens@3f32fd8+hollowmere@a7a8e5a', descCrop: 'Nụ atiso non hầm thảo mộc mùa Thu.' });
addSeedAndCropPair({ id: 'oats', nameVi: 'Yến mạch', group: 'grain', seedBuy: 20, cropSell: 18, growSec: 600, yieldQty: 2, shape: 'stalk', c1: '#d8c27a', c2: '#a8904a', donor: 'harvest-hollow@9b23e1a', descCrop: 'Yến mạch mùa Thu xay bột và trộn thức ăn bò cừu.' });

// Winter + Multi-Season Special
addSeedAndCropPair({ id: 'snowpea', nameVi: 'Đậu tuyết', group: 'veg', seedBuy: 22, cropSell: 20, growSec: 660, yieldQty: 2, shape: 'vine', c1: '#a0e0a0', c2: '#75b880', donor: 'greens@3f32fd8+hollowmere@a7a8e5a', descCrop: 'Đậu tuyết chịu sương giá lớn đều trong mùa Đông.' });
addSeedAndCropPair({ id: 'winter_squash', nameVi: 'Bí mùa Đông', group: 'veg', seedBuy: 38, cropSell: 56, growSec: 1500, shape: 'round_fruit', c1: '#d8a050', c2: '#6a8f5a', donor: 'hollowmere@a7a8e5a', descCrop: 'Bí vỏ dày giữ hương ngọt qua những ngày tuyết rơi.' });
addSeedAndCropPair({ id: 'frostberry', nameVi: 'Dâu sương giá', group: 'fruit', seedBuy: 40, cropSell: 28, growSec: 1080, yieldQty: 2, shape: 'berry', c1: '#9ad8f0', c2: '#4d7898', donor: 'hollowmere@a7a8e5a', descCrop: 'Quả mọng xanh băng chỉ chín rộ giữa mùa Đông.' });
addSeedAndCropPair({ id: 'green_bean', nameVi: 'Đậu que xanh', group: 'veg', seedBuy: 24, cropSell: 18, growSec: 720, yieldQty: 2, shape: 'vine', c1: '#58b048', c2: '#3c7a2e', donor: 'greens@3f32fd8+hollowmere@a7a8e5a', descCrop: 'Giàn đậu leo cho nhiều trái qua nhiều đợt.' });
addSeedAndCropPair({ id: 'ancient_green', nameVi: 'Mầm cổ đại', group: 'fruit', seedBuy: 120, cropSell: 135, growSec: 3600, yieldQty: 2, shape: 'head', c1: '#42d49a', c2: '#d8ffea', donor: 'greens@3f32fd8', descCrop: 'Giống cây huyền thoại thích nghi bốn mùa và nhà kính.' });

// ---------------------------------------------------------------------------
// 2. Orchard Saplings (12 total incl sapling_peach -> fixes peach gap) + Fruits
// ---------------------------------------------------------------------------
ITEMS_RAW.push({
  sku: 'sapling_peach',
  nameVi: 'Cây giống đào',
  descriptionVi: 'Cây con trồng vào vườn ăn quả, thu hoạch đào định kỳ mỗi mùa Hè hoặc nhà kính.',
  group: 'tree_sapling',
  category: 'tree_sapling',
  milestone: 'V0.2.2',
  storeBuy: 120,
  sellPrice: 40,
  stackLimit: 99,
  sellChannels: ['shipping_bin', 'npc_general'],
  sources: ['shop'],
  uses: ['plant_orchard', 'sell_bin'],
  iconSpec: { shape: 'orchard_sapling', primary: '#f89c78', secondary: '#4d913a' },
  donorSource: 'harvest-hollow@9b23e1a+webfarmville@c420bc2',
});

function addOrchardTree(opts: {
  id: string;
  fruitNameVi: string;
  saplingNameVi: string;
  saplingBuy: number;
  fruitSell: number;
  cycleSec: number;
  cFruit: string;
  cLeaf: string;
  donor: string;
  desc: string;
}) {
  const sapSku = `sapling_${opts.id}`;
  const fruitSku = opts.id === 'cocoa' ? 'cocoa_bean' : opts.id;
  ITEMS_RAW.push({
    sku: sapSku,
    nameVi: opts.saplingNameVi,
    descriptionVi: `Cây giống lâu năm cho quả ${opts.fruitNameVi.toLowerCase()} định kỳ.`,
    group: 'tree_sapling',
    category: 'tree_sapling',
    milestone: 'V0.2.2',
    storeBuy: opts.saplingBuy,
    sellPrice: Math.floor(opts.saplingBuy / 3),
    stackLimit: 99,
    sellChannels: ['shipping_bin', 'npc_general'],
    sources: ['shop'],
    uses: ['plant_orchard', 'sell_bin'],
    iconSpec: { shape: 'orchard_sapling', primary: opts.cFruit, secondary: opts.cLeaf },
    donorSource: opts.donor,
  });
  ITEMS_RAW.push({
    sku: fruitSku,
    nameVi: opts.fruitNameVi,
    descriptionVi: opts.desc,
    group: 'fruit',
    category: 'fruit',
    milestone: 'V0.2.2',
    storeBuy: null,
    sellPrice: opts.fruitSell,
    batchQty: 3,
    batchDurationMs: opts.cycleSec * 1_000,
    laborMilli: 800,
    depreciation: 2,
    inputs: [],
    qualityTiers: ALL_QUALITIES,
    stackLimit: 999,
    sellChannels: MARKET_CROP,
    orderMultiplierBp: 14_500,
    sources: ['orchard'],
    uses: ['workshop_recipe', 'cook_recipe', 'sell_bin', 'order_board', 'gift_partner'],
    iconSpec: { shape: 'round_fruit', primary: opts.cFruit, secondary: opts.cLeaf },
    donorSource: opts.donor,
  });
}

addOrchardTree({ id: 'apple', fruitNameVi: 'Táo đỏ', saplingNameVi: 'Cây giống táo', saplingBuy: 110, fruitSell: 22, cycleSec: 3600, cFruit: '#e23b3b', cLeaf: '#4e9a3a', donor: 'harvest-hollow@9b23e1a+webfarmville@c420bc2', desc: 'Táo giòn ngọt thu từ vườn cây mùa Thu, làm bánh táo rất ngon.' });
addOrchardTree({ id: 'cherry', fruitNameVi: 'Anh đào đỏ', saplingNameVi: 'Cây giống anh đào', saplingBuy: 130, fruitSell: 24, cycleSec: 3600, cFruit: '#b5122e', cLeaf: '#5da544', donor: 'harvest-hollow@9b23e1a+webfarmville@c420bc2', desc: 'Chùm anh đào đỏ mọng nở hoa mùa Xuân.' });
addOrchardTree({ id: 'orange', fruitNameVi: 'Cam vàng', saplingNameVi: 'Cây giống cam', saplingBuy: 140, fruitSell: 26, cycleSec: 4200, cFruit: '#f28c1e', cLeaf: '#3f8f3a', donor: 'harvest-hollow@9b23e1a+webfarmville@c420bc2', desc: 'Cam mọng nước tươi mát chín rộ mùa Hè.' });
addOrchardTree({ id: 'lemon', fruitNameVi: 'Chanh vàng', saplingNameVi: 'Cây giống chanh', saplingBuy: 135, fruitSell: 25, cycleSec: 4200, cFruit: '#ffe14d', cLeaf: '#4c9e3f', donor: 'harvest-hollow@9b23e1a+webfarmville@c420bc2', desc: 'Chanh thơm làm bánh chanh và mứt vỏ chanh.' });
addOrchardTree({ id: 'plum', fruitNameVi: 'Mận tím', saplingNameVi: 'Cây giống mận', saplingBuy: 125, fruitSell: 23, cycleSec: 3900, cFruit: '#8040a0', cLeaf: '#4c8e42', donor: 'harvest-hollow@9b23e1a+hollowmere@a7a8e5a', desc: 'Trái mận chín mọng ngọt dịu nấu mứt mận.' });
addOrchardTree({ id: 'pear', fruitNameVi: 'Lê mật', saplingNameVi: 'Cây giống lê', saplingBuy: 145, fruitSell: 27, cycleSec: 4500, cFruit: '#c8d64e', cLeaf: '#519644', donor: 'harvest-hollow@9b23e1a', desc: 'Lê vàng thơm ngọt thu hoạch từ cành cao.' });
addOrchardTree({ id: 'pomegranate', fruitNameVi: 'Lựu đỏ', saplingNameVi: 'Cây giống lựu', saplingBuy: 160, fruitSell: 30, cycleSec: 5400, cFruit: '#c0213a', cLeaf: '#3f7f36', donor: 'harvest-hollow@9b23e1a+hollowmere@a7a8e5a', desc: 'Hạt lựu đỏ au mùa Thu đậm hương.' });
addOrchardTree({ id: 'fig', fruitNameVi: 'Sung ngọt', saplingNameVi: 'Cây giống sung ngọt', saplingBuy: 165, fruitSell: 31, cycleSec: 5400, cFruit: '#7b4372', cLeaf: '#4b8742', donor: 'harvest-hollow@9b23e1a', desc: 'Trái sung mật làm mứt sung và bánh tart.' });
addOrchardTree({ id: 'walnut', fruitNameVi: 'Óc chó', saplingNameVi: 'Cây giống óc chó', saplingBuy: 155, fruitSell: 29, cycleSec: 4800, cFruit: '#a67449', cLeaf: '#52803a', donor: 'harvest-hollow@9b23e1a', desc: 'Hạt óc chó béo bùi làm bánh quy óc chó giòn.' });
addOrchardTree({ id: 'olive', fruitNameVi: 'Ô liu xanh', saplingNameVi: 'Cây giống ô liu', saplingBuy: 150, fruitSell: 28, cycleSec: 4800, cFruit: '#869e3d', cLeaf: '#627c44', donor: 'harvest-hollow@9b23e1a', desc: 'Trái ô liu ép dầu ô liu thượng hạng tại cối xay.' });
addOrchardTree({ id: 'cocoa', fruitNameVi: 'Hạt ca cao', saplingNameVi: 'Cây giống ca cao', saplingBuy: 180, fruitSell: 34, cycleSec: 6000, cFruit: '#6e3c24', cLeaf: '#3b7d39', donor: 'harvest-hollow@9b23e1a', desc: 'Hạt ca cao quý xay bột ca cao pha sô-cô-la nóng.' });

// ---------------------------------------------------------------------------
// 3. Flowers & Hybrids (Webfarmville 16 blooms + Hollowmere 2 + Lavender)
// ---------------------------------------------------------------------------
function addHybridFlower(sku: string, nameVi: string, desc: string, sellPrice: number, c1: string, c2: string, donor: string) {
  ITEMS_RAW.push({
    sku,
    nameVi,
    descriptionVi: desc,
    group: 'flower',
    category: 'hybrid_flower',
    milestone: 'V0.2.2',
    storeBuy: null,
    sellPrice,
    batchQty: 1,
    batchDurationMs: 1_200_000,
    laborMilli: 700,
    inputs: [],
    qualityTiers: ALL_QUALITIES,
    stackLimit: 999,
    sellChannels: MARKET_FLOWER,
    orderMultiplierBp: 15_500,
    sources: ['flower_breed'],
    uses: ['craft_bouquet', 'workshop_recipe', 'gift_partner', 'sell_bin', 'order_board'],
    iconSpec: { shape: 'flower', primary: c1, secondary: c2, accent: '#5aa644' },
    donorSource: donor,
  });
}

// Base flowers (9 new + rose_pink = 10 planted flowers + seeds)
addSeedAndCropPair({ id: 'tulip_red', nameVi: 'Tulip đỏ', group: 'flower', seedBuy: 18, cropSell: 22, growSec: 600, shape: 'flower', c1: '#e03c4a', c2: '#fff0a6', donor: 'webfarmville@c420bc2', descCrop: 'Tulip đỏ rực trồng cạnh tulip vàng để lai tulip cam.', extraUses: ['craft_bouquet', 'gift_partner', 'sell_bin', 'order_board'] });
addSeedAndCropPair({ id: 'tulip_yellow', nameVi: 'Tulip vàng', group: 'flower', seedBuy: 18, cropSell: 22, growSec: 600, shape: 'flower', c1: '#f5cb36', c2: '#ffffff', donor: 'webfarmville@c420bc2', descCrop: 'Tulip vàng nắng trồng cạnh tulip đỏ tạo giống lai.', extraUses: ['craft_bouquet', 'gift_partner', 'sell_bin', 'order_board'] });
addSeedAndCropPair({ id: 'tulip_pink', nameVi: 'Tulip hồng', group: 'flower', seedBuy: 20, cropSell: 24, growSec: 600, shape: 'flower', c1: '#f489ab', c2: '#ffe4ef', donor: 'webfarmville@c420bc2', descCrop: 'Tulip hồng dịu trồng cạnh tulip tím tạo giống trắng tuyết.', extraUses: ['craft_bouquet', 'gift_partner', 'sell_bin', 'order_board'] });
addSeedAndCropPair({ id: 'tulip_purple', nameVi: 'Tulip tím', group: 'flower', seedBuy: 22, cropSell: 26, growSec: 600, shape: 'flower', c1: '#9b59d0', c2: '#f5d0ff', donor: 'webfarmville@c420bc2', descCrop: 'Tulip tím mộng mơ dùng trong di truyền học hoa.', extraUses: ['craft_bouquet', 'gift_partner', 'sell_bin', 'order_board'] });
addSeedAndCropPair({ id: 'rose_red', nameVi: 'Hồng đỏ', group: 'flower', seedBuy: 24, cropSell: 28, growSec: 720, shape: 'flower', c1: '#d92638', c2: '#911120', donor: 'webfarmville@c420bc2', descCrop: 'Hoa hồng nhung đỏ rực biểu tượng yêu thương.', extraUses: ['craft_bouquet', 'workshop_recipe', 'gift_partner', 'sell_bin', 'order_board'] });
addSeedAndCropPair({ id: 'rose_white', nameVi: 'Hồng trắng', group: 'flower', seedBuy: 24, cropSell: 28, growSec: 720, shape: 'flower', c1: '#fff9f5', c2: '#e2d7d0', donor: 'webfarmville@c420bc2', descCrop: 'Hoa hồng trắng tinh khôi lai cùng hồng phấn thành hồng vàng.', extraUses: ['craft_bouquet', 'gift_partner', 'sell_bin', 'order_board'] });
addSeedAndCropPair({ id: 'lavender', nameVi: 'Oải hương', group: 'flower', seedBuy: 22, cropSell: 26, growSec: 660, shape: 'flower', c1: '#9c7ae0', c2: '#c5b0f5', donor: 'harvest-hollow@9b23e1a', descCrop: 'Nhánh hoa oải hương thơm ngát làm nến và xà phòng.', extraUses: ['workshop_recipe', 'craft_bouquet', 'gift_partner', 'sell_bin'] });
addSeedAndCropPair({ id: 'blue_jazz', nameVi: 'Cúc thanh lam', group: 'flower', seedBuy: 20, cropSell: 25, growSec: 660, shape: 'flower', c1: '#4a7ae8', c2: '#ffe46b', donor: 'hollowmere@a7a8e5a', descCrop: 'Đóa hoa xanh lam dịu mắt nở rộ mỗi độ Xuân về.', extraUses: ['craft_bouquet', 'gift_partner', 'sell_bin', 'order_board'] });
addSeedAndCropPair({ id: 'fairy_rose', nameVi: 'Hồng tiên', group: 'flower', seedBuy: 30, cropSell: 38, growSec: 900, shape: 'flower', c1: '#f0a0d8', c2: '#ffe6fa', donor: 'hollowmere@a7a8e5a', descCrop: 'Đóa hoa ngọt hương nhất mùa Thu quyến rũ bầy ong mật.', extraUses: ['craft_bouquet', 'gift_partner', 'sell_bin', 'order_board'] });

// Hybrids (9 new + rose_sakura = 10 bred hybrids)
addHybridFlower('tulip_orange', 'Tulip cam', 'Tulip lai màu cam rực rỡ từ tulip đỏ và tulip vàng.', 42, '#f5842a', '#ffd068', 'webfarmville@c420bc2');
addHybridFlower('tulip_white', 'Tulip trắng tuyết', 'Tulip tuyết trắng lai từ tulip hồng và tulip tím.', 44, '#f8fafc', '#d5e4ee', 'webfarmville@c420bc2');
addHybridFlower('tulip_black', 'Tulip huyền đêm', 'Tulip đen bí ẩn cực hiếm lai từ tulip tím và trắng.', 68, '#382a45', '#825ca6', 'webfarmville@c420bc2');
addHybridFlower('tulip_rainbow', 'Tulip cầu vồng', 'Tulip đa sắc quý giá bậc nhất vườn hoa.', 95, '#ff6ca8', '#68d5ff', 'webfarmville@c420bc2');
addHybridFlower('rose_yellow', 'Hồng vàng nắng', 'Hoa hồng vàng lai từ hồng trắng và hồng phấn.', 46, '#ffe052', '#f2aa24', 'webfarmville@c420bc2');
addHybridFlower('rose_orange', 'Hồng cam hoàng hôn', 'Hoa hồng cam ấm lai từ hồng đỏ và hồng vàng.', 54, '#f5762e', '#ffc252', 'webfarmville@c420bc2');
addHybridFlower('rose_lavender', 'Hồng oải hương', 'Hoa hồng tím pastel lai từ hồng đỏ và hồng trắng.', 58, '#b58de8', '#edd9ff', 'webfarmville@c420bc2');
addHybridFlower('rose_blue', 'Hồng xanh lam', 'Hoa hồng xanh huyền thoại rất khó lai tạo.', 88, '#4682f0', '#b8dcff', 'webfarmville@c420bc2');
addHybridFlower('rose_gold', 'Hồng vàng kim', 'Báu vật cuối cùng của bộ sưu tập hoa hồng lai.', 120, '#ffd43b', '#fffae0', 'webfarmville@c420bc2');

// ---------------------------------------------------------------------------
// 4. Livestock Feeds, Wild Clover & 14 Animal Products (7 Species)
// ---------------------------------------------------------------------------
ITEMS_RAW.push({
  sku: 'wild_clover',
  nameVi: 'Cỏ ba lá tươi',
  descriptionVi: 'Cỏ non mọc quanh đồng cỏ, nguyên liệu nghiền thức ăn cho gia súc và ủ phân.',
  group: 'material',
  category: 'forage',
  milestone: 'V0.2.2',
  storeBuy: null,
  sellPrice: 4,
  forageable: true,
  laborMilli: 600,
  stackLimit: 999,
  sellChannels: ['shipping_bin', 'npc_general'],
  sources: ['foraging'],
  uses: ['workshop_recipe', 'feed_livestock', 'sell_bin'],
  iconSpec: { shape: 'herb_bundle', primary: '#4caf50', secondary: '#a5d6a7' },
  donorSource: 'harvest-hollow@9b23e1a',
});

function addAnimalProduct(sku: string, nameVi: string, desc: string, sellPrice: number, shape: ProceduralIconShape, c1: string, c2: string, donor: string) {
  ITEMS_RAW.push({
    sku,
    nameVi,
    descriptionVi: desc,
    group: 'animal_product',
    category: 'animal_product',
    milestone: 'V0.2.2',
    storeBuy: null,
    sellPrice,
    batchQty: 1,
    batchDurationMs: 1_800_000,
    laborMilli: 600,
    inputs: [],
    qualityTiers: ALL_QUALITIES,
    stackLimit: 999,
    sellChannels: MARKET_ARTISAN,
    orderMultiplierBp: 14_500,
    sources: ['livestock'],
    uses: ['workshop_recipe', 'cook_recipe', 'sell_bin', 'order_board', 'gift_partner'],
    iconSpec: { shape, primary: c1, secondary: c2 },
    donorSource: donor,
  });
}

addAnimalProduct('egg', 'Trứng gà tươi', 'Trứng gà mái thu nhặt mỗi sáng trong chuồng gà.', 16, 'animal_egg', '#fff5e0', '#e6cca5', 'harvest-hollow@9b23e1a+webfarmville@c420bc2');
addAnimalProduct('golden_egg', 'Trứng vàng quý', 'Quả trứng lấp lánh từ cô gà được chăm sóc hạnh phúc.', 42, 'animal_egg', '#ffd54f', '#fff3b0', 'harvest-hollow@9b23e1a');
addAnimalProduct('duck_egg', 'Trứng vịt', 'Trứng vịt béo ngậy rất hợp nướng bánh thơm.', 22, 'animal_egg', '#d8f0e4', '#a7cfb8', 'harvest-hollow@9b23e1a');
addAnimalProduct('duck_feather', 'Lông vịt óng mượt', 'Cọng lông vũ mềm mại đan gối ôm ấm áp.', 38, 'animal_feather', '#64b5f6', '#c5e1a5', 'webfarmville@c420bc2+harvest-hollow@9b23e1a');
addAnimalProduct('milk', 'Sữa bò tươi', 'Bình sữa bò tươi nguyên chất ép bơ và phô mai.', 28, 'animal_milk', '#ffffff', '#b8dcf2', 'harvest-hollow@9b23e1a+webfarmville@c420bc2');
addAnimalProduct('cream_top', 'Váng sữa thượng hạng', 'Phần kem sữa béo mịn đánh kem tươi và kem lạnh.', 52, 'animal_milk', '#fff9e6', '#f2cf78', 'harvest-hollow@9b23e1a');
addAnimalProduct('goat_milk', 'Sữa dê béo', 'Sữa dê thơm nhẹ chế biến phô mai dê thủ công.', 34, 'animal_milk', '#f8f5ec', '#c9d8b6', 'harvest-hollow@9b23e1a+webfarmville@c420bc2');
addAnimalProduct('aged_curd', 'Sữa đông đặc sản', 'Khối sữa đông ủ lâu ngày quý hiếm trong xưởng sữa.', 60, 'cheese_wheel', '#f5e1a4', '#d9b566', 'harvest-hollow@9b23e1a');
addAnimalProduct('wool', 'Lông cừu mịn', 'Cuộn lông cừu xốp mềm xe sợi tại khung cửi.', 32, 'animal_wool', '#f7f4eb', '#d8d0c1', 'harvest-hollow@9b23e1a+webfarmville@c420bc2');
addAnimalProduct('fine_fleece', 'Lông cừu tơ', 'Sợi lông cừu thượng phẩm dệt khăn và chăn ấm.', 58, 'animal_wool', '#fffdf8', '#e6c88a', 'harvest-hollow@9b23e1a');
addAnimalProduct('angora_wool', 'Lông thỏ Angora', 'Sợi lông thỏ trắng muốt nhẹ tựa mây.', 36, 'animal_wool', '#fff6fa', '#f2c9db', 'harvest-hollow@9b23e1a+webfarmville@c420bc2');
addAnimalProduct('silky_tuft', 'Bông lụa Angora', 'Nhúm lông thỏ quý siêu mịn đan găng tay.', 64, 'animal_wool', '#fce4ec', '#ffd5e5', 'harvest-hollow@9b23e1a');
addAnimalProduct('honey', 'Mật ong hoa rừng', 'Hũ mật ong vàng sánh ngọt ngào từ nhà ong.', 36, 'animal_honey', '#f6b128', '#ffe07d', 'harvest-hollow@9b23e1a+webfarmville@c420bc2');
addAnimalProduct('beeswax', 'Sáp ong thơm', 'Khối sáp ong nguyên chất đổ nến thơm thủ công.', 44, 'cheese_wheel', '#f2c44d', '#d6971c', 'harvest-hollow@9b23e1a');

// Livestock Feeds (V0.3.0 because oats/corn/honey come from V0.2.2)
ITEMS_RAW.push(
  {
    sku: 'feed_chicken',
    nameVi: 'Cám gà vịt',
    descriptionVi: 'Thức ăn tổng hợp cho gà và vịt ăn hằng ngày.',
    group: 'feed',
    category: 'livestock_feed',
    milestone: 'V0.3.0',
    storeBuy: 16,
    sellPrice: 6,
    batchQty: 4,
    batchDurationMs: 60_000,
    laborMilli: 300,
    inputs: [{ sku: 'wheat', qty: 2 }, { sku: 'corn', qty: 1 }],
    stackLimit: 999,
    sources: ['workshop', 'shop'],
    uses: ['feed_livestock', 'sell_bin'],
    iconSpec: { shape: 'animal_feed', primary: '#e8c456', secondary: '#b88232' },
    donorSource: 'harvest-hollow@9b23e1a',
  },
  {
    sku: 'feed_livestock',
    nameVi: 'Cỏ trộn bò dê cừu',
    descriptionVi: 'Khẩu phần cỏ dinh dưỡng cho bò, dê và cừu.',
    group: 'feed',
    category: 'livestock_feed',
    milestone: 'V0.3.0',
    storeBuy: 22,
    sellPrice: 8,
    batchQty: 4,
    batchDurationMs: 90_000,
    laborMilli: 350,
    inputs: [{ sku: 'oats', qty: 2 }, { sku: 'wild_clover', qty: 2 }],
    stackLimit: 999,
    sources: ['workshop', 'shop'],
    uses: ['feed_livestock', 'sell_bin'],
    iconSpec: { shape: 'animal_feed', primary: '#7cc04f', secondary: '#d8c27a' },
    donorSource: 'harvest-hollow@9b23e1a',
  },
  {
    sku: 'feed_rabbit',
    nameVi: 'Rau củ cho thỏ',
    descriptionVi: 'Hỗn hợp cà rốt và rau xanh tươi ngon cho thỏ Angora.',
    group: 'feed',
    category: 'livestock_feed',
    milestone: 'V0.3.0',
    storeBuy: 20,
    sellPrice: 7,
    batchQty: 4,
    batchDurationMs: 60_000,
    laborMilli: 300,
    inputs: [{ sku: 'carrot', qty: 1 }, { sku: 'lettuce', qty: 1 }],
    stackLimit: 999,
    sources: ['workshop', 'shop'],
    uses: ['feed_livestock', 'sell_bin'],
    iconSpec: { shape: 'animal_feed', primary: '#f08a2c', secondary: '#7cc04f' },
    donorSource: 'harvest-hollow@9b23e1a',
  },
  {
    sku: 'feed_deluxe',
    nameVi: 'Thức ăn thượng hạng',
    descriptionVi: 'Khẩu phần đặc biệt tăng hạnh phúc và tỉ lệ sản phẩm vàng.',
    group: 'feed',
    category: 'livestock_feed',
    milestone: 'V0.3.0',
    storeBuy: 46,
    sellPrice: 18,
    batchQty: 4,
    batchDurationMs: 120_000,
    laborMilli: 500,
    inputs: [{ sku: 'corn', qty: 1 }, { sku: 'oats', qty: 1 }, { sku: 'honey', qty: 1 }],
    stackLimit: 999,
    sources: ['workshop', 'shop'],
    uses: ['feed_livestock', 'sell_bin'],
    iconSpec: { shape: 'animal_feed', primary: '#f6b128', secondary: '#e8c456', accent: '#fff4b8' },
    donorSource: 'webfarmville@c420bc2',
  },
);

// ---------------------------------------------------------------------------
// 5. Fertilizers (4), Sprinklers (3), Tool Upgrades (10)
// ---------------------------------------------------------------------------
ITEMS_RAW.push(
  {
    sku: 'fert_compost',
    nameVi: 'Phân hữu cơ',
    descriptionVi: 'Bón vào ô đất giúp tăng cơ hội thu hoạch nông sản hạng Bạc và Vàng.',
    group: 'fertilizer',
    category: 'fertilizer',
    milestone: 'V0.3.0',
    storeBuy: 24,
    sellPrice: 8,
    batchQty: 2,
    batchDurationMs: 60_000,
    laborMilli: 250,
    inputs: [{ sku: 'wild_clover', qty: 2 }, { sku: 'wild_herb', qty: 1 }],
    stackLimit: 999,
    sources: ['workshop', 'shop'],
    uses: ['fertilize', 'workshop_recipe', 'sell_bin'],
    iconSpec: { shape: 'fertilizer', primary: '#8c6239', secondary: '#60a848' },
    donorSource: 'greens@3f32fd8',
  },
  {
    sku: 'fert_speed',
    nameVi: 'Phân kích thích lớn nhanh',
    descriptionVi: 'Tăng tốc sinh trưởng cây trồng thêm 30% trong suốt vụ.',
    group: 'fertilizer',
    category: 'fertilizer',
    milestone: 'V0.3.0',
    storeBuy: 36,
    sellPrice: 14,
    batchQty: 2,
    batchDurationMs: 90_000,
    laborMilli: 300,
    inputs: [{ sku: 'wild_herb', qty: 2 }, { sku: 'wood_branch', qty: 1 }],
    stackLimit: 999,
    sources: ['workshop', 'shop'],
    uses: ['fertilize', 'workshop_recipe', 'sell_bin'],
    iconSpec: { shape: 'fertilizer', primary: '#4db6ac', secondary: '#ffd54f' },
    donorSource: 'greens@3f32fd8+hollowmere@a7a8e5a',
  },
  {
    sku: 'fert_quality',
    nameVi: 'Phân bón thượng hạng',
    descriptionVi: 'Cải tạo đất chuyên sâu tăng mạnh tỉ lệ thu hoạch hạng Vàng.',
    group: 'fertilizer',
    category: 'fertilizer',
    milestone: 'V0.3.0',
    storeBuy: 52,
    sellPrice: 20,
    batchQty: 2,
    batchDurationMs: 120_000,
    laborMilli: 400,
    inputs: [{ sku: 'fert_compost', qty: 1 }, { sku: 'wood_branch', qty: 2 }],
    stackLimit: 999,
    sources: ['workshop', 'shop'],
    uses: ['fertilize', 'workshop_recipe', 'sell_bin'],
    iconSpec: { shape: 'fertilizer', primary: '#f5b041', secondary: '#a04000' },
    donorSource: 'greens@3f32fd8+hollowmere@a7a8e5a',
  },
  {
    sku: 'fert_deluxe',
    nameVi: 'Phân hỗn hợp toàn năng',
    descriptionVi: 'Vừa thúc lớn nhanh vừa tăng chất lượng và giữ ẩm lâu hơn.',
    group: 'fertilizer',
    category: 'fertilizer',
    milestone: 'V0.3.0',
    storeBuy: 90,
    sellPrice: 36,
    batchQty: 1,
    batchDurationMs: 150_000,
    laborMilli: 500,
    inputs: [{ sku: 'fert_quality', qty: 1 }, { sku: 'fert_speed', qty: 1 }],
    stackLimit: 999,
    sources: ['workshop', 'shop'],
    uses: ['fertilize', 'sell_bin'],
    iconSpec: { shape: 'fertilizer', primary: '#9b59b6', secondary: '#f1c40f' },
    donorSource: 'greens@3f32fd8',
  },
  // Sprinklers
  {
    sku: 'sprinkler_basic',
    nameVi: 'Vòi phun cơ bản',
    descriptionVi: 'Tự động tưới 4 ô vuông kề cạnh mỗi buổi sáng.',
    group: 'sprinkler',
    category: 'sprinkler',
    milestone: 'V0.2.2',
    storeBuy: 160,
    sellPrice: 70,
    stackLimit: 99,
    sources: ['shop'],
    uses: ['irrigate', 'sell_bin'],
    iconSpec: { shape: 'sprinkler', primary: '#c87542', secondary: '#5ec8f2' },
    donorSource: 'greens@3f32fd8+hollowmere@a7a8e5a',
  },
  {
    sku: 'sprinkler_quality',
    nameVi: 'Vòi phun 3×3',
    descriptionVi: 'Tự động tưới toàn bộ vùng 3×3 quanh điểm đặt.',
    group: 'sprinkler',
    category: 'sprinkler',
    milestone: 'V0.2.2',
    storeBuy: 360,
    sellPrice: 150,
    stackLimit: 99,
    sources: ['shop'],
    uses: ['irrigate', 'sell_bin'],
    iconSpec: { shape: 'sprinkler', primary: '#b0bec5', secondary: '#4fc3f7' },
    donorSource: 'greens@3f32fd8+hollowmere@a7a8e5a',
  },
  {
    sku: 'sprinkler_iridium',
    nameVi: 'Vòi phun cao cấp 5×5',
    descriptionVi: 'Hệ thống tưới tự động phủ rộng 5×5 cho trang trại lớn.',
    group: 'sprinkler',
    category: 'sprinkler',
    milestone: 'V0.2.2',
    storeBuy: 780,
    sellPrice: 320,
    stackLimit: 99,
    sources: ['shop'],
    uses: ['irrigate', 'sell_bin'],
    iconSpec: { shape: 'sprinkler', primary: '#7e57c2', secondary: '#80deea' },
    donorSource: 'greens@3f32fd8+hollowmere@a7a8e5a',
  },
  // Upgradable tool SKUs
  {
    sku: 'tool_can_copper',
    nameVi: 'Bình tưới đồng (2 ô)',
    descriptionVi: 'Nâng cấp bình tưới đồng tưới cùng lúc 2 ô trước mặt.',
    group: 'tool',
    category: 'tool',
    milestone: 'V0.2.2',
    storeBuy: 320,
    sellPrice: 120,
    stackLimit: 1,
    sources: ['shop'],
    uses: ['tool_upgrade'],
    iconSpec: { shape: 'tool_can', primary: '#d27a44', secondary: '#9a4f25' },
    donorSource: 'greens@3f32fd8',
  },
  {
    sku: 'tool_can_iron',
    nameVi: 'Bình tưới thép (2×2)',
    descriptionVi: 'Bình tưới thép tưới trọn cụm 2×2 chỉ trong một nhịp.',
    group: 'tool',
    category: 'tool',
    milestone: 'V0.2.2',
    storeBuy: 680,
    sellPrice: 260,
    stackLimit: 1,
    sources: ['shop'],
    uses: ['tool_upgrade'],
    iconSpec: { shape: 'tool_can', primary: '#9fb4c7', secondary: '#60768a' },
    donorSource: 'harvest-hollow@9b23e1a+greens@3f32fd8',
  },
  {
    sku: 'tool_can_gold',
    nameVi: 'Bình tưới vàng (3×3)',
    descriptionVi: 'Bình tưới vàng lớn phủ nước đều 3×3 ô đất.',
    group: 'tool',
    category: 'tool',
    milestone: 'V0.2.2',
    storeBuy: 1400,
    sellPrice: 520,
    stackLimit: 1,
    sources: ['shop'],
    uses: ['tool_upgrade'],
    iconSpec: { shape: 'tool_can', primary: '#f5c542', secondary: '#c9931c' },
    donorSource: 'harvest-hollow@9b23e1a',
  },
  {
    sku: 'tool_hoe_copper',
    nameVi: 'Cuốc đồng (2 ô)',
    descriptionVi: 'Cuốc đất đồng khai khẩn nhanh hơn hai ô mỗi lần.',
    group: 'tool',
    category: 'tool',
    milestone: 'V0.2.2',
    storeBuy: 300,
    sellPrice: 110,
    stackLimit: 1,
    sources: ['shop'],
    uses: ['tool_upgrade'],
    iconSpec: { shape: 'tool_hoe', primary: '#d27a44', secondary: '#7a5230' },
    donorSource: 'greens@3f32fd8',
  },
  {
    sku: 'tool_hoe_iron',
    nameVi: 'Cuốc thép (2×2)',
    descriptionVi: 'Cuốc thép làm luống gọn gàng vùng 2×2.',
    group: 'tool',
    category: 'tool',
    milestone: 'V0.2.2',
    storeBuy: 640,
    sellPrice: 240,
    stackLimit: 1,
    sources: ['shop'],
    uses: ['tool_upgrade'],
    iconSpec: { shape: 'tool_hoe', primary: '#9fb4c7', secondary: '#7a5230' },
    donorSource: 'greens@3f32fd8',
  },
  {
    sku: 'tool_hoe_gold',
    nameVi: 'Cuốc vàng (3×3)',
    descriptionVi: 'Cuốc vàng mở luống 3×3 trong tích tắc.',
    group: 'tool',
    category: 'tool',
    milestone: 'V0.2.2',
    storeBuy: 1320,
    sellPrice: 500,
    stackLimit: 1,
    sources: ['shop'],
    uses: ['tool_upgrade'],
    iconSpec: { shape: 'tool_hoe', primary: '#f5c542', secondary: '#7a5230' },
    donorSource: 'greens@3f32fd8',
  },
  {
    sku: 'tool_sickle_wide',
    nameVi: 'Liềm rộng (2×2)',
    descriptionVi: 'Liềm thu hoạch nhanh vùng 2×2 nông sản chín.',
    group: 'tool',
    category: 'tool',
    milestone: 'V0.2.2',
    storeBuy: 720,
    sellPrice: 280,
    stackLimit: 1,
    sources: ['shop'],
    uses: ['tool_upgrade'],
    iconSpec: { shape: 'tool_sickle', primary: '#b0bec5', secondary: '#8c5a32' },
    donorSource: 'harvest-hollow@9b23e1a',
  },
  {
    sku: 'tool_sickle_grand',
    nameVi: 'Đại liềm vàng (3×3)',
    descriptionVi: 'Thu hoạch đồng loạt 3×3 không bỏ sót bông hoa hay trái chín.',
    group: 'tool',
    category: 'tool',
    milestone: 'V0.2.2',
    storeBuy: 1500,
    sellPrice: 580,
    stackLimit: 1,
    sources: ['shop'],
    uses: ['tool_upgrade'],
    iconSpec: { shape: 'tool_sickle', primary: '#f5c542', secondary: '#8c5a32' },
    donorSource: 'harvest-hollow@9b23e1a',
  },
  {
    sku: 'tool_seed_spreader',
    nameVi: 'Khay gieo hạt (2×2)',
    descriptionVi: 'Gieo hạt đều cả 4 ô cùng loại chỉ trong một chạm.',
    group: 'tool',
    category: 'tool',
    milestone: 'V0.2.2',
    storeBuy: 820,
    sellPrice: 310,
    stackLimit: 1,
    sources: ['shop'],
    uses: ['tool_upgrade'],
    iconSpec: { shape: 'tool_basket', primary: '#a67b4d', secondary: '#7cc04f' },
    donorSource: 'harvest-hollow@9b23e1a',
  },
  {
    sku: 'tool_basket_orchard',
    nameVi: 'Giỏ hái cây ăn quả',
    descriptionVi: 'Giỏ mây đan giúp rung cây và thu quả rơi gọn nhẹ.',
    group: 'tool',
    category: 'tool',
    milestone: 'V0.2.2',
    storeBuy: 480,
    sellPrice: 180,
    stackLimit: 1,
    sources: ['shop'],
    uses: ['tool_upgrade'],
    iconSpec: { shape: 'tool_basket', primary: '#c9935b', secondary: '#8c5f34' },
    donorSource: 'harvest-hollow@9b23e1a',
  },
);

// ---------------------------------------------------------------------------
// 6. Pantry Staples & All 8 Workshops + Kitchen Artisan Goods (75+ items)
// ---------------------------------------------------------------------------
ITEMS_RAW.push(
  {
    sku: 'sea_salt',
    nameVi: 'Muối biển tinh',
    descriptionVi: 'Muối trắng hạt mịn để muối dưa và ướp gia vị.',
    group: 'pantry',
    category: 'pantry',
    milestone: 'V0.3.0',
    storeBuy: 8,
    sellPrice: 4,
    stackLimit: 999,
    sources: ['shop'],
    uses: ['workshop_recipe', 'cook_recipe', 'sell_bin'],
    iconSpec: { shape: 'flour_sack', primary: '#f4f8fc', secondary: '#9fc8e8' },
    donorSource: 'harvest-hollow@9b23e1a',
  },
  {
    sku: 'yeast',
    nameVi: 'Men nở làm bánh',
    descriptionVi: 'Men ủ bột giúp bánh mì và bánh sừng bò nở xốp.',
    group: 'pantry',
    category: 'pantry',
    milestone: 'V0.3.0',
    storeBuy: 10,
    sellPrice: 5,
    stackLimit: 999,
    sources: ['shop'],
    uses: ['workshop_recipe', 'sell_bin'],
    iconSpec: { shape: 'jam_jar', primary: '#d9b589', secondary: '#8c6239' },
    donorSource: 'harvest-hollow@9b23e1a',
  },
  {
    sku: 'vinegar',
    nameVi: 'Giấm gạo lên men',
    descriptionVi: 'Giấm thơm dùng muối chua rau củ tại xưởng đồ hộp.',
    group: 'pantry',
    category: 'pantry',
    milestone: 'V0.3.0',
    storeBuy: 12,
    sellPrice: 6,
    stackLimit: 999,
    sources: ['shop'],
    uses: ['workshop_recipe', 'cook_recipe', 'sell_bin'],
    iconSpec: { shape: 'bottle_oil', primary: '#e6be7a', secondary: '#a66d2e' },
    donorSource: 'hollowmere@a7a8e5a',
  },
  {
    sku: 'vanilla_bean',
    nameVi: 'Trái vani thơm',
    descriptionVi: 'Hương vani ngọt dịu làm kem lạnh và bánh ngọt.',
    group: 'pantry',
    category: 'pantry',
    milestone: 'V0.3.0',
    storeBuy: 20,
    sellPrice: 10,
    stackLimit: 999,
    sources: ['shop'],
    uses: ['workshop_recipe', 'cook_recipe', 'sell_bin'],
    iconSpec: { shape: 'herb_bundle', primary: '#4a2e1d', secondary: '#8c6239' },
    donorSource: 'webfarmville@c420bc2',
  },
);

function addArtisanItem(opts: {
  sku: string;
  nameVi: string;
  desc: string;
  group?: ItemGroup;
  category: string;
  sellPrice: number;
  batchQty?: number;
  sec: number;
  inputs: readonly ItemRecipeInput[];
  shape: ProceduralIconShape;
  c1: string;
  c2: string;
  c3?: string;
  donor: string;
  uses?: readonly string[];
}) {
  ITEMS_RAW.push({
    sku: opts.sku,
    nameVi: opts.nameVi,
    descriptionVi: opts.desc,
    group: opts.group ?? 'artisan',
    category: opts.category,
    milestone: 'V0.3.0',
    storeBuy: null,
    sellPrice: opts.sellPrice,
    batchQty: opts.batchQty ?? 1,
    batchDurationMs: opts.sec * 1_000,
    laborMilli: 900,
    depreciation: 1,
    inputs: opts.inputs,
    qualityTiers: ['normal', 'silver', 'gold'],
    stackLimit: 99,
    sellChannels: MARKET_ARTISAN,
    orderMultiplierBp: 15_500,
    sources: [opts.category === 'dish' ? 'cooking' : 'workshop'],
    uses: opts.uses ?? ['sell_bin', 'order_board', 'gift_partner'],
    iconSpec: { shape: opts.shape, primary: opts.c1, secondary: opts.c2, accent: opts.c3 },
    donorSource: opts.donor,
  });
}

// Workshop 1: Flour & Oil Mill (8 new + existing `flour` = 9)
addArtisanItem({ sku: 'cornmeal', nameVi: 'Bột bắp', desc: 'Bột bắp xay vàng mịn nướng bánh ngô giòn.', category: 'mill', sellPrice: 28, sec: 60, inputs: [{ sku: 'corn', qty: 1 }], shape: 'flour_sack', c1: '#f5d24c', c2: '#d4a62a', donor: 'harvest-hollow@9b23e1a', uses: ['workshop_recipe', 'cook_recipe', 'sell_bin', 'order_board'] });
addArtisanItem({ sku: 'oat_flour', nameVi: 'Bột yến mạch', desc: 'Bột yến mạch dinh dưỡng nướng bánh quy mật ong.', category: 'mill', sellPrice: 26, sec: 60, inputs: [{ sku: 'oats', qty: 1 }], shape: 'flour_sack', c1: '#e6d8b4', c2: '#bfa97e', donor: 'harvest-hollow@9b23e1a', uses: ['workshop_recipe', 'sell_bin', 'order_board'] });
addArtisanItem({ sku: 'potato_starch', nameVi: 'Tinh bột khoai tây', desc: 'Tinh bột làm sánh súp và bánh mì mềm.', category: 'mill', sellPrice: 24, sec: 60, inputs: [{ sku: 'potato', qty: 1 }], shape: 'flour_sack', c1: '#f7f5ee', c2: '#cfc8b4', donor: 'greens@3f32fd8', uses: ['workshop_recipe', 'cook_recipe', 'sell_bin'] });
addArtisanItem({ sku: 'beet_sugar', nameVi: 'Đường củ dền', desc: 'Đường tự nhiên kết tinh từ củ dền đỏ mùa Thu.', category: 'mill', sellPrice: 38, sec: 90, inputs: [{ sku: 'beet', qty: 1 }], shape: 'flour_sack', c1: '#fde8f0', c2: '#d87098', donor: 'harvest-hollow@9b23e1a', uses: ['workshop_recipe', 'cook_recipe', 'sell_bin'] });
addArtisanItem({ sku: 'paprika_powder', nameVi: 'Bột ớt paprika', desc: 'Gia vị ớt đỏ xay mịn màu sắc rực rỡ.', category: 'mill', sellPrice: 26, sec: 90, inputs: [{ sku: 'hot_pepper', qty: 1 }], shape: 'jam_jar', c1: '#d93829', c2: '#a62116', donor: 'harvest-hollow@9b23e1a', uses: ['cook_recipe', 'workshop_recipe', 'sell_bin'] });
addArtisanItem({ sku: 'olive_oil', nameVi: 'Dầu ô liu', desc: 'Dầu ô liu ép lạnh vàng sánh thơm dịu.', category: 'mill', sellPrice: 44, sec: 120, inputs: [{ sku: 'olive', qty: 1 }], shape: 'bottle_oil', c1: '#c6d63b', c2: '#8a991c', donor: 'harvest-hollow@9b23e1a', uses: ['workshop_recipe', 'cook_recipe', 'sell_bin', 'order_board'] });
addArtisanItem({ sku: 'sunflower_oil', nameVi: 'Dầu hướng dương', desc: 'Dầu thực vật thanh nhẹ chiên rán các món bếp.', category: 'mill', sellPrice: 38, sec: 120, inputs: [{ sku: 'sunflower', qty: 1 }], shape: 'bottle_oil', c1: '#ffd43b', c2: '#d9a416', donor: 'harvest-hollow@9b23e1a', uses: ['workshop_recipe', 'cook_recipe', 'sell_bin', 'order_board'] });
addArtisanItem({ sku: 'cocoa_powder', nameVi: 'Bột ca cao', desc: 'Bột ca cao rang xay đậm đà hương sô-cô-la.', category: 'mill', sellPrice: 52, sec: 120, inputs: [{ sku: 'cocoa_bean', qty: 1 }], shape: 'flour_sack', c1: '#6e3c24', c2: '#472312', donor: 'harvest-hollow@9b23e1a', uses: ['workshop_recipe', 'cook_recipe', 'sell_bin'] });

// Workshop 2: Dairy Workshop (8)
addArtisanItem({ sku: 'butter', nameVi: 'Bơ tươi', desc: 'Thanh bơ vàng thơm ngậy đánh từ sữa bò tươi.', category: 'dairy', sellPrice: 44, sec: 90, inputs: [{ sku: 'milk', qty: 1 }], shape: 'butter_bar', c1: '#ffe67a', c2: '#e6b82e', donor: 'harvest-hollow@9b23e1a+webfarmville@c420bc2', uses: ['workshop_recipe', 'cook_recipe', 'sell_bin', 'order_board'] });
addArtisanItem({ sku: 'cheese', nameVi: 'Phô mai vàng', desc: 'Bánh phô mai ủ vừa chín mềm béo.', category: 'dairy', sellPrice: 52, sec: 120, inputs: [{ sku: 'milk', qty: 1 }, { sku: 'sea_salt', qty: 1 }], shape: 'cheese_wheel', c1: '#ffd242', c2: '#d99a16', donor: 'harvest-hollow@9b23e1a+webfarmville@c420bc2', uses: ['workshop_recipe', 'cook_recipe', 'sell_bin', 'order_board'] });
addArtisanItem({ sku: 'goat_cheese', nameVi: 'Phô mai dê', desc: 'Phô mai dê trắng ngần vị thơm đặc trưng.', category: 'dairy', sellPrice: 60, sec: 150, inputs: [{ sku: 'goat_milk', qty: 1 }, { sku: 'sea_salt', qty: 1 }], shape: 'cheese_wheel', c1: '#f8f5ec', c2: '#d8cfb8', donor: 'harvest-hollow@9b23e1a', uses: ['workshop_recipe', 'sell_bin', 'order_board', 'gift_partner'] });
addArtisanItem({ sku: 'yogurt', nameVi: 'Sữa chua trái cây', desc: 'Sữa chua lên men dịu mát ăn kèm việt quất.', category: 'dairy', sellPrice: 64, sec: 120, inputs: [{ sku: 'milk', qty: 1 }, { sku: 'blueberry', qty: 1 }], shape: 'cup_drink', c1: '#f4f0ff', c2: '#4d5bd6', donor: 'harvest-hollow@9b23e1a', uses: ['sell_bin', 'order_board', 'gift_partner'] });
addArtisanItem({ sku: 'whipped_cream', nameVi: 'Kem tươi đánh bông', desc: 'Kem tươi bông mịn phủ lên các loại bánh.', category: 'dairy', sellPrice: 74, sec: 120, inputs: [{ sku: 'cream_top', qty: 1 }, { sku: 'sugar_pack', qty: 1 }], shape: 'cup_drink', c1: '#ffffff', c2: '#f5e1e8', donor: 'webfarmville@c420bc2', uses: ['workshop_recipe', 'cook_recipe', 'sell_bin'] });
addArtisanItem({ sku: 'herb_butter', nameVi: 'Bơ thảo mộc', desc: 'Bơ ướp húng quế tươi dùng ăn với bánh mì nóng.', category: 'dairy', sellPrice: 78, sec: 150, inputs: [{ sku: 'butter', qty: 1 }, { sku: 'basil', qty: 1 }], shape: 'butter_bar', c1: '#e8f09a', c2: '#559c3c', donor: 'webfarmville@c420bc2', uses: ['cook_recipe', 'sell_bin', 'order_board'] });
addArtisanItem({ sku: 'honey_ice_cream', nameVi: 'Kem vani mật ong', desc: 'Kem lạnh vani rưới mật ong ngọt thanh.', category: 'dairy', sellPrice: 125, sec: 180, inputs: [{ sku: 'cream_top', qty: 1 }, { sku: 'honey', qty: 1 }, { sku: 'vanilla_bean', qty: 1 }], shape: 'cup_drink', c1: '#fff4cf', c2: '#f6b128', donor: 'harvest-hollow@9b23e1a', uses: ['sell_bin', 'order_board', 'gift_partner'] });
addArtisanItem({ sku: 'chocolate_truffle', nameVi: 'Kẹo nấm sô-cô-la', desc: 'Viên sô-cô-la mềm tan chảy ngọt ngào làm quà tặng.', category: 'dairy', sellPrice: 178, sec: 210, inputs: [{ sku: 'cocoa_powder', qty: 1 }, { sku: 'butter', qty: 1 }, { sku: 'cream_top', qty: 1 }], shape: 'chocolate_bar', c1: '#5a2d1b', c2: '#d9a468', donor: 'harvest-hollow@9b23e1a', uses: ['sell_bin', 'order_board', 'gift_partner'] });

// Workshop 3: Bakery (12)
addArtisanItem({ sku: 'bread', nameVi: 'Bánh mì ổ', desc: 'Ổ bánh mì vàng giòn mới ra lò buổi sáng.', category: 'bakery', sellPrice: 36, sec: 90, inputs: [{ sku: 'flour', qty: 1 }, { sku: 'yeast', qty: 1 }], shape: 'bread_loaf', c1: '#e09a48', c2: '#a86522', donor: 'harvest-hollow@9b23e1a', uses: ['workshop_recipe', 'cook_recipe', 'sell_bin', 'order_board'] });
addArtisanItem({ sku: 'potato_bread', nameVi: 'Bánh mì khoai tây', desc: 'Bánh mì mềm xốp với khoai tây nghiền thơm béo.', category: 'bakery', sellPrice: 64, sec: 120, inputs: [{ sku: 'flour', qty: 1 }, { sku: 'potato_starch', qty: 1 }, { sku: 'yeast', qty: 1 }], shape: 'bread_loaf', c1: '#e6b868', c2: '#b88234', donor: 'harvest-hollow@9b23e1a', uses: ['sell_bin', 'order_board', 'gift_partner'] });
addArtisanItem({ sku: 'cornbread', nameVi: 'Bánh bắp nướng', desc: 'Bánh nướng bột ngô và trứng gà nóng hổi.', category: 'bakery', sellPrice: 86, sec: 120, inputs: [{ sku: 'cornmeal', qty: 1 }, { sku: 'egg', qty: 1 }, { sku: 'milk', qty: 1 }], shape: 'pie_slice', c1: '#f5d24c', c2: '#c98e26', donor: 'greens@3f32fd8', uses: ['sell_bin', 'order_board', 'gift_partner'] });
addArtisanItem({ sku: 'apple_pie', nameVi: 'Bánh táo nướng', desc: 'Bánh táo giòn rụm thơm bơ đường quen thuộc.', category: 'bakery', sellPrice: 112, sec: 180, inputs: [{ sku: 'flour', qty: 1 }, { sku: 'apple', qty: 2 }, { sku: 'butter', qty: 1 }], shape: 'pie_slice', c1: '#e23b3b', c2: '#e8b86a', donor: 'harvest-hollow@9b23e1a+webfarmville@c420bc2', uses: ['sell_bin', 'order_board', 'gift_partner'] });
addArtisanItem({ sku: 'pumpkin_pie', nameVi: 'Bánh bí ngô', desc: 'Bánh bí ngô thơm quế gia vị cho mùa Thu.', category: 'bakery', sellPrice: 132, sec: 180, inputs: [{ sku: 'flour', qty: 1 }, { sku: 'pumpkin', qty: 1 }, { sku: 'egg', qty: 1 }], shape: 'pie_slice', c1: '#f2852a', c2: '#d9a468', donor: 'harvest-hollow@9b23e1a+greens@3f32fd8', uses: ['sell_bin', 'order_board', 'gift_partner'] });
addArtisanItem({ sku: 'cherry_pie', nameVi: 'Bánh anh đào', desc: 'Bánh nhân anh đào chua ngọt sóng sánh.', category: 'bakery', sellPrice: 116, sec: 180, inputs: [{ sku: 'flour', qty: 1 }, { sku: 'cherry', qty: 2 }, { sku: 'butter', qty: 1 }], shape: 'pie_slice', c1: '#b5122e', c2: '#f0c478', donor: 'harvest-hollow@9b23e1a', uses: ['sell_bin', 'order_board', 'gift_partner'] });
addArtisanItem({ sku: 'peach_cobbler', nameVi: 'Bánh đào nướng giòn', desc: 'Đào chín nướng dưới lớp vỏ bơ vàng ươm.', category: 'bakery', sellPrice: 116, sec: 160, inputs: [{ sku: 'flour', qty: 1 }, { sku: 'peach', qty: 2 }, { sku: 'butter', qty: 1 }], shape: 'pie_slice', c1: '#f89c78', c2: '#e6b868', donor: 'harvest-hollow@9b23e1a', uses: ['sell_bin', 'order_board', 'gift_partner'] });
addArtisanItem({ sku: 'blueberry_muffin', nameVi: 'Bánh muffin việt quất', desc: 'Bánh muffin nở mềm điểm xuyết việt quất tươi.', category: 'bakery', sellPrice: 96, sec: 150, inputs: [{ sku: 'flour', qty: 1 }, { sku: 'blueberry', qty: 2 }, { sku: 'egg', qty: 1 }], shape: 'pie_slice', c1: '#4d5bd6', c2: '#e8c488', donor: 'webfarmville@c420bc2+harvest-hollow@9b23e1a', uses: ['sell_bin', 'order_board', 'gift_partner'] });
addArtisanItem({ sku: 'lemon_cake', nameVi: 'Bánh bông lan chanh', desc: 'Cốt bánh mềm thanh vị chanh vàng.', category: 'bakery', sellPrice: 118, sec: 180, inputs: [{ sku: 'flour', qty: 1 }, { sku: 'lemon', qty: 2 }, { sku: 'butter', qty: 1 }], shape: 'pie_slice', c1: '#ffe14d', c2: '#fff5cc', donor: 'harvest-hollow@9b23e1a', uses: ['sell_bin', 'order_board', 'gift_partner'] });
addArtisanItem({ sku: 'croissant', nameVi: 'Bánh sừng bò bơ', desc: 'Lớp vỏ nghìn lớp thơm phức bơ tươi.', category: 'bakery', sellPrice: 82, sec: 150, inputs: [{ sku: 'flour', qty: 1 }, { sku: 'butter', qty: 1 }, { sku: 'yeast', qty: 1 }], shape: 'bread_loaf', c1: '#f2b852', c2: '#b8761c', donor: 'webfarmville@c420bc2', uses: ['sell_bin', 'order_board', 'gift_partner'] });
addArtisanItem({ sku: 'walnut_cookie', nameVi: 'Bánh quy óc chó', desc: 'Bánh quy nướng giòn rắc nhân hạt óc chó.', category: 'bakery', sellPrice: 118, sec: 150, inputs: [{ sku: 'oat_flour', qty: 1 }, { sku: 'walnut', qty: 1 }, { sku: 'butter', qty: 1 }], shape: 'bread_loaf', c1: '#b57b4c', c2: '#7a4b25', donor: 'harvest-hollow@9b23e1a', uses: ['sell_bin', 'order_board', 'gift_partner'] });
addArtisanItem({ sku: 'chocolate_cake', nameVi: 'Bánh kem sô-cô-la', desc: 'Bánh kem ba tầng đậm đà ca cao dành tặng người thương.', category: 'bakery', sellPrice: 195, sec: 240, inputs: [{ sku: 'flour', qty: 1 }, { sku: 'cocoa_powder', qty: 1 }, { sku: 'whipped_cream', qty: 1 }], shape: 'pie_slice', c1: '#5a2d1b', c2: '#f2c48c', donor: 'harvest-hollow@9b23e1a', uses: ['sell_bin', 'order_board', 'gift_partner'] });

// Workshop 4: Preserves Workshop (12)
addArtisanItem({ sku: 'strawberry_jam', nameVi: 'Mứt dâu tây', desc: 'Hũ mứt dâu sệt ngọt phết bánh mì buổi sáng.', category: 'preserves', sellPrice: 54, sec: 120, inputs: [{ sku: 'strawberry', qty: 2 }, { sku: 'sugar_pack', qty: 1 }], shape: 'jam_jar', c1: '#e23b4e', c2: '#ff8a98', donor: 'harvest-hollow@9b23e1a+webfarmville@c420bc2', uses: ['sell_bin', 'order_board', 'gift_partner'] });
addArtisanItem({ sku: 'blueberry_jam', nameVi: 'Mứt việt quất', desc: 'Mứt tím đậm dịu ngọt đóng lọ thủy tinh.', category: 'preserves', sellPrice: 56, sec: 120, inputs: [{ sku: 'blueberry', qty: 2 }, { sku: 'sugar_pack', qty: 1 }], shape: 'jam_jar', c1: '#4d5bd6', c2: '#9aa4f0', donor: 'harvest-hollow@9b23e1a', uses: ['sell_bin', 'order_board', 'gift_partner'] });
addArtisanItem({ sku: 'plum_jam', nameVi: 'Mứt mận tím', desc: 'Mứt mận dẻo quánh vị chua ngọt hài hòa.', category: 'preserves', sellPrice: 64, sec: 140, inputs: [{ sku: 'plum', qty: 2 }, { sku: 'sugar_pack', qty: 1 }], shape: 'jam_jar', c1: '#8040a0', c2: '#d29be8', donor: 'harvest-hollow@9b23e1a', uses: ['sell_bin', 'order_board', 'gift_partner'] });
addArtisanItem({ sku: 'fig_jam', nameVi: 'Mứt sung mật', desc: 'Mứt sung ăn cùng phô mai dê cực kỳ hợp rơ.', category: 'preserves', sellPrice: 82, sec: 160, inputs: [{ sku: 'fig', qty: 2 }, { sku: 'sugar_pack', qty: 1 }], shape: 'jam_jar', c1: '#7b4372', c2: '#d998cc', donor: 'harvest-hollow@9b23e1a', uses: ['sell_bin', 'order_board', 'gift_partner'] });
addArtisanItem({ sku: 'peach_preserves', nameVi: 'Đào ngâm đường phèn', desc: 'Lọ đào ngâm vàng ươm mát lạnh.', category: 'preserves', sellPrice: 56, sec: 120, inputs: [{ sku: 'peach', qty: 2 }, { sku: 'sugar_pack', qty: 1 }], shape: 'jam_jar', c1: '#f89c78', c2: '#ffe4c4', donor: 'harvest-hollow@9b23e1a', uses: ['sell_bin', 'order_board', 'gift_partner'] });
addArtisanItem({ sku: 'rose_petal_jelly', nameVi: 'Thạch cánh hoa hồng', desc: 'Hũ thạch hoa hồng trong vắt thơm ngát hương hoa.', category: 'preserves', sellPrice: 78, sec: 150, inputs: [{ sku: 'rose_red', qty: 2 }, { sku: 'sugar_pack', qty: 1 }], shape: 'jam_jar', c1: '#d92638', c2: '#ffcad4', donor: 'harvest-hollow@9b23e1a', uses: ['sell_bin', 'order_board', 'gift_partner'] });
addArtisanItem({ sku: 'pickled_radish', nameVi: 'Củ cải muối giòn', desc: 'Củ cải đỏ ngâm giấm gạo chua ngọt giòn tan.', category: 'preserves', sellPrice: 52, sec: 100, inputs: [{ sku: 'radish', qty: 2 }, { sku: 'vinegar', qty: 1 }], shape: 'jam_jar', c1: '#f2788a', c2: '#fff0f2', donor: 'hollowmere@a7a8e5a', uses: ['sell_bin', 'order_board'] });
addArtisanItem({ sku: 'pickled_cabbage', nameVi: 'Bắp cải muối chua', desc: 'Hũ dưa bắp cải lên men giữ được lâu dài.', category: 'preserves', sellPrice: 98, sec: 140, inputs: [{ sku: 'cabbage', qty: 2 }, { sku: 'sea_salt', qty: 1 }], shape: 'jam_jar', c1: '#c6e888', c2: '#f2fae4', donor: 'hollowmere@a7a8e5a', uses: ['sell_bin', 'order_board'] });
addArtisanItem({ sku: 'pickled_pepper', nameVi: 'Ớt ngâm giấm', desc: 'Ớt cay ngâm giấm ăn kèm món nướng.', category: 'preserves', sellPrice: 54, sec: 110, inputs: [{ sku: 'hot_pepper', qty: 2 }, { sku: 'vinegar', qty: 1 }], shape: 'jam_jar', c1: '#e8301a', c2: '#ffae7a', donor: 'harvest-hollow@9b23e1a', uses: ['sell_bin', 'order_board'] });
addArtisanItem({ sku: 'dried_tomato', nameVi: 'Cà chua sấy dầu', desc: 'Cà chua phơi nắng ngâm dầu ô liu đậm đà.', category: 'preserves', sellPrice: 86, sec: 150, inputs: [{ sku: 'tomato', qty: 2 }, { sku: 'olive_oil', qty: 1 }], shape: 'jam_jar', c1: '#c83428', c2: '#d4db58', donor: 'harvest-hollow@9b23e1a', uses: ['sell_bin', 'order_board'] });
addArtisanItem({ sku: 'grape_raisin', nameVi: 'Nho khô dẻo', desc: 'Chùm nho sấy dẻo giữ vị ngọt tự nhiên.', category: 'preserves', sellPrice: 66, sec: 120, inputs: [{ sku: 'grape', qty: 2 }], shape: 'berry', c1: '#5b3070', c2: '#8e57a8', donor: 'hollowmere@a7a8e5a', uses: ['sell_bin', 'order_board', 'gift_partner'] });
addArtisanItem({ sku: 'lemon_marmalade', nameVi: 'Mứt chanh mật ong', desc: 'Mứt chanh vàng pha mật ong rất dịu cổ họng.', category: 'preserves', sellPrice: 108, sec: 150, inputs: [{ sku: 'lemon', qty: 2 }, { sku: 'honey', qty: 1 }], shape: 'jam_jar', c1: '#ffe14d', c2: '#f6b128', donor: 'webfarmville@c420bc2', uses: ['sell_bin', 'order_board', 'gift_partner'] });

// Workshop 5: Loom (8)
addArtisanItem({ sku: 'wool_yarn', nameVi: 'Cuộn len cừu', desc: 'Len cừu se sợi đều tăm tắp trên guồng quay.', category: 'loom', sellPrice: 44, sec: 90, inputs: [{ sku: 'wool', qty: 1 }], shape: 'yarn_spool', c1: '#f7f4eb', c2: '#d8d0c1', donor: 'harvest-hollow@9b23e1a+webfarmville@c420bc2', uses: ['workshop_recipe', 'sell_bin', 'order_board'] });
addArtisanItem({ sku: 'angora_yarn', nameVi: 'Cuộn len thỏ Angora', desc: 'Sợi len trắng bông nhẹ giữ ấm mùa Đông.', category: 'loom', sellPrice: 48, sec: 100, inputs: [{ sku: 'angora_wool', qty: 1 }], shape: 'yarn_spool', c1: '#ffe6f0', c2: '#f2b8cf', donor: 'harvest-hollow@9b23e1a', uses: ['workshop_recipe', 'sell_bin', 'order_board'] });
addArtisanItem({ sku: 'wool_cloth', nameVi: 'Cuộn vải nỉ len', desc: 'Tấm vải dệt dày dặn từ hai cuộn len cừu.', category: 'loom', sellPrice: 104, sec: 150, inputs: [{ sku: 'wool_yarn', qty: 2 }], shape: 'cloth_bolt', c1: '#e6dcc8', c2: '#9c8b70', donor: 'harvest-hollow@9b23e1a', uses: ['workshop_recipe', 'sell_bin', 'order_board'] });
addArtisanItem({ sku: 'knit_scarf', nameVi: 'Khăn choàng len', desc: 'Chiếc khăn quàng cổ đan tay ấm áp gửi tặng người thương.', category: 'loom', sellPrice: 122, sec: 160, inputs: [{ sku: 'wool_yarn', qty: 2 }, { sku: 'lavender', qty: 1 }], shape: 'cloth_bolt', c1: '#b58de8', c2: '#f7f4eb', donor: 'harvest-hollow@9b23e1a', uses: ['sell_bin', 'order_board', 'gift_partner'] });
addArtisanItem({ sku: 'cozy_sweater', nameVi: 'Áo len đôi ấm', desc: 'Áo len mềm mại dệt từ len tơ hảo hạng.', category: 'loom', sellPrice: 195, sec: 220, inputs: [{ sku: 'wool_cloth', qty: 1 }, { sku: 'fine_fleece', qty: 1 }], shape: 'cloth_bolt', c1: '#e87a90', c2: '#fff2f4', donor: 'harvest-hollow@9b23e1a', uses: ['sell_bin', 'order_board', 'gift_partner'] });
addArtisanItem({ sku: 'wool_blanket', nameVi: 'Chăn len ghép mảng', desc: 'Tấm chăn dệt lớn phủ ấm cả mùa Đông.', category: 'loom', sellPrice: 240, sec: 240, inputs: [{ sku: 'wool_cloth', qty: 2 }], shape: 'cloth_bolt', c1: '#7fa8d8', c2: '#f5d288', donor: 'harvest-hollow@9b23e1a', uses: ['sell_bin', 'order_board', 'gift_partner'] });
addArtisanItem({ sku: 'rabbit_mittens', nameVi: 'Găng tay lông thỏ', desc: 'Đôi bao tay mềm mịn thêu hoa nhỏ xinh.', category: 'loom', sellPrice: 140, sec: 160, inputs: [{ sku: 'angora_yarn', qty: 1 }, { sku: 'silky_tuft', qty: 1 }], shape: 'yarn_spool', c1: '#ffd6e6', c2: '#f79ab8', donor: 'harvest-hollow@9b23e1a', uses: ['sell_bin', 'order_board', 'gift_partner'] });
addArtisanItem({ sku: 'feather_pillow', nameVi: 'Gối lông vũ êm ái', desc: 'Chiếc gối êm ru nhồi lông vịt trong vỏ vải nỉ.', category: 'loom', sellPrice: 198, sec: 180, inputs: [{ sku: 'wool_cloth', qty: 1 }, { sku: 'duck_feather', qty: 2 }], shape: 'cloth_bolt', c1: '#e8f4fc', c2: '#a4cce8', donor: 'webfarmville@c420bc2', uses: ['sell_bin', 'order_board', 'gift_partner'] });

// Workshop 6: Florist (9 new + existing `sakura_bouquet` = 10)
addArtisanItem({ sku: 'tulip_bouquet', nameVi: 'Bó hoa tulip ba màu', desc: 'Bó tulip đỏ vàng hồng rực rỡ buộc dây ruy băng.', group: 'bouquet', category: 'florist', sellPrice: 92, sec: 90, inputs: [{ sku: 'tulip_red', qty: 1 }, { sku: 'tulip_yellow', qty: 1 }, { sku: 'tulip_pink', qty: 1 }, { sku: 'ribbon', qty: 1 }], shape: 'bouquet', c1: '#e03c4a', c2: '#f5cb36', c3: '#f489ab', donor: 'webfarmville@c420bc2', uses: ['gift_partner', 'sell_bin', 'order_board'] });
addArtisanItem({ sku: 'sunset_bouquet', nameVi: 'Bó hoa hoàng hôn', desc: 'Sắc cam rực rỡ từ tulip cam, hồng cam và hướng dương.', group: 'bouquet', category: 'florist', sellPrice: 155, sec: 120, inputs: [{ sku: 'tulip_orange', qty: 1 }, { sku: 'rose_orange', qty: 1 }, { sku: 'sunflower', qty: 1 }, { sku: 'ribbon', qty: 1 }], shape: 'bouquet', c1: '#f5842a', c2: '#ffd21f', c3: '#f5762e', donor: 'webfarmville@c420bc2', uses: ['gift_partner', 'sell_bin', 'order_board'] });
addArtisanItem({ sku: 'starlight_bouquet', nameVi: 'Bó hoa ánh sao', desc: 'Sắc xanh lam và tím pastel dịu êm như bầu trời đêm.', group: 'bouquet', category: 'florist', sellPrice: 205, sec: 150, inputs: [{ sku: 'rose_blue', qty: 1 }, { sku: 'blue_jazz', qty: 1 }, { sku: 'rose_lavender', qty: 1 }, { sku: 'ribbon', qty: 1 }], shape: 'bouquet', c1: '#4682f0', c2: '#b58de8', c3: '#b8dcff', donor: 'webfarmville@c420bc2', uses: ['gift_partner', 'sell_bin', 'order_board'] });
addArtisanItem({ sku: 'royal_gold_bouquet', nameVi: 'Bó hoa vàng hoàng gia', desc: 'Tuyệt tác từ hồng vàng kim, tulip cầu vồng và hồng tiên.', group: 'bouquet', category: 'florist', sellPrice: 300, sec: 180, inputs: [{ sku: 'rose_gold', qty: 1 }, { sku: 'tulip_rainbow', qty: 1 }, { sku: 'fairy_rose', qty: 1 }, { sku: 'ribbon', qty: 1 }], shape: 'bouquet', c1: '#ffd43b', c2: '#ff6ca8', c3: '#f0a0d8', donor: 'webfarmville@c420bc2', uses: ['gift_partner', 'sell_bin', 'order_board'] });
addArtisanItem({ sku: 'bridal_rose_bouquet', nameVi: 'Bó hoa hồng chung đôi', desc: 'Bó hồng trắng, hồng phấn và hồng sakura trao gửi yêu thương.', group: 'bouquet', category: 'florist', sellPrice: 132, sec: 120, inputs: [{ sku: 'rose_white', qty: 1 }, { sku: 'rose_pink', qty: 1 }, { sku: 'rose_sakura', qty: 1 }, { sku: 'ribbon', qty: 1 }], shape: 'bouquet', c1: '#fff9f5', c2: '#f48fb1', c3: '#ffc1d6', donor: 'webfarmville@c420bc2', uses: ['gift_partner', 'sell_bin', 'order_board'] });
addArtisanItem({ sku: 'honey_candle', nameVi: 'Nến sáp mật ong', desc: 'Cây nến sáp ong tỏa ánh sáng vàng ấm áp căn phòng.', category: 'florist', sellPrice: 98, sec: 120, inputs: [{ sku: 'beeswax', qty: 1 }, { sku: 'honey', qty: 1 }], shape: 'candle', c1: '#ffd54f', c2: '#f6b128', donor: 'harvest-hollow@9b23e1a', uses: ['gift_partner', 'sell_bin', 'order_board'] });
addArtisanItem({ sku: 'lavender_candle', nameVi: 'Nến thơm oải hương', desc: 'Nến sáp ong ướp tinh dầu oải hương giúp thư giãn.', category: 'florist', sellPrice: 88, sec: 120, inputs: [{ sku: 'beeswax', qty: 1 }, { sku: 'lavender', qty: 1 }], shape: 'candle', c1: '#b58de8', c2: '#ffd54f', donor: 'harvest-hollow@9b23e1a', uses: ['gift_partner', 'sell_bin', 'order_board'] });
addArtisanItem({ sku: 'rose_soap', nameVi: 'Xà phòng cánh hồng', desc: 'Bánh xà phòng thảo mộc ướp dầu ô liu và hồng đỏ.', category: 'florist', sellPrice: 88, sec: 120, inputs: [{ sku: 'olive_oil', qty: 1 }, { sku: 'rose_red', qty: 1 }], shape: 'soap_bar', c1: '#f48fb1', c2: '#d92638', donor: 'harvest-hollow@9b23e1a', uses: ['gift_partner', 'sell_bin', 'order_board'] });
addArtisanItem({ sku: 'flower_crown', nameVi: 'Vòng hoa đội đầu', desc: 'Vòng hoa tết tay từ tulip và oải hương tươi.', group: 'bouquet', category: 'florist', sellPrice: 96, sec: 100, inputs: [{ sku: 'tulip_pink', qty: 1 }, { sku: 'blue_jazz', qty: 1 }, { sku: 'lavender', qty: 1 }], shape: 'bouquet', c1: '#9c7ae0', c2: '#4a7ae8', c3: '#f489ab', donor: 'webfarmville@c420bc2', uses: ['gift_partner', 'sell_bin', 'order_board'] });

// Workshop 7: Deep Kitchen Dishes (10 new linking fish + crops + dairy + orchard + 5 existing = 15 kitchen dishes!)
// Kept in group `'artisan'` with `category: 'dish'` in Checkpoint A until COOKING_RECIPES sync in Checkpoint E.
addArtisanItem({ sku: 'veggie_soup', nameVi: 'Súp rau củ đồng quê', desc: 'Nồi súp nóng khoai tây, tỏi tây và cải xoăn thơm lừng.', category: 'dish', sellPrice: 82, sec: 120, inputs: [{ sku: 'potato', qty: 1 }, { sku: 'parsnip', qty: 1 }, { sku: 'kale', qty: 1 }], shape: 'bowl_soup', c1: '#9ad96a', c2: '#f2e0a0', donor: 'greens@3f32fd8' });
addArtisanItem({ sku: 'roasted_fish', nameVi: 'Cá nướng bơ thảo mộc', desc: 'Cá chép ao áp chảo cùng củ cải vàng và bơ thảo mộc.', category: 'dish', sellPrice: 132, sec: 150, inputs: [{ sku: 'carp_pond', qty: 1 }, { sku: 'herb_butter', qty: 1 }, { sku: 'scallion', qty: 1 }], shape: 'platter', c1: '#c8d6e8', c2: '#7cc04f', donor: 'greens@3f32fd8' });
addArtisanItem({ sku: 'lotus_broth', nameVi: 'Lẩu cá hồi sen', desc: 'Cá hồi sen hầm cải thìa, nấm thảo mộc nước thanh ngọt.', category: 'dish', sellPrice: 84, sec: 150, inputs: [{ sku: 'lotus_trout', qty: 1 }, { sku: 'bok_choy', qty: 1 }, { sku: 'wild_herb', qty: 1 }], shape: 'bowl_soup', c1: '#f28b82', c2: '#7ac85a', donor: 'olw-v030' });
addArtisanItem({ sku: 'koi_bentou', nameVi: 'Hộp cơm cá koi ngũ sắc', desc: 'Cơm cá koi đầy đủ ớt chuông, đậu que và trứng gà.', category: 'dish', sellPrice: 86, sec: 160, inputs: [{ sku: 'koi_pastel', qty: 1 }, { sku: 'bell_pepper', qty: 1 }, { sku: 'egg', qty: 1 }], shape: 'platter', c1: '#f7b2c4', c2: '#3fae4f', c3: '#ffd54f', donor: 'greens@3f32fd8' });
addArtisanItem({ sku: 'pumpkin_soup', nameVi: 'Súp bí ngô kem tươi', desc: 'Súp bí ngô sánh mịn chan váng sữa béo ngậy.', category: 'dish', sellPrice: 165, sec: 160, inputs: [{ sku: 'pumpkin', qty: 1 }, { sku: 'whipped_cream', qty: 1 }], shape: 'bowl_soup', c1: '#f2852a', c2: '#fff9e6', donor: 'webfarmville@c420bc2' });
addArtisanItem({ sku: 'glazed_yam', nameVi: 'Khoai mỡ nướng mật ong', desc: 'Khoai mỡ thấm mật ong vàng ươm thơm bơ.', category: 'dish', sellPrice: 148, sec: 140, inputs: [{ sku: 'yam', qty: 1 }, { sku: 'honey', qty: 1 }, { sku: 'butter', qty: 1 }], shape: 'platter', c1: '#c86a4a', c2: '#f6b128', donor: 'hollowmere@a7a8e5a' });
addArtisanItem({ sku: 'cheese_omelette', nameVi: 'Trứng cuộn phô mai', desc: 'Món ăn sáng nhanh từ trứng gà, phô mai và hành lá.', category: 'dish', sellPrice: 98, sec: 90, inputs: [{ sku: 'egg', qty: 1 }, { sku: 'cheese', qty: 1 }, { sku: 'scallion', qty: 1 }], shape: 'platter', c1: '#ffd54f', c2: '#9ad96a', donor: 'webfarmville@c420bc2' });
addArtisanItem({ sku: 'honey_pancakes', nameVi: 'Bánh kếp mật ong', desc: 'Chồng bánh kếp vàng rưới mật ong và bơ tươi.', category: 'dish', sellPrice: 120, sec: 120, inputs: [{ sku: 'flour', qty: 1 }, { sku: 'milk', qty: 1 }, { sku: 'honey', qty: 1 }], shape: 'pie_slice', c1: '#e6b868', c2: '#f6b128', donor: 'harvest-hollow@9b23e1a' });
addArtisanItem({ sku: 'hot_cocoa', nameVi: 'Ca cao nóng kem béo', desc: 'Tách ca cao ấm cho những ngày tuyết rơi trắng trời.', category: 'dish', sellPrice: 126, sec: 120, inputs: [{ sku: 'cocoa_powder', qty: 1 }, { sku: 'milk', qty: 1 }, { sku: 'sugar_pack', qty: 1 }], shape: 'cup_drink', c1: '#6e3c24', c2: '#ffffff', donor: 'harvest-hollow@9b23e1a' });
addArtisanItem({ sku: 'cozy_feast', nameVi: 'Mâm cơm ấm cúng hai người', desc: 'Bữa tiệc đặc biệt gồm bánh mì, súp bí ngô và sốt nam việt quất.', category: 'dish', sellPrice: 280, sec: 240, inputs: [{ sku: 'bread', qty: 1 }, { sku: 'pumpkin_soup', qty: 1 }, { sku: 'cranberry', qty: 2 }], shape: 'platter', c1: '#f2852a', c2: '#c8203a', c3: '#e09a48', donor: 'harvest-hollow@9b23e1a' });

// Note: also add `cranberry_sauce` & `fig_tart` for full 13 preserves + 13 bakery!
addArtisanItem({ sku: 'cranberry_sauce', nameVi: 'Sốt nam việt quất', desc: 'Sốt đỏ chua ngọt nấu đường cho các món mặn mùa Lễ.', category: 'preserves', sellPrice: 68, sec: 120, inputs: [{ sku: 'cranberry', qty: 2 }, { sku: 'sugar_pack', qty: 1 }], shape: 'jam_jar', c1: '#c8203a', c2: '#ff8a98', donor: 'webfarmville@c420bc2', uses: ['sell_bin', 'order_board', 'gift_partner'] });
addArtisanItem({ sku: 'fig_tart', nameVi: 'Bánh tart sung phô mai dê', desc: 'Món bánh mặn ngọt tinh tế từ sung tươi và phô mai dê.', category: 'bakery', sellPrice: 140, sec: 180, inputs: [{ sku: 'flour', qty: 1 }, { sku: 'fig', qty: 1 }, { sku: 'goat_cheese', qty: 1 }], shape: 'pie_slice', c1: '#7b4372', c2: '#f8f5ec', donor: 'harvest-hollow@9b23e1a', uses: ['sell_bin', 'order_board', 'gift_partner'] });

// Register starter + deep icon specs automatically upon import
registerProceduralIconSpecs(
  Object.entries(STARTER_ITEM_METADATA).map(([sku, m]) => [sku, m.iconSpec] as const),
);
registerProceduralIconSpecs(
  ITEMS_RAW.map((entry) => [entry.sku, entry.iconSpec] as const),
);

function estimateStandardValueBp(entry: CompactDeepItem): number {
  if (entry.storeBuy !== undefined && entry.storeBuy !== null) {
    return entry.storeBuy * 10_000;
  }
  return entry.sellPrice * 10_000;
}

export const DEEP_FARMING_ITEM_DEFINITIONS: readonly ItemDefinition[] = ITEMS_RAW.map((entry) => ({
  sku: entry.sku,
  nameVi: entry.nameVi,
  group: entry.group,
  milestone: entry.milestone,
  stackLimit: entry.stackLimit ?? 99,
  storeBuy: entry.storeBuy ?? null,
  sellPrice: entry.sellPrice,
  laborMilli: entry.laborMilli ?? 0,
  depreciation: entry.depreciation ?? 0,
  batchQty: entry.batchQty ?? 1,
  inputs: entry.inputs ?? [],
  batchDurationMs: entry.batchDurationMs ?? 0,
  standardValueBp: estimateStandardValueBp(entry),
  orderMultiplierBp: entry.orderMultiplierBp ?? null,
  qualityTiers: entry.qualityTiers ?? ['normal'],
  sellChannels: entry.sellChannels ?? ['shipping_bin'],
  forageable: entry.forageable ?? false,
  descriptionVi: entry.descriptionVi,
  category: entry.category,
  iconId: entry.sku,
  sources: entry.sources,
  uses: entry.uses,
  donorSource: entry.donorSource,
}));

export const DEEP_FARMING_ITEM_METADATA: ReadonlyMap<string, StarterCanonicalMetadata> = new Map(
  [
    ...Object.entries(STARTER_ITEM_METADATA),
    ...ITEMS_RAW.map((entry) => [
      entry.sku,
      {
        descriptionVi: entry.descriptionVi,
        category: entry.category,
        iconSpec: entry.iconSpec,
        sources: entry.sources,
        uses: entry.uses,
        donorSource: entry.donorSource,
      },
    ] as const),
  ],
);

export const DEEP_FARMING_RAW_ENTRIES: readonly CompactDeepItem[] = ITEMS_RAW;
