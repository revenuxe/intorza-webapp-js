import { useState } from "react";
import { useNavigate } from "@/lib/navigation";
import { Menu, LogOut, Settings, ChevronDown, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Navigation } from "./Navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/contexts/SubscriptionContext";
import logo from "@/assets/intorza-logo.webp";
import { format } from "date-fns";

export const Header = () => {
  const navigate = useNavigate();
  const { user, signOut, isAuthenticated } = useAuth();
  const { isPro, expiry, setPaywallOpen } = useSubscription();
  
  const getInitials = () => {
    if (!user?.email) return "U";
    return user.email.charAt(0).toUpperCase();
  };

  const getUserDisplayName = () => {
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name;
    if (user?.email) return user.email.split('@')[0];
    return "User";
  };

  const formatExpiry = () => {
    if (!expiry) return null;
    try {
      return format(new Date(expiry), 'MMM dd, yyyy');
    } catch {
      return null;
    }
  };

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
            src={logo.src}
            alt="INTORZA" 
            className="h-7 w-auto object-contain lg:hidden"
          />
        </div>

        {/* Mobile auth section */}
        <div className="lg:hidden flex items-center gap-1.5">
          {/* Pro badge for Pro users */}
          {isAuthenticated && isPro && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-[10px] px-1.5 py-0.5 cursor-default">
                  <Crown className="h-3 w-3 mr-0.5" />
                  Pro
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs font-medium">Intorza Pro — Active</p>
                {formatExpiry() && (
                  <p className="text-xs text-muted-foreground">Expires: {formatExpiry()}</p>
                )}
              </TooltipContent>
            </Tooltip>
          )}
          {/* Upgrade button for non-Pro users */}
          {isAuthenticated && !isPro && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPaywallOpen(true, 'Upgrade')}
              className="h-9 px-2 text-amber-600"
            >
              <Crown className="h-4 w-4" />
            </Button>
          )}
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 px-2 gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{getUserDisplayName()}</p>
                    {isPro && (
                      <Crown className="h-3.5 w-3.5 text-amber-500" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  {isPro && formatExpiry() && (
                    <p className="text-xs text-amber-600 mt-1">Pro until {formatExpiry()}</p>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              variant="default" 
              size="sm"
              onClick={() => navigate('/auth')}
              className="h-9"
            >
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
