import { GymBackLink } from "./GymBackLink";
import { getTranslations } from "next-intl/server";

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 motion-reduce:animate-none ${className}`} />;
}

export function GymDetailSectionsSkeleton() {
  return (
    <div aria-hidden="true" className="mx-auto w-full max-w-5xl min-w-0 px-4 py-8">
      <div className="rounded-lg border border-gray-200 bg-white px-5">
        {[0, 1, 2, 3].map((key) => <div key={key} className="border-b border-gray-100 py-6 last:border-0"><SkeletonBlock className="h-5 w-32 max-w-full" /><SkeletonBlock className="mt-4 h-16 w-full" /></div>)}
      </div>
    </div>
  );
}

export async function GymDetailSkeleton() {
  const [t, common] = await Promise.all([getTranslations("gym"), getTranslations("common")]);
  return (
    <main aria-busy="true" className="min-h-screen min-w-0 bg-gray-50">
      <p role="status" className="sr-only">{t("loadingDetail")}</p>
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl min-w-0 px-4 py-8">
          <GymBackLink>{common("back")}</GymBackLink>
          <div aria-hidden="true" className="mt-4 flex min-w-0 flex-col gap-4 md:flex-row md:justify-between">
            <div className="min-w-0 flex-1"><SkeletonBlock className="h-9 w-80 max-w-full" /><SkeletonBlock className="mt-3 h-5 w-96 max-w-full" /><SkeletonBlock className="mt-3 h-4 w-40 max-w-full" /></div>
            <SkeletonBlock className="h-10 w-32 max-w-full" />
          </div>
        </div>
      </div>
      <GymDetailSectionsSkeleton />
    </main>
  );
}
