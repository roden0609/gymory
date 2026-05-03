"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type AdminVerifyGymButtonProps = {
  gymId: string;
  isActive: boolean;
  isVerified: boolean;
};

export function AdminVerifyGymButton({
  gymId,
  isActive,
  isVerified,
}: AdminVerifyGymButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleVerify() {
    startTransition(async () => {
      setSuccessMessage(null);
      setErrorMessage(null);

      const response = await fetch(`/api/gyms/${gymId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_verified: true,
          equipment_last_verified_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setErrorMessage(body?.error ?? "Failed to verify gym.");
        return;
      }

      setSuccessMessage("Gym verified successfully.");
      window.setTimeout(() => {
        router.refresh();
      }, 900);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleVerify}
        disabled={isPending || isVerified || !isActive}
        className="text-sm font-medium text-blue-700 underline-offset-2 transition-colors hover:text-blue-800 hover:underline disabled:cursor-not-allowed disabled:text-blue-300"
      >
        {isPending ? "Verifying..." : isVerified ? "Verified" : "Verify"}
      </button>
      {successMessage ? (
        <span className="text-xs text-green-700">{successMessage}</span>
      ) : null}
      {errorMessage ? (
        <span className="text-xs text-red-600">{errorMessage}</span>
      ) : null}
    </div>
  );
}
