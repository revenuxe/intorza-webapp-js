import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navigation } from "./Navigation";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/intorza-logo.webp";

export const Sidebar = () => {
  const { signOut } = useAuth();

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center border-b border-border px-6">
        <img 
          src={logo} 
          alt="INTORZA" 
          className="h-8 w-auto object-contain"
        />
      </div>
      <div className="flex-1">
        <Navigation />
      </div>
      <div className="p-4 border-t border-border">
        <Button variant="outline" className="w-full" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
};
