import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Scale, TrendingUp, TrendingDown, Building2, Landmark,
  Clock, Target, Wallet, PiggyBank, Tag, Upload, ArrowLeftRight, X, Menu
} from "lucide-react";

const NAV_ITEMS = [
  { path: "/",            icon: Scale,       label: "Баланс",     color: "text-yellow-400" },
  { path: "/incomes",     icon: TrendingUp,  label: "Доходы",     color: "text-emerald-400" },
  { path: "/expenses",    icon: TrendingDown,label: "Расходы",    color: "text-red-400" },
  { path: "/assets",      icon: Building2,   label: "Активы",     color: "text-sky-400" },
  { path: "/liabilities", icon: Landmark,    label: "Пассивы",    color: "text-orange-400" },
  { path: "/time",        icon: Clock,       label: "Время",      color: "text-violet-400" },
  { path: "/goals",       icon: Target,      label: "Цели",       color: "text-yellow-400" },
  { path: "/accounts",    icon: Wallet,      label: "Счета",      color: "text-cyan-400" },
  { path: "/deposits",    icon: PiggyBank,   label: "Вклады",     color: "text-pink-400" },
  { path: "/categories",  icon: Tag,         label: "Категории",  color: "text-lime-400" },
  { path: "/import",      icon: Upload,      label: "Импорт",     color: "text-amber-400" },
  { path: "/transactions", icon: ArrowLeftRight, label: "История", color: "text-blue-400" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="min-h-screen bg-background">
      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/3 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl" />
      </div>

      {/* ── Desktop & Tablet layout ── */}
      <div className="hidden sm:flex min-h-screen items-center justify-center p-4">
        <div className="relative flex w-full max-w-md lg:max-w-2xl">
          {/* Main content panel */}
          <div
            className="flex-1 bg-card rounded-2xl border border-border/50 min-h-[600px] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px hsl(222 15% 20%)" }}
          >
            <div className="flex-1 overflow-y-auto p-6">
              {children}
            </div>
          </div>

          {/* Right side navigation — scrollable */}
          <div className="ml-2 flex flex-col gap-1 py-1 max-h-[90vh] overflow-y-auto scrollbar-hide">
            {NAV_ITEMS.map(({ path, icon: Icon, label, color }) => {
              const isActive = location === path || (path !== "/" && location.startsWith(path));
              return (
                <Link key={path} href={path}>
                  <button
                    data-testid={`nav-${label}`}
                    className={cn(
                      "w-11 h-11 rounded-xl border transition-all duration-200 flex items-center justify-center group relative",
                      isActive
                        ? "bg-card border-yellow-500/40 shadow-lg"
                        : "bg-card/60 border-border/40 hover:bg-card hover:border-border"
                    )}
                    style={isActive ? { boxShadow: "0 0 16px hsl(43 90% 56% / 0.2)" } : {}}
                    title={label}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-yellow-400 rounded-full" />
                    )}
                    <Icon
                      className={cn("w-4 h-4 transition-colors", isActive ? color : "text-muted-foreground group-hover:text-foreground/70")}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </button>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Mobile layout ── */}
      <div className="flex sm:hidden flex-col min-h-screen">
        {/* Content area */}
        <div className="flex-1 overflow-y-auto pb-24">
          <div className="p-4">
            {children}
          </div>
        </div>

        {/* Bottom navigation bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 border-t border-border/50 backdrop-blur-md"
          style={{ boxShadow: "0 -4px 20px rgba(0,0,0,0.4)", paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="flex justify-around items-center px-1 py-1 h-14">
            {NAV_ITEMS.filter(it => ["/", "/transactions", "/accounts", "/goals"].includes(it.path)).map(({ path, icon: Icon, label, color }) => {
              const isActive = location === path || (path !== "/" && location.startsWith(path));
              return (
                <Link key={path} href={path} className="flex-1 h-full">
                  <button
                    data-testid={`mobile-nav-${label}`}
                    className={cn(
                      "w-full h-full flex flex-col items-center justify-center gap-1 rounded-xl transition-all",
                      isActive
                        ? "text-yellow-400"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}
                  >
                    <Icon className={cn("w-5 h-5", isActive ? color : "text-opacity-80")} strokeWidth={isActive ? 2.5 : 2} />
                    <span className="text-[10px] font-medium leading-none">{label}</span>
                  </button>
                </Link>
              );
            })}
            
            {/* Menu Button */}
            <div className="flex-1 h-full">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className={cn(
                  "w-full h-full flex flex-col items-center justify-center gap-1 rounded-xl transition-all text-muted-foreground hover:text-foreground hover:bg-muted/40",
                  mobileMenuOpen && "text-yellow-400"
                )}
              >
                <Menu className="w-5 h-5 text-current" strokeWidth={mobileMenuOpen ? 2.5 : 2} />
                <span className="text-[10px] font-medium leading-none">Меню</span>
              </button>
            </div>
          </div>
        </nav>

        {/* Menu Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col animate-in slide-in-from-bottom-5 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border/50 pt-[env(safe-area-inset-top,1rem)]">
              <h2 className="text-xl font-semibold pl-2">Меню</h2>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 -mr-2 text-muted-foreground hover:text-foreground bg-muted/40 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 pb-24">
              <div className="grid grid-cols-2 gap-3">
                {NAV_ITEMS.filter(it => !["/", "/transactions", "/accounts", "/goals"].includes(it.path)).map(({ path, icon: Icon, label, color }) => (
                  <Link key={path} href={path}>
                    <button className="w-full h-24 flex flex-col items-center justify-center gap-3 rounded-2xl bg-card border border-border/50 shadow-sm active:scale-95 transition-all text-center">
                      <div className={cn("p-2.5 rounded-full bg-background border border-border/50 shadow-inner", color)}>
                        <Icon className="w-6 h-6" strokeWidth={2} />
                      </div>
                      <span className="font-medium text-[13px] text-foreground/90">{label}</span>
                    </button>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
