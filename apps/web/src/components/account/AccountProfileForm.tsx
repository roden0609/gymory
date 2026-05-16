"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type AccountProfileFormProps = {
  initialDisplayName: string;
  initialHandle: string;
  avatarUrl: string | null;
  email: string;
  stats: {
    updated: number;
    firsts: number;
    accuracy: number;
  };
};

const ERROR_KEYS = new Set([
  "display_name_too_short",
  "display_name_too_long",
  "handle_too_short",
  "handle_too_long",
  "handle_invalid",
  "handle_reserved",
  "handle_taken",
  "invalid_payload",
  "unauthorized",
]);

export function AccountProfileForm({
  initialDisplayName,
  initialHandle,
  avatarUrl,
  email,
  stats,
}: AccountProfileFormProps) {
  const t = useTranslations("account");
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [handle, setHandle] = useState(initialHandle);
  const [savedHandle, setSavedHandle] = useState(initialHandle);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, handle }),
      });
      const body = (await response.json().catch(() => null)) as
        | { error?: string; user?: { handle?: string; displayName?: string } }
        | null;

      if (!response.ok) {
        const errorKey = body?.error;
        setErrorMessage(
          errorKey && ERROR_KEYS.has(errorKey)
            ? t(`errors.${errorKey}`)
            : t("errors.generic")
        );
        return;
      }

      if (body?.user?.handle) setSavedHandle(body.user.handle);
      if (body?.user?.displayName) setDisplayName(body.user.displayName);
      setHandle(body?.user?.handle ?? handle.trim().toLowerCase());
      setSuccessMessage(t("success"));
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <span
              aria-hidden="true"
              className="h-14 w-14 shrink-0 rounded-full bg-cover bg-center bg-gray-200"
              style={{ backgroundImage: `url(${avatarUrl})` }}
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-200 text-lg font-semibold text-gray-600"
            >
              {displayName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900">{displayName}</p>
            <p className="truncate text-sm text-gray-500">{email}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-gray-500">{t("avatarNote")}</p>
      </section>

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-gray-200 bg-white p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">
              {t("displayName")}
            </span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              maxLength={40}
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">
              {t("handle")}
            </span>
            <input
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              maxLength={30}
              required
            />
            <span className="block text-xs text-gray-500">{t("handleHint")}</span>
          </label>
        </div>

        {errorMessage ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}
        {successMessage ? (
          <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            {successMessage}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={`/contributors/${savedHandle}`}
            className="text-sm font-medium text-gray-600 underline underline-offset-4 transition-colors hover:text-gray-900"
          >
            {t("viewPublicProfile")}
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isPending ? t("saving") : t("save")}
          </button>
        </div>
      </form>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label={t("updated")} value={stats.updated} />
        <Stat label={t("firsts")} value={stats.firsts} />
        <Stat label={t("accuracy")} value={stats.accuracy} />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
