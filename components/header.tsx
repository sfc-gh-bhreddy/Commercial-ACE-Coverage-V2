import Image from "next/image";
import Link from "next/link";
import { NavLinks } from "@/components/nav-links";
import { ThemeToggle } from "@/components/theme-toggle";
import { APP_TITLE, LOGO_PATH } from "@/lib/constants";

export function Header() {
  return (
    <header
      className="sticky top-0 z-50 flex h-14 items-center gap-4 px-4"
      style={{
        backgroundColor: "var(--brand-nav-bg)",
        color: "var(--brand-nav-fg)",
      }}
    >
      <Link href="/" className="flex items-center gap-2">
        <Image src={LOGO_PATH} alt="" width={26} height={26} priority />
        <span className="text-sm font-semibold tracking-tight">
          {APP_TITLE}
        </span>
      </Link>
      <div className="hidden md:block">
        <NavLinks />
      </div>
      <ThemeToggle />
    </header>
  );
}
