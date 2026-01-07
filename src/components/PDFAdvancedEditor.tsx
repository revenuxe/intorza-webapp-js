import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Table,
  PanelLeft,
  AlignJustify,
  Layers
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
}

export const PDFAdvancedEditor = ({ settings, onUpdate }: PDFAdvancedEditorProps) => {
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
            Fine-tune every aspect of your PDF
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
          <AccordionContent className="space-y-4 pt-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Table Border</Label>
                <span className="text-xs text-muted-foreground">{advancedSettings!.tableBorderWidth}px</span>
              </div>
              <Slider
                value={[advancedSettings!.tableBorderWidth * 10]}
                onValueChange={([v]) => updateAdvanced('tableBorderWidth', v / 10)}
                min={1}
                max={20}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Card Border</Label>
                <span className="text-xs text-muted-foreground">{advancedSettings!.cardBorderWidth}px</span>
              </div>
              <Slider
                value={[advancedSettings!.cardBorderWidth * 10]}
                onValueChange={([v]) => updateAdvanced('cardBorderWidth', v / 10)}
                min={5}
                max={30}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Page Border</Label>
                <span className="text-xs text-muted-foreground">{advancedSettings!.pageBorderWidth}px</span>
              </div>
              <Slider
                value={[advancedSettings!.pageBorderWidth]}
                onValueChange={([v]) => updateAdvanced('pageBorderWidth', v)}
                min={1}
                max={5}
                step={0.5}
                className="w-full"
              />
            </div>
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
          <AccordionContent className="space-y-4 pt-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Section Spacing</Label>
                <span className="text-xs text-muted-foreground">{advancedSettings!.sectionSpacing}mm</span>
              </div>
              <Slider
                value={[advancedSettings!.sectionSpacing]}
                onValueChange={([v]) => updateAdvanced('sectionSpacing', v)}
                min={4}
                max={20}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Row Padding</Label>
                <span className="text-xs text-muted-foreground">{advancedSettings!.rowPadding}mm</span>
              </div>
              <Slider
                value={[advancedSettings!.rowPadding]}
                onValueChange={([v]) => updateAdvanced('rowPadding', v)}
                min={2}
                max={10}
                step={0.5}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Card Padding</Label>
                <span className="text-xs text-muted-foreground">{advancedSettings!.cardPadding}mm</span>
              </div>
              <Slider
                value={[advancedSettings!.cardPadding]}
                onValueChange={([v]) => updateAdvanced('cardPadding', v)}
                min={4}
                max={16}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Highlight Padding</Label>
                <span className="text-xs text-muted-foreground">{advancedSettings!.highlightPadding}px</span>
              </div>
              <Slider
                value={[advancedSettings!.highlightPadding]}
                onValueChange={([v]) => updateAdvanced('highlightPadding', v)}
                min={2}
                max={8}
                step={1}
                className="w-full"
              />
            </div>
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
          <AccordionContent className="space-y-4 pt-2">
            <p className="text-[10px] text-muted-foreground mb-2">
              Adjust column widths in mm. Details column auto-adjusts.
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Side Column</Label>
                <span className="text-xs text-muted-foreground">{advancedSettings!.columnWidths.side}mm</span>
              </div>
              <Slider
                value={[advancedSettings!.columnWidths.side]}
                onValueChange={([v]) => updateColumnWidth('side', v)}
                min={10}
                max={25}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Product Column</Label>
                <span className="text-xs text-muted-foreground">{advancedSettings!.columnWidths.product}mm</span>
              </div>
              <Slider
                value={[advancedSettings!.columnWidths.product]}
                onValueChange={([v]) => updateColumnWidth('product', v)}
                min={20}
                max={50}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">W (Width) Column</Label>
                <span className="text-xs text-muted-foreground">{advancedSettings!.columnWidths.width}mm</span>
              </div>
              <Slider
                value={[advancedSettings!.columnWidths.width]}
                onValueChange={([v]) => updateColumnWidth('width', v)}
                min={10}
                max={25}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">H (Height) Column</Label>
                <span className="text-xs text-muted-foreground">{advancedSettings!.columnWidths.height}mm</span>
              </div>
              <Slider
                value={[advancedSettings!.columnWidths.height]}
                onValueChange={([v]) => updateColumnWidth('height', v)}
                min={10}
                max={25}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Area (Sq.Ft) Column</Label>
                <span className="text-xs text-muted-foreground">{advancedSettings!.columnWidths.area}mm</span>
              </div>
              <Slider
                value={[advancedSettings!.columnWidths.area]}
                onValueChange={([v]) => updateColumnWidth('area', v)}
                min={12}
                max={30}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Rate Column</Label>
                <span className="text-xs text-muted-foreground">{advancedSettings!.columnWidths.rate}mm</span>
              </div>
              <Slider
                value={[advancedSettings!.columnWidths.rate]}
                onValueChange={([v]) => updateColumnWidth('rate', v)}
                min={18}
                max={35}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Amount Column</Label>
                <span className="text-xs text-muted-foreground">{advancedSettings!.columnWidths.amount}mm</span>
              </div>
              <Slider
                value={[advancedSettings!.columnWidths.amount]}
                onValueChange={([v]) => updateColumnWidth('amount', v)}
                min={20}
                max={40}
                step={1}
                className="w-full"
              />
            </div>
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
          <AccordionContent className="space-y-4 pt-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Section Title</Label>
                <span className="text-xs text-muted-foreground">{advancedSettings!.fontSizes.sectionTitle}pt</span>
              </div>
              <Slider
                value={[advancedSettings!.fontSizes.sectionTitle]}
                onValueChange={([v]) => updateFontSize('sectionTitle', v)}
                min={8}
                max={14}
                step={0.5}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Table Header</Label>
                <span className="text-xs text-muted-foreground">{advancedSettings!.fontSizes.tableHeader}pt</span>
              </div>
              <Slider
                value={[advancedSettings!.fontSizes.tableHeader]}
                onValueChange={([v]) => updateFontSize('tableHeader', v)}
                min={5}
                max={10}
                step={0.5}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Product Name</Label>
                <span className="text-xs text-muted-foreground">{advancedSettings!.fontSizes.productName}pt</span>
              </div>
              <Slider
                value={[advancedSettings!.fontSizes.productName]}
                onValueChange={([v]) => updateFontSize('productName', v)}
                min={5}
                max={10}
                step={0.5}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Details Text</Label>
                <span className="text-xs text-muted-foreground">{advancedSettings!.fontSizes.details}pt</span>
              </div>
              <Slider
                value={[advancedSettings!.fontSizes.details]}
                onValueChange={([v]) => updateFontSize('details', v)}
                min={5}
                max={9}
                step={0.5}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Amounts</Label>
                <span className="text-xs text-muted-foreground">{advancedSettings!.fontSizes.amounts}pt</span>
              </div>
              <Slider
                value={[advancedSettings!.fontSizes.amounts]}
                onValueChange={([v]) => updateFontSize('amounts', v)}
                min={5}
                max={10}
                step={0.5}
                className="w-full"
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
