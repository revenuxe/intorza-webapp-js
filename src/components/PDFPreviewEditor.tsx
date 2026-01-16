import { useState, useEffect, useRef } from "react";
import { Download, Palette, Layout, Eye, RotateCcw, Check, Settings2, ArrowLeft, Sparkles, Frame, Flower2, Shapes, Crown, FileText, Wand2, CircleDot, Search, Type, Sliders } from "lucide-react";
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
  const previewRef = useRef<HTMLDivElement>(null);
  
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
      // Apply saved font preferences from database and include brand colors if available
      setEditorSettings({
        ...savedSettings,
        headingFont: fontPreferences.headingFont || savedSettings.headingFont || 'times',
        bodyFont: fontPreferences.bodyFont || savedSettings.bodyFont || 'helvetica',
        brandColors: brandColors || savedSettings.brandColors,
      });
      setShowEditor(false);
    }
  }, [open, fontPreferences, brandColors]);

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
              <Label className="text-sm font-semibold">Header Info Columns</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Choose how quotation details are displayed
              </p>
              <RadioGroup
                value={String(editorSettings.headerInfoColumns || 2)}
                onValueChange={(v) => updateSettings({ headerInfoColumns: parseInt(v) as 1 | 2 | 3 })}
                className="grid grid-cols-3 gap-2"
              >
                {[1, 2, 3].map((cols) => (
                  <div key={cols}>
                    <RadioGroupItem value={String(cols)} id={`cols-${cols}`} className="peer sr-only" />
                    <Label
                      htmlFor={`cols-${cols}`}
                      className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                    >
                      <div className="w-full h-6 border rounded mb-1 flex items-center gap-1 px-1">
                        {Array.from({ length: cols }).map((_, i) => (
                          <div 
                            key={i}
                            className="flex-1 h-3 bg-muted-foreground/30 rounded"
                          />
                        ))}
                      </div>
                      <span className="text-[10px]">{cols} Column{cols > 1 ? 's' : ''}</span>
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

  // Preview Panel Component
  const PreviewPanel = () => (
    <div className="flex-1 min-h-0 bg-muted/30 overflow-y-auto p-4 md:p-6">
      <div 
        ref={previewRef}
        className="bg-white shadow-lg mx-auto max-w-[595px] min-h-[600px] md:min-h-[842px] p-6 md:p-8 text-sm relative"
        style={{
          ...getPreviewStyles(),
          ...(editorSettings.showDecorations && editorSettings.showPageBorder ? {
            border: `${currentTheme.decorations.borderWidth * 2}px ${currentTheme.decorations.borderStyle === 'double' ? 'double' : currentTheme.decorations.borderStyle === 'dashed' ? 'dashed' : 'solid'} ${getDecorationColor()}`,
          } : {})
        }}
      >
        {/* Corner Ornaments (Preview) */}
        {editorSettings.showDecorations && editorSettings.showCornerOrnaments && currentTheme.decorations.showCornerOrnaments && (
          <>
            {/* Top-left corner */}
            <div 
              className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2"
              style={{ 
                borderColor: getDecorationColor(),
                borderRadius: currentTheme.decorations.cornerStyle === 'rounded' ? '4px 0 0 0' : '0',
              }}
            >
              {currentTheme.decorations.cornerStyle === 'floral' && (
                <Flower2 className="h-3 w-3 absolute -top-1.5 -left-1.5" style={{ color: getDecorationColor() }} />
              )}
            </div>
            {/* Top-right corner */}
            <div 
              className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2"
              style={{ 
                borderColor: getDecorationColor(),
                borderRadius: currentTheme.decorations.cornerStyle === 'rounded' ? '0 4px 0 0' : '0',
              }}
            >
              {currentTheme.decorations.cornerStyle === 'floral' && (
                <Flower2 className="h-3 w-3 absolute -top-1.5 -right-1.5" style={{ color: getDecorationColor() }} />
              )}
            </div>
            {/* Bottom-left corner */}
            <div 
              className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2"
              style={{ 
                borderColor: getDecorationColor(),
                borderRadius: currentTheme.decorations.cornerStyle === 'rounded' ? '0 0 0 4px' : '0',
              }}
            >
              {currentTheme.decorations.cornerStyle === 'floral' && (
                <Flower2 className="h-3 w-3 absolute -bottom-1.5 -left-1.5" style={{ color: getDecorationColor() }} />
              )}
            </div>
            {/* Bottom-right corner */}
            <div 
              className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2"
              style={{ 
                borderColor: getDecorationColor(),
                borderRadius: currentTheme.decorations.cornerStyle === 'rounded' ? '0 0 4px 0' : '0',
              }}
            >
              {currentTheme.decorations.cornerStyle === 'floral' && (
                <Flower2 className="h-3 w-3 absolute -bottom-1.5 -right-1.5" style={{ color: getDecorationColor() }} />
              )}
            </div>
          </>
        )}

        {/* Preview Header */}
        <div 
          className={`flex items-center mb-6 pb-4 ${
            editorSettings.logoPlacement === 'center' ? 'flex-col text-center' : 
            editorSettings.logoPlacement === 'right' ? 'flex-row-reverse' : 'flex-row'
          }`}
          style={{ borderBottom: editorSettings.showBorders ? `2px solid rgb(${currentTheme.colors.border.join(',')})` : 'none' }}
        >
          {customizeSettings.showCompanyLogo && (
            <div 
              className={`w-14 h-14 md:w-16 md:h-16 rounded flex items-center justify-center text-white text-xs font-bold ${
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
            <h1 className="text-base md:text-lg font-bold" style={{ color: `rgb(${currentTheme.colors.text.join(',')})` }}>
              {quotationData.companyName || 'Company Name'}
            </h1>
            {customizeSettings.showCompanyAddress && (
              <p className="text-xs" style={{ color: `rgb(${currentTheme.colors.textSecondary.join(',')})` }}>
                Company Address & Contact
              </p>
            )}
          </div>
        </div>

        {/* Client & Project Cards - Dynamic Columns */}
        {customizeSettings.showProjectDetails && (
          <div 
            className={`grid gap-3 mb-6 ${
              (editorSettings.headerInfoColumns || 2) === 1 
                ? 'grid-cols-1' 
                : (editorSettings.headerInfoColumns || 2) === 3 
                  ? 'grid-cols-1 md:grid-cols-3' 
                  : 'grid-cols-1 md:grid-cols-2'
            }`}
          >
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
            {(editorSettings.headerInfoColumns || 2) === 3 && (
              <div 
                className="p-3 rounded"
                style={{ ...getCardStyle(), border: editorSettings.showBorders ? '1px solid' : 'none' }}
              >
                <p className="text-[10px] font-medium mb-1" style={{ color: `rgb(${currentTheme.colors.textSecondary.join(',')})` }}>
                  VALIDITY
                </p>
                <div className="space-y-1 text-[10px]">
                  <p>Valid Till: DD/MM/YYYY</p>
                  <p>Place: Project Location</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section Divider (Preview) */}
        {editorSettings.showDecorations && editorSettings.showSectionDividers && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 h-px" style={{ backgroundColor: getDecorationColor(), opacity: 0.5 }} />
            {currentTheme.decorations.dividerStyle === 'diamonds' && (
              <div className="w-2 h-2 rotate-45" style={{ backgroundColor: getDecorationColor() }} />
            )}
            {currentTheme.decorations.dividerStyle === 'hearts' && (
              <span style={{ color: getDecorationColor() }}>♥</span>
            )}
            {currentTheme.decorations.dividerStyle === 'stars' && (
              <span style={{ color: getDecorationColor() }}>★</span>
            )}
            {currentTheme.decorations.dividerStyle === 'leaves' && (
              <span style={{ color: getDecorationColor() }}>🌿</span>
            )}
            <div className="flex-1 h-px" style={{ backgroundColor: getDecorationColor(), opacity: 0.5 }} />
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
                  </>
                )}
                <th className="p-2 text-center border" style={{ borderColor: `rgb(${currentTheme.colors.border.join(',')})` }}>Area</th>
                <th className="p-2 text-center border" style={{ borderColor: `rgb(${currentTheme.colors.border.join(',')})` }}>Rate</th>
                <th className="p-2 text-right border" style={{ borderColor: `rgb(${currentTheme.colors.border.join(',')})` }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {customizeSettings.showSideColumn && <td className="p-2 border" style={{ borderColor: `rgb(${currentTheme.colors.border.join(',')})` }}>Left</td>}
                <td className="p-2 border" style={{ borderColor: `rgb(${currentTheme.colors.border.join(',')})` }}>Sample Item</td>
                {customizeSettings.showProductDetails && <td className="p-2 border" style={{ borderColor: `rgb(${currentTheme.colors.border.join(',')})` }}>Details here</td>}
                {customizeSettings.showDetailedSizeColumns && (
                  <>
                    <td className="p-2 text-center border" style={{ borderColor: `rgb(${currentTheme.colors.border.join(',')})` }}>4</td>
                    <td className="p-2 text-center border" style={{ borderColor: `rgb(${currentTheme.colors.border.join(',')})` }}>8</td>
                  </>
                )}
                <td className="p-2 text-center border" style={{ borderColor: `rgb(${currentTheme.colors.border.join(',')})` }}>32</td>
                <td className="p-2 text-center border" style={{ borderColor: `rgb(${currentTheme.colors.border.join(',')})` }}>₹850</td>
                <td className="p-2 text-right border" style={{ borderColor: `rgb(${currentTheme.colors.border.join(',')})` }}>
                  <span style={getHighlightStyle()}>₹27,200</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="flex justify-end mb-6">
          <div 
            className="w-48 md:w-56 p-3 rounded"
            style={{ ...getCardStyle(), border: editorSettings.showBorders ? '1px solid' : 'none' }}
          >
            <div className="flex justify-between mb-1 text-xs">
              <span>Subtotal</span>
              <span style={getHighlightStyle()}>₹{quotationData.subtotal?.toLocaleString() || '50,000'}</span>
            </div>
            <div className="flex justify-between mb-1 text-xs">
              <span>Discount</span>
              <span>-₹3,000</span>
            </div>
            <div className="flex justify-between mb-1 text-xs">
              <span>GST (18%)</span>
              <span>₹8,460</span>
            </div>
            <div 
              className="flex justify-between pt-2 mt-2 font-bold text-sm"
              style={{ borderTop: `1px solid rgb(${currentTheme.colors.border.join(',')})` }}
            >
              <span>Grand Total</span>
              <span style={getHighlightStyle()}>₹{quotationData.grandTotal?.toLocaleString() || '55,460'}</span>
            </div>
          </div>
        </div>

        {/* Signature Area */}
        <div className="grid grid-cols-2 gap-4 mt-8 pt-4" style={{ borderTop: `1px solid rgb(${currentTheme.colors.border.join(',')})` }}>
          <div className="text-center">
            <div className="h-12 border-b mb-1" style={{ borderColor: `rgb(${currentTheme.colors.border.join(',')})` }}></div>
            <p className="text-[9px]" style={{ color: `rgb(${currentTheme.colors.textSecondary.join(',')})` }}>Customer Signature</p>
          </div>
          <div className="text-center">
            <div className="h-12 border-b mb-1" style={{ borderColor: `rgb(${currentTheme.colors.border.join(',')})` }}></div>
            <p className="text-[9px]" style={{ color: `rgb(${currentTheme.colors.textSecondary.join(',')})` }}>Authorized Signature</p>
          </div>
        </div>
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
