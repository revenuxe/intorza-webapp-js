import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Palette, Check, Loader2, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface BrandColor {
  hex: string;
  name: string;
  usage: 'primary' | 'secondary' | 'accent' | 'background' | 'text';
}

interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

interface BrandColorExtractorProps {
  onColorsExtracted?: (colors: BrandColors) => void;
  initialColors?: BrandColors | null;
}

export const BrandColorExtractor = ({ 
  onColorsExtracted,
  initialColors
}: BrandColorExtractorProps) => {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [extractedColors, setExtractedColors] = useState<BrandColor[]>([]);
  const [brandColors, setBrandColors] = useState<BrandColors>(
    initialColors || {
      primary: '#1b2e4f',
      secondary: '#3b5998',
      accent: '#f39c12',
      background: '#ffffff',
      text: '#1a1a1a',
    }
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSavedColors();
  }, []);

  const loadSavedColors = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('brand_colors, logo_url')
        .eq('id', user.id)
        .single();

      if (data?.brand_colors && typeof data.brand_colors === 'object') {
        const colors = data.brand_colors as unknown as BrandColors;
        if (colors.primary && colors.secondary && colors.accent) {
          setBrandColors(colors);
        }
      }
      if (data?.logo_url) {
        setLogoPreview(data.logo_url);
      }
    } catch (error) {
      console.error('Error loading brand colors:', error);
    }
  };

  const extractColorsFromImage = useCallback((imageUrl: string): Promise<BrandColor[]> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) {
          resolve([]);
          return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve([]);
          return;
        }

        // Scale down for performance
        const maxSize = 100;
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        
        // Color quantization using simple clustering
        const colorCounts: Record<string, number> = {};
        
        for (let i = 0; i < pixels.length; i += 4) {
          const r = Math.round(pixels[i] / 32) * 32;
          const g = Math.round(pixels[i + 1] / 32) * 32;
          const b = Math.round(pixels[i + 2] / 32) * 32;
          const a = pixels[i + 3];
          
          // Skip transparent pixels
          if (a < 128) continue;
          
          // Skip very light and very dark colors for better palette
          const brightness = (r + g + b) / 3;
          if (brightness < 20 || brightness > 240) continue;
          
          const key = `${r},${g},${b}`;
          colorCounts[key] = (colorCounts[key] || 0) + 1;
        }
        
        // Sort by frequency and get top colors
        const sortedColors = Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([key], index) => {
            const [r, g, b] = key.split(',').map(Number);
            const hex = rgbToHex(r, g, b);
            const usages: BrandColor['usage'][] = ['primary', 'secondary', 'accent', 'background', 'text'];
            return {
              hex,
              name: getColorName(r, g, b),
              usage: usages[index % usages.length],
            };
          });
        
        resolve(sortedColors);
      };
      
      img.onerror = () => resolve([]);
      img.src = imageUrl;
    });
  }, []);

  const rgbToHex = (r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => Math.min(255, Math.max(0, x)).toString(16).padStart(2, '0')).join('');
  };

  const getColorName = (r: number, g: number, b: number): string => {
    const brightness = (r + g + b) / 3;
    if (brightness < 60) return 'Dark';
    if (brightness > 200) return 'Light';
    
    if (r > g && r > b) return r > 200 ? 'Red' : 'Maroon';
    if (g > r && g > b) return g > 200 ? 'Lime' : 'Green';
    if (b > r && b > g) return b > 200 ? 'Blue' : 'Navy';
    if (r > 200 && g > 200) return 'Yellow';
    if (r > 200 && b > 200) return 'Magenta';
    if (g > 200 && b > 200) return 'Cyan';
    
    return 'Neutral';
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setExtracting(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        setLogoPreview(dataUrl);
        
        // Extract colors
        const colors = await extractColorsFromImage(dataUrl);
        setExtractedColors(colors);
        
        // Auto-assign colors
        if (colors.length >= 3) {
          const newBrandColors = {
            primary: colors[0]?.hex || brandColors.primary,
            secondary: colors[1]?.hex || brandColors.secondary,
            accent: colors[2]?.hex || brandColors.accent,
            background: '#ffffff',
            text: getBestTextColor(colors),
          };
          setBrandColors(newBrandColors);
          onColorsExtracted?.(newBrandColors);
        }
        
        setExtracting(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing logo:', error);
      toast({
        title: "Error",
        description: "Failed to process the logo",
        variant: "destructive",
      });
      setExtracting(false);
    } finally {
      setUploading(false);
    }
  };

  const getBestTextColor = (colors: BrandColor[]): string => {
    // Find a dark color for text, or use default
    const darkColor = colors.find(c => {
      const [r, g, b] = hexToRgb(c.hex);
      return (r + g + b) / 3 < 80;
    });
    return darkColor?.hex || '#1a1a1a';
  };

  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result 
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [0, 0, 0];
  };

  const handleColorChange = (key: keyof BrandColors, value: string) => {
    const updated = { ...brandColors, [key]: value };
    setBrandColors(updated);
    onColorsExtracted?.(updated);
  };

  const handleSaveColors = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ 
          brand_colors: JSON.parse(JSON.stringify(brandColors)),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Brand colors saved",
        description: "Your brand colors have been saved successfully",
      });
    } catch (error) {
      console.error('Error saving colors:', error);
      toast({
        title: "Save failed",
        description: "Failed to save brand colors",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const applyExtractedColor = (hex: string, usage: keyof BrandColors) => {
    handleColorChange(usage, hex);
  };

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Logo Upload Section */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Auto-Extract Brand Colors from Logo
        </Label>
        
        <div className="flex items-start gap-4">
          {/* Logo Preview */}
          <div className={cn(
            "relative w-24 h-24 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors",
            logoPreview ? "border-primary/50 bg-muted/30" : "border-muted-foreground/25 hover:border-primary/50"
          )}>
            {logoPreview ? (
              <>
                <img 
                  src={logoPreview} 
                  alt="Logo preview" 
                  className="w-full h-full object-contain"
                />
                {extracting && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}
              </>
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground/50" />
            )}
          </div>
          
          <div className="flex-1 space-y-2">
            <Input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              disabled={uploading || extracting}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Upload your brand logo to automatically extract color palette
            </p>
          </div>
        </div>
      </div>

      {/* Extracted Colors */}
      {extractedColors.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Extracted Colors (click to apply)</Label>
          <div className="flex flex-wrap gap-2">
            {extractedColors.map((color, index) => (
              <div key={index} className="relative group">
                <button
                  onClick={() => {
                    const usages: (keyof BrandColors)[] = ['primary', 'secondary', 'accent'];
                    applyExtractedColor(color.hex, usages[index % 3]);
                  }}
                  className="w-10 h-10 rounded-lg border-2 border-transparent hover:border-primary transition-all shadow-sm hover:scale-110"
                  style={{ backgroundColor: color.hex }}
                  title={`${color.name} - ${color.hex}`}
                />
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {color.hex}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Brand Color Inputs */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Brand Color Palette
        </Label>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(Object.entries(brandColors) as [keyof BrandColors, string][]).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <div 
                className="w-10 h-10 rounded-lg border shadow-sm shrink-0"
                style={{ backgroundColor: value }}
              />
              <div className="flex-1 min-w-0">
                <Label className="text-xs capitalize text-muted-foreground">{key}</Label>
                <Input
                  type="text"
                  value={value}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="h-8 text-xs font-mono"
                  placeholder="#000000"
                />
              </div>
              <input
                type="color"
                value={value}
                onChange={(e) => handleColorChange(key, e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0 p-0"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Preview</Label>
        <div 
          className="p-4 rounded-lg border"
          style={{ backgroundColor: brandColors.background }}
        >
          <div 
            className="text-lg font-bold mb-2"
            style={{ color: brandColors.primary }}
          >
            Your Brand Name
          </div>
          <div 
            className="text-sm mb-3"
            style={{ color: brandColors.text }}
          >
            This is how your brand colors will look in documents and quotations.
          </div>
          <div className="flex gap-2">
            <div 
              className="px-3 py-1.5 rounded text-sm font-medium text-white"
              style={{ backgroundColor: brandColors.primary }}
            >
              Primary Button
            </div>
            <div 
              className="px-3 py-1.5 rounded text-sm font-medium text-white"
              style={{ backgroundColor: brandColors.secondary }}
            >
              Secondary
            </div>
            <div 
              className="px-3 py-1.5 rounded text-sm font-medium text-white"
              style={{ backgroundColor: brandColors.accent }}
            >
              Accent
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <Button 
        onClick={handleSaveColors} 
        disabled={saving}
        className="w-full"
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Check className="h-4 w-4 mr-2" />
            Save Brand Colors
          </>
        )}
      </Button>
    </div>
  );
};