import { getFirebaseSessionUser, isAdminUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/db/supabase-admin";

export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "private, no-store", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" };

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const user = await getFirebaseSessionUser();
  if (!user) return new Response(null, { status: 401, headers: privateHeaders });
  if (!isAdminUser(user)) return new Response(null, { status: 403, headers: privateHeaders });
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id)) {
    return new Response(null, { status: 404, headers: privateHeaders });
  }
  const supabase = createAdminClient();
  const original = new URL(request.url).searchParams.get("original") === "1";
  const { data, error } = await supabase.from("equipment_captured_images")
    .select("source_url, storage_path").eq("id", params.id).single();
  if (error || !data) return new Response(null, { status: 404, headers: privateHeaders });
  if (original) {
    const url = data.source_url;
    return new Response(null, { status: 302, headers: { ...privateHeaders, Location: url, "Referrer-Policy": "no-referrer" } });
  }
  const path = data.storage_path;
  if (!path) return new Response(null, { status: 404, headers: privateHeaders });
  const { data: blob, error: downloadError } = await supabase.storage.from("equipment-captured-images").download(path);
  if (downloadError || !blob) return new Response(null, { status: 404, headers: privateHeaders });
  return new Response(blob, { headers: { ...privateHeaders, "Content-Type": blob.type, "Referrer-Policy": "no-referrer" } });
}
