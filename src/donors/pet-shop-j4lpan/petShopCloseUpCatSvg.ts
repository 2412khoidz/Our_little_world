/**
 * Close-up cat SVG adapted from j4lpan/pet-shop `CAT_SVG` (MIT).
 * Face variants driven by data-eyes / data-mouth on the host (see petShopCloseUpCat.css).
 */
export const PET_SHOP_CLOSEUP_CAT_MARKUP = `
<svg viewBox="0 0 120 110" xmlns="http://www.w3.org/2000/svg" class="pet-shop-closeup-cat__svg" preserveAspectRatio="xMidYMax meet" role="img" aria-hidden="true">
  <ellipse cx="60" cy="103" rx="38" ry="3.4" fill="rgba(0,0,0,0.13)"/>

  <g class="pet-shop-closeup-cat__tail">
    <path d="M 24 82 Q 8 80, 8 66 Q 10 56, 22 58" stroke="var(--psc-body)" stroke-width="13" fill="none" stroke-linecap="round"/>
    <circle cx="9" cy="66" r="5.6" fill="var(--psc-belly)" opacity="0.85"/>
  </g>

  <path d="M 20 59 Q 13 61, 18 64.5 Q 12 67, 18 70 Q 14 73.5, 20 74.5 L 23 59 Z" fill="var(--psc-body)"/>
  <path d="M 100 59 Q 107 61, 102 64.5 Q 108 67, 102 70 Q 106 73.5, 100 74.5 L 97 59 Z" fill="var(--psc-body)"/>

  <ellipse cx="60" cy="68" rx="45" ry="36" fill="var(--psc-body)" stroke="var(--psc-outline)" stroke-width="2.6"/>

  <g class="pet-shop-closeup-cat__pattern-stripes">
    <path d="M 38 50 Q 44 46, 50 50" stroke="var(--psc-body-dark)" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.42"/>
    <path d="M 54 46 Q 60 42, 66 46" stroke="var(--psc-body-dark)" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.42"/>
    <path d="M 70 50 Q 76 46, 82 50" stroke="var(--psc-body-dark)" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.42"/>
  </g>

  <ellipse cx="60" cy="86" rx="28" ry="11" fill="var(--psc-belly)" opacity="0.55"/>

  <g class="pet-shop-closeup-cat__ears">
    <g class="pet-shop-closeup-cat__ear-l">
      <path d="M 30 40 Q 28 30, 40 30 Q 50 34, 48 42 Q 40 44, 30 40 Z" fill="var(--psc-body)" stroke="var(--psc-outline)" stroke-width="2"/>
      <path d="M 36 38 Q 36 33, 42 34 Q 45 38, 42 41 Q 38 41, 36 38 Z" fill="var(--psc-inner-ear)" opacity="0.85"/>
    </g>
    <g class="pet-shop-closeup-cat__ear-r">
      <path d="M 90 40 Q 92 30, 80 30 Q 70 34, 72 42 Q 80 44, 90 40 Z" fill="var(--psc-body)" stroke="var(--psc-outline)" stroke-width="2"/>
      <path d="M 84 38 Q 84 33, 78 34 Q 75 38, 78 41 Q 82 41, 84 38 Z" fill="var(--psc-inner-ear)" opacity="0.85"/>
    </g>
  </g>

  <g class="pet-shop-closeup-cat__eyes">
    <g class="pet-shop-closeup-cat__eye-l">
      <g class="eye-style eye-normal">
        <ellipse cx="48" cy="62" rx="6.2" ry="8.3" fill="var(--psc-eye)"/>
        <ellipse cx="50" cy="59.4" rx="2.3" ry="2.8" fill="#FFFFFF"/>
      </g>
      <g class="eye-style eye-wide">
        <ellipse cx="48" cy="62" rx="7.2" ry="9.4" fill="var(--psc-eye)"/>
        <ellipse cx="50.2" cy="58.8" rx="2.7" ry="3.3" fill="#FFFFFF"/>
      </g>
      <g class="eye-style eye-hearts">
        <path d="M 48 58.5 C 45.6 56, 42.5 56.5, 42.5 59.8 C 42.5 63.5, 48 68, 48 68 C 48 68, 53.5 63.5, 53.5 59.8 C 53.5 56.5, 50.4 56, 48 58.5 Z" fill="#E54F6B"/>
      </g>
      <g class="eye-style eye-stars">
        <path d="M 48 55 L 49.2 60.4 L 54.6 61.4 L 49.2 62.6 L 48 68.4 L 46.8 62.6 L 41.4 61.4 L 46.8 60.4 Z" fill="#FFD23B" stroke="#B47A30" stroke-width="0.4"/>
      </g>
      <g class="eye-style eye-happy">
        <path d="M 42.5 64 Q 48 57, 53.5 64" stroke="var(--psc-eye)" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      </g>
      <g class="eye-style eye-angry">
        <ellipse cx="48" cy="63" rx="5.2" ry="6.8" fill="var(--psc-eye)"/>
        <path d="M 41 56 L 53.5 60" stroke="var(--psc-eye)" stroke-width="2" stroke-linecap="round"/>
      </g>
    </g>
    <g class="pet-shop-closeup-cat__eye-r">
      <g class="eye-style eye-normal">
        <ellipse cx="72" cy="62" rx="6.2" ry="8.3" fill="var(--psc-eye)"/>
        <ellipse cx="74" cy="59.4" rx="2.3" ry="2.8" fill="#FFFFFF"/>
      </g>
      <g class="eye-style eye-wide">
        <ellipse cx="72" cy="62" rx="7.2" ry="9.4" fill="var(--psc-eye)"/>
        <ellipse cx="74.2" cy="58.8" rx="2.7" ry="3.3" fill="#FFFFFF"/>
      </g>
      <g class="eye-style eye-hearts">
        <path d="M 72 58.5 C 69.6 56, 66.5 56.5, 66.5 59.8 C 66.5 63.5, 72 68, 72 68 C 72 68, 77.5 63.5, 77.5 59.8 C 77.5 56.5, 74.4 56, 72 58.5 Z" fill="#E54F6B"/>
      </g>
      <g class="eye-style eye-stars">
        <path d="M 72 55 L 73.2 60.4 L 78.6 61.4 L 73.2 62.6 L 72 68.4 L 70.8 62.6 L 65.4 61.4 L 70.8 60.4 Z" fill="#FFD23B" stroke="#B47A30" stroke-width="0.4"/>
      </g>
      <g class="eye-style eye-happy">
        <path d="M 66.5 64 Q 72 57, 77.5 64" stroke="var(--psc-eye)" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      </g>
      <g class="eye-style eye-angry">
        <ellipse cx="72" cy="63" rx="5.2" ry="6.8" fill="var(--psc-eye)"/>
        <path d="M 79 56 L 66.5 60" stroke="var(--psc-eye)" stroke-width="2" stroke-linecap="round"/>
      </g>
    </g>
  </g>

  <path d="M 56.6 69.8 C 57.4 68.5, 59.2 68.7, 60 69.8 C 60.8 68.7, 62.6 68.5, 63.4 69.8 C 64.1 71, 62.4 72.7, 60 73.9 C 57.6 72.7, 55.9 71, 56.6 69.8 Z" fill="var(--psc-nose)"/>

  <g class="pet-shop-closeup-cat__mouth">
    <g class="mouth-style mouth-normal">
      <path d="M 60 73 Q 56 78, 53 76" stroke="var(--psc-outline)" stroke-width="1.4" fill="none" stroke-linecap="round"/>
      <path d="M 60 73 Q 64 78, 67 76" stroke="var(--psc-outline)" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    </g>
    <g class="mouth-style mouth-smile">
      <path d="M 53 73 Q 60 81, 67 73" stroke="var(--psc-outline)" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    </g>
    <g class="mouth-style mouth-grumpy">
      <path d="M 53 75 L 56 78 L 58 75 L 60 78 L 62 75 L 64 78 L 67 75" stroke="var(--psc-outline)" stroke-width="1.2" fill="none" stroke-linejoin="round"/>
    </g>
    <g class="mouth-style mouth-tongue">
      <path d="M 60 73 Q 56 76, 54 76" stroke="var(--psc-outline)" stroke-width="1.4" fill="none" stroke-linecap="round"/>
      <path d="M 60 73 Q 64 76, 66 76" stroke="var(--psc-outline)" stroke-width="1.4" fill="none" stroke-linecap="round"/>
      <ellipse cx="60" cy="78" rx="2.8" ry="1.8" fill="#E76A8A"/>
    </g>
    <g class="mouth-style mouth-pursed">
      <ellipse cx="60" cy="76" rx="1.6" ry="0.9" fill="var(--psc-outline)"/>
    </g>
  </g>

  <g class="pet-shop-closeup-cat__blush">
    <ellipse cx="42" cy="70" rx="5.2" ry="3" fill="var(--psc-blush)" opacity="0.75"/>
    <ellipse cx="78" cy="70" rx="5.2" ry="3" fill="var(--psc-blush)" opacity="0.75"/>
  </g>
</svg>
`;

/** Orange tabby (Quýt) — maps pet-shop CSS custom properties. */
export const PET_SHOP_ORANGE_TABBY_VARS: Record<string, string> = {
  '--psc-body': '#e8a55a',
  '--psc-body-dark': '#c47a38',
  '--psc-belly': '#f5d4a8',
  '--psc-inner-ear': '#ffb8a0',
  '--psc-eye': '#3d5c28',
  '--psc-nose': '#e8a0a0',
  '--psc-outline': '#3d2810',
  '--psc-blush': '#e8a8a0',
};