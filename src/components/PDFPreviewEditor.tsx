import { useState, useEffect, useRef, useCallback } from "react";
import { Download, Palette, Layout, Eye, RotateCcw, Check, Settings2, ArrowLeft, Sparkles, Frame, Flower2, Shapes, Crown, FileText, Wand2, CircleDot, Search, Type, Sliders, Loader2, ZoomIn, ZoomOut, Maximize, ChevronLeft, ChevronRight, MoveHorizontal } from "lucide-react";
import { generateQuotationPDF } from "@/lib/pdfGenerator";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  defaultAdvancedSettings,
  getThemeById,
  getThemesByCategory,
  getAllThemes,
  rgbToHex,
  PDFTheme,
  PDF_FONTS,
  PDFFont,
  getFontById,
  getFontsByCategory,
  getHeadingFonts,
  getBodyFonts,
  applyBrandColorsToTheme,
} from "@/lib/pdfThemes";
import { QuotationSettings } from "./CustomizeFieldsDrawer";
import { CustomThemeBuilder } from "./CustomThemeBuilder";
import { FontPreviewPanel } from "./FontPreviewPanel";
import { PDFAdvancedEditor } from "./PDFAdvancedEditor";
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

export const PDFPreviewEditor = ({
  open,
  onClose,
  onDownload,
  quotationData,
  customizeSettings
}: PDFPreviewEditorProps) => {
  const [editorSettings, setEditorSettings] = useState<PDFEditorSettings>(getEditorSettings());
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
  const [highlightedElement, setHighlightedElement] = useState<string | null>(null);
  const [showItemImages, setShowItemImages] = useState(customizeSettings.showItemImages);
  const previewRef = useRef<HTMLDivElement>(null);
  const pdfGenerationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Load font preferences from database
  const { preferences: fontPreferences, updatePreferences: saveFontPreferences, loading: fontLoading } = useFontPreferences();

  // Load brand colors from profile
  useEffect(() => {
    const loadBrandColors = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('profiles')
          .select('brand_colors')
          .eq('id', user.id)
          .maybeSingle();

        if (data?.brand_colors && typeof data.brand_colors === 'object') {
          const colors = data.brand_colors as unknown as BrandColors;
          if (colors.primary) {
            setBrandColors(colors);
          }
        }
      } catch (error) {
        console.error('Error loading brand colors:', error);
      }
    };

    loadBrandColors();
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
      setShowEditor(false);
    } else {
      // Cleanup blob URL when closing
      if (prevBlobUrlRef.current) {
        URL.revokeObjectURL(prevBlobUrlRef.current);
        prevBlobUrlRef.current = null;
      }
      setPdfBlobUrl(null);
    }
  }, [open, fontPreferences, brandColors]);

  // Track previous blob URL for cleanup without causing re-renders
  const prevBlobUrlRef = useRef<string | null>(null);

  // Generate live PDF preview with debouncing
  const generateLivePdf = useCallback(async () => {
    setIsGeneratingPdf(true);
    try {
      // Ensure brand colors are included if enabled
      const currentEditorSettings: PDFEditorSettings = {
        ...editorSettings,
        brandColors: editorSettings.useBrandColors && brandColors ? brandColors : editorSettings.brandColors,
      };

      // Settings from customizeSettings
      const pdfSettings = {
        showCompanyLogo: customizeSettings.showCompanyLogo,
        showCompanyAddress: customizeSettings.showCompanyAddress,
        showProjectDetails: customizeSettings.showProjectDetails,
        showDetailedSizeColumns: customizeSettings.showDetailedSizeColumns,
        useSimpleItemLayout: customizeSettings.useSimpleItemLayout,
        showSubtotal: customizeSettings.showSubtotal,
        showTaxGst: customizeSettings.showTaxGst,
        showGrandTotal: customizeSettings.showGrandTotal,
        showPaymentStages: customizeSettings.showPaymentStages,
        showTermsConditions: customizeSettings.showTermsConditions,
        showSignatureArea: customizeSettings.showSignatureArea,
        showClientName: customizeSettings.showClientName,
        showClientAddress: customizeSettings.showClientAddress,
        showDateOfProposal: customizeSettings.showDateOfProposal,
        showQuotationValidTill: customizeSettings.showQuotationValidTill,
        showProjectDeadline: customizeSettings.showProjectDeadline,
        showPlaceOfProject: customizeSettings.showPlaceOfProject,
        showWarranty: customizeSettings.showWarranty,
        showProjectType: customizeSettings.showProjectType,
        showSideColumn: customizeSettings.showSideColumn,
        showProductDetails: customizeSettings.showProductDetails,
        showDiscount: customizeSettings.showDiscount,
        showSocialMediaDiscount: customizeSettings.showSocialMediaDiscount,
        showBankDetails: customizeSettings.showBankDetails,
        showQRCode: customizeSettings.showQRCode,
        showProfessionalAdvantages: customizeSettings.showProfessionalAdvantages,
        showQuotationNumber: customizeSettings.showQuotationNumber,
        showItemImages: showItemImages,
      };

      // Transform quotationData to match the generator's expected format with settings embedded
      const pdfData = {
        quotationTitle: quotationData.quotationTitle || 'Sample Quotation',
        clientName: quotationData.clientName || 'Client Name',
        clientAddress: quotationData.clientAddress || 'Client Address',
        dateOfProposal: quotationData.dateOfProposal || new Date().toLocaleDateString(),
        quotationValidTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        placeOfProject: 'Project Location',
        warranty: '1 Year',
        projectType: 'Interior',
        sections: quotationData.sections.length > 0 ? quotationData.sections.map(s => ({
          title: s.section_name || s.title || 'Section',
          items: (s.items || []).map((item: any) => ({
            side: item.side || '',
            productName: item.product_name || item.productName || 'Product',
            productDetails: item.product_details || item.productDetails || '',
            widthFt: item.width_ft || item.widthFt || 0,
            heightFt: item.height_ft || item.heightFt || 0,
            sftArea: item.sft_area || item.sftArea || 0,
            ratePerSft: item.rate_per_sft || item.ratePerSft || 0,
            amount: item.amount || 0,
            imageUrls: item.imageUrls || [],
          }))
        })) : [{
          title: 'Sample Section',
          items: [{
            side: 'Left',
            productName: 'Sample Product',
            productDetails: 'Product details here',
            widthFt: 4,
            heightFt: 8,
            sftArea: 32,
            ratePerSft: 850,
            amount: 27200,
          }]
        }],
        subtotal: quotationData.subtotal || 50000,
        gstEnabled: true,
        gstRate: 18,
        gstAmount: (quotationData.subtotal || 50000) * 0.18,
        grandTotal: quotationData.grandTotal || 55460,
        companyLogo: quotationData.companyLogo,
        companyName: quotationData.companyName || 'Your Company',
        companyAddress: 'Company Address',
        settings: pdfSettings,
        editorSettings: currentEditorSettings,
        previewOnly: true,
      };

      const doc = await generateQuotationPDF(pdfData as any);
      if (!doc) {
        throw new Error('Failed to generate PDF document');
      }
      const blob = doc.output('blob');
      
      // Revoke previous blob URL
      if (prevBlobUrlRef.current) {
        URL.revokeObjectURL(prevBlobUrlRef.current);
      }
      
      const newBlobUrl = URL.createObjectURL(blob);
      prevBlobUrlRef.current = newBlobUrl;
      setPdfBlobUrl(newBlobUrl);
    } catch (error) {
      console.error('Error generating live PDF preview:', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [editorSettings, customizeSettings, quotationData, brandColors, showItemImages]);

  // Debounced PDF generation effect - longer debounce for smooth slider interaction
  useEffect(() => {
    if (!open) return;
    
    if (pdfGenerationTimer.current) {
      clearTimeout(pdfGenerationTimer.current);
    }
    
    // Use longer debounce (800ms) to avoid regenerating while user is actively dragging sliders
    pdfGenerationTimer.current = setTimeout(() => {
      generateLivePdf();
    }, 800);

    return () => {
      if (pdfGenerationTimer.current) {
        clearTimeout(pdfGenerationTimer.current);
      }
    };
  }, [open, generateLivePdf]);

  const updateSettings = (updates: Partial<PDFEditorSettings>) => {
    const newSettings = { ...editorSettings, ...updates };
    setEditorSettings(newSettings);
    saveEditorSettings(newSettings);
    
    // Save font preferences to database if font changed
    if (updates.headingFont || updates.bodyFont) {
      saveFontPreferences({
        headingFont: updates.headingFont || editorSettings.headingFont || 'times',
        bodyFont: updates.bodyFont || editorSettings.bodyFont || 'helvetica',
      });
    }
  };

  const handleReset = () => {
    setEditorSettings(defaultEditorSettings);
    saveEditorSettings(defaultEditorSettings);
  };

  const handleDownload = () => {
    // Ensure brand colors are included if enabled
    const downloadSettings: PDFEditorSettings = {
      ...editorSettings,
      brandColors: editorSettings.useBrandColors && brandColors ? brandColors : editorSettings.brandColors,
    };
    onDownload(downloadSettings);
    onClose();
  };

  const currentTheme = (() => {
    let theme = getThemeById(editorSettings.theme);
    // Apply brand colors if enabled
    if (editorSettings.useBrandColors && editorSettings.brandColors) {
      theme = applyBrandColorsToTheme(theme, editorSettings.brandColors);
    }
    return theme;
  })();

  // Get filtered themes based on category (including custom themes)
  const getFilteredThemes = (): PDFTheme[] => {
    if (selectedCategory === 'all') {
      return getAllThemes();
    }
    return getThemesByCategory(selectedCategory);
  };

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

  // Get decoration color for preview
  const getDecorationColor = () => {
    const decorColor = currentTheme.colors.decorationPrimary || currentTheme.colors.accent;
    return `rgb(${decorColor.join(',')})`;
  };

  // Check if current theme has decorations
  const hasDecorations = currentTheme.decorations.showPageBorder || 
                         currentTheme.decorations.showCornerOrnaments || 
                         currentTheme.decorations.showSectionDividers;

  // Editor Panel Component
  const EditorPanel = () => (
    <div className="flex flex-col h-full overflow-hidden">
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
          <TabsTrigger value="advanced" className="text-xs">
            <Sliders className="h-3 w-3 mr-1" />
            Edit
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0 overflow-auto px-4">
          {/* THEMES TAB */}
          <TabsContent value="themes" className="mt-0 space-y-4">
            {/* Category Filter Tabs */}
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

            {/* Custom Theme Builder Button */}
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mb-3"
              onClick={() => setShowThemeBuilder(true)}
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Create Custom Theme
            </Button>

            {/* Themes Grid */}
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
                    {/* Theme preview with decoration indicator */}
                    <div className="relative w-full h-10 rounded mb-1.5 overflow-hidden border"
                      style={{ 
                        backgroundColor: `rgb(${theme.colors.background.join(',')})`,
                        borderColor: theme.decorations.showPageBorder 
                          ? `rgb(${(theme.colors.decorationPrimary || theme.colors.accent).join(',')})` 
                          : `rgb(${theme.colors.border.join(',')})`
                      }}
                    >
                      {/* Header bar */}
                      <div 
                        className="h-3 w-full"
                        style={{ backgroundColor: `rgb(${theme.colors.headerBg.join(',')})` }}
                      />
                      {/* Highlight swatch */}
                      <div 
                        className="absolute bottom-1 right-1 w-4 h-2 rounded-sm"
                        style={{ backgroundColor: `rgb(${theme.colors.highlight.join(',')})` }}
                      />
                      {/* Corner ornament indicator */}
                      {theme.decorations.showCornerOrnaments && (
                        <div 
                          className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 rounded-tl"
                          style={{ borderColor: `rgb(${(theme.colors.decorationPrimary || theme.colors.accent).join(',')})` }}
                        />
                      )}
                    </div>
                    <p className="text-[10px] font-medium truncate">{theme.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                        {theme.category}
                      </span>
                      {theme.decorations.showPageBorder && (
                        <Frame className="h-2.5 w-2.5 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Brand Colors Section */}
            {brandColors && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <CircleDot className="h-4 w-4 text-primary" />
                      Use Brand Colors
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Apply your saved brand palette to the PDF
                    </p>
                  </div>
                  <Switch
                    checked={editorSettings.useBrandColors || false}
                    onCheckedChange={(v) => updateSettings({ 
                      useBrandColors: v,
                      brandColors: brandColors
                    })}
                  />
                </div>
                
                {editorSettings.useBrandColors && (
                  <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded-full border shadow-sm"
                        style={{ backgroundColor: brandColors.primary }}
                        title="Primary"
                      />
                      <div 
                        className="w-6 h-6 rounded-full border shadow-sm"
                        style={{ backgroundColor: brandColors.secondary }}
                        title="Secondary"
                      />
                      <div 
                        className="w-6 h-6 rounded-full border shadow-sm"
                        style={{ backgroundColor: brandColors.accent }}
                        title="Accent"
                      />
                      <span className="text-xs text-muted-foreground ml-2">Your brand palette</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Edit brand colors in Settings → Brand Colors
                    </p>
                  </div>
                )}
              </div>
            )}

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

          {/* DECORATIONS TAB */}
          <TabsContent value="decor" className="mt-0 space-y-4 pb-4">
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Decoration Settings</Label>
              <p className="text-xs text-muted-foreground">
                Enable decorative elements for a more elegant PDF design.
              </p>
            </div>

            {/* Master toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <Label className="text-sm font-medium">Enable Decorations</Label>
                <p className="text-xs text-muted-foreground">
                  Show borders, ornaments & dividers
                </p>
              </div>
              <Switch
                checked={editorSettings.showDecorations}
                onCheckedChange={(v) => updateSettings({ showDecorations: v })}
              />
            </div>

            {editorSettings.showDecorations && (
              <>
                {/* Decoration intensity */}
                <div className="space-y-3 pt-2">
                  <Label className="text-sm font-semibold">Decoration Intensity</Label>
                  <Select 
                    value={editorSettings.decorationIntensity} 
                    onValueChange={(v) => updateSettings({ decorationIntensity: v as 'subtle' | 'medium' | 'bold' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subtle">Subtle - Light decorations</SelectItem>
                      <SelectItem value="medium">Medium - Balanced look</SelectItem>
                      <SelectItem value="bold">Bold - Heavy decorations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Individual toggles */}
                <div className="space-y-4 pt-4 border-t">
                  <Label className="text-sm font-semibold">Decoration Elements</Label>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Page Border</Label>
                      <p className="text-xs text-muted-foreground">
                        Decorative border around pages
                      </p>
                    </div>
                    <Switch
                      checked={editorSettings.showPageBorder}
                      onCheckedChange={(v) => updateSettings({ showPageBorder: v })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Corner Ornaments</Label>
                      <p className="text-xs text-muted-foreground">
                        Decorative corners based on theme
                      </p>
                    </div>
                    <Switch
                      checked={editorSettings.showCornerOrnaments}
                      onCheckedChange={(v) => updateSettings({ showCornerOrnaments: v })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Section Dividers</Label>
                      <p className="text-xs text-muted-foreground">
                        Decorative lines between sections
                      </p>
                    </div>
                    <Switch
                      checked={editorSettings.showSectionDividers}
                      onCheckedChange={(v) => updateSettings({ showSectionDividers: v })}
                    />
                  </div>
                </div>

                {/* Theme decoration info */}
                <div className="pt-4 border-t">
                  <Label className="text-sm font-semibold mb-2 block">Current Theme Decorations</Label>
                  <div className="p-3 rounded-lg bg-muted/50 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Border Style:</span>
                      <span className="font-medium capitalize">{currentTheme.decorations.borderStyle}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Corner Style:</span>
                      <span className="font-medium capitalize">{currentTheme.decorations.cornerStyle}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Divider Style:</span>
                      <span className="font-medium capitalize">{currentTheme.decorations.dividerStyle}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Header:</span>
                      <span className="font-medium capitalize">{currentTheme.decorations.headerDecoration}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* LAYOUT TAB */}
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

            {/* Header Info Columns */}
            <div className="space-y-3 pt-4 border-t">
              <Label className="text-sm font-semibold">Header Info Layout</Label>
              <p className="text-xs text-muted-foreground">
                Choose how Quotation & Project details are displayed
              </p>
              <RadioGroup
                value={String(editorSettings.headerInfoColumns || 2)}
                onValueChange={(v) => updateSettings({ headerInfoColumns: Number(v) as 1 | 2 | 3 })}
                className="grid grid-cols-3 gap-2"
              >
                {[
                  { value: '1', label: 'Single Row', desc: 'All info in one row' },
                  { value: '2', label: 'Two Cards', desc: 'Client + Project side-by-side' },
                  { value: '3', label: 'Three Cards', desc: 'Client + Project + Extra' },
                ].map((opt) => (
                  <div key={opt.value}>
                    <RadioGroupItem value={opt.value} id={`cols-${opt.value}`} className="peer sr-only" />
                    <Label
                      htmlFor={`cols-${opt.value}`}
                      className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer text-center"
                    >
                      <div className="w-full h-6 border rounded mb-1 flex items-center gap-0.5 px-0.5">
                        {Array.from({ length: Number(opt.value) }).map((_, i) => (
                          <div key={i} className="flex-1 h-4 bg-muted-foreground/20 rounded-sm" />
                        ))}
                      </div>
                      <span className="text-[10px] font-medium">{opt.label}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Accept/Reject Toggle */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Accept / Reject Buttons</Label>
                  <p className="text-xs text-muted-foreground">
                    Show action buttons in PDF for client response
                  </p>
                </div>
                <Switch
                  checked={editorSettings.showAcceptRejectButtons ?? true}
                  onCheckedChange={(v) => updateSettings({ showAcceptRejectButtons: v })}
                />
              </div>
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

          {/* STYLE TAB */}
          <TabsContent value="style" className="mt-0 space-y-4 pb-4">
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
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Show Item Images</Label>
                    <p className="text-xs text-muted-foreground">
                      Display product images in table
                    </p>
                  </div>
                  <Switch
                    checked={showItemImages}
                    onCheckedChange={(v) => {
                      setShowItemImages(v);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Font Selection Section */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4 text-primary" />
                <Label className="text-sm font-semibold">Font Selection</Label>
              </div>
              
              {/* Font Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search fonts..."
                  value={fontSearchQuery}
                  onChange={(e) => setFontSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Font Category Filter */}
              <div className="flex flex-wrap gap-1.5">
                {FONT_CATEGORY_CONFIG.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedFontCategory(cat.value)}
                    className={`px-2.5 py-1.5 rounded-full text-[10px] font-medium transition-all ${
                      selectedFontCategory === cat.value
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Heading Font */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Heading Font</Label>
                <div className="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {PDF_FONTS
                    .filter(f => f.recommended === 'heading' || f.recommended === 'both')
                    .filter(f => selectedFontCategory === 'all' || f.category === selectedFontCategory)
                    .filter(f => fontSearchQuery === '' || 
                      f.name.toLowerCase().includes(fontSearchQuery.toLowerCase()) ||
                      f.description.toLowerCase().includes(fontSearchQuery.toLowerCase())
                    )
                    .map((font) => (
                      <button
                        key={font.id}
                        onClick={() => updateSettings({ headingFont: font.id })}
                        className={`p-2 rounded-md border text-left transition-all ${
                          editorSettings.headingFont === font.id
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <p className="text-xs font-medium truncate">{font.name}</p>
                        <p className="text-[9px] text-muted-foreground truncate">{font.description}</p>
                      </button>
                    ))
                  }
                </div>
              </div>

              {/* Body Font */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Body Font</Label>
                <div className="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {PDF_FONTS
                    .filter(f => f.recommended === 'body' || f.recommended === 'both')
                    .filter(f => selectedFontCategory === 'all' || f.category === selectedFontCategory)
                    .filter(f => fontSearchQuery === '' || 
                      f.name.toLowerCase().includes(fontSearchQuery.toLowerCase()) ||
                      f.description.toLowerCase().includes(fontSearchQuery.toLowerCase())
                    )
                    .map((font) => (
                      <button
                        key={font.id}
                        onClick={() => updateSettings({ bodyFont: font.id })}
                        className={`p-2 rounded-md border text-left transition-all ${
                          editorSettings.bodyFont === font.id
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <p className="text-xs font-medium truncate">{font.name}</p>
                        <p className="text-[9px] text-muted-foreground truncate">{font.description}</p>
                      </button>
                    ))
                  }
                </div>
              </div>

              {/* Font Preview */}
              <FontPreviewPanel 
                headingFont={editorSettings.headingFont || 'times'} 
                bodyFont={editorSettings.bodyFont || 'helvetica'} 
              />
            </div>

            <div className="space-y-3 pt-4 border-t">
              <Label className="text-sm font-semibold">Font Size</Label>
              <Select value={editorSettings.fontSize} onValueChange={(v) => updateSettings({ fontSize: v as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <Label className="text-sm font-semibold">Table Style</Label>
              <Select value={editorSettings.tableStyle} onValueChange={(v) => updateSettings({ tableStyle: v as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="striped">Striped Rows</SelectItem>
                  <SelectItem value="bordered">Bordered</SelectItem>
                  <SelectItem value="grid">Full Grid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <Label className="text-sm font-semibold">Header Style</Label>
              <Select value={editorSettings.headerStyle} onValueChange={(v) => updateSettings({ headerStyle: v as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Simple</SelectItem>
                  <SelectItem value="boxed">Boxed</SelectItem>
                  <SelectItem value="underlined">Underlined</SelectItem>
                  <SelectItem value="full-width">Full Width</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <Label className="text-sm font-semibold">Summary Position</Label>
              <Select value={editorSettings.summaryStyle} onValueChange={(v) => updateSettings({ summaryStyle: v as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="narrow">Narrow</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="wide">Wide</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* ADVANCED TAB */}
          <TabsContent value="advanced" className="mt-0">
            <PDFAdvancedEditor 
              settings={editorSettings} 
              onUpdate={updateSettings}
              onHighlight={setHighlightedElement}
            />
          </TabsContent>
        </div>
      </Tabs>

      <div className="p-4 border-t">
        <p className="text-xs text-muted-foreground text-center">
          Settings are automatically saved
        </p>
      </div>
    </div>
  );

  // Preview Panel Component - Now shows actual PDF with zoom controls
  const PreviewPanel = () => (
    <div className="flex-1 min-h-0 bg-muted/30 overflow-hidden flex flex-col">
      {/* Zoom Controls */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-background/80 backdrop-blur-sm gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setPreviewZoom(Math.max(25, previewZoom - 25))}
            disabled={previewZoom <= 25}
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <div className="flex items-center w-20 sm:w-28">
            <Slider
              value={[previewZoom]}
              onValueChange={([v]) => setPreviewZoom(v)}
              min={25}
              max={200}
              step={5}
              className="w-full"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setPreviewZoom(Math.min(200, previewZoom + 25))}
            disabled={previewZoom >= 200}
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[10px] text-muted-foreground w-9 text-center">{previewZoom}%</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => setPreviewZoom(100)}
          >
            <Maximize className="h-3 w-3 mr-1" />
            <span className="text-[10px]">Fit</span>
          </Button>
        </div>
        {highlightedElement && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {highlightedElement}
          </div>
        )}
      </div>

      {/* PDF Preview */}
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
            pdfBlobUrl={pdfBlobUrl}
            zoom={previewZoom}
            isGenerating={isGeneratingPdf}
          />
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
                {showEditor ? 'Edit PDF Settings' : 'PDF Preview'}
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

      {/* Custom Theme Builder Modal */}
      <CustomThemeBuilder
        open={showThemeBuilder}
        onClose={() => setShowThemeBuilder(false)}
        onSelectTheme={(themeId) => updateSettings({ theme: themeId })}
        currentThemeId={editorSettings.theme}
      />
    </Sheet>
  );
};
