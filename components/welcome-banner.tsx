"use client";

import * as React from "react";
import { MapPin } from "lucide-react";
import type { UserContext } from "@/lib/types";

const CTX_KEY = "ase-user-context-v1";

function readCachedContext(): UserContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CTX_KEY);
    return raw ? (JSON.parse(raw) as UserContext) : null;
  } catch {
    return null;
  }
}

export function WelcomeBanner() {
  const [ctx, setCtx] = React.useState<UserContext | null>(null);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    // Post-hydration cache read so initial render matches server HTML.
    const cached = readCachedContext();
    if (cached) setCtx(cached);

    fetch("/api/context")
      .then((r) => r.json())
      .then((d) => {
        if (active && d.context) {
          setCtx(d.context as UserContext);
          try {
            window.sessionStorage.setItem(CTX_KEY, JSON.stringify(d.context));
          } catch {
            // non-fatal
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!ctx) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <span className="text-sm text-muted-foreground animate-pulse">
          {loaded ? "Profile unavailable" : "Loading your profile\u2026"}
        </span>
      </div>
    );
  }

  const name = ctx.displayName ?? ctx.login;

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-lg font-semibold tracking-tight">
          Welcome, {name}
        </span>
        {ctx.title ? (
          <span className="text-sm text-muted-foreground">· {ctx.title}</span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3.5" />
          {ctx.matched ? "Your regions" : "Coverage scope"}
        </span>
        {ctx.regions.map((r) => (
          <span
            key={r}
            className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: "color-mix(in srgb, var(--brand-primary) 12%, transparent)",
              color: "var(--brand-primary)",
            }}
          >
            {r}
          </span>
        ))}
        {!ctx.matched ? (
          <span className="text-xs text-muted-foreground">
            (not mapped in the sales hierarchy — showing full app scope)
          </span>
        ) : null}
      </div>
    </div>
  );
}
