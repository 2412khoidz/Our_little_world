/** Cozy pixel-style card faces (original SVG, no external assets). */
export function MemorySymbolArt({ symbolId }: { symbolId: number }) {
  const common = {
    width: 40,
    height: 40,
    viewBox: '0 0 32 32',
    role: 'img' as const,
    'aria-hidden': true,
    className: 'mn-memory-glyph',
  };

  switch (symbolId) {
    case 0:
      return (
        <svg {...common}>
          <ellipse cx="16" cy="20" rx="10" ry="8" fill="#e8a07a" />
          <ellipse cx="16" cy="14" rx="8" ry="7" fill="#f2b892" />
          <polygon points="10,12 8,6 12,10" fill="#f2b892" />
          <polygon points="22,12 24,6 20,10" fill="#f2b892" />
          <circle cx="13" cy="14" r="1.2" fill="#3a2117" />
          <circle cx="19" cy="14" r="1.2" fill="#3a2117" />
          <path d="M14 17 Q16 18 18 17" stroke="#7a4a3a" fill="none" strokeWidth="0.8" />
        </svg>
      );
    case 1:
      return (
        <svg {...common}>
          <circle cx="16" cy="18" r="6" fill="#f7b4c8" />
          {[0, 72, 144, 216, 288].map((deg) => (
            <ellipse
              key={deg}
              cx="16"
              cy="18"
              rx="3"
              ry="5"
              fill="#ff9bb5"
              transform={`rotate(${deg} 16 18)`}
            />
          ))}
          <circle cx="16" cy="16" r="2.5" fill="#ffe0ea" />
        </svg>
      );
    case 2:
      return (
        <svg {...common}>
          <path
            d="M10 22 C10 14 22 12 22 20 C22 26 14 28 10 22 Z"
            fill="#e05252"
          />
          <path
            d="M12 20 C14 10 20 12 20 18"
            fill="#7dc44a"
            stroke="#4a7a28"
            strokeWidth="0.6"
          />
          <circle cx="15" cy="19" r="0.8" fill="#f6e8f0" opacity="0.7" />
        </svg>
      );
    case 3:
      return (
        <svg {...common}>
          <ellipse cx="16" cy="16" rx="11" ry="7" fill="#6eb5d8" />
          <path d="M6 16 Q16 10 26 16 Q16 22 6 16" fill="#4a98c4" />
          <circle cx="12" cy="15" r="1" fill="#2d4f62" />
          <polygon points="21,15 25,16 21,17" fill="#e8a07a" />
        </svg>
      );
    case 4:
      return (
        <svg {...common}>
          <circle cx="12" cy="20" r="5" fill="#d46b8a" />
          <circle cx="20" cy="20" r="5" fill="#7ab8e8" />
          <circle cx="16" cy="12" r="5" fill="#e8c85e" />
          <rect x="14" y="8" width="4" height="18" rx="1" fill="#8a5e42" opacity="0.35" />
        </svg>
      );
    case 5:
      return (
        <svg {...common}>
          <rect x="14" y="20" width="4" height="8" rx="1" fill="#8a5e42" />
          <ellipse cx="16" cy="14" rx="9" ry="10" fill="#6ab86a" />
          <ellipse cx="12" cy="11" rx="4" ry="3" fill="#7dce7d" />
          <ellipse cx="20" cy="12" rx="3" ry="2.5" fill="#7dce7d" />
        </svg>
      );
    case 6:
      return (
        <svg {...common}>
          <ellipse cx="16" cy="22" rx="9" ry="3" fill="#c4a27a" />
          <path d="M9 22 Q9 14 16 12 Q23 14 23 22 Z" fill="#f0ead8" stroke="#a88766" strokeWidth="0.8" />
          <ellipse cx="16" cy="14" rx="5" ry="2" fill="#5a3828" />
        </svg>
      );
    case 7:
      return (
        <svg {...common}>
          <polygon points="16,8 26,18 26,26 6,26 6,18" fill="#e8c878" stroke="#8a5e42" strokeWidth="0.8" />
          <rect x="13" y="20" width="6" height="6" fill="#6b3d2a" />
          <polygon points="6,18 16,8 26,18" fill="#d46b50" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="16" cy="16" r="6" fill="#c99e6e" />
        </svg>
      );
  }
}

export function MemoryCardBackArt() {
  return (
    <svg
      className="mn-memory-back-svg"
      width="48"
      height="56"
      viewBox="0 0 48 56"
      role="img"
      aria-hidden
    >
      <rect x="4" y="4" width="40" height="48" rx="6" fill="#c96b52" />
      <rect x="7" y="7" width="34" height="42" rx="4" fill="#d97762" stroke="#8f3d2c" strokeWidth="1.5" />
      <ellipse cx="24" cy="30" rx="9" ry="7" fill="#f2b892" />
      <circle cx="19" cy="28" r="1.5" fill="#3a2117" />
      <circle cx="29" cy="28" r="1.5" fill="#3a2117" />
      <ellipse cx="20" cy="18" rx="3" ry="5" fill="#d97762" transform="rotate(-15 20 18)" />
      <ellipse cx="28" cy="18" rx="3" ry="5" fill="#d97762" transform="rotate(15 28 18)" />
    </svg>
  );
}