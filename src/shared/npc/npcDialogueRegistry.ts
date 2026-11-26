import type { AvatarConfig, MapId } from '../types';

export type NpcId = 'bac_hai' | 'co_lan' | 'chu_tu' | 'be_na' | 'ong_minh';
export type NpcMood = 'warm' | 'happy' | 'curious' | 'thoughtful';

export type NpcDialogueActionKind =
  | 'open_seed_shop'
  | 'open_tool_shop'
  | 'open_shipping'
  | 'open_workshop'
  | 'open_fishing_sea'
  | 'open_pet_care'
  | 'accept_errand'
  | 'complete_errand';

export interface NpcDialogueChoice {
  readonly id: string;
  readonly labelVi: string;
  readonly nextNodeId?: string;
  readonly action?: NpcDialogueActionKind;
  readonly badgeVi?: string;
  readonly closesDialogue?: boolean;
}

export interface NpcDialogueContext {
  readonly mapId: MapId;
  readonly isNight: boolean;
  readonly weatherKind: string;
  readonly walletCoins: number;
  readonly hasPet: boolean;
  readonly petName?: string;
  readonly playerNickname: string;
  readonly affinity: number;
  readonly errandStatus: 'none' | 'active' | 'done';
}

export interface NpcDialogueNode {
  readonly id: string;
  readonly mood: NpcMood;
  readonly textVi: (ctx: NpcDialogueContext) => string;
  readonly nextNodeId?: string;
  readonly choices?: (ctx: NpcDialogueContext) => readonly NpcDialogueChoice[];
}

export interface NpcProfile {
  readonly id: string;
  readonly nameVi: string;
  readonly roleTitleVi: string;
  readonly accentHex: string;
  readonly avatarConfig: AvatarConfig;
  readonly errandTitleVi: string;
  readonly errandHintVi: string;
  readonly entryNodeId: string;
  readonly nodes: Readonly<Record<string, NpcDialogueNode>>;
}

export interface NpcRelationshipRecord {
  affinity: number;
  errandStatus: 'none' | 'active' | 'done';
  lastTalkedAtMs: number;
}

export type NpcRelationshipMap = Record<string, NpcRelationshipRecord>;

function defaultRelRecord(): NpcRelationshipRecord {
  return { affinity: 1, errandStatus: 'none', lastTalkedAtMs: 0 };
}

function makeErrandNodes(profile: {
  errandOfferVi: string;
  errandProgressVi: string;
  errandDoneVi: string;
}): Record<string, NpcDialogueNode> {
  return {
    errand_menu: {
      id: 'errand_menu',
      mood: 'happy',
      textVi: (ctx) => {
        if (ctx.errandStatus === 'done') return profile.errandDoneVi;
        if (ctx.errandStatus === 'active') return profile.errandProgressVi;
        return profile.errandOfferVi;
      },
      choices: (ctx) => {
        if (ctx.errandStatus === 'none') {
          return [
            {
              id: 'accept_errand',
              labelVi: 'Nhận việc nhỏ này ngay',
              action: 'accept_errand',
              badgeVi: 'Nhận việc',
              nextNodeId: 'errand_accepted',
            },
            { id: 'back_root', labelVi: 'Để lúc khác nhé', nextNodeId: 'root' },
          ];
        }
        if (ctx.errandStatus === 'active') {
          return [
            {
              id: 'complete_errand',
              labelVi: 'Cháu đã ghé thăm / làm xong rồi!',
              action: 'complete_errand',
              badgeVi: '+Thân thiết',
              nextNodeId: 'errand_completed',
            },
            { id: 'back_root', labelVi: 'Cháu sẽ làm ngay đây', nextNodeId: 'root' },
          ];
        }
        return [{ id: 'back_root', labelVi: 'Quay lại trò chuyện', nextNodeId: 'root' }];
      },
    },
    errand_accepted: {
      id: 'errand_accepted',
      mood: 'happy',
      textVi: () => 'Tuyệt lắm! Cứ thong thả làm nhé, xong việc ghé nói với tôi một tiếng.',
      nextNodeId: 'root',
    },
    errand_completed: {
      id: 'errand_completed',
      mood: 'happy',
      textVi: (ctx) =>
        `Cảm ơn ${ctx.playerNickname} rất nhiều! Hai bạn lúc nào cũng chăm chỉ và ấm áp thế này thật quý quá.`,
      nextNodeId: 'root',
    },
  };
}

