import { useState, useEffect } from "react";
import { 
  Wand2, 
  Palette, 
  Frame, 
  Sparkles, 
  CornerRightDown, 
  Minus, 
  Save, 
  Trash2, 
  RefreshCw,
  Check,
  PaintBucket,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BorderStyle,
  CornerStyle,
  DividerStyle,
  HeaderDecoration,
  WatermarkStyle,
  ThemeDecorations,
  PDFTheme,
  hexToRgb,
  rgbToHex,
} from "@/lib/pdfThemes";

interface CustomTheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    highlight: string;
    headerBg: string;
    headerText: string;
    decorationPrimary: string;
  };
  decorations: ThemeDecorations;
  createdAt: string;
}

interface CustomThemeBuilderProps {
  open: boolean;
  onClose: () => void;
  onSelectTheme: (themeId: string) => void;
  currentThemeId?: string;
}

// Style options with visual descriptions
const BORDER_STYLES: { value: BorderStyle; label: string; description: string }[] = [
  { value: 'solid', label: 'Solid', description: 'Clean single line' },
  { value: 'dashed', label: 'Dashed', description: 'Segmented line' },
  { value: 'dotted', label: 'Dotted', description: 'Dotted pattern' },
  { value: 'double', label: 'Double', description: 'Two parallel lines' },
  { value: 'triple', label: 'Triple', description: 'Three parallel lines' },
  { value: 'ornate', label: 'Ornate', description: 'Decorative flourishes' },
  { value: 'elegant', label: 'Elegant', description: 'Thin with accents' },
  { value: 'chain', label: 'Chain', description: 'Chain link pattern' },
  { value: 'zigzag', label: 'Zigzag', description: 'Zig-zag pattern' },
  { value: 'rope', label: 'Rope', description: 'Twisted rope look' },
];

const CORNER_STYLES: { value: CornerStyle; label: string; description: string }[] = [
  { value: 'none', label: 'None', description: 'No decoration' },
  { value: 'simple', label: 'Simple', description: 'Basic corner marks' },
  { value: 'rounded', label: 'Rounded', description: 'Soft curves' },
  { value: 'flourish', label: 'Flourish', description: 'Elegant swirls' },
  { value: 'decorative', label: 'Decorative', description: 'Ornamental design' },
  { value: 'floral', label: 'Floral', description: 'Flower motifs' },
  { value: 'art-deco', label: 'Art Deco', description: 'Geometric art deco' },
  { value: 'celtic', label: 'Celtic', description: 'Celtic knot pattern' },
  { value: 'indian', label: 'Indian', description: 'Traditional Indian' },
  { value: 'baroque', label: 'Baroque', description: 'Rich baroque style' },
  { value: 'leaf', label: 'Leaf', description: 'Natural leaves' },
  { value: 'scroll', label: 'Scroll', description: 'Classic scrollwork' },
];

const DIVIDER_STYLES: { value: DividerStyle; label: string; description: string }[] = [
  { value: 'line', label: 'Line', description: 'Simple line' },
  { value: 'dots', label: 'Dots', description: 'Dot pattern' },
  { value: 'wave', label: 'Wave', description: 'Wavy line' },
  { value: 'arrows', label: 'Arrows', description: 'Arrow markers' },
  { value: 'diamonds', label: 'Diamonds', description: 'Diamond shapes' },
  { value: 'hearts', label: 'Hearts', description: 'Heart symbols' },
  { value: 'leaves', label: 'Leaves', description: 'Leaf pattern' },
  { value: 'stars', label: 'Stars', description: 'Star markers' },
  { value: 'paisley', label: 'Paisley', description: 'Paisley pattern' },
  { value: 'lotus', label: 'Lotus', description: 'Lotus flowers' },
  { value: 'geometric', label: 'Geometric', description: 'Geometric shapes' },
  { value: 'swirl', label: 'Swirl', description: 'Swirl pattern' },
  { value: 'chain', label: 'Chain', description: 'Chain links' },
  { value: 'fleur-de-lis', label: 'Fleur-de-Lis', description: 'Classic lily' },
];

