import type { CSSProperties } from 'react';
import {
  PET_SHOP_CLOSEUP_CAT_MARKUP,
  PET_SHOP_ORANGE_TABBY_VARS,
} from '../../donors/pet-shop-j4lpan/petShopCloseUpCatSvg';

import './petShopCloseUpCat.css';

interface PetShopCloseUpCatProps {
  catName?: string;
  moodLabel?: string;
}

export function PetShopCloseUpCat({ catName = 'Quýt', moodLabel }: PetShopCloseUpCatProps) {
  return (
    <div
      className="pet-shop-closeup-cat"
      data-testid="pet-shop-closeup-cat"
      style={PET_SHOP_ORANGE_TABBY_VARS as CSSProperties}
      aria-label={moodLabel ? `${catName} — ${moodLabel}` : `Chân dung ${catName}`}
    >
      <div
        className="pet-shop-closeup-cat__stage"
        dangerouslySetInnerHTML={{ __html: PET_SHOP_CLOSEUP_CAT_MARKUP }}
      />
      {moodLabel ? (
        <span className="pet-shop-closeup-cat__mood" data-testid="pet-shop-closeup-mood">
          {moodLabel}
        </span>
      ) : null}
    </div>
  );
}