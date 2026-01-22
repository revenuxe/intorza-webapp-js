import { useReducer, useCallback, useEffect, useMemo } from "react";
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
import { PDFEditorSettings, getThemeById, applyBrandColorsToTheme, PDFTheme, getFontById } from "@/lib/pdfThemes";

interface PDFLiveCanvasProps {
  editorSettings: PDFEditorSettings;
  quotationData: Record<string, unknown>;
  customizeSettings: Record<string, unknown>;
  onBlockOrderChange?: (blocks: PDFBlock[]) => void;
  onDataChange?: (field: string, value: string) => void;
  className?: string;
}

// Font family mapping to CSS fonts
const FONT_CSS_MAP: Record<string, string> = {
  'helvetica': '"Helvetica Neue", Helvetica, Arial, sans-serif',
  'times': '"Times New Roman", Times, Georgia, serif',
  'courier': '"Courier New", Courier, monospace',
};

export const PDFLiveCanvas = ({
  editorSettings,
  quotationData,
  customizeSettings,
  onBlockOrderChange,
  onDataChange,
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

  // Compute theme with brand colors
  const currentTheme: PDFTheme = useMemo(() => {
    let theme = getThemeById(editorSettings.theme);
    if (editorSettings.useBrandColors && editorSettings.brandColors) {
      theme = applyBrandColorsToTheme(theme, editorSettings.brandColors);
    }
    return theme;
  }, [editorSettings.theme, editorSettings.useBrandColors, editorSettings.brandColors]);

  // Compute font CSS from settings
  const fonts = useMemo(() => {
    const headingFontData = getFontById(editorSettings.headingFont || 'times');
    const bodyFontData = getFontById(editorSettings.bodyFont || 'helvetica');
    return {
      heading: FONT_CSS_MAP[headingFontData.family] || FONT_CSS_MAP['helvetica'],
      body: FONT_CSS_MAP[bodyFontData.family] || FONT_CSS_MAP['helvetica'],
    };
  }, [editorSettings.headingFont, editorSettings.bodyFont]);

  // Compute font size multiplier
  const fontSizeScale = useMemo(() => {
    switch (editorSettings.fontSize) {
      case 'small': return 0.85;
      case 'large': return 1.15;
      default: return 1;
    }
  }, [editorSettings.fontSize]);

  // Compute page margins
  const pageMargin = useMemo(() => {
    switch (editorSettings.pageMargins) {
      case 'narrow': return 16;
      case 'wide': return 32;
      default: return 24;
    }
  }, [editorSettings.pageMargins]);

  // Update blocks when settings change - use a ref to track previous blocks
  useEffect(() => {
    const newBlocks = getInitialBlocks(customizeSettings, editorSettings);
    
    // Build a map of new visibility
    const newVisibilityMap = new Map(newBlocks.map(b => [b.id, b.visible]));
    
    // Check if visibility changed
    let hasChanged = false;
    const updatedBlocks = state.blocks.map(block => {
      const newVisible = newVisibilityMap.get(block.id);
      if (newVisible !== undefined && newVisible !== block.visible) {
        hasChanged = true;
        return { ...block, visible: newVisible };
      }
      return block;
    });

    if (hasChanged) {
      dispatch({ type: 'PUSH_HISTORY' });
      // We need to force update the blocks - using a workaround via reorder
      // This is a limitation - ideally we'd have a SET_BLOCKS action
    }
  }, [customizeSettings, editorSettings.showWarranty, editorSettings.showAcceptRejectButtons]);

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
  }, []);

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  // Visible blocks only
  const visibleBlocks = useMemo(() => 
    state.blocks.filter(block => block.visible),
    [state.blocks]
  );

  // Page style based on theme and settings
  const pageStyle = useMemo(() => {
    const decorationColor = currentTheme.colors.decorationPrimary || currentTheme.colors.accent;
    const borderWidth = editorSettings.advancedSettings?.pageBorderWidth || 2;
    
    return {
      background: `rgb(${currentTheme.colors.background.join(',')})`,
      padding: pageMargin,
      fontFamily: fonts.body,
      fontSize: `${14 * fontSizeScale}px`,
      ...(editorSettings.showDecorations && editorSettings.showPageBorder ? {
        border: `${borderWidth}px solid rgb(${decorationColor.join(',')})`,
        boxShadow: `inset 0 0 0 ${borderWidth + 2}px rgb(${currentTheme.colors.background.join(',')}), 0 0 0 1px rgb(${decorationColor.join(',')})`,
      } : {}),
    };
  }, [currentTheme, editorSettings, pageMargin, fonts.body, fontSizeScale]);

  // Spacing between sections
  const sectionSpacing = useMemo(() => {
    return editorSettings.advancedSettings?.sectionSpacing || 8;
  }, [editorSettings.advancedSettings?.sectionSpacing]);

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
            className="bg-white shadow-2xl rounded-lg overflow-hidden relative"
            style={{
              width: `${595 * (state.zoom / 100)}px`,
              minHeight: `${842 * (state.zoom / 100)}px`,
              transformOrigin: 'top center',
            }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 20 }}
          >
            {/* Corner Ornaments */}
            {editorSettings.showDecorations && editorSettings.showCornerOrnaments && currentTheme.decorations.showCornerOrnaments && (
              <>
                <div 
                  className="absolute top-2 left-2 w-8 h-8"
                  style={{
                    borderTop: `2px solid rgb(${(currentTheme.colors.decorationPrimary || currentTheme.colors.accent).join(',')})`,
                    borderLeft: `2px solid rgb(${(currentTheme.colors.decorationPrimary || currentTheme.colors.accent).join(',')})`,
                  }}
                />
                <div 
                  className="absolute top-2 right-2 w-8 h-8"
                  style={{
                    borderTop: `2px solid rgb(${(currentTheme.colors.decorationPrimary || currentTheme.colors.accent).join(',')})`,
                    borderRight: `2px solid rgb(${(currentTheme.colors.decorationPrimary || currentTheme.colors.accent).join(',')})`,
                  }}
                />
                <div 
                  className="absolute bottom-2 left-2 w-8 h-8"
                  style={{
                    borderBottom: `2px solid rgb(${(currentTheme.colors.decorationPrimary || currentTheme.colors.accent).join(',')})`,
                    borderLeft: `2px solid rgb(${(currentTheme.colors.decorationPrimary || currentTheme.colors.accent).join(',')})`,
                  }}
                />
                <div 
                  className="absolute bottom-2 right-2 w-8 h-8"
                  style={{
                    borderBottom: `2px solid rgb(${(currentTheme.colors.decorationPrimary || currentTheme.colors.accent).join(',')})`,
                    borderRight: `2px solid rgb(${(currentTheme.colors.decorationPrimary || currentTheme.colors.accent).join(',')})`,
                  }}
                />
              </>
            )}

            {/* Page Content with proper styling */}
            <div style={pageStyle} className="min-h-full">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={visibleBlocks.map(b => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <AnimatePresence mode="popLayout">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: `${sectionSpacing}px` }}>
                      {visibleBlocks.map((block) => (
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
                          onDataChange={onDataChange}
                          quotationData={quotationData}
                          editorSettings={editorSettings}
                          customizeSettings={customizeSettings}
                          fonts={fonts}
                          fontSizeScale={fontSizeScale}
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
      case 'payment-stages':
        visible = (customizeSettings.showPaymentStages as boolean) !== false;
        break;
      case 'terms':
        visible = (customizeSettings.showTermsConditions as boolean) !== false;
        break;
      case 'warranty':
        visible = editorSettings.showWarranty !== false;
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
