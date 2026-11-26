import type { AvatarConfig, MapId } from '../types';

export type NpcId = 'bac_hai' | 'co_lan' | 'chu_tu' | 'be_na' | 'ong_minh' | 'thi_truong';
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
  readonly partnerInSameRoom?: boolean;
  readonly partnerNickname?: string;
  readonly heldItemSku?: string | null;
  readonly talkCount?: number;
  readonly seenLineIds?: readonly string[];
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
  talkCount?: number;
  seenLineIds?: string[];
}

export type NpcRelationshipMap = Record<string, NpcRelationshipRecord>;

export interface HadesDialogueLine {
  readonly id: string;
  readonly category: 'couple' | 'solo' | 'context';
  readonly when?: (ctx: NpcDialogueContext) => boolean;
  readonly textVi: (ctx: NpcDialogueContext) => string;
}

function partnerLabel(ctx: NpcDialogueContext): string {
  return ctx.partnerNickname?.trim() || 'người thương của cháu';
}

function catLabel(ctx: NpcDialogueContext): string {
  return ctx.petName?.trim() || 'Quýt';
}

export const NPC_DIALOGUE_POOLS: Readonly<Record<NpcId, readonly HadesDialogueLine[]>> = {
  bac_hai: [
    // Couple (when both players are together in the same room/zone)
    {
      id: 'bh_couple_1',
      category: 'couple',
      when: (ctx) => Boolean(ctx.partnerInSameRoom),
      textVi: (ctx) =>
        `Ôi chà, ${ctx.playerNickname} với ${partnerLabel(ctx)} cùng sánh bước tới thăm bác đấy à! Nhìn hai đứa đứng cạnh nhau thấy cả khu vườn sáng bừng lên luôn.`,
    },
    {
      id: 'bh_couple_2',
      category: 'couple',
      when: (ctx) => Boolean(ctx.partnerInSameRoom),
      textVi: (ctx) =>
        `Hai vợ chồng nhà này đúng là ăn ý thật — ${ctx.playerNickname} chọn giống dâu hay lúa mì thì để ${partnerLabel(ctx)} cầm bình tưới phụ một tay nha!`,
    },
    {
      id: 'bh_couple_3',
      category: 'couple',
      when: (ctx) => Boolean(ctx.partnerInSameRoom),
      textVi: (ctx) =>
        `Hồi sáng bác để dành hai túi hạt mầm khỏe nhất cho ${ctx.playerNickname} và ${partnerLabel(ctx)} nè. Trồng chung một luống hoa sau nhà thích lắm đó.`,
    },
    {
      id: 'bh_couple_4',
      category: 'couple',
      when: (ctx) => Boolean(ctx.partnerInSameRoom),
      textVi: (ctx) =>
        `Đi đâu cũng có cặp có đôi như ${ctx.playerNickname} với ${partnerLabel(ctx)} làm bác nhớ thuở trẻ ghê! Trong tiệm có đủ phân tốt lẫn giống ngon nhé.`,
    },
    // Solo (missing or asking warmly about partner)
    {
      id: 'bh_solo_1',
      category: 'solo',
      when: (ctx) => !ctx.partnerInSameRoom,
      textVi: (ctx) =>
        `Ủa hôm nay ${ctx.playerNickname} ghé một mình hả? ${partnerLabel(ctx)} chắc đang bận thu dọn ở nhà hay chuẩn bị bất ngờ gì cho cháu rồi.`,
    },
    {
      id: 'bh_solo_2',
      category: 'solo',
      when: (ctx) => !ctx.partnerInSameRoom,
      textVi: (ctx) =>
        `Chào ${ctx.playerNickname}! Nhớ chọn thêm ít hạt dâu ngọt mang về trồng bất ngờ cho ${partnerLabel(ctx)} ngắm mỗi sáng nhé.`,
    },
    {
      id: 'bh_solo_3',
      category: 'solo',
      when: (ctx) => !ctx.partnerInSameRoom,
      textVi: (ctx) =>
        `Một mình dạo quanh nông trại cũng thư thái lắm, nhưng lát nữa rủ ${partnerLabel(ctx)} qua đây xem mấy luống rau cùng lớn nha ${ctx.playerNickname}!`,
    },
    {
      id: 'bh_solo_4',
      category: 'solo',
      when: (ctx) => !ctx.partnerInSameRoom,
      textVi: (ctx) =>
        `${ctx.playerNickname} làm việc chăm thế này nhưng đừng quên nghỉ tay nhắn vài dòng cho ${partnerLabel(ctx)} yên tâm nhé.`,
    },
    // Context lines (night, weather, pet, held tool/seed, location)
    {
      id: 'bh_ctx_night',
      category: 'context',
      when: (ctx) => ctx.isNight,
      textVi: (ctx) =>
        `Đêm xuống gió đồng mát rượi luôn ${ctx.playerNickname}! Đèn lồng tiệm bác vẫn chong sáng để đón hai đứa ghé muộn đó.`,
    },
    {
      id: 'bh_ctx_rain',
      category: 'context',
      when: (ctx) => ctx.weatherKind === 'drizzle',
      textVi: (ctx) =>
        `Mưa lất phất thế này hạt nảy mầm nhanh cực kỳ, cháu chẳng cần chạy ra giếng múc nước nhiều đâu ${ctx.playerNickname}!`,
    },
    {
      id: 'bh_ctx_pet',
      category: 'context',
      when: (ctx) => ctx.hasPet,
      textVi: (ctx) =>
        `Bé ${catLabel(ctx)} hồi nãy cứ rình mấy chú gà ngoài sân cười muốn xỉu luôn ${ctx.playerNickname}! Mèo nhà cháu lanh lợi thật sự.`,
    },
    {
      id: 'bh_ctx_tool',
      category: 'context',
      when: (ctx) => Boolean(ctx.heldItemSku),
      textVi: (ctx) =>
        ctx.heldItemSku?.startsWith('seed_')
          ? `Trên tay cháu là bịch hạt ngon rồi đấy! Ra ô đất nâu đứng sát vào là gieo được ngay.`
          : `Đồ nghề sẵn trên tay rồi hả ${ctx.playerNickname}? Cần thêm hạt giống hay gửi bán nông sản cứ nói bác mở sổ ngay!`,
    },
  ],

  co_lan: [
    {
      id: 'cl_couple_1',
      category: 'couple',
      when: (ctx) => Boolean(ctx.partnerInSameRoom),
      textVi: (ctx) =>
        `A! ${ctx.playerNickname} và ${partnerLabel(ctx)} cùng tới chợ luôn nè! Nhìn hai đứa ríu rít đi cùng nhau ngọt hơn cả bánh tart dâu mới nướng của cô đó.`,
    },
    {
      id: 'cl_couple_2',
      category: 'couple',
      when: (ctx) => Boolean(ctx.partnerInSameRoom),
      textVi: (ctx) =>
        `Hôm nay có cả ${ctx.playerNickname} lẫn ${partnerLabel(ctx)}, hay hai bạn chọn một món bánh cặp rồi mang về bàn ăn trong nhà thưởng thức chung đi!`,
    },
    {
      id: 'cl_couple_3',
      category: 'couple',
      when: (ctx) => Boolean(ctx.partnerInSameRoom),
      textVi: (ctx) =>
        `Cô mới để riêng hai phần mứt dâu trên quầy cho ${ctx.playerNickname} và ${partnerLabel(ctx)}. Chợ nông sản vui nhất là lúc thấy hai cháu cười nói bên nhau.`,
    },
    {
      id: 'cl_couple_4',
      category: 'couple',
      when: (ctx) => Boolean(ctx.partnerInSameRoom),
      textVi: (ctx) =>
        `Đứng sát bên quầy cô chụp một tấm kỷ niệm nào — cả ${ctx.playerNickname} với ${partnerLabel(ctx)} hôm nay đều có vẻ rạng rỡ đặc biệt luôn đó!`,
    },
    {
      id: 'cl_solo_1',
      category: 'solo',
      when: (ctx) => !ctx.partnerInSameRoom,
      textVi: (ctx) =>
        `Chào ${ctx.playerNickname}! Hôm nay ${partnerLabel(ctx)} không đi chợ cùng cháu à? Để cô gói thêm một phần bánh ấm để cháu mang về làm quà nhé.`,
    },
    {
      id: 'cl_solo_2',
      category: 'solo',
      when: (ctx) => !ctx.partnerInSameRoom,
      textVi: (ctx) =>
        `Cô đang ủ mẻ bột mới chờ ${ctx.playerNickname} với ${partnerLabel(ctx)} cùng ghé ăn thử nè. Cháu ghé một mình vậy mà thấy hơi thiếu một tiếng cười đấy nha!`,
    },
    {
      id: 'cl_solo_3',
      category: 'solo',
      when: (ctx) => !ctx.partnerInSameRoom,
      textVi: (ctx) =>
        `${ctx.playerNickname} vừa thu hoạch hay đi dạo một mình về phải không? Lát gọi ${partnerLabel(ctx)} vào Xưởng Hollow cùng phụ bếp cho vui nhé.`,
    },
    {
      id: 'cl_solo_4',
      category: 'solo',
      when: (ctx) => !ctx.partnerInSameRoom,
      textVi: (ctx) =>
        `Gửi chút hương vani và dâu tây cho ${ctx.playerNickname}! Về nhớ kể với ${partnerLabel(ctx)} là tiệm bánh hôm nay thơm nức cả ngõ luôn nha.`,
    },
    {
      id: 'cl_ctx_night',
      category: 'context',
      when: (ctx) => ctx.isNight,
      textVi: (ctx) =>
        `Tối trời rồi mà bếp bánh vẫn ấm lửa đỏ hồng nè ${ctx.playerNickname}. Uống ly trà nóng rồi hãy dạo tiếp dưới ánh sao nhé!`,
    },
    {
      id: 'cl_ctx_rain',
      category: 'context',
      when: (ctx) => ctx.weatherKind === 'drizzle',
      textVi: (ctx) =>
        `Trời mưa lâm râm mà ngửi mùi bánh bơ vừa chín tới thì hết sẩy ${ctx.playerNickname} ơi!`,
    },
    {
      id: 'cl_ctx_pet',
      category: 'context',
      when: (ctx) => ctx.hasPet,
      textVi: (ctx) =>
        `Bé ${catLabel(ctx)} ngửi thấy mùi cá nướng từ chảo cô là vểnh tai ngay ấy ${ctx.playerNickname}! Dễ thương hết chỗ nói.`,
    },
    {
      id: 'cl_ctx_fish',
      category: 'context',
      when: (ctx) => ctx.affinity >= 2 || ctx.walletCoins >= 80,
      textVi: (ctx) =>
        `Khách quen tới chơi rồi ${ctx.playerNickname}! Túi xu (${ctx.walletCoins}) đang rủng rỉnh vậy, cháu muốn thử công thức súp hải sản hay bánh dâu đặc biệt nào?`,
    },
  ],

  chu_tu: [
    {
      id: 'ct_couple_1',
      category: 'couple',
      when: (ctx) => Boolean(ctx.partnerInSameRoom),
      textVi: (ctx) =>
        `Haha! ${ctx.playerNickname} và ${partnerLabel(ctx)} cùng dắt nhau vào tiệm dụng cụ à? Một người cầm cuốc, một người xách cần câu — chuẩn cặp đôi đảo nhỏ luôn!`,
    },
    {
      id: 'ct_couple_2',
      category: 'couple',
      when: (ctx) => Boolean(ctx.partnerInSameRoom),
      textVi: (ctx) =>
        `Hai cháu ${ctx.playerNickname} và ${partnerLabel(ctx)} định rủ nhau đi câu cá thi xem ai kéo được cá hiếm trước phải không? Chú mới mài thêm móc câu bén lắm.`,
    },
    {
      id: 'ct_couple_3',
      category: 'couple',
      when: (ctx) => Boolean(ctx.partnerInSameRoom),
      textVi: (ctx) =>
        `Có cả hai đứa ở đây chú vui hẳn! Để chú chỉnh lại cặp cần gỗ đôi cho ${ctx.playerNickname} với ${partnerLabel(ctx)} ra cầu gỗ Vịnh Hải Âu thử nha.`,
    },
    {
      id: 'ct_couple_4',
      category: 'couple',
      when: (ctx) => Boolean(ctx.partnerInSameRoom),
      textVi: (ctx) =>
        `Bình tưới hay cuốc sắt nhà nào có hai người giữ gìn cùng nhau đều bền hơn gấp bội — nhìn ${ctx.playerNickname} với ${partnerLabel(ctx)} là chú biết ngay.`,
    },
    {
      id: 'ct_solo_1',
      category: 'solo',
      when: (ctx) => !ctx.partnerInSameRoom,
      textVi: (ctx) =>
        `Chào ${ctx.playerNickname}! Đi mua mồi câu lén trước để trổ tài với ${partnerLabel(ctx)} đúng không? Chú giữ bí mật giùm cho!`,
    },
    {
      id: 'ct_solo_2',
      category: 'solo',
      when: (ctx) => !ctx.partnerInSameRoom,
      textVi: (ctx) =>
        `Hôm nay thấy ${ctx.playerNickname} ghé một mình, ${partnerLabel(ctx)} đang ở ngoài biển hay trong vườn hả cháu? Cần gì bảo chú chuẩn bị sẵn cho hai đứa.`,
    },
    {
      id: 'ct_solo_3',
      category: 'solo',
      when: (ctx) => !ctx.partnerInSameRoom,
      textVi: (ctx) =>
        `Rèn xong mẻ lưỡi câu sáng bóng này chú nghĩ ngay tới đội câu ${ctx.playerNickname} – ${partnerLabel(ctx)} đấy! Khi nào rảnh rủ nhau ra cầu tàu nhé.`,
    },
    {
      id: 'ct_solo_4',
      category: 'solo',
      when: (ctx) => !ctx.partnerInSameRoom,
      textVi: (ctx) =>
        `Cần gì đồ nghề làm nông thì ${ctx.playerNickname} cứ chọn thoải mái, mang về đỡ đần cho cả ${partnerLabel(ctx)} nữa nhé.`,
    },
    {
      id: 'ct_ctx_night',
      category: 'context',
      when: (ctx) => ctx.isNight,
      textVi: (ctx) =>
        `Đêm rồi mà lò rèn chú Tư vẫn còn than hồng ấm lắm ${ctx.playerNickname}. Câu cá đêm ngoài vịnh nghe sóng vỗ thích cực kỳ!`,
    },
    {
      id: 'ct_ctx_rain',
      category: 'context',
      when: (ctx) => ctx.weatherKind === 'drizzle',
      textVi: (ctx) =>
        `Mưa bụi thế này không làm rỉ đồ nghề của chú đâu — cá lớn ngoài Vịnh Hải Âu lại hay ăn mồi vào buổi mưa nhẹ đấy ${ctx.playerNickname}!`,
    },
    {
      id: 'ct_ctx_pet',
      category: 'context',
      when: (ctx) => ctx.hasPet,
      textVi: (ctx) =>
        `Bé ${catLabel(ctx)} cứ nhìn chằm chằm vào xô mồi câu trong góc tiệm chú kìa ${ctx.playerNickname}! Coi chừng chú ăn vụng mất một con cá mồi đấy haha.`,
    },
    {
      id: 'ct_ctx_tool',
      category: 'context',
      when: (ctx) => Boolean(ctx.heldItemSku),
      textVi: (ctx) =>
        ctx.heldItemSku === 'tool_fishing_rod'
          ? `Cây cần câu trên tay trông cứng cáp ghê ${ctx.playerNickname}! Nhớ thủ thêm mồi trước khi thả dây câu cá hiếm nhé.`
          : `Thợ lành nghề chọn đồ chuẩn lắm! Quầy dụng cụ lúc nào cũng sẵn vật tư tốt nhất cho ${ctx.playerNickname}.`,
    },
  ],

  be_na: [
    {
      id: 'bn_couple_1',
      category: 'couple',
      when: (ctx) => Boolean(ctx.partnerInSameRoom),
      textVi: (ctx) =>
        `Oa!! Anh chị ${ctx.playerNickname} và ${partnerLabel(ctx)} đi chơi đôi với nhau nhìn cưng xỉu luôn!! Hôm nay hai người muốn đi dạo Rừng thông hay ngắm hoàng hôn ngoài Vịnh Hải Âu nè?`,
    },
    {
      id: 'bn_couple_2',
      category: 'couple',
      when: (ctx) => Boolean(ctx.partnerInSameRoom),
      textVi: (ctx) =>
        `Na thấy hai người ${ctx.playerNickname} với ${partnerLabel(ctx)} đứng gần nhau phát sáng cả khu rừng/quảng trường luôn á! Lên cầu gỗ hay ngồi ghế dưới tán cây chill lắm đó!`,
    },
    {
      id: 'bn_couple_3',
      category: 'couple',
      when: (ctx) => Boolean(ctx.partnerInSameRoom),
      textVi: (ctx) =>
        `Hihi có đủ cả ${ctx.playerNickname} lẫn ${partnerLabel(ctx)} rồi nè! Đừng quên tìm mấy chú ốc sên với cua nhỏ chạy lon ton dọc đường đi nha hai bạn.`,
    },
    {
      id: 'bn_couple_4',
      category: 'couple',
      when: (ctx) => Boolean(ctx.partnerInSameRoom),
      textVi: (ctx) =>
        `Bí mật nhỏ nha: đi cùng ${partnerLabel(ctx)} qua mấy cây cầu gỗ lúc trời tối ngắm đom đóm và sao trời là đẹp nhất đảo luôn đó ${ctx.playerNickname}!`,
    },
    {
      id: 'bn_solo_1',
      category: 'solo',
      when: (ctx) => !ctx.partnerInSameRoom,
      textVi: (ctx) =>
        `Ơ ${ctx.playerNickname} hôm nay đi thám hiểm trước một mình à? Lát nhớ dẫn ${partnerLabel(ctx)} lên đây cùng nghe gió thổi qua tán thông nhé!`,
    },
    {
      id: 'bn_solo_2',
      category: 'solo',
      when: (ctx) => !ctx.partnerInSameRoom,
      textVi: (ctx) =>
        `Na vừa thấy đàn cừu nhảy nhót bên đồng cỏ Nông trại — ${ctx.playerNickname} nhớ rủ ${partnerLabel(ctx)} qua xem chung cho vui nha!`,
    },
    {
      id: 'bn_solo_3',
      category: 'solo',
      when: (ctx) => !ctx.partnerInSameRoom,
      textVi: (ctx) =>
        `Đi một mình quanh làng cẩn thận kẻo lạc mấy bậc thang leo vách đá nha ${ctx.playerNickname}! Nhưng mà thang gỗ bây giờ Na mở lối hết trơn rồi, leo lên nhìn toàn cảnh đã lắm.`,
    },
    {
      id: 'bn_solo_4',
      category: 'solo',
      when: (ctx) => !ctx.partnerInSameRoom,
      textVi: (ctx) =>
        `Gặp ${ctx.playerNickname} vui ghê! Nếu thấy nhớ ${partnerLabel(ctx)} thì mở bảng Thả tim ở góc phải gửi cái ôm ấm áp từ xa nha!`,
    },
    {
      id: 'bn_ctx_night',
      category: 'context',
      when: (ctx) => ctx.isNight,
      textVi: (ctx) =>
        `Nhìn bầu trời đầy sao lấp lánh với mấy chú đom đóm kìa ${ctx.playerNickname}! Ban đêm trên đảo thơ mộng y như phim hoạt hình luôn.`,
    },
    {
      id: 'bn_ctx_rain',
      category: 'context',
      when: (ctx) => ctx.weatherKind === 'drizzle',
      textVi: (ctx) =>
        `Mưa lất phất làm lá thông xanh rì luôn ${ctx.playerNickname}! Đừng lo bị ướt, không khí mát mẻ thế này đi dạo thích lắm.`,
    },
    {
      id: 'bn_ctx_pet',
      category: 'context',
      when: (ctx) => ctx.hasPet,
      textVi: (ctx) =>
        `Bé ${catLabel(ctx)} nãy chạy theo ${ctx.playerNickname} cưng xỉu luôn! Chắc chắn mấy chú gà ngoài làng sắp phải chạy toán loạn vì bé cho xem.`,
    },
    {
      id: 'bn_ctx_forest',
      category: 'context',
      when: (ctx) => ctx.mapId === 'forest' || ctx.affinity >= 2,
      textVi: (ctx) =>
        `Từ Rừng thông đi thẳng đường mòn xuống phía Nam là ra lại con đường đất phía Bắc Nông trại luôn đó ${ctx.playerNickname} — tiện hơn trước nhiều luôn!`,
    },
  ],

  ong_minh: [
    {
      id: 'om_couple_1',
      category: 'couple',
      when: (ctx) => Boolean(ctx.partnerInSameRoom),
      textVi: (ctx) =>
        `Ồ, cả ${ctx.playerNickname} với ${partnerLabel(ctx)} cùng dạo ra Vịnh Hải Âu ngắm biển hả cháu? Gió vịnh chiều nay êm lắm, ngồi cuối cầu gỗ buông cần chung là hết ý!`,
    },
    {
      id: 'om_couple_2',
      category: 'couple',
      when: (ctx) => Boolean(ctx.partnerInSameRoom),
      textVi: (ctx) =>
        `Ông câu ở vịnh này mấy chục năm rồi, thấy đôi trẻ ${ctx.playerNickname} và ${partnerLabel(ctx)} đứng tựa vai nhau trên cầu gỗ mà lòng ông cũng vui lây.`,
    },
    {
      id: 'om_couple_3',
      category: 'couple',
      when: (ctx) => Boolean(ctx.partnerInSameRoom),
      textVi: (ctx) =>
        `Mấy chú cua trên cát hễ thấy cặp đôi ${ctx.playerNickname} – ${partnerLabel(ctx)} bước tới là chạy rào rào chào đón đó haha! Ra cầu gỗ thử vận may cá hiếm đi hai cháu.`,
    },
    {
      id: 'om_couple_4',
      category: 'couple',
      when: (ctx) => Boolean(ctx.partnerInSameRoom),
      textVi: (ctx) =>
        `Câu được con Tôm Hùm Gió hay Cá Ngừ nào, ${ctx.playerNickname} với ${partnerLabel(ctx)} mang về nấu nồi canh ngọt cho ấm bụng nhé!`,
    },
    {
      id: 'om_solo_1',
      category: 'solo',
      when: (ctx) => !ctx.partnerInSameRoom,
      textVi: (ctx) =>
        `Hôm nay ${ctx.playerNickname} ra biển hóng gió một mình à? Khi nào ${partnerLabel(ctx)} rảnh nhớ rủ ra ngồi ghế gỗ bến vịnh nghe sóng vỗ chung nhé.`,
    },
    {
      id: 'om_solo_2',
      category: 'solo',
      when: (ctx) => !ctx.partnerInSameRoom,
      textVi: (ctx) =>
        `Ngồi câu một mình giữa tiếng sóng biển cũng tĩnh tâm lắm ${ctx.playerNickname} ơi — nhưng câu được con cá hiếm xong nhớ khoe liền với ${partnerLabel(ctx)} nha!`,
    },
    {
      id: 'om_solo_3',
      category: 'solo',
      when: (ctx) => !ctx.partnerInSameRoom,
      textVi: (ctx) =>
        `Chiều nay cá thu vào gần bờ lắm ${ctx.playerNickname}. Thử kéo một mẻ to làm bất ngờ cho ${partnerLabel(ctx)} tối nay xem sao!`,
    },
    {
      id: 'om_solo_4',
      category: 'solo',
      when: (ctx) => !ctx.partnerInSameRoom,
      textVi: (ctx) =>
        `Ông mới thấy đàn ốc biển nhỏ bò dọc bãi cát kia kìa. Lát dẫn ${partnerLabel(ctx)} đi dạo bờ cát phía Nam đẹp lắm đấy ${ctx.playerNickname}.`,
    },
    {
      id: 'om_ctx_night',
      category: 'context',
      when: (ctx) => ctx.isNight,
      textVi: (ctx) =>
        `Biển đêm Vịnh Hải Âu lấp lánh ánh sao phản chiếu trên mặt nước đẹp nao lòng luôn ${ctx.playerNickname}! Câu cá đêm đôi khi dính loại phát sáng hiếm lắm đấy.`,
    },
    {
      id: 'om_ctx_rain',
      category: 'context',
      when: (ctx) => ctx.weatherKind === 'drizzle',
      textVi: (ctx) =>
        `Mưa nhẹ gõ lách tách trên mặt vịnh lại là lúc đàn cá nổi lên săn mồi nhiều nhất đấy ${ctx.playerNickname}!`,
    },
    {
      id: 'om_ctx_pet',
      category: 'context',
      when: (ctx) => ctx.hasPet,
      textVi: (ctx) =>
        `Bé ${catLabel(ctx)} mắt sáng rực mỗi lần ông nhấc xô cá tươi lên kìa ${ctx.playerNickname}! Con mèo nhỏ này sành ăn cá biển lắm nha.`,
    },
    {
      id: 'om_ctx_fish',
      category: 'context',
      when: (ctx) => Boolean(ctx.heldItemSku?.startsWith('fish_')) || ctx.affinity >= 2,
      textVi: (ctx) =>
        `Tay câu ngày càng lên tay rồi đó ${ctx.playerNickname}! Ngoài vịnh có tới đủ hạng cá Thường, Bạc, Hiếm chờ người kiên nhẫn chinh phục.`,
    },
  ],

  thi_truong: [
    {
      id: 'tt_couple_1',
      category: 'couple',
      when: (ctx) => Boolean(ctx.partnerInSameRoom),
      textVi: (ctx) =>
        `Chào mừng cặp đôi ${ctx.playerNickname} và ${partnerLabel(ctx)} tới Tòa Thị Chính Cabacos! Hồ sơ công dân của hai bạn lúc nào cũng là điểm sáng ấm áp nhất đảo nhỏ này.`,
    },
    {
      id: 'tt_couple_2',
      category: 'couple',
      when: (ctx) => Boolean(ctx.partnerInSameRoom),
      textVi: (ctx) =>
        `Nhìn ${ctx.playerNickname} và ${partnerLabel(ctx)} cùng đồng hành vào Tòa Thị Chính thật đáng quý! Mỗi món đồ hai bạn trang trí đều làm thung lũng thêm sức sống.`,
    },
    {
      id: 'tt_couple_3',
      category: 'couple',
      when: (ctx) => Boolean(ctx.partnerInSameRoom),
      textVi: (ctx) =>
        `Tòa Thị Chính ghi nhận cả hai cư dân ${ctx.playerNickname} & ${partnerLabel(ctx)} đang chung sức xây tổ ấm tuyệt vời! Cần chỉ đường tới bất kỳ tiệm nào cứ hỏi tôi.`,
    },
    {
      id: 'tt_couple_4',
      category: 'couple',
      when: (ctx) => Boolean(ctx.partnerInSameRoom),
      textVi: (ctx) =>
        `Chúc mừng hai bạn ngày hôm nay thật bình yên! Sau giờ làm vườn, ${ctx.playerNickname} và ${partnerLabel(ctx)} nhớ dành thời gian nghỉ ngơi bên nhau ở sofa hay bờ biển nhé.`,
    },
    {
      id: 'tt_solo_1',
      category: 'solo',
      when: (ctx) => !ctx.partnerInSameRoom,
      textVi: (ctx) =>
        `Xin chào ${ctx.playerNickname}! Hôm nay bạn đại diện hai người tới thăm Tòa Thị Chính à? Gửi lời hỏi thăm thân thương của tôi tới ${partnerLabel(ctx)} nhé!`,
    },
    {
      id: 'tt_solo_2',
      category: 'solo',
      when: (ctx) => !ctx.partnerInSameRoom,
      textVi: (ctx) =>
        `Bảng quy hoạch đảo vẫn luôn cập nhật gọn gàng chờ ${ctx.playerNickname} và ${partnerLabel(ctx)} cùng xem. Lần tới nhớ rủ cả hai cùng ghé cho vui cửa vui nhà nha.`,
    },
    {
      id: 'tt_solo_3',
      category: 'solo',
      when: (ctx) => !ctx.partnerInSameRoom,
      textVi: (ctx) =>
        `Tôi thấy ${ctx.playerNickname} rất chu đáo chăm lo cho cả nông trại lẫn mái ấm — ${partnerLabel(ctx)} hẳn sẽ cảm động lắm khi nghe bạn kể lại chuyện hôm nay.`,
    },
    {
      id: 'tt_solo_4',
      category: 'solo',
      when: (ctx) => !ctx.partnerInSameRoom,
      textVi: (ctx) =>
        `Cần hỗ trợ thông tin cư dân hay dịch vụ làng Cabacos cứ bảo tôi nhé ${ctx.playerNickname}, dù bạn tới một mình hay đi cùng ${partnerLabel(ctx)}.`,
    },
    {
      id: 'tt_ctx_night',
      category: 'context',
      when: (ctx) => ctx.isNight,
      textVi: (ctx) =>
        `Đã khuya rồi nhưng Tòa Thị Chính vẫn thắp đèn tiếp đón ${ctx.playerNickname}. Trời đêm đảo nhỏ yên ả lắm, nhớ giữ gìn sức khỏe nhé!`,
    },
    {
      id: 'tt_ctx_rain',
      category: 'context',
      when: (ctx) => ctx.weatherKind === 'drizzle',
      textVi: (ctx) =>
        `Ngoài trời đang mưa phùn nhè nhẹ, ngồi trong Tòa Thị Chính ấm áp nghe tiếng mưa rơi thật dễ chịu phải không ${ctx.playerNickname}?`,
    },
    {
      id: 'tt_ctx_pet',
      category: 'context',
      when: (ctx) => ctx.hasPet,
      textVi: (ctx) =>
        `Nghe dân làng khen bé ${catLabel(ctx)} nhà ${ctx.playerNickname} ngoan mà lanh lợi lắm! Bé thích nhất những lúc chạy lon ton theo chủ khắp quảng trường đấy.`,
    },
    {
      id: 'tt_ctx_coins',
      category: 'context',
      when: (ctx) => ctx.affinity >= 1,
      textVi: (ctx) =>
        `Quỹ chung hiện có ${ctx.walletCoins} xu rồi đó ${ctx.playerNickname}! Bản đồ mở rộng thêm ruộng phụ đang được hội đồng chuẩn bị cho chặng V0.2 sắp tới.`,
    },
  ],
};

