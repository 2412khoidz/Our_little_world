import React, { Suspense, lazy } from 'react';
import type { BilliardsModalProps } from './BilliardsModal';

const BilliardsModalLazy = lazy(() => import('./BilliardsModal'));

export const LazyBilliardsModal: React.FC<BilliardsModalProps> = (props) => {
  if (!props.open) return null;
  return (
    <Suspense fallback={null}>
      <BilliardsModalLazy {...props} />
    </Suspense>
  );
};
