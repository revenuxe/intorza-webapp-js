"use client";

import { ProfessionPicker } from '@/components/ProfessionPicker';


import { useState, useRef, useEffect } from "react";
import { AuthCaptcha, requireAuthCaptcha, type AuthCaptchaHandle } from '@/components/AuthCaptcha';
import { portalHref } from '@/lib/portal-routing.mjs';
import { useNavigate } from "@/lib/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Hash, Building2, ChevronRight } from "lucide-react";
import intorzaLogo from "@/assets/intorza-logo.webp";
import { trackMetaEvent } from '@/lib/meta-pixel';

interface Company {
  id: string;
  company_name: string;
}



const TeamSignup = () => {
  const captcha = useRef<AuthCaptchaHandle>(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'org' | 'details' | 'success'>('org');
  const [orgCode, setOrgCode] = useState('');
  const [checkingCode, setCheckingCode] = useState(false);
  const [matchedCompany, setMatchedCompany] = useState<Company | null>(null);
  const [codeError, setCodeError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    work_type: 'other',
  });

  useEffect(() => {
    const code = orgCode.trim().toUpperCase();
    let cancelled = false;
    setMatchedCompany(null);
    setCodeError('');
    setCheckingCode(Boolean(code));
    if (!code) return;
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('companies_public')
          .select('id, company_name')
          .eq('org_code', code)
          .maybeSingle();
        if (cancelled) return;
        if (error) throw error;
        if (!data?.company_name) {
          setCodeError('No organization found. Check the code with your organization.');
          return;
        }
        setMatchedCompany({ id: data.id, company_name: data.company_name });
      } catch {
        if (!cancelled) setCodeError('Unable to check the code. Please try again.');
      } finally {
        if (!cancelled) setCheckingCode(false);
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [orgCode]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCompany) {
      toast.error("Please enter a valid organization code");
      return;
    }

    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Please fill all required fields");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          captchaToken: requireAuthCaptcha(captcha),
          data: {
            full_name: formData.name,
            is_team_member: true,
            join_company_id: selectedCompany.id,
            join_phone: formData.phone,
            join_work_type: formData.work_type,
          },
          emailRedirectTo: new URL(portalHref('/team/login', window.location.hostname), window.location.origin).href,
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        toast.error("Failed to create account");
        setLoading(false);
        return;
      }

      // Existing confirmed addresses return an obfuscated user with no identities.
      if (authData.user.identities?.length === 0) {
        toast.error('This email is already registered. Try logging in instead.');
        return;
      }
      trackMetaEvent('CompleteRegistration');

      // The signup trigger queues the pending request even without a session.
      // The authenticated RPC remains idempotent for clients with a session.
      if (authData.session) {
        const { error: requestError } = await supabase.rpc('submit_pending_team_join');
        if (requestError) throw requestError;
        await supabase.auth.signOut();
      }

      sessionStorage.removeItem('returnPath');
      sessionStorage.removeItem('pendingAction');
      toast.success("Request sent! Your organization will review it.");
      navigate('/team/login', { replace: true });
    } catch (error: any) {
      if (error.message?.includes('already registered')) {
        toast.error("This email is already registered. Try logging in instead.");
      } else {
        toast.error(error.message || "Registration failed");
      }
    } finally {
      captcha.current?.reset();
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => {
            if (step === 'details') setStep('org');
            else navigate('/team/login');
          }}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {step === 'details' ? 'Change Organization' : 'Back to Login'}
        </Button>

        {step === 'org' && (
          <Card className="rounded-2xl">
            <CardHeader className="text-center pb-3">
              <div className="mx-auto mb-3">
                <img src={intorzaLogo.src} alt="INTORZA" className="h-10 mx-auto" />
              </div>
              <CardTitle className="text-xl">Join an Organization</CardTitle>
              <CardDescription>
                Enter the organization code shared by your organization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="org-code">Organization code *</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="org-code"
                      required
                      value={orgCode}
                      onChange={(e) => {
                        setOrgCode(e.target.value.toUpperCase());
                        setMatchedCompany(null);
                        setSelectedCompany(null);
                        setCodeError('');
                        setCheckingCode(Boolean(e.target.value.trim()));
                      }}
                      placeholder="Enter organization code"
                      autoCapitalize="characters"
                      autoComplete="off"
                      spellCheck={false}
                      disabled={checkingCode}
                      className="pl-9 rounded-xl"
                    />
                  </div>
                </div>
                <div aria-live="polite">
                  {checkingCode && <p className="text-sm text-muted-foreground">Checking code...</p>}
                  {codeError && <p className="text-sm text-destructive">{codeError}</p>}
                  {matchedCompany && !checkingCode && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Select your organization to continue.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCompany(matchedCompany);
                          setStep('details');
                        }}
                        className="flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Building2 className="h-5 w-5 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1 break-words font-semibold">{matchedCompany.company_name}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'details' && (
          <Card className="rounded-2xl">
            <CardHeader className="text-center pb-3">
              <div className="mx-auto mb-2">
                <img src={intorzaLogo.src} alt="INTORZA" className="h-10 mx-auto" />
              </div>
              <CardTitle className="text-xl">Create Your Account</CardTitle>
              <CardDescription>
                Joining <span className="font-semibold text-foreground">{selectedCompany?.company_name}</span>

              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignup} className="space-y-3">
                <AuthCaptcha ref={captcha} />
                <div className="space-y-1.5">
                  <Label>Full Name *</Label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your full name"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your.email@example.com"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Phone number (optional)"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profession">Profession / Work Type *</Label>
                  <ProfessionPicker id="profession" value={formData.work_type} onChange={(work_type) => setFormData({ ...formData, work_type })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Password *</Label>
                  <Input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min 8 characters"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm Password *</Label>
                  <Input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Confirm your password"
                    className="rounded-xl"
                  />
                </div>
                <Button type="submit" className="w-full mt-2 rounded-xl" disabled={loading}>
                  {loading ? "Creating Account..." : "Create Account & Request to Join"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'success' && (
          <Card className="rounded-2xl">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <div>
                <h2 className="text-xl font-bold">Request Sent!</h2>
                <p className="text-muted-foreground mt-2">
                  Your request to join <span className="font-semibold text-foreground">{selectedCompany?.company_name}</span> has been submitted.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  No email confirmation is needed. Your organization can accept or reject your request. You can sign in to your team once approved.
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate('/team/login')} className="mt-4 rounded-xl">
                Go to Login
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TeamSignup;
