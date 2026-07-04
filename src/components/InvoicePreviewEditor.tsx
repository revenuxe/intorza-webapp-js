import { useState, useEffect, useRef, useCallback } from "react";
import { Download, Palette, Layout, Eye, RotateCcw, Check, Settings2, ArrowLeft, Sparkles, Frame, Flower2, Shapes, Crown, FileText, Wand2, CircleDot, Search, Type, Sliders, Loader2, ZoomIn, ZoomOut, Copy, ChevronLeft, ChevronRight, MoveHorizontal } from "lucide-react";
import { generateInvoicePDF } from "@/lib/invoicePdfGenerator";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  PDF_THEMES, 
  PDFEditorSettings, 
  getEditorSettings, 
  saveEditorSettings, 
  defaultEditorSettings,
  getThemeById,
  getThemesByCategory,
  getAllThemes,
  rgbToHex,
  PDFTheme,
  PDF_FONTS,
  getFontById,
  getHeadingFonts,
  getBodyFonts,
  InvoiceSettings,
  getInvoiceSettings,
  saveInvoiceSettings,
  defaultInvoiceSettings,
  applyBrandColorsToTheme,
} from "@/lib/pdfThemes";
import { CustomThemeBuilder } from "./CustomThemeBuilder";
import { FontPreviewPanel } from "./FontPreviewPanel";
import { PDFCanvasPreview } from "./PDFCanvasPreview";
import { useFontPreferences } from "@/hooks/useFontPreferences";
import { supabase } from "@/integrations/supabase/client";

interface BrandColors {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  text?: string;
}

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

type ThemeCategory = 'all' | 'minimal' | 'professional' | 'luxury' | 'floral' | 'abstract' | 'decoration';
type FontCategory = 'all' | 'serif' | 'sans-serif' | 'display' | 'monospace';

const CATEGORY_CONFIG: { value: ThemeCategory; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'All', icon: Palette },
  { value: 'minimal', label: 'Minimal', icon: FileText },
  { value: 'professional', label: 'Professional', icon: FileText },
  { value: 'luxury', label: 'Luxury', icon: Crown },
  { value: 'floral', label: 'Floral', icon: Flower2 },
  { value: 'abstract', label: 'Abstract', icon: Shapes },
  { value: 'decoration', label: 'Decoration', icon: Frame },
];

const FONT_CATEGORY_CONFIG: { value: FontCategory; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'sans-serif', label: 'Sans-Serif' },
  { value: 'serif', label: 'Serif' },
  { value: 'display', label: 'Display' },
  { value: 'monospace', label: 'Monospace' },
];

// Key for storing "use quotation design" preference
const USE_QUOTATION_DESIGN_KEY = 'invoice-use-quotation-design';

