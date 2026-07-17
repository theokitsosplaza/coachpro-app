"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const inputBase =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground " +
  "placeholder:text-muted-foreground/50 transition-colors " +
  "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent " +
  "disabled:opacity-50";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const noAccount = searchParams.get("error") === "no_account";
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setIsPending(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="mb-8 text-center">
          <Image
            src="/brand/vimafy-lockup-dark.svg"
            alt="Vimafy"
            width={470}
            height={128}
            priority
            unoptimized
            className="mx-auto mb-3 h-10 w-auto"
          />
          <p className="text-sm text-secondary">Sign in to your dashboard</p>
        </div>

        {/* No-account banner (bounced here by verifyCoachSession after we
            cleared a session whose auth user has no Coach row). */}
        {noAccount && (
          <div className="mb-4 rounded-lg border border-warning/30 bg-warning-muted px-3 py-2.5 text-sm text-warning">
            This account isn&apos;t fully set up yet — please contact your administrator.
          </div>
        )}

        {/* Form card */}
        <div
          className="bg-surface-2 border border-border-strong rounded-2xl p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block mb-1.5 text-sm font-medium text-foreground"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                className={inputBase}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block mb-1.5 text-sm font-medium text-foreground"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
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
              {isPending ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

      </div>
    </main>
  );
}

export default function LoginPage() {
  // useSearchParams() requires a Suspense boundary in Next 16.
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