export const NPC_PROFILES: Readonly<Record<NpcId, NpcProfile>> = {
  bac_hai: {
    id: 'bac_hai',
    nameVi: 'Bác Hai',
    roleTitleVi: 'Chủ vườn & Tiệm hạt giống',
    accentHex: '#d89b48',
    avatarConfig: {
      skinTone: 'warm',
      hairStyle: 'short',
      hairColor: 'espresso',
      outfitStyle: 'overall',
      outfitColor: 'cream',
      accessory: 'glasses',
    },
    errandTitleVi: 'Tưới một luống hoa hoặc rau ở Nông trại',
    errandHintVi: 'Đứng sát ô đất trống để cuốc (J/nhấn chuột), gieo hạt rồi múc nước giếng tưới nhé.',
    entryNodeId: 'root',
    nodes: {
      root: {
        id: 'root',
        mood: 'warm',
        textVi: (ctx) => {
          const greeting = ctx.isNight
            ? `Tối rồi mà ${ctx.playerNickname} vẫn chăm chỉ ghé thăm bác à?`
            : ctx.weatherKind === 'drizzle'
              ? `Trời lất phất mưa thế này, cây ngoài ruộng được tưới mát lắm đấy ${ctx.playerNickname}!`
              : `Chào ${ctx.playerNickname}! Hôm nay hai bạn muốn trồng thêm gì cho nông trại nào?`;
          return ctx.mapId === 'farm'
            ? `${greeting} Mấy chú gà sáng nay quấn quýt hạt giống lắm.`
            : `${greeting} Tiệm hạt giống ngay sau lưng bác luôn mở cửa nhé.`;
        },
        choices: (ctx) => [
          { id: 'shop_seed', labelVi: 'Mua hạt giống tươi', action: 'open_seed_shop', badgeVi: 'Tiệm hạt' },
          { id: 'ship_crop', labelVi: 'Gửi bán nông sản lấy xu', action: 'open_shipping', badgeVi: 'Thùng gom' },
          { id: 'farming_tips', labelVi: 'Hỏi mẹo làm vườn sát luống', nextNodeId: 'farming_tips' },
          {
            id: 'errand_menu',
            labelVi: ctx.errandStatus === 'active' ? 'Báo cáo việc nông trại' : 'Việc nhỏ cùng Bác Hai',
            nextNodeId: 'errand_menu',
            badgeVi: ctx.errandStatus === 'active' ? 'Đang làm' : undefined,
          },
          { id: 'bye', labelVi: 'Cháu đi dạo tiếp đây', closesDialogue: true },
        ],
      },
      farming_tips: {
        id: 'farming_tips',
        mood: 'curious',
        textVi: () =>
          'Đứng ngay sát ô ruộng mình muốn chăm rồi dùng cuốc (phím 1), gieo hạt hoặc tưới nước — làm từng ô một cây lớn đều hơn nhiều. Hết nước thì ghé giếng đá ngay cạnh ruộng múc thêm nhé!',
        choices: () => [
          { id: 'shop_seed', labelVi: 'Mở gian hạt giống', action: 'open_seed_shop', badgeVi: 'Tiệm hạt' },
          { id: 'back_root', labelVi: 'Cháu nhớ rồi ạ', nextNodeId: 'root' },
        ],
      },
      ...makeErrandNodes({
        errandOfferVi: 'Mấy luống đất mới ngoài nông trại đang cần bàn tay khéo léo — bạn thử cuốc, gieo hoặc tưới giúp bác vài ô rồi quay lại báo nhé!',
        errandProgressVi: 'Đừng quên cầm hạt giống gần đàn gà, chúng thích lắm đấy! Xong việc cứ báo với bác nha.',
        errandDoneVi: 'Hai bạn chăm vườn mát tay thật sự! Lứa cây sau chắc chắn bội thu.',
      }),
    },
  },

  co_lan: {
    id: 'co_lan',
    nameVi: 'Cô Lan',
    roleTitleVi: 'Chủ Tiệm Bánh Hollow',
    accentHex: '#e38ba8',
    avatarConfig: {
      skinTone: 'fair',
      hairStyle: 'bob',
      hairColor: 'sakura',
      outfitStyle: 'cardigan',
      outfitColor: 'rose',
      accessory: 'ribbon',
    },
    errandTitleVi: 'Ghé xưởng bánh & chế biến một mẻ thơm ngon',
    errandHintVi: 'Mở Xưởng Hollow để xem công thức mứt dâu, bánh tart hay đĩa cá.',
    entryNodeId: 'root',
    nodes: {
      root: {
        id: 'root',
        mood: 'happy',
        textVi: (ctx) =>
          ctx.isNight
            ? `Đêm xuống tiệm bánh vẫn còn chút hương bơ ấm áp, ${ctx.playerNickname} có muốn vào bếp cùng cô không?`
            : `Chào ${ctx.playerNickname}! Lò bánh Hollow vừa thơm nức mùi dâu tây và lúa mì mới thu hoạch đó!`,
        choices: (ctx) => [
          { id: 'open_bakery', labelVi: 'Vào bếp làm bánh & chế biến', action: 'open_workshop', badgeVi: 'Xưởng bánh' },
          { id: 'bakery_lore', labelVi: 'Hỏi bí quyết làm quà cho người thương', nextNodeId: 'bakery_lore' },
          {
            id: 'errand_menu',
            labelVi: ctx.errandStatus === 'active' ? 'Báo cáo mẻ bánh mới' : 'Nhận việc nhỏ tiệm bánh',
            nextNodeId: 'errand_menu',
          },
          { id: 'bye', labelVi: 'Hẹn cô lát nữa nhé', closesDialogue: true },
        ],
      },
      bakery_lore: {
        id: 'bakery_lore',
        mood: 'warm',
        textVi: () =>
          'Dâu tây ngọt kết hợp đường và bột mì tạo thành bánh tart dâu rất hợp để hai người cùng thưởng thức ở bàn trà trong nhà đấy!',
        choices: () => [
          { id: 'open_bakery', labelVi: 'Xem công thức trong xưởng', action: 'open_workshop', badgeVi: 'Xưởng bánh' },
          { id: 'back_root', labelVi: 'Nghe thích quá!', nextNodeId: 'root' },
        ],
      },
      ...makeErrandNodes({
        errandOfferVi: 'Cô đang chuẩn bị khay bánh buổi chiều — cháu ghé Xưởng chế biến xem thử công thức mới rồi trò chuyện lại với cô nhé!',
        errandProgressVi: 'Trong xưởng có cả bếp bánh lẫn quầy nấu súp cá nữa đấy.',
        errandDoneVi: 'Mẻ bánh hôm nay thơm dịu hẳn nhờ có hai bạn ghé phụ!',
      }),
    },
  },

  chu_tu: {
    id: 'chu_tu',
    nameVi: 'Chú Tư',
    roleTitleVi: 'Thợ rèn & Tiệm Dụng Cụ',
    accentHex: '#6ea8cc',
    avatarConfig: {
      skinTone: 'tan',
      hairStyle: 'short',
      hairColor: 'espresso',
      outfitStyle: 'overall',
      outfitColor: 'sky',
      accessory: 'glasses',
    },
    errandTitleVi: 'Thử cần câu & sắm thêm mồi câu tại tiệm',
    errandHintVi: 'Mở Quầy dụng cụ · mồi hoặc ra cầu gỗ Vịnh Hải Âu câu thử.',
    entryNodeId: 'root',
    nodes: {
      root: {
        id: 'root',
        mood: 'warm',
        textVi: (ctx) =>
          `Chào ${ctx.playerNickname}! Cần câu, mồi nhử và phụ kiện làm vườn ở tiệm chú lúc nào cũng chắc chắn và sẵn sàng.`,
        choices: (ctx) => [
          { id: 'open_tools', labelVi: 'Mua mồi câu & đồ dùng', action: 'open_tool_shop', badgeVi: 'Dụng cụ' },
          { id: 'fishing_tips', labelVi: 'Hỏi cách câu cá hiếm hơn', nextNodeId: 'fishing_rarity_tips' },
          {
            id: 'errand_menu',
            labelVi: ctx.errandStatus === 'active' ? 'Báo cáo thử đồ câu' : 'Việc nhỏ tiệm dụng cụ',
            nextNodeId: 'errand_menu',
          },
          { id: 'bye', labelVi: 'Cháu cảm ơn chú Tư', closesDialogue: true },
        ],
      },
      fishing_rarity_tips: {
        id: 'fishing_rarity_tips',
        mood: 'curious',
        textVi: () =>
          'Cá thường ăn mồi dễ hơn, còn cá Bạc hay cá Hiếm ngoài Vịnh Hải Âu và Rừng thông sẽ kéo nhanh hơn — nhớ giữ nhịp thanh bắt thật êm tay nhé!',
        choices: () => [
          { id: 'open_tools', labelVi: 'Xem mồi câu & pantry', action: 'open_tool_shop', badgeVi: 'Dụng cụ' },
          { id: 'back_root', labelVi: 'Đã rõ ạ!', nextNodeId: 'root' },
        ],
      },
      ...makeErrandNodes({
        errandOfferVi: 'Chú mới nhập thêm mồi câu mới cho Vịnh Hải Âu — bạn ghé xem quầy dụng cụ hoặc thử câu một con cá rồi quay lại kể chú nghe nhé!',
        errandProgressVi: 'Đừng quên cá hiếm có giá trị bán rất cao hoặc dùng nấu ăn ở tiệm cô Lan!',
        errandDoneVi: 'Đồ nghề đúng chuẩn rồi đó! Chúc hai bạn kéo được nhiều mẻ cá đẹp.',
      }),
    },
  },

  be_na: {
    id: 'be_na',
    nameVi: 'Bé Na',
    roleTitleVi: 'Hướng dẫn viên Đảo & Rừng thông',
    accentHex: '#7abf84',
    avatarConfig: {
      skinTone: 'fair',
      hairStyle: 'long',
      hairColor: 'honey',
      outfitStyle: 'cardigan',
      outfitColor: 'sage',
      accessory: 'ribbon',
    },
    errandTitleVi: 'Đi dạo đủ cổng nối Vườn – Làng – Nông trại – Vịnh',
    errandHintVi: 'Theo các bảng chỉ đường phát sáng ở đầu cổng để khám phá hòn đảo.',
    entryNodeId: 'root',
    nodes: {
      root: {
        id: 'root',
        mood: 'happy',
        textVi: (ctx) =>
          ctx.mapId === 'forest'
            ? `Rừng thông hôm nay mát rượi luôn ${ctx.playerNickname}! Trên hồ phía đông yên tĩnh hợp câu cá thư giãn lắm.`
            : `Chào ${ctx.playerNickname}! Quảng trường làng hôm nay rộn ràng ghê — bạn muốn Na chỉ đường quanh đảo không?`,
        choices: (ctx) => [
          { id: 'map_guide', labelVi: 'Chỉ đường các khu vực trên đảo', nextNodeId: 'island_map_guide' },
          { id: 'cozy_tips', labelVi: 'Mẹo vườn hoa & chăm mèo cưng', nextNodeId: 'cozy_tips' },
          {
            id: 'errand_menu',
            labelVi: ctx.errandStatus === 'active' ? 'Kể Na nghe chuyến đi dạo' : 'Thử thách khám phá nhỏ',
            nextNodeId: 'errand_menu',
          },
          { id: 'bye', labelVi: 'Hẹn gặp lại Bé Na!', closesDialogue: true },
        ],
      },
      island_map_guide: {
        id: 'island_map_guide',
        mood: 'curious',
        textVi: () =>
          'Từ Vườn hoa riêng: đi cổng Nam qua cầu là ra Làng Cabacos; đi cổng Tây là thẳng tới Nông trại 184 luống! Còn từ quảng trường làng: đi hướng Đông qua cầu gỗ ra Vịnh Hải Âu, hoặc lên cổng Bắc để dạo Rừng thông nhé.',
        choices: () => [
          { id: 'back_root', labelVi: 'Dễ nhớ quá, cảm ơn Na!', nextNodeId: 'root' },
        ],
      },
      cozy_tips: {
        id: 'cozy_tips',
        mood: 'warm',
        textVi: (ctx) =>
          ctx.hasPet
            ? `${ctx.petName ?? 'Bé mèo'} thích chạy lon ton theo hai bạn ở nhà, vườn, làng và nông trại lắm! Khi muốn chơi gần với mèo 3D thì ghé cạnh bé hoặc mở mục Chăm mèo nha.`
            : 'Bạn có thể vào mục Trang trí để sắp xếp ghế gỗ vườn cho hai người ngồi ngắm hoa, hoặc nhận nuôi bé mèo ở bảng Thú cưng đó!',
        choices: () => [
          { id: 'pet_open', labelVi: 'Mở góc chăm sóc mèo', action: 'open_pet_care', badgeVi: 'Thú cưng' },
          { id: 'back_root', labelVi: 'Quay lại', nextNodeId: 'root' },
        ],
      },
      ...makeErrandNodes({
        errandOfferVi: 'Hai bạn thử đi qua cầu cổng gỗ nối Vườn – Làng – Vịnh Hải Âu để ngắm biển và mấy chú cua nhỏ chạy dọc bãi cát rồi quay lại kể Na nhé!',
        errandProgressVi: 'Nhìn mấy bảng mũi tên sáng nhẹ ở rìa mỗi bản đồ là nhận ra ngay lối đi.',
        errandDoneVi: 'Hai bạn thuộc hết đường trên đảo rồi đấy! Đảo mình càng ngày càng ấm áp.',
      }),
    },
  },

  ong_minh: {
    id: 'ong_minh',
    nameVi: 'Ông Minh',
    roleTitleVi: 'Ngư dân Vịnh Hải Âu',
    accentHex: '#4f9fd4',
    avatarConfig: {
      skinTone: 'tan',
      hairStyle: 'short',
      hairColor: 'chestnut',
      outfitStyle: 'sweater',
      outfitColor: 'sky',
      accessory: 'none',
    },
    errandTitleVi: 'Thả cần trên cầu gỗ Vịnh Hải Âu',
    errandHintVi: 'Ra cuối cầu gỗ hoặc chọn Câu cá ngay trong hội thoại.',
    entryNodeId: 'root',
    nodes: {
      root: {
        id: 'root',
        mood: 'warm',
        textVi: (ctx) =>
          ctx.weatherKind === 'drizzle'
            ? `Mưa nhẹ làm cá biển nổi lên gần cầu gỗ hơn đấy ${ctx.playerNickname}! Gió vịnh mát lắm.`
            : `Chào hai cháu ghé Vịnh Hải Âu! Sóng lặng thế này ngồi cuối cầu thả cần là hết ý, ${ctx.playerNickname} thử không?`,
        choices: (ctx) => [
          { id: 'fish_sea', labelVi: 'Ra cầu gỗ câu cá ngay', action: 'open_fishing_sea', badgeVi: 'Câu cá' },
          { id: 'sea_tips', labelVi: 'Bí quyết nhận biết cá hiếm', nextNodeId: 'sea_fishing_tips' },
          {
            id: 'errand_menu',
            labelVi: ctx.errandStatus === 'active' ? 'Khoe chiến lợi phẩm với ông' : 'Việc nhỏ ở bến vịnh',
            nextNodeId: 'errand_menu',
          },
          { id: 'bye', labelVi: 'Cháu đi ngắm sóng tiếp nhé', closesDialogue: true },
        ],
      },
      sea_fishing_tips: {
        id: 'sea_fishing_tips',
        mood: 'thoughtful',
        textVi: () =>
          'Vịnh Hải Âu có cá Nục, cá Thu, cá Ngừ Vây Vàng và cả Tôm Hùm Gió Hiếm! Loài càng hiếm vây càng nhanh — giữ mắt nhìn phao cá rồi kéo từng nhịp nhẹ là lên bờ ngon lành.',
        choices: () => [
          { id: 'fish_sea', labelVi: 'Thử thả cần luôn!', action: 'open_fishing_sea', badgeVi: 'Câu cá' },
          { id: 'back_root', labelVi: 'Cháu cảm ơn ông!', nextNodeId: 'root' },
        ],
      },
      ...makeErrandNodes({
        errandOfferVi: 'Hôm nay mấy chú cua dọc mép cát chạy rộn ràng lắm — cháu thử đi dọc bờ vịnh rồi ra cuối cầu thả cần một lượt nhé!',
        errandProgressVi: 'Đừng quên mở Túi đồ (I) để xem chi tiết từng loài cá mình bắt được.',
        errandDoneVi: 'Tay câu cừ thật đấy! Chúc hai cháu câu được con cá thật hiếm.',
      }),
    },
  },
};

