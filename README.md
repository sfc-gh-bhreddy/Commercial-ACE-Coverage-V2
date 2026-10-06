# Commercial ASC Coverage V2

Internal tool for routing uncovered FY27 Cap1 deals to the right ASC motion — ASE (1:1), Hybrid (ASE + Bluebird + Webinar), or Bluebird + Webinar. Detects SI/partner/PS involvement and suppresses recommendations accordingly.

---

## Local development

### 1. Prerequisites

- [Node.js 20+](https://nodejs.org/)
- A Snowflake connection configured at `~/.snowflake/connections.toml` (see below)

### 2. Clone the repo

```bash
git clone https://github.com/sfc-gh-bhreddy/Commercial-ACE-Coverage-V2.git
cd Commercial-ACE-Coverage-V2
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

### Suggested play logic (3-tier ACV routing)

| ACV range | Suggested play | Pill |
|-----------|---------------|------|
| Above $65K | ASE 1:1 | ASE |
| Above $25K through $65K | ASE + Bluebird + Webinar | Hybrid |
| Up to $25K | Bluebird + Webinar | Bluebird / Webinar |

### Suppression signals (precedence order)

| Signal | Pill | Meaning |
|--------|------|---------|
| SI involved | SI involved | All open use cases have a partner, or approved deal registration exists |
| Partner involved | Partner involved | At least one use case names a partner |
| PS involved | PS involved | Professional Services engagement on the account |
| Partner acct | Partner acct | Account type is Partner / DCP / DCS |
| OD flip | OD flip | Account has both On Demand and Capacity closed-won opps |

When a suppression signal fires, the deal gets no ASE/Bluebird/Webinar recommendation. Signals are exclusive — the highest-precedence match wins.

---

## SPCS deployment

The app is pre-configured for Snowpark Container Services. The Snowflake connection layer (`lib/snowflake.ts`) auto-detects the SPCS token at `/snowflake/session/token` — no code changes needed.

### 1. Build the Docker image

```bash
cd ~/Desktop/ASE-Commercial-Coverage-V2
docker build --platform linux/amd64 -t asc-coverage-v2:latest .
```

### 2. Create Snowflake objects and push

Open `deploy.sql` and run Steps 1-2 to create the database, schema, and image repository. Copy the `repository_url` from the output, then:

```bash
docker login <repository_url>
docker tag asc-coverage-v2:latest <repository_url>/asc-coverage-v2:latest
docker push <repository_url>/asc-coverage-v2:latest
```

### 3. Create the service

Run Steps 3-5 in `deploy.sql` to create the compute pool and service. Step 7 gives you the public URL.

### 4. Verify

```sql
SELECT SYSTEM$GET_SERVICE_STATUS('ASC_COVERAGE_APP.V2.COVERAGE_SERVICE');
SHOW ENDPOINTS IN SERVICE ASC_COVERAGE_APP.V2.COVERAGE_SERVICE;
```

See `deploy.sql` for the full script including teardown commands.

---

## Troubleshooting

**Browser opens but shows "Loading..." for a long time**
The Snowflake query is running. First load is slow (~30-60s). Subsequent loads are instant from cache.

**Authentication popup doesn't appear (local dev)**
Make sure `authenticator = "externalbrowser"` is set in your connections.toml.

**"Connection failed" error**
Check that your `~/.snowflake/connections.toml` has the correct account identifier and your role has access to `SALES.RAVEN` and `SALES.SE_REPORTING`.

**Port already in use**
```bash
PORT=3001 npm run dev
```
