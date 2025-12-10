import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

export interface QuotationSettings {
  // Header & Project Info
  showCompanyLogo: boolean;
  showCompanyAddress: boolean;
  showProjectDetails: boolean;
  showCompanyPhone: boolean;
  showCompanyEmail: boolean;
  showGstin: boolean;
  // Form Fields
  showClientName: boolean;
  showClientAddress: boolean;
  showClientPhone: boolean;
  showClientEmail: boolean;
  showDateOfProposal: boolean;
  showQuotationValidTill: boolean;
  showProjectDeadline: boolean;
  showPlaceOfProject: boolean;
  showWarranty: boolean;
  showProjectType: boolean;
  // Item Table Layout
  showDetailedSizeColumns: boolean;
  useSimpleItemLayout: boolean;
  showSideColumn: boolean;
  showProductDetails: boolean;
  showItemNotes: boolean;
  showSerialNumbers: boolean;
  // Totals & Summary
  showSubtotal: boolean;
  showTaxGst: boolean;
  showGrandTotal: boolean;
  showDiscount: boolean;
  showSocialMediaDiscount: boolean;
  showAmountInWords: boolean;
  // Extra Sections
  showPaymentStages: boolean;
  showTermsConditions: boolean;
  showSignatureArea: boolean;
  showNotes: boolean;
  showValidityNote: boolean;
  // Payment & Bank Details
  showBankDetails: boolean;
  showQRCode: boolean;
  showProfessionalAdvantages: boolean;
  showQuotationNumber: boolean;
  showUpiId: boolean;
}

export interface InvoiceSettings {
  showCompanyLogo: boolean;
  showCompanyAddress: boolean;
  showCompanyPhone: boolean;
  showCompanyEmail: boolean;
  showGstin: boolean;
  showClientAddress: boolean;
  showClientPhone: boolean;
  showClientEmail: boolean;
  showProjectName: boolean;
  showDueDate: boolean;
  showPaymentStatus: boolean;
  showTaxGst: boolean;
  showPaymentHistory: boolean;
  showSignatureFooter: boolean;
  showTermsConditions: boolean;
  showNextPaymentDue: boolean;
  showInvoiceNumber: boolean;
  showInvoiceDate: boolean;
  showPaymentProgress: boolean;
  showBankDetails: boolean;
  showQRCode: boolean;
  showAmountInWords: boolean;
  showNotes: boolean;
  showUpiId: boolean;
}

const defaultQuotationSettings: QuotationSettings = {
  showCompanyLogo: true,
  showCompanyAddress: true,
  showProjectDetails: true,
  showCompanyPhone: true,
  showCompanyEmail: true,
  showGstin: true,
  showClientName: true,
  showClientAddress: true,
  showClientPhone: true,
  showClientEmail: true,
  showDateOfProposal: true,
  showQuotationValidTill: true,
  showProjectDeadline: true,
  showPlaceOfProject: true,
  showWarranty: true,
  showProjectType: true,
  showDetailedSizeColumns: true,
  useSimpleItemLayout: false,
  showSideColumn: true,
  showProductDetails: true,
  showItemNotes: false,
  showSerialNumbers: true,
  showSubtotal: true,
  showTaxGst: true,
  showGrandTotal: true,
  showDiscount: true,
  showSocialMediaDiscount: true,
  showAmountInWords: true,
  showPaymentStages: true,
  showTermsConditions: true,
  showSignatureArea: true,
  showNotes: true,
  showValidityNote: true,
  showBankDetails: false,
  showQRCode: false,
  showProfessionalAdvantages: true,
  showQuotationNumber: true,
  showUpiId: false,
};

const defaultInvoiceSettings: InvoiceSettings = {
  showCompanyLogo: true,
  showCompanyAddress: true,
  showCompanyPhone: true,
  showCompanyEmail: true,
  showGstin: true,
  showClientAddress: true,
  showClientPhone: true,
  showClientEmail: true,
  showProjectName: true,
  showDueDate: true,
  showPaymentStatus: true,
  showTaxGst: true,
  showPaymentHistory: true,
  showSignatureFooter: true,
  showTermsConditions: true,
  showNextPaymentDue: true,
  showInvoiceNumber: true,
  showInvoiceDate: true,
  showPaymentProgress: true,
  showBankDetails: false,
  showQRCode: false,
  showAmountInWords: true,
  showNotes: true,
  showUpiId: false,
};

