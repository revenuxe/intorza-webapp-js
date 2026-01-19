import { motion } from "framer-motion";
import { 
  Eye, 
  EyeOff, 
  GripVertical, 
  Lock,
  FileText,
  User,
  Briefcase,
  Table,
  Calculator,
  CreditCard,
  ScrollText,
  PenTool,
  CheckCircle2
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { PDFEditorSettings } from "@/lib/pdfThemes";
import { QuotationSettings } from "@/components/CustomizeFieldsDrawer";

interface BlockConfig {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  settingKey: keyof QuotationSettings | 'showAcceptRejectButtons';
  locked?: boolean;
}

const BLOCKS: BlockConfig[] = [
  { id: 'header', label: 'Company Header', description: 'Logo and company info', icon: FileText, settingKey: 'showCompanyLogo' },
  { id: 'client', label: 'Client Information', description: 'Client name and address', icon: User, settingKey: 'showClientAddress' },
  { id: 'project', label: 'Project Details', description: 'Project info and dates', icon: Briefcase, settingKey: 'showProjectDetails' },
  { id: 'items', label: 'Quotation Items', description: 'Products and pricing table', icon: Table, settingKey: 'showProjectDetails', locked: true },
  { id: 'summary', label: 'Price Summary', description: 'Totals and GST', icon: Calculator, settingKey: 'showProjectDetails', locked: true },
  { id: 'payment', label: 'Payment Stages', description: 'Milestone payments', icon: CreditCard, settingKey: 'showPaymentStages' },
  { id: 'terms', label: 'Terms & Conditions', description: 'Legal terms', icon: ScrollText, settingKey: 'showTermsConditions' },
  { id: 'signature', label: 'Signature Area', description: 'Signature boxes', icon: PenTool, settingKey: 'showSignatureArea' },
  { id: 'accept-reject', label: 'Accept/Reject', description: 'Response buttons', icon: CheckCircle2, settingKey: 'showAcceptRejectButtons' },
];

interface PDFBlocksPanelProps {
  editorSettings: PDFEditorSettings;
  customizeSettings: QuotationSettings;
  onUpdateEditor: (updates: Partial<PDFEditorSettings>) => void;
  onUpdateCustomize: (updates: Partial<QuotationSettings>) => void;
}

export const PDFBlocksPanel = ({
  editorSettings,
  customizeSettings,
  onUpdateEditor,
  onUpdateCustomize,
}: PDFBlocksPanelProps) => {
  
  const isBlockVisible = (block: BlockConfig): boolean => {
    if (block.settingKey === 'showAcceptRejectButtons') {
      return editorSettings.showAcceptRejectButtons !== false;
    }
    return customizeSettings[block.settingKey as keyof QuotationSettings] !== false;
  };

  const toggleBlock = (block: BlockConfig) => {
    if (block.locked) return;
    
    if (block.settingKey === 'showAcceptRejectButtons') {
      onUpdateEditor({ showAcceptRejectButtons: !isBlockVisible(block) });
    } else {
      onUpdateCustomize({ 
        [block.settingKey]: !isBlockVisible(block) 
      } as Partial<QuotationSettings>);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Label className="text-sm font-semibold">Document Blocks</Label>
        <p className="text-xs text-muted-foreground mt-1">
          Toggle sections visibility in your PDF
        </p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {BLOCKS.map((block, index) => {
            const isVisible = isBlockVisible(block);
            
            return (
              <motion.div
                key={block.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all",
                  isVisible 
                    ? "bg-background border-border" 
                    : "bg-muted/30 border-transparent opacity-60"
                )}
              >
                <div className={cn(
                  "p-2 rounded-lg",
                  isVisible ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  <block.icon className="h-4 w-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{block.label}</p>
                    {block.locked && (
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {block.description}
                  </p>
                </div>

                <Switch
                  checked={isVisible}
                  onCheckedChange={() => toggleBlock(block)}
                  disabled={block.locked}
                />
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          Locked blocks are required for the document
        </p>
      </div>
    </div>
  );
};
