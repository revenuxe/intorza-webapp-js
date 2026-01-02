import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Building2, Upload, Phone, Settings, ArrowRight, Check, SkipForward } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const GUEST_ONBOARDING_KEY = 'intorza_guest_onboarding_complete';
const GUEST_PROFILE_KEY = 'intorza_guest_profile';
const COUNTRY_SELECTION_KEY = 'intorza_selected_country';

interface GuestProfile {
  companyName?: string;
  logoUrl?: string;
  phone?: string;
}

interface GuestOnboardingTourProps {
  onComplete?: () => void;
}

export const GuestOnboardingTour = ({ onComplete }: GuestOnboardingTourProps) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [uploading, setUploading] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const totalSteps = 4;

  useEffect(() => {
    // Check if onboarding has been completed
    const countrySelected = localStorage.getItem(COUNTRY_SELECTION_KEY);
    const onboardingComplete = localStorage.getItem(GUEST_ONBOARDING_KEY);
    
    // Show tour after country is selected but onboarding not complete
    if (countrySelected && !onboardingComplete) {
      // Small delay for smooth transition after country popup
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // If user is logged in, check if their profile is complete
  useEffect(() => {
    const checkLoggedInUserOnboarding = async () => {
      if (isAuthenticated && user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_name, logo_url, phone')
          .eq('id', user.id)
          .single();

        // If profile is incomplete, show the tour
        if (profile && !profile.company_name) {
          const onboardingComplete = localStorage.getItem(GUEST_ONBOARDING_KEY);
          if (!onboardingComplete) {
            setOpen(true);
          }
        }
      }
    };
    
    checkLoggedInUserOnboarding();
  }, [isAuthenticated, user]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // For guest users, create a local URL
    if (!isAuthenticated) {
      const localUrl = URL.createObjectURL(file);
      setLogoUrl(localUrl);
      return;
    }

    // For logged in users, upload to Supabase
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const saveProgress = async () => {
    const profile: GuestProfile = {
      companyName,
      logoUrl,
      phone,
    };

    if (isAuthenticated && user?.id) {
      // Save to database for logged in users
      await supabase
        .from('profiles')
        .update({
          company_name: companyName || null,
          logo_url: logoUrl || null,
          phone: phone || null,
        })
        .eq('id', user.id);
    } else {
      // Save to localStorage for guests
      localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(profile));
    }
  };

  const handleComplete = async () => {
    await saveProgress();
    localStorage.setItem(GUEST_ONBOARDING_KEY, 'true');
    setOpen(false);
    onComplete?.();
    toast({
      title: "Setup complete!",
      description: "You can update these settings anytime",
    });
  };

  const handleSkip = () => {
    localStorage.setItem(GUEST_ONBOARDING_KEY, 'true');
    setOpen(false);
    onComplete?.();
  };

  const nextStep = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="font-medium">Company Name</h3>
              <p className="text-sm text-muted-foreground mt-1">
                This will appear on your quotations
              </p>
            </div>
            <div>
              <Label htmlFor="company-name" className="sr-only">Company Name</Label>
              <Input
                id="company-name"
                placeholder="Enter your company name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="text-center"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Avatar className="h-20 w-20">
                <AvatarImage src={logoUrl} />
                <AvatarFallback className="bg-muted">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="text-center">
              <h3 className="font-medium">Company Logo</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add your logo for professional quotations
              </p>
            </div>
            <div className="flex justify-center">
              <Label
                htmlFor="logo-upload"
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-md bg-muted hover:bg-muted/80 transition-colors"
              >
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading..." : "Upload Logo"}
              </Label>
              <Input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                disabled={uploading}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Phone className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="font-medium">Contact Number</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your contact number for clients
              </p>
            </div>
            <div>
              <Label htmlFor="phone" className="sr-only">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="text-center"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-center">
              <h3 className="font-medium">You're All Set!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Review your setup and start creating quotations
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={logoUrl} />
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {companyName?.charAt(0) || "C"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{companyName || "Your Company"}</p>
                  <p className="text-xs text-muted-foreground">{phone || "No phone added"}</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
              <Settings className="h-3 w-3" />
              You can update these in Settings anytime
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="sr-only">
          <DialogTitle>Quick Setup</DialogTitle>
          <DialogDescription>Set up your company profile</DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Step {step} of {totalSteps}</span>
            <button onClick={handleSkip} className="hover:text-foreground flex items-center gap-1">
              <SkipForward className="h-3 w-3" />
              Skip setup
            </button>
          </div>
          <Progress value={(step / totalSteps) * 100} className="h-1" />
        </div>

        {/* Step content */}
        <div className="py-4">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
              Back
            </Button>
          )}
          <Button onClick={nextStep} className="flex-1">
            {step === totalSteps ? (
              "Complete Setup"
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Helper to get guest profile
export const getGuestProfile = (): GuestProfile | null => {
  const saved = localStorage.getItem(GUEST_PROFILE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  return null;
};
