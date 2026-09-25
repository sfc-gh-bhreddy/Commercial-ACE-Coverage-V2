export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const [{ getDeals, getUserContext, pingConnection }, { primeCache }, constants] =
    await Promise.all([
      import("@/lib/data"),
      import("@/lib/cache"),
      import("@/lib/constants"),
    ]);

  const { COVERAGE_TTL_MS, CONTEXT_TTL_MS, KEEPALIVE_MS } = constants;

  primeCache({ name: "context", ttlMs: CONTEXT_TTL_MS, loader: getUserContext });
  primeCache({ name: "coverage", ttlMs: COVERAGE_TTL_MS, loader: getDeals });

  setInterval(() => void pingConnection(), KEEPALIVE_MS).unref?.();
}
