import { useState, useEffect } from "react";
import { Download, Palette, Layout, Eye, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  PDF_THEMES, 
  PDFEditorSettings, 
  getEditorSettings, 
  saveEditorSettings, 
  defaultEditorSettings,
  getThemeById,
  rgbToHex,
  InvoiceSettings,
  getInvoiceSettings,
  saveInvoiceSettings,
  defaultInvoiceSettings
} from "@/lib/pdfThemes";

interface InvoicePreviewEditorProps {
  open: boolean;
  onClose: () => void;
  onDownload: (editorSettings: PDFEditorSettings, invoiceSettings: InvoiceSettings) => void;
  invoiceData: {
    invoiceNumber: string;
    clientName: string;
    projectName: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    status: string;
    companyName?: string;
    companyLogo?: string;
  };
}

export const InvoicePreviewEditor = ({
  open,
  onClose,
  onDownload,
  invoiceData
}: InvoicePreviewEditorProps) => {
  const [editorSettings, setEditorSettings] = useState<PDFEditorSettings>(getEditorSettings());
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>(getInvoiceSettings());
  const [activeTab, setActiveTab] = useState("themes");

  useEffect(() => {
    if (open) {
      setEditorSettings(getEditorSettings());
      setInvoiceSettings(getInvoiceSettings());
    }
  }, [open]);

  const updateEditorSettings = (updates: Partial<PDFEditorSettings>) => {
    const newSettings = { ...editorSettings, ...updates };
    setEditorSettings(newSettings);
    saveEditorSettings(newSettings);
  };

  const updateInvoiceSettings = (updates: Partial<InvoiceSettings>) => {
    const newSettings = { ...invoiceSettings, ...updates };
    setInvoiceSettings(newSettings);
    saveInvoiceSettings(newSettings);
  };

  const handleReset = () => {
    setEditorSettings(defaultEditorSettings);
    setInvoiceSettings(defaultInvoiceSettings);
    saveEditorSettings(defaultEditorSettings);
    saveInvoiceSettings(defaultInvoiceSettings);
  };

  const handleDownload = () => {
    onDownload(editorSettings, invoiceSettings);
    onClose();
  };

  const currentTheme = getThemeById(editorSettings.theme);

  const getPreviewStyles = () => ({
    background: `rgb(${currentTheme.colors.background.join(',')})`,
    color: `rgb(${currentTheme.colors.text.join(',')})`,
  });

  const getHighlightStyle = () => {
    if (!editorSettings.highlightAmounts) return {};
    return {
      backgroundColor: `rgb(${currentTheme.colors.highlight.join(',')})`,
      padding: '2px 6px',
      borderRadius: '2px',
    };
  };

  const getHeaderStyle = () => ({
    backgroundColor: `rgb(${currentTheme.colors.headerBg.join(',')})`,
    color: `rgb(${currentTheme.colors.headerText.join(',')})`,
  });

  const getCardStyle = () => ({
    backgroundColor: `rgb(${currentTheme.colors.cardBackground.join(',')})`,
    borderColor: editorSettings.showBorders ? `rgb(${currentTheme.colors.border.join(',')})` : 'transparent',
  });

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">Invoice Preview & Editor</SheetTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Editor Controls */}
          <div className="w-full md:w-72 border-b md:border-b-0 md:border-r flex flex-col max-h-[40vh] md:max-h-none">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="grid grid-cols-3 m-3">
                <TabsTrigger value="themes" className="text-xs">
                  <Palette className="h-3 w-3 mr-1" />
                  Theme
                </TabsTrigger>
                <TabsTrigger value="layout" className="text-xs">
                  <Layout className="h-3 w-3 mr-1" />
                  Layout
                </TabsTrigger>
                <TabsTrigger value="fields" className="text-xs">
                  <Eye className="h-3 w-3 mr-1" />
                  Fields
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 px-3">
                <TabsContent value="themes" className="mt-0 space-y-3 pb-4">
                  <Label className="text-xs font-semibold">Select Theme</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {PDF_THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => updateEditorSettings({ theme: theme.id })}
                        className={`relative p-2 rounded-lg border-2 transition-all text-left ${
                          editorSettings.theme === theme.id 
                            ? 'border-primary ring-2 ring-primary/20' 
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {editorSettings.theme === theme.id && (
                          <div className="absolute top-1 right-1 w-3 h-3 bg-primary rounded-full flex items-center justify-center">
                            <Check className="h-2 w-2 text-primary-foreground" />
                          </div>
                        )}
                        <div 
                          className="w-full h-6 rounded mb-1 flex overflow-hidden"
                          style={{ backgroundColor: `rgb(${theme.colors.headerBg.join(',')})` }}
                        >
                          <div 
                            className="w-1/3 h-full"
                            style={{ backgroundColor: `rgb(${theme.colors.highlight.join(',')})` }}
                          />
                        </div>
                        <p className="text-[10px] font-medium truncate">{theme.name}</p>
                      </button>
                    ))}
                  </div>

                  {/* Custom Color */}
                  <div className="pt-3 border-t space-y-2">
                    <Label className="text-xs font-semibold">Custom Colors</Label>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Highlight</Label>
                      <Input
                        type="color"
                        value={editorSettings.customColors?.highlight || rgbToHex(...currentTheme.colors.highlight)}
                        onChange={(e) => updateEditorSettings({
                          customColors: { ...editorSettings.customColors, highlight: e.target.value }
                        })}
                        className="w-10 h-7 p-1 cursor-pointer"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="layout" className="mt-0 space-y-3 pb-4">
                  <Label className="text-xs font-semibold">Logo Position</Label>
                  <RadioGroup
                    value={editorSettings.logoPlacement}
                    onValueChange={(v) => updateEditorSettings({ logoPlacement: v as 'left' | 'center' | 'right' })}
                    className="grid grid-cols-3 gap-2"
                  >
                    {['left', 'center', 'right'].map((pos) => (
                      <div key={pos}>
                        <RadioGroupItem value={pos} id={`inv-logo-${pos}`} className="peer sr-only" />
                        <Label
                          htmlFor={`inv-logo-${pos}`}
                          className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                        >
                          <div className="w-full h-4 border rounded mb-1 flex items-center px-1">
                            <div 
                              className={`w-2 h-2 bg-muted-foreground rounded ${
                                pos === 'left' ? 'mr-auto' : pos === 'center' ? 'mx-auto' : 'ml-auto'
                              }`}
                            />
                          </div>
                          <span className="text-[9px] capitalize">{pos}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>

                  <div className="pt-3 border-t space-y-3">
                    <Label className="text-xs font-semibold">Style Options</Label>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Highlight Amounts</Label>
                      <Switch
                        checked={editorSettings.highlightAmounts}
                        onCheckedChange={(v) => updateEditorSettings({ highlightAmounts: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Show Borders</Label>
                      <Switch
                        checked={editorSettings.showBorders}
                        onCheckedChange={(v) => updateEditorSettings({ showBorders: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Compact Mode</Label>
                      <Switch
                        checked={editorSettings.compactMode}
                        onCheckedChange={(v) => updateEditorSettings({ compactMode: v })}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="fields" className="mt-0 space-y-3 pb-4">
                  <Label className="text-xs font-semibold">Header Info</Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Company Logo</Label>
                      <Switch
                        checked={invoiceSettings.showCompanyLogo}
                        onCheckedChange={(v) => updateInvoiceSettings({ showCompanyLogo: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Company Address</Label>
                      <Switch
                        checked={invoiceSettings.showCompanyAddress}
                        onCheckedChange={(v) => updateInvoiceSettings({ showCompanyAddress: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Client Address</Label>
                      <Switch
                        checked={invoiceSettings.showClientAddress}
                        onCheckedChange={(v) => updateInvoiceSettings({ showClientAddress: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Project Name</Label>
                      <Switch
                        checked={invoiceSettings.showProjectName}
                        onCheckedChange={(v) => updateInvoiceSettings({ showProjectName: v })}
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t space-y-2">
                    <Label className="text-xs font-semibold">Invoice Details</Label>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Due Date</Label>
                      <Switch
                        checked={invoiceSettings.showDueDate}
                        onCheckedChange={(v) => updateInvoiceSettings({ showDueDate: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Payment Status</Label>
                      <Switch
                        checked={invoiceSettings.showPaymentStatus}
                        onCheckedChange={(v) => updateInvoiceSettings({ showPaymentStatus: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Next Payment Due</Label>
                      <Switch
                        checked={invoiceSettings.showNextPaymentDue}
                        onCheckedChange={(v) => updateInvoiceSettings({ showNextPaymentDue: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Tax/GST Line</Label>
                      <Switch
                        checked={invoiceSettings.showTaxGst}
                        onCheckedChange={(v) => updateInvoiceSettings({ showTaxGst: v })}
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t space-y-2">
                    <Label className="text-xs font-semibold">Extra Sections</Label>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Payment History</Label>
                      <Switch
                        checked={invoiceSettings.showPaymentHistory}
                        onCheckedChange={(v) => updateInvoiceSettings({ showPaymentHistory: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Terms & Conditions</Label>
                      <Switch
                        checked={invoiceSettings.showTermsConditions}
                        onCheckedChange={(v) => updateInvoiceSettings({ showTermsConditions: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Signature Area</Label>
                      <Switch
                        checked={invoiceSettings.showSignatureArea}
                        onCheckedChange={(v) => updateInvoiceSettings({ showSignatureArea: v })}
                      />
                    </div>
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>

          {/* Preview */}
          <div className="flex-1 bg-muted/30 overflow-auto p-4">
            <div 
              className="bg-white shadow-lg mx-auto max-w-[400px] min-h-[500px] p-4 text-xs rounded"
              style={getPreviewStyles()}
            >
              {/* Preview Header */}
              <div 
                className={`flex items-center mb-4 pb-3 ${
                  editorSettings.logoPlacement === 'center' ? 'flex-col text-center' : 
                  editorSettings.logoPlacement === 'right' ? 'flex-row-reverse' : 'flex-row'
                }`}
                style={{ borderBottom: editorSettings.showBorders ? `1px solid rgb(${currentTheme.colors.border.join(',')})` : 'none' }}
              >
                {invoiceSettings.showCompanyLogo && (
                  <div 
                    className={`w-10 h-10 rounded flex items-center justify-center text-white text-[8px] font-bold ${
                      editorSettings.logoPlacement === 'center' ? 'mb-2' : ''
                    }`}
                    style={getHeaderStyle()}
                  >
                    {invoiceData.companyLogo ? (
                      <img src={invoiceData.companyLogo} alt="Logo" className="w-full h-full object-contain rounded" />
                    ) : 'LOGO'}
                  </div>
                )}
                <div className={`flex-1 ${editorSettings.logoPlacement === 'right' ? 'text-left' : editorSettings.logoPlacement === 'center' ? 'text-center' : 'text-right'}`}>
                  <h1 className="text-sm font-bold">{invoiceData.companyName || 'Company Name'}</h1>
                  {invoiceSettings.showCompanyAddress && (
                    <p className="text-[9px]" style={{ color: `rgb(${currentTheme.colors.textSecondary.join(',')})` }}>
                      Company Address & Contact
                    </p>
                  )}
                </div>
              </div>

              {/* Client & Invoice Info */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="p-2 rounded" style={{ ...getCardStyle(), border: editorSettings.showBorders ? '1px solid' : 'none' }}>
                  <p className="text-[8px] font-medium mb-1" style={{ color: `rgb(${currentTheme.colors.textSecondary.join(',')})` }}>BILL TO</p>
                  <p className="font-semibold text-[10px]">{invoiceData.clientName}</p>
                  {invoiceSettings.showProjectName && (
                    <p className="text-[8px]" style={{ color: `rgb(${currentTheme.colors.textSecondary.join(',')})` }}>{invoiceData.projectName}</p>
                  )}
                </div>
                <div className="p-2 rounded" style={{ ...getCardStyle(), border: editorSettings.showBorders ? '1px solid' : 'none' }}>
                  <p className="text-[8px] font-medium mb-1" style={{ color: `rgb(${currentTheme.colors.textSecondary.join(',')})` }}>INVOICE</p>
                  <p className="font-semibold text-[10px]">{invoiceData.invoiceNumber}</p>
                  {invoiceSettings.showPaymentStatus && (
                    <p className="text-[8px] font-medium" style={{ color: invoiceData.status === 'paid' ? 'green' : 'orange' }}>
                      {invoiceData.status.toUpperCase()}
                    </p>
                  )}
                </div>
              </div>

              {/* Payment Summary */}
              <div className="mb-4 p-2 rounded" style={{ ...getCardStyle(), border: editorSettings.showBorders ? '1px solid' : 'none' }}>
                <p className="text-[8px] font-semibold mb-2">PAYMENT SUMMARY</p>
                <div className="space-y-1 text-[9px]">
                  <div className="flex justify-between">
                    <span>Total Amount</span>
                    <span style={getHighlightStyle()}>₹{invoiceData.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paid Amount</span>
                    <span style={getHighlightStyle()}>₹{invoiceData.paidAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1" style={{ borderColor: `rgb(${currentTheme.colors.border.join(',')})` }}>
                    <span>Remaining</span>
                    <span style={getHighlightStyle()}>₹{invoiceData.remainingAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Next Payment Due */}
              {invoiceSettings.showNextPaymentDue && invoiceData.remainingAmount > 0 && (
                <div className="mb-4 p-2 rounded border" style={{ borderColor: `rgb(${currentTheme.colors.accent.join(',')})` }}>
                  <p className="text-[8px] font-semibold">NEXT PAYMENT DUE</p>
                  <p className="text-[9px]" style={{ color: `rgb(${currentTheme.colors.textSecondary.join(',')})` }}>Date & Amount will appear here</p>
                </div>
              )}

              {/* Payment History Preview */}
              {invoiceSettings.showPaymentHistory && (
                <div className="mb-4">
                  <p className="text-[8px] font-semibold mb-1">PAYMENT HISTORY</p>
                  <div className="p-2 rounded text-[8px]" style={getCardStyle()}>
                    Payment records will appear here
                  </div>
                </div>
              )}

              {/* Signature */}
              {invoiceSettings.showSignatureArea && (
                <div className="flex justify-between mt-4 pt-3" style={{ borderTop: `1px solid rgb(${currentTheme.colors.border.join(',')})` }}>
                  <div className="text-center">
                    <div className="w-16 h-0.5 bg-gray-400 mb-1"></div>
                    <p className="text-[7px]">Customer</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-0.5 bg-gray-400 mb-1"></div>
                    <p className="text-[7px]">Authorized</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-3 border-t text-center">
          <p className="text-xs text-muted-foreground">Settings are automatically saved for future invoices</p>
        </div>
      </SheetContent>
    </Sheet>
  );
};