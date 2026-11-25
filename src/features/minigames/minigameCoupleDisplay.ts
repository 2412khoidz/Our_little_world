/** Hot-seat presentation only — ids must stay `player-1` / `player-2` for reducers. */
export const MINIGAME_COUPLE_DISPLAY = [
  { id: 'player-1', label: 'Mây', emoji: '🌸' },
  { id: 'player-2', label: 'Nắng', emoji: '☀️' },
] as const;

export function coupleDisplayFor(playerId: string): { label: string; emoji: string } {
  const row = MINIGAME_COUPLE_DISPLAY.find((p) => p.id === playerId);
  return row ?? { label: playerId, emoji: '💞' };
}