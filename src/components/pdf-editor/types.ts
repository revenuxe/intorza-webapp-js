// PDF Editor Types for the Canva-like editing experience

export interface PDFBlock {
  id: string;
  type: 'header' | 'client-info' | 'project-info' | 'section' | 'items-table' | 'summary' | 'payment-stages' | 'terms' | 'warranty' | 'signature' | 'accept-reject';
  visible: boolean;
  locked?: boolean;
  data?: Record<string, unknown>;
}

export interface PDFEditorState {
  blocks: PDFBlock[];
  selectedBlockId: string | null;
  hoveredBlockId: string | null;
  isDragging: boolean;
  history: PDFBlock[][];
  historyIndex: number;
  zoom: number;
}

export type PDFEditorAction =
  | { type: 'SELECT_BLOCK'; blockId: string | null }
  | { type: 'HOVER_BLOCK'; blockId: string | null }
  | { type: 'TOGGLE_VISIBILITY'; blockId: string }
  | { type: 'REORDER_BLOCKS'; activeId: string; overId: string }
  | { type: 'SET_DRAGGING'; isDragging: boolean }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'PUSH_HISTORY' };

export const DEFAULT_BLOCKS: PDFBlock[] = [
  { id: 'header', type: 'header', visible: true, locked: true },
  { id: 'client-info', type: 'client-info', visible: true },
  { id: 'project-info', type: 'project-info', visible: true },
  { id: 'items-table', type: 'items-table', visible: true, locked: true },
  { id: 'summary', type: 'summary', visible: true },
  { id: 'payment-stages', type: 'payment-stages', visible: true },
  { id: 'terms', type: 'terms', visible: true },
  { id: 'warranty', type: 'warranty', visible: true },
  { id: 'signature', type: 'signature', visible: true },
  { id: 'accept-reject', type: 'accept-reject', visible: true },
];

export function pdfEditorReducer(state: PDFEditorState, action: PDFEditorAction): PDFEditorState {
  switch (action.type) {
    case 'SELECT_BLOCK':
      return { ...state, selectedBlockId: action.blockId };
    
    case 'HOVER_BLOCK':
      return { ...state, hoveredBlockId: action.blockId };
    
    case 'TOGGLE_VISIBILITY': {
      const newBlocks = state.blocks.map(block =>
        block.id === action.blockId ? { ...block, visible: !block.visible } : block
      );
      return { ...state, blocks: newBlocks };
    }
    
    case 'REORDER_BLOCKS': {
      const oldIndex = state.blocks.findIndex(b => b.id === action.activeId);
      const newIndex = state.blocks.findIndex(b => b.id === action.overId);
      if (oldIndex === -1 || newIndex === -1) return state;
      
      const newBlocks = [...state.blocks];
      const [removed] = newBlocks.splice(oldIndex, 1);
      newBlocks.splice(newIndex, 0, removed);
      return { ...state, blocks: newBlocks };
    }
    
    case 'SET_DRAGGING':
      return { ...state, isDragging: action.isDragging };
    
    case 'SET_ZOOM':
      return { ...state, zoom: Math.max(50, Math.min(150, action.zoom)) };
    
    case 'UNDO': {
      if (state.historyIndex > 0) {
        return {
          ...state,
          blocks: state.history[state.historyIndex - 1],
          historyIndex: state.historyIndex - 1,
        };
      }
      return state;
    }
    
    case 'REDO': {
      if (state.historyIndex < state.history.length - 1) {
        return {
          ...state,
          blocks: state.history[state.historyIndex + 1],
          historyIndex: state.historyIndex + 1,
        };
      }
      return state;
    }
    
    case 'PUSH_HISTORY': {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push([...state.blocks]);
      return {
        ...state,
        history: newHistory.slice(-20), // Keep last 20 states
        historyIndex: newHistory.length - 1,
      };
    }
    
    default:
      return state;
  }
}

export const initialEditorState: PDFEditorState = {
  blocks: DEFAULT_BLOCKS,
  selectedBlockId: null,
  hoveredBlockId: null,
  isDragging: false,
  history: [DEFAULT_BLOCKS],
  historyIndex: 0,
  zoom: 100,
};
