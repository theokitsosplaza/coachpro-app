"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronDown, Loader2 } from "lucide-react";
import { createClient, updateClient, type FormErrors } from "./actions";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LANGUAGES, DEFAULT_LANGUAGE } from "@/lib/i18n/languages";

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
  language: string
}

type Props = {
  initialValues?: ClientInitialValues
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1.5 text-xs text-red">{msg}</p>;
}

const inputBase =
  "h-11 w-full rounded-[10px] border bg-bg px-3.5 text-sm text-text " +
  "placeholder:text-muted-3 transition-colors hover:border-white/20 " +
  "focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring " +
  "disabled:opacity-50";

function collectWarnings(form: HTMLFormElement): string[] {
  const protein = parseFloat((form.elements.namedItem("targetProtein") as HTMLInputElement)?.value ?? "");
  const carbs   = parseFloat((form.elements.namedItem("targetCarbs")   as HTMLInputElement)?.value ?? "");
  const fats    = parseFloat((form.elements.namedItem("targetFats")    as HTMLInputElement)?.value ?? "");

  const ws: string[] = [];

  if (!isNaN(protein) && protein > 0 && protein < 40)
    ws.push(`Protein is ${protein}g — unusually low (typically ≥ 40g).`);
  if (!isNaN(protein) && protein > 600)
    ws.push(`Protein is ${protein}g — unusually high (typically ≤ 600g).`);
  if (!isNaN(carbs) && carbs > 1000)
    ws.push(`Carbs is ${carbs}g — unusually high (typically ≤ 1000g).`);
  if (!isNaN(fats) && fats > 350)
    ws.push(`Fats is ${fats}g — unusually high (typically ≤ 350g).`);

  if (!isNaN(protein) && !isNaN(carbs) && !isNaN(fats)) {
    const kcal = protein * 4 + carbs * 4 + fats * 9;
    if (kcal < 1000)
      ws.push(`These macros total ${Math.round(kcal)} kcal/day — unusually low.`);
    else if (kcal > 6000)
      ws.push(`These macros total ${Math.round(kcal)} kcal/day — unusually high.`);
  }

  return ws;
}

