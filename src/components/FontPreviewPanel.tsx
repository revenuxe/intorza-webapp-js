import { useState, useMemo } from "react";
import { Search, Type, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Extended font list with Google Fonts
export const EXTENDED_FONTS = [
  // Serif Fonts - Elegant & Traditional
  { id: 'playfair', name: 'Playfair Display', family: "'Playfair Display', serif", category: 'serif', style: 'elegant' },
  { id: 'lora', name: 'Lora', family: "'Lora', serif", category: 'serif', style: 'traditional' },
  { id: 'merriweather', name: 'Merriweather', family: "'Merriweather', serif", category: 'serif', style: 'readable' },
  { id: 'libre-baskerville', name: 'Libre Baskerville', family: "'Libre Baskerville', serif", category: 'serif', style: 'classic' },
  { id: 'source-serif', name: 'Source Serif Pro', family: "'Source Serif Pro', serif", category: 'serif', style: 'professional' },
  { id: 'crimson', name: 'Crimson Text', family: "'Crimson Text', serif", category: 'serif', style: 'literary' },
  { id: 'eb-garamond', name: 'EB Garamond', family: "'EB Garamond', serif", category: 'serif', style: 'classic' },
  { id: 'cormorant', name: 'Cormorant Garamond', family: "'Cormorant Garamond', serif", category: 'serif', style: 'luxury' },
  { id: 'spectral', name: 'Spectral', family: "'Spectral', serif", category: 'serif', style: 'modern-serif' },
  { id: 'bitter', name: 'Bitter', family: "'Bitter', serif", category: 'serif', style: 'slab' },
  { id: 'times', name: 'Times New Roman', family: "'Times New Roman', Times, serif", category: 'serif', style: 'classic' },
  
  // Sans-Serif Fonts - Modern & Clean
  { id: 'roboto', name: 'Roboto', family: "'Roboto', sans-serif", category: 'sans-serif', style: 'neutral' },
  { id: 'open-sans', name: 'Open Sans', family: "'Open Sans', sans-serif", category: 'sans-serif', style: 'friendly' },
  { id: 'lato', name: 'Lato', family: "'Lato', sans-serif", category: 'sans-serif', style: 'warm' },
  { id: 'montserrat', name: 'Montserrat', family: "'Montserrat', sans-serif", category: 'sans-serif', style: 'geometric' },
  { id: 'poppins', name: 'Poppins', family: "'Poppins', sans-serif", category: 'sans-serif', style: 'geometric' },
  { id: 'raleway', name: 'Raleway', family: "'Raleway', sans-serif", category: 'sans-serif', style: 'elegant' },
  { id: 'nunito', name: 'Nunito', family: "'Nunito', sans-serif", category: 'sans-serif', style: 'rounded' },
  { id: 'work-sans', name: 'Work Sans', family: "'Work Sans', sans-serif", category: 'sans-serif', style: 'neutral' },
  { id: 'inter', name: 'Inter', family: "'Inter', sans-serif", category: 'sans-serif', style: 'ui' },
  { id: 'dm-sans', name: 'DM Sans', family: "'DM Sans', sans-serif", category: 'sans-serif', style: 'low-contrast' },
  { id: 'manrope', name: 'Manrope', family: "'Manrope', sans-serif", category: 'sans-serif', style: 'modern' },
  { id: 'outfit', name: 'Outfit', family: "'Outfit', sans-serif", category: 'sans-serif', style: 'geometric' },
  { id: 'plus-jakarta', name: 'Plus Jakarta Sans', family: "'Plus Jakarta Sans', sans-serif", category: 'sans-serif', style: 'modern' },
  { id: 'sora', name: 'Sora', family: "'Sora', sans-serif", category: 'sans-serif', style: 'geometric' },
  { id: 'space-grotesk', name: 'Space Grotesk', family: "'Space Grotesk', sans-serif", category: 'sans-serif', style: 'tech' },
  { id: 'helvetica', name: 'Helvetica', family: "Helvetica, Arial, sans-serif", category: 'sans-serif', style: 'classic' },
  
  // Display & Decorative
  { id: 'josefin', name: 'Josefin Sans', family: "'Josefin Sans', sans-serif", category: 'display', style: 'elegant' },
  { id: 'quicksand', name: 'Quicksand', family: "'Quicksand', sans-serif", category: 'display', style: 'rounded' },
  { id: 'rubik', name: 'Rubik', family: "'Rubik', sans-serif", category: 'display', style: 'rounded' },
  { id: 'barlow', name: 'Barlow', family: "'Barlow', sans-serif", category: 'display', style: 'slightly-rounded' },
  { id: 'oswald', name: 'Oswald', family: "'Oswald', sans-serif", category: 'display', style: 'condensed' },
  { id: 'bebas', name: 'Bebas Neue', family: "'Bebas Neue', cursive", category: 'display', style: 'bold-display' },
  { id: 'anton', name: 'Anton', family: "'Anton', sans-serif", category: 'display', style: 'impact' },
  { id: 'archivo', name: 'Archivo', family: "'Archivo', sans-serif", category: 'display', style: 'grotesque' },
  
  // Monospace
  { id: 'courier', name: 'Courier New', family: "'Courier New', Courier, monospace", category: 'monospace', style: 'classic' },
];

export const getFontById = (id: string) => {
  return EXTENDED_FONTS.find(f => f.id === id) || EXTENDED_FONTS[0];
};

interface FontPreviewPanelProps {
  headingFont: string;
  bodyFont: string;
  onHeadingFontChange?: (fontId: string) => void;
  onBodyFontChange?: (fontId: string) => void;
  mode?: 'preview' | 'selector';
}

export const FontPreviewPanel = ({ 
  headingFont, 
  bodyFont, 
  onHeadingFontChange,
  onBodyFontChange,
  mode = 'preview'
}: FontPreviewPanelProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<'heading' | 'body' | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const headingFontData = getFontById(headingFont);
  const bodyFontData = getFontById(bodyFont);

  const filteredFonts = useMemo(() => {
    return EXTENDED_FONTS.filter(font => {
      const matchesSearch = font.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        font.style.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || font.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, categoryFilter]);

  const categories = ['all', 'serif', 'sans-serif', 'display', 'monospace'];

  const handleFontSelect = (fontId: string) => {
    if (activeTab === 'heading' && onHeadingFontChange) {
      onHeadingFontChange(fontId);
    } else if (activeTab === 'body' && onBodyFontChange) {
      onBodyFontChange(fontId);
    }
    setActiveTab(null);
  };

  if (mode === 'preview') {
    return (
      <div className="p-3 rounded-lg bg-muted/30 border space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Font Preview</span>
        </div>
        
        {/* Heading Preview */}
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Heading: {headingFontData.name}
          </span>
          <div 
            className="text-lg font-bold text-foreground leading-tight"
            style={{ fontFamily: headingFontData.family }}
          >
            Professional Quotation
          </div>
        </div>

        {/* Body Preview */}
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Body: {bodyFontData.name}
          </span>
          <div 
            className="text-sm text-foreground/90 leading-relaxed"
            style={{ fontFamily: bodyFontData.family }}
          >
            This is sample body text showing how your content will appear in the PDF document.
          </div>
        </div>

        {/* Combined Preview */}
        <div className="pt-2 border-t">
          <div className="p-2 rounded bg-background border">
            <div 
              className="text-sm font-bold mb-1"
              style={{ fontFamily: headingFontData.family }}
            >
              Invoice #INV-2024-001
            </div>
            <div 
              className="text-xs text-muted-foreground"
              style={{ fontFamily: bodyFontData.family }}
            >
              Client: John Smith | Total: ₹1,50,000
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Selector mode with search
  return (
    <div className="space-y-4">
      {/* Current Selection Display */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setActiveTab(activeTab === 'heading' ? null : 'heading')}
          className={cn(
            "p-3 rounded-lg border text-left transition-all",
            activeTab === 'heading' 
              ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
              : "hover:border-primary/50"
          )}
        >
          <div className="text-xs text-muted-foreground mb-1">Heading Font</div>
          <div 
            className="font-semibold truncate"
            style={{ fontFamily: headingFontData.family }}
          >
            {headingFontData.name}
          </div>
        </button>
        <button
          onClick={() => setActiveTab(activeTab === 'body' ? null : 'body')}
          className={cn(
            "p-3 rounded-lg border text-left transition-all",
            activeTab === 'body' 
              ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
              : "hover:border-primary/50"
          )}
        >
          <div className="text-xs text-muted-foreground mb-1">Body Font</div>
          <div 
            className="font-medium truncate"
            style={{ fontFamily: bodyFontData.family }}
          >
            {bodyFontData.name}
          </div>
        </button>
      </div>

      {/* Font Selector Panel */}
      {activeTab && (
        <div className="border rounded-lg p-3 bg-card animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 mb-3">
            <Type className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              Select {activeTab === 'heading' ? 'Heading' : 'Body'} Font
            </span>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search fonts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {categories.map((cat) => (
              <Badge
                key={cat}
                variant={categoryFilter === cat ? "default" : "outline"}
                className="cursor-pointer capitalize text-xs"
                onClick={() => setCategoryFilter(cat)}
              >
                {cat === 'all' ? 'All' : cat}
              </Badge>
            ))}
          </div>

          {/* Font List */}
          <ScrollArea className="h-[200px]">
            <div className="space-y-1">
              {filteredFonts.map((font) => {
                const isSelected = (activeTab === 'heading' && font.id === headingFont) ||
                                   (activeTab === 'body' && font.id === bodyFont);
                return (
                  <button
                    key={font.id}
                    onClick={() => handleFontSelect(font.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-2.5 rounded-md text-left transition-colors",
                      isSelected 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div 
                        className="font-medium truncate"
                        style={{ fontFamily: font.family }}
                      >
                        {font.name}
                      </div>
                      <div className={cn(
                        "text-xs capitalize",
                        isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        {font.category} • {font.style}
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 shrink-0 ml-2" />}
                  </button>
                );
              })}
              {filteredFonts.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No fonts match your search
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Preview */}
      <div className="p-3 rounded-lg bg-muted/30 border">
        <div className="text-xs text-muted-foreground mb-2">Preview</div>
        <div className="p-3 rounded bg-background border">
          <div 
            className="text-base font-bold mb-1"
            style={{ fontFamily: headingFontData.family }}
          >
            Professional Quotation Title
          </div>
          <div 
            className="text-sm text-muted-foreground"
            style={{ fontFamily: bodyFontData.family }}
          >
            This is sample body text demonstrating how your quotation content will appear with the selected fonts.
          </div>
        </div>
      </div>
    </div>
  );
};