"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef, useLayoutEffect } from "react";
import {
  CalendarDays,
  GraduationCap,
  ListChecks,
  Moon,
  Settings,
  Sun,
  Table2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useMounted } from "@/lib/use-mounted";

const NAV = [
  { href: "/", label: "วันนี้", icon: CalendarDays, title: "วันนี้" },
  { href: "/tasks", label: "งาน", icon: ListChecks, title: "งาน" },
  { href: "/timetable", label: "ตาราง", icon: Table2, title: "ตารางเรียน" },
  { href: "/settings", label: "ตั้งค่า", icon: Settings, title: "ตั้งค่า" },
] as const;

function useActive() {
  const pathname = usePathname();
  // /t/[id] belongs to the tasks section even though it is not a nav root.
  if (pathname.startsWith("/t/")) return { ...NAV[1], title: "รายละเอียดงาน" };
  return (
    NAV.find((item) => item.href !== "/" && pathname.startsWith(item.href)) ??
    NAV[0]
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
      className="flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-fill hover:text-foreground"
    >
      {isDark ? (
        <Sun className="size-[18px]" strokeWidth={1.9} aria-hidden="true" />
      ) : (
        <Moon className="size-[18px]" strokeWidth={1.9} aria-hidden="true" />
      )}
    </button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const active = useActive();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const navInnerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 28);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  useLayoutEffect(() => {
    const inner = navInnerRef.current;
    if (!inner) return;
    const activeEl = inner.querySelector<HTMLElement>(
      '[aria-current="page"]',
    );
    if (!activeEl) return;
    setIndicator({
      left: activeEl.offsetLeft,
      width: activeEl.offsetWidth,
      ready: true,
    });
  }, [pathname, active.href]);

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-[52px] items-center gap-2.5 px-5">
          <span
            aria-hidden="true"
            className="flex size-7 items-center justify-center rounded-[9px] bg-primary text-primary-foreground shadow-[0_2px_8px_-2px_rgba(0,113,227,0.6)]"
          >
            <GraduationCap className="size-4" strokeWidth={2} />
          </span>
          <span className="text-[15px] font-semibold">งานของฉัน</span>
        </div>

        <nav aria-label="เมนูหลัก" className="flex flex-col gap-0.5 px-3 pt-1">
          {NAV.map((item) => {
            const isActive = item.href === active.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-[10px] px-3 text-[14px] transition-colors",
                  isActive
                    ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                    : "font-medium text-sidebar-foreground/75 hover:bg-fill hover:text-sidebar-foreground",
                )}
              >
                <item.icon
                  className={cn(
                    "size-[18px]",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                  strokeWidth={isActive ? 2 : 1.8}
                  aria-hidden="true"
                />
                {item.title}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-5 pb-5">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            โรงเรียน · เขตเวลา Asia/Bangkok
          </p>
        </div>
      </aside>

      {/* Top bar: blends into the page until content scrolls under it. */}
      <header
        className={cn(
          "sticky top-0 z-30 flex h-11 items-center justify-between bg-background px-4 transition-[border-color] duration-200 lg:ml-[248px] lg:h-[52px] lg:px-8",
          scrolled ? "border-b border-border/70" : "border-b border-transparent",
        )}
      >
        <h1
          className={cn(
            "text-[15px] font-semibold transition-opacity duration-200",
            scrolled ? "opacity-100" : "opacity-0",
          )}
        >
          {active.title}
        </h1>
        <ThemeToggle />
      </header>

      <main className="px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:ml-[248px] lg:px-8 lg:pb-16">
        <div key={pathname} className="page-enter">
          {children}
        </div>
      </main>

      {/* Floating iOS tab bar */}
      <nav
        aria-label="เมนูหลัก"
        className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[calc(6.5rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-background via-background/85 to-transparent"
        />
        <div ref={navInnerRef} className="glass relative mx-auto flex h-[60px] w-full max-w-[420px] items-center gap-0.5 rounded-[24px] p-1.5">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1.5 bottom-1.5 rounded-[18px] bg-secondary transition-all duration-300 ease-out"
            style={{
              left: indicator.left,
              width: indicator.width,
              opacity: indicator.ready ? 1 : 0,
            }}
          />
          {NAV.map((item) => {
            const isActive = item.href === active.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative z-10 flex h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[18px] text-[10px] leading-none transition-colors",
                  isActive
                    ? "font-semibold text-primary-text"
                    : "font-medium text-muted-foreground hover:text-foreground",
                )}
              >
                <item.icon
                  className="size-[20px]"
                  strokeWidth={isActive ? 2.1 : 1.8}
                  aria-hidden="true"
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
