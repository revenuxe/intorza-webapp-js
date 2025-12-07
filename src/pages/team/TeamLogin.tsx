import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Users, ArrowLeft } from "lucide-react";

const TeamLogin = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        if (formData.password !== formData.confirmPassword) {
          toast.error("Passwords do not match");
          setLoading(false);
          return;
        }

        if (formData.password.length < 6) {
          toast.error("Password must be at least 6 characters");
          setLoading(false);
          return;
        }

        // Check if email exists in team_members
        const { data: teamMember, error: checkError } = await supabase
          .from('team_members')
          .select('id, company_id, name')
          .eq('email', formData.email)
          .single();

        if (checkError || !teamMember) {
          toast.error("Your email is not registered with any company. Please contact your employer.");
          setLoading(false);
          return;
        }

        // Sign up the user
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/team/dashboard`,
          }
        });

        if (signUpError) throw signUpError;

        if (authData.user) {
          // Update team_member with user_id
          await supabase
            .from('team_members')
            .update({ user_id: authData.user.id })
            .eq('id', teamMember.id);

          toast.success("Account created! Please check your email to confirm.");
        }
      } else {
        // Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;

        // Check if user is a team member
        const { data: teamMember, error: teamError } = await supabase
          .from('team_members')
          .select('id')
          .eq('user_id', data.user.id)
          .single();

        if (teamError || !teamMember) {
          await supabase.auth.signOut();
          toast.error("This account is not linked to a team member profile");
          setLoading(false);
          return;
        }

        toast.success("Welcome back!");
        navigate('/team/dashboard');
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Team Member Portal</CardTitle>
            <CardDescription>
              {isSignUp 
                ? "Create your account to access your dashboard" 
                : "Sign in to view your tasks and clock in/out"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Your work email"
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              {isSignUp && (
                <div className="space-y-2">
                  <Label>Confirm Password</Label>
                  <Input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Please wait..." : (isSignUp ? "Create Account" : "Sign In")}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp 
                  ? "Already have an account? Sign in" 
                  : "First time? Create an account"
                }
              </button>
            </div>

            {isSignUp && (
              <p className="mt-4 text-xs text-muted-foreground text-center">
                Note: Your employer must add your email to their team first before you can create an account.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeamLogin;
