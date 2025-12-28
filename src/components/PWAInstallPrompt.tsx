import { useState, useEffect } from 'react';
import { X, Download, Smartphone, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return;

    // Check if dismissed recently (within 7 days)
    const dismissedAt = localStorage.getItem('pwa-install-dismissed');
    if (dismissedAt) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) return;
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      // Show iOS-specific banner after a delay
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }

    // Listen for beforeinstallprompt event (Chrome, Edge, etc.)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);
    
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    setIsInstalling(false);
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
      // Auto-hide after showing success message
      setTimeout(() => {
        setShowBanner(false);
      }, 2500);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border border-border rounded-xl shadow-lg p-4">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            {isInstalled ? (
              <CheckCircle className="h-6 w-6 text-green-500" />
            ) : isInstalling ? (
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            ) : (
              <Smartphone className="h-6 w-6 text-primary" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm">
              {isInstalled 
                ? "App Installed!" 
                : isInstalling 
                  ? "Installing App..." 
                  : "Install INTORZA App"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isInstalled 
                ? "INTORZA is now on your home screen" 
                : isInstalling 
                  ? "Please wait..." 
                  : isIOS 
                    ? "Tap the share button and 'Add to Home Screen'" 
                    : "Get quick access from your home screen"}
            </p>
          </div>
        </div>

        {!isIOS && deferredPrompt && !isInstalled && (
          <Button
            onClick={handleInstall}
            size="sm"
            className="w-full mt-3 gap-2"
            disabled={isInstalling}
          >
            {isInstalling ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Installing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Install Now
              </>
            )}
          </Button>
        )}

        {isIOS && (
          <div className="mt-3 p-2 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              Tap <span className="inline-flex items-center mx-1">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L12 14M12 2L8 6M12 2L16 6M4 14V20H20V14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span> then "Add to Home Screen"
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
