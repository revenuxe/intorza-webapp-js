import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import intorzaLogo from "@/assets/intorza-logo.webp";
import { z } from "zod";

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

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupFullName, setSignupFullName] = useState("");
  const [signupCompany, setSignupCompany] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  const getReturnPath = () => {
    const returnPath = sessionStorage.getItem('returnPath');
    const pendingAction = sessionStorage.getItem('pendingAction');
    if (returnPath && pendingAction) {
      return `${returnPath}${returnPath.includes('?') ? '&' : '?'}continueAction=${pendingAction}`;
    }
    return "/";
  };

  const clearErrors = () => setErrors({});

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

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

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) throw error;

      toast.success("Welcome back!");
      const returnPath = getReturnPath();
      sessionStorage.removeItem('returnPath');
      navigate(returnPath);
    } catch (error: any) {
      if (error.message?.includes("Invalid login credentials")) {
        toast.error("Invalid email or password");
      } else {
        toast.error(error.message || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

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

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: signupFullName,
            company_name: signupCompany,
          },
        },
      });

      if (error) {
        if (error.message?.includes("already registered")) {
          toast.error("This email is already registered. Please login instead.");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Account created! Please check your email to verify your account.");
      
      // If email confirmation is disabled, redirect immediately
      if (data.session) {
        const returnPath = getReturnPath();
        sessionStorage.removeItem('returnPath');
        navigate(returnPath);
      }
    } catch (error: any) {
      toast.error(error.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <img src={intorzaLogo} alt="INTORZA" className="h-12" />
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
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    disabled={loading}
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
                    disabled={loading}
                    className={errors.login_password ? "border-destructive" : ""}
                  />
                  {errors.login_password && (
                    <p className="text-xs text-destructive">{errors.login_password}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 mt-4">
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
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating account..." : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;