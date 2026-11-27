import { getItem } from '../economy/catalogConfig';
import { resolveCanonicalFishBySku } from '../donor/fishing/canonicalFishRegistry';

const USE_LABEL_VI: Readonly<Record<string, string>> = {
  plant: 'Gieo vào ô đất đã cuốc',
  plant_flower: 'Gieo trong vườn hoa',
  plant_orchard: 'Trồng trong vườn cây ăn quả',
  feed_livestock: 'Cho vật nuôi phù hợp ăn',
  feed_pet: 'Cho mèo Quýt ăn',
  fertilize: 'Bón vào luống để chăm cây',
  irrigate: 'Tưới tự động cho luống',
  fishing: 'Làm mồi câu cá',
  cook_recipe: 'Dùng trong công thức nấu ăn',
  workshop_recipe: 'Làm nguyên liệu chế biến ở xưởng',
  craft_bouquet: 'Kết bó hoa ở tiệm hoa',
  seed_maker: 'Làm nguyên liệu tạo hạt giống',
  sell_bin: 'Bán qua thùng gom hàng',
  order_board: 'Giao theo đơn ở bảng đơn hàng',
  gift_partner: 'Tặng người thương',
  keepsake: 'Giữ làm kỷ niệm',
  stationery: 'Dùng để viết thư',
  tool_upgrade: 'Dùng để nâng cấp dụng cụ',
};

const DIRECT_USE_VI: Readonly<Record<string, string>> = {
  tool_hoe: 'Cầm cuốc, đứng sát ô đất rồi chọn Cuốc.',
  tool_watering_can: 'Múc nước ở giếng hoặc ao, đứng cạnh luống rồi chọn Tưới.',
  water_pitcher: 'Múc nước ở vòi, giếng hoặc ao. Dùng để tưới cây hoặc rót vào bát nước của Quýt.',
  rod_basic: 'Đến chỗ có thao tác Câu cá rồi quăng cần.',
};

export function itemUsageDetails(sku: string, fallbackName?: string, description?: string | null) {
  const item = getItem(sku);
  const fish = resolveCanonicalFishBySku(sku);
  const nameVi = item?.nameVi ?? fish?.labelVi ?? fallbackName ?? 'Vật phẩm';
  const direct = DIRECT_USE_VI[sku];
  const uses = (item?.uses ?? []).map((use) => USE_LABEL_VI[use]).filter(Boolean);
  if (fish) {
    uses.push('Dùng trong công thức nấu ăn', 'Bán qua thùng gom hàng');
  } else if (uses.length === 0 && item?.group === 'seed') {
    uses.push(USE_LABEL_VI.plant!);
  } else if (uses.length === 0 && item?.sellChannels.includes('shipping_bin')) {
    uses.push(USE_LABEL_VI.sell_bin!);
  }
  return {
    nameVi,
    descriptionVi: description || item?.descriptionVi || fish?.descriptionVi || direct ||
      (uses.length ? `${nameVi} dùng trong các thao tác bên dưới.` : 'Vật phẩm trong túi của bạn.'),
    usageVi: direct ?? [...new Set(uses)].join(' · '),
  };
}
