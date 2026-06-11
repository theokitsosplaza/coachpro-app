"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const inputBase =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground " +
  "placeholder:text-muted-foreground/50 transition-colors " +
  "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent " +
  "disabled:opacity-50";

export default function SetPasswordPage() {
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getClaims().then(({ data, error }) => {
      if (error || !data) {
        router.replace("/login");
      } else {
        setSessionReady(true);
      }
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const form = e.currentTarget;
    const newPassword    = (form.elements.namedItem("password") as HTMLInputElement).value;
    const confirmPassword = (form.elements.namedItem("confirm")  as HTMLInputElement).value;

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setIsPending(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setError(error.message);
      setIsPending(false);
      return;
    }

    router.push("/");
  }

  if (!sessionReady) {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent mb-4">
            <Dumbbell className="w-6 h-6 text-accent-foreground" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-xl font-semibold text-foreground tracking-tight">
            Vimafy
          </h1>
          <p className="mt-1 text-sm text-secondary">Set your password</p>
        </div>

        <div
          className="bg-surface-2 border border-border-strong rounded-2xl p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block mb-1.5 text-sm font-medium text-foreground">
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="••••••••"
                className={inputBase}
              />
            </div>

            <div>
              <label htmlFor="confirm" className="block mb-1.5 text-sm font-medium text-foreground">
                Confirm password
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="••••••••"
                className={inputBase}
              />
            </div>

            {error && (
              <p className="text-sm text-status-red bg-status-red-soft rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5",
                "bg-accent text-accent-foreground text-sm font-semibold",
                "hover:opacity-90 active:opacity-80 transition-opacity",
                "disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              )}
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isPending ? "Saving…" : "Set password"}
            </button>
          </form>
        </div>

      </div>
    </main>
  );
}
