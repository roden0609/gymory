import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminLoginForm } from "@/components/auth/AdminLoginForm";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "login" });
  return { title: t("title") };
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  const { next } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("login");
  const nextPath =
    next?.startsWith("/") && !next.startsWith("//") ? next : "/admin/submissions";

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-md space-y-4">
        <div>
          <Link
            href="/"
            className="text-sm text-gray-500 transition-colors hover:text-gray-900"
          >
            {t("back")}
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">{t("title")}</h1>
          {/* <p className="mt-2 text-gray-500">{t("description")}</p> */}
        </div>

        <AdminLoginForm nextPath={nextPath} />
      </div>
    </main>
  );
}
