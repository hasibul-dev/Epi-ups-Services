"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Briefcase, ChevronDown, Landmark, Menu, PanelLeftClose, PanelLeftOpen, Share2, ShieldCheck, Wrench, X } from "lucide-react";
import { DEPTS, DEPT_ORDER, type DeptCode } from "@/lib/constants";
import { NAV, type NavGroup } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useApp } from "./AppContext";
import { Icon } from "./icons";
import { GlobalSearch, Notifications, ThemeToggle, UserMenu } from "./TopbarWidgets";

const TAB_ICON: Record<string, typeof Briefcase> = { admin: ShieldCheck, sales: Briefcase, service: Wrench, erp: Landmark, marketing: Share2 };

interface SideGroup { label?: string; items: { label: string; href: string; icon: string }[] }

function buildSidebar(dept: DeptCode, allowed: DeptCode[]): SideGroup[] {
  const toGroups = (code: DeptCode, groups: NavGroup[], prefixLabel?: string): SideGroup[] =>
    groups.map((g, i) => ({
      label: g.label ?? (i === 0 ? prefixLabel : undefined),
      items: g.items.map((it) => ({ label: it.label, icon: it.icon, href: it.slug ? `/${code}/${it.slug}` : `/${code}` })),
    }));
  if (dept === "marketing" || dept === "it") {
    const out: SideGroup[] = [];
    if (allowed.includes("marketing")) out.push(...toGroups("marketing", NAV.marketing.groups, "Digital Marketing"));
    if (allowed.includes("it")) out.push(...toGroups("it", NAV.it.groups, "IT Support"));
    return out;
  }
  return toGroups(dept, NAV[dept].groups, NAV[dept].title);
}

