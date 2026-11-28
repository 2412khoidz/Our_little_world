import Phaser from 'phaser';
import { getFarmingItemSprite } from '../../shared/art/farmingSpriteAtlas';
import { kilnItemIconUrlForSku } from '../../shared/art/kilnItemIcons';
import { propsIconIdForCatalogSku } from '../../shared/art/catalogSkuPropsIcon';
import { PET_FOOD_CATALOG } from '../../shared/petLiving/petFoodCatalog';
import type { PhysicalDrop } from '../../shared/inventory/physicalInventory';
import { WORLD_PROPS_KEY } from '../art/worldAtlas';
import { LIVING_ITEMS_ATLAS_KEY } from '../pet/petSpriteBuilder';
import { getProceduralIconSpec } from '../../shared/art/donorProceduralIconSpec';
import { renderProceduralItemIconDataUrl } from '../../ui/art/proceduralItemIconRenderer';

interface DropVisual {
  drop: PhysicalDrop;
  root: Phaser.GameObjects.Container;
  icon: Phaser.GameObjects.Image;
  count: Phaser.GameObjects.Text;
  bornAt: number;
}

export class PhysicalDropVisuals {
  private readonly views = new Map<string, DropVisual>();
  private readonly loading = new Set<string>();

  constructor(private readonly scene: Phaser.Scene) {}

  private bind(visual: DropVisual) {
    const sku = visual.drop.stack.itemSku.split(':')[0]!;
    const { textures } = this.scene;
    const packed = getFarmingItemSprite(sku);
    const props = propsIconIdForCatalogSku(sku);
    const pet = PET_FOOD_CATALOG.find((food) => food.sku === sku);
    let texture = 'olw-drop-' + sku;
    let frame: string | undefined;
    if (packed) {
      texture = 'olw-drop-' + packed.atlas;
      if (!textures.exists(texture)) return;
      const atlas = textures.get(texture);
      frame = sku;
      if (!atlas.has(frame)) atlas.add(frame, 0, packed.x, packed.y, packed.w, packed.h);
    } else {
      const kiln = kilnItemIconUrlForSku(sku);
      if (!kiln && props && textures.exists(WORLD_PROPS_KEY) && textures.get(WORLD_PROPS_KEY).has(props)) {
        texture = WORLD_PROPS_KEY;
        frame = props;
      } else if (!kiln && pet && textures.exists(LIVING_ITEMS_ATLAS_KEY)) {
        texture = LIVING_ITEMS_ATLAS_KEY;
        frame = pet.iconId;
      } else if (!textures.exists(texture)) {
        const spec = getProceduralIconSpec(sku);
        const url = kiln || (spec ? renderProceduralItemIconDataUrl(sku, spec) : null);
        if (!url || this.loading.has(texture)) return;
        this.loading.add(texture);
        this.scene.load.image(texture, url);
        this.scene.load.once('filecomplete-image-' + texture, () => {
          this.loading.delete(texture);
          for (const view of this.views.values()) {
            if (view.drop.stack.itemSku.split(':')[0] === sku) this.bind(view);
          }
        });
        this.scene.load.start();
        return;
      }
    }
    textures.get(texture).setFilter(Phaser.Textures.FilterMode.NEAREST);
    visual.icon.setTexture(texture, frame).setVisible(true);
    visual.icon.setScale(12 / Math.max(visual.icon.width, visual.icon.height));
  }

  sync(drops: readonly PhysicalDrop[]) {
    const ids = new Set(drops.map((drop) => drop.id));
    for (const [id, view] of this.views) {
      if (!ids.has(id)) {
        view.root.destroy();
        this.views.delete(id);
      }
    }
    for (const drop of drops) {
      let view = this.views.get(drop.id);
      if (!view) {
        const shadow = this.scene.add.ellipse(0, 0, 10, 4, 0x201913, 0.48);
        const icon = this.scene.add.image(0, -8, '__WHITE').setVisible(false);
        const count = this.scene.add.text(6, -7, '', {
          fontFamily: 'monospace', fontSize: '9px', color: '#fff7de', stroke: '#211a13', strokeThickness: 2,
        });
        const root = this.scene.add.container(drop.x, drop.y, [shadow, icon, count]).setDepth(drop.y + 1);
        view = { drop, root, icon, count, bornAt: this.scene.time.now };
        this.views.set(drop.id, view);
        this.bind(view);
      }
      view.drop = drop;
      view.count.setText(drop.stack.qty > 1 ? String(drop.stack.qty) : '');
    }
    this.scene.game.canvas.dataset.physicalDropCount = String(this.views.size);
  }

  update(time: number) {
    for (const { bornAt, icon, count } of this.views.values()) {
      const elapsed = Math.max(0, time - bornAt);
      const landing = Math.max(0, 1 - elapsed / 260);
      icon.y = -7 - 13 * landing * landing + Math.sin(elapsed / 280) * 1.4;
      count.y = icon.y + 1;
    }
  }

  clear() {
    this.sync([]);
  }
}
