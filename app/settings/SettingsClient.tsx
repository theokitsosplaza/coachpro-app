"use client";

import { useState, useTransition } from "react";
import {
  User,
  Sparkles,
  CreditCard,
  Bell,
  Brain,
  BarChart3,
  EyeOff,
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
} from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateCoachProfile, inviteCoach, type InviteCoachState } from "./actions";

// ── Types ─────────────────────────────────────────────────────────────────────

type SettingsTab = "general" | "copilot" | "billing" | "notifications";
type AutonomyLevel = "max" | "synthesis" | "silent";
type ResponseStyle = "technical" | "conversational";

export type CoachProfile = {
  name: string;
  email: string;
  businessName: string;
  website: string;
};

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
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
        "transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        checked ? "bg-accent" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-200",
          checked ? "translate-x-4" : "translate-x-0"
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
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
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
    <div className={cn("rounded-xl border border-border bg-card shadow-sm", className)}>
      <div className="border-b border-border px-6 py-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function AutoSaveIndicator({ visible }: { visible: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium text-success transition-all duration-300",
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
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
      <p className="text-xs text-muted-foreground">{message}</p>
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

  const inputCls = cn(
    "h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground",
    "placeholder:text-muted-foreground/50 hover:border-border/80",
    "focus:border-accent focus:bg-card focus:outline-none focus:ring-1 focus:ring-ring/30",
    "transition-all",
  )

  return (
    <SectionCard
      title="Invite Coach"
      description="Send an onboarding invite to a new coach account"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="invite-name"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Full name
            </label>
            <input
              id="invite-name"
              name="name"
              type="text"
              required
              placeholder="Jane Smith"
              className={inputCls}
            />
          </div>
          <div>
            <label
              htmlFor="invite-email"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Email address
            </label>
            <input
              id="invite-email"
              name="email"
              type="email"
              required
              placeholder="coach@example.com"
              className={inputCls}
            />
          </div>
        </div>

        {result && 'error' in result && (
          <p className="rounded-lg bg-status-red-soft px-3 py-2 text-sm text-status-red">
            {result.error}
          </p>
        )}
        {result && 'success' in result && (
          <p className="flex items-center gap-1.5 rounded-lg bg-success-muted px-3 py-2 text-sm font-medium text-success">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            {result.message}
          </p>
        )}

        <div className="flex justify-end border-t border-border pt-4">
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

function GeneralTab({ initialProfile }: { initialProfile: CoachProfile }) {
  const [profile, setProfile] = useState(initialProfile);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const set = (key: keyof CoachProfile) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setProfile((p) => ({ ...p, [key]: e.target.value }));

  const handleSave = () => {
    startTransition(async () => {
      await updateCoachProfile(profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
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
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-xl font-bold text-accent">
            {getInitials(profile.name)}
          </div>
          <div className="grid flex-1 gap-4 sm:grid-cols-2">
            {FIELDS.map(({ label, key, type }) => (
              <div key={key}>
                <label
                  htmlFor={`field-${key}`}
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {label}
                </label>
                <input
                  id={`field-${key}`}
                  type={type ?? "text"}
                  value={profile[key]}
                  onChange={set(key)}
                  className={cn(
                    "h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground",
                    "placeholder:text-muted-foreground/50 hover:border-border/80",
                    "focus:border-accent focus:bg-card focus:outline-none focus:ring-1 focus:ring-ring/30",
                    "transition-all"
                  )}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-3 border-t border-border pt-4">
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
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </label>
              <div className="flex h-9 items-center rounded-lg border border-border bg-muted/30 px-3">
                <span className="text-sm text-muted-foreground">{value}</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <InviteCoachSection />
    </div>
  );
}

// ── Tab: AI Copilot ───────────────────────────────────────────────────────────

const AUTONOMY_OPTIONS: {
  id: AutonomyLevel;
  label: string;
  icon: typeof Brain;
  color: string;
  border: string;
  badge?: string;
  description: string;
  bullets: string[];
}[] = [
  {
    id: "max",
    label: "Max Assistance",
    icon: Brain,
    color: "text-accent",
    border: "border-accent",
    badge: "Recommended",
    description: "Full AI recommendations and automated plan generation.",
    bullets: [
      "Generates weekly plan updates automatically",
      "Proactive coaching suggestions surfaced",
      "AI drafts check-in responses",
    ],
  },
  {
    id: "synthesis",
    label: "Data Synthesis Only",
    icon: BarChart3,
    color: "text-warning",
    border: "border-warning",
    description: "AI flags anomalies and surfaces patterns — no advice given.",
    bullets: [
      "Anomaly detection and trend analysis",
      "Correlation reports (e.g., sleep vs. performance)",
      "No recommendations or plan drafts",
    ],
  },
  {
    id: "silent",
    label: "Silent Mode",
    icon: EyeOff,
    color: "text-muted-foreground",
    border: "border-border",
    description: "AI operates in background. Alerts only for critical safety flags.",
    bullets: [
      "Critical churn-risk and safety alerts only",
      "No analysis surfaced in the UI",
      "Raw data available on demand",
    ],
  },
];

function CopilotTab() {
  const [autonomy, setAutonomy] = useState<AutonomyLevel>("max");
  const [style, setStyle] = useState<ResponseStyle>("technical");
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [apiKeyRevealed, setApiKeyRevealed] = useState(false);

  const [contextToggles, setContextToggles] = useState({
    biofeedback: true,
    history: true,
    macros: true,
    workouts: true,
  });

  const toggleContext = (key: keyof typeof contextToggles) =>
    setContextToggles((p) => ({ ...p, [key]: !p[key] }));

  const handleCopyKey = () => {
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <ComingSoonBanner message="These settings preview future AI controls — selections are not yet applied to analysis." />

      {/* Autonomy Level */}
      <SectionCard
        title="Copilot Autonomy Level"
        description="Control how much initiative the AI takes when analysing client data"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {AUTONOMY_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = autonomy === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setAutonomy(opt.id)}
                className={cn(
                  "group relative flex flex-col rounded-xl border-2 p-4 text-left transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "hover:-translate-y-0.5 hover:shadow-md",
                  isSelected
                    ? `${opt.border} bg-card shadow-sm`
                    : "border-border bg-muted/20 hover:border-border/80"
                )}
              >
                {opt.badge && (
                  <span className="absolute right-3 top-3 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                    {opt.badge}
                  </span>
                )}
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  isSelected ? "bg-muted" : "bg-muted/50"
                )}>
                  <Icon className={cn("h-5 w-5", isSelected ? opt.color : "text-muted-foreground")} strokeWidth={2} />
                </div>
                <p className={cn(
                  "mt-3 text-sm font-bold",
                  isSelected ? "text-foreground" : "text-foreground/75"
                )}>
                  {opt.label}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{opt.description}</p>
                <ul className="mt-3 space-y-1.5">
                  {opt.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Check className={cn(
                        "mt-px h-3 w-3 shrink-0",
                        isSelected ? opt.color : "text-muted-foreground/50"
                      )} />
                      {b}
                    </li>
                  ))}
                </ul>
                {isSelected && (
                  <div className={cn("mt-4 flex items-center gap-1.5 text-xs font-semibold", opt.color)}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Active
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* Context inputs */}
      <SectionCard
        title="Copilot Context"
        description="Data sources the AI is allowed to use when generating analysis"
      >
        <div className="divide-y divide-border">
          <ToggleRow
            label="Include biofeedback signals"
            description="Sleep, stress, RPE and hunger data from check-ins"
            checked={contextToggles.biofeedback}
            onChange={() => toggleContext("biofeedback")}
          />
          <ToggleRow
            label="Include check-in history"
            description="Previous weeks used for trend detection and context"
            checked={contextToggles.history}
            onChange={() => toggleContext("history")}
          />
          <ToggleRow
            label="Include macro compliance data"
            description="Protein, carbs and fat targets vs actuals"
            checked={contextToggles.macros}
            onChange={() => toggleContext("macros")}
          />
          <ToggleRow
            label="Include workout completion data"
            description="Session attendance and missed training flags"
            checked={contextToggles.workouts}
            onChange={() => toggleContext("workouts")}
          />
        </div>
      </SectionCard>

      {/* Response style */}
      <SectionCard
        title="Response Style"
        description="Tone used in AI-generated syntheses and recommendations"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              {
                id: "technical" as ResponseStyle,
                icon: BarChart3,
                label: "Technical",
                sub: "Scientific language — terms like CNS fatigue, cortisol, TDEE, NEAT",
              },
              {
                id: "conversational" as ResponseStyle,
                icon: MessageSquare,
                label: "Conversational",
                sub: "Plain language summaries — accessible for client-facing communications",
              },
            ] as const
          ).map(({ id, icon: Icon, label, sub }) => (
            <button
              key={id}
              type="button"
              onClick={() => setStyle(id)}
              className={cn(
                "flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                style === id
                  ? "border-accent bg-accent/8"
                  : "border-border bg-muted/20 hover:border-border/80 hover:bg-muted/40"
              )}
            >
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", style === id ? "text-accent" : "text-muted-foreground")} strokeWidth={2} />
              <div>
                <p className={cn("text-sm font-bold", style === id ? "text-foreground" : "text-foreground/75")}>
                  {label}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
              </div>
              {style === id && (
                <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-accent" />
              )}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* API Access — Rotate button removed (fake action) */}
      <SectionCard title="API Access" description="Private key for CoachAI Copilot v2.4 integration">
        <div className="flex items-center gap-2">
          <div className="flex-1 overflow-hidden rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <code className="block truncate font-mono text-sm tracking-widest text-muted-foreground">
              {apiKeyRevealed
                ? "cpai_live_a8f3k2x9mq7tz1vr4wd6jhne5lop0ys"
                : "cpai_live_••••••••••••••••••••••••••••••••"}
            </code>
          </div>
          <button
            type="button"
            onClick={() => setApiKeyRevealed((v) => !v)}
            title={apiKeyRevealed ? "Hide key" : "Reveal key"}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border transition-colors",
              apiKeyRevealed
                ? "border-accent/30 bg-accent/8 text-accent"
                : "text-muted-foreground hover:border-accent/30 hover:text-accent"
            )}
          >
            {apiKeyRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleCopyKey}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold transition-colors",
              apiKeyCopied
                ? "border-success/30 bg-success-muted text-success"
                : "text-muted-foreground hover:border-accent/30 hover:text-accent"
            )}
          >
            {apiKeyCopied ? (
              <><Check className="h-3.5 w-3.5" /> Copied</>
            ) : (
              <><Copy className="h-3.5 w-3.5" /> Copy</>
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Generated 12 Feb 2026 · Never expires · Scope: read + write
          {apiKeyRevealed && (
            <span className="ml-2 font-medium text-warning">
              · Key visible — hide when done
            </span>
          )}
        </p>
      </SectionCard>
    </div>
  );
}

// ── Tab: Billing ──────────────────────────────────────────────────────────────

function BillingTab() {
  return (
    <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
      <CreditCard className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
      <h3 className="mt-3 text-sm font-semibold text-foreground">Billing is managed externally</h3>
      <p className="mt-1.5 mx-auto max-w-sm text-sm text-muted-foreground">
        To update your plan, view invoices, or change your payment method, contact us at{" "}
        <a
          href="mailto:billing@vimafy.com"
          className="font-semibold text-accent hover:underline"
        >
          billing@vimafy.com
        </a>
      </p>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/70">
        <Shield className="h-3 w-3" />
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
        <div className="divide-y divide-border">
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
        <div className="divide-y divide-border">
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

export function SettingsClient({ initialProfile }: { initialProfile: CoachProfile }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-6">
          <h1 className="text-base font-bold text-foreground">Settings</h1>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Vimafy · Pro plan
          </span>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <nav
            className="flex w-52 shrink-0 flex-col border-r border-border bg-card pt-4"
            aria-label="Settings navigation"
          >
            {TABS.map(({ id, label, icon: Icon, badge }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={cn(
                  "group mx-2 mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                  activeTab === id
                    ? "bg-accent/10 text-accent"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                {label}
                {badge && (
                  <span className="ml-auto rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                    {badge}
                  </span>
                )}
              </button>
            ))}
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
                        <h2 className="text-xl font-bold text-foreground">{t.label}</h2>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {activeTab === "general"       && "Your profile and platform preferences"}
                        {activeTab === "copilot"       && "Configure how the AI Copilot analyses your clients"}
                        {activeTab === "billing"       && "Subscription, usage, and payment settings"}
                        {activeTab === "notifications" && "Control when and how you are alerted"}
                      </p>
                    </>
                  );
                })()}
              </div>

              {activeTab === "general"       && <GeneralTab initialProfile={initialProfile} />}
              {activeTab === "copilot"       && <CopilotTab />}
              {activeTab === "billing"       && <BillingTab />}
              {activeTab === "notifications" && <NotificationsTab />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