export function resolveNpcProfile(
  npcId: string,
  fallback?: { labelVi?: string; role?: string; dialogueVi?: string },
): NpcProfile {
  const known = (NPC_PROFILES as Record<string, NpcProfile | undefined>)[npcId];
  if (known) return known;
  const cleanName = fallback?.labelVi?.trim() || 'Cư dân làng';
  const cleanRole = fallback?.role?.trim() || 'Người bạn trên đảo';
  const line = fallback?.dialogueVi?.trim() || 'Chào hai bạn! Chúc một ngày bình yên trên hòn đảo nhỏ.';
  return {
    id: npcId,
    nameVi: cleanName,
    roleTitleVi: cleanRole,
    accentHex: '#d8b46e',
    avatarConfig: NPC_PROFILES.bac_hai.avatarConfig,
    errandTitleVi: 'Trò chuyện làm quen',
    errandHintVi: 'Ghé thăm cư dân quanh đảo thường xuyên để tăng độ thân thiết.',
    entryNodeId: 'root',
    nodes: {
      root: {
        id: 'root',
        mood: 'warm',
        textVi: () => line,
        choices: () => [{ id: 'close', labelVi: 'Tạm biệt nhé', closesDialogue: true }],
      },
    },
  };
}

function npcSocialStorageKey(worldId: string, userId: string): string {
  return `olw:npc-social:v1:${worldId || 'local'}:${userId || 'player'}`;
}

