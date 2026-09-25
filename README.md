# Commercial ASE Coverage

Internal tool for routing uncovered FY27 Cap1 deals to the right ACE motion — Assign an ASE, Bluebird, or Webinar. Detects SI/partner involvement and suppresses recommendations accordingly.

---

## Setup (5 minutes)

### 1. Prerequisites

- [Node.js 20+](https://nodejs.org/)
- A Snowflake connection configured at `~/.snowflake/connections.toml` (see below)

### 2. Clone the repo

```bash
git clone https://github.com/sfc-gh-bharreddy/Commercial-ACE-Coverage-Final.git
cd Commercial-ACE-Coverage-Final
```

### 3. Set up your Snowflake connection

Create `~/.snowflake/connections.toml` if it doesn't exist:

```toml
[default]
account   = "sfcogsops-snowhouse_aws_us_west_2"
user      = "YOUR_LDAP_USERNAME"
authenticator = "externalbrowser"
role      = "SALES_ENGINEER"
warehouse = "SNOWADHOC"
```

Replace `YOUR_LDAP_USERNAME` with your Snowflake username (same as your Snowflake login email prefix).

> The app queries Snowflake **as you**, so it only shows data your role can see. No shared credentials are used.

### 4. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **First load takes 30–60 seconds** while the app queries Snowflake live. After that, data is cached and pages load instantly. Hard refresh (`Cmd+Shift+R`) to force a fresh pull.

---

## What it shows

| Page | Description |
|------|-------------|
| Overview | FY27 Cap1 coverage summary across all commercial districts |
| ASE Coverage | Uncovered accounts with suggested play (ASE / Bluebird / Webinar) |
| DM / SEM / AE / SE Rollup | Coverage breakdown by manager hierarchy |
| Guide & Legend | Explains all signals, pills, and what SI involved means |

### Suggested play logic

- **ASE** — deal ACV ≥ $50K → open a TMR to assign an Account Engineer
- **Bluebird** — sub-$50K → enroll in the BOB self-service activation program
- **Webinar** — relevant topic detected from opportunity signals
- **SI involved** — partner/SI detected on all open use cases OR an approved Salesforce deal registration is attached; ASE recommendation suppressed

> Suggestions are starting points. If you see a clear need for an ASE, assign one regardless of what the app shows.

### SI involved detection

Two signals are combined:
1. All open (not deployed, not lost) use cases on the account have a partner attached (`IS_PARTNER_ATTACHED`)
2. The Cap1 opportunity has an approved deal registration in Salesforce ("SPN: Deal Registrations")

This is a heuristic — always verify in Salesforce before skipping outreach.

---

## Troubleshooting

**Browser opens but shows "Loading…" for a long time**
The Snowflake query is running. First load is slow (~30–60s). Subsequent loads are instant from cache.

**Authentication popup doesn't appear**
Make sure `authenticator = "externalbrowser"` is set in your connections.toml. A browser window should open for SSO login on first run.

**"Connection failed" error**
Check that your `~/.snowflake/connections.toml` has the correct account identifier and your role has access to `SALES.RAVEN` and `SALES.SE_REPORTING`.

**Port already in use**
```bash
PORT=3001 npm run dev
```
