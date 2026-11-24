export type WorldSizeOption = 64 | 96;
export type CosmeticDayPhase = 'morning' | 'sunset' | 'twilight';

export interface WorldLandmark {
  id: string;
  nameVi: string;
  tileX: number;
  tileY: number;
  radiusTiles: number;
  biome: 'cottage' | 'farm' | 'meadow' | 'water' | 'forest' | 'town' | 'beach' | 'cliff' | 'secret';
  descriptionVi: string;
}

export function buildExpansionLandmarks(size: WorldSizeOption): WorldLandmark[] {
  const s = size === 96 ? 1.5 : 1.0;
  const t = (v: number) => Math.round(v * s);

  return [
    {
      id: 'cottage',
      nameVi: 'Ngôi nhà chung & Hiên hoa',
      tileX: t(16),
      tileY: t(14),
      radiusTiles: 5,
      biome: 'cottage',
      descriptionVi: 'Căn nhà ấm áp của hai bạn với hòm thư đỏ, giếng nước sạch và bát ăn của bé mèo.',
    },
    {
      id: 'farm',
      nameVi: 'Vườn rau rào gỗ',
      tileX: t(30),
      tileY: t(15),
      radiusTiles: 5,
      biome: 'farm',
      descriptionVi: 'Những luống hướng dương, cà chua, củ cải thẳng tắp chờ mùa thu hoạch.',
    },
    {
      id: 'orchard',
      nameVi: 'Đồng hoa & Vườn quả',
      tileX: t(44),
      tileY: t(14),
      radiusTiles: 5,
      biome: 'meadow',
      descriptionVi: 'Cỏ xanh ngập hoa dại và những chú bướm vàng dập dìu.',
    },
    {
      id: 'fishing_pond',
      nameVi: 'Hồ câu & Cầu gỗ đôi',
      tileX: t(26),
      tileY: t(29),
      radiusTiles: 5,
      biome: 'water',
      descriptionVi: 'Hồ nước trong vắt nối cầu gỗ, có vịt con bơi lội và chỗ lấy nước sạch.',
    },
    {
      id: 'picnic',
      nameVi: 'Bãi Picnic hoa anh đào',
      tileX: t(11),
      tileY: t(27),
      radiusTiles: 4,
      biome: 'meadow',
      descriptionVi: 'Thảm hồng rợp cánh hoa rơi, bánh dâu và hai tách trà ấm.',
    },
    {
      id: 'forest',
      nameVi: 'Đường mòn Rừng thông',
      tileX: t(48),
      tileY: t(30),
      radiusTiles: 5,
      biome: 'forest',
      descriptionVi: 'Rặng cây rì rào mát rượi dẫn xuống bờ biển phía nam.',
    },
    {
      id: 'square',
      nameVi: 'Quảng trường & Chợ Bác Hai',
      tileX: t(14),
      tileY: t(42),
      radiusTiles: 5,
      biome: 'town',
      descriptionVi: 'Quầy hàng nhỏ ấm cúng chuẩn bị cho trao đổi nông sản V0.2 (Sandbox Fixture).',
    },
    {
      id: 'beach',
      nameVi: 'Bãi biển & Cầu tàu gỗ',
      tileX: t(30),
      tileY: t(52),
      radiusTiles: 5,
      biome: 'beach',
      descriptionVi: 'Bãi cát vàng mịn cùng cầu tàu hướng ra sóng biếc lấp lánh.',
    },
    {
      id: 'sunset_cliff',
      nameVi: 'Mũi ngắm Hoàng hôn',
      tileX: t(50),
      tileY: t(49),
      radiusTiles: 4,
      biome: 'cliff',
      descriptionVi: 'Ghế gỗ đôi trên ghềnh đá hoa cỏ dành riêng ngắm hoàng hôn cùng nhau.',
    },
    {
      id: 'secret_nook',
      nameVi: 'Góc Anh Đào Bí Mật',
      tileX: t(55),
      tileY: t(11),
      radiusTiles: 3,
      biome: 'secret',
      descriptionVi: 'Khoảng trời riêng ẩn sau rặng anh đào dành cho những kỷ niệm bí mật.',
    },
  ];
}

export function findNearestLandmark(
  tileX: number,
  tileY: number,
  landmarks: readonly WorldLandmark[],
): { landmark: WorldLandmark; distanceTiles: number; inside: boolean } {
  let best = landmarks[0]!;
  let bestDist = Infinity;
  for (const lm of landmarks) {
    const d = Math.hypot(tileX - lm.tileX, tileY - lm.tileY);
    if (d < bestDist) {
      bestDist = d;
      best = lm;
    }
  }
  return {
    landmark: best,
    distanceTiles: Math.round(bestDist * 10) / 10,
    inside: bestDist <= best.radiusTiles,
  };
}

export function estimateWalkTimeSec(
  fromTile: { tileX: number; tileY: number },
  toTile: { tileX: number; tileY: number },
  speedPxPerSec = 84,
): number {
  const px = Math.hypot((toTile.tileX - fromTile.tileX) * 16, (toTile.tileY - fromTile.tileY) * 16);
  return Math.round((px / speedPxPerSec) * 10) / 10;
}
