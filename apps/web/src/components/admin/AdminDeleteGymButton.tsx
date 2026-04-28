"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type AdminDeleteGymButtonProps = {
  gymId: string;
  gymName: string;
};

export function AdminDeleteGymButton({
  gymId,
  gymName,
}: AdminDeleteGymButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleDelete() {
    startTransition(async () => {
      setSuccessMessage(null);
      setErrorMessage(null);

      const response = await fetch(`/api/gyms/${gymId}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setErrorMessage(body?.error ?? "Failed to delete gym.");
        return;
      }

      setSuccessMessage("Gym deleted successfully.");
      setIsConfirmOpen(false);
      window.setTimeout(() => {
        router.refresh();
      }, 900);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setIsConfirmOpen(true)}
        disabled={isPending}
        className="text-sm font-medium text-red-700 underline-offset-2 transition-colors hover:text-red-800 hover:underline disabled:cursor-not-allowed disabled:text-red-300"
      >
        {isPending ? "Deleting..." : "Delete"}
      </button>
      {successMessage ? (
        <span className="text-xs text-green-700">{successMessage}</span>
      ) : null}
      {errorMessage ? (
        <span className="text-xs text-red-600">{errorMessage}</span>
      ) : null}

      {isConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Delete gym?</h3>
            <p className="mt-2 text-sm text-gray-600">
              You are about to delete <span className="font-medium">{gymName}</span>.
              This action cannot be undone.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isPending}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-red-700 px-4 text-sm font-medium text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                {isPending ? "Deleting..." : "Delete gym"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
