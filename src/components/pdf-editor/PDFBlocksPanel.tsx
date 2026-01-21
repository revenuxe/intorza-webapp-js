import { motion } from "framer-motion";
import { 
  Lock,
  FileText,
  User,
  Briefcase,
  Table,
  Calculator,
  CreditCard,
  ScrollText,
  PenTool,
  CheckCircle2,
  Shield
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { PDFEditorSettings } from "@/lib/pdfThemes";

interface BlockConfig {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  settingKey: string;
  isEditorSetting?: boolean;
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
  { id: 'warranty', label: 'Warranty', description: 'Warranty terms', icon: Shield, settingKey: 'showWarranty', isEditorSetting: true },
  { id: 'signature', label: 'Signature Area', description: 'Signature boxes', icon: PenTool, settingKey: 'showSignatureArea' },
  { id: 'accept-reject', label: 'Accept/Reject', description: 'Response buttons', icon: CheckCircle2, settingKey: 'showAcceptRejectButtons', isEditorSetting: true },
];

interface PDFBlocksPanelProps {
  editorSettings: PDFEditorSettings;
  customizeSettings: Record<string, unknown>;
  onUpdateSettings: (updates: Partial<PDFEditorSettings>) => void;
}

export const PDFBlocksPanel = ({
  editorSettings,
  customizeSettings,
  onUpdateSettings,
}: PDFBlocksPanelProps) => {
  
  const isBlockVisible = (block: BlockConfig): boolean => {
    if (block.isEditorSetting) {
      return (editorSettings as unknown as Record<string, unknown>)[block.settingKey] !== false;
    }
    return customizeSettings[block.settingKey] !== false;
  };

  const toggleBlock = (block: BlockConfig) => {
    if (block.locked) return;
    
    if (block.isEditorSetting) {
      onUpdateSettings({ [block.settingKey]: !isBlockVisible(block) } as Partial<PDFEditorSettings>);
    }
    // Note: customizeSettings toggles would need to be passed through parent
    // For now, showing read-only for non-editor settings
  };

  return (
    <div className="flex flex-col">
      <div className="pb-4">
        <Label className="text-sm font-semibold">Document Blocks</Label>
        <p className="text-xs text-muted-foreground mt-1">
          Toggle sections visibility in your PDF
        </p>
      </div>

      <div className="space-y-2">
        {BLOCKS.map((block, index) => {
          const isVisible = isBlockVisible(block);
          const canToggle = block.isEditorSetting && !block.locked;
          
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
                disabled={!canToggle}
              />
            </motion.div>
          );
        })}
      </div>

      <div className="pt-4 mt-4 border-t">
        <p className="text-xs text-muted-foreground text-center">
          Most block visibility is controlled in Customize Fields
        </p>
      </div>
    </div>
  );
};
