import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/hooks/useAuth';
import { GlobalLoader } from '@/components/GlobalLoader';

type PaymentStatus = 'processing' | 'success' | 'failed' | 'timeout';

export default function PaymentProcessing() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isPro, refreshSubscription } = useSubscription();
  const { session } = useAuth();
  const [status, setStatus] = useState<PaymentStatus>('processing');
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 10;
  const pollInterval = 3000;

  useEffect(() => {
    // If already Pro, show success immediately
    if (isPro) {
      setStatus('success');
      return;
    }

    if (!session?.access_token) {
      return;
    }

    let attemptsCount = 0;
    const interval = setInterval(async () => {
      // Increment attempts and cap at maxAttempts for display
      attemptsCount += 1;
      setAttempts(Math.min(attemptsCount, maxAttempts));

      await refreshSubscription();

      if (attemptsCount >= maxAttempts) {
        clearInterval(interval);
        setStatus('timeout');
      }
    }, pollInterval);

    // Initial immediate check
    (async () => {
      attemptsCount = 1;
      setAttempts(1);
      await refreshSubscription();
    })();

    return () => clearInterval(interval);
  }, [session?.access_token, refreshSubscription, isPro]);

  // Update status when isPro changes
  useEffect(() => {
    if (isPro && status === 'processing') {
      setStatus('success');
    }
  }, [isPro, status]);

  const handleRetry = async () => {
    setStatus('processing');
    setAttempts(0);
    await refreshSubscription();
  };

  const handleContinue = () => {
    const returnUrl = searchParams.get('return') || '/dashboard';
    navigate(returnUrl);
  };

  const handleGoBack = () => {
    navigate('/');
  };

  if (status === 'processing') {
    return (
      <div className="min-h-screen bg-background">
        <GlobalLoader message={`Processing your payment... (${attempts}/${maxAttempts})`} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6 text-center space-y-4">

          {status === 'success' && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-green-600">
                  Welcome to Pro! 🎉
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Your subscription is now active
                </p>
              </div>
              <Button 
                onClick={handleContinue}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                Continue to Dashboard
              </Button>
            </>
          )}

          {status === 'failed' && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-destructive">
                  Payment Failed
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Something went wrong with your payment
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleGoBack} className="flex-1">
                  Go Back
                </Button>
                <Button onClick={handleRetry} className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </div>
            </>
          )}

          {status === 'timeout' && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-amber-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Verifying Payment</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  We're still verifying your payment. You can safely continue.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleRetry} className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Check Again
                </Button>
                <Button onClick={handleContinue} className="flex-1">
                  Continue
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                If payment was successful, Pro will be activated shortly
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
