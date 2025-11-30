import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Navigation } from "./Navigation";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/intorza-logo.webp";

export const Header = () => {
  const { signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <Navigation mobile />
            </SheetContent>
          </Sheet>
          
          {/* Logo - only show on mobile */}
          <img 
            src={logo} 
            alt="INTORZA" 
            className="h-7 w-auto object-contain lg:hidden"
          />
        </div>

        {/* Mobile logout button */}
        <Button variant="ghost" size="icon" onClick={signOut} className="lg:hidden h-9 w-9">
          <LogOut className="h-5 w-5" />
          <span className="sr-only">Logout</span>
        </Button>
      </div>
    </header>
  );
};
