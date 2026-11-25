/**
 * Close-up cat SVG adapted from j4lpan/pet-shop `CAT_SVG` (MIT).
 * Trimmed for Pet Care panel; animated tail via CSS in PetShopCloseUpCat.tsx.
 */
export const PET_SHOP_CLOSEUP_CAT_MARKUP = `
<svg viewBox="0 0 120 110" xmlns="http://www.w3.org/2000/svg" class="pet-shop-closeup-cat__svg" preserveAspectRatio="xMidYMax meet" role="img" aria-hidden="true">
  <ellipse cx="60" cy="103" rx="38" ry="3.4" fill="rgba(0,0,0,0.13)"/>
  <g class="pet-shop-closeup-cat__tail">
    <path d="M 24 82 Q 8 80, 8 66 Q 10 56, 22 58" stroke="var(--psc-body)" stroke-width="13" fill="none" stroke-linecap="round"/>
    <circle cx="9" cy="66" r="5.6" fill="var(--psc-belly)" opacity="0.85"/>
  </g>
  <ellipse cx="60" cy="68" rx="45" ry="36" fill="var(--psc-body)" stroke="var(--psc-outline)" stroke-width="2.6"/>
  <g class="pet-shop-closeup-cat__ears">
    <path d="M 30 40 Q 28 30, 40 30 Q 50 34, 48 42 Q 40 44, 30 40 Z" fill="var(--psc-body)" stroke="var(--psc-outline)" stroke-width="2"/>
    <path d="M 36 38 Q 36 33, 42 34 Q 45 38, 42 41 Q 38 41, 36 38 Z" fill="var(--psc-inner-ear)" opacity="0.85"/>
    <path d="M 90 40 Q 92 30, 80 30 Q 70 34, 72 42 Q 80 44, 90 40 Z" fill="var(--psc-body)" stroke="var(--psc-outline)" stroke-width="2"/>
    <path d="M 84 38 Q 84 33, 78 34 Q 75 38, 78 41 Q 82 41, 84 38 Z" fill="var(--psc-inner-ear)" opacity="0.85"/>
  </g>
  <ellipse cx="60" cy="86" rx="28" ry="11" fill="var(--psc-belly)" opacity="0.55"/>
  <ellipse cx="48" cy="62" rx="6.2" ry="8.3" fill="var(--psc-eye)"/>
  <ellipse cx="50" cy="59.4" rx="2.3" ry="2.8" fill="#FFFFFF"/>
  <ellipse cx="72" cy="62" rx="6.2" ry="8.3" fill="var(--psc-eye)"/>
  <ellipse cx="74" cy="59.4" rx="2.3" ry="2.8" fill="#FFFFFF"/>
  <ellipse cx="60" cy="72" rx="4" ry="3" fill="var(--psc-nose)"/>
  <path d="M 56 76 Q 60 79, 64 76" stroke="var(--psc-outline)" stroke-width="1.5" fill="none" stroke-linecap="round"/>
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
};