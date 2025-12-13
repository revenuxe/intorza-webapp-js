import { useState, useEffect } from "react";
import { Library, CreditCard, FileText, Building2, Shield, Package, Receipt } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentTemplatesTab } from "@/components/library/PaymentTemplatesTab";
import { TermsTemplatesTab } from "@/components/library/TermsTemplatesTab";
import { BankDetailsTab } from "@/components/library/BankDetailsTab";
import { WarrantyNotesTab } from "@/components/library/WarrantyNotesTab";
import { ItemsPricingTab } from "@/components/library/ItemsPricingTab";
import { QuotationsLibraryTab } from "@/components/library/QuotationsLibraryTab";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const MyLibrary = () => {
  const [activeTab, setActiveTab] = useState("items");
  const { toast } = useToast();

  // Auto-migrate on first visit
  useEffect(() => {
    autoMigrateFromProfile();
  }, []);

  const autoMigrateFromProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if migration already done
      const migrationKey = `library_migrated_${user.id}`;
      if (localStorage.getItem(migrationKey)) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('payment_stages, terms_conditions, invoice_terms_conditions, bank_name, bank_account_number, bank_ifsc_code, bank_account_holder, upi_id, payment_qr_url')
        .eq('id', user.id)
        .single();

      if (!profileData) return;

      let migrated = false;

      // Migrate payment stages
      if (profileData.payment_stages && Array.isArray(profileData.payment_stages) && profileData.payment_stages.length > 0) {
        const { data: existing } = await supabase
          .from('payment_templates')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (!existing || existing.length === 0) {
          await supabase.from('payment_templates').insert({
            user_id: user.id,
            template_name: 'Default',
            stages: profileData.payment_stages,
            is_default: true
          });
          migrated = true;
        }
      }

      // Migrate quotation terms
      if (profileData.terms_conditions && Array.isArray(profileData.terms_conditions) && profileData.terms_conditions.length > 0) {
        const { data: existing } = await supabase
          .from('terms_templates')
          .select('id')
          .eq('user_id', user.id)
          .eq('template_type', 'quotation')
          .limit(1);

        if (!existing || existing.length === 0) {
          await supabase.from('terms_templates').insert({
            user_id: user.id,
            template_name: 'Default Quotation Terms',
            template_type: 'quotation',
            content: profileData.terms_conditions,
            is_default: true
          });
          migrated = true;
        }
      }

      // Migrate invoice terms
      if (profileData.invoice_terms_conditions && Array.isArray(profileData.invoice_terms_conditions) && profileData.invoice_terms_conditions.length > 0) {
        const { data: existing } = await supabase
          .from('terms_templates')
          .select('id')
          .eq('user_id', user.id)
          .eq('template_type', 'invoice')
          .limit(1);

        if (!existing || existing.length === 0) {
          await supabase.from('terms_templates').insert({
            user_id: user.id,
            template_name: 'Default Invoice Terms',
            template_type: 'invoice',
            content: profileData.invoice_terms_conditions,
            is_default: true
          });
          migrated = true;
        }
      }

      // Migrate bank details
      if (profileData.bank_name || profileData.bank_account_number || profileData.upi_id) {
        const { data: existing } = await supabase
          .from('bank_detail_templates')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (!existing || existing.length === 0) {
          await supabase.from('bank_detail_templates').insert({
            user_id: user.id,
            template_name: 'Primary Account',
            bank_name: profileData.bank_name,
            account_number: profileData.bank_account_number,
            ifsc_code: profileData.bank_ifsc_code,
            account_holder_name: profileData.bank_account_holder,
            upi_id: profileData.upi_id,
            qr_code_url: profileData.payment_qr_url,
            is_default: true
          });
          migrated = true;
        }
      }

      localStorage.setItem(migrationKey, 'true');

      if (migrated) {
        toast({
          title: "Library updated",
          description: "Your existing templates have been imported",
        });
      }
    } catch (error) {
      console.error('Auto migration error:', error);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Library className="h-7 w-7" />
            My Library
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Auto-learned items, pricing, and reusable templates
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 h-auto">
            <TabsTrigger value="items" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 text-xs md:text-sm">
              <Package className="h-4 w-4" />
              <span className="hidden md:inline">Items & Pricing</span>
              <span className="md:hidden">Items</span>
            </TabsTrigger>
            <TabsTrigger value="quotations" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 text-xs md:text-sm">
              <Receipt className="h-4 w-4" />
              <span className="hidden md:inline">Quotations</span>
              <span className="md:hidden">Quotes</span>
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 text-xs md:text-sm">
              <CreditCard className="h-4 w-4" />
              <span className="hidden md:inline">Payment Stages</span>
              <span className="md:hidden">Payment</span>
            </TabsTrigger>
            <TabsTrigger value="terms" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 text-xs md:text-sm">
              <FileText className="h-4 w-4" />
              <span className="hidden md:inline">Terms</span>
              <span className="md:hidden">Terms</span>
            </TabsTrigger>
            <TabsTrigger value="bank" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 text-xs md:text-sm">
              <Building2 className="h-4 w-4" />
              <span className="hidden md:inline">Bank</span>
              <span className="md:hidden">Bank</span>
            </TabsTrigger>
            <TabsTrigger value="warranty" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 text-xs md:text-sm">
              <Shield className="h-4 w-4" />
              <span className="hidden md:inline">Warranty</span>
              <span className="md:hidden">Warranty</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="mt-6">
            <ItemsPricingTab />
          </TabsContent>

          <TabsContent value="quotations" className="mt-6">
            <QuotationsLibraryTab />
          </TabsContent>

          <TabsContent value="payment" className="mt-6">
            <PaymentTemplatesTab />
          </TabsContent>
          
          <TabsContent value="terms" className="mt-6">
            <TermsTemplatesTab />
          </TabsContent>
          
          <TabsContent value="bank" className="mt-6">
            <BankDetailsTab />
          </TabsContent>
          
          <TabsContent value="warranty" className="mt-6">
            <WarrantyNotesTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MyLibrary;
