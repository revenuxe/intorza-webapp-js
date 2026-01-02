import { getFontById } from "@/lib/pdfThemes";

interface FontPreviewPanelProps {
  headingFont: string;
  bodyFont: string;
}

export const FontPreviewPanel = ({ headingFont, bodyFont }: FontPreviewPanelProps) => {
  const headingFontData = getFontById(headingFont);
  const bodyFontData = getFontById(bodyFont);

  // Map jsPDF font families to CSS font families
  const getFontFamily = (family: string): string => {
    switch (family) {
      case 'helvetica':
        return 'Helvetica, Arial, sans-serif';
      case 'times':
        return '"Times New Roman", Times, Georgia, serif';
      case 'courier':
        return '"Courier New", Courier, monospace';
      default:
        return 'sans-serif';
    }
  };

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
          style={{ fontFamily: getFontFamily(headingFontData.family) }}
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
          style={{ fontFamily: getFontFamily(bodyFontData.family) }}
        >
          This is sample body text showing how your content will appear in the PDF document.
        </div>
      </div>

      {/* Combined Preview */}
      <div className="pt-2 border-t">
        <div className="p-2 rounded bg-background border">
          <div 
            className="text-sm font-bold mb-1"
            style={{ fontFamily: getFontFamily(headingFontData.family) }}
          >
            Invoice #INV-2024-001
          </div>
          <div 
            className="text-xs text-muted-foreground"
            style={{ fontFamily: getFontFamily(bodyFontData.family) }}
          >
            Client: John Smith | Total: ₹1,50,000
          </div>
        </div>
      </div>
    </div>
  );
};
