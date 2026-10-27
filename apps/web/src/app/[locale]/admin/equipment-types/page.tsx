import { EquipmentCatalogPage, type CatalogSearchParams } from "@/components/admin/EquipmentCatalogPage";

export default function Page(props: {
  params: Promise<{ locale: string }>;
  searchParams?: CatalogSearchParams;
}) {
  return <EquipmentCatalogPage {...props} section="types" />;
}
