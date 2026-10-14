import { LogOut, LogIn, Settings, ChevronDown, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useNavigate } from "@/lib/navigation";
import { format } from "date-fns";

export const Sidebar = () => {
  const navigate = useNavigate();
  const { user, signOut, isAuthenticated } = useAuth();
  const { isPro, expiry, setPaywallOpen } = useSubscription();

  const getInitials = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    }
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
    <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card h-screen sticky top-0">
      <div className="flex h-16 items-center justify-between border-b border-border px-6 shrink-0">
        <img 
          src={logo.src}
          alt="INTORZA" 
          className="h-8 w-auto object-contain"
        />
        <div className="flex items-center gap-2">
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
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <Navigation />
      </div>
      <div className="p-4 border-t border-border shrink-0">
        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start h-auto py-3 px-3 hover:bg-muted/50">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture} />
                    <AvatarFallback className="text-sm bg-primary text-primary-foreground">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate max-w-[120px]">{getUserDisplayName()}</p>
                      {isPro && <Crown className="h-3 w-3 text-amber-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate max-w-[140px]">{user?.email}</p>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-56 bg-popover border border-border shadow-lg">
              {isPro && formatExpiry() && (
                <>
                  <div className="px-2 py-1.5">
                    <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
                      <Crown className="h-3 w-3" />
                      Pro until {formatExpiry()}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                </>
              )}
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
          <Button variant="default" className="w-full" onClick={() => navigate('/auth')}>
            <LogIn className="mr-2 h-4 w-4" />
            Login
          </Button>
        )}
      </div>
    </aside>
  );
};
