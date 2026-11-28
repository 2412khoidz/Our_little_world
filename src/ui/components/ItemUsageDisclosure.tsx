import { itemUsageDetails } from '../../shared/inventory/itemUsageDetails';

export function ItemUsageDisclosure({ sku, label, description }: {
  sku: string;
  label?: string;
  description?: string | null;
}) {
  const item = itemUsageDetails(sku, label, description);
  return (
    <details className="olw-item-usage">
      <summary aria-label={`Công dụng ${item.nameVi}`}>Công dụng</summary>
      <div>
        <strong>{item.nameVi}</strong>
        <p>{item.descriptionVi}</p>
        {item.usageVi && item.usageVi !== item.descriptionVi && <small>{item.usageVi}</small>}
      </div>
    </details>
  );
}
