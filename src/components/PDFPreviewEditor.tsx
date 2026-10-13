import { useState, useEffect, useRef, useCallback } from "react";
import { Download, Palette, Layout, Eye, RotateCcw, Check, Settings2, ArrowLeft, Sparkles, Frame, Flower2, Shapes, Crown, FileText, Wand2, CircleDot, Search, Type, Sliders, Loader2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, MoveHorizontal, ListTree } from "lucide-react";
import { generateQuotationPDF, type QuotationData } from "@/lib/pdfGenerator";
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
  PDF_SELECTABLE_FONTS,
  getSelectableFontId,
  applyBrandColorsToTheme,
} from "@/lib/pdfThemes";
import { QuotationSettings } from "./CustomizeFieldsDrawer";
import { CustomThemeBuilder } from "./CustomThemeBuilder";
import { FontPreviewPanel } from "./FontPreviewPanel";
import { PDFAdvancedEditor } from "./PDFAdvancedEditor";
import type { PDFPreviewMetrics } from "./PDFCanvasPreview";
import { PDFCanvasPreview } from "./next/PDFCanvasPreviewClient";
import { useFontPreferences } from "@/hooks/useFontPreferences";
import { profileApi } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_QUOTATION_TERMS, getResolvedLibraryTerms, type TermsSection } from "@/lib/libraryDefaults";
import { TermsBlockEditor } from "@/components/pdf/TermsBlockEditor";

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
  onDownload: (settings: PDFEditorSettings, terms: TermsSection[]) => void;
  quotationData: {
    quotationId?: string;
    quotationTitle: string;
    clientName: string;
    clientAddress: string;
    dateOfProposal: string;
    quotationValidTill?: string;
    projectDeadline?: string;
    placeOfProject?: string;
    warranty?: string;
    projectType?: string;
    sections: Array<{
      section_name?: string;
      title?: string;
      items: Array<{
        side?: string;
        product_name?: string;
        productName?: string;
        product_details?: string;
        productDetails?: string;
        width_ft?: number;
        widthFt?: number;
        height_ft?: number;
        heightFt?: number;
        sft_area?: number;
        sftArea?: number;
        rate_per_sft?: number;
        ratePerSft?: number;
        amount?: number;
        imageUrls?: string[];
      }>;
    }>;
    subtotal: number;
    grandTotal: number;
    gstEnabled?: boolean;
    gstRate?: number;
    gstAmount?: number;
    discount?: number;
    enableSocialMediaDiscount?: boolean;
    socialMediaDiscountRate?: number;
    paymentStages?: { stage: string; milestone: string; percentage: number }[];
    companyName?: string;
    companyLogo?: string;
    companyAddress?: string;
    companyPhone?: string;
    companyEmail?: string;
    gstin?: string;
    professionalAdvantages?: string;
    signatureUrl?: string;
    bankDetails?: {
      bankName?: string;
      accountNumber?: string;
      ifscCode?: string;
      accountHolder?: string;
      upiId?: string;
      qrCodeUrl?: string;
    };
    localization?: {
      currencyCode: string;
      currencySymbol: string;
      locale: string;
      taxLabel: string;
      taxRegistrationLabel: string;
      areaUnit: string;
      areaUnitShort: string;
      countryCode?: string;
    };
  };
  customizeSettings: QuotationSettings;
}

