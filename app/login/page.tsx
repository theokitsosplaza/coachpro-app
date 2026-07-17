"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const inputBase =
  "w-full rounded-xl border border-hair-2 bg-bg px-3.5 py-3 text-sm text-text " +
  "placeholder:text-muted-3 transition-colors " +
  "focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-ring " +
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
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-6"
      style={{
        background:
          "radial-gradient(1100px 620px at 72% -12%, color-mix(in oklab, var(--accent) 18%, transparent), transparent 60%), radial-gradient(900px 600px at 12% 112%, color-mix(in oklab, var(--accent) 10%, transparent), transparent 55%), var(--bg)",
      }}
    >
      {/* Faint grid overlay, masked to a soft center glow (decorative). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
          maskImage: "radial-gradient(700px 500px at 50% 35%, #000, transparent 80%)",
          WebkitMaskImage: "radial-gradient(700px 500px at 50% 35%, #000, transparent 80%)",
        }}
      />

      <div className="relative w-full max-w-[420px]">
        {/* Brand */}
        <div className="mb-7 flex justify-center">
          <Image
            src="/brand/vimafy-lockup-dark.svg"
            alt="Vimafy"
            width={470}
            height={128}
            priority
            unoptimized
            className="h-11 w-auto"
          />
        </div>

        {/* No-account banner (bounced here by verifyCoachSession after we
            cleared a session whose auth user has no Coach row). */}
        {noAccount && (
          <div className="mb-4 rounded-lg border border-[color-mix(in_oklab,var(--amber)_30%,transparent)] bg-[color-mix(in_oklab,var(--amber)_12%,transparent)] px-3 py-2.5 text-sm text-amber">
            This account isn&apos;t fully set up yet — please contact your administrator.
          </div>
        )}

        {/* Form card */}
        <div className="rounded-[20px] border border-hair-2 bg-gradient-to-b from-surface to-surface-deep p-8 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.04)]">
          <h1 className="font-display text-[21px] font-bold tracking-[-0.01em] text-text">Welcome back</h1>
          <p className="mb-6 mt-1.5 text-sm text-muted-1">Sign in to your coaching dashboard.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-xs font-semibold text-muted-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@studio.com"
                className={inputBase}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-xs font-semibold text-muted-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className={cn(inputBase, "font-mono tracking-[0.08em]")}
              />
            </div>

            {error && (
              <p className="rounded-lg border border-[color-mix(in_oklab,var(--red)_30%,transparent)] bg-[color-mix(in_oklab,var(--red)_12%,transparent)] px-3 py-2.5 text-sm text-red">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className={cn(
                "mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5",
                "bg-accent text-[15px] font-bold text-accent-foreground",
                "shadow-[0_12px_30px_-12px_color-mix(in_oklab,var(--accent)_90%,transparent)]",
                "transition hover:brightness-110 active:translate-y-px",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "disabled:cursor-not-allowed disabled:opacity-60"
              )}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
                </>
              )}
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
