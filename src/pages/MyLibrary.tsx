import { useState } from "react";
import { Library, CreditCard, FileText, Building2, Shield } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentTemplatesTab } from "@/components/library/PaymentTemplatesTab";
import { TermsTemplatesTab } from "@/components/library/TermsTemplatesTab";
import { BankDetailsTab } from "@/components/library/BankDetailsTab";
import { WarrantyNotesTab } from "@/components/library/WarrantyNotesTab";

const MyLibrary = () => {
  const [activeTab, setActiveTab] = useState("payment");

  return (
    <div className="container max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Library className="h-7 w-7" />
            My Library
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage reusable templates for quotations and invoices
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="payment" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 text-xs md:text-sm">
              <CreditCard className="h-4 w-4" />
              <span className="hidden md:inline">Payment Stages</span>
              <span className="md:hidden">Payment</span>
            </TabsTrigger>
            <TabsTrigger value="terms" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 text-xs md:text-sm">
              <FileText className="h-4 w-4" />
              <span className="hidden md:inline">Terms & Conditions</span>
              <span className="md:hidden">Terms</span>
            </TabsTrigger>
            <TabsTrigger value="bank" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 text-xs md:text-sm">
              <Building2 className="h-4 w-4" />
              <span className="hidden md:inline">Bank Details</span>
              <span className="md:hidden">Bank</span>
            </TabsTrigger>
            <TabsTrigger value="warranty" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 text-xs md:text-sm">
              <Shield className="h-4 w-4" />
              <span className="hidden md:inline">Warranty Notes</span>
              <span className="md:hidden">Warranty</span>
            </TabsTrigger>
          </TabsList>

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
