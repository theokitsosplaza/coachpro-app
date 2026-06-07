"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ChevronDown, Loader2 } from "lucide-react";
import { createClient, updateClient, type FormErrors } from "./actions";
import { cn } from "@/lib/utils";

const GOALS  = ["Fat Loss", "Muscle Gain", "Maintenance", "Recomp"] as const;
const PHASES = ["Cut", "Bulk", "Maintenance", "Not started yet"] as const;

export type ClientInitialValues = {
  id: string
  name: string
  goal: string
  currentPhase: string
  targetProtein: number
  targetCarbs: number
  targetFats: number
  email: string | null
  phone: string | null
  targetFiber: number | null
}

type Props = {
  initialValues?: ClientInitialValues
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1.5 text-xs text-anomaly">{msg}</p>;
}

const inputBase =
  "w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground " +
  "placeholder:text-muted-foreground/50 transition-colors " +
  "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent " +
  "disabled:opacity-50";

export function AddClientForm({ initialValues }: Props) {
  const isEdit = !!initialValues

  const boundAction = isEdit
    ? updateClient.bind(null, initialValues.id)
    : createClient

  const [errors, action, isPending] = useActionState<FormErrors, FormData>(
    boundAction,
    {},
  );

  const cancelHref = isEdit ? `/clients/${initialValues.id}` : "/clients"
  const hasOptionalValues = !!(
    initialValues?.email || initialValues?.phone || initialValues?.targetFiber
  )

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isEdit ? "Edit Client" : "Add New Client"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Required fields are marked <span className="text-anomaly">*</span>
          </p>
        </div>
        <Link
          href={cancelHref}
          className="shrink-0 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Cancel
        </Link>
      </div>

      <form action={action} noValidate className="space-y-5">
        {errors._form && (
          <div className="rounded-lg border border-anomaly/30 bg-anomaly/10 px-4 py-3 text-sm text-anomaly">
            {errors._form}
          </div>
        )}

        {/* ── Client details ───────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Client Details
          </h2>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1.5">
              Name <span className="text-anomaly">*</span>
            </label>
            <input
              id="name" name="name" type="text" autoComplete="off"
              placeholder="e.g. Maria Papadopoulou" disabled={isPending}
              defaultValue={initialValues?.name ?? ""}
              className={cn(inputBase, "border-border", errors.name && "border-anomaly focus:ring-anomaly/30")}
            />
            <FieldError msg={errors.name} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="goal" className="block text-sm font-medium text-foreground mb-1.5">
                Primary Goal <span className="text-anomaly">*</span>
              </label>
              <select
                id="goal" name="goal" disabled={isPending}
                defaultValue={initialValues?.goal ?? ""}
                className={cn(inputBase, "cursor-pointer border-border", errors.goal && "border-anomaly focus:ring-anomaly/30")}
              >
                <option value="" disabled>Select…</option>
                {GOALS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <FieldError msg={errors.goal} />
            </div>

            <div>
              <label htmlFor="currentPhase" className="block text-sm font-medium text-foreground mb-1.5">
                Current Phase <span className="text-anomaly">*</span>
              </label>
              <select
                id="currentPhase" name="currentPhase" disabled={isPending}
                defaultValue={initialValues?.currentPhase ?? ""}
                className={cn(inputBase, "cursor-pointer border-border", errors.currentPhase && "border-anomaly focus:ring-anomaly/30")}
              >
                <option value="" disabled>Select…</option>
                {PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <FieldError msg={errors.currentPhase} />
            </div>
          </div>
        </div>

        {/* ── Macro targets ────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Macro Targets
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              The coach engine uses these to assess weekly adherence.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { id: "targetProtein", label: "Protein (g)", placeholder: "150", defaultVal: initialValues?.targetProtein, error: errors.targetProtein },
              { id: "targetCarbs",   label: "Carbs (g)",   placeholder: "200", defaultVal: initialValues?.targetCarbs,   error: errors.targetCarbs },
              { id: "targetFats",    label: "Fats (g)",    placeholder: "60",  defaultVal: initialValues?.targetFats,    error: errors.targetFats },
            ].map(({ id, label, placeholder, defaultVal, error }) => (
              <div key={id}>
                <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1.5">
                  {label} <span className="text-anomaly">*</span>
                </label>
                <input
                  id={id} name={id} type="number" min="0"
                  placeholder={placeholder} disabled={isPending}
                  defaultValue={defaultVal ?? ""}
                  className={cn(inputBase, "border-border", error && "border-anomaly focus:ring-anomaly/30")}
                />
                <FieldError msg={error} />
              </div>
            ))}
          </div>
        </div>

        {/* ── Optional collapsible ─────────────────────────────── */}
        <details
          className="group rounded-xl border border-border bg-card"
          open={hasOptionalValues || undefined}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 [&::-webkit-details-marker]:hidden">
            <span className="text-sm font-medium text-muted-foreground group-open:text-foreground transition-colors">
              Additional details{" "}
              <span className="text-muted-foreground/60">(optional)</span>
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>

          <div className="border-t border-border px-6 pb-6 pt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                  Email
                </label>
                <input id="email" name="email" type="email" autoComplete="off"
                  placeholder="client@example.com" disabled={isPending}
                  defaultValue={initialValues?.email ?? ""}
                  className={cn(inputBase, "border-border")} />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1.5">
                  Phone
                </label>
                <input id="phone" name="phone" type="tel"
                  placeholder="+30 690 000 0000" disabled={isPending}
                  defaultValue={initialValues?.phone ?? ""}
                  className={cn(inputBase, "border-border")} />
              </div>
            </div>
            <div className="max-w-xs">
              <label htmlFor="targetFiber" className="block text-sm font-medium text-foreground mb-1.5">
                Target Fiber (g)
              </label>
              <input id="targetFiber" name="targetFiber" type="number" min="0"
                placeholder="30" disabled={isPending}
                defaultValue={initialValues?.targetFiber ?? ""}
                className={cn(inputBase, "border-border")} />
            </div>
          </div>
        </details>

        {/* Submit */}
        <button
          type="submit" disabled={isPending}
          className={cn(
            "w-full inline-flex items-center justify-center gap-2 rounded-xl",
            "bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground",
            "shadow-sm shadow-accent/20 transition-colors hover:bg-accent/90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          {isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> {isEdit ? "Saving…" : "Adding client…"}</>
          ) : (
            isEdit ? "Save Changes" : "Add Client to Roster"
          )}
        </button>
      </form>
    </div>
  );
}