export function AddClientForm({ initialValues }: Props) {
  const isEdit = !!initialValues;

  const boundAction = isEdit
    ? updateClient.bind(null, initialValues.id)
    : createClient;

  const [errors, formAction, isPending] = useActionState<FormErrors, FormData>(
    boundAction,
    {},
  );

  const formRef      = useRef<HTMLFormElement>(null);
  const confirmedRef = useRef(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Preserved values from the last failed submission.
  const v = errors._values;

  // defaultValue resolution: preserved → initial → empty.
  const dv = {
    name:          v?.name          ?? initialValues?.name          ?? "",
    goal:          v?.goal          ?? initialValues?.goal          ?? "",
    currentPhase:  v?.currentPhase  ?? initialValues?.currentPhase ?? "",
    targetProtein: v?.targetProtein ?? (initialValues ? String(initialValues.targetProtein) : ""),
    targetCarbs:   v?.targetCarbs   ?? (initialValues ? String(initialValues.targetCarbs)   : ""),
    targetFats:    v?.targetFats    ?? (initialValues ? String(initialValues.targetFats)     : ""),
    email:         v?.email         ?? initialValues?.email         ?? "",
    phone:         v?.phone         ?? initialValues?.phone         ?? "",
    targetFiber:   v?.targetFiber   ?? (initialValues?.targetFiber != null ? String(initialValues.targetFiber) : ""),
    language:      v?.language      ?? initialValues?.language      ?? DEFAULT_LANGUAGE,
  };

  // Key forces input containers to remount (applying new defaultValues) when
  // the server returns a _values snapshot after a failed submission.
  const formKey = v ? JSON.stringify(v) : "initial";

  // A non-default language counts as "has optional values" so the collapsible
  // opens on edit and the setting is never hidden from the coach.
  const hasOptionalValues = !!(
    v?.email || v?.phone || v?.targetFiber ||
    initialValues?.email || initialValues?.phone || initialValues?.targetFiber ||
    dv.language !== DEFAULT_LANGUAGE
  );

  const cancelHref = isEdit ? `/clients/${initialValues.id}` : "/clients";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (confirmedRef.current) {
      confirmedRef.current = false; // reset for the next submission cycle
      return;                       // confirmed — let the action fire
    }
    const ws = collectWarnings(e.currentTarget);
    if (ws.length > 0) {
      e.preventDefault();
      setWarnings(ws);
    }
  }

  function handleConfirm() {
    confirmedRef.current = true;
    setWarnings([]);
    formRef.current?.requestSubmit(); // re-fires onSubmit; flag skips the check
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-semibold leading-none tracking-[-0.01em] text-text">
            {isEdit ? "Edit client" : "Add new client"}
          </h1>
          <p className="mt-2.5 text-sm text-muted-2">
            Required fields are marked <span className="text-red">*</span>
          </p>
        </div>
        <Link
          href={cancelHref}
          className="shrink-0 text-sm text-muted-2 hover:text-text transition-colors"
        >
          ← Cancel
        </Link>
      </div>

      <form ref={formRef} action={formAction} onSubmit={handleSubmit} noValidate className="space-y-5">
        {errors._form && (
          <div className="rounded-[10px] border border-[color-mix(in_oklab,var(--red)_26%,transparent)] bg-[color-mix(in_oklab,var(--red)_10%,transparent)] px-4 py-3 text-sm text-red">
            {errors._form}
          </div>
        )}

        {/* ── Client details ───────────────────────────────────── */}
        <div key={formKey + "-details"} className="rounded-2xl border border-hair bg-surface p-6 space-y-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-1">
            Client details
          </h2>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-text mb-1.5">
              Name <span className="text-red">*</span>
            </label>
            <input
              id="name" name="name" type="text" autoComplete="off"
              placeholder="e.g. Maria Papadopoulou" disabled={isPending}
              defaultValue={dv.name}
              className={cn(inputBase, "border-hair-2", errors.name && "border-red focus-visible:ring-[color-mix(in_oklab,var(--red)_30%,transparent)]")}
            />
            <FieldError msg={errors.name} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="goal" className="block text-sm font-medium text-text mb-1.5">
                Primary Goal <span className="text-red">*</span>
              </label>
              <select
                id="goal" name="goal" disabled={isPending}
                defaultValue={dv.goal}
                className={cn(inputBase, "cursor-pointer border-hair-2", errors.goal && "border-red focus-visible:ring-[color-mix(in_oklab,var(--red)_30%,transparent)]")}
              >
                <option value="" disabled>Select…</option>
                {GOALS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <FieldError msg={errors.goal} />
            </div>

            <div>
              <label htmlFor="currentPhase" className="block text-sm font-medium text-text mb-1.5">
                Current Phase <span className="text-red">*</span>
              </label>
              <select
                id="currentPhase" name="currentPhase" disabled={isPending}
                defaultValue={dv.currentPhase}
                className={cn(inputBase, "cursor-pointer border-hair-2", errors.currentPhase && "border-red focus-visible:ring-[color-mix(in_oklab,var(--red)_30%,transparent)]")}
              >
                <option value="" disabled>Select…</option>
                {PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <FieldError msg={errors.currentPhase} />
            </div>
          </div>
        </div>

        {/* ── Macro targets ────────────────────────────────────── */}
        <div key={formKey + "-macros"} className="rounded-2xl border border-hair bg-surface p-6 space-y-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-1">
              Macro targets
            </h2>
            <p className="mt-0.5 text-xs text-muted-2">
              The coach engine uses these to assess weekly adherence.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { id: "targetProtein", label: "Protein (g)", placeholder: "150", defaultVal: dv.targetProtein, error: errors.targetProtein },
              { id: "targetCarbs",   label: "Carbs (g)",   placeholder: "200", defaultVal: dv.targetCarbs,   error: errors.targetCarbs },
              { id: "targetFats",    label: "Fats (g)",    placeholder: "60",  defaultVal: dv.targetFats,    error: errors.targetFats },
            ].map(({ id, label, placeholder, defaultVal, error }) => (
              <div key={id}>
                <label htmlFor={id} className="block text-sm font-medium text-text mb-1.5">
                  {label} <span className="text-red">*</span>
                </label>
                <input
                  id={id} name={id} type="number" min="0" step="any"
                  placeholder={placeholder} disabled={isPending}
                  defaultValue={defaultVal}
                  className={cn(inputBase, "border-hair-2", error && "border-red focus-visible:ring-[color-mix(in_oklab,var(--red)_30%,transparent)]")}
                />
                <FieldError msg={error} />
              </div>
            ))}
          </div>
        </div>

        {/* ── Optional collapsible ─────────────────────────────── */}
        <details
          key={formKey + "-optional"}
          className="group rounded-2xl border border-hair bg-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
          open={hasOptionalValues || undefined}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 [&::-webkit-details-marker]:hidden">
            <span className="text-sm font-medium text-muted-2 group-open:text-text transition-colors">
              Additional details{" "}
              <span className="text-muted-3">(optional)</span>
            </span>
            <ChevronDown className="h-4 w-4 text-muted-2 transition-transform group-open:rotate-180" />
          </summary>

          <div className="border-t border-hair px-6 pb-6 pt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-text mb-1.5">
                  Email
                </label>
                <input id="email" name="email" type="email" autoComplete="off"
                  placeholder="client@example.com" disabled={isPending}
                  defaultValue={dv.email}
                  className={cn(inputBase, "border-hair-2")} />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-text mb-1.5">
                  Phone
                </label>
                <input id="phone" name="phone" type="tel"
                  placeholder="+30 690 000 0000" disabled={isPending}
                  defaultValue={dv.phone}
                  className={cn(inputBase, "border-hair-2")} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="targetFiber" className="block text-sm font-medium text-text mb-1.5">
                  Target Fiber (g)
                </label>
                <input id="targetFiber" name="targetFiber" type="number" min="0"
                  placeholder="30" disabled={isPending}
                  defaultValue={dv.targetFiber}
                  className={cn(inputBase, "border-hair-2")} />
              </div>
              <div>
                <label htmlFor="language" className="block text-sm font-medium text-text mb-1.5">
                  Language
                </label>
                <select
                  id="language" name="language" disabled={isPending}
                  defaultValue={dv.language}
                  className={cn(inputBase, "cursor-pointer border-hair-2")}
                >
                  {Object.entries(LANGUAGES).map(([code, { label }]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </details>

        {/* ── Soft-confirm warning panel ──────────────────────── */}
        {warnings.length > 0 && (
          <div className="rounded-[10px] border border-[color-mix(in_oklab,var(--amber)_28%,transparent)] bg-[color-mix(in_oklab,var(--amber)_11%,transparent)] p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber">
                  Please confirm these unusual values:
                </p>
                <ul className="space-y-0.5">
                  {warnings.map((w, i) => (
                    <li key={i} className="text-sm text-amber">• {w}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setWarnings([])}
                className={buttonClass({ variant: "secondary", size: "md" })}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-warning/40 bg-warning-muted px-4 text-sm font-semibold text-warning transition-colors hover:bg-warning/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Proceed anyway
              </button>
            </div>
          </div>
        )}

        {/* ── Submit ───────────────────────────────────────────── */}
        <button
          type="submit" disabled={isPending}
          className={buttonClass({ size: "lg", className: "w-full" })}
        >
          {isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> {isEdit ? "Saving…" : "Adding client…"}</>
          ) : (
            isEdit ? "Save changes" : "Add client to roster"
          )}
        </button>
      </form>
    </div>
  );
}
