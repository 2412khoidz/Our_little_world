import { useState, type ReactNode } from 'react';

const STORAGE_KEY = 'olw-dev-banner-collapsed';

interface CollapsibleDevBannerProps {
  testId: string;
  dataMarker: string;
  summary: string;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/** Phase II P0 — DEV notices stay accessible but tuck out of the way on phone + desktop. */
export function CollapsibleDevBanner({
  testId,
  dataMarker,
  summary,
  children,
  className,
  style,
}: CollapsibleDevBannerProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  });

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  };

  return (
    <div
      data-testid={testId}
      data-dev-marker={dataMarker}
      className={`olw-dev-banner${collapsed ? ' olw-dev-banner--collapsed' : ''}${className ? ` ${className}` : ''}`}
      style={style}
    >
      <button
        type="button"
        className="olw-dev-banner__toggle"
        data-testid={`${testId}-toggle`}
        aria-expanded={!collapsed}
        onClick={toggle}
      >
        <span className="olw-dev-banner__badge">DEV</span>
        <span className="olw-dev-banner__summary">{summary}</span>
        <span aria-hidden="true">{collapsed ? '▸' : '▾'}</span>
      </button>
      {!collapsed ? <div className="olw-dev-banner__body">{children}</div> : null}
    </div>
  );
}