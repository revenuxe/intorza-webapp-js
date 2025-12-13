import { FileText, Receipt, Users, Settings, PlusCircle, UsersRound, LayoutDashboard, Ruler, FolderOpen, Lock, Crown, Library } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface NavigationProps {
  mobile?: boolean;
}

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    requiresPro: false,
  },
  {
    title: "Site Measurement",
    href: "/site-measurement",
    icon: Ruler,
    requiresPro: true,
  },
  {
    title: "My Projects",
    href: "/my-projects",
    icon: FolderOpen,
    requiresPro: true,
  },
  {
    title: "Create Quotation",
    href: "/",
    icon: PlusCircle,
    requiresPro: false,
  },
  {
    title: "My Quotations",
    href: "/quotations",
    icon: FileText,
    requiresPro: false,
  },
  {
    title: "Invoices",
    href: "/invoices",
    icon: Receipt,
    requiresPro: true,
  },
  {
    title: "Clients",
    href: "/clients",
    icon: Users,
    requiresPro: false,
  },
  {
    title: "Team",
    href: "/team",
    icon: UsersRound,
    requiresPro: true,
  },
  {
    title: "My Library",
    href: "/library",
    icon: Library,
    requiresPro: false,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    requiresPro: false,
  },
];

export const Navigation = ({ mobile }: NavigationProps) => {
  const { isPro, setPaywallOpen } = useSubscription();

  const handleNavClick = (e: React.MouseEvent, item: typeof navItems[0]) => {
    if (item.requiresPro && !isPro) {
      e.preventDefault();
      setPaywallOpen(true, item.title);
    }
  };

  return (
    <nav className={cn(
      "flex flex-col gap-1 p-4",
      mobile ? "pt-8" : "h-full"
    )}>
      {/* Upgrade Banner for non-Pro users */}
      {!isPro && (
        <button
          onClick={() => setPaywallOpen(true, 'Upgrade')}
          className="flex items-center gap-3 rounded-lg px-3 py-3 mb-2 text-sm font-medium bg-gradient-to-r from-amber-500/10 to-amber-600/10 text-amber-700 border border-amber-500/20 hover:from-amber-500/20 hover:to-amber-600/20 transition-colors"
        >
          <Crown className="h-5 w-5" />
          <div className="flex-1 text-left">
            <span className="block font-semibold">Upgrade to Pro</span>
            <span className="text-xs opacity-80">₹49/month</span>
          </div>
        </button>
      )}

      {navItems.map((item) => {
        const Icon = item.icon;
        const isLocked = item.requiresPro && !isPro;
        const showProBadge = item.requiresPro && isPro;
        
        return (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === "/"}
            onClick={(e) => handleNavClick(e, item)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isLocked 
                ? "text-muted-foreground/60 hover:bg-muted/50 cursor-pointer" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            activeClassName={isLocked ? "" : "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"}
          >
            <Icon className="h-5 w-5" />
            <span className="flex-1">{item.title}</span>
            {showProBadge && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Crown className="h-3.5 w-3.5 text-amber-500" />
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  Pro Feature
                </TooltipContent>
              </Tooltip>
            )}
            {isLocked && (
              <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />
            )}
          </NavLink>
        );
      })}
    </nav>
  );
};
