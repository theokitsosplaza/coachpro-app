"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { saveClientQuestionnaire, type QuestionnaireFormErrors } from "./actions";
import {
  MAX_ANSWER_LENGTH,
  type AnswerSet,
  type CoachQuestion,
} from "@/lib/questionnaire";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  clientId: string
  clientName: string
  questions: CoachQuestion[]
  answerSet: AnswerSet | null
}

const inputBase =
  "h-11 w-full rounded-[10px] border bg-bg px-3.5 text-sm text-text " +
  "placeholder:text-muted-3 transition-colors hover:border-white/20 " +
  "focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring " +
  "disabled:opacity-50";

/**
 * Prefill rule: an existing answer carries over ONLY when its questionId AND
 * type still match, and (for single-select) its value is still an offered
 * option. Anything else starts blank — a changed question never silently
 * inherits an answer that meant something different.
 */
function prefillFor(q: CoachQuestion, answerSet: AnswerSet | null): string {
  const a = answerSet?.answers.find((x) => x.questionId === q.id);
  if (!a || a.type !== q.type) return "";
  if (q.type === "select" && !(q.options ?? []).includes(a.value)) return "";
  return a.value;
}

export function QuestionnaireForm({ clientId, clientName, questions, answerSet }: Props) {
  const boundAction = saveClientQuestionnaire.bind(null, clientId);
  const [errors, action, isPending] = useActionState<QuestionnaireFormErrors, FormData>(
    boundAction,
    {},
  );

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-1">{clientName}</p>
          <h1 className="font-display text-[28px] font-semibold leading-none tracking-[-0.01em] text-text">Client questionnaire</h1>
          <p className="mt-2.5 text-sm text-muted-2">
            Answers become stable context the AI reads on every check-in — fill in
            what you know, leave the rest blank.
          </p>
        </div>
        <Link
          href={`/clients/${clientId}`}
          className="shrink-0 text-sm text-muted-2 hover:text-text transition-colors"
        >
          ← Cancel
        </Link>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-2xl border border-hair bg-surface p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <p className="text-sm text-muted-2">
            You have no questionnaire questions defined. Add some in{" "}
            <Link href="/settings" className="text-accent-lite hover:underline">Settings → AI Copilot</Link>{" "}
            first.
          </p>
        </div>
      ) : (
        <form action={action} noValidate className="space-y-5">
          {errors._form && (
            <div className="rounded-[10px] border border-[color-mix(in_oklab,var(--red)_26%,transparent)] bg-[color-mix(in_oklab,var(--red)_10%,transparent)] px-4 py-3 text-sm text-red">
              {errors._form}
            </div>
          )}

          <div className="rounded-2xl border border-hair bg-surface p-6 space-y-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-1">
              Background
            </h2>
            {questions.map((q) => {
              const name = `q_${q.id}`;
              const prefill = prefillFor(q, answerSet);
              return (
                <div key={q.id}>
                  <label htmlFor={name} className="block text-sm font-medium text-text mb-1.5">
                    {q.label}
                  </label>
                  {q.type === "select" ? (
                    <select
                      id={name} name={name} defaultValue={prefill}
                      disabled={isPending}
                      className={cn(inputBase, "cursor-pointer border-hair-2")}
                    >
                      <option value="">—</option>
                      {(q.options ?? []).map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={name} name={name}
                      type={q.type === "number" ? "number" : "text"}
                      step={q.type === "number" ? "any" : undefined}
                      maxLength={MAX_ANSWER_LENGTH}
                      defaultValue={prefill}
                      disabled={isPending}
                      className={cn(inputBase, "border-hair-2")}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className={buttonClass({ size: "lg", className: "w-full" })}
          >
            {isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            ) : (
              "Save background"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
