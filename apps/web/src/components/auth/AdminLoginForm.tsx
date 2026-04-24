"use client";

import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useTranslations } from "next-intl";
import { auth } from "@/lib/auth/firebase-client";

type AdminLoginFormProps = {
  nextPath: string;
};

export function AdminLoginForm({ nextPath }: AdminLoginFormProps) {
  const t = useTranslations("login");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      const idToken = await credential.user.getIdToken();

      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? t("error"));
      }

      window.location.assign(nextPath);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("error"));
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <button
        type="button"
        disabled={isLoading}
        onClick={handleLogin}
        className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-gray-900 px-4 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {isLoading ? t("loading") : t("continueWithGoogle")}
      </button>

      {errorMessage ? (
        <p className="mt-3 text-sm text-red-600">{errorMessage}</p>
      ) : null}
    </div>
  );
}
