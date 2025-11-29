import { FileText, Receipt, Users, Settings, PlusCircle } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";

interface NavigationProps {
  mobile?: boolean;
}

const navItems = [
  {
    title: "Create Quotation",
    href: "/",
    icon: PlusCircle,
  },
  {
    title: "My Quotations",
    href: "/quotations",
    icon: FileText,
  },
  {
    title: "Invoices",
    href: "/invoices",
    icon: Receipt,
  },
  {
    title: "Clients",
    href: "/clients",
    icon: Users,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export const Navigation = ({ mobile }: NavigationProps) => {
  return (
    <nav className={cn(
      "flex flex-col gap-1 p-4",
      mobile ? "pt-8" : "h-full"
    )}>
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === "/"}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            activeClassName="bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
          >
            <Icon className="h-5 w-5" />
            <span>{item.title}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