export function loadNpcRelationshipState(worldId: string, userId: string): NpcRelationshipMap {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    const raw = window.localStorage.getItem(npcSocialStorageKey(worldId, userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as NpcRelationshipMap;
  } catch {
    return {};
  }
}

export function saveNpcRelationshipState(
  worldId: string,
  userId: string,
  map: NpcRelationshipMap,
): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(npcSocialStorageKey(worldId, userId), JSON.stringify(map));
  } catch {
    // ignore storage limits
  }
}

export function getNpcRelationship(
  map: NpcRelationshipMap,
  npcId: string,
): NpcRelationshipRecord {
  return map[npcId] ?? defaultRelRecord();
}

export function recordNpcConversation(
  map: NpcRelationshipMap,
  npcId: string,
  nowMs = Date.now(),
): NpcRelationshipMap {
  const cur = getNpcRelationship(map, npcId);
  const canBump = nowMs - cur.lastTalkedAtMs > 60_000;
  return {
    ...map,
    [npcId]: {
      ...cur,
      affinity: canBump ? Math.min(10, cur.affinity + 1) : cur.affinity,
      lastTalkedAtMs: nowMs,
    },
  };
}

export function setNpcErrandStatus(
  map: NpcRelationshipMap,
  npcId: string,
  errandStatus: NpcRelationshipRecord['errandStatus'],
  affinityBonus = 0,
): NpcRelationshipMap {
  const cur = getNpcRelationship(map, npcId);
  return {
    ...map,
    [npcId]: {
      ...cur,
      errandStatus,
      affinity: Math.min(10, cur.affinity + affinityBonus),
    },
  };
}
