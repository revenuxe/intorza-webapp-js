import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { 
  PDFEditorSettings, 
  defaultAdvancedSettings 
} from "@/lib/pdfThemes";
import { 
  Columns, 
  Square, 
  Type, 
  Maximize2, 
  RotateCcw,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface PDFAdvancedEditorProps {
  settings: PDFEditorSettings;
  onUpdate: (updates: Partial<PDFEditorSettings>) => void;
  onHighlight?: (element: string | null) => void;
}

// Highlightable control wrapper
const HighlightableControl = ({ 
  label, 
  value, 
  unit, 
  elementName,
  onHighlight,
  children 
}: { 
  label: string; 
  value: number; 
  unit: string;
  elementName: string;
  onHighlight?: (element: string | null) => void;
  children: React.ReactNode;
}) => (
  <div 
    className="space-y-3 p-2 -mx-2 rounded-md transition-colors hover:bg-primary/5 cursor-pointer"
    onMouseEnter={() => onHighlight?.(elementName)}
    onMouseLeave={() => onHighlight?.(null)}
  >
    <div className="flex items-center justify-between">
      <Label className="text-xs flex items-center gap-2">
        {label}
        <span className="w-1.5 h-1.5 rounded-full bg-primary/40 opacity-0 group-hover:opacity-100 transition-opacity" />
      </Label>
      <span className="text-xs text-muted-foreground font-mono">{value}{unit}</span>
    </div>
    {children}
  </div>
);

export const PDFAdvancedEditor = ({ settings, onUpdate, onHighlight }: PDFAdvancedEditorProps) => {
  const advancedSettings = settings.advancedSettings || defaultAdvancedSettings;

  const updateAdvanced = (key: string, value: number) => {
    onUpdate({
      advancedSettings: {
        ...advancedSettings!,
        [key]: value,
      }
    });
  };

  const updateColumnWidth = (column: string, value: number) => {
    onUpdate({
      advancedSettings: {
        ...advancedSettings!,
        columnWidths: {
          ...advancedSettings!.columnWidths,
          [column]: value,
        }
      }
    });
  };

  const updateFontSize = (key: string, value: number) => {
    onUpdate({
      advancedSettings: {
        ...advancedSettings!,
        fontSizes: {
          ...advancedSettings!.fontSizes,
          [key]: value,
        }
      }
    });
  };

  const resetAdvancedSettings = () => {
    onUpdate({
      advancedSettings: { ...defaultAdvancedSettings! }
    });
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-semibold">Advanced Editor</Label>
          <p className="text-xs text-muted-foreground">
            Hover controls to highlight in preview
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={resetAdvancedSettings}>
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset
        </Button>
      </div>

      <Accordion type="multiple" defaultValue={["borders", "columns"]} className="w-full">
        {/* Border Settings */}
        <AccordionItem value="borders">
          <AccordionTrigger className="text-sm py-3">
            <div className="flex items-center gap-2">
              <Square className="h-4 w-4 text-primary" />
              Border Thickness
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-2 pt-2">
            <HighlightableControl 
              label="Table Border" 
              value={advancedSettings!.tableBorderWidth} 
              unit="px"
              elementName="Table Borders"
              onHighlight={onHighlight}
            >
              <Slider
                value={[advancedSettings!.tableBorderWidth * 10]}
                onValueChange={([v]) => updateAdvanced('tableBorderWidth', v / 10)}
                min={1}
                max={20}
                step={1}
                className="w-full"
              />
            </HighlightableControl>

            <HighlightableControl 
              label="Card Border" 
              value={advancedSettings!.cardBorderWidth} 
              unit="px"
              elementName="Info Cards"
              onHighlight={onHighlight}
            >
              <Slider
                value={[advancedSettings!.cardBorderWidth * 10]}
                onValueChange={([v]) => updateAdvanced('cardBorderWidth', v / 10)}
                min={5}
                max={30}
                step={1}
                className="w-full"
              />
            </HighlightableControl>

            <HighlightableControl 
              label="Page Border" 
              value={advancedSettings!.pageBorderWidth} 
              unit="px"
              elementName="Page Border"
              onHighlight={onHighlight}
            >
              <Slider
                value={[advancedSettings!.pageBorderWidth]}
                onValueChange={([v]) => updateAdvanced('pageBorderWidth', v)}
                min={1}
                max={5}
                step={0.5}
                className="w-full"
              />
            </HighlightableControl>
          </AccordionContent>
        </AccordionItem>

        {/* Spacing Settings */}
        <AccordionItem value="spacing">
          <AccordionTrigger className="text-sm py-3">
            <div className="flex items-center gap-2">
              <Maximize2 className="h-4 w-4 text-primary" />
              Spacing & Padding
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-2 pt-2">
            <HighlightableControl 
              label="Section Spacing" 
              value={advancedSettings!.sectionSpacing} 
              unit="mm"
              elementName="Section Gaps"
              onHighlight={onHighlight}
            >
              <Slider
                value={[advancedSettings!.sectionSpacing]}
                onValueChange={([v]) => updateAdvanced('sectionSpacing', v)}
                min={4}
                max={20}
                step={1}
                className="w-full"
              />
            </HighlightableControl>

            <HighlightableControl 
              label="Row Padding" 
              value={advancedSettings!.rowPadding} 
              unit="mm"
              elementName="Table Row Padding"
              onHighlight={onHighlight}
            >
              <Slider
                value={[advancedSettings!.rowPadding]}
                onValueChange={([v]) => updateAdvanced('rowPadding', v)}
                min={2}
                max={10}
                step={0.5}
                className="w-full"
              />
            </HighlightableControl>

            <HighlightableControl 
              label="Card Padding" 
              value={advancedSettings!.cardPadding} 
              unit="mm"
              elementName="Card Inner Padding"
              onHighlight={onHighlight}
            >
              <Slider
                value={[advancedSettings!.cardPadding]}
                onValueChange={([v]) => updateAdvanced('cardPadding', v)}
                min={4}
                max={16}
                step={1}
                className="w-full"
              />
            </HighlightableControl>

            <HighlightableControl 
              label="Highlight Padding" 
              value={advancedSettings!.highlightPadding} 
              unit="px"
              elementName="Amount Highlights"
              onHighlight={onHighlight}
            >
              <Slider
                value={[advancedSettings!.highlightPadding]}
                onValueChange={([v]) => updateAdvanced('highlightPadding', v)}
                min={2}
                max={8}
                step={1}
                className="w-full"
              />
            </HighlightableControl>
          </AccordionContent>
        </AccordionItem>

        {/* Column Width Settings */}
        <AccordionItem value="columns">
          <AccordionTrigger className="text-sm py-3">
            <div className="flex items-center gap-2">
              <Columns className="h-4 w-4 text-primary" />
              Table Column Widths
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-2 pt-2">
            <p className="text-[10px] text-muted-foreground mb-2">
              Adjust column widths in mm. Details column auto-adjusts.
            </p>

            <HighlightableControl 
              label="Side Column" 
              value={advancedSettings!.columnWidths.side} 
              unit="mm"
              elementName="Side Column"
              onHighlight={onHighlight}
            >
              <Slider
                value={[advancedSettings!.columnWidths.side]}
                onValueChange={([v]) => updateColumnWidth('side', v)}
                min={10}
                max={25}
                step={1}
                className="w-full"
              />
            </HighlightableControl>

            <HighlightableControl 
              label="Product Column" 
              value={advancedSettings!.columnWidths.product} 
              unit="mm"
              elementName="Product Column"
              onHighlight={onHighlight}
            >
              <Slider
                value={[advancedSettings!.columnWidths.product]}
                onValueChange={([v]) => updateColumnWidth('product', v)}
                min={20}
                max={50}
                step={1}
                className="w-full"
              />
            </HighlightableControl>

            <HighlightableControl 
              label="W (Width) Column" 
              value={advancedSettings!.columnWidths.width} 
              unit="mm"
              elementName="Width Column"
              onHighlight={onHighlight}
            >
              <Slider
                value={[advancedSettings!.columnWidths.width]}
                onValueChange={([v]) => updateColumnWidth('width', v)}
                min={10}
                max={25}
                step={1}
                className="w-full"
              />
            </HighlightableControl>

            <HighlightableControl 
              label="H (Height) Column" 
              value={advancedSettings!.columnWidths.height} 
              unit="mm"
              elementName="Height Column"
              onHighlight={onHighlight}
            >
              <Slider
                value={[advancedSettings!.columnWidths.height]}
                onValueChange={([v]) => updateColumnWidth('height', v)}
                min={10}
                max={25}
                step={1}
                className="w-full"
              />
            </HighlightableControl>

            <HighlightableControl 
              label="Area (Sq.Ft) Column" 
              value={advancedSettings!.columnWidths.area} 
              unit="mm"
              elementName="Area Column"
              onHighlight={onHighlight}
            >
              <Slider
                value={[advancedSettings!.columnWidths.area]}
                onValueChange={([v]) => updateColumnWidth('area', v)}
                min={12}
                max={30}
                step={1}
                className="w-full"
              />
            </HighlightableControl>

            <HighlightableControl 
              label="Rate Column" 
              value={advancedSettings!.columnWidths.rate} 
              unit="mm"
              elementName="Rate Column"
              onHighlight={onHighlight}
            >
              <Slider
                value={[advancedSettings!.columnWidths.rate]}
                onValueChange={([v]) => updateColumnWidth('rate', v)}
                min={18}
                max={35}
                step={1}
                className="w-full"
              />
            </HighlightableControl>

            <HighlightableControl 
              label="Amount Column" 
              value={advancedSettings!.columnWidths.amount} 
              unit="mm"
              elementName="Amount Column"
              onHighlight={onHighlight}
            >
              <Slider
                value={[advancedSettings!.columnWidths.amount]}
                onValueChange={([v]) => updateColumnWidth('amount', v)}
                min={20}
                max={40}
                step={1}
                className="w-full"
              />
            </HighlightableControl>
          </AccordionContent>
        </AccordionItem>

        {/* Font Size Settings */}
        <AccordionItem value="fonts">
          <AccordionTrigger className="text-sm py-3">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-primary" />
              Font Sizes
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-2 pt-2">
            <HighlightableControl 
              label="Section Title" 
              value={advancedSettings!.fontSizes.sectionTitle} 
              unit="pt"
              elementName="Section Titles"
              onHighlight={onHighlight}
            >
              <Slider
                value={[advancedSettings!.fontSizes.sectionTitle]}
                onValueChange={([v]) => updateFontSize('sectionTitle', v)}
                min={8}
                max={14}
                step={0.5}
                className="w-full"
              />
            </HighlightableControl>

            <HighlightableControl 
              label="Table Header" 
              value={advancedSettings!.fontSizes.tableHeader} 
              unit="pt"
              elementName="Table Headers"
              onHighlight={onHighlight}
            >
              <Slider
                value={[advancedSettings!.fontSizes.tableHeader]}
                onValueChange={([v]) => updateFontSize('tableHeader', v)}
                min={5}
                max={10}
                step={0.5}
                className="w-full"
              />
            </HighlightableControl>

            <HighlightableControl 
              label="Product Name" 
              value={advancedSettings!.fontSizes.productName} 
              unit="pt"
              elementName="Product Names"
              onHighlight={onHighlight}
            >
              <Slider
                value={[advancedSettings!.fontSizes.productName]}
                onValueChange={([v]) => updateFontSize('productName', v)}
                min={5}
                max={10}
                step={0.5}
                className="w-full"
              />
            </HighlightableControl>

            <HighlightableControl 
              label="Details Text" 
              value={advancedSettings!.fontSizes.details} 
              unit="pt"
              elementName="Product Details"
              onHighlight={onHighlight}
            >
              <Slider
                value={[advancedSettings!.fontSizes.details]}
                onValueChange={([v]) => updateFontSize('details', v)}
                min={5}
                max={9}
                step={0.5}
                className="w-full"
              />
            </HighlightableControl>

            <HighlightableControl 
              label="Amounts" 
              value={advancedSettings!.fontSizes.amounts} 
              unit="pt"
              elementName="Amount Values"
              onHighlight={onHighlight}
            >
              <Slider
                value={[advancedSettings!.fontSizes.amounts]}
                onValueChange={([v]) => updateFontSize('amounts', v)}
                min={5}
                max={10}
                step={0.5}
                className="w-full"
              />
            </HighlightableControl>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};