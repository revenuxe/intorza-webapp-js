import { useState, useEffect, useRef, useCallback } from "react";
import { Download, Palette, Layout, Eye, RotateCcw, Check, Settings2, ArrowLeft, Sparkles, Frame, Flower2, Shapes, Crown, FileText, Wand2, CircleDot, Search, Type, Sliders, Loader2, ZoomIn, ZoomOut, Maximize, Copy, Image as ImageIcon, X, Upload } from "lucide-react";
import { generateInvoicePDF } from "@/lib/invoicePdfGenerator";
import { uploadAndSave } from "@/lib/storageUpload";
import { Slider } from "@/components/ui/slider";
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
  InvoiceLayoutStyle,
} from "@/lib/pdfThemes";
import { CustomThemeBuilder } from "./CustomThemeBuilder";
import { FontPreviewPanel } from "./FontPreviewPanel";
import { PDFCanvasPreview } from "./next/PDFCanvasPreviewClient";
import { useFontPreferences } from "@/hooks/useFontPreferences";
import { profileApi } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { getResolvedLibraryTerms, type TermsSection } from "@/lib/libraryDefaults";
import { TermsBlockEditor } from "@/components/pdf/TermsBlockEditor";

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
  onDownload: (editorSettings: PDFEditorSettings, invoiceSettings: InvoiceSettings, terms?: TermsSection[]) => void;
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

const INVOICE_LAYOUT_STYLES: { id: InvoiceLayoutStyle; name: string; description: string }[] = [
  { id: 'classic', name: 'Classic', description: 'Logo + two info cards' },
  { id: 'minimal-modern', name: 'Minimal Modern', description: 'Centered title, plain text' },
  { id: 'hero-banner', name: 'Hero Banner', description: 'Dark banner + photo' },
];