export const InvoicePreviewEditor = ({
  open,
  onClose,
  onDownload,
  invoiceData
}: InvoicePreviewEditorProps) => {
  const [editorSettings, setEditorSettings] = useState<PDFEditorSettings>(getEditorSettings());
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>(getInvoiceSettings());
  const [activeTab, setActiveTab] = useState("themes");
  const [showEditor, setShowEditor] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ThemeCategory>('all');
  const [selectedFontCategory, setSelectedFontCategory] = useState<FontCategory>('all');
  const [fontSearchQuery, setFontSearchQuery] = useState('');
  const [showThemeBuilder, setShowThemeBuilder] = useState(false);
  const [brandColors, setBrandColors] = useState<BrandColors | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(100);
  const [fitWidth, setFitWidth] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [activePage, setActivePage] = useState(0);
  const [useQuotationDesign, setUseQuotationDesign] = useState(() => {
    try { return localStorage.getItem(USE_QUOTATION_DESIGN_KEY) === 'true'; } catch { return false; }
  });
  const [profile, setProfile] = useState<any>(null);
  const canvasRef = useRef<import('./PDFCanvasPreview').PDFCanvasPreviewHandle | null>(null);
  const pdfGenerationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pdfGenerationIdRef = useRef(0);
  const latestPreviewPayloadRef = useRef("");
  const prevBlobUrlRef = useRef<string | null>(null);
  
  const { preferences: fontPreferences, updatePreferences: saveFontPreferences } = useFontPreferences();

  // Load brand colors and profile
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (data) {
          setProfile(data);
          if (data.brand_colors && typeof data.brand_colors === 'object') {
            const colors = data.brand_colors as unknown as BrandColors;
            if (colors.primary) setBrandColors(colors);
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (open) {
      const savedSettings = getEditorSettings();
      setEditorSettings({
        ...savedSettings,
        headingFont: fontPreferences.headingFont || savedSettings.headingFont || 'times',
        bodyFont: fontPreferences.bodyFont || savedSettings.bodyFont || 'helvetica',
        brandColors: brandColors || savedSettings.brandColors,
      });
      setInvoiceSettings(getInvoiceSettings());
      setShowEditor(false);
    } else {
      if (prevBlobUrlRef.current) {
        URL.revokeObjectURL(prevBlobUrlRef.current);
        prevBlobUrlRef.current = null;
      }
      setPdfBlobUrl(null);
    }
  }, [open, fontPreferences, brandColors]);

  // Handle "use quotation design" toggle
  const handleUseQuotationDesign = (checked: boolean) => {
    setUseQuotationDesign(checked);
    try { localStorage.setItem(USE_QUOTATION_DESIGN_KEY, String(checked)); } catch {}
    if (checked) {
      // Load quotation editor settings (they share the same storage key)
      const quotationSettings = getEditorSettings();
      setEditorSettings(quotationSettings);
    }
  };

  const updateSettings = (updates: Partial<PDFEditorSettings>) => {
    const newSettings = { ...editorSettings, ...updates };
    setEditorSettings(newSettings);
    saveEditorSettings(newSettings);
    if (updates.headingFont || updates.bodyFont) {
      saveFontPreferences({
        headingFont: updates.headingFont || editorSettings.headingFont || 'times',
        bodyFont: updates.bodyFont || editorSettings.bodyFont || 'helvetica',
      });
    }
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
    setUseQuotationDesign(false);
    try { localStorage.removeItem(USE_QUOTATION_DESIGN_KEY); } catch {}
  };

  const handleDownload = () => {
    const downloadSettings: PDFEditorSettings = {
      ...editorSettings,
      brandColors: editorSettings.useBrandColors && brandColors ? brandColors : editorSettings.brandColors,
    };
    onDownload(downloadSettings, invoiceSettings);
    onClose();
  };

  const currentTheme = (() => {
    let theme = getThemeById(editorSettings.theme);
    if (editorSettings.useBrandColors && editorSettings.brandColors) {
      theme = applyBrandColorsToTheme(theme, editorSettings.brandColors);
    }
    return theme;
  })();

  const getFilteredThemes = (): PDFTheme[] => {
    if (selectedCategory === 'all') return getAllThemes();
    return getThemesByCategory(selectedCategory);
  };

  // Generate live PDF preview from a debounced snapshot, keeping the UI inputs instant.
  const generateLivePdf = useCallback(async (
    editorSnapshot: PDFEditorSettings,
    invoiceSnapshot: InvoiceSettings,
    jobId: number
  ) => {
    setIsGeneratingPdf(true);
    try {
      const currentEditorSettings: PDFEditorSettings = {
        ...editorSnapshot,
        brandColors: editorSnapshot.useBrandColors && brandColors ? brandColors : editorSnapshot.brandColors,
      };

      const pdfDoc = await generateInvoicePDF({
        invoiceNumber: invoiceData.invoiceNumber || 'INV-001',
        invoiceDate: new Date().toLocaleDateString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        clientName: invoiceData.clientName || 'Client Name',
        projectName: invoiceData.projectName || 'Project Name',
        totalAmount: invoiceData.totalAmount || 100000,
        paidAmount: invoiceData.paidAmount || 50000,
        remainingAmount: invoiceData.remainingAmount || 50000,
        status: invoiceData.status || 'partially_paid',
        notes: 'Thank you for your business!',
        payments: [
          { amount: invoiceData.paidAmount || 50000, payment_date: new Date().toLocaleDateString(), payment_method: 'Bank Transfer', notes: 'First payment' },
        ],
        profile: profile || {
          company_name: invoiceData.companyName || 'Your Company',
          logo_url: invoiceData.companyLogo,
        },
        localization: profile ? {
          currencyCode: profile.currency_code || 'INR',
          currencySymbol: profile.currency_symbol || '₹',
          locale: profile.locale || 'en-IN',
          taxLabel: profile.tax_label || 'GST',
          taxRegistrationLabel: profile.tax_label === 'GST' ? 'GSTIN' : `${profile.tax_label || 'Tax'} No`,
        } : undefined,
        editorSettings: currentEditorSettings,
        invoiceSettings: invoiceSnapshot,
        previewOnly: true,
      });

      if (!pdfDoc) throw new Error('Failed to generate PDF');
      if (jobId !== pdfGenerationIdRef.current) return;
      const blob = pdfDoc.output('blob');
      const oldBlobUrl = prevBlobUrlRef.current;
      const newBlobUrl = URL.createObjectURL(blob);
      prevBlobUrlRef.current = newBlobUrl;
      setPdfBlobUrl(newBlobUrl);
      if (oldBlobUrl) {
        window.setTimeout(() => URL.revokeObjectURL(oldBlobUrl), 3000);
      }
    } catch (error) {
      console.error('Error generating live invoice PDF preview:', error);
    } finally {
      if (jobId === pdfGenerationIdRef.current) setIsGeneratingPdf(false);
    }
  }, [invoiceData, brandColors, profile]);

  // Debounced incremental preview pipeline. Changes persist immediately while
  // only the latest snapshot regenerates the heavy PDF preview.
  useEffect(() => {
    if (!open) return;

    const payload = JSON.stringify({ editorSettings, invoiceSettings, invoiceData, brandColors, profile });
    if (payload === latestPreviewPayloadRef.current && pdfBlobUrl) return;
    latestPreviewPayloadRef.current = payload;

    if (pdfGenerationTimer.current) clearTimeout(pdfGenerationTimer.current);
    const jobId = ++pdfGenerationIdRef.current;
    const editorSnapshot = editorSettings;
    const invoiceSnapshot = invoiceSettings;
    const debounceMs = pdfBlobUrl ? 500 : 80;
    setIsGeneratingPdf(true);
    pdfGenerationTimer.current = setTimeout(() => {
      void generateLivePdf(editorSnapshot, invoiceSnapshot, jobId);
    }, debounceMs);
    return () => { if (pdfGenerationTimer.current) clearTimeout(pdfGenerationTimer.current); };
  }, [open, editorSettings, invoiceSettings, invoiceData, brandColors, profile, pdfBlobUrl, generateLivePdf]);

  // Editor Panel
  const EditorPanel = () => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Use Quotation Design Checkbox */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <label className="flex items-center gap-3 cursor-pointer">
          <Checkbox
            checked={useQuotationDesign}
            onCheckedChange={(checked) => handleUseQuotationDesign(checked === true)}
          />
          <div className="flex-1">
            <span className="text-sm font-medium flex items-center gap-1.5">
              <Copy className="h-3.5 w-3.5 text-primary" />
              Use Quotation Design
            </span>
            <p className="text-[10px] text-muted-foreground">Apply same theme & layout as quotation PDF</p>
          </div>
        </label>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid grid-cols-5 m-4 flex-shrink-0">
          <TabsTrigger value="themes" className="text-xs">
            <Palette className="h-3 w-3 mr-1" />
            Themes
          </TabsTrigger>
          <TabsTrigger value="decor" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            Decor
          </TabsTrigger>
          <TabsTrigger value="layout" className="text-xs">
            <Layout className="h-3 w-3 mr-1" />
            Layout
          </TabsTrigger>
          <TabsTrigger value="style" className="text-xs">
            <Eye className="h-3 w-3 mr-1" />
            Style
          </TabsTrigger>
          <TabsTrigger value="fields" className="text-xs">
            <Sliders className="h-3 w-3 mr-1" />
            Fields
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0 overflow-auto px-4">
          {/* THEMES TAB */}
          <TabsContent value="themes" className="mt-0 space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Category</Label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_CONFIG.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`px-2.5 py-1.5 rounded-full text-[10px] font-medium transition-all flex items-center gap-1 ${
                      selectedCategory === cat.value
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    }`}
                  >
                    <cat.icon className="h-3 w-3" />
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <Button variant="outline" size="sm" className="w-full mb-3" onClick={() => setShowThemeBuilder(true)}>
              <Wand2 className="h-4 w-4 mr-2" />
              Create Custom Theme
            </Button>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Select Theme</Label>
                <span className="text-xs text-muted-foreground">{getFilteredThemes().length} themes</span>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                {getFilteredThemes().map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => updateSettings({ theme: theme.id })}
                    className={`relative p-2.5 rounded-lg border-2 transition-all text-left ${
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
                    <div className="relative w-full h-10 rounded mb-1.5 overflow-hidden border"
                      style={{ 
                        backgroundColor: `rgb(${theme.colors.background.join(',')})`,
                        borderColor: theme.decorations.showPageBorder 
                          ? `rgb(${(theme.colors.decorationPrimary || theme.colors.accent).join(',')})` 
                          : `rgb(${theme.colors.border.join(',')})`
                      }}
                    >
                      <div className="h-3 w-full" style={{ backgroundColor: `rgb(${theme.colors.headerBg.join(',')})` }} />
                      <div className="absolute bottom-1 right-1 w-4 h-2 rounded-sm" style={{ backgroundColor: `rgb(${theme.colors.highlight.join(',')})` }} />
                      {theme.decorations.showCornerOrnaments && (
                        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 rounded-tl" style={{ borderColor: `rgb(${(theme.colors.decorationPrimary || theme.colors.accent).join(',')})` }} />
                      )}
                    </div>
                    <p className="text-[10px] font-medium truncate">{theme.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{theme.category}</span>
                      {theme.decorations.showPageBorder && <Frame className="h-2.5 w-2.5 text-muted-foreground" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Brand Colors */}
            {brandColors && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <CircleDot className="h-4 w-4 text-primary" />
                      Use Brand Colors
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Apply your saved brand palette</p>
                  </div>
                  <Switch
                    checked={editorSettings.useBrandColors || false}
                    onCheckedChange={(v) => updateSettings({ useBrandColors: v, brandColors: brandColors })}
                  />
                </div>
                {editorSettings.useBrandColors && (
                  <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full border shadow-sm" style={{ backgroundColor: brandColors.primary }} />
                      <div className="w-6 h-6 rounded-full border shadow-sm" style={{ backgroundColor: brandColors.secondary }} />
                      <div className="w-6 h-6 rounded-full border shadow-sm" style={{ backgroundColor: brandColors.accent }} />
                      <span className="text-xs text-muted-foreground ml-2">Your brand palette</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Custom Colors */}
            <div className="space-y-3 pt-4 border-t">
              <Label className="text-sm font-semibold">Custom Colors (Optional)</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Highlight Color</Label>
                  <Input type="color" value={editorSettings.customColors?.highlight || rgbToHex(...currentTheme.colors.highlight)} onChange={(e) => updateSettings({ customColors: { ...editorSettings.customColors, highlight: e.target.value } })} className="w-12 h-8 p-1 cursor-pointer" />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Accent Color</Label>
                  <Input type="color" value={editorSettings.customColors?.accent || rgbToHex(...currentTheme.colors.accent)} onChange={(e) => updateSettings({ customColors: { ...editorSettings.customColors, accent: e.target.value } })} className="w-12 h-8 p-1 cursor-pointer" />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* DECORATIONS TAB */}
          <TabsContent value="decor" className="mt-0 space-y-4 pb-4">
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Decoration Settings</Label>
              <p className="text-xs text-muted-foreground">Enable decorative elements for an elegant PDF.</p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <Label className="text-sm font-medium">Enable Decorations</Label>
                <p className="text-xs text-muted-foreground">Show borders, ornaments & dividers</p>
              </div>
              <Switch checked={editorSettings.showDecorations} onCheckedChange={(v) => updateSettings({ showDecorations: v })} />
            </div>

            {editorSettings.showDecorations && (
              <>
                <div className="space-y-3 pt-2">
                  <Label className="text-sm font-semibold">Decoration Intensity</Label>
                  <Select value={editorSettings.decorationIntensity} onValueChange={(v) => updateSettings({ decorationIntensity: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subtle">Subtle</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="bold">Bold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <Label className="text-sm font-semibold">Decoration Elements</Label>
                  <div className="flex items-center justify-between">
                    <div><Label className="text-sm">Page Border</Label><p className="text-xs text-muted-foreground">Decorative border around pages</p></div>
                    <Switch checked={editorSettings.showPageBorder} onCheckedChange={(v) => updateSettings({ showPageBorder: v })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div><Label className="text-sm">Corner Ornaments</Label><p className="text-xs text-muted-foreground">Decorative corners</p></div>
                    <Switch checked={editorSettings.showCornerOrnaments} onCheckedChange={(v) => updateSettings({ showCornerOrnaments: v })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div><Label className="text-sm">Section Dividers</Label><p className="text-xs text-muted-foreground">Decorative lines between sections</p></div>
                    <Switch checked={editorSettings.showSectionDividers} onCheckedChange={(v) => updateSettings({ showSectionDividers: v })} />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Label className="text-sm font-semibold mb-2 block">Current Theme Decorations</Label>
                  <div className="p-3 rounded-lg bg-muted/50 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs"><span className="text-muted-foreground">Border:</span><span className="font-medium capitalize">{currentTheme.decorations.borderStyle}</span></div>
                    <div className="flex items-center gap-2 text-xs"><span className="text-muted-foreground">Corner:</span><span className="font-medium capitalize">{currentTheme.decorations.cornerStyle}</span></div>
                    <div className="flex items-center gap-2 text-xs"><span className="text-muted-foreground">Divider:</span><span className="font-medium capitalize">{currentTheme.decorations.dividerStyle}</span></div>
                    <div className="flex items-center gap-2 text-xs"><span className="text-muted-foreground">Header:</span><span className="font-medium capitalize">{currentTheme.decorations.headerDecoration}</span></div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* LAYOUT TAB */}
          <TabsContent value="layout" className="mt-0 space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Logo Placement</Label>
              <RadioGroup value={editorSettings.logoPlacement} onValueChange={(v) => updateSettings({ logoPlacement: v as any })} className="grid grid-cols-3 gap-2">
                {['left', 'center', 'right'].map((pos) => (
                  <div key={pos}>
                    <RadioGroupItem value={pos} id={`inv-logo-${pos}`} className="peer sr-only" />
                    <Label htmlFor={`inv-logo-${pos}`} className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer">
                      <div className="w-full h-6 border rounded mb-1 flex items-center px-1">
                        <div className={`w-3 h-3 bg-muted-foreground rounded ${pos === 'left' ? 'mr-auto' : pos === 'center' ? 'mx-auto' : 'ml-auto'}`} />
                      </div>
                      <span className="text-[10px] capitalize">{pos}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <Label className="text-sm font-semibold">Layout Options</Label>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Compact Mode</Label>
                <Switch checked={editorSettings.compactMode} onCheckedChange={(v) => updateSettings({ compactMode: v })} />
              </div>
              <p className="text-xs text-muted-foreground">Reduces spacing for more content per page</p>
            </div>
          </TabsContent>

          {/* STYLE TAB */}
          <TabsContent value="style" className="mt-0 space-y-4 pb-4">
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Visual Options</Label>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div><Label className="text-sm">Highlight Amounts</Label><p className="text-xs text-muted-foreground">Apply background color to prices</p></div>
                  <Switch checked={editorSettings.highlightAmounts} onCheckedChange={(v) => updateSettings({ highlightAmounts: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <div><Label className="text-sm">Show Borders</Label><p className="text-xs text-muted-foreground">Display borders around cards</p></div>
                  <Switch checked={editorSettings.showBorders} onCheckedChange={(v) => updateSettings({ showBorders: v })} />
                </div>
              </div>
            </div>

            {/* Font Selection */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4 text-primary" />
                <Label className="text-sm font-semibold">Font Selection</Label>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search fonts..." value={fontSearchQuery} onChange={(e) => setFontSearchQuery(e.target.value)} className="pl-9" />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {FONT_CATEGORY_CONFIG.map((cat) => (
                  <button key={cat.value} onClick={() => setSelectedFontCategory(cat.value)} className={`px-2.5 py-1.5 rounded-full text-[10px] font-medium transition-all ${selectedFontCategory === cat.value ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted hover:bg-muted/80 text-muted-foreground'}`}>
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Heading Font</Label>
                <div className="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {PDF_FONTS
                    .filter(f => f.recommended === 'heading' || f.recommended === 'both')
                    .filter(f => selectedFontCategory === 'all' || f.category === selectedFontCategory)
                    .filter(f => fontSearchQuery === '' || f.name.toLowerCase().includes(fontSearchQuery.toLowerCase()))
                    .map((font) => (
                      <button key={font.id} onClick={() => updateSettings({ headingFont: font.id })} className={`p-2 rounded-md border text-left transition-all ${editorSettings.headingFont === font.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:border-primary/50'}`}>
                        <p className="text-xs font-medium truncate">{font.name}</p>
                        <p className="text-[9px] text-muted-foreground truncate">{font.description}</p>
                      </button>
                    ))
                  }
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Body Font</Label>
                <div className="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {PDF_FONTS
                    .filter(f => f.recommended === 'body' || f.recommended === 'both')
                    .filter(f => selectedFontCategory === 'all' || f.category === selectedFontCategory)
                    .filter(f => fontSearchQuery === '' || f.name.toLowerCase().includes(fontSearchQuery.toLowerCase()))
                    .map((font) => (
                      <button key={font.id} onClick={() => updateSettings({ bodyFont: font.id })} className={`p-2 rounded-md border text-left transition-all ${editorSettings.bodyFont === font.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:border-primary/50'}`}>
                        <p className="text-xs font-medium truncate">{font.name}</p>
                        <p className="text-[9px] text-muted-foreground truncate">{font.description}</p>
                      </button>
                    ))
                  }
                </div>
              </div>

              <FontPreviewPanel headingFont={editorSettings.headingFont || 'times'} bodyFont={editorSettings.bodyFont || 'helvetica'} />
            </div>

            <div className="space-y-3 pt-4 border-t">
              <Label className="text-sm font-semibold">Font Size</Label>
              <Select value={editorSettings.fontSize} onValueChange={(v) => updateSettings({ fontSize: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <Label className="text-sm font-semibold">Summary Position</Label>
              <Select value={editorSettings.summaryStyle} onValueChange={(v) => updateSettings({ summaryStyle: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="right">Right Aligned</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="full-width">Full Width</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <Label className="text-sm font-semibold">Page Margins</Label>
              <Select value={editorSettings.pageMargins} onValueChange={(v) => updateSettings({ pageMargins: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="narrow">Narrow</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="wide">Wide</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* FIELDS TAB */}
          <TabsContent value="fields" className="mt-0 space-y-3 pb-4">
            <Label className="text-xs font-semibold">Header Info</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label className="text-xs">Company Logo</Label><Switch checked={invoiceSettings.showCompanyLogo} onCheckedChange={(v) => updateInvoiceSettings({ showCompanyLogo: v })} /></div>
              <div className="flex items-center justify-between"><Label className="text-xs">Company Address</Label><Switch checked={invoiceSettings.showCompanyAddress} onCheckedChange={(v) => updateInvoiceSettings({ showCompanyAddress: v })} /></div>
              <div className="flex items-center justify-between"><Label className="text-xs">Client Address</Label><Switch checked={invoiceSettings.showClientAddress} onCheckedChange={(v) => updateInvoiceSettings({ showClientAddress: v })} /></div>
              <div className="flex items-center justify-between"><Label className="text-xs">Project Name</Label><Switch checked={invoiceSettings.showProjectName} onCheckedChange={(v) => updateInvoiceSettings({ showProjectName: v })} /></div>
            </div>

            <div className="pt-3 border-t space-y-2">
              <Label className="text-xs font-semibold">Invoice Details</Label>
              <div className="flex items-center justify-between"><Label className="text-xs">Due Date</Label><Switch checked={invoiceSettings.showDueDate} onCheckedChange={(v) => updateInvoiceSettings({ showDueDate: v })} /></div>
              <div className="flex items-center justify-between"><Label className="text-xs">Payment Status</Label><Switch checked={invoiceSettings.showPaymentStatus} onCheckedChange={(v) => updateInvoiceSettings({ showPaymentStatus: v })} /></div>
              <div className="flex items-center justify-between"><Label className="text-xs">Next Payment Due</Label><Switch checked={invoiceSettings.showNextPaymentDue} onCheckedChange={(v) => updateInvoiceSettings({ showNextPaymentDue: v })} /></div>
              <div className="flex items-center justify-between"><Label className="text-xs">Tax/GST Line</Label><Switch checked={invoiceSettings.showTaxGst} onCheckedChange={(v) => updateInvoiceSettings({ showTaxGst: v })} /></div>
            </div>

            <div className="pt-3 border-t space-y-2">
              <Label className="text-xs font-semibold">Extra Sections</Label>
              <div className="flex items-center justify-between"><Label className="text-xs">Payment History</Label><Switch checked={invoiceSettings.showPaymentHistory} onCheckedChange={(v) => updateInvoiceSettings({ showPaymentHistory: v })} /></div>
              <div className="flex items-center justify-between"><Label className="text-xs">Terms & Conditions</Label><Switch checked={invoiceSettings.showTermsConditions} onCheckedChange={(v) => updateInvoiceSettings({ showTermsConditions: v })} /></div>
              <div className="flex items-center justify-between"><Label className="text-xs">Signature Area</Label><Switch checked={invoiceSettings.showSignatureArea} onCheckedChange={(v) => updateInvoiceSettings({ showSignatureArea: v })} /></div>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <div className="p-4 border-t">
        <p className="text-xs text-muted-foreground text-center">Settings are automatically saved</p>
      </div>
    </div>
  );

  // Preview Panel with virtualized PDF pages, page navigation and fit/zoom controls
  const PreviewPanel = () => {
    const goPrev = () => canvasRef.current?.scrollToPage(Math.max(0, activePage - 1));
    const goNext = () => canvasRef.current?.scrollToPage(Math.min(totalPages - 1, activePage + 1));

    return (
      <div className="flex-1 min-h-0 bg-muted/30 overflow-hidden flex flex-col">
        <div className="sticky top-0 z-20 flex items-center justify-between px-2 sm:px-3 py-2 border-b bg-background/95 backdrop-blur gap-2">
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="outline" size="icon" className="h-9 w-9 sm:h-8 sm:w-8 rounded-full" onClick={goPrev} disabled={activePage <= 0} aria-label="Previous page">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-[11px] font-medium tabular-nums px-1.5 min-w-[52px] text-center">
              {totalPages > 0 ? `${activePage + 1} / ${totalPages}` : '– / –'}
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 sm:h-8 sm:w-8 rounded-full" onClick={goNext} disabled={activePage >= totalPages - 1} aria-label="Next page">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button variant={fitWidth ? 'default' : 'outline'} size="sm" className="h-9 sm:h-8 px-2.5 rounded-full" onClick={() => setFitWidth((v) => !v)} aria-pressed={fitWidth}>
              <MoveHorizontal className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline text-[11px]">Fit</span>
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9 sm:h-8 sm:w-8 rounded-full" onClick={() => { setFitWidth(false); setPreviewZoom(Math.max(25, previewZoom - 25)); }} disabled={!fitWidth && previewZoom <= 25} aria-label="Zoom out">
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-center hidden sm:inline">
              {fitWidth ? 'Fit' : `${previewZoom}%`}
            </span>
            <Button variant="outline" size="icon" className="h-9 w-9 sm:h-8 sm:w-8 rounded-full" onClick={() => { setFitWidth(false); setPreviewZoom(Math.min(200, previewZoom + 25)); }} disabled={!fitWidth && previewZoom >= 200} aria-label="Zoom in">
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-2 sm:p-4 md:p-6">
          {isGeneratingPdf && !pdfBlobUrl ? (
            <div className="h-full flex items-center justify-center min-h-[300px]">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Generating preview...</p>
              </div>
            </div>
          ) : (
            <PDFCanvasPreview
              ref={canvasRef}
              pdfBlobUrl={pdfBlobUrl}
              zoom={previewZoom}
              fitWidth={fitWidth}
              isGenerating={isGeneratingPdf}
              onPagesChange={setTotalPages}
              onActivePageChange={setActivePage}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="h-[95vh] p-0 flex flex-col md:max-w-none md:h-[90vh]">
        <SheetHeader className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {showEditor && (
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setShowEditor(false)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <SheetTitle className="text-base md:text-xl">
                {showEditor ? 'Edit Invoice Settings' : 'Invoice Preview'}
              </SheetTitle>
            </div>
            <div className="flex items-center gap-2">
              {!showEditor ? (
                <Button variant="outline" size="sm" onClick={() => setShowEditor(true)} className="md:hidden">
                  <Settings2 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={handleReset} className="md:hidden">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleReset} className="hidden md:flex">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Download PDF</span>
                <span className="sm:hidden">Download</span>
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Mobile View */}
        <div className="flex-1 min-h-0 overflow-hidden md:hidden flex flex-col">
          {showEditor ? <EditorPanel /> : <PreviewPanel />}
        </div>

        {/* Desktop View */}
        <div className="hidden md:flex flex-1 overflow-hidden">
          <div className="w-80 border-r flex flex-col">
            <EditorPanel />
          </div>
          <PreviewPanel />
        </div>
      </SheetContent>

      <CustomThemeBuilder
        open={showThemeBuilder}
        onClose={() => setShowThemeBuilder(false)}
        onSelectTheme={(themeId) => updateSettings({ theme: themeId })}
        currentThemeId={editorSettings.theme}
      />
    </Sheet>
  );
};
