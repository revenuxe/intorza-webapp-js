import { useState, useEffect, useRef } from 'react';
import { WifiOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const OfflineIndicator = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Only show toast if user was previously offline
      if (wasOfflineRef.current) {
        toast({
          title: "Back online",
          description: "Your internet connection has been restored.",
          variant: "default",
        });
      }
      wasOfflineRef.current = false;
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      wasOfflineRef.current = true;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground py-2 px-4 animate-in slide-in-from-top duration-300">
      <div className="flex items-center justify-center gap-2 text-sm font-medium">
        <WifiOff className="h-4 w-4" />
        <span>You're offline. Some features may be unavailable.</span>
      </div>
    </div>
  );
};