function defaultRelRecord(): NpcRelationshipRecord {
  return { affinity: 1, errandStatus: 'none', lastTalkedAtMs: 0, talkCount: 0, seenLineIds: [] };
}

export function selectHadesDialogueLine(
  npcId: string,
  ctx: NpcDialogueContext,
): HadesDialogueLine | null {
  const pool = (NPC_DIALOGUE_POOLS as Record<string, readonly HadesDialogueLine[] | undefined>)[npcId];
  if (!pool || pool.length === 0) return null;

  const seen = new Set(ctx.seenLineIds ?? []);
  const eligible = pool.filter((line) => (line.when ? line.when(ctx) : true));
  const candidates = eligible.length > 0 ? eligible : pool;

  const partnerPriority = ctx.partnerInSameRoom ? 'couple' : 'solo';
  const unseenPriority = candidates.filter((l) => !seen.has(l.id) && l.category === partnerPriority);
  const unseenContext = candidates.filter((l) => !seen.has(l.id) && l.category === 'context');
  const unseenAny = candidates.filter((l) => !seen.has(l.id));

  const talkIdx = Math.max(0, ctx.talkCount ?? 0);
  // Alternate between relationship-aware partner lines and vivid world context lines while strictly avoiding repeats
  const preferContext = talkIdx % 3 === 2 && unseenContext.length > 0;
  const bucket = preferContext
    ? unseenContext
    : unseenPriority.length > 0
      ? unseenPriority
      : unseenAny.length > 0
        ? unseenAny
        : candidates;

  const idx = talkIdx % bucket.length;
  return bucket[idx] ?? bucket[0]!;
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
        textVi: (ctx) => selectHadesDialogueLine('bac_hai', ctx)!.textVi(ctx),
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
    roleTitleVi: 'Chủ Tiệm Bánh & Chợ Nông Sản',
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
        textVi: (ctx) => selectHadesDialogueLine('co_lan', ctx)!.textVi(ctx),
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
        textVi: (ctx) => selectHadesDialogueLine('chu_tu', ctx)!.textVi(ctx),
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
    errandTitleVi: 'Đi dạo đủ cổng nối Vườn – Làng – Nông trại – Rừng – Vịnh',
    errandHintVi: 'Theo các bảng chỉ đường phát sáng ở đầu cổng để khám phá hòn đảo.',
    entryNodeId: 'root',
    nodes: {
      root: {
        id: 'root',
        mood: 'happy',
        textVi: (ctx) => selectHadesDialogueLine('be_na', ctx)!.textVi(ctx),
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
          'Từ Vườn nhà: đi cổng Tây ra thẳng Nông trại 184 luống (rồi đi thẳng con đường đất phía Bắc nông trại lên Rừng thông mát rượi!), hoặc đi cầu Nam tới cầu gỗ Bắc Làng Cabacos; từ làng đi bến tàu phía Đông là ra Vịnh Hải Âu!',
        choices: () => [
          { id: 'back_root', labelVi: 'Dễ nhớ quá, cảm ơn Na!', nextNodeId: 'root' },
        ],
      },
      cozy_tips: {
        id: 'cozy_tips',
        mood: 'warm',
        textVi: (ctx) =>
          ctx.hasPet
            ? `${ctx.petName ?? 'Bé mèo'} thích chạy lon ton theo hai bạn ở nhà, vườn, làng, nông trại, rừng và bãi biển lắm! Khi muốn chơi gần với mèo 3D thì ghé cạnh bé hoặc mở mục Chăm mèo nha.`
            : 'Bạn có thể vào mục Trang trí để sắp xếp ghế gỗ vườn cho hai người ngồi ngắm hoa, hoặc nhận nuôi bé mèo ở bảng Thú cưng đó!',
        choices: () => [
          { id: 'pet_open', labelVi: 'Mở góc chăm sóc mèo', action: 'open_pet_care', badgeVi: 'Thú cưng' },
          { id: 'back_root', labelVi: 'Quay lại', nextNodeId: 'root' },
        ],
      },
      ...makeErrandNodes({
        errandOfferVi: 'Hai bạn thử đi qua cầu gỗ nối Vườn – Làng – Vịnh Hải Âu, rồi dạo đường Bắc Nông trại lên Rừng thông để ngắm mấy chú cua, ốc sên nhé!',
        errandProgressVi: 'Nhìn mấy bảng mũi tên sáng nhẹ ở đầu đường & cầu gỗ là nhận ra ngay lối đi.',
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
        textVi: (ctx) => selectHadesDialogueLine('ong_minh', ctx)!.textVi(ctx),
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
        errandOfferVi: 'Hôm nay mấy chú cua & ốc sên dọc mép cát chạy rộn ràng lắm — cháu thử đi dọc bờ vịnh rồi ra cuối cầu thả cần một lượt nhé!',
        errandProgressVi: 'Đừng quên mở Túi đồ (I) để xem chi tiết từng loài cá mình bắt được.',
        errandDoneVi: 'Tay câu cừ thật đấy! Chúc hai cháu câu được con cá thật hiếm.',
      }),
    },
  },

  thi_truong: {
    id: 'thi_truong',
    nameVi: 'Trưởng Làng Minh',
    roleTitleVi: 'Tòa Thị Chính Cabacos',
    accentHex: '#b48cd8',
    avatarConfig: {
      skinTone: 'fair',
      hairStyle: 'short',
      hairColor: 'espresso',
      outfitStyle: 'sweater',
      outfitColor: 'rose',
      accessory: 'glasses',
    },
    errandTitleVi: 'Thăm hỏi hết cư dân và các cửa hàng Làng Cabacos',
    errandHintVi: 'Ghé Tiệm Hạt, Tiệm Dụng Cụ, Chợ Nông Sản rồi quay lại Tòa Thị Chính báo tin nhé.',
    entryNodeId: 'root',
    nodes: {
      root: {
        id: 'root',
        mood: 'warm',
        textVi: (ctx) => selectHadesDialogueLine('thi_truong', ctx)!.textVi(ctx),
        choices: (ctx) => [
          { id: 'town_lore', labelVi: 'Xem thông tin cư dân & đảo nhỏ', nextNodeId: 'town_lore' },
          { id: 'pet_open', labelVi: 'Mở góc chăm sóc bé mèo', action: 'open_pet_care', badgeVi: 'Thú cưng' },
          {
            id: 'errand_menu',
            labelVi: ctx.errandStatus === 'active' ? 'Báo cáo dạo quanh làng' : 'Việc nhỏ cùng Tòa Thị Chính',
            nextNodeId: 'errand_menu',
          },
          { id: 'bye', labelVi: 'Cháu xin phép ra sảnh ngoài ạ', closesDialogue: true },
        ],
      },
      town_lore: {
        id: 'town_lore',
        mood: 'thoughtful',
        textVi: () =>
          'Cabacos nối liền Vườn hoa qua cầu gỗ phía Bắc, nối ra Vịnh Hải Âu ở phía Đông, còn Rừng thông xanh mát nằm ngay phía Bắc Nông trại 184 luống. Tòa Thị Chính đang chuẩn bị bản đồ ruộng mở rộng cho V0.2!',
        choices: () => [
          { id: 'back_root', labelVi: 'Cảm ơn thông tin hữu ích ạ!', nextNodeId: 'root' },
        ],
      },
      ...makeErrandNodes({
        errandOfferVi: 'Nếu rảnh, hai bạn ghé thăm hết Tiệm Hạt, Tiệm Dụng Cụ và Chợ Nông Sản trong làng để làm quen dân làng rồi báo tôi một tiếng nha.',
        errandProgressVi: 'Bác Hai, Chú Tư và Cô Lan đều đang túc trực ngay trong từng cửa hàng đấy!',
        errandDoneVi: 'Đôi bạn hòa nhập rất nhanh với nhịp sống Cabacos — ai trong làng cũng quý hai bạn.',
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
  const rec = map[npcId];
  if (!rec) return defaultRelRecord();
  return {
    affinity: rec.affinity ?? 1,
    errandStatus: rec.errandStatus ?? 'none',
    lastTalkedAtMs: rec.lastTalkedAtMs ?? 0,
    talkCount: rec.talkCount ?? 0,
    seenLineIds: Array.isArray(rec.seenLineIds) ? rec.seenLineIds : [],
  };
}

export function recordNpcConversation(
  map: NpcRelationshipMap,
  npcId: string,
  nowMs = Date.now(),
  chosenLineId?: string | null,
): NpcRelationshipMap {
  const cur = getNpcRelationship(map, npcId);
  const canBump = nowMs - cur.lastTalkedAtMs > 60_000;
  const prevSeen = cur.seenLineIds ?? [];
  const nextSeen =
    chosenLineId && !prevSeen.includes(chosenLineId)
      ? [...prevSeen, chosenLineId].slice(-24)
      : prevSeen;
  return {
    ...map,
    [npcId]: {
      ...cur,
      affinity: canBump ? Math.min(10, cur.affinity + 1) : cur.affinity,
      lastTalkedAtMs: nowMs,
      talkCount: (cur.talkCount ?? 0) + 1,
      seenLineIds: nextSeen,
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
