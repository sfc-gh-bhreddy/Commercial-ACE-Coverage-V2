"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm transition-colors",
            )}
            style={
              active
                ? {
                    backgroundColor: "rgba(255,255,255,0.16)",
                    color: "#ffffff",
                  }
                : { color: "rgba(255,255,255,0.78)" }
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