const HEADER_DECORATIONS: { value: HeaderDecoration; label: string; description: string }[] = [
  { value: 'none', label: 'None', description: 'No decoration' },
  { value: 'underline', label: 'Underline', description: 'Simple underline' },
  { value: 'box', label: 'Box', description: 'Boxed header' },
  { value: 'banner', label: 'Banner', description: 'Banner style' },
  { value: 'ribbon', label: 'Ribbon', description: 'Ribbon effect' },
  { value: 'ornamental', label: 'Ornamental', description: 'Decorative' },
  { value: 'gradient-bar', label: 'Gradient Bar', description: 'Gradient accent' },
  { value: 'double-line', label: 'Double Line', description: 'Double underline' },
  { value: 'bracket', label: 'Bracket', description: 'Bracket style' },
  { value: 'scroll', label: 'Scroll', description: 'Scroll design' },
];

const WATERMARK_STYLES: { value: WatermarkStyle; label: string; description: string }[] = [
  { value: 'none', label: 'None', description: 'No watermark' },
  { value: 'subtle', label: 'Subtle', description: 'Light pattern' },
  { value: 'pattern', label: 'Pattern', description: 'Repeating pattern' },
  { value: 'mandala', label: 'Mandala', description: 'Mandala design' },
  { value: 'geometric', label: 'Geometric', description: 'Geometric shapes' },
  { value: 'floral-pattern', label: 'Floral', description: 'Floral pattern' },
  { value: 'damask', label: 'Damask', description: 'Damask pattern' },
];

const COLOR_PRESETS = [
  { name: 'Classic Blue', primary: '#1e40af', accent: '#3b82f6', highlight: '#dbeafe' },
  { name: 'Forest Green', primary: '#166534', accent: '#22c55e', highlight: '#dcfce7' },
  { name: 'Royal Purple', primary: '#7c3aed', accent: '#a855f7', highlight: '#f3e8ff' },
  { name: 'Warm Orange', primary: '#ea580c', accent: '#f97316', highlight: '#ffedd5' },
  { name: 'Rose Gold', primary: '#be123c', accent: '#f43f5e', highlight: '#ffe4e6' },
  { name: 'Ocean Teal', primary: '#0d9488', accent: '#14b8a6', highlight: '#ccfbf1' },
  { name: 'Midnight', primary: '#1e293b', accent: '#475569', highlight: '#e2e8f0' },
  { name: 'Golden', primary: '#ca8a04', accent: '#eab308', highlight: '#fef9c3' },
];

const getDefaultCustomTheme = (): CustomTheme => ({
  id: `custom-${Date.now()}`,
  name: 'My Custom Theme',
  colors: {
    primary: '#1e40af',
    secondary: '#3b82f6',
    accent: '#60a5fa',
    background: '#ffffff',
    text: '#1f2937',
    highlight: '#dbeafe',
    headerBg: '#1e40af',
    headerText: '#ffffff',
    decorationPrimary: '#3b82f6',
  },
  decorations: {
    borderStyle: 'double',
    borderWidth: 1,
    showCornerOrnaments: true,
    cornerStyle: 'flourish',
    dividerStyle: 'diamonds',
    showSectionDividers: true,
    headerDecoration: 'underline',
    showHeaderAccent: true,
    showPageBorder: true,
    pageBorderInset: 10,
    showWatermark: false,
    watermarkStyle: 'none',
    watermarkOpacity: 0.03,
    tableHeaderDecoration: 'bordered',
    showTableRowDividers: true,
    showFooterDecoration: true,
    footerStyle: 'minimal',
  },
  createdAt: new Date().toISOString(),
});

// Storage helpers
const CUSTOM_THEMES_KEY = 'customPdfThemes';

