import { NextResponse } from "next/server";
import { gzipSync } from "node:zlib";
import { getDeals } from "@/lib/data";
import { getCached } from "@/lib/cache";
import { COVERAGE_TTL_MS } from "@/lib/constants";
import type { Deal } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The coverage payload is ~900KB of JSON. Gzip collapses it to ~10% over the
// wire, which is the single biggest win for remote viewers. We compress once
// per dataset and memoize on the array reference (getCached hands back the same
// reference until a background refresh replaces it), so warm serves stay ~8ms.
let gzCache: { key: Deal[]; body: Buffer } | null = null;

function gzipFor(rows: Deal[]): Buffer {
  if (!gzCache || gzCache.key !== rows) {
    gzCache = { key: rows, body: gzipSync(JSON.stringify({ rows })) };
  }
  return gzCache.body;
}

export async function GET(req: Request) {
  try {
    const rows = await getCached({
      name: "coverage",
      ttlMs: COVERAGE_TTL_MS,
      loader: getDeals,
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/json; charset=utf-8",
      // Let the browser reuse the response briefly and serve stale while it
      // revalidates, so reloads/back-forward are instant.
      "Cache-Control": "private, max-age=600, stale-while-revalidate=0",
      Vary: "Accept-Encoding",
    };

    // Serve gzip when the client supports it (all browsers do); fall back to
    // plain JSON for the rare client that doesn't.
    if ((req.headers.get("accept-encoding") ?? "").includes("gzip")) {
      const body = gzipFor(rows);
      return new NextResponse(body as unknown as BodyInit, {
        headers: {
          ...headers,
          "Content-Encoding": "gzip",
          "Content-Length": String(body.length),
        },
      });
    }

    return NextResponse.json({ rows }, { headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to load coverage data: ${message}` },
      { status: 500 },
    );
  }
}
