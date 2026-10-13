import { getEquipmentLabel } from "@gymory/shared";
import type { GymEquipmentTypeSummary } from "@/lib/equipment-machine-inventory";

type Props = {
  items: GymEquipmentTypeSummary[];
  locale: string;
  availableLabel: string;
  absentLabel: string;
  detailsLabel: string;
  quantityLabel: (quantity: number) => string;
};

function Labels({ labels, locale }: { labels: string[]; locale: string }) {
  if (labels.length === 0) return null;
  return (
    <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
      {[...new Set(labels)].map((label) => (
        <span key={label} className="max-w-full break-words rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 [overflow-wrap:anywhere]">
          {getEquipmentLabel(label, locale)}
        </span>
      ))}
    </div>
  );
}

export function EquipmentTypeSummary({ items, locale, absentLabel, quantityLabel }: Pick<Props, "items" | "locale" | "absentLabel" | "quantityLabel">) {
  return (
    <ul className="flex min-w-0 flex-wrap gap-2">
      {items.map(({ type, isPresent, quantity }) => (
        <li key={type.code} className="max-w-full break-words rounded-lg bg-gray-50 px-2.5 py-1.5 text-sm text-gray-700 [overflow-wrap:anywhere]">
          {locale === "zh-HK" && type.name_zh ? type.name_zh : type.name_en}
          {!isPresent ? ` · ${absentLabel}` : quantity !== null ? ` · ${quantityLabel(quantity)}` : ""}
        </li>
      ))}
    </ul>
  );
}

export function EquipmentTypeInventory({ items, locale, availableLabel, absentLabel, detailsLabel, quantityLabel }: Props) {
  const detailedItems = items.filter(({ machines }) => machines.length > 0);

  return (
    <div className="min-w-0">
      <div className="min-w-0 md:hidden" data-equipment-summary>
        <EquipmentTypeSummary items={items} locale={locale} absentLabel={absentLabel} quantityLabel={quantityLabel} />
      </div>
      <div className="hidden min-w-0 gap-3 md:grid md:grid-cols-2 lg:grid-cols-3">
        {items.map(({ type, isPresent, quantity }) => (
          <div key={type.code} className="min-w-0 rounded-lg border border-gray-100 p-3" data-equipment-type={type.code}>
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
              <h3 className="min-w-0 break-words text-sm font-medium text-gray-900 [overflow-wrap:anywhere]">
                {locale === "zh-HK" && type.name_zh ? type.name_zh : type.name_en}
              </h3>
              <span className="text-xs text-gray-500">
                {quantity !== null ? quantityLabel(quantity) : isPresent ? availableLabel : absentLabel}
              </span>
            </div>
            <Labels labels={type.labels.filter((label) => label !== "hyrox")} locale={locale} />
          </div>
        ))}
      </div>
      {detailedItems.length > 0 && (
        <details className="mt-4 min-w-0" data-category-equipment-details>
          <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900">{detailsLabel}</summary>
          <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
            {detailedItems.map(({ type, machines }) => (
              <div key={type.code} className="min-w-0 rounded-lg border border-gray-100 p-3" data-equipment-type-details={type.code}>
                <h4 className="break-words text-sm font-medium text-gray-900 [overflow-wrap:anywhere]">
                  {locale === "zh-HK" && type.name_zh ? type.name_zh : type.name_en}
                </h4>
                <ul className="mt-3 min-w-0 space-y-3 border-t border-gray-100 pt-3">
                  {machines.map((machine) => (
                    <li key={machine.id} className="min-w-0">
                      <p className="break-words text-xs text-gray-500 [overflow-wrap:anywhere]">
                        {locale === "zh-HK" && machine.brand.nameZh ? machine.brand.nameZh : machine.brand.nameEn}
                      </p>
                      <div className="mt-1 flex min-w-0 flex-wrap items-start justify-between gap-2 text-sm">
                        <span className="min-w-0 break-words text-gray-700 [overflow-wrap:anywhere]">
                          {machine.name}{machine.modelNumber ? ` · ${machine.modelNumber}` : ""}
                        </span>
                        {machine.quantity !== null && <span className="text-xs text-gray-500">{quantityLabel(machine.quantity)}</span>}
                      </div>
                      <Labels labels={machine.labels} locale={locale} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
