import { useEffect, useState, type CSSProperties } from 'react';
import { loadPropsManifest, propsIconBackgroundStyle } from '../art/propsManifestClient';

interface CatalogPropsIconProps {
  iconId: string;
  size?: number;
  className?: string;
  /** e.g. inv-icon-seed_wheat for inventory row QA */
  testId?: string;
}

export function CatalogPropsIcon({ iconId, size = 24, className, testId }: CatalogPropsIconProps) {
  const [bgStyle, setBgStyle] = useState<CSSProperties | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadPropsManifest().then((manifest) => {
      if (cancelled) return;
      const slice = propsIconBackgroundStyle(manifest, iconId, size);
      if (!slice) {
        setBgStyle(null);
        return;
      }
      setBgStyle({
        display: 'inline-block',
        width: size,
        height: size,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        flexShrink: 0,
        ...slice,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [iconId, size]);

  if (!bgStyle) {
    return (
      <span
        className={className}
        style={{ display: 'inline-block', width: size, height: size, flexShrink: 0 }}
        aria-hidden
      />
    );
  }

  return (
    <span
      className={className}
      role="img"
      aria-hidden
      data-testid={testId ?? `props-icon-${iconId}`}
      style={bgStyle}
    />
  );
}