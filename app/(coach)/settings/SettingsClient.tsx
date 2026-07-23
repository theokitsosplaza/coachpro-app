"use client";

import { useState, useTransition } from "react";
import {
  User,
  Sparkles,
  CreditCard,
  Bell,
  Eye,
  Check,
  Copy,
  Shield,
  CheckCircle2,
  Globe,
  Clock,
  MessageSquare,
  Info,
  UserPlus,
  Loader2,
  ArrowUp,
  ArrowDown,
  X,
  Plus,
} from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateCoachProfile, inviteCoach, saveCoachQuestionnaire, saveCoachConfig, type InviteCoachState } from "./actions";
import {
  DEFAULT_QUESTIONS,
  MIN_SELECT_OPTIONS,
  MAX_QUESTION_LABEL,
  MAX_QUESTIONS,
  type CoachQuestion,
  type QuestionType,
} from "@/lib/questionnaire";
import { type CoachConfig } from "@/lib/coach-config";
import { LANGUAGES, type Language } from "@/lib/i18n/languages";

// ── Types ─────────────────────────────────────────────────────────────────────

type SettingsTab = "general" | "copilot" | "billing" | "notifications";

export type CoachProfile = {
  name: string;
  email: string;
  businessName: string;
  website: string;
};

// ── Shared style tokens (page-1 design system) ──────────────────────────────────

const CARD =
  "rounded-2xl border border-hair bg-surface p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]";
const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.1em] text-[#C7CDD6]";
const LABEL =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-1";
const INPUT = cn(
  "h-11 w-full rounded-[10px] border border-hair-2 bg-bg px-3.5 text-sm text-text",
  "placeholder:text-muted-3 transition-colors hover:border-white/20",
  "focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring",
);

// ── Primitives ────────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: () => void;
  id?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={id}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
        "transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        checked ? "bg-accent" : "bg-white/10"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-4">
      <div className="min-w-0">
        <p className="text-sm font-bold text-text">{label}</p>
        <p className="mt-0.5 text-[13px] text-muted-1">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(CARD, className)}>
      <h3 className={EYEBROW}>{title}</h3>
      {description && (
        <p className="mt-1.5 text-[12.5px] text-muted-1">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function AutoSaveIndicator({ visible }: { visible: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold text-green transition-all duration-300",
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none"
      )}
      aria-live="polite"
    >
      <CheckCircle2 className="h-3.5 w-3.5" />
      Saved
    </span>
  );
}

function ComingSoonBanner({ message }: { message: string }) {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-[color-mix(in_oklab,var(--accent)_22%,transparent)] bg-[color-mix(in_oklab,var(--accent)_9%,var(--surface-deep))] px-4 py-3">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-lite" strokeWidth={2} />
      <p className="text-[13px] text-accent-lite">{message}</p>
    </div>
  );
}


// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (!parts[0]) return "?";
  return parts.length === 1
    ? parts[0].slice(0, 2).toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Invite Coach section ──────────────────────────────────────────────────────

function InviteCoachSection() {
  const [result, setResult] = useState<InviteCoachState>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setResult(null)
    const fd   = new FormData(e.currentTarget)
    const form = e.currentTarget
    startTransition(async () => {
      const state = await inviteCoach(null, fd)
      setResult(state)
      if (state && 'success' in state) form.reset()
    })
  }

  return (
    <SectionCard
      title="Invite Coach"
      description="Send an onboarding invite to a new coach account"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="invite-name" className={LABEL}>
              Full name
            </label>
            <input
              id="invite-name"
              name="name"
              type="text"
              required
              placeholder="Jane Smith"
              className={INPUT}
            />
          </div>
          <div>
            <label htmlFor="invite-email" className={LABEL}>
              Email address
            </label>
            <input
              id="invite-email"
              name="email"
              type="email"
              required
              placeholder="coach@example.com"
              className={INPUT}
            />
          </div>
        </div>

        {result && 'error' in result && (
          <p className="rounded-lg bg-status-red-soft px-3 py-2 text-sm text-status-red">
            {result.error}
          </p>
        )}
        {result && 'success' in result && (
          <p className="flex items-center gap-1.5 rounded-lg bg-[color-mix(in_oklab,var(--green)_12%,transparent)] px-3 py-2 text-sm font-semibold text-green">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            {result.message}
          </p>
        )}

        <div className="flex justify-end border-t border-hair pt-4">
          <button
            type="submit"
            disabled={isPending}
            className={buttonClass({ size: "md" })}
          >
            {isPending ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" />Sending…</>
            ) : (
              <><UserPlus className="h-3.5 w-3.5" />Send invite</>
            )}
          </button>
        </div>
      </form>
    </SectionCard>
  )
}

// ── Tab: General ──────────────────────────────────────────────────────────────

function GeneralTab({ initialProfile, isAdmin }: { initialProfile: CoachProfile; isAdmin: boolean }) {
  const [profile, setProfile] = useState(initialProfile);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const set = (key: keyof CoachProfile) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setProfile((p) => ({ ...p, [key]: e.target.value }));

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      try {
        await updateCoachProfile(profile);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (e) {
        // updateCoachProfile throws on failure (e.g. the new email is already in
        // use, so the Supabase auth email couldn't be synced). Surface it.
        setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      }
    });
  };

  const FIELDS: { label: string; key: keyof CoachProfile; type?: string }[] = [
    { label: "Full name",      key: "name" },
    { label: "Email address",  key: "email", type: "email" },
    { label: "Business name",  key: "businessName" },
    { label: "Website",        key: "website" },
  ];

  return (
    <div className="space-y-6">
      <SectionCard title="Coach Profile" description="Your identity on the platform">
        <div className="flex items-start gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--accent)_20%,#14161B)] text-xl font-bold text-accent-lite">
            {getInitials(profile.name)}
          </div>
          <div className="grid flex-1 gap-4 sm:grid-cols-2">
            {FIELDS.map(({ label, key, type }) => (
              <div key={key}>
                <label htmlFor={`field-${key}`} className={LABEL}>
                  {label}
                </label>
                <input
                  id={`field-${key}`}
                  type={type ?? "text"}
                  value={profile[key]}
                  onChange={set(key)}
                  className={INPUT}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-3 border-t border-hair pt-4">
          {error && (
            <p className="mr-auto rounded-lg bg-status-red-soft px-3 py-1.5 text-sm text-status-red">
              {error}
            </p>
          )}
          <AutoSaveIndicator visible={saved} />
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className={buttonClass({ size: "md" })}
          >
            {isPending ? "Saving…" : "Save profile"}
          </button>
        </div>
      </SectionCard>

      {/* Platform Preferences — read-only display, no interactive affordances */}
      <SectionCard title="Platform Preferences">
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { label: "Timezone",          icon: Clock,  value: "Europe/Amsterdam (UTC+2)" },
            { label: "Language & region", icon: Globe,  value: "English (Netherlands)" },
          ].map(({ label, icon: Icon, value }) => (
            <div key={label}>
              <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-1">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </label>
              <div className="flex h-11 items-center rounded-[10px] border border-hair-2 bg-bg px-3.5">
                <span className="text-sm text-muted-1">{value}</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {isAdmin && <InviteCoachSection />}
    </div>
  );
}


// ── Client questionnaire section (LIVE — not part of the mock dials below) ────

function QuestionnaireSection({ initialQuestions }: { initialQuestions: CoachQuestion[] }) {
  const [questions, setQuestions] = useState<CoachQuestion[]>(initialQuestions);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<QuestionType>("text");
  const [newOptions, setNewOptions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const move = (index: number, dir: -1 | 1) => {
    setQuestions((qs) => {
      const target = index + dir;
      if (target < 0 || target >= qs.length) return qs;
      const next = [...qs];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const remove = (index: number) =>
    setQuestions((qs) => qs.filter((_, i) => i !== index));

  const add = () => {
    setError(null);
    const label = newLabel.trim();
    if (!label) { setError("Enter a question label."); return; }
    if (questions.length >= MAX_QUESTIONS) { setError(`At most ${MAX_QUESTIONS} questions.`); return; }
    const q: CoachQuestion = { id: crypto.randomUUID(), label, type: newType };
    if (newType === "select") {
      const options = newOptions.split(",").map((o) => o.trim()).filter(Boolean);
      if (options.length < MIN_SELECT_OPTIONS) {
        setError(`Single-select needs at least ${MIN_SELECT_OPTIONS} options (comma-separated).`);
        return;
      }
      q.options = options;
    }
    setQuestions((qs) => [...qs, q]);
    setNewLabel(""); setNewOptions("");
  };

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await saveCoachQuestionnaire(questions);
      if ("error" in result) { setError(result.error); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <SectionCard
      title="Client questionnaire"
      description="Asked once per client at onboarding — you record the answers on the client's page, and the AI reads them as stable context on every check-in. Deleting a question immediately stops its stored answers from reaching the AI."
    >
      <div className="space-y-2">
        {questions.length === 0 && (
          <p className="py-2 text-[13px] text-muted-2">
            No questions — new clients get no background questionnaire. Restore the defaults below to start again.
          </p>
        )}
        {questions.map((q, i) => (
          <div
            key={q.id}
            className="flex items-center gap-3 rounded-[10px] border border-hair-2 bg-bg px-3.5 py-2.5"
          >
            <div className="flex shrink-0 flex-col">
              <button
                type="button" aria-label="Move up" disabled={i === 0 || isPending}
                onClick={() => move(i, -1)}
                className="rounded p-0.5 text-muted-2 transition-colors hover:text-text disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button" aria-label="Move down" disabled={i === questions.length - 1 || isPending}
                onClick={() => move(i, 1)}
                className="rounded p-0.5 text-muted-2 transition-colors hover:text-text disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-text">{q.label}</p>
              <p className="text-[11.5px] text-muted-2">
                {q.type === "select" ? `single-select · ${(q.options ?? []).join(" / ")}` : q.type === "number" ? "number" : "short text"}
              </p>
            </div>
            <button
              type="button" aria-label={`Remove "${q.label}"`} disabled={isPending}
              onClick={() => remove(i)}
              className="shrink-0 rounded p-1 text-muted-2 transition-colors hover:text-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add a question */}
      <div className="mt-4 space-y-3 border-t border-hair pt-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
          <div>
            <label htmlFor="new-question-label" className={LABEL}>New question</label>
            <input
              id="new-question-label" type="text" maxLength={MAX_QUESTION_LABEL}
              placeholder="e.g. How many hours a week do you commute?"
              value={newLabel} onChange={(e) => setNewLabel(e.target.value)}
              disabled={isPending} className={INPUT}
            />
          </div>
          <div>
            <label htmlFor="new-question-type" className={LABEL}>Type</label>
            <select
              id="new-question-type" value={newType}
              onChange={(e) => setNewType(e.target.value as QuestionType)}
              disabled={isPending} className={cn(INPUT, "cursor-pointer")}
            >
              <option value="text">Short text</option>
              <option value="number">Number</option>
              <option value="select">Single-select</option>
            </select>
          </div>
        </div>
        {newType === "select" && (
          <div>
            <label htmlFor="new-question-options" className={LABEL}>Options (comma-separated)</label>
            <input
              id="new-question-options" type="text"
              placeholder="e.g. Rarely, Sometimes, Often"
              value={newOptions} onChange={(e) => setNewOptions(e.target.value)}
              disabled={isPending} className={INPUT}
            />
          </div>
        )}
        <button
          type="button" onClick={add} disabled={isPending}
          className={buttonClass({ variant: "secondary", size: "md" })}
        >
          <Plus className="h-4 w-4" /> Add question
        </button>
      </div>

      {error && (
        <p className="mt-3 text-xs text-red">{error}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-hair pt-4">
        <button
          type="button" onClick={save} disabled={isPending}
          className={buttonClass({ size: "md" })}
        >
          {isPending ? (<><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>) : "Save questionnaire"}
        </button>
        <button
          type="button" disabled={isPending}
          onClick={() => { setQuestions(DEFAULT_QUESTIONS); setError(null); }}
          className={buttonClass({ variant: "secondary", size: "md" })}
        >
          Restore defaults
        </button>
        <AutoSaveIndicator visible={saved} />
      </div>
    </SectionCard>
  );
}

function ConfigSection({ initialConfig }: { initialConfig: CoachConfig }) {
  const [showMacros, setShowMacros] = useState(initialConfig.showMacros);
  const [draftClientMessage, setDraftClientMessage] = useState(initialConfig.draftClientMessage);
  const [defaultClientLanguage, setDefaultClientLanguage] = useState<Language>(initialConfig.defaultClientLanguage);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await saveCoachConfig({ showMacros, draftClientMessage, defaultClientLanguage });
      if ("error" in result) { setError(result.error); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <SectionCard
      title="AI configuration"
      description="How the Copilot behaves for your clients. Saving re-runs pending analyses so a change takes effect immediately."
    >
      <div className="divide-y divide-hair">
        <ToggleRow
          label="Show macros & adherence"
          description="Nutrition-compliance stats across your views, and macro/adherence language in the AI summary. Turn off if you coach training only."
          checked={showMacros}
          onChange={() => setShowMacros((v) => !v)}
        />
        <ToggleRow
          label="Draft client messages"
          description="Let the AI write a ready-to-send message for each client. Turn off to keep only the coach summary and the attention flag."
          checked={draftClientMessage}
          onChange={() => setDraftClientMessage((v) => !v)}
        />
      </div>

      <div className="mt-4 border-t border-hair pt-4">
        <label htmlFor="default-language" className={LABEL}>Default language for new clients</label>
        <select
          id="default-language"
          value={defaultClientLanguage}
          onChange={(e) => setDefaultClientLanguage(e.target.value as Language)}
          disabled={isPending}
          className={cn(INPUT, "max-w-[240px] cursor-pointer")}
        >
          {Object.entries(LANGUAGES).map(([code, { label }]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-muted-2">
          Applied only to clients you create from now on. Existing clients keep their language.
        </p>
      </div>

      {error && <p className="mt-3 text-xs text-red">{error}</p>}

      <div className="mt-4 flex items-center gap-3 border-t border-hair pt-4">
        <button type="button" onClick={save} disabled={isPending} className={buttonClass({ size: "md" })}>
          {isPending ? (<><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>) : "Save configuration"}
        </button>
        <AutoSaveIndicator visible={saved} />
      </div>
    </SectionCard>
  );
}

function CopilotTab({
  initialQuestions,
  initialConfig,
}: {
  initialQuestions: CoachQuestion[];
  initialConfig: CoachConfig;
}) {
  return (
    <div className="space-y-6">
      {/* LIVE: per-client questionnaire manager */}
      <QuestionnaireSection initialQuestions={initialQuestions} />

      {/* LIVE: per-coach configuration dials */}
      <ConfigSection initialConfig={initialConfig} />
    </div>
  );
}

// ── Tab: Billing ──────────────────────────────────────────────────────────────

function BillingTab() {
  return (
    <div className="rounded-2xl border border-hair bg-surface p-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="mx-auto flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-accent-lite">
        <CreditCard className="h-6 w-6" strokeWidth={1.7} />
      </div>
      <h3 className="mt-5 text-[17px] font-bold text-text">Billing is managed externally</h3>
      <p className="mt-2 mx-auto max-w-sm text-sm leading-relaxed text-muted-1">
        To update your plan, view invoices, or change your payment method, contact us at{" "}
        <a
          href="mailto:billing@vimafy.com"
          className="font-bold text-accent-lite hover:underline"
        >
          billing@vimafy.com
        </a>
      </p>
      <p className="mt-5 flex items-center justify-center gap-1.5 text-[12px] text-muted-2">
        <Shield className="h-3.5 w-3.5 text-green" strokeWidth={2} />
        Payments secured by Stripe · PCI DSS Level 1 compliant
      </p>
    </div>
  );
}

// ── Tab: Notifications ────────────────────────────────────────────────────────

function NotificationsTab() {
  const [email, setEmail] = useState({
    missedCheckin: true,
    newClient: true,
    aiReady: true,
    weeklyReport: false,
    checkInReceived: false,
  });

  const [platform, setPlatform] = useState({
    churnRisk: true,
    newMessage: true,
    approvalReminder: true,
    lowCompliance: false,
  });

  const toggleEmail = (k: keyof typeof email) => setEmail((p) => ({ ...p, [k]: !p[k] }));
  const togglePlatform = (k: keyof typeof platform) => setPlatform((p) => ({ ...p, [k]: !p[k] }));

  return (
    <div className="space-y-6">
      <ComingSoonBanner message="Notification delivery is coming soon — these preferences will be saved when email alerts go live." />

      <SectionCard
        title="Email Notifications"
        description="Delivered to your registered email address"
      >
        <div className="divide-y divide-hair">
          <ToggleRow
            label="Client misses a check-in"
            description="Alert when a client hasn't submitted after 7 days"
            checked={email.missedCheckin}
            onChange={() => toggleEmail("missedCheckin")}
          />
          <ToggleRow
            label="New client onboarded"
            description="Confirmation when onboarding is complete"
            checked={email.newClient}
            onChange={() => toggleEmail("newClient")}
          />
          <ToggleRow
            label="AI analysis ready"
            description="Notified when a new check-in synthesis is generated"
            checked={email.aiReady}
            onChange={() => toggleEmail("aiReady")}
          />
          <ToggleRow
            label="Weekly summary report"
            description="Every Monday — roster compliance, flags, and highlights"
            checked={email.weeklyReport}
            onChange={() => toggleEmail("weeklyReport")}
          />
          <ToggleRow
            label="Check-in received"
            description="Real-time email for every client submission"
            checked={email.checkInReceived}
            onChange={() => toggleEmail("checkInReceived")}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Platform Alerts"
        description="In-app and push notifications"
      >
        <div className="divide-y divide-hair">
          <ToggleRow
            label="High churn risk flag"
            description="Immediate alert when a client is classified as at-risk"
            checked={platform.churnRisk}
            onChange={() => togglePlatform("churnRisk")}
          />
          <ToggleRow
            label="New message from client"
            description="Notification in the coaching inbox"
            checked={platform.newMessage}
            onChange={() => togglePlatform("newMessage")}
          />
          <ToggleRow
            label="Plan approval reminder"
            description="Prompt to review AI recommendations after 24 hours"
            checked={platform.approvalReminder}
            onChange={() => togglePlatform("approvalReminder")}
          />
          <ToggleRow
            label="Low compliance alert"
            description="Flag when a client's macro compliance drops below 70%"
            checked={platform.lowCompliance}
            onChange={() => togglePlatform("lowCompliance")}
          />
        </div>
      </SectionCard>
    </div>
  );
}

// ── Settings nav ──────────────────────────────────────────────────────────────

const TABS: {
  id: SettingsTab;
  label: string;
  icon: typeof User;
  badge?: string;
}[] = [
  { id: "general",       label: "General",       icon: User },
  { id: "copilot",       label: "AI Copilot",    icon: Sparkles, badge: "Pro" },
  { id: "billing",       label: "Billing",       icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell },
];

// ── Client shell ──────────────────────────────────────────────────────────────

export function SettingsClient({ initialProfile, isAdmin, initialQuestions, initialConfig }: { initialProfile: CoachProfile; isAdmin: boolean; initialQuestions: CoachQuestion[]; initialConfig: CoachConfig }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-hair px-6 md:px-8">
          <h1 className="text-xl font-extrabold tracking-[-0.01em] text-text">Settings</h1>
          <span className="flex items-center gap-1.5 text-[12.5px] text-muted-1">
            <span className="h-[7px] w-[7px] rounded-full bg-green" />
            Vimafy · <b className="font-bold text-accent-lite">Pro plan</b>
          </span>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden max-[860px]:flex-col">
          <nav
            className="flex w-56 shrink-0 flex-col gap-1 border-r border-hair px-3 py-5 max-[860px]:w-full max-[860px]:flex-row max-[860px]:gap-2 max-[860px]:overflow-x-auto max-[860px]:border-r-0 max-[860px]:border-b max-[860px]:py-2.5"
            aria-label="Settings navigation"
          >
            {TABS.map(({ id, label, icon: Icon, badge }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-left text-[13.5px] font-semibold transition-colors max-[860px]:shrink-0",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring",
                    isActive ? "text-white" : "text-nav hover:bg-white/[0.03] hover:text-white"
                  )}
                >
                  {isActive && (
                    <>
                      <span className="pointer-events-none absolute inset-0 rounded-[11px] bg-[color-mix(in_oklab,var(--accent)_15%,transparent)]" />
                      <span className="pointer-events-none absolute -left-3 top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded-r-[3px] bg-accent" />
                    </>
                  )}
                  <Icon className="relative h-4 w-4 shrink-0" strokeWidth={1.9} />
                  <span className="relative flex-1">{label}</span>
                  {badge && (
                    <span className="relative rounded-md bg-[color-mix(in_oklab,var(--accent)_20%,transparent)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-lite">
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl px-8 py-8">
              <div className="mb-8">
                {(() => {
                  const t = TABS.find((t) => t.id === activeTab)!;
                  const Icon = t.icon;
                  return (
                    <>
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-accent" strokeWidth={2} />
                        <h2 className="text-xl font-extrabold tracking-[-0.01em] text-text">{t.label}</h2>
                      </div>
                      <p className="mt-1 text-[13.5px] text-muted-1">
                        {activeTab === "general"       && "Your profile and platform preferences"}
                        {activeTab === "copilot"       && "Configure how the AI Copilot analyses your clients"}
                        {activeTab === "billing"       && "Subscription, usage, and payment settings"}
                        {activeTab === "notifications" && "Control when and how you are alerted"}
                      </p>
                    </>
                  );
                })()}
              </div>

              {activeTab === "general"       && <GeneralTab initialProfile={initialProfile} isAdmin={isAdmin} />}
              {activeTab === "copilot"       && <CopilotTab initialQuestions={initialQuestions} initialConfig={initialConfig} />}
              {activeTab === "billing"       && <BillingTab />}
              {activeTab === "notifications" && <NotificationsTab />}
            </div>
          </main>
        </div>
      </div>
  );
}
