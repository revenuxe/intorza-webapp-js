import { LogOut, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navigation } from "./Navigation";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/intorza-logo.webp";

export const Sidebar = () => {
  const { signOut, isAuthenticated } = useAuth();

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card h-screen sticky top-0">
      <div className="flex h-16 items-center border-b border-border px-6 shrink-0">
        <img 
          src={logo} 
          alt="INTORZA" 
          className="h-8 w-auto object-contain"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        <Navigation />
      </div>
      <div className="p-4 border-t border-border shrink-0">
        {isAuthenticated ? (
          <Button variant="outline" className="w-full" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        ) : (
          <Button variant="default" className="w-full" onClick={() => window.location.href = '/auth'}>
            <LogIn className="mr-2 h-4 w-4" />
            Login
          </Button>
        )}
      </div>
    </aside>
  );
};
