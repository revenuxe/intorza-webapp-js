import { useState, useEffect, useRef } from "react";
import { X, Download, Palette, Layout, Eye, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  PDF_THEMES, 
  PDFEditorSettings, 
  getEditorSettings, 
  saveEditorSettings, 
  defaultEditorSettings,
  getThemeById,
  rgbToHex,
  PDFTheme
} from "@/lib/pdfThemes";
import { QuotationSettings } from "./CustomizeFieldsDrawer";

interface PDFPreviewEditorProps {
  open: boolean;
  onClose: () => void;
  onDownload: (settings: PDFEditorSettings) => void;
  quotationData: {
    quotationTitle: string;
    clientName: string;
    clientAddress: string;
    dateOfProposal: string;
    sections: any[];
    subtotal: number;
    grandTotal: number;
    companyName?: string;
    companyLogo?: string;
  };
  customizeSettings: QuotationSettings;
}

export const PDFPreviewEditor = ({
  open,
  onClose,
  onDownload,
  quotationData,
  customizeSettings
}: PDFPreviewEditorProps) => {
  const [editorSettings, setEditorSettings] = useState<PDFEditorSettings>(getEditorSettings());
  const [activeTab, setActiveTab] = useState("themes");
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setEditorSettings(getEditorSettings());
    }
  }, [open]);

  const updateSettings = (updates: Partial<PDFEditorSettings>) => {
    const newSettings = { ...editorSettings, ...updates };
    setEditorSettings(newSettings);
    saveEditorSettings(newSettings);
  };

  const handleReset = () => {
    setEditorSettings(defaultEditorSettings);
    saveEditorSettings(defaultEditorSettings);
  };

  const handleDownload = () => {
    onDownload(editorSettings);
    onClose();
  };

  const currentTheme = getThemeById(editorSettings.theme);

  // Preview rendering helpers
  const getPreviewStyles = () => {
    const theme = currentTheme;
    return {
      background: `rgb(${theme.colors.background.join(',')})`,
      color: `rgb(${theme.colors.text.join(',')})`,
      borderColor: `rgb(${theme.colors.border.join(',')})`,
    };
  };

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
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">PDF Preview & Editor</DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Editor Controls */}
          <div className="w-80 border-r flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="grid grid-cols-3 m-4">
                <TabsTrigger value="themes" className="text-xs">
                  <Palette className="h-3 w-3 mr-1" />
                  Themes
                </TabsTrigger>
                <TabsTrigger value="layout" className="text-xs">
                  <Layout className="h-3 w-3 mr-1" />
                  Layout
                </TabsTrigger>
                <TabsTrigger value="style" className="text-xs">
                  <Eye className="h-3 w-3 mr-1" />
                  Style
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 px-4">
                <TabsContent value="themes" className="mt-0 space-y-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Select Theme</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {PDF_THEMES.map((theme) => (
                        <button
                          key={theme.id}
                          onClick={() => updateSettings({ theme: theme.id })}
                          className={`relative p-3 rounded-lg border-2 transition-all text-left ${
                            editorSettings.theme === theme.id 
                              ? 'border-primary ring-2 ring-primary/20' 
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          {editorSettings.theme === theme.id && (
                            <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                              <Check className="h-3 w-3 text-primary-foreground" />
                            </div>
                          )}
                          <div 
                            className="w-full h-8 rounded mb-2 flex overflow-hidden"
                            style={{ backgroundColor: `rgb(${theme.colors.headerBg.join(',')})` }}
                          >
                            <div 
                              className="w-1/3 h-full"
                              style={{ backgroundColor: `rgb(${theme.colors.highlight.join(',')})` }}
                            />
                          </div>
                          <p className="text-xs font-medium truncate">{theme.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{theme.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Color Overrides */}
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-sm font-semibold">Custom Colors (Optional)</Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Highlight Color</Label>
                        <Input
                          type="color"
                          value={editorSettings.customColors?.highlight || rgbToHex(...currentTheme.colors.highlight)}
                          onChange={(e) => updateSettings({
                            customColors: { ...editorSettings.customColors, highlight: e.target.value }
                          })}
                          className="w-12 h-8 p-1 cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Accent Color</Label>
                        <Input
                          type="color"
                          value={editorSettings.customColors?.accent || rgbToHex(...currentTheme.colors.accent)}
                          onChange={(e) => updateSettings({
                            customColors: { ...editorSettings.customColors, accent: e.target.value }
                          })}
                          className="w-12 h-8 p-1 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="layout" className="mt-0 space-y-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Logo Placement</Label>
                    <RadioGroup
                      value={editorSettings.logoPlacement}
                      onValueChange={(v) => updateSettings({ logoPlacement: v as 'left' | 'center' | 'right' })}
                      className="grid grid-cols-3 gap-2"
                    >
                      {['left', 'center', 'right'].map((pos) => (
                        <div key={pos}>
                          <RadioGroupItem value={pos} id={`logo-${pos}`} className="peer sr-only" />
                          <Label
                            htmlFor={`logo-${pos}`}
                            className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                          >
                            <div className="w-full h-6 border rounded mb-1 flex items-center px-1">
                              <div 
                                className={`w-3 h-3 bg-muted-foreground rounded ${
                                  pos === 'left' ? 'mr-auto' : pos === 'center' ? 'mx-auto' : 'ml-auto'
                                }`}
                              />
                            </div>
                            <span className="text-[10px] capitalize">{pos}</span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-sm font-semibold">Layout Options</Label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Compact Mode</Label>
                        <Switch
                          checked={editorSettings.compactMode}
                          onCheckedChange={(v) => updateSettings({ compactMode: v })}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Reduces spacing for more content per page
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="style" className="mt-0 space-y-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Visual Options</Label>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm">Highlight Amounts</Label>
                          <p className="text-xs text-muted-foreground">
                            Apply background color to prices
                          </p>
                        </div>
                        <Switch
                          checked={editorSettings.highlightAmounts}
                          onCheckedChange={(v) => updateSettings({ highlightAmounts: v })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm">Show Borders</Label>
                          <p className="text-xs text-muted-foreground">
                            Display borders around cards
                          </p>
                        </div>
                        <Switch
                          checked={editorSettings.showBorders}
                          onCheckedChange={(v) => updateSettings({ showBorders: v })}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>

            <div className="p-4 border-t">
              <p className="text-xs text-muted-foreground text-center">
                Settings are automatically saved
              </p>
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="flex-1 bg-muted/30 overflow-auto p-6">
            <div 
              ref={previewRef}
              className="bg-white shadow-lg mx-auto max-w-[595px] min-h-[842px] p-8 text-sm"
              style={getPreviewStyles()}
            >
              {/* Preview Header */}
              <div 
                className={`flex items-center mb-6 pb-4 ${
                  editorSettings.logoPlacement === 'center' ? 'flex-col text-center' : 
                  editorSettings.logoPlacement === 'right' ? 'flex-row-reverse' : 'flex-row'
                }`}
                style={{ borderBottom: editorSettings.showBorders ? `2px solid rgb(${currentTheme.colors.border.join(',')})` : 'none' }}
              >
                {/* Logo placeholder */}
                {customizeSettings.showCompanyLogo && (
                  <div 
                    className={`w-16 h-16 rounded flex items-center justify-center text-white text-xs font-bold ${
                      editorSettings.logoPlacement === 'center' ? 'mb-3' : ''
                    }`}
                    style={getHeaderStyle()}
                  >
                    {quotationData.companyLogo ? (
                      <img src={quotationData.companyLogo} alt="Logo" className="w-full h-full object-contain rounded" />
                    ) : 'LOGO'}
                  </div>
                )}
                <div className={`flex-1 ${editorSettings.logoPlacement === 'right' ? 'text-left' : editorSettings.logoPlacement === 'center' ? 'text-center' : 'text-right'}`}>
                  <h1 className="text-lg font-bold" style={{ color: `rgb(${currentTheme.colors.text.join(',')})` }}>
                    {quotationData.companyName || 'Company Name'}
                  </h1>
                  {customizeSettings.showCompanyAddress && (
                    <p className="text-xs" style={{ color: `rgb(${currentTheme.colors.textSecondary.join(',')})` }}>
                      Company Address & Contact
                    </p>
                  )}
                </div>
              </div>

              {/* Client & Project Cards */}
              {customizeSettings.showProjectDetails && (
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div 
                    className="p-3 rounded"
                    style={{ ...getCardStyle(), border: editorSettings.showBorders ? '1px solid' : 'none' }}
                  >
                    <p className="text-[10px] font-medium mb-1" style={{ color: `rgb(${currentTheme.colors.textSecondary.join(',')})` }}>
                      QUOTATION FOR
                    </p>
                    <p className="font-semibold text-xs">{quotationData.clientName || 'Client Name'}</p>
                    {customizeSettings.showClientAddress && (
                      <p className="text-[10px]" style={{ color: `rgb(${currentTheme.colors.textSecondary.join(',')})` }}>
                        {quotationData.clientAddress || 'Client Address'}
                      </p>
                    )}
                  </div>
                  <div 
                    className="p-3 rounded"
                    style={{ ...getCardStyle(), border: editorSettings.showBorders ? '1px solid' : 'none' }}
                  >
                    <p className="text-[10px] font-medium mb-1" style={{ color: `rgb(${currentTheme.colors.textSecondary.join(',')})` }}>
                      PROJECT DETAILS
                    </p>
                    <div className="space-y-1 text-[10px]">
                      {customizeSettings.showDateOfProposal && <p>Date: {quotationData.dateOfProposal || 'DD/MM/YYYY'}</p>}
                      <p>Project: {quotationData.quotationTitle || 'Project Name'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sample Table */}
              <div className="mb-6">
                <div 
                  className="text-xs font-bold mb-2 pb-1"
                  style={{ borderBottom: `2px solid rgb(${currentTheme.colors.accent.join(',')})` }}
                >
                  SAMPLE SECTION
                </div>
                <table className="w-full text-[10px]" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: `rgb(${currentTheme.colors.cardBackground.join(',')})` }}>
                      {customizeSettings.showSideColumn && <th className="p-2 text-left border" style={{ borderColor: `rgb(${currentTheme.colors.border.join(',')})` }}>Side</th>}
                      <th className="p-2 text-left border" style={{ borderColor: `rgb(${currentTheme.colors.border.join(',')})` }}>Product</th>
                      {customizeSettings.showProductDetails && <th className="p-2 text-left border" style={{ borderColor: `rgb(${currentTheme.colors.border.join(',')})` }}>Details</th>}
                      {customizeSettings.showDetailedSizeColumns && (
                        <>
                          <th className="p-2 text-center border" style={{ borderColor: `rgb(${currentTheme.colors.border.join(',')})` }}>W</th>
                          <th className="p-2 text-center border" style={{ borderColor: `rgb(${currentTheme.colors.border.join(',')})` }}>H</th>
                          <th className="p-2 text-center border" style={{ borderColor: `rgb(${currentTheme.colors.border.join(',')})` }}>Sq.Ft</th>
                        </>
                      )}
                      <th className="p-2 text-right border" style={{ borderColor: `rgb(${currentTheme.colors.border.join(',')})` }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {customizeSettings.showSideColumn && <td className="p-2 border" style={{ borderColor: `rgb(${currentTheme.colors.border.join(',')})` }}>A</td>}
                      <td className="p-2 border font-medium" style={{ borderColor: `rgb(${currentTheme.colors.border.join(',')})` }}>Sample Product</td>
                      {customizeSettings.showProductDetails && <td className="p-2 border" style={{ borderColor: `rgb(${currentTheme.colors.border.join(',')})` }}>Description here</td>}
                      {customizeSettings.showDetailedSizeColumns && (
                        <>
                          <td className="p-2 text-center border" style={{ borderColor: `rgb(${currentTheme.colors.border.join(',')})` }}>3.0</td>
                          <td className="p-2 text-center border" style={{ borderColor: `rgb(${currentTheme.colors.border.join(',')})` }}>2.5</td>
                          <td className="p-2 text-center border" style={{ borderColor: `rgb(${currentTheme.colors.border.join(',')})` }}>7.5</td>
                        </>
                      )}
                      <td className="p-2 text-right border" style={{ borderColor: `rgb(${currentTheme.colors.border.join(',')})` }}>
                        <span style={getHighlightStyle()}>INR 15,000</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Summary Preview */}
              <div className="mt-4">
                <p className="text-xs font-bold mb-2">PAYMENT SUMMARY</p>
                <div className="space-y-1 text-[10px]">
                  {customizeSettings.showSubtotal && (
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span style={getHighlightStyle()}>INR {quotationData.subtotal?.toLocaleString('en-IN') || '0'}</span>
                    </div>
                  )}
                  {customizeSettings.showGrandTotal && (
                    <div className="flex justify-between font-bold pt-1 border-t" style={{ borderColor: `rgb(${currentTheme.colors.border.join(',')})` }}>
                      <span>GRAND TOTAL</span>
                      <span style={getHighlightStyle()}>INR {quotationData.grandTotal?.toLocaleString('en-IN') || '0'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Signature Preview */}
              {customizeSettings.showSignatureArea && (
                <div className="mt-8 pt-4 border-t grid grid-cols-2 gap-8" style={{ borderColor: `rgb(${currentTheme.colors.border.join(',')})` }}>
                  <div className="text-center">
                    <div className="border-b border-dashed mb-1 h-8" style={{ borderColor: `rgb(${currentTheme.colors.border.join(',')})` }}></div>
                    <p className="text-[10px]">Client Signature</p>
                  </div>
                  <div className="text-center">
                    <div className="border-b border-dashed mb-1 h-8" style={{ borderColor: `rgb(${currentTheme.colors.border.join(',')})` }}></div>
                    <p className="text-[10px]">Authorized Signature</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
