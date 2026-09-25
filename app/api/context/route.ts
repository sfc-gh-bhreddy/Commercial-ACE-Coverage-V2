import { NextResponse } from "next/server";
import { getUserContext } from "@/lib/data";
import { getCached } from "@/lib/cache";
import { CONTEXT_TTL_MS } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const context = await getCached({
      name: "context",
      ttlMs: CONTEXT_TTL_MS,
      loader: getUserContext,
    });
    return NextResponse.json(
      { context },
      {
        headers: {
          "Cache-Control": "private, max-age=300, stale-while-revalidate=3600",
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to load user context: ${message}` },
      { status: 500 },
    );
  }
}
