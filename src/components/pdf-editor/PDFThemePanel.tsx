import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Wand2, CircleDot, Palette, Crown, FileText, Frame, Flower2, Shapes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { 
  PDFEditorSettings, 
  PDFTheme, 
  getAllThemes, 
  getThemesByCategory,
  rgbToHex 
} from "@/lib/pdfThemes";

type ThemeCategory = 'all' | 'minimal' | 'professional' | 'luxury' | 'floral' | 'abstract' | 'decoration';

const CATEGORY_CONFIG: { value: ThemeCategory; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'All', icon: Palette },
  { value: 'minimal', label: 'Minimal', icon: FileText },
  { value: 'professional', label: 'Pro', icon: FileText },
  { value: 'luxury', label: 'Luxury', icon: Crown },
  { value: 'floral', label: 'Floral', icon: Flower2 },
  { value: 'abstract', label: 'Abstract', icon: Shapes },
  { value: 'decoration', label: 'Decor', icon: Frame },
];

interface PDFThemePanelProps {
  settings: PDFEditorSettings;
  onUpdate: (updates: Partial<PDFEditorSettings>) => void;
  brandColors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
  } | null;
  onOpenThemeBuilder?: () => void;
}

export const PDFThemePanel = ({
  settings,
  onUpdate,
  brandColors,
  onOpenThemeBuilder,
}: PDFThemePanelProps) => {
  const [selectedCategory, setSelectedCategory] = useState<ThemeCategory>('all');

  const getFilteredThemes = (): PDFTheme[] => {
    if (selectedCategory === 'all') {
      return getAllThemes();
    }
    return getThemesByCategory(selectedCategory);
  };

  const themes = getFilteredThemes();

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-4">
        <div>
          <Label className="text-sm font-semibold mb-2 block">Category</Label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_CONFIG.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={cn(
                  "px-2.5 py-1.5 rounded-full text-[10px] font-medium transition-all flex items-center gap-1",
                  selectedCategory === cat.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                )}
              >
                <cat.icon className="h-3 w-3" />
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {onOpenThemeBuilder && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={onOpenThemeBuilder}
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Create Custom Theme
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {/* Themes Grid */}
          <div className="grid grid-cols-2 gap-2">
            {themes.map((theme, index) => (
              <motion.button
                key={theme.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => onUpdate({ theme: theme.id })}
                className={cn(
                  "relative p-2.5 rounded-lg border-2 transition-all text-left",
                  settings.theme === theme.id 
                    ? "border-primary ring-2 ring-primary/20" 
                    : "border-border hover:border-primary/50"
                )}
              >
                {settings.theme === theme.id && (
                  <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
                {/* Theme preview */}
                <div 
                  className="relative w-full h-10 rounded mb-1.5 overflow-hidden border"
                  style={{ 
                    backgroundColor: `rgb(${theme.colors.background.join(',')})`,
                    borderColor: theme.decorations.showPageBorder 
                      ? `rgb(${(theme.colors.decorationPrimary || theme.colors.accent).join(',')})` 
                      : `rgb(${theme.colors.border.join(',')})`
                  }}
                >
                  <div 
                    className="h-3 w-full"
                    style={{ backgroundColor: `rgb(${theme.colors.headerBg.join(',')})` }}
                  />
                  <div 
                    className="absolute bottom-1 right-1 w-4 h-2 rounded-sm"
                    style={{ backgroundColor: `rgb(${theme.colors.highlight.join(',')})` }}
                  />
                </div>
                <p className="text-[10px] font-medium truncate">{theme.name}</p>
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                  {theme.category}
                </span>
              </motion.button>
            ))}
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
                    Apply your saved brand palette
                  </p>
                </div>
                <Switch
                  checked={settings.useBrandColors || false}
                  onCheckedChange={(v) => onUpdate({ 
                    useBrandColors: v,
                    brandColors: brandColors
                  })}
                />
              </div>
              
              {settings.useBrandColors && (
                <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-center gap-2">
                    {[brandColors.primary, brandColors.secondary, brandColors.accent].filter(Boolean).map((color, i) => (
                      <div 
                        key={i}
                        className="w-6 h-6 rounded-full border shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <span className="text-xs text-muted-foreground ml-2">Your brand palette</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Custom Color Overrides */}
          <div className="space-y-3 pt-4 border-t">
            <Label className="text-sm font-semibold">Custom Colors</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Highlight Color</Label>
                <Input
                  type="color"
                  value={settings.customColors?.highlight || '#f0f0f0'}
                  onChange={(e) => onUpdate({
                    customColors: { ...settings.customColors, highlight: e.target.value }
                  })}
                  className="w-12 h-8 p-1 cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Accent Color</Label>
                <Input
                  type="color"
                  value={settings.customColors?.accent || '#000000'}
                  onChange={(e) => onUpdate({
                    customColors: { ...settings.customColors, accent: e.target.value }
                  })}
                  className="w-12 h-8 p-1 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
