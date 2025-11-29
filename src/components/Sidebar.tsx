import { Navigation } from "./Navigation";
import logo from "@/assets/intorza-logo.webp";

export const Sidebar = () => {
  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center border-b border-border px-6">
        <img 
          src={logo} 
          alt="INTORZA" 
          className="h-8 w-auto object-contain"
        />
      </div>
      <Navigation />
    </aside>
  );
};
