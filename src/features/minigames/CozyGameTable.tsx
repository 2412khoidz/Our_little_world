import type { ReactNode } from 'react';

/** Reusable felt-in-wood frame for future main-game embed (Mission 04+ networking). */
export function CozyGameTable({
  children,
  testId,
  label,
}: {
  children: ReactNode;
  testId?: string;
  label: string;
}) {
  return (
    <div className="mn-table-outer" data-testid={testId} role="region" aria-label={label}>
      <div className="mn-table-rim" aria-hidden="true" />
      <div className="mn-table-surface">{children}</div>
    </div>
  );
}