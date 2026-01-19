import { motion } from "framer-motion";
import { 
  Palette, 
  Layout, 
  Eye, 
  Sparkles, 
  Sliders,
  Type,
  Layers,
  Settings2,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ToolbarItem {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

const TOOLBAR_ITEMS: ToolbarItem[] = [
  { id: 'themes', label: 'Themes', icon: Palette, description: 'Choose a design style' },
  { id: 'decor', label: 'Decor', icon: Sparkles, description: 'Borders & ornaments' },
  { id: 'layout', label: 'Layout', icon: Layout, description: 'Arrangement options' },
  { id: 'fonts', label: 'Fonts', icon: Type, description: 'Typography settings' },
  { id: 'blocks', label: 'Blocks', icon: Layers, description: 'Show/hide sections' },
  { id: 'advanced', label: 'Advanced', icon: Sliders, description: 'Fine-tune settings' },
];

interface PDFEditorToolbarProps {
  activePanel: string;
  onPanelChange: (panelId: string) => void;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const PDFEditorToolbar = ({
  activePanel,
  onPanelChange,
  orientation = 'vertical',
  className,
}: PDFEditorToolbarProps) => {
  if (orientation === 'horizontal') {
    return (
      <div className={cn("flex items-center gap-1 p-2 border-b bg-background", className)}>
        {TOOLBAR_ITEMS.map((item) => (
          <Button
            key={item.id}
            variant={activePanel === item.id ? "default" : "ghost"}
            size="sm"
            className={cn(
              "flex items-center gap-2 px-3",
              activePanel === item.id && "bg-primary text-primary-foreground"
            )}
            onClick={() => onPanelChange(item.id)}
          >
            <item.icon className="h-4 w-4" />
            <span className="text-xs font-medium">{item.label}</span>
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("w-64 border-r bg-background flex flex-col", className)}>
      <div className="p-4 border-b">
        <h2 className="font-semibold flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          PDF Settings
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Customize your document
        </p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {TOOLBAR_ITEMS.map((item, index) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onPanelChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all",
                activePanel === item.id 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "hover:bg-muted"
              )}
            >
              <div className={cn(
                "p-2 rounded-lg",
                activePanel === item.id 
                  ? "bg-primary-foreground/20" 
                  : "bg-muted"
              )}>
                <item.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{item.label}</p>
                <p className={cn(
                  "text-xs truncate",
                  activePanel === item.id 
                    ? "text-primary-foreground/70" 
                    : "text-muted-foreground"
                )}>
                  {item.description}
                </p>
              </div>
              <ChevronRight className={cn(
                "h-4 w-4 transition-transform",
                activePanel === item.id && "rotate-90"
              )} />
            </motion.button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
