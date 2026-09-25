"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListTodo, Building2, UserCog, Briefcase, BarChart3, Info } from "lucide-react";
import { APP_TITLE } from "@/lib/constants";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_SECTIONS = [
  {
    label: "Coverage",
    items: [
      { href: "/", label: "Overview", icon: LayoutDashboard },
      { href: "/uncovered", label: "ASE Coverage", icon: ListTodo },
    ],
  },
  {
    label: "Rollups",
    items: [
      { href: "/dm", label: "DM Rollup", icon: Building2 },
      { href: "/sem", label: "SEM Rollup", icon: UserCog },
      { href: "/ae", label: "AE Rollup", icon: Briefcase },
      { href: "/se", label: "SE Rollup", icon: BarChart3 },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 z-40 flex h-screen w-56 flex-col border-r"
      style={{ background: "var(--sidebar-bg)", borderColor: "var(--border)" }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 px-4 h-14 shrink-0">
        <img src="/snowflake-logo.svg" alt="" width={24} height={24} />
        <span className="text-[13px] font-semibold tracking-tight leading-tight">
          {APP_TITLE}
        </span>
      </Link>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-5">
            <div className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {section.label}
            </div>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors"
                    style={
                      active
                        ? { background: "var(--sidebar-active)", color: "var(--foreground)" }
                        : { color: "var(--muted-foreground)" }
                    }
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.background = "var(--sidebar-hover)";
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <Icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Guide link — below nav with space */}
        <div className="mt-4">
          <Link
            href="/guide"
            className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors"
            style={
              pathname === "/guide"
                ? { background: "var(--sidebar-active)", color: "var(--foreground)" }
                : { color: "var(--muted-foreground)" }
            }
            onMouseEnter={(e) => {
              if (pathname !== "/guide") e.currentTarget.style.background = "var(--sidebar-hover)";
            }}
            onMouseLeave={(e) => {
              if (pathname !== "/guide") e.currentTarget.style.background = "transparent";
            }}
          >
            <Info className="size-4 shrink-0" />
            Guide & legend
          </Link>
        </div>
      </nav>

      {/* Footer — theme toggle */}
      <div
        className="shrink-0 border-t px-3 py-3 flex items-center justify-end"
        style={{ borderColor: "var(--border)" }}
      >
        <ThemeToggle />
      </div>
    </aside>
  );
}
