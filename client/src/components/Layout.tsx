import { Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import PerplexityAttribution from "./PerplexityAttribution";
import {
  LayoutDashboard, TrendingDown, TrendingUp, Building2,
  CreditCard, Clock, Target, Wallet, PiggyBank, Tags,
  Upload, List,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/", label: "Дашборд", icon: LayoutDashboard },
  { path: "/incomes", label: "Доходы", icon: TrendingDown },
  { path: "/expenses", label: "Расходы", icon: TrendingUp },
  { path: "/assets", label: "Активы", icon: Building2 },
  { path: "/liabilities", label: "Пассивы", icon: CreditCard },
  { path: "/time", label: "Время", icon: Clock },
  { path: "/goals", label: "Цели", icon: Target },
  { path: "/accounts", label: "Счета", icon: Wallet },
  { path: "/deposits", label: "Вклады", icon: PiggyBank },
  { path: "/categories", label: "Категории", icon: Tags },
  { path: "/import", label: "Импорт", icon: Upload },
  { path: "/transactions", label: "Транзакции", icon: List },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useHashLocation();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <nav className="w-52 flex-shrink-0 flex flex-col border-r border-border/40 bg-card/50">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-border/40">
          <div className="text-base font-bold text-yellow-400 tracking-tight">TimeFlow</div>
          <div className="text-xs text-muted-foreground/60">Finance</div>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-2 scrollbar-hide">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
            const isActive = location === path;
            return (
              <Link key={path} href={path}>
                <a
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150 cursor-pointer",
                    isActive
                      ? "nav-tab-active text-yellow-400"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )}
                  data-testid={`nav-${path.replace("/", "") || "dashboard"}`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{label}</span>
                </a>
              </Link>
            );
          })}
        </div>

        <PerplexityAttribution />
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