export const InvoicePreviewEditor = ({
  open,
  onClose,
  onDownload,
  invoiceData
}: InvoicePreviewEditorProps) => {
  const [editorSettings, setEditorSettings] = useState<PDFEditorSettings>(getEditorSettings());
  const [termsReady, setTermsReady] = useState(false);
  const [termsError, setTermsError] = useState('');
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
  const [useQuotationDesign, setUseQuotationDesign] = useState(() => {
    try { return localStorage.getItem(USE_QUOTATION_DESIGN_KEY) === 'true'; } catch { return false; }
  });
  const [profile, setProfile] = useState<any>(null);
  const [termsConditions, setTermsConditions] = useState<TermsSection[]>([]);
  const [libraryTerms, setLibraryTerms] = useState<TermsSection[]>([]);
  const [termsTemplateName, setTermsTemplateName] = useState("Loading terms…");
  const [usingFallbackTerms, setUsingFallbackTerms] = useState(false);
  const updateTerms = (terms: TermsSection[]) => {
    setTermsConditions(terms);
    setProfile((current: any) => (current ? { ...current, invoice_terms_conditions: terms } : current));
  };
  const [uploadingHero, setUploadingHero] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const pdfGenerationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevBlobUrlRef = useRef<string | null>(null);
  
  const { preferences: fontPreferences, updatePreferences: saveFontPreferences } = useFontPreferences();

  // Refresh the profile and enabled library terms whenever the preview opens.
  useEffect(() => {
    if (!open) return;
    setTermsReady(false);
    setTermsError('');
    let active = true;
    const loadData = async () => {
      try {
        const [{ data }, { data: authData }] = await Promise.all([
          profileApi.get(),
          supabase.auth.getUser(),
        ]);

        if (data && active) {
          let previewProfile = data;
          if (authData.user) {
            const resolved = await getResolvedLibraryTerms(authData.user.id, 'invoice');
            previewProfile = { ...data, invoice_terms_conditions: resolved.terms };
            if (active) {
              setTermsConditions(resolved.terms);
              setLibraryTerms(resolved.terms);
              setTermsTemplateName(resolved.templateName);
              setUsingFallbackTerms(resolved.source === 'default');
              setTermsReady(true);
            }
          }
          if (!active) return;
          setProfile(previewProfile);
          if (data.brand_colors && typeof data.brand_colors === 'object') {
            const colors = data.brand_colors as unknown as BrandColors;
            if (colors.primary) setBrandColors(colors);
          }
        }
      } catch (error) {
        if (active) setTermsError((error as Error).message || 'Could not load terms. Close and reopen to retry.');
        console.error('Error loading profile:', error);
      }
    };
    void loadData();
    return () => { active = false; };
  }, [open]);

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

  const handleHeroImageUpload = async (file: File) => {
    setUploadingHero(true);
    try {
      const url = await uploadAndSave(file, 'hero', async ({ url }) => {
        await profileApi.update({ hero_image_url: url });
        return url;
      });
      setProfile((prev: any) => ({ ...(prev || {}), hero_image_url: url }));
    } catch (error) {
      console.error('Hero image upload failed:', error);
    } finally {
      setUploadingHero(false);
    }
  };

  const handleHeroImageRemove = async () => {
    try {
      await profileApi.update({ hero_image_url: null });
      setProfile((prev: any) => ({ ...(prev || {}), hero_image_url: null }));
    } catch (error) {
      console.error('Hero image remove failed:', error);
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
    if (!termsReady) return;
    const downloadSettings: PDFEditorSettings = {
      ...editorSettings,
      brandColors: editorSettings.useBrandColors && brandColors ? brandColors : editorSettings.brandColors,
    };
    onDownload(downloadSettings, invoiceSettings, termsConditions);
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

  // Generate live PDF preview
  const generateLivePdf = useCallback(async () => {
    setIsGeneratingPdf(true);
    try {
      const currentEditorSettings: PDFEditorSettings = {
        ...editorSettings,
        brandColors: editorSettings.useBrandColors && brandColors ? brandColors : editorSettings.brandColors,
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
        invoiceSettings: invoiceSettings,
        previewOnly: true,
      });

      if (!pdfDoc) throw new Error('Failed to generate PDF');
      const blob = pdfDoc.output('blob');
      if (prevBlobUrlRef.current) URL.revokeObjectURL(prevBlobUrlRef.current);
      const newBlobUrl = URL.createObjectURL(blob);
      prevBlobUrlRef.current = newBlobUrl;
      setPdfBlobUrl(newBlobUrl);
    } catch (error) {
      console.error('Error generating live invoice PDF preview:', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [editorSettings, invoiceSettings, invoiceData, brandColors, profile]);

  // Debounced PDF generation
  useEffect(() => {
    if (!open || !termsReady) return;
    if (pdfGenerationTimer.current) clearTimeout(pdfGenerationTimer.current);
    pdfGenerationTimer.current = setTimeout(() => { generateLivePdf(); }, 800);
    return () => { if (pdfGenerationTimer.current) clearTimeout(pdfGenerationTimer.current); };
  }, [open, termsReady, generateLivePdf]);

  // Editor Panel — rendered as a JSX element (not a nested component) so React
  // reconciles it in place instead of remounting on every render. Remounting
  // would reset scroll position and steal focus from inputs.
  const editorPanel = (
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
        <TabsList className="grid grid-cols-6 m-4 flex-shrink-0">
          <TabsTrigger value="terms" className="text-xs">
            <FileText className="h-3 w-3 mr-1" />
            Terms
          </TabsTrigger>
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
          <TabsContent value="terms" className="mt-0">
            <TermsBlockEditor
              value={termsConditions}
              templateName={termsTemplateName}
              usingFallback={usingFallbackTerms}
              onChange={updateTerms}
              onReset={() => updateTerms(libraryTerms)}
            />
          </TabsContent>
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
              <Label className="text-sm font-semibold">Template</Label>
              <p className="text-xs text-muted-foreground">Structural layout — separate from color theme.</p>
              <div className="grid grid-cols-3 gap-2">
                {INVOICE_LAYOUT_STYLES.map((style) => {
                  const selected = (editorSettings.invoiceLayoutStyle || 'classic') === style.id;
                  return (
                    <button
                      key={style.id}
                      onClick={() => updateSettings({ invoiceLayoutStyle: style.id })}
                      className={`relative p-2 rounded-lg border-2 transition-all text-left ${
                        selected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {selected && (
                        <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                      <div className="relative w-full h-10 rounded mb-1.5 overflow-hidden border bg-white">
                        {style.id === 'classic' && (
                          <div className="flex h-full w-full items-end gap-0.5 p-1">
                            <div className="h-2.5 w-2.5 rounded-sm bg-muted-foreground/40" />
                            <div className="flex-1 h-5 rounded-sm bg-muted" />
                            <div className="flex-1 h-5 rounded-sm bg-muted" />
                          </div>
                        )}
                        {style.id === 'minimal-modern' && (
                          <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                            <div className="h-1.5 w-6 rounded-sm bg-muted-foreground/50" />
                            <div className="h-px w-8 bg-border" />
                          </div>
                        )}
                        {style.id === 'hero-banner' && (
                          <div className="flex h-full w-full flex-col">
                            <div className="h-2.5 w-full bg-slate-800" />
                            <div className="flex-1 w-full bg-muted" />
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] font-medium truncate">{style.name}</p>
                      <p className="text-[8px] text-muted-foreground truncate">{style.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {(editorSettings.invoiceLayoutStyle === 'hero-banner') && (
              <div className="space-y-2 p-3 rounded-lg bg-muted/50">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5" /> Hero Image
                </Label>
                <p className="text-xs text-muted-foreground">Shown across every invoice using this template. Falls back to your logo if not set.</p>
                {profile?.hero_image_url ? (
                  <div className="relative">
                    <img src={profile.hero_image_url} alt="Hero" className="w-full h-20 object-cover rounded-md border" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={handleHeroImageRemove}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-1 h-20 rounded-md border-2 border-dashed cursor-pointer hover:border-primary/50 transition-colors">
                    {uploadingHero ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                      <>
                        <Upload className="h-4 w-4 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">Upload photo</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingHero}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleHeroImageUpload(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
              </div>
            )}

            <div className="space-y-3 pt-4 border-t">
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

  // Preview Panel — also a JSX element variable (see editorPanel note above) so
  // the scrollable preview area and the memoized PDF canvas stay mounted across
  // regenerations, preserving scroll position and avoiding flicker.
  const previewPanel = (
    <div className="flex-1 min-h-0 bg-muted/30 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-background/80 backdrop-blur-sm gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={() => setPreviewZoom(Math.max(25, previewZoom - 25))} disabled={previewZoom <= 25}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <div className="flex items-center w-20 sm:w-28">
            <Slider value={[previewZoom]} onValueChange={([v]) => setPreviewZoom(v)} min={25} max={200} step={5} className="w-full" />
          </div>
          <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={() => setPreviewZoom(Math.min(200, previewZoom + 25))} disabled={previewZoom >= 200}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[10px] text-muted-foreground w-9 text-center">{previewZoom}%</span>
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setPreviewZoom(100)}>
            <Maximize className="h-3 w-3 mr-1" />
            <span className="text-[10px]">Fit</span>
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
          <PDFCanvasPreview pdfBlobUrl={pdfBlobUrl} zoom={previewZoom} isGenerating={isGeneratingPdf} />
        )}
      </div>
    </div>
  );

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
              {termsError && <p role="alert" className="text-sm text-destructive">{termsError}</p>}
              <Button size="sm" onClick={handleDownload} disabled={!termsReady}>
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
          {showEditor ? editorPanel : previewPanel}
        </div>

        {/* Desktop View */}
        <div className="hidden md:flex flex-1 overflow-hidden">
          <div className="w-80 border-r flex flex-col">
            {editorPanel}
          </div>
          {previewPanel}
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
