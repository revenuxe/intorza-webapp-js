"use client";

import { useState, useEffect, useRef } from "react";
import { AuthCaptcha, requireAuthCaptcha, type AuthCaptchaHandle } from '@/components/AuthCaptcha';
import { useNavigate } from "@/lib/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Search, Building2, CheckCircle2, MapPin, User, Hash } from "lucide-react";
import intorzaLogo from "@/assets/intorza-logo.webp";
import { trackMetaEvent } from '@/lib/meta-pixel';

interface Company {
  id: string;
  company_name: string;
  full_name: string | null;
  country_name: string | null;
  org_code: string | null;
}

const workTypes = [
  { value: 'carpenter', label: 'Carpenter' },
  { value: 'labour', label: 'Labour' },
  { value: 'plumber', label: 'Plumber' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'painter', label: 'Painter' },
  { value: 'mason', label: 'Mason' },
  { value: 'welder', label: 'Welder' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'other', label: 'Other' },
];

const TeamSignup = () => {
  const captcha = useRef<AuthCaptchaHandle>(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'org' | 'details' | 'success'>('org');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'name' | 'code'>('name');
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
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    const { data, error } = await supabase
      .from('companies_public')
      .select('id, company_name, country_name, org_code')
      .not('company_name', 'is', null)
      .neq('company_name', '');
    
    if (!error && data) {
      setCompanies(data.map(d => ({
        id: d.id,
        company_name: d.company_name || '',
        full_name: null,
        country_name: d.country_name || null,
        org_code: d.org_code || null,
      })));
    }
  };

  const filteredCompanies = companies.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    if (searchMode === 'code') {
      return c.org_code?.toLowerCase().includes(q);
    }
    return (
      c.company_name?.toLowerCase().includes(q) ||
      c.full_name?.toLowerCase().includes(q) ||
      c.country_name?.toLowerCase().includes(q)
    );
  });

  const handleSelectOrg = (company: Company) => {
    setSelectedCompany(company);
    setStep('details');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCompany) {
      toast.error("Please select an organization");
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
          emailRedirectTo: window.location.origin + '/team/login',
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        toast.error("Failed to create account");
        setLoading(false);
        return;
      }

      // Do not count Supabase's existing-email response as a new registration.
      if (authData.user.identities?.length !== 0) trackMetaEvent('CompleteRegistration');

      if (!authData.session) {
        toast.success('Check your email to verify your account, then sign in to submit your join request.');
        navigate('/team/login');
        return;
      }
      const { error: requestError } = await supabase.rpc('submit_pending_team_join');
      if (requestError) throw requestError;

      setStep('success');
      toast.success("Request sent successfully!");
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
                Search by company name, location, or org code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Search mode toggle */}
              <div className="flex gap-1 p-1 bg-muted rounded-xl">
                <button
                  onClick={() => { setSearchMode('name'); setSearchQuery(''); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                    searchMode === 'name'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground'
                  }`}
                >
                  <Search className="h-3.5 w-3.5" />
                  Name / Location
                </button>
                <button
                  onClick={() => { setSearchMode('code'); setSearchQuery(''); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                    searchMode === 'code'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground'
                  }`}
                >
                  <Hash className="h-3.5 w-3.5" />
                  Org Code
                </button>
              </div>

              <div className="relative">
                {searchMode === 'code' ? (
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                ) : (
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                )}
                <Input
                  placeholder={searchMode === 'code' ? 'Enter organization code...' : 'Search company or location...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-xl"
                />
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2">
                {filteredCompanies.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {searchQuery ? 'No organizations found' : 'No organizations available'}
                  </p>
                ) : (
                  filteredCompanies.map((company) => (
                    <button
                      key={company.id}
                      onClick={() => handleSelectOrg(company)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border hover:bg-accent/50 transition-colors text-left"
                    >
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{company.company_name}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          {company.full_name && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <User className="h-3 w-3" />
                              {company.full_name}
                            </span>
                          )}
                          {company.country_name && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <MapPin className="h-3 w-3" />
                              {company.country_name}
                            </span>
                          )}
                        </div>
                      </div>
                      {company.org_code && (
                        <span className="shrink-0 text-[10px] font-mono bg-muted px-2 py-1 rounded-lg text-muted-foreground">
                          {company.org_code}
                        </span>
                      )}
                    </button>
                  ))
                )}
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
                {selectedCompany?.full_name && (
                  <span className="text-xs block mt-0.5">by {selectedCompany.full_name}</span>
                )}
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
                  <Label>Role / Work Type *</Label>
                  <Select value={formData.work_type} onValueChange={(v) => setFormData({ ...formData, work_type: v })}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {workTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  The organization owner will review your request. You'll be able to login once approved.
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
