"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";

type VoteValue = "like" | "dislike";
type AccuracyStatus = "normal" | "needs_review";

type Snapshot = {
  likeCount: number;
  dislikeCount: number;
  totalVotes: number;
  lastVoteAt: string | null;
  userVote: VoteValue | null;
  dataAccuracyStatus: AccuracyStatus;
  dataAccuracyFlaggedAt: string | null;
};

export function GymAccuracyVoting({
  gymId,
  initialSnapshot,
  isLoggedIn,
}: {
  gymId: string;
  initialSnapshot: Snapshot;
  isLoggedIn: boolean;
}) {
  const t = useTranslations("gym");
  const locale = useLocale();
  const pathname = usePathname();
  const [snapshot, setSnapshot] = useState<Snapshot>(initialSnapshot);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastVoteAtLabel = useMemo(() => {
    if (!snapshot.lastVoteAt) return t("notListed");
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(snapshot.lastVoteAt));
  }, [locale, snapshot.lastVoteAt, t]);

  async function submitVote(vote: VoteValue) {
    if (!isLoggedIn) {
      const next = encodeURIComponent(pathname || `/${locale}`);
      window.location.assign(`/${locale}/login?next=${next}`);
      return;
    }
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/gyms/${gymId}/accuracy-vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote, website: "" }),
      });

      const json = (await response.json().catch(() => null)) as
        | { snapshot?: Snapshot; error?: string }
        | null;

      if (!response.ok || !json?.snapshot) {
        setError(json?.error ?? t("accuracyVoteFailed"));
        return;
      }

      setSnapshot(json.snapshot);
    } catch {
      setError(t("accuracyVoteFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const likeBtnClass =
    snapshot.userVote === "like"
      ? "border-green-300 bg-green-50 text-green-700"
      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50";
  const dislikeBtnClass =
    snapshot.userVote === "dislike"
      ? "border-red-300 bg-red-50 text-red-700"
      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50";

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">{t("accuracyTitle")}</h2>
        {snapshot.dataAccuracyStatus === "needs_review" && (
          <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            {t("accuracyNeedsReview")}
          </span>
        )}
      </div>

      <p className="mt-2 text-sm text-gray-600">{t("accuracyDescription")}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => submitVote("like")}
          className={`inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 ${likeBtnClass}`}
        >
          {t("accuracyLike")} ({snapshot.likeCount})
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => submitVote("dislike")}
          className={`inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 ${dislikeBtnClass}`}
        >
          {t("accuracyDislike")} ({snapshot.dislikeCount})
        </button>
      </div>

      <div className="mt-4 space-y-1 text-sm text-gray-500">
        <p>{t("accuracyTotalVotes", { count: snapshot.totalVotes })}</p>
        <p>{t("accuracyLastVotedAt", { date: lastVoteAtLabel })}</p>
        {snapshot.userVote && (
          <p>
            {t("accuracyYourVote", {
              vote: snapshot.userVote === "like" ? t("accuracyLike") : t("accuracyDislike"),
            })}
          </p>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}
