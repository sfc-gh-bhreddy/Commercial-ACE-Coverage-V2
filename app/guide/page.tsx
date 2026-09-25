import type { Metadata } from "next";

export const metadata: Metadata = { title: "Guide & Legend" };

function Pill({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap"
      style={{ background: bg, color: fg }}
    >
      {label}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
      {children}
    </div>
  );
}

export default function GuidePage() {
  return (
    <main className="w-full max-w-2xl mx-auto py-10 px-8">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Guide & Legend</h1>
      <p className="text-sm text-muted-foreground mb-8">
        How to read this app and what the suggestions mean.
      </p>

      {/* Intent */}
      <div
        className="rounded-xl border px-5 py-4 mb-8 text-sm leading-relaxed"
        style={{ borderColor: "var(--border)", background: "var(--card)" }}
      >
        <p>
          The suggestions on this app are <strong>starting points</strong>, not instructions.
          They surface uncovered Cap1 accounts and recommend a next action based on deal size,
          consumption stage, and partner signals. <strong>If you see a clear need to assign an
          ASE, go ahead — don't wait for the app to tell you.</strong> Use your own judgment
          and knowledge of the account first.
        </p>
      </div>

      <div className="flex flex-col gap-8">

        {/* Suggested plays */}
        <Section title="Suggested plays">
          <div className="flex flex-col gap-5 text-sm">
            {/* ASE */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Pill label="ASE" bg="#dbeafe" fg="#1e40af" />
                <p className="font-medium">Assign an Account Engineer</p>
              </div>
              <p className="text-muted-foreground">
                Deal ACV is $65K or above. The account warrants direct human coverage — open a TMR to assign an ASE.
              </p>
            </div>

            {/* Bluebird */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Pill label="Bluebird" bg="#dcfce7" fg="#166534" />
                <p className="font-medium">BOB self-service program</p>
                <a
                  href="https://docs.google.com/document/d/10q5Mjmgw4NmnU2kEu7nO6Zx7Z9v23uY5EESQNj4aRYY/edit?tab=t.0"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] underline decoration-1 underline-offset-2 hover:opacity-70"
                  style={{ color: "#166534" }}
                >
                  docs ↗
                </a>
              </div>
              <p className="text-muted-foreground mb-2">
                Sub-$65K deal. Enroll the account in the Bluebird Book of Business activation program. The app uses ACV as the primary signal, but Bluebird is a great fit when several of the following are also true:
              </p>
              <ul className="text-muted-foreground flex flex-col gap-0.5 list-disc list-inside">
                <li><strong className="text-foreground">ACV around $65K or less</strong> — use your discretion for accounts slightly above this; happy to discuss any time.</li>
                <li><strong className="text-foreground">Signed recently or stalled</strong> — closed within the past 90 days, or signed months ago and still haven't loaded any data.</li>
                <li><strong className="text-foreground">Small or non-technical team</strong> — 1–3 people trying to get started, not a large engineering org.</li>
                <li><strong className="text-foreground">Expressed interest in getting started</strong> — "what do I do first?" or "how do I get started?" are perfect indicators. These are the accounts Bluebird is built for.</li>
                <li><strong className="text-foreground">Less than 5% of contract capacity consumed</strong> — barely touched their contract and need a nudge to get going.</li>
              </ul>
            </div>

            {/* Webinar */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Pill label="Webinar" bg="#fef9c3" fg="#854d0e" />
                <p className="font-medium">Activation Webinar Series</p>
                <a
                  href="https://www.snowflake.com/en/webinars/?tags=region%2Famericas"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] underline decoration-1 underline-offset-2 hover:opacity-70"
                  style={{ color: "#854d0e" }}
                >
                  View the webinar series ↗
                </a>
              </div>
              <p className="text-muted-foreground text-[12px] leading-relaxed">
                A 6-topic simulive series for new customers and low-adoption accounts. A facilitator presents prepared content followed by live Q&amp;A. Topics repeat every 6 weeks — there is always a session coming up soon (Securing Your Snowflake Account, Warehouse Design &amp; Cost Control, Getting Data into Snowflake, etc.).
              </p>
            </div>

            {/* SI involved */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Pill label="SI involved" bg="#f3e8ff" fg="#6b21a8" />
                <p className="font-medium">Systems integrator or partner detected</p>
              </div>
              <p className="text-muted-foreground">
                A partner appears to be handling implementation on this account, so no ASE action is suggested. <strong>This is a signal, not a guarantee.</strong> It is detected from open use-case partner attachment or an approved Salesforce deal registration ("SPN: Deal Registrations" on the opportunity). Always verify in Salesforce before skipping outreach — the partner data is not always current.
              </p>
            </div>

            {/* Partner involved */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Pill label="Partner involved" bg="#ffedd5" fg="#9a3412" />
                <p className="font-medium">A partner is on any use case</p>
              </div>
              <p className="text-muted-foreground">
                At least one use case on the account (open or closed) lists a partner, so no play is suggested. Broader than "SI involved" — any single partner touch flags the account. <strong>Verify before skipping outreach.</strong>
              </p>
            </div>

            {/* PS involved */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Pill label="PS involved" bg="#e0f2fe" fg="#075985" />
                <p className="font-medium">Professional Services is engaged</p>
              </div>
              <p className="text-muted-foreground">
                Any use case on the account shows PS engagement (Advisory, Proposing, Implementation, or Support). Professional Services owns the activation motion, so no play is suggested.
              </p>
            </div>

            {/* Partner acct */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Pill label="Partner acct" bg="#fae8ff" fg="#86198f" />
                <p className="font-medium">The account is itself a partner</p>
              </div>
              <p className="text-muted-foreground">
                The account's Salesforce type is Partner, or it carries a DCP or DCS partner flag. Partner accounts are excluded from activation plays.
              </p>
            </div>

            {/* OD flip */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Pill label="OD flip" bg="#fce7f3" fg="#9d174d" />
                <p className="font-medium">On Demand and Capacity both closed won</p>
              </div>
              <p className="text-muted-foreground">
                The account has both a Closed Won On Demand opportunity and a Closed Won Capacity opportunity — it is already consuming under a different motion, so no activation play is suggested.
              </p>
            </div>
          </div>
        </Section>

        {/* Coverage signals */}
        <Section title="What counts as covered">
          <p className="text-sm text-muted-foreground leading-relaxed">
            An account is marked <strong>Covered</strong> if <em>any one</em> of the following
            signals exists in Salesforce or Elementum:
          </p>
          <ul className="text-sm text-muted-foreground flex flex-col gap-0.5 list-disc list-inside">
            <li>A TMR (Team Member Request) assignment in Elementum</li>
            <li>An activation tag on the account</li>
            <li>An ASE assigned to the Salesforce use-case team</li>
            <li>An ASE role on the Salesforce account team</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Only one signal is needed. The coverage date shown is the earliest date any signal
            appeared — before or on close date means the account was covered at deal close.
          </p>
        </Section>

        {/* Data freshness */}
        <Section title="Data freshness">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Data is cached on the server for 10 minutes. To force a refresh, do a hard reload
            (<kbd className="rounded border px-1.5 py-0.5 text-[11px] font-mono" style={{ borderColor: "var(--border)" }}>⌘ Shift R</kbd>).
            Coverage signals and consumption figures update as Salesforce and A360 sync — typically within a few hours of a real change.
          </p>
        </Section>

      </div>
    </main>
  );
}
