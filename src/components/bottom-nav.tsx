"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListChecks, Mic, Settings, Tag } from "lucide-react";

const tabs = [
  { href: "/dashboard", label: "Home", icon: Mic, exact: true },
  { href: "/dashboard/estimates", label: "Estimates", icon: ListChecks, exact: false },
  { href: "/dashboard/prices", label: "Prices", icon: Tag, exact: false },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, exact: false },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex"
      style={{
        height: "calc(64px + env(safe-area-inset-bottom))",
        paddingBottom: "env(safe-area-inset-bottom)",
        background: "#0E1612",
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {tabs.map(({ href, label, icon: Icon, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`relative flex flex-1 flex-col items-center justify-center gap-1 transition-all duration-200 ${
              isActive ? "text-[#4DB87B]" : "text-[#4A6857] hover:text-[#8AA895]"
            }`}
          >
            {isActive && (
              <span className="absolute top-0 inset-x-3 h-[2px] rounded-b-full bg-[#4DB87B] opacity-80" />
            )}
            <Icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? "scale-110" : ""}`} />
            <span className={`text-[10px] font-semibold tracking-wide uppercase transition-all duration-200 ${isActive ? "font-bold" : ""}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
