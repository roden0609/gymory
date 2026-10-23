import { EquipmentCatalogPage } from "@/components/admin/EquipmentCatalogPage";

export default function Page(props: {
  params: Promise<{ locale: string }>;
  searchParams?: { result?: string; entity?: string; reason?: string; action?: string };
}) {
  return <EquipmentCatalogPage {...props} section="types" />;
}
