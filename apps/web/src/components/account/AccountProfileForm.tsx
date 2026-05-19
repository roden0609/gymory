"use client";

import type {
  CSSProperties,
  ChangeEvent,
  FormEvent,
  PointerEvent,
} from "react";
import { useEffect, useRef, useState, useTransition } from "react";
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

type AvatarCropSettings = {
  x: number;
  y: number;
  zoom: number;
};

type AvatarDragState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startCrop: AvatarCropSettings;
};

const DEFAULT_AVATAR_CROP: AvatarCropSettings = {
  x: 50,
  y: 50,
  zoom: 100,
};

const ERROR_KEYS = new Set([
  "display_name_too_short",
  "display_name_too_long",
  "handle_too_short",
  "handle_too_long",
  "handle_invalid",
  "handle_reserved",
  "handle_taken",
  "avatar_url_too_long",
  "avatar_url_invalid",
  "avatar_url_https_only",
  "avatar_file_required",
  "avatar_file_type_invalid",
  "avatar_file_too_large",
  "avatar_upload_failed",
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
  const [savedAvatarUrl, setSavedAvatarUrl] = useState(avatarUrl);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [selectedAvatarPreviewUrl, setSelectedAvatarPreviewUrl] = useState<
    string | null
  >(null);
  const [avatarCrop, setAvatarCrop] =
    useState<AvatarCropSettings>(DEFAULT_AVATAR_CROP);
  const [avatarInputKey, setAvatarInputKey] = useState(0);
  const [savedHandle, setSavedHandle] = useState(initialHandle);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [avatarErrorMessage, setAvatarErrorMessage] = useState("");
  const [avatarSuccessMessage, setAvatarSuccessMessage] = useState("");
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isRemoveAvatarConfirmOpen, setIsRemoveAvatarConfirmOpen] =
    useState(false);
  const [isAvatarPending, setIsAvatarPending] = useState(false);
  const [isPending, startTransition] = useTransition();
  const avatarDragRef = useRef<AvatarDragState | null>(null);
  const previewAvatarUrl = selectedAvatarPreviewUrl ?? savedAvatarUrl;
  const previewAvatarStyle = previewAvatarUrl
    ? getAvatarBackgroundStyle(
        previewAvatarUrl,
        selectedAvatarPreviewUrl ? avatarCrop : null
      )
    : undefined;

  useEffect(() => {
    if (!selectedAvatarFile) {
      setSelectedAvatarPreviewUrl(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(selectedAvatarFile);
    setSelectedAvatarPreviewUrl(nextPreviewUrl);

    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [selectedAvatarFile]);

  useEffect(() => {
    if (!isAvatarModalOpen && !isRemoveAvatarConfirmOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setIsAvatarModalOpen(false);
      setIsRemoveAvatarConfirmOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAvatarModalOpen, isRemoveAvatarConfirmOpen]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          handle,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | {
            error?: string;
            user?: { handle?: string; displayName?: string; avatarUrl?: string | null };
          }
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
      setSavedAvatarUrl(body?.user?.avatarUrl ?? null);
      setHandle(body?.user?.handle ?? handle.trim().toLowerCase());
      setSuccessMessage(t("success"));
    });
  }

  function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    setAvatarErrorMessage("");
    setAvatarSuccessMessage("");
    setAvatarCrop(DEFAULT_AVATAR_CROP);
    setSelectedAvatarFile(event.target.files?.[0] ?? null);
  }

  function handleAvatarPreviewClear() {
    setSelectedAvatarFile(null);
    setSelectedAvatarPreviewUrl(null);
    setAvatarCrop(DEFAULT_AVATAR_CROP);
    setAvatarInputKey((key) => key + 1);
    setAvatarErrorMessage("");
    setAvatarSuccessMessage("");
  }

  function handleAvatarCropPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!selectedAvatarPreviewUrl) return;

    avatarDragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startCrop: avatarCrop,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleAvatarCropPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = avatarDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const width = event.currentTarget.clientWidth || 1;
    const height = event.currentTarget.clientHeight || 1;
    const deltaX = event.clientX - drag.startClientX;
    const deltaY = event.clientY - drag.startClientY;

    setAvatarCrop({
      ...drag.startCrop,
      x: clamp(drag.startCrop.x - (deltaX / width) * 100, 0, 100),
      y: clamp(drag.startCrop.y - (deltaY / height) * 100, 0, 100),
    });
  }

  function handleAvatarCropPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (avatarDragRef.current?.pointerId !== event.pointerId) return;
    avatarDragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  async function handleAvatarUpload() {
    if (!selectedAvatarFile) {
      setAvatarErrorMessage(t("errors.avatar_file_required"));
      return;
    }

    setIsAvatarPending(true);
    setAvatarErrorMessage("");
    setAvatarSuccessMessage("");

    try {
      const avatarFile = await cropAvatarFile(selectedAvatarFile, avatarCrop);
      const formData = new FormData();
      formData.set("avatar", avatarFile);

      const response = await fetch("/api/users/me/avatar", {
        method: "POST",
        body: formData,
      });
      const body = (await response.json().catch(() => null)) as
        | { error?: string; user?: { avatarUrl?: string | null } }
        | null;

      if (!response.ok) {
        const errorKey = body?.error;
        setAvatarErrorMessage(
          errorKey && ERROR_KEYS.has(errorKey)
            ? t(`errors.${errorKey}`)
            : t("errors.generic")
        );
        return;
      }

      setSavedAvatarUrl(body?.user?.avatarUrl ?? null);
      setSelectedAvatarFile(null);
      setSelectedAvatarPreviewUrl(null);
      setAvatarInputKey((key) => key + 1);
      window.dispatchEvent(new Event("gymory:profile-updated"));
      setAvatarSuccessMessage(t("avatarSuccess"));
    } finally {
      setIsAvatarPending(false);
    }
  }

  async function handleAvatarRemove() {
    setIsAvatarPending(true);
    setAvatarErrorMessage("");
    setAvatarSuccessMessage("");

    try {
      const response = await fetch("/api/users/me/avatar", {
        method: "DELETE",
      });
      const body = (await response.json().catch(() => null)) as
        | { error?: string; user?: { avatarUrl?: string | null } }
        | null;

      if (!response.ok) {
        const errorKey = body?.error;
        setAvatarErrorMessage(
          errorKey && ERROR_KEYS.has(errorKey)
            ? t(`errors.${errorKey}`)
            : t("errors.generic")
        );
        return;
      }

      setSavedAvatarUrl(body?.user?.avatarUrl ?? null);
      setSelectedAvatarFile(null);
      setSelectedAvatarPreviewUrl(null);
      setAvatarInputKey((key) => key + 1);
      setIsRemoveAvatarConfirmOpen(false);
      window.dispatchEvent(new Event("gymory:profile-updated"));
      setAvatarSuccessMessage(t("avatarRemoved"));
    } finally {
      setIsAvatarPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-3">
          {previewAvatarUrl ? (
            <button
              type="button"
              onClick={() => setIsAvatarModalOpen(true)}
              aria-label={t("viewAvatar")}
              className="h-14 w-14 shrink-0 rounded-full bg-cover bg-center bg-gray-200 ring-2 ring-white"
              style={previewAvatarStyle}
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
        {selectedAvatarPreviewUrl ? (
          <div className="relative mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <button
              type="button"
              onClick={handleAvatarPreviewClear}
              aria-label={t("clearAvatarPreview")}
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-lg leading-none text-gray-500 shadow-sm transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <span aria-hidden="true">×</span>
            </button>
            <div className="flex flex-col items-center gap-3">
              <div
                role="presentation"
                onPointerDown={handleAvatarCropPointerDown}
                onPointerMove={handleAvatarCropPointerMove}
                onPointerUp={handleAvatarCropPointerUp}
                onPointerCancel={handleAvatarCropPointerUp}
                className="h-56 w-56 touch-none cursor-grab rounded-full bg-gray-200 bg-cover bg-center shadow-inner ring-8 ring-white active:cursor-grabbing"
                style={getAvatarBackgroundStyle(selectedAvatarPreviewUrl, avatarCrop)}
              />
              <div className="min-w-0 text-center">
                <p className="text-sm font-medium text-gray-900">
                  {t("avatarPreview")}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {t("avatarDragHint")}
                </p>
                <p className="mt-1 max-w-64 truncate text-xs text-gray-400">
                  {selectedAvatarFile?.name}
                </p>
              </div>
            </div>
          </div>
        ) : null}
        {selectedAvatarPreviewUrl ? (
          <div className="mt-4 grid gap-3 rounded-lg border border-gray-200 p-4 sm:grid-cols-3">
            <CropSlider
              label={t("avatarCropZoom")}
              min={100}
              max={250}
              value={avatarCrop.zoom}
              onChange={(value) =>
                setAvatarCrop((current) => ({ ...current, zoom: value }))
              }
            />
            <CropSlider
              label={t("avatarCropHorizontal")}
              min={0}
              max={100}
              value={avatarCrop.x}
              onChange={(value) =>
                setAvatarCrop((current) => ({ ...current, x: value }))
              }
            />
            <CropSlider
              label={t("avatarCropVertical")}
              min={0}
              max={100}
              value={avatarCrop.y}
              onChange={(value) =>
                setAvatarCrop((current) => ({ ...current, y: value }))
              }
            />
          </div>
        ) : null}
        <div className="mt-4 flex flex-col gap-2">
          <input
            key={avatarInputKey}
            id="avatar-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarFileChange}
            className="sr-only"
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label
              htmlFor="avatar-file-input"
              className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              {t("chooseAvatarPhoto")}
            </label>
            <button
              type="button"
              onClick={handleAvatarUpload}
              disabled={isAvatarPending || !selectedAvatarFile}
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {isAvatarPending ? t("uploadingAvatar") : t("uploadAvatar")}
            </button>
            {savedAvatarUrl ? (
              <button
                type="button"
                onClick={() => setIsRemoveAvatarConfirmOpen(true)}
                disabled={isAvatarPending}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
              >
                {t("removeAvatar")}
              </button>
            ) : null}
          </div>
          <p className="truncate text-sm text-gray-500">
            {selectedAvatarFile?.name ?? t("noAvatarFileChosen")}
          </p>
        </div>
        <p className="mt-2 text-xs text-gray-500">{t("avatarUploadHint")}</p>
        {avatarErrorMessage ? (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {avatarErrorMessage}
          </p>
        ) : null}
        {avatarSuccessMessage ? (
          <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            {avatarSuccessMessage}
          </p>
        ) : null}
        {isAvatarModalOpen && previewAvatarUrl ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("viewAvatar")}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setIsAvatarModalOpen(false)}
          >
            <div
              className="w-full max-w-lg rounded-lg bg-white p-4 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-gray-900">{t("viewAvatar")}</p>
                <button
                  type="button"
                  onClick={() => setIsAvatarModalOpen(false)}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  {t("closeAvatar")}
                </button>
              </div>
              <div
                aria-hidden="true"
                className="mx-auto mt-4 aspect-square w-full max-w-md rounded-full bg-gray-100 bg-cover bg-center"
                style={previewAvatarStyle}
              />
            </div>
          </div>
        ) : null}
        {isRemoveAvatarConfirmOpen ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-avatar-title"
            aria-describedby="remove-avatar-description"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => {
              if (!isAvatarPending) setIsRemoveAvatarConfirmOpen(false);
            }}
          >
            <div
              className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <p
                id="remove-avatar-title"
                className="text-base font-semibold text-gray-900"
              >
                {t("confirmRemoveAvatarTitle")}
              </p>
              <p
                id="remove-avatar-description"
                className="mt-2 text-sm text-gray-500"
              >
                {t("confirmRemoveAvatarDescription")}
              </p>
              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsRemoveAvatarConfirmOpen(false)}
                  disabled={isAvatarPending}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
                >
                  {t("cancelRemoveAvatar")}
                </button>
                <button
                  type="button"
                  onClick={handleAvatarRemove}
                  disabled={isAvatarPending}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
                >
                  {isAvatarPending
                    ? t("removingAvatar")
                    : t("confirmRemoveAvatarAction")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
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

async function cropAvatarFile(
  file: File,
  crop: AvatarCropSettings
): Promise<File> {
  const image = await loadImage(file);
  const targetSize = 512;
  const canvas = document.createElement("canvas");
  canvas.width = targetSize;
  canvas.height = targetSize;

  const context = canvas.getContext("2d");
  if (!context) return file;

  const baseScale =
    Math.max(targetSize / image.naturalWidth, targetSize / image.naturalHeight) *
    (crop.zoom / 100);
  const drawWidth = image.naturalWidth * baseScale;
  const drawHeight = image.naturalHeight * baseScale;
  const drawX =
    drawWidth <= targetSize ? 0 : (targetSize - drawWidth) * (crop.x / 100);
  const drawY =
    drawHeight <= targetSize ? 0 : (targetSize - drawHeight) * (crop.y / 100);

  context.drawImage(
    image,
    drawX,
    drawY,
    drawWidth,
    drawHeight
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.9)
  );

  if (!blob) return file;
  return new File([blob], "avatar.webp", { type: "image/webp" });
}

function getAvatarBackgroundStyle(
  url: string,
  crop: AvatarCropSettings | null
): CSSProperties {
  return {
    backgroundImage: `url(${url})`,
    backgroundPosition: crop ? `${crop.x}% ${crop.y}%` : "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: crop ? `${crop.zoom}%` : "cover",
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function CropSlider({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-gray-900"
      />
    </label>
  );
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load avatar image"));
    };
    image.src = url;
  });
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