type ThemeCategory = 'all' | 'minimal' | 'professional' | 'luxury' | 'floral' | 'abstract' | 'decoration';
type FontCategory = 'all' | 'serif' | 'sans-serif' | 'monospace';

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
  const [termsReady, setTermsReady] = useState(false);
  const [termsError, setTermsError] = useState('');
  const [activeTab, setActiveTab] = useState("themes");
  const [showEditor, setShowEditor] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ThemeCategory>('all');
  const [selectedFontCategory, setSelectedFontCategory] = useState<FontCategory>('all');
  const [fontSearchQuery, setFontSearchQuery] = useState('');
  const [showThemeBuilder, setShowThemeBuilder] = useState(false);
  const [brandColors, setBrandColors] = useState<BrandColors | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewRetryKey, setPreviewRetryKey] = useState(0);
  const [previewZoom, setPreviewZoom] = useState(100);
  const [fitWidth, setFitWidth] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [activePage, setActivePage] = useState(0);
  const [showPerfHud, setShowPerfHud] = useState(false);
  const [termsConditions, setTermsConditions] = useState<TermsSection[]>([]);
  const [libraryTerms, setLibraryTerms] = useState<TermsSection[]>([]);
  const [termsTemplateName, setTermsTemplateName] = useState("Loading terms…");
  const [usingFallbackTerms, setUsingFallbackTerms] = useState(false);
  const [perfMetrics, setPerfMetrics] = useState<PDFPreviewMetrics | null>(null);
  const canvasRef = useRef<import('./PDFCanvasPreview').PDFCanvasPreviewHandle | null>(null);
  // The mobile and desktop layouts each render their own copy of PreviewPanel (CSS
  // just hides whichever isn't active — both stay mounted). Rendering PDFCanvasPreview
  // in both meant two live instances shared the same canvasRef, so scrollToPage() could
  // end up acting on the display:none copy instead of the visible one. Track the
  // breakpoint in JS (matching Tailwind's md: 768px) so only the actually-visible
  // layout mounts the real preview — the other renders nothing.
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : false
  );
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    const onChange = () => setIsDesktop(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  const [highlightedElement, setHighlightedElement] = useState<string | null>(null);
  const [showItemImages, setShowItemImages] = useState(customizeSettings.showItemImages);
  const pdfGenerationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pdfGenerationIdRef = useRef(0);
  const latestPreviewPayloadRef = useRef<string>("");
  const editorSettingsInitializedRef = useRef(false);
  const prevBlobUrlRef = useRef<string | null>(null);

  
  // Load font preferences from database
  const { preferences: fontPreferences, updatePreferences: saveFontPreferences, loading: fontLoading } = useFontPreferences();

  useEffect(() => {
    if (!open) {
      editorSettingsInitializedRef.current = false;
      return;
    }
    if (fontLoading || editorSettingsInitializedRef.current) return;

    editorSettingsInitializedRef.current = true;
    const savedSettings = getEditorSettings();
    setEditorSettings({
      ...savedSettings,
      headingFont: getSelectableFontId(fontPreferences.headingFont || savedSettings.headingFont || 'times'),
      bodyFont: getSelectableFontId(fontPreferences.bodyFont || savedSettings.bodyFont || 'helvetica'),
      brandColors: brandColors || savedSettings.brandColors,
    });
    setShowEditor(false);
  }, [open, fontLoading, fontPreferences, brandColors]);

  useEffect(() => {
    if (!open || !brandColors) return;
    setEditorSettings((current) => current.brandColors === brandColors
      ? current
      : { ...current, brandColors });
  }, [open, brandColors]);

  useEffect(() => {
    setShowItemImages(customizeSettings.showItemImages);
  }, [customizeSettings.showItemImages]);

  // Refresh profile styling and enabled library terms whenever the preview opens.
  useEffect(() => {
    if (!open) return;
    setTermsReady(false);
    setTermsError('');
    setTermsConditions(DEFAULT_QUOTATION_TERMS);
    setLibraryTerms(DEFAULT_QUOTATION_TERMS);
    setTermsTemplateName('Default quotation terms');
    setUsingFallbackTerms(true);
    let active = true;
    const fallbackTimer = window.setTimeout(() => {
      if (!active) return;
      setTermsError("Saved quotation terms are taking too long to load. Built-in terms are shown instead.");
      setTermsReady(true);
    }, 8000);

    const loadPreviewData = async () => {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (authData.user) {
          const resolved = await getResolvedLibraryTerms(authData.user.id, 'quotation');
          if (active) {
            setTermsConditions(resolved.terms);
            setLibraryTerms(resolved.terms);
            setTermsTemplateName(resolved.templateName);
            setUsingFallbackTerms(resolved.source === 'default');
            setTermsError('');
            setTermsReady(true);
            window.clearTimeout(fallbackTimer);
          }
        } else {
          if (active) {
            setTermsReady(true);
            window.clearTimeout(fallbackTimer);
          }
        }

        if (authData.user) {
          try {
            const { data } = await profileApi.get();
            if (active && data?.brand_colors && typeof data.brand_colors === 'object') {
              const colors = data.brand_colors as unknown as BrandColors;
              if (colors.primary) setBrandColors(colors);
            }
          } catch (error) {
            console.error('Error loading quotation preview brand colors:', error);
          }
        }
      } catch (error) {
        console.error('Error loading quotation preview data:', error);
        if (active) {
          window.clearTimeout(fallbackTimer);
          setTermsConditions(DEFAULT_QUOTATION_TERMS);
          setLibraryTerms(DEFAULT_QUOTATION_TERMS);
          setTermsTemplateName('Default quotation terms');
          setUsingFallbackTerms(true);
          setTermsError('Saved quotation terms could not be loaded. Built-in terms are shown instead.');
          setTermsReady(true);
        }
      }
    };

    void loadPreviewData();
    return () => {
      active = false;
      window.clearTimeout(fallbackTimer);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      // Cleanup blob URL when closing
      if (prevBlobUrlRef.current) {
        URL.revokeObjectURL(prevBlobUrlRef.current);
        prevBlobUrlRef.current = null;
      }
      setPdfBlobUrl(null);
    }
  }, [open]);

  // Generate live PDF preview from an explicit snapshot so typing/sliders can
  // update editor state instantly while the expensive PDF work stays debounced.
  const generateLivePdf = useCallback(async (
    settingsSnapshot: PDFEditorSettings,
    itemImagesSnapshot: boolean,
    jobId: number
  ) => {
    setIsGeneratingPdf(true);
    try {
      // Ensure brand colors are included if enabled
      const currentEditorSettings: PDFEditorSettings = {
        ...settingsSnapshot,
        brandColors: settingsSnapshot.useBrandColors && brandColors ? brandColors : settingsSnapshot.brandColors,
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
        showItemImages: itemImagesSnapshot,
      };

      // Use the same current quotation values as the download path.
      const pdfData: QuotationData = {
        ...quotationData,
        quotationTitle: quotationData.quotationTitle || '',
        clientName: quotationData.clientName || '',
        clientAddress: quotationData.clientAddress || '',
        dateOfProposal: quotationData.dateOfProposal || '',
        quotationValidTill: quotationData.quotationValidTill || '',
        projectDeadline: quotationData.projectDeadline || '',
        placeOfProject: quotationData.placeOfProject || '',
        warranty: quotationData.warranty || '',
        projectType: quotationData.projectType || '',
        sections: quotationData.sections.map(s => ({
          title: s.section_name || s.title || '',
          items: s.items.map(item => ({
            side: item.side || '',
            productName: item.product_name || item.productName || '',
            productDetails: item.product_details || item.productDetails || '',
            widthFt: item.width_ft || item.widthFt || 0,
            heightFt: item.height_ft || item.heightFt || 0,
            sftArea: item.sft_area || item.sftArea || 0,
            ratePerSft: item.rate_per_sft || item.ratePerSft || 0,
            amount: item.amount || 0,
            imageUrls: item.imageUrls || [],
          }))
        })),
        subtotal: quotationData.subtotal,
        gstEnabled: quotationData.gstEnabled ?? false,
        gstRate: quotationData.gstRate ?? 18,
        gstAmount: quotationData.gstAmount,
        discount: quotationData.discount,
        grandTotal: quotationData.grandTotal,
        enableSocialMediaDiscount: quotationData.enableSocialMediaDiscount,
        socialMediaDiscountRate: quotationData.socialMediaDiscountRate,
        paymentStages: quotationData.paymentStages,
        companyLogo: quotationData.companyLogo,
        companyName: quotationData.companyName || '',
        companyAddress: quotationData.companyAddress || '',
        companyPhone: quotationData.companyPhone,
        companyEmail: quotationData.companyEmail,
        gstin: quotationData.gstin,
        professionalAdvantages: quotationData.professionalAdvantages,
        signatureUrl: quotationData.signatureUrl,
        bankDetails: quotationData.bankDetails,
        localization: quotationData.localization,
        termsConditions,
        settings: pdfSettings,
        editorSettings: currentEditorSettings,
        previewOnly: true,
      };

      const doc = await generateQuotationPDF(pdfData);
      if (!doc) {
        throw new Error('Failed to generate PDF document');
      }
      if (jobId !== pdfGenerationIdRef.current) return;

      const blob = doc.output('blob');
      
      const oldBlobUrl = prevBlobUrlRef.current;
      const newBlobUrl = URL.createObjectURL(blob);
      prevBlobUrlRef.current = newBlobUrl;
      setPdfBlobUrl(newBlobUrl);
      if (oldBlobUrl) {
        window.setTimeout(() => URL.revokeObjectURL(oldBlobUrl), 3000);
      }
    } catch (error) {
      console.error('Error generating live PDF preview:', error);
      if (jobId === pdfGenerationIdRef.current) {
        latestPreviewPayloadRef.current = '';
        setPreviewError('Could not update the preview. Try again, or check the edited content.');
      }
    } finally {
      if (jobId === pdfGenerationIdRef.current) {
        setIsGeneratingPdf(false);
      }
    }
  }, [customizeSettings, quotationData, brandColors, termsConditions]);

  // Debounced incremental preview pipeline. Editor changes are saved immediately,
  // but PDF regeneration only receives the latest stable snapshot.
  useEffect(() => {
    if (!open || !termsReady) return;

    const payload = JSON.stringify({ editorSettings, customizeSettings, showItemImages, quotationData, brandColors, termsConditions, previewRetryKey });
    if (payload === latestPreviewPayloadRef.current && prevBlobUrlRef.current) return;
    latestPreviewPayloadRef.current = payload;
    setPreviewError(null);

    if (pdfGenerationTimer.current) {
      clearTimeout(pdfGenerationTimer.current);
    }

    const jobId = ++pdfGenerationIdRef.current;
    const settingsSnapshot = editorSettings;
    const itemImagesSnapshot = showItemImages;
    const debounceMs = prevBlobUrlRef.current ? 350 : 80;
    setIsGeneratingPdf(true);

    pdfGenerationTimer.current = setTimeout(() => {
      void generateLivePdf(settingsSnapshot, itemImagesSnapshot, jobId);
    }, debounceMs);

    return () => {
      if (pdfGenerationTimer.current) {
        clearTimeout(pdfGenerationTimer.current);
      }
      pdfGenerationIdRef.current += 1;
    };
  }, [open, termsReady, editorSettings, customizeSettings, quotationData, brandColors, showItemImages, termsConditions, generateLivePdf, previewRetryKey]);

  const updateSettings = (updates: Partial<PDFEditorSettings>) => {
    const normalizedUpdates = {
      ...updates,
      ...(updates.headingFont ? { headingFont: getSelectableFontId(updates.headingFont) } : {}),
      ...(updates.bodyFont ? { bodyFont: getSelectableFontId(updates.bodyFont) } : {}),
    };
    const newSettings = { ...editorSettings, ...normalizedUpdates };
    setEditorSettings(newSettings);
    saveEditorSettings(newSettings);
    
    // Save font preferences to database if font changed
    if (normalizedUpdates.headingFont || normalizedUpdates.bodyFont) {
      saveFontPreferences({
        headingFont: newSettings.headingFont,
        bodyFont: newSettings.bodyFont,
      });
    }
  };

  const handleReset = () => {
    setEditorSettings(defaultEditorSettings);
    saveEditorSettings(defaultEditorSettings);
  };

  const handleDownload = () => {
    if (!termsReady) return;
    // Ensure brand colors are included if enabled
    const downloadSettings: PDFEditorSettings = {
      ...editorSettings,
      brandColors: editorSettings.useBrandColors && brandColors ? brandColors : editorSettings.brandColors,
    };
    onDownload(downloadSettings, termsConditions);
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
        <TabsList aria-label="Quotation PDF settings sections" className="flex h-11 shrink-0 justify-start gap-1 mx-3 my-3 overflow-x-auto overflow-y-hidden px-1.5 py-1">
          <TabsTrigger value="content" className="shrink-0 gap-1 px-2.5 py-1.5 text-xs">
            <ListTree className="h-3 w-3 shrink-0" />
            Content
          </TabsTrigger>
          <TabsTrigger value="themes" className="shrink-0 gap-1 px-2.5 py-1.5 text-xs">
            <Palette className="h-3 w-3 shrink-0" />
            Themes
          </TabsTrigger>
          <TabsTrigger value="decor" className="shrink-0 gap-1 px-2.5 py-1.5 text-xs">
            <Sparkles className="h-3 w-3 shrink-0" />
            Decor
          </TabsTrigger>
          <TabsTrigger value="layout" className="shrink-0 gap-1 px-2.5 py-1.5 text-xs">
            <Layout className="h-3 w-3 shrink-0" />
            Layout
          </TabsTrigger>
          <TabsTrigger value="style" className="shrink-0 gap-1 px-2.5 py-1.5 text-xs">
            <Eye className="h-3 w-3 shrink-0" />
            Style
          </TabsTrigger>
          <TabsTrigger value="advanced" className="shrink-0 gap-1 px-2.5 py-1.5 text-xs">
            <Sliders className="h-3 w-3 shrink-0" />
            Edit
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0 overflow-auto px-4">
          <TabsContent value="content" className="mt-0">
            <TermsBlockEditor
              value={termsConditions}
              templateName={termsTemplateName}
              usingFallback={usingFallbackTerms}
              onChange={setTermsConditions}
              onReset={() => setTermsConditions(libraryTerms)}
            />
          </TabsContent>
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
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label className="text-sm">Bold Amounts</Label>
                    <p className="text-xs text-muted-foreground">
                      Bold the full amount, including its currency symbol
                    </p>
                  </div>
                  <Switch
                    checked={editorSettings.boldAmounts}
                    onCheckedChange={(v) => updateSettings({ boldAmounts: v })}
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
              <p className="text-xs text-muted-foreground">
                These embedded typefaces update the live PDF preview.
              </p>
              
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
                  {PDF_SELECTABLE_FONTS
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
                  {PDF_SELECTABLE_FONTS
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
              <Select value={editorSettings.fontSize} onValueChange={(v) => updateSettings({ fontSize: v as PDFEditorSettings['fontSize'] })}>
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
              <Select value={editorSettings.tableStyle} onValueChange={(v) => updateSettings({ tableStyle: v as PDFEditorSettings['tableStyle'] })}>
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
              <Select value={editorSettings.headerStyle} onValueChange={(v) => updateSettings({ headerStyle: v as PDFEditorSettings['headerStyle'] })}>
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
              <Select value={editorSettings.summaryStyle} onValueChange={(v) => updateSettings({ summaryStyle: v as PDFEditorSettings['summaryStyle'] })}>
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
              <Select value={editorSettings.pageMargins} onValueChange={(v) => updateSettings({ pageMargins: v as PDFEditorSettings['pageMargins'] })}>
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

  // Preview Panel Component - mobile-first with zoom, page nav, fit-width
  const PreviewPanel = () => {
    const goPrev = () => {
      const next = Math.max(0, activePage - 1);
      canvasRef.current?.scrollToPage(next);
    };
    const goNext = () => {
      const next = Math.min(totalPages - 1, activePage + 1);
      canvasRef.current?.scrollToPage(next);
    };

    return (
      <div className="relative flex-1 min-h-0 bg-muted/30 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-2 sm:px-3 py-2 border-b bg-background/95 backdrop-blur gap-2">
          {/* Page navigation */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 sm:h-8 sm:w-8 rounded-full"
              onClick={goPrev}
              disabled={activePage <= 0}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-[11px] font-medium tabular-nums px-1.5 min-w-[52px] text-center">
              {totalPages > 0 ? `${activePage + 1} / ${totalPages}` : '– / –'}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 sm:h-8 sm:w-8 rounded-full"
              onClick={goNext}
              disabled={activePage >= totalPages - 1}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Zoom + fit controls */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant={fitWidth ? 'default' : 'outline'}
              size="sm"
              className="h-9 sm:h-8 px-2.5 rounded-full"
              onClick={() => setFitWidth(f => !f)}
              aria-pressed={fitWidth}
            >
              <MoveHorizontal className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline text-[11px]">Fit</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 sm:h-8 sm:w-8 rounded-full"
              onClick={() => { setFitWidth(false); setPreviewZoom(Math.max(25, previewZoom - 25)); }}
              disabled={!fitWidth && previewZoom <= 25}
              aria-label="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-center hidden xs:inline sm:inline">
              {fitWidth ? 'Fit' : `${previewZoom}%`}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 sm:h-8 sm:w-8 rounded-full"
              onClick={() => { setFitWidth(false); setPreviewZoom(Math.min(200, previewZoom + 25)); }}
              disabled={!fitWidth && previewZoom >= 200}
              aria-label="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={showPerfHud ? 'default' : 'outline'}
              size="icon"
              className="h-9 w-9 sm:h-8 sm:w-8 rounded-full"
              onClick={() => setShowPerfHud(v => !v)}
              aria-pressed={showPerfHud}
              aria-label="Toggle performance metrics"
              title="Performance metrics"
            >
              <Sliders className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {highlightedElement && (
          <div className="mx-auto mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px]">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {highlightedElement}
          </div>
        )}

        {/* PDF Preview */}
        <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
            {previewError && (
              <div role="alert" className="mx-auto mb-3 flex max-w-[900px] items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
                <span>{previewError}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPreviewError(null);
                    setPreviewRetryKey((current) => current + 1);
                  }}
                >
                  Retry
                </Button>
              </div>
            )}
            {(!termsReady || isGeneratingPdf) && !pdfBlobUrl ? (
            <div className="h-full flex items-center justify-center min-h-[300px]">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  {termsReady ? 'Generating preview...' : 'Loading terms for preview...'}
                </p>
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
              onMetrics={showPerfHud ? setPerfMetrics : undefined}
            />
          )}
        </div>

        {showPerfHud && perfMetrics && (
          <div className="pointer-events-none absolute bottom-3 right-3 z-30 rounded-lg bg-background/95 backdrop-blur border shadow-lg px-2.5 py-1.5 text-[10px] font-mono leading-tight tabular-nums text-muted-foreground">
            <div className="flex items-center gap-1 text-foreground font-semibold">
              <CircleDot className={`h-2.5 w-2.5 ${perfMetrics.fps >= 50 ? 'text-green-500' : perfMetrics.fps >= 30 ? 'text-amber-500' : 'text-red-500'}`} />
              {perfMetrics.fps} fps · {perfMetrics.frameDrops} drops
            </div>
            <div>render: {perfMetrics.lastRenderMs}ms (avg {perfMetrics.avgRenderMs}ms)</div>
            <div>pages mounted: {perfMetrics.mountedPages}/{perfMetrics.totalPages}</div>
          </div>
        )}
      </div>
    );
  };


  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="h-[90dvh] p-0 flex flex-col md:max-w-none md:h-[90vh]">
        <SheetHeader
          className="px-4 pb-3 border-b shrink-0"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
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
          {showEditor ? EditorPanel() : (!isDesktop && PreviewPanel())}
        </div>

        {/* Desktop View */}
        <div className="hidden md:flex flex-1 overflow-hidden">
          <div className="w-80 border-r flex flex-col">
            {EditorPanel()}
          </div>
          {isDesktop && PreviewPanel()}
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
