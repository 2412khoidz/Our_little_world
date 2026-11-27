import type { LivingItemIconId } from '../../shared/petLiving/petVisualTypes';

export function CozyNotebookSvg({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="2" width="14" height="16" rx="2" fill="#e69b86" stroke="#4c2d1f" strokeWidth="1.6" />
      <rect x="6" y="4" width="9" height="12" rx="1" fill="#fff7ea" />
      <path d="M12.5 2V7L14 5.8L15.5 7V2" fill="#cf5772" stroke="#4c2d1f" strokeWidth="1" />
      <path d="M8 8.5H13M8 11.5H12" stroke="#9c7258" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function CozyHeartMailSvg({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2" y="4" width="16" height="12" rx="2" fill="#fff5e6" stroke="#4c2d1f" strokeWidth="1.6" />
      <path d="M3 5.5L10 10.5L17 5.5" stroke="#8a5a44" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="10" cy="11" r="2.2" fill="#d95f76" stroke="#4c2d1f" strokeWidth="1" />
    </svg>
  );
}

export function CozyCatIconSvg({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 8L5.2 3.5L8 6.2H12L14.8 3.5L16 8C16.8 10.2 16 15.5 10 15.5C4 15.5 3.2 10.2 4 8Z"
        fill="#f2a663"
        stroke="#4c2d1f"
        strokeWidth="1.5"
      />
      <circle cx="7.7" cy="10.2" r="1" fill="#382018" />
      <circle cx="12.3" cy="10.2" r="1" fill="#382018" />
      <path d="M9.3 12L10 12.6L10.7 12" stroke="#cf5772" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function ItemArtSvg({ iconId, size = 26 }: { iconId: LivingItemIconId | null; size?: number }) {
  if (!iconId) return null;
  switch (iconId) {
    case 'food_kibble':
    case 'food_warm_broth':
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M4 11H16L14.6 16H5.4L4 11Z" fill="#d9896c" stroke="#4c2d1f" strokeWidth="1.5" />
          <ellipse cx="10" cy="10.5" rx="5.5" ry="2.2" fill={iconId === 'food_warm_broth' ? '#f5cb78' : '#a15e32'} stroke="#4c2d1f" strokeWidth="1.4" />
        </svg>
      );
    case 'food_grilled_fish':
    case 'food_salmon_treat':
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M3 10C5.5 6.8 11.2 6.8 14.2 10L17 7.5V12.5L14.2 10C11.2 13.2 5.5 13.2 3 10Z"
            fill={iconId === 'food_salmon_treat' ? '#f18c72' : '#96b1c4'}
            stroke="#4c2d1f"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="6.5" cy="9.6" r="0.9" fill="#382018" />
        </svg>
      );
    case 'water_pitcher_empty':
    case 'water_pitcher_full':
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M6 5H13V15.5C13 16 12.5 16.5 12 16.5H7C6.5 16.5 6 16 6 15.5V5Z" fill="#9bc2df" stroke="#2d3c4d" strokeWidth="1.5" />
          <path d="M13 7H15.5C16.2 7 16.5 7.5 16.5 8.5V11C16.5 11.8 16 12.2 15.2 12.2H13" stroke="#2d3c4d" strokeWidth="1.5" />
          {iconId === 'water_pitcher_full' && <rect x="7" y="7" width="5" height="6" fill="#5fb7ea" />}
        </svg>
      );
    case 'yarn_ball':
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="5.5" fill="#e67391" stroke="#4c2d1f" strokeWidth="1.5" />
          <path d="M6.5 8.2C8.8 7 12.2 7.5 13.8 9.8M6.2 11.5C8.5 12.5 11.8 12.5 14 10.6" stroke="#ffd4e0" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M5 14C3.5 15.2 3 16.5 4.2 17.2" stroke="#e67391" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'cardboard_box':
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect x="3" y="6.5" width="14" height="9.5" rx="1" fill="#c9935f" stroke="#5e3c28" strokeWidth="1.5" />
          <path d="M3 6.5L5.5 4H14.5L17 6.5H3Z" fill="#e7bc8b" stroke="#5e3c28" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="5.2" fill="#f4c45c" stroke="#4c2d1f" strokeWidth="1.5" />
        </svg>
      );
  }
}
