"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "@/lib/navigation";
import { safeInternalPath } from "@/lib/safe-navigation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import intorzaLogo from "@/assets/intorza-logo.webp";
import { z } from "zod";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { GlobalLoader } from "@/components/GlobalLoader";
import { AuthCaptcha, requireAuthCaptcha, type AuthCaptchaHandle } from '@/components/AuthCaptcha';

// Validation schemas
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  company: z.string().optional(),
});

const GoogleButton = ({ onClick, loading, disabled }: { onClick: () => void; loading: boolean; disabled: boolean }) => (
  <Button 
    type="button" 
    variant="outline" 
    className="w-full" 
    onClick={onClick}
    disabled={disabled}
  >
    {loading ? (
      "Connecting..."
    ) : (
      <>
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Sign in with Google
      </>
    )}
  </Button>
);

const Auth = () => {
  const loginCaptcha = useRef<AuthCaptchaHandle>(null);
  const signupCaptcha = useRef<AuthCaptchaHandle>(null);
  // Email forms and OAuth/session callbacks share one redirect owner. Otherwise
  // a second completion can consume the cleared return path and send users home.
  const redirectClaimed = useRef(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupFullName, setSignupFullName] = useState("");
  const [signupCompany, setSignupCompany] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingUserId, setOnboardingUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
      // Don't reset googleLoading here - user will be redirected
    } catch (error: any) {
      toast.error(error.message || "Google login failed");
      setGoogleLoading(false);
    }
  };

  const getReturnPath = useCallback(() => {
    const returnPath = safeInternalPath(sessionStorage.getItem('returnPath'));
    const pendingAction = sessionStorage.getItem('pendingAction');
    if (returnPath && pendingAction) {
      return `${returnPath}${returnPath.includes('?') ? '&' : '?'}continueAction=${encodeURIComponent(pendingAction)}`;
    }
    return returnPath;
  }, []);

  // Check if user needs onboarding (first-time user)
  const checkOnboarding = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_name, phone')
        .eq('id', userId)
        .single();

      // If no company name and no phone, show onboarding
      if (!profile?.company_name && !profile?.phone) {
        setOnboardingUserId(userId);
        setShowOnboarding(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
    const returnPath = getReturnPath();
    sessionStorage.removeItem('returnPath');
    sessionStorage.removeItem('pendingAction');
    navigate(returnPath);
  }, [getReturnPath, navigate]);

  // Robust auth check with listener
  useEffect(() => {
    let mounted = true;
    let redirectInProgress = false;

    const handleAuthRedirect = async (userId: string) => {
      if (!mounted || redirectInProgress || redirectClaimed.current) return;
      redirectClaimed.current = true;
      redirectInProgress = true;
      
      try {
        // Check if team member
        const { data: teamMember } = await supabase
          .from('team_members')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (!mounted) return;
        
        if (teamMember) {
          navigate('/team/dashboard', { replace: true });
          return;
        }
        
        // Check if admin
        const { data: isAdmin } = await supabase.rpc('is_admin');
        if (!mounted) return;
        
        if (isAdmin) {
          navigate('/admin/dashboard', { replace: true });
          return;
        }
        
        // Check if needs onboarding
        const needsOnboarding = await checkOnboarding(userId);
        if (!needsOnboarding && mounted) {
          const returnPath = getReturnPath();
          sessionStorage.removeItem('returnPath');
          sessionStorage.removeItem('pendingAction');
          navigate(returnPath, { replace: true });
        }
      } catch (error) {
        console.error('Auth redirect error:', error);
        // On error, just go to home
        if (mounted) {
          navigate('/', { replace: true });
        }
      }
    };

    // Set up auth state listener FIRST - keep it synchronous
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        // Reset loading states on any auth event
        setGoogleLoading(false);
        setLoading(false);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(() => {
            if (mounted) handleAuthRedirect(session.user.id);
          }, 0);
        }
        
        setInitialLoading(false);
      }
    );

    // Then check for existing session with timeout
    const sessionCheckTimeout = setTimeout(() => {
      if (mounted && initialLoading) {
        setInitialLoading(false);
        setGoogleLoading(false);
      }
    }, 3000); // 3 second max wait

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      
      if (session?.user) {
        await handleAuthRedirect(session.user.id);
      }
      
      setInitialLoading(false);
      setGoogleLoading(false);
    }).catch(() => {
      if (mounted) {
        setInitialLoading(false);
        setGoogleLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(sessionCheckTimeout);
      subscription.unsubscribe();
    };
  }, [navigate, checkOnboarding, getReturnPath]);

  const clearErrors = () => setErrors({});

  // Check if email is a team member email
  const isTeamMemberEmail = (email: string) => {
    return email.toLowerCase().endsWith('@intorza.com');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    // Block team member emails from company login
    if (isTeamMemberEmail(loginEmail)) {
      toast.error("Team member accounts must login at /team/login");
      return;
    }

    // Validate inputs
    const result = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[`login_${err.path[0]}`] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    redirectClaimed.current = true;
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
        options: { captchaToken: requireAuthCaptcha(loginCaptcha) },
      });

      if (error) throw error;

      // Double-check: make sure this user is not a team member
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (teamMember) {
        await supabase.auth.signOut();
        redirectClaimed.current = false;
        toast.error("Team member accounts must login at /team/login");
        return;
      }

      // Check if admin - redirect appropriately
      const { data: isAdmin } = await supabase.rpc('is_admin');
      if (isAdmin) {
        toast.success("Welcome back, Admin!");
        navigate('/admin/dashboard');
        return;
      }

      toast.success("Welcome back!");
      
      // Check if needs onboarding
      const needsOnboarding = await checkOnboarding(data.user.id);
      if (!needsOnboarding) {
        const returnPath = getReturnPath();
        sessionStorage.removeItem('returnPath');
        navigate(returnPath);
      }
    } catch (error: any) {
      redirectClaimed.current = false;
      if (error.message?.includes("Invalid login credentials")) {
        toast.error("Invalid email or password");
      } else {
        toast.error(error.message || "Login failed");
      }
    } finally {
      loginCaptcha.current?.reset();
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    // Block @intorza.com emails from regular signup
    if (isTeamMemberEmail(signupEmail)) {
      toast.error("@intorza.com emails are reserved for team members. Contact your employer for access.");
      return;
    }

    // Validate inputs
    const result = signupSchema.safeParse({
      fullName: signupFullName,
      email: signupEmail,
      password: signupPassword,
      company: signupCompany,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[`signup_${err.path[0]}`] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    redirectClaimed.current = true;
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          captchaToken: requireAuthCaptcha(signupCaptcha),
          data: {
            full_name: signupFullName,
            company_name: signupCompany,
          },
        },
      });

      if (error) {
        redirectClaimed.current = false;
        if (error.message?.includes("already registered")) {
          toast.error("This email is already registered. Please login instead.");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Account created! Please check your email to verify your account.");
      
      // If email confirmation is disabled, show onboarding
      if (data.session && data.user) {
        const needsOnboarding = await checkOnboarding(data.user.id);
        if (!needsOnboarding) {
          const returnPath = getReturnPath();
          sessionStorage.removeItem('returnPath');
          navigate(returnPath);
        }
      } else {
        redirectClaimed.current = false;
      }
    } catch (error: any) {
      redirectClaimed.current = false;
      toast.error(error.message || "Signup failed");
    } finally {
      signupCaptcha.current?.reset();
      setLoading(false);
    }
  };

  // Show loader while checking auth
  if (initialLoading) {
    return <GlobalLoader message="Checking authentication..." />;
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <img src={intorzaLogo.src} alt="INTORZA" className="h-12" />
            </div>
            <CardTitle className="text-2xl font-bold">Welcome to INTORZA</CardTitle>
            <CardDescription>
              Create quotations and invoices for your interior design business
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full" onValueChange={clearErrors}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 mt-4">
                  <AuthCaptcha ref={loginCaptcha} />
                  <GoogleButton 
                    onClick={handleGoogleLogin} 
                    loading={googleLoading} 
                    disabled={loading || googleLoading} 
                  />
                  
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      disabled={loading || googleLoading}
                      className={errors.login_email ? "border-destructive" : ""}
                    />
                    {errors.login_email && (
                      <p className="text-xs text-destructive">{errors.login_email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      disabled={loading || googleLoading}
                      className={errors.login_password ? "border-destructive" : ""}
                    />
                    {errors.login_password && (
                      <p className="text-xs text-destructive">{errors.login_password}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={loading || googleLoading}>
                    {loading ? "Logging in..." : "Login"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4 mt-4">
                  <AuthCaptcha ref={signupCaptcha} />
                  <GoogleButton 
                    onClick={handleGoogleLogin} 
                    loading={googleLoading} 
                    disabled={loading || googleLoading} 
                  />
                  
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Your Name"
                      value={signupFullName}
                      onChange={(e) => setSignupFullName(e.target.value)}
                      required
                      disabled={loading}
                      className={errors.signup_fullName ? "border-destructive" : ""}
                    />
                    {errors.signup_fullName && (
                      <p className="text-xs text-destructive">{errors.signup_fullName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-company">Company Name (Optional)</Label>
                    <Input
                      id="signup-company"
                      type="text"
                      placeholder="Your Company"
                      value={signupCompany}
                      onChange={(e) => setSignupCompany(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      disabled={loading}
                      className={errors.signup_email ? "border-destructive" : ""}
                    />
                    {errors.signup_email && (
                      <p className="text-xs text-destructive">{errors.signup_email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      disabled={loading}
                      className={errors.signup_password ? "border-destructive" : ""}
                    />
                    {errors.signup_password && (
                      <p className="text-xs text-destructive">{errors.signup_password}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={loading || googleLoading}>
                    {loading ? "Creating account..." : "Sign Up"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {onboardingUserId && (
        <OnboardingDialog
          open={showOnboarding}
          onComplete={handleOnboardingComplete}
          userId={onboardingUserId}
        />
      )}
    </>
  );
};

export default Auth;
