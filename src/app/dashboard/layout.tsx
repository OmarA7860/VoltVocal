import Image from "next/image";
import { BottomNav } from "@/components/bottom-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      {/* Mobile mini header — hidden on desktop */}
      <header
        className="md:hidden sticky top-0 z-30 flex h-[52px] items-center px-4 bg-[#090D0B]"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <Image
          src="/logo-mark.png"
          alt="VoltVocal"
          width={36}
          height={36}
          style={{ objectFit: "contain" }}
        />
        <span className="flex-1 text-center text-[11px] font-bold tracking-[0.3em] text-[#E0EDE5] uppercase">
          VoltVocal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#4DB87B]" />
          <span className="text-[10px] font-bold tracking-wider text-[#4DB87B] uppercase font-mono">
            Online
          </span>
        </span>
      </header>

      {/* Page content — add bottom padding on mobile for bottom nav */}
      <div className="flex flex-1 flex-col pb-[80px] md:pb-0">
        {children}
      </div>

      <BottomNav />
    </div>
  );
}
