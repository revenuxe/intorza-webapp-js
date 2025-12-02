import { ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Desktop Sidebar - Fixed */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col w-full min-w-0">
        {/* Mobile Header */}
        <Header />
        
        {/* Page Content - Scrollable */}
        <main className="flex-1 overflow-y-auto h-[calc(100vh-4rem)] lg:h-screen">
          {children}
        </main>
      </div>
    </div>
  );
};
