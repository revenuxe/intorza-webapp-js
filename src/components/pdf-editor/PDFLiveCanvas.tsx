import { useReducer, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ZoomIn, ZoomOut, Undo2, Redo2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { PDFBlockRenderer } from "./PDFBlockRenderer";
import { 
  pdfEditorReducer, 
  initialEditorState, 
  DEFAULT_BLOCKS,
  PDFBlock 
} from "./types";
import { PDFEditorSettings, getThemeById, applyBrandColorsToTheme, PDFTheme } from "@/lib/pdfThemes";

interface PDFLiveCanvasProps {
  editorSettings: PDFEditorSettings;
  quotationData: Record<string, unknown>;
  customizeSettings: Record<string, unknown>;
  onBlockOrderChange?: (blocks: PDFBlock[]) => void;
  className?: string;
}

export const PDFLiveCanvas = ({
  editorSettings,
  quotationData,
  customizeSettings,
  onBlockOrderChange,
  className,
}: PDFLiveCanvasProps) => {
  const [state, dispatch] = useReducer(pdfEditorReducer, {
    ...initialEditorState,
    blocks: getInitialBlocks(customizeSettings, editorSettings),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get current theme
  const currentTheme: PDFTheme = (() => {
    let theme = getThemeById(editorSettings.theme);
    if (editorSettings.useBrandColors && editorSettings.brandColors) {
      theme = applyBrandColorsToTheme(theme, editorSettings.brandColors);
    }
    return theme;
  })();

  // Update blocks when settings change
  useEffect(() => {
    const newBlocks = getInitialBlocks(customizeSettings, editorSettings);
    // Only update if visibility changed
    const currentVisibility = state.blocks.map(b => `${b.id}:${b.visible}`).join(',');
    const newVisibility = newBlocks.map(b => `${b.id}:${b.visible}`).join(',');
    if (currentVisibility !== newVisibility) {
      // Preserve order but update visibility
      const updatedBlocks = state.blocks.map(block => {
        const newBlock = newBlocks.find(b => b.id === block.id);
        return newBlock ? { ...block, visible: newBlock.visible } : block;
      });
      dispatch({ type: 'PUSH_HISTORY' });
    }
  }, [customizeSettings, editorSettings]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    dispatch({ type: 'SET_DRAGGING', isDragging: true });
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    dispatch({ type: 'SET_DRAGGING', isDragging: false });
    
    const { active, over } = event;
    if (over && active.id !== over.id) {
      dispatch({ type: 'PUSH_HISTORY' });
      dispatch({ 
        type: 'REORDER_BLOCKS', 
        activeId: active.id as string, 
        overId: over.id as string 
      });
      onBlockOrderChange?.(state.blocks);
    }
  }, [state.blocks, onBlockOrderChange]);

  const handleZoom = useCallback((delta: number) => {
    dispatch({ type: 'SET_ZOOM', zoom: state.zoom + delta });
  }, [state.zoom]);

  const handleUndo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const handleRedo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const handleReset = useCallback(() => {
    dispatch({ type: 'PUSH_HISTORY' });
    // Reset to default blocks
  }, []);

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background/95 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={handleUndo}
            disabled={!canUndo}
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={handleRedo}
            disabled={!canRedo}
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={handleReset}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => handleZoom(-10)}
            disabled={state.zoom <= 50}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 w-32">
            <Slider
              value={[state.zoom]}
              onValueChange={([v]) => dispatch({ type: 'SET_ZOOM', zoom: v })}
              min={50}
              max={150}
              step={10}
              className="w-full"
            />
            <span className="text-xs text-muted-foreground w-10 text-right">{state.zoom}%</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => handleZoom(10)}
            disabled={state.zoom >= 150}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Canvas Area */}
      <ScrollArea className="flex-1 bg-muted/30">
        <div className="p-6 flex justify-center min-h-full">
          <motion.div
            className="bg-white shadow-2xl rounded-lg overflow-hidden"
            style={{
              width: `${595 * (state.zoom / 100)}px`,
              minHeight: `${842 * (state.zoom / 100)}px`,
              transformOrigin: 'top center',
            }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 20 }}
          >
            {/* Page Border */}
            <div 
              className="p-6 md:p-8 min-h-full"
              style={{
                background: `rgb(${currentTheme.colors.background.join(',')})`,
                ...(editorSettings.showDecorations && editorSettings.showPageBorder ? {
                  border: `${currentTheme.decorations.borderWidth * 2}px ${currentTheme.decorations.borderStyle || 'solid'} rgb(${(currentTheme.colors.decorationPrimary || currentTheme.colors.accent).join(',')})`,
                } : {})
              }}
            >
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={state.blocks.map(b => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <AnimatePresence mode="popLayout">
                    <div className="space-y-4">
                      {state.blocks.map((block) => (
                        <PDFBlockRenderer
                          key={block.id}
                          block={block}
                          isSelected={state.selectedBlockId === block.id}
                          isHovered={state.hoveredBlockId === block.id}
                          theme={currentTheme}
                          onSelect={() => dispatch({ type: 'SELECT_BLOCK', blockId: block.id })}
                          onHover={(hovered) => dispatch({ type: 'HOVER_BLOCK', blockId: hovered ? block.id : null })}
                          onToggleVisibility={() => {
                            dispatch({ type: 'PUSH_HISTORY' });
                            dispatch({ type: 'TOGGLE_VISIBILITY', blockId: block.id });
                          }}
                          quotationData={quotationData}
                          editorSettings={editorSettings as unknown as Record<string, unknown>}
                          customizeSettings={customizeSettings}
                        />
                      ))}
                    </div>
                  </AnimatePresence>
                </SortableContext>
              </DndContext>
            </div>
          </motion.div>
        </div>
      </ScrollArea>
    </div>
  );
};

// Helper to initialize blocks based on settings
function getInitialBlocks(customizeSettings: Record<string, unknown>, editorSettings: PDFEditorSettings): PDFBlock[] {
  return DEFAULT_BLOCKS.map(block => {
    let visible = block.visible;
    
    // Map customize settings to block visibility
    switch (block.type) {
      case 'header':
        visible = (customizeSettings.showCompanyLogo as boolean) !== false;
        break;
      case 'client-info':
        visible = (customizeSettings.showClientAddress as boolean) !== false;
        break;
      case 'project-info':
        visible = (customizeSettings.showProjectDetails as boolean) !== false;
        break;
      case 'signature':
        visible = (customizeSettings.showSignatureArea as boolean) !== false;
        break;
      case 'accept-reject':
        visible = editorSettings.showAcceptRejectButtons !== false;
        break;
    }
    
    return { ...block, visible };
  });
}
