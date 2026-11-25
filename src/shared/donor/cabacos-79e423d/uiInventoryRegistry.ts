/**
 * Cabacos UI inventory / HUD skins (import via `npm run import-donor:cabacos-ui-inventory`).
 * NUVORA React tray remains default for inventory modals; these assets back HUD coin + future nine-slice.
 */
export const CABACOS_UI_INVENTORY_REGISTRY = {
  upstreamSha: '79e423defc12bd99327cfcc28bf7ec0085996244',
  coinHud: '/assets/donor/cabacos-ui/coin.png',
  hotbarSelector: '/assets/donor/cabacos-ui/hotbar_selector.png',
  inventorySlot: '/assets/donor/cabacos-ui/inventorySlot.png',
  inventoryRect: '/assets/donor/cabacos-ui/InventoryRect.png',
} as const;