import type { ReactNode } from 'react';

interface NuvoraCraftDeskProps {
  title: string;
  children: ReactNode;
  plateLabel?: string;
}

/** NUVORA `.mat` / `.desk` craft presentation — actions stay on donor Dev LAN RPC. */
export function NuvoraCraftDesk({ title, children, plateLabel = 'BÀN CHẾ' }: NuvoraCraftDeskProps) {
  return (
    <div className="nuvora-craft-desk" data-testid="nuvora-craft-desk">
      <p className="nuvora-craft-desk__title">{title}</p>
      <div className="nuvora-mat">
        <div className="nuvora-mat__grid">{children}</div>
      </div>
      <div className="nuvora-plate">{plateLabel}</div>
    </div>
  );
}