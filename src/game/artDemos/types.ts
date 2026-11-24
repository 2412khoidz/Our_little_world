export type ArtDemoId = 'A' | 'B' | 'C' | 'D' | 'E';

export type CameraPreset = 'overview' | 'interior' | 'garden';

export interface ArtDemoMetadata {
  id: ArtDemoId;
  shortTitle: string;
  fullTitle: string;
  subtitle: string;
  packsUsed: string[];
  licenseSummary: string;
  accentHex: string;
  backdropHex: string;
  highlightsVi: string[];
  gapsVi: string[];
}

export const ART_DEMO_METADATA: Record<ArtDemoId, ArtDemoMetadata> = {
  A: {
    id: 'A',
    shortTitle: 'Demo A · Cozy Series',
    fullTitle: 'Demo A: Cozy Farm + Cozy Interior + Cozy People (shubibubi)',
    subtitle: 'Pastel ấm áp cổ điển · kết hợp Free Pets Pack (cat-orange)',
    packsUsed: [
      'Cozy Farm (Free)',
      'Cozy Interior (Free)',
      'Cozy People (Free)',
      'Free Pets Pack (CC BY 4.0)',
    ],
    licenseSummary: 'Miễn phí cá nhân / không thương mại (Itch.io) · Pet CC BY 4.0',
    accentHex: '#e69b78',
    backdropHex: '#282024',
    highlightsVi: [
      'Palette pastel ấm đồng bộ tự nhiên giữa ngoại thất, nội thất và nhân vật paper-doll 32×32.',
      'Cozy People hỗ trợ tách lớp thân, tóc, áo, quần, giày để phối màu riêng cho Mây và Nắng.',
    ],
    gapsVi: [
      'Bản Cozy Interior Free chỉ có 1 tờ 160×80 (thiếu giường ngủ, tủ bếp, đèn đứng, sofa rộng).',
      'Cozy Farm Free thiếu cầu gỗ, hàng rào, ao nước và vật phẩm câu cá/nấu ăn.',
    ],
  },
  B: {
    id: 'B',
    shortTitle: 'Demo B · Sprout Lands',
    fullTitle: 'Demo B: Sprout Lands (Basic + UI + Sorry Pack)',
    subtitle: 'Cozy pastel đồng bộ cao nhất · anh đào, picnic, nội thất gỗ · Free Pets (puppy-shiba)',
    packsUsed: [
      'Sprout Lands Basic',
      'Sprout Lands UI Basic',
      'Sprout Sorry Pack (Free EA)',
      'Free Pets Pack (CC BY 4.0)',
    ],
    licenseSummary: 'Miễn phí cá nhân / không thương mại (cấm redistribute pack gốc)',
    accentHex: '#eb9eb8',
    backdropHex: '#231e24',
    highlightsVi: [
      'Bộ hoàn chỉnh nhất trong nhóm miễn phí: có cả nhà, nội thất đa màu, thảm, anh đào, picnic, cá, ếch, ong.',
      'Nhân vật 4 hướng sẵn động tác cuốc đất, tưới nước, câu cá (Ocean Pack) và UI đồng bộ.',
    ],
    gapsVi: [
      'Nhân vật gốc chỉ có 1 tạo hình mặc định — muốn đổi kiểu tóc/áo dài phải vẽ thêm hoặc tô tint.',
      'Thiếu bếp nấu ăn chi tiết và đồ công nghệ/cinema hiện đại (TV lớn, máy chiếu, laptop).',
    ],
  },
  C: {
    id: 'C',
    shortTitle: 'Demo C · Sunnyside World',
    fullTitle: 'Demo C: Sunnyside World v2.1 (Daniel Diggle)',
    subtitle: 'Animation siêu mượt, tách lớp tóc/nhân vật · kèm cừu, gà, vịt & bunny-white',
    packsUsed: [
      'Sunnyside World v2.1',
      'Free Pets Pack (CC BY 4.0)',
    ],
    licenseSummary: 'Miễn phí cả thương mại (cấm redistribute pack gốc)',
    accentHex: '#f0b86b',
    backdropHex: '#20261f',
    highlightsVi: [
      'Hoạt ảnh nhân vật và thú nuôi mượt nhất (9–10 frame/hành động), có sẵn tóc ngắn/dài/xoăn tách lớp.',
      'Miễn phí cả cho mục đích thương mại và cực mạnh về nông trại, cối xay gió, khói bếp, cây trồng.',
    ],
    gapsVi: [
      'Nhân vật chỉ di chuyển 2 hướng ngang (Trái/Phải flip), không có sprite nhìn thẳng lên/xuống riêng.',
      'Nội thất chỉ có đồ đồng quê cơ bản (giường đơn, kệ sách, bàn, thảm đỏ); thiếu sofa, bếp hiện đại, tivi.',
    ],
  },
  D: {
    id: 'D',
    shortTitle: 'Demo D · Modern + Cozy',
    fullTitle: 'Demo D: Modern Interiors Free (LimeZu) + Cozy Lands Basic',
    subtitle: 'Căn hộ couple hiện đại siêu chi tiết + vườn cozy ngoài sân · cat-orange & puppy-shiba',
    packsUsed: [
      'Modern Interiors Free v2.2',
      'Cozy Lands Basic v1.25',
      'Free Pets Pack (CC BY 4.0)',
    ],
    licenseSummary: 'Bản Free phi thương mại (Complete $1.20–$2.99 mở bản thương mại)',
    accentHex: '#8bc4d9',
    backdropHex: '#1f1d27',
    highlightsVi: [
      'Nội thất nhà ở chi tiết nhất: lò sưởi, sofa, rèm cửa sổ, dây đèn, kệ sách, máy tính, thảm dệt.',
      'Cozy Lands Basic khớp chiều cao nhân vật (~22–23px) và nét viền tối với Modern Interiors ngoài sân vườn.',
    ],
    gapsVi: [
      'Modern Interiors Free thiếu khu vực bếp/tủ lạnh/bồn rửa, tivi/rạp phim và phòng tắm đầy đủ.',
      'Nếu muốn công cụ tùy biến 100% giống nhau cả trong nhà lẫn ngoài vườn cần nâng cấp bản Complete của LimeZu (~$1.20–$2).',
    ],
  },
  E: {
    id: 'E',
    shortTitle: 'Demo E · Unified Cozy World',
    fullTitle: 'Demo E: Unified Cozy World (Sprout + Modern + Sunnyside + Cozy Lands + Free Pets)',
    subtitle: 'Tổ ấm hợp nhất chuẩn pastel cottagecore · đủ 6 góc nhà, vườn anh đào bờ hồ tự nhiên & avatar giữ nguyên tùy chỉnh V0.1',
    packsUsed: [
      'Sprout Lands Basic + UI + Sorry Pack',
      'Modern Interiors Free v2.2 (+ Avatar Rig)',
      'Sunnyside World v2.1',
      'Cozy Lands Basic v1.25',
      'Free Pets Pack (CC BY 4.0)',
    ],
    licenseSummary: 'Ưu tiên Free (phi thương mại cá nhân) · Free Pets (CC BY 4.0) · Sunnyside (Free thương mại)',
    accentHex: '#f4a6b8',
    backdropHex: '#25291f',
    highlightsVi: [
      'Giữ trọn 100% hệ thống tùy chỉnh Avatar V0.1 (tông da, kiểu tóc, màu tóc, trang phục, kính/nơ) bằng palette remap trên rig 4 hướng 16×23px.',
      'Căn nhà thiết kế đủ 6 khu chức năng: phòng ngủ đôi, phòng khách + TV/cinema, góc học 2 bàn, bếp ăn, góc thú cưng (bát + ổ nằm), và sảnh thoáng.',
      'Khu vườn hữu cơ với bờ ao uốn cong đúng autotile, đường đất bo viền 9-slice, cây anh đào, picnic, khu trồng trọt và vùng mở rộng.',
    ],
    gapsVi: [
      'Nhân vật chưa có sẵn animation ngủ, ôm, nắm tay, tưới cây, nấu ăn hay vuốt ve pet (cần vẽ thêm theo rig 16×32 ở các phiên bản sau).',
      'Khu bếp sâu (bếp gas, bồn rửa, tủ lạnh) và phòng ngủ cao cấp ở Modern Interiors Free còn ít nếu muốn bộ sưu tập phong phú.',
    ],
  },
};

export interface ActorWanderWaypoint {
  x: number;
  y: number;
  facing: 'down' | 'up' | 'left' | 'right';
  pauseMs: number;
}