export function AppShell({ allowed, children }: { allowed: DeptCode[]; children: ReactNode }) {
  const { settings } = useApp();
  const pathname = usePathname();
  const first = pathname.split("/")[1] as DeptCode;
  const dept: DeptCode = DEPT_ORDER.includes(first) ? first : allowed[0] ?? "admin";
  const accent = DEPTS[dept].color;
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [closed, setClosed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setCollapsed(localStorage.getItem("epi-sidebar") === "1");
    // organisation default theme applies until the user picks their own
    if (!localStorage.getItem("epi-theme") && settings["theme.default"] === "light") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  }, [settings]);
  useEffect(() => setMobile(false), [pathname]);

  const groups = useMemo(() => buildSidebar(dept, allowed), [dept, allowed]);
  const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));
  const activeHref = hrefs.filter((h) => pathname === h || (h !== `/${dept}` && pathname.startsWith(h + "/"))).sort((a, b) => b.length - a.length)[0];

  const tabs = DEPT_ORDER.filter((d) => allowed.includes(d) && d !== "it").map((d) => {
    if (d === "marketing") return { code: "marketing" as DeptCode, label: "Marketing & IT", href: "/marketing", active: dept === "marketing" || dept === "it", color: DEPTS.marketing.color };
    return { code: d, label: DEPTS[d].short, href: `/${d}`, active: dept === d, color: DEPTS[d].color };
  });
  if (allowed.includes("it") && !allowed.includes("marketing")) tabs.push({ code: "it", label: "Marketing & IT", href: "/it", active: dept === "it", color: DEPTS.it.color });
  const logo = settings["company.logo"] || "/logo.svg";
  const name = (settings["company.name"] || "EPI UPS (Bangladesh) Limited").replace(/\s*\(Bangladesh\)\s*/i, " ");

  const sidebar = (isMobile: boolean) => (
    <nav className="flex h-full flex-col" aria-label="Sidebar">
      <div className={cn("flex items-center justify-between px-4 py-4", collapsed && !isMobile && "justify-center px-2")}>
        {(!collapsed || isMobile) && <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{dept === "marketing" || dept === "it" ? "Digital Marketing & IT Support" : NAV[dept].title}</p>}
        {isMobile && <button onClick={() => setMobile(false)} aria-label="Close menu" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-fg/10"><X className="h-5 w-5" /></button>}
      </div>
      <div className="scroll-thin flex-1 space-y-3 overflow-y-auto px-3 pb-4">
        {groups.map((g, gi) => {
          const key = `${dept}-${g.label ?? gi}`;
          const isClosed = !!g.label && closed[key] && !(collapsed && !isMobile);
          const hasActive = g.items.some((i) => i.href === activeHref);
          const showHeader = g.label && gi > 0 && (!collapsed || isMobile);
          return (
            <div key={key}>
              {showHeader && (
                <button onClick={() => setClosed((c) => ({ ...c, [key]: !c[key] }))} className="mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted hover:text-fg">
                  {g.label} <ChevronDown className={cn("h-4 w-4 transition", isClosed && "-rotate-90")} />
                </button>
              )}
              {gi > 0 && collapsed && !isMobile && <div className="mx-3 mb-2 border-t border-line" />}
              {(!isClosed || hasActive) && (
                <ul className="space-y-1">
                  {g.items.map((it) => {
                    const active = it.href === activeHref;
                    return (
                      <li key={it.href}>
                        <Link href={it.href} title={collapsed && !isMobile ? it.label : undefined}
                          className={cn("flex h-11 items-center gap-3 rounded-xl border px-3 text-sm font-medium transition", active ? "border-accent/40 bg-accent/15 text-accent shadow-sm" : "border-transparent text-fg/80 hover:bg-fg/8 hover:text-fg", collapsed && !isMobile && "justify-center px-0")}>
                          <Icon name={it.icon} className="h-5 w-5 shrink-0" />
                          {(!collapsed || isMobile) && <span className="truncate">{it.label}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      {!isMobile && (
        <button onClick={() => { setCollapsed(!collapsed); localStorage.setItem("epi-sidebar", collapsed ? "0" : "1"); }} className="m-3 flex h-10 items-center justify-center gap-2 rounded-xl border border-line text-sm text-muted hover:bg-fg/8 hover:text-fg" aria-label="Collapse sidebar">
          {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <><PanelLeftClose className="h-5 w-5" /> Collapse</>}
        </button>
      )}
    </nav>
  );

  return (
    <div id="app-root" className="app-bg min-h-screen" style={{ "--accent": accent } as CSSProperties}>
      <header className="glass sticky top-0 z-40 flex h-16 items-center gap-3 border-x-0 border-t-0 px-3 sm:px-4">
        <button className="grid h-10 w-10 place-items-center rounded-xl border border-line lg:hidden" onClick={() => setMobile(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="Logo" className="h-10 w-auto rounded bg-white p-0.5" />
          <span className="hidden leading-tight sm:block"><span className="block text-sm font-extrabold">EPI UPS</span><span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">{name.replace(/^EPI UPS\s*/i, "") || "Bangladesh Limited"}</span></span>
        </Link>
        <div className="scroll-thin ml-2 hidden items-center gap-1.5 overflow-x-auto rounded-2xl border border-line bg-fg/[0.03] p-1.5 lg:flex">
          {tabs.map((t) => {
            const I = TAB_ICON[t.code] ?? Share2;
            return (
              <Link key={t.label} href={t.href} className={cn("flex h-9 items-center gap-2 whitespace-nowrap rounded-xl border px-3.5 text-sm font-semibold transition", t.active ? "" : "border-transparent text-fg/75 hover:bg-fg/8 hover:text-fg")}
                style={t.active ? { color: t.color, borderColor: `${t.color}88`, background: `${t.color}22` } : undefined}>
                <I className="h-4 w-4" /> {t.label}
              </Link>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <GlobalSearch />
          <Notifications />
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <div className="flex">
        <aside className={cn("glass sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 border-y-0 border-l-0 transition-[width] duration-200 lg:block", collapsed ? "w-[76px]" : "w-72")}>{sidebar(false)}</aside>
        {mobile && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setMobile(false)} />
            <aside className="anim-slide absolute left-0 top-0 h-full w-80 max-w-[85vw] border-r border-line bg-solid">
              <div className="flex gap-1.5 overflow-x-auto border-b border-line p-3 scroll-thin">
                {tabs.map((t) => <Link key={t.label} href={t.href} className="whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold" style={t.active ? { color: t.color, borderColor: `${t.color}88`, background: `${t.color}22` } : { borderColor: "var(--line)" }}>{t.label}</Link>)}
              </div>
              {sidebar(true)}
            </aside>
          </div>
        )}
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">
          <div className="mx-auto max-w-[1500px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
