"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { TransientBanner } from "@/components/common/TransientBanner";
import type { SubmissionReviewRow } from "@/lib/db/queries/submissions";

type AdminSubmissionsReviewProps = {
  submissions: SubmissionReviewRow[];
};

type ReviewAction = "approve" | "reject";

export function AdminSubmissionsReview({
  submissions,
}: AdminSubmissionsReviewProps) {
  if (submissions.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-500">
        No pending submissions right now.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {submissions.map((submission) => (
        <SubmissionCard key={submission.id} submission={submission} />
      ))}
    </div>
  );
}

function SubmissionCard({ submission }: { submission: SubmissionReviewRow }) {
  const router = useRouter();
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [reviewNotes, setReviewNotes] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const feedbackRef = useRef<HTMLDivElement | null>(null);

  const displayName =
    locale === "zh-HK" && submission.gyms?.name_zh
      ? submission.gyms.name_zh
      : submission.gyms?.name ?? "New gym submission";

  const createdAt = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(submission.created_at));

  const actionLabel =
    submission.action_type === "I"
      ? "Insert"
      : submission.action_type === "D"
        ? "Delete"
        : "Update";

  function handleReview(action: ReviewAction) {
    startTransition(async () => {
      setSuccessMessage("");
      setErrorMessage("");

      const response = await fetch(`/api/admin/submissions/${submission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reviewNotes: reviewNotes.trim() || null,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setErrorMessage(body?.error ?? "Review action failed.");
        return;
      }

      setSuccessMessage(
        action === "approve"
          ? "Submission approved successfully."
          : "Submission rejected successfully."
      );

      window.setTimeout(() => {
        router.refresh();
      }, 900);
    });
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div
        ref={feedbackRef}
        className={
          successMessage || errorMessage
            ? "sticky top-3 z-10 -mx-2 mb-3 px-2"
            : undefined
        }
      >
        {successMessage ? (
          <TransientBanner message={successMessage} tone="success" />
        ) : null}

        {errorMessage ? (
          <TransientBanner key={errorMessage} message={errorMessage} tone="error" />
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {submission.submission_type}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {displayName}
            {submission.gyms?.slug ? ` · /gyms/${submission.gyms.slug}` : ""}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {actionLabel} · {submission.actor_type}
          </p>
          <p className="mt-1 text-xs text-gray-400">{createdAt}</p>
        </div>
        <span className="rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-medium text-yellow-700">
          Pending
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <PayloadBlock title="Changed fields" value={submission.changed_fields} />
        <PayloadBlock
          title="Gym payload"
          value={(submission.payload.gym as Record<string, unknown> | undefined) ?? null}
        />
        <PayloadBlock
          title="Equipment payload"
          value={
            (submission.payload.equipment as Record<string, unknown> | undefined) ?? null
          }
        />
        <PayloadBlock
          title="Brands payload"
          value={
            Array.isArray(submission.payload.brands)
              ? { brands: submission.payload.brands }
              : null
          }
        />
      </div>

      <div className="mt-4 space-y-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-gray-700">
            Review notes
          </span>
          <textarea
            value={reviewNotes}
            onChange={(event) => setReviewNotes(event.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            placeholder="Optional internal note"
          />
        </label>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleReview("approve")}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-gray-900 px-4 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isPending ? "Saving..." : "Approve"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleReview("reject")}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
          >
            Reject
          </button>
        </div>
      </div>
    </section>
  );
}

function PayloadBlock({
  title,
  value,
}: {
  title: string;
  value: Record<string, unknown> | null;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <pre className="mt-2 overflow-x-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