interface CustomizeFieldsDrawerProps {
  type: 'quotation' | 'invoice';
  settings: QuotationSettings | InvoiceSettings;
  onSettingsChange: (settings: QuotationSettings | InvoiceSettings) => void;
}

export const getQuotationSettings = (): QuotationSettings => {
  const stored = localStorage.getItem('quotationSettings');
  if (stored) {
    try {
      return { ...defaultQuotationSettings, ...JSON.parse(stored) };
    } catch {
      return defaultQuotationSettings;
    }
  }
  return defaultQuotationSettings;
};

export const getInvoiceSettings = (): InvoiceSettings => {
  const stored = localStorage.getItem('invoiceSettings');
  if (stored) {
    try {
      return { ...defaultInvoiceSettings, ...JSON.parse(stored) };
    } catch {
      return defaultInvoiceSettings;
    }
  }
  return defaultInvoiceSettings;
};

export const saveQuotationSettings = (settings: QuotationSettings) => {
  localStorage.setItem('quotationSettings', JSON.stringify(settings));
};

export const saveInvoiceSettings = (settings: InvoiceSettings) => {
  localStorage.setItem('invoiceSettings', JSON.stringify(settings));
};

const ToggleItem = ({ 
  label, 
  checked, 
  onCheckedChange,
  disabled = false
}: { 
  label: string; 
  checked: boolean; 
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) => (
  <div className="flex items-center justify-between py-2">
    <Label className={`text-sm font-normal cursor-pointer ${disabled ? 'text-muted-foreground' : ''}`}>
      {label}
    </Label>
    <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
  </div>
);

const QuotationCustomizeContent = ({ 
  settings, 
  onSettingsChange,
  onReset
}: { 
  settings: QuotationSettings; 
  onSettingsChange: (settings: QuotationSettings) => void;
  onReset: () => void;
}) => {
  const updateSetting = (key: keyof QuotationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    
    // Handle mutually exclusive options
    if (key === 'showDetailedSizeColumns' && value) {
      newSettings.useSimpleItemLayout = false;
    }
    if (key === 'useSimpleItemLayout' && value) {
      newSettings.showDetailedSizeColumns = false;
    }
    
    onSettingsChange(newSettings);
    saveQuotationSettings(newSettings);
  };

  return (
    <div className="space-y-6 py-4">
      {/* Group 1 - Header & Company */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Header & Company Info</h4>
        <div className="space-y-1">
          <ToggleItem 
            label="Show company logo" 
            checked={settings.showCompanyLogo}
            onCheckedChange={(v) => updateSetting('showCompanyLogo', v)}
          />
          <ToggleItem 
            label="Show company address" 
            checked={settings.showCompanyAddress}
            onCheckedChange={(v) => updateSetting('showCompanyAddress', v)}
          />
          <ToggleItem 
            label="Show company phone" 
            checked={settings.showCompanyPhone}
            onCheckedChange={(v) => updateSetting('showCompanyPhone', v)}
          />
          <ToggleItem 
            label="Show company email" 
            checked={settings.showCompanyEmail}
            onCheckedChange={(v) => updateSetting('showCompanyEmail', v)}
          />
          <ToggleItem 
            label="Show GSTIN" 
            checked={settings.showGstin}
            onCheckedChange={(v) => updateSetting('showGstin', v)}
          />
          <ToggleItem 
            label="Show project details block (in PDF)" 
            checked={settings.showProjectDetails}
            onCheckedChange={(v) => updateSetting('showProjectDetails', v)}
          />
        </div>
      </div>

      <Separator />

      {/* Group 2 - Project & Client Fields */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Project & Client Fields</h4>
        <div className="space-y-1">
          <ToggleItem 
            label="Client name" 
            checked={settings.showClientName}
            onCheckedChange={(v) => updateSetting('showClientName', v)}
          />
          <ToggleItem 
            label="Client address" 
            checked={settings.showClientAddress}
            onCheckedChange={(v) => updateSetting('showClientAddress', v)}
          />
          <ToggleItem 
            label="Client phone" 
            checked={settings.showClientPhone}
            onCheckedChange={(v) => updateSetting('showClientPhone', v)}
          />
          <ToggleItem 
            label="Client email" 
            checked={settings.showClientEmail}
            onCheckedChange={(v) => updateSetting('showClientEmail', v)}
          />
          <ToggleItem 
            label="Date of proposal" 
            checked={settings.showDateOfProposal}
            onCheckedChange={(v) => updateSetting('showDateOfProposal', v)}
          />
          <ToggleItem 
            label="Quotation valid till" 
            checked={settings.showQuotationValidTill}
            onCheckedChange={(v) => updateSetting('showQuotationValidTill', v)}
          />
          <ToggleItem 
            label="Project deadline" 
            checked={settings.showProjectDeadline}
            onCheckedChange={(v) => updateSetting('showProjectDeadline', v)}
          />
          <ToggleItem 
            label="Place of project" 
            checked={settings.showPlaceOfProject}
            onCheckedChange={(v) => updateSetting('showPlaceOfProject', v)}
          />
          <ToggleItem 
            label="Warranty" 
            checked={settings.showWarranty}
            onCheckedChange={(v) => updateSetting('showWarranty', v)}
          />
          <ToggleItem 
            label="Project type" 
            checked={settings.showProjectType}
            onCheckedChange={(v) => updateSetting('showProjectType', v)}
          />
        </div>
      </div>

      <Separator />

      {/* Group 3 - Item Table */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Item Table Layout</h4>
        <div className="space-y-1">
          <ToggleItem 
            label="Show detailed size columns (Width / Height / Sq.ft)" 
            checked={settings.showDetailedSizeColumns}
            onCheckedChange={(v) => updateSetting('showDetailedSizeColumns', v)}
          />
          <ToggleItem 
            label="Use simple item layout (Description, Qty, Rate, Amount)" 
            checked={settings.useSimpleItemLayout}
            onCheckedChange={(v) => updateSetting('useSimpleItemLayout', v)}
          />
          <ToggleItem 
            label="Show Side column" 
            checked={settings.showSideColumn}
            onCheckedChange={(v) => updateSetting('showSideColumn', v)}
          />
          <ToggleItem 
            label="Show Product Details column" 
            checked={settings.showProductDetails}
            onCheckedChange={(v) => updateSetting('showProductDetails', v)}
          />
          <ToggleItem 
            label="Show item notes" 
            checked={settings.showItemNotes}
            onCheckedChange={(v) => updateSetting('showItemNotes', v)}
          />
          <ToggleItem 
            label="Show serial numbers (S.No)" 
            checked={settings.showSerialNumbers}
            onCheckedChange={(v) => updateSetting('showSerialNumbers', v)}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Only one layout mode can be active at a time.
        </p>
      </div>

      <Separator />

      {/* Group 4 - Totals & Summary */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Totals & Summary</h4>
        <div className="space-y-1">
          <ToggleItem 
            label="Show subtotal" 
            checked={settings.showSubtotal}
            onCheckedChange={(v) => updateSetting('showSubtotal', v)}
          />
          <ToggleItem 
            label="Show tax/GST toggle" 
            checked={settings.showTaxGst}
            onCheckedChange={(v) => updateSetting('showTaxGst', v)}
          />
          <ToggleItem 
            label="Show discount option" 
            checked={settings.showDiscount}
            onCheckedChange={(v) => updateSetting('showDiscount', v)}
          />
          <ToggleItem 
            label="Show social media discount" 
            checked={settings.showSocialMediaDiscount}
            onCheckedChange={(v) => updateSetting('showSocialMediaDiscount', v)}
          />
          <ToggleItem 
            label="Show grand total" 
            checked={settings.showGrandTotal}
            onCheckedChange={(v) => updateSetting('showGrandTotal', v)}
          />
          <ToggleItem 
            label="Show amount in words" 
            checked={settings.showAmountInWords}
            onCheckedChange={(v) => updateSetting('showAmountInWords', v)}
          />
        </div>
      </div>

      <Separator />

      {/* Group 5 - Extra Sections */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Extra Sections (PDF)</h4>
        <div className="space-y-1">
          <ToggleItem 
            label="Show quotation number" 
            checked={settings.showQuotationNumber}
            onCheckedChange={(v) => updateSetting('showQuotationNumber', v)}
          />
          <ToggleItem 
            label="Show professional advantages" 
            checked={settings.showProfessionalAdvantages}
            onCheckedChange={(v) => updateSetting('showProfessionalAdvantages', v)}
          />
          <ToggleItem 
            label="Show stage-wise payment plan" 
            checked={settings.showPaymentStages}
            onCheckedChange={(v) => updateSetting('showPaymentStages', v)}
          />
          <ToggleItem 
            label="Show Terms & Conditions" 
            checked={settings.showTermsConditions}
            onCheckedChange={(v) => updateSetting('showTermsConditions', v)}
          />
          <ToggleItem 
            label="Show signature area" 
            checked={settings.showSignatureArea}
            onCheckedChange={(v) => updateSetting('showSignatureArea', v)}
          />
          <ToggleItem 
            label="Show notes section" 
            checked={settings.showNotes}
            onCheckedChange={(v) => updateSetting('showNotes', v)}
          />
          <ToggleItem 
            label="Show validity note" 
            checked={settings.showValidityNote}
            onCheckedChange={(v) => updateSetting('showValidityNote', v)}
          />
        </div>
      </div>

      <Separator />

      {/* Group 6 - Payment & Bank Details */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Payment & Bank Details</h4>
        <div className="space-y-1">
          <ToggleItem 
            label="Show bank account details" 
            checked={settings.showBankDetails}
            onCheckedChange={(v) => updateSetting('showBankDetails', v)}
          />
          <ToggleItem 
            label="Show payment QR code" 
            checked={settings.showQRCode}
            onCheckedChange={(v) => updateSetting('showQRCode', v)}
          />
          <ToggleItem 
            label="Show UPI ID" 
            checked={settings.showUpiId}
            onCheckedChange={(v) => updateSetting('showUpiId', v)}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Bank details and QR code can be configured in Settings.
        </p>
      </div>

      <Separator />

      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          These settings will be saved and used for your future quotations.
        </p>
        <Button variant="outline" size="sm" onClick={onReset} className="w-full">
          Reset to Default
        </Button>
      </div>
    </div>
  );
};

const InvoiceCustomizeContent = ({
  settings, 
  onSettingsChange,
  onReset
}: { 
  settings: InvoiceSettings; 
  onSettingsChange: (settings: InvoiceSettings) => void;
  onReset: () => void;
}) => {
  const updateSetting = (key: keyof InvoiceSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    onSettingsChange(newSettings);
    saveInvoiceSettings(newSettings);
  };

  return (
    <div className="space-y-6 py-4">
      {/* Group 1 - Header Info */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Header & Company Info</h4>
        <div className="space-y-1">
          <ToggleItem 
            label="Show company logo" 
            checked={settings.showCompanyLogo}
            onCheckedChange={(v) => updateSetting('showCompanyLogo', v)}
          />
          <ToggleItem 
            label="Show company address" 
            checked={settings.showCompanyAddress}
            onCheckedChange={(v) => updateSetting('showCompanyAddress', v)}
          />
          <ToggleItem 
            label="Show company phone" 
            checked={settings.showCompanyPhone}
            onCheckedChange={(v) => updateSetting('showCompanyPhone', v)}
          />
          <ToggleItem 
            label="Show company email" 
            checked={settings.showCompanyEmail}
            onCheckedChange={(v) => updateSetting('showCompanyEmail', v)}
          />
          <ToggleItem 
            label="Show GSTIN" 
            checked={settings.showGstin}
            onCheckedChange={(v) => updateSetting('showGstin', v)}
          />
        </div>
      </div>

      <Separator />

      {/* Group 2 - Client Info */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Client Info</h4>
        <div className="space-y-1">
          <ToggleItem 
            label="Show client address" 
            checked={settings.showClientAddress}
            onCheckedChange={(v) => updateSetting('showClientAddress', v)}
          />
          <ToggleItem 
            label="Show client phone" 
            checked={settings.showClientPhone}
            onCheckedChange={(v) => updateSetting('showClientPhone', v)}
          />
          <ToggleItem 
            label="Show client email" 
            checked={settings.showClientEmail}
            onCheckedChange={(v) => updateSetting('showClientEmail', v)}
          />
          <ToggleItem 
            label="Show project name" 
            checked={settings.showProjectName}
            onCheckedChange={(v) => updateSetting('showProjectName', v)}
          />
        </div>
      </div>

      <Separator />

      {/* Group 3 - Invoice Details */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Invoice Details</h4>
        <div className="space-y-1">
          <ToggleItem 
            label="Show invoice number" 
            checked={settings.showInvoiceNumber}
            onCheckedChange={(v) => updateSetting('showInvoiceNumber', v)}
          />
          <ToggleItem 
            label="Show invoice date" 
            checked={settings.showInvoiceDate}
            onCheckedChange={(v) => updateSetting('showInvoiceDate', v)}
          />
          <ToggleItem 
            label="Show due date" 
            checked={settings.showDueDate}
            onCheckedChange={(v) => updateSetting('showDueDate', v)}
          />
          <ToggleItem 
            label="Show payment status" 
            checked={settings.showPaymentStatus}
            onCheckedChange={(v) => updateSetting('showPaymentStatus', v)}
          />
          <ToggleItem 
            label="Show payment progress bar" 
            checked={settings.showPaymentProgress}
            onCheckedChange={(v) => updateSetting('showPaymentProgress', v)}
          />
          <ToggleItem 
            label="Show tax/GST line" 
            checked={settings.showTaxGst}
            onCheckedChange={(v) => updateSetting('showTaxGst', v)}
          />
          <ToggleItem 
            label="Show next payment due" 
            checked={settings.showNextPaymentDue}
            onCheckedChange={(v) => updateSetting('showNextPaymentDue', v)}
          />
          <ToggleItem 
            label="Show amount in words" 
            checked={settings.showAmountInWords}
            onCheckedChange={(v) => updateSetting('showAmountInWords', v)}
          />
        </div>
      </div>

      <Separator />

      {/* Group 4 - Extra Sections */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Extra Sections</h4>
        <div className="space-y-1">
          <ToggleItem 
            label="Show payment history in PDF" 
            checked={settings.showPaymentHistory}
            onCheckedChange={(v) => updateSetting('showPaymentHistory', v)}
          />
          <ToggleItem 
            label="Show terms & conditions" 
            checked={settings.showTermsConditions}
            onCheckedChange={(v) => updateSetting('showTermsConditions', v)}
          />
          <ToggleItem 
            label="Show signature/footer block" 
            checked={settings.showSignatureFooter}
            onCheckedChange={(v) => updateSetting('showSignatureFooter', v)}
          />
          <ToggleItem 
            label="Show notes section" 
            checked={settings.showNotes}
            onCheckedChange={(v) => updateSetting('showNotes', v)}
          />
        </div>
      </div>

      <Separator />

      {/* Group 5 - Payment & Bank Details */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Payment & Bank Details</h4>
        <div className="space-y-1">
          <ToggleItem 
            label="Show bank account details" 
            checked={settings.showBankDetails}
            onCheckedChange={(v) => updateSetting('showBankDetails', v)}
          />
          <ToggleItem 
            label="Show payment QR code" 
            checked={settings.showQRCode}
            onCheckedChange={(v) => updateSetting('showQRCode', v)}
          />
          <ToggleItem 
            label="Show UPI ID" 
            checked={settings.showUpiId}
            onCheckedChange={(v) => updateSetting('showUpiId', v)}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Bank details and QR code can be configured in Settings.
        </p>
      </div>

      <Separator />

      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          These settings will be saved and used for your future invoices.
        </p>
        <Button variant="outline" size="sm" onClick={onReset} className="w-full">
          Reset to Default
        </Button>
      </div>
    </div>
  );
};

export const CustomizeFieldsDrawer = ({ 
  type, 
  settings, 
  onSettingsChange 
}: CustomizeFieldsDrawerProps) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const title = type === 'quotation' ? 'Customize Quotation Fields' : 'Customize Invoice Fields';
  const description = 'Toggle which fields and sections appear in the form and PDF.';

  const handleReset = () => {
    if (type === 'quotation') {
      onSettingsChange(defaultQuotationSettings);
      saveQuotationSettings(defaultQuotationSettings);
    } else {
      onSettingsChange(defaultInvoiceSettings);
      saveInvoiceSettings(defaultInvoiceSettings);
    }
  };

  const content = type === 'quotation' ? (
    <QuotationCustomizeContent 
      settings={settings as QuotationSettings} 
      onSettingsChange={onSettingsChange as (s: QuotationSettings) => void}
      onReset={handleReset}
    />
  ) : (
    <InvoiceCustomizeContent 
      settings={settings as InvoiceSettings} 
      onSettingsChange={onSettingsChange as (s: InvoiceSettings) => void}
      onReset={handleReset}
    />
  );

  // Use Drawer for mobile, Sheet for desktop
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
            <Settings2 className="h-4 w-4 mr-2" />
            Customize
          </Button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 overflow-y-auto">
            {content}
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Done</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-2" />
          Customize
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {content}
        <SheetFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Done</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