const getStoredCustomThemes = (): CustomTheme[] => {
  try {
    const stored = localStorage.getItem(CUSTOM_THEMES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveCustomThemes = (themes: CustomTheme[]) => {
  localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes));
};

export const getCustomThemesAsPDFThemes = (): PDFTheme[] => {
  const customThemes = getStoredCustomThemes();
  return customThemes.map(ct => ({
    id: ct.id,
    name: ct.name,
    description: 'Custom theme',
    category: 'decoration' as const,
    colors: {
      primary: hexToRgb(ct.colors.primary),
      secondary: hexToRgb(ct.colors.secondary),
      accent: hexToRgb(ct.colors.accent),
      background: hexToRgb(ct.colors.background),
      cardBackground: hexToRgb(ct.colors.background),
      text: hexToRgb(ct.colors.text),
      textSecondary: hexToRgb(ct.colors.text),
      border: hexToRgb(ct.colors.primary),
      highlight: hexToRgb(ct.colors.highlight),
      headerBg: hexToRgb(ct.colors.headerBg),
      headerText: hexToRgb(ct.colors.headerText),
      decorationPrimary: hexToRgb(ct.colors.decorationPrimary),
      decorationSecondary: hexToRgb(ct.colors.accent),
    },
    fonts: {
      heading: 'helvetica',
      body: 'helvetica',
    },
    decorations: ct.decorations,
  }));
};

export const CustomThemeBuilder = ({ 
  open, 
  onClose, 
  onSelectTheme,
  currentThemeId 
}: CustomThemeBuilderProps) => {
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
  const [editingTheme, setEditingTheme] = useState<CustomTheme | null>(null);
  const [activeTab, setActiveTab] = useState<'gallery' | 'builder'>('gallery');
  const [builderTab, setBuilderTab] = useState<'colors' | 'borders' | 'corners' | 'dividers' | 'extras'>('colors');

  useEffect(() => {
    if (open) {
      setCustomThemes(getStoredCustomThemes());
    }
  }, [open]);

  const handleCreateNew = () => {
    setEditingTheme(getDefaultCustomTheme());
    setActiveTab('builder');
  };

  const handleEditTheme = (theme: CustomTheme) => {
    setEditingTheme({ ...theme });
    setActiveTab('builder');
  };

  const handleDeleteTheme = (themeId: string) => {
    const updated = customThemes.filter(t => t.id !== themeId);
    setCustomThemes(updated);
    saveCustomThemes(updated);
    toast.success('Theme deleted');
  };

  const handleSaveTheme = () => {
    if (!editingTheme) return;
    
    if (!editingTheme.name.trim()) {
      toast.error('Please enter a theme name');
      return;
    }

    const existing = customThemes.findIndex(t => t.id === editingTheme.id);
    let updated: CustomTheme[];
    
    if (existing >= 0) {
      updated = [...customThemes];
      updated[existing] = editingTheme;
    } else {
      updated = [...customThemes, editingTheme];
    }
    
    setCustomThemes(updated);
    saveCustomThemes(updated);
    toast.success('Theme saved successfully!');
    setActiveTab('gallery');
    setEditingTheme(null);
  };

  const handleSelectTheme = (themeId: string) => {
    onSelectTheme(themeId);
    onClose();
  };

  const updateEditingTheme = (updates: Partial<CustomTheme>) => {
    if (!editingTheme) return;
    setEditingTheme({ ...editingTheme, ...updates });
  };

  const updateColors = (colorUpdates: Partial<CustomTheme['colors']>) => {
    if (!editingTheme) return;
    setEditingTheme({
      ...editingTheme,
      colors: { ...editingTheme.colors, ...colorUpdates },
    });
  };

  const updateDecorations = (decorationUpdates: Partial<ThemeDecorations>) => {
    if (!editingTheme) return;
    setEditingTheme({
      ...editingTheme,
      decorations: { ...editingTheme.decorations, ...decorationUpdates },
    });
  };

  const applyColorPreset = (preset: typeof COLOR_PRESETS[0]) => {
    updateColors({
      primary: preset.primary,
      headerBg: preset.primary,
      accent: preset.accent,
      decorationPrimary: preset.accent,
      highlight: preset.highlight,
    });
  };

  // Preview mini-card component
  const ThemePreviewCard = ({ theme, isSelected, onClick, onEdit, onDelete }: {
    theme: CustomTheme;
    isSelected: boolean;
    onClick: () => void;
    onEdit: () => void;
    onDelete: () => void;
  }) => (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-lg ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={onClick}
    >
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium truncate flex-1">{theme.name}</CardTitle>
          {isSelected && <Check className="h-4 w-4 text-primary" />}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {/* Color preview */}
        <div className="flex gap-1 mb-2">
          {[theme.colors.primary, theme.colors.accent, theme.colors.highlight].map((color, i) => (
            <div 
              key={i}
              className="w-6 h-6 rounded-full border"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        {/* Decoration badges */}
        <div className="flex flex-wrap gap-1 mb-2">
          <Badge variant="outline" className="text-[10px] px-1.5">
            {theme.decorations.borderStyle}
          </Badge>
          <Badge variant="outline" className="text-[10px] px-1.5">
            {theme.decorations.cornerStyle}
          </Badge>
        </div>
        {/* Actions */}
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-destructive hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Style selector grid component
  const StyleGrid = <T extends string>({ 
    options, 
    value, 
    onChange,
    columns = 3
  }: {
    options: { value: T; label: string; description: string }[];
    value: T;
    onChange: (val: T) => void;
    columns?: number;
  }) => (
    <div className={`grid grid-cols-${columns} gap-2`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`p-3 rounded-lg border-2 text-left transition-all hover:bg-accent/50 ${
            value === opt.value 
              ? 'border-primary bg-primary/5' 
              : 'border-muted hover:border-primary/50'
          }`}
        >
          <div className="font-medium text-sm">{opt.label}</div>
          <div className="text-xs text-muted-foreground">{opt.description}</div>
        </button>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Custom Theme Builder
          </DialogTitle>
          <DialogDescription>
            Create personalized themes by mixing colors, borders, corners, and dividers
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'gallery' | 'builder')} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 mt-4 w-fit">
            <TabsTrigger value="gallery" className="gap-2">
              <Layers className="h-4 w-4" />
              My Themes
            </TabsTrigger>
            <TabsTrigger value="builder" className="gap-2" disabled={!editingTheme}>
              <Wand2 className="h-4 w-4" />
              Builder
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="flex-1 overflow-hidden m-0 px-6 py-4">
            <ScrollArea className="h-full">
              {customThemes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Palette className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No Custom Themes Yet</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Create your first custom theme to personalize your PDFs
                  </p>
                  <Button onClick={handleCreateNew}>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Create New Theme
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      {customThemes.length} custom theme{customThemes.length !== 1 ? 's' : ''}
                    </p>
                    <Button size="sm" onClick={handleCreateNew}>
                      <Wand2 className="h-4 w-4 mr-2" />
                      New Theme
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {customThemes.map((theme) => (
                      <ThemePreviewCard
                        key={theme.id}
                        theme={theme}
                        isSelected={currentThemeId === theme.id}
                        onClick={() => handleSelectTheme(theme.id)}
                        onEdit={() => handleEditTheme(theme)}
                        onDelete={() => handleDeleteTheme(theme.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="builder" className="flex-1 overflow-hidden m-0 flex flex-col">
            {editingTheme && (
              <>
                {/* Theme name */}
                <div className="px-6 py-3 border-b flex items-center gap-4">
                  <Label className="text-sm font-medium whitespace-nowrap">Theme Name:</Label>
                  <Input
                    value={editingTheme.name}
                    onChange={(e) => updateEditingTheme({ name: e.target.value })}
                    placeholder="Enter theme name..."
                    className="max-w-xs"
                  />
                </div>

                {/* Builder tabs */}
                <Tabs value={builderTab} onValueChange={(v) => setBuilderTab(v as any)} className="flex-1 flex flex-col min-h-0">
                  <TabsList className="mx-6 mt-3 w-fit">
                    <TabsTrigger value="colors" className="text-xs gap-1.5">
                      <PaintBucket className="h-3.5 w-3.5" />
                      Colors
                    </TabsTrigger>
                    <TabsTrigger value="borders" className="text-xs gap-1.5">
                      <Frame className="h-3.5 w-3.5" />
                      Borders
                    </TabsTrigger>
                    <TabsTrigger value="corners" className="text-xs gap-1.5">
                      <CornerRightDown className="h-3.5 w-3.5" />
                      Corners
                    </TabsTrigger>
                    <TabsTrigger value="dividers" className="text-xs gap-1.5">
                      <Minus className="h-3.5 w-3.5" />
                      Dividers
                    </TabsTrigger>
                    <TabsTrigger value="extras" className="text-xs gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      Extras
                    </TabsTrigger>
                  </TabsList>

                  <ScrollArea className="flex-1 px-6 py-4">
                    {/* Colors Tab */}
                    <TabsContent value="colors" className="m-0 space-y-6">
                      {/* Color presets */}
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold">Quick Color Presets</Label>
                        <div className="grid grid-cols-4 gap-2">
                          {COLOR_PRESETS.map((preset) => (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => applyColorPreset(preset)}
                              className="p-2 rounded-lg border hover:border-primary transition-colors text-left"
                            >
                              <div className="flex gap-1 mb-1">
                                {[preset.primary, preset.accent, preset.highlight].map((c, i) => (
                                  <div key={i} className="w-4 h-4 rounded-full" style={{ backgroundColor: c }} />
                                ))}
                              </div>
                              <span className="text-xs">{preset.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Individual color pickers */}
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { key: 'primary', label: 'Primary Color' },
                          { key: 'accent', label: 'Accent Color' },
                          { key: 'highlight', label: 'Highlight Background' },
                          { key: 'background', label: 'Page Background' },
                          { key: 'text', label: 'Text Color' },
                          { key: 'headerBg', label: 'Header Background' },
                          { key: 'headerText', label: 'Header Text' },
                          { key: 'decorationPrimary', label: 'Decoration Color' },
                        ].map(({ key, label }) => (
                          <div key={key} className="space-y-1.5">
                            <Label className="text-xs">{label}</Label>
                            <div className="flex gap-2">
                              <input
                                type="color"
                                value={editingTheme.colors[key as keyof typeof editingTheme.colors]}
                                onChange={(e) => updateColors({ [key]: e.target.value })}
                                className="w-10 h-10 rounded cursor-pointer"
                              />
                              <Input
                                value={editingTheme.colors[key as keyof typeof editingTheme.colors]}
                                onChange={(e) => updateColors({ [key]: e.target.value })}
                                className="font-mono text-xs"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    {/* Borders Tab */}
                    <TabsContent value="borders" className="m-0 space-y-6">
                      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                        <div>
                          <Label className="text-sm font-medium">Show Page Border</Label>
                          <p className="text-xs text-muted-foreground">Display decorative border around pages</p>
                        </div>
                        <Switch
                          checked={editingTheme.decorations.showPageBorder}
                          onCheckedChange={(v) => updateDecorations({ showPageBorder: v })}
                        />
                      </div>

                      {editingTheme.decorations.showPageBorder && (
                        <>
                          <div className="space-y-3">
                            <Label className="text-sm font-semibold">Border Style</Label>
                            <StyleGrid
                              options={BORDER_STYLES}
                              value={editingTheme.decorations.borderStyle}
                              onChange={(v) => updateDecorations({ borderStyle: v })}
                              columns={2}
                            />
                          </div>

                          <div className="space-y-3">
                            <Label className="text-sm font-semibold">Border Width: {editingTheme.decorations.borderWidth}px</Label>
                            <Slider
                              value={[editingTheme.decorations.borderWidth]}
                              onValueChange={([v]) => updateDecorations({ borderWidth: v })}
                              min={0.5}
                              max={3}
                              step={0.1}
                            />
                          </div>

                          <div className="space-y-3">
                            <Label className="text-sm font-semibold">Border Inset: {editingTheme.decorations.pageBorderInset}mm</Label>
                            <Slider
                              value={[editingTheme.decorations.pageBorderInset]}
                              onValueChange={([v]) => updateDecorations({ pageBorderInset: v })}
                              min={5}
                              max={20}
                              step={1}
                            />
                          </div>
                        </>
                      )}
                    </TabsContent>

                    {/* Corners Tab */}
                    <TabsContent value="corners" className="m-0 space-y-6">
                      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                        <div>
                          <Label className="text-sm font-medium">Show Corner Ornaments</Label>
                          <p className="text-xs text-muted-foreground">Decorative elements in page corners</p>
                        </div>
                        <Switch
                          checked={editingTheme.decorations.showCornerOrnaments}
                          onCheckedChange={(v) => updateDecorations({ showCornerOrnaments: v })}
                        />
                      </div>

                      {editingTheme.decorations.showCornerOrnaments && (
                        <div className="space-y-3">
                          <Label className="text-sm font-semibold">Corner Style</Label>
                          <StyleGrid
                            options={CORNER_STYLES}
                            value={editingTheme.decorations.cornerStyle}
                            onChange={(v) => updateDecorations({ cornerStyle: v })}
                            columns={3}
                          />
                        </div>
                      )}
                    </TabsContent>

                    {/* Dividers Tab */}
                    <TabsContent value="dividers" className="m-0 space-y-6">
                      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                        <div>
                          <Label className="text-sm font-medium">Show Section Dividers</Label>
                          <p className="text-xs text-muted-foreground">Decorative lines between sections</p>
                        </div>
                        <Switch
                          checked={editingTheme.decorations.showSectionDividers}
                          onCheckedChange={(v) => updateDecorations({ showSectionDividers: v })}
                        />
                      </div>

                      {editingTheme.decorations.showSectionDividers && (
                        <div className="space-y-3">
                          <Label className="text-sm font-semibold">Divider Style</Label>
                          <StyleGrid
                            options={DIVIDER_STYLES}
                            value={editingTheme.decorations.dividerStyle}
                            onChange={(v) => updateDecorations({ dividerStyle: v })}
                            columns={3}
                          />
                        </div>
                      )}
                    </TabsContent>

                    {/* Extras Tab */}
                    <TabsContent value="extras" className="m-0 space-y-6">
                      {/* Header decoration */}
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold">Header Decoration</Label>
                        <StyleGrid
                          options={HEADER_DECORATIONS}
                          value={editingTheme.decorations.headerDecoration}
                          onChange={(v) => updateDecorations({ headerDecoration: v })}
                          columns={2}
                        />
                      </div>

                      {/* Watermark */}
                      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                        <div>
                          <Label className="text-sm font-medium">Show Watermark</Label>
                          <p className="text-xs text-muted-foreground">Subtle background pattern</p>
                        </div>
                        <Switch
                          checked={editingTheme.decorations.showWatermark}
                          onCheckedChange={(v) => updateDecorations({ showWatermark: v })}
                        />
                      </div>

                      {editingTheme.decorations.showWatermark && (
                        <>
                          <div className="space-y-3">
                            <Label className="text-sm font-semibold">Watermark Style</Label>
                            <StyleGrid
                              options={WATERMARK_STYLES}
                              value={editingTheme.decorations.watermarkStyle}
                              onChange={(v) => updateDecorations({ watermarkStyle: v })}
                              columns={2}
                            />
                          </div>
                          <div className="space-y-3">
                            <Label className="text-sm font-semibold">
                              Watermark Opacity: {Math.round(editingTheme.decorations.watermarkOpacity * 100)}%
                            </Label>
                            <Slider
                              value={[editingTheme.decorations.watermarkOpacity * 100]}
                              onValueChange={([v]) => updateDecorations({ watermarkOpacity: v / 100 })}
                              min={1}
                              max={10}
                              step={1}
                            />
                          </div>
                        </>
                      )}

                      {/* Table & Footer */}
                      <div className="space-y-4 pt-4 border-t">
                        <Label className="text-sm font-semibold">Table Style</Label>
                        <Select
                          value={editingTheme.decorations.tableHeaderDecoration}
                          onValueChange={(v) => updateDecorations({ tableHeaderDecoration: v as any })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="plain">Plain</SelectItem>
                            <SelectItem value="gradient">Gradient</SelectItem>
                            <SelectItem value="striped">Striped</SelectItem>
                            <SelectItem value="bordered">Bordered</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-sm font-semibold">Footer Style</Label>
                        <Select
                          value={editingTheme.decorations.footerStyle}
                          onValueChange={(v) => updateDecorations({ footerStyle: v as any })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minimal">Minimal</SelectItem>
                            <SelectItem value="centered">Centered</SelectItem>
                            <SelectItem value="ornamental">Ornamental</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TabsContent>
                  </ScrollArea>
                </Tabs>

                {/* Builder footer */}
                <div className="px-6 py-4 border-t flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingTheme(null);
                      setActiveTab('gallery');
                    }}
                  >
                    Cancel
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setEditingTheme(getDefaultCustomTheme())}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                    <Button onClick={handleSaveTheme}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Theme
                    </Button>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {activeTab === 'gallery' && (
          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
