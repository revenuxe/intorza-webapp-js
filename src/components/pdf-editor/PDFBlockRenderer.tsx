import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, EyeOff, Lock, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PDFBlock } from "./types";
import { PDFTheme } from "@/lib/pdfThemes";
import { Input } from "@/components/ui/input";

interface PDFBlockRendererProps {
  block: PDFBlock;
  isSelected: boolean;
  isHovered: boolean;
  theme: PDFTheme;
  onSelect: () => void;
  onHover: (hovered: boolean) => void;
  onToggleVisibility: () => void;
  onDataChange?: (field: string, value: string) => void;
  quotationData: Record<string, unknown>;
  editorSettings: Record<string, unknown>;
  customizeSettings: Record<string, unknown>;
}

const BLOCK_LABELS: Record<string, string> = {
  'header': 'Company Header',
  'client-info': 'Client Information',
  'project-info': 'Project Details',
  'items-table': 'Quotation Items',
  'summary': 'Price Summary',
  'payment-stages': 'Payment Stages',
  'terms': 'Terms & Conditions',
  'signature': 'Signature Area',
  'accept-reject': 'Accept/Reject Buttons',
};

// Inline editable text component
const EditableText = ({ 
  value, 
  field, 
  onSave, 
  className = "",
  placeholder = "Click to edit",
  as: Component = "span"
}: {
  value: string;
  field: string;
  onSave: (field: string, value: string) => void;
  className?: string;
  placeholder?: string;
  as?: "span" | "p" | "h1" | "div";
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    onSave(field, editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 relative">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="h-6 text-xs py-0 px-2 min-w-[80px]"
        />
        <button 
          onClick={handleSave}
          className="p-0.5 hover:bg-green-100 rounded text-green-600"
        >
          <Check className="h-3 w-3" />
        </button>
        <button 
          onClick={handleCancel}
          className="p-0.5 hover:bg-red-100 rounded text-red-600"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <Component 
      className={cn(
        className,
        "cursor-text hover:bg-primary/5 hover:outline hover:outline-1 hover:outline-primary/30 rounded px-0.5 transition-all inline-block",
        !value && "text-muted-foreground italic"
      )}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      title="Click to edit"
    >
      {value || placeholder}
    </Component>
  );
};

export const PDFBlockRenderer = ({
  block,
  isSelected,
  isHovered,
  theme,
  onSelect,
  onHover,
  onToggleVisibility,
  onDataChange,
  quotationData,
  editorSettings,
  customizeSettings,
}: PDFBlockRendererProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: block.id,
    disabled: block.locked,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : block.visible ? 1 : 0.4,
  };

  const handleDataChange = (field: string, value: string) => {
    onDataChange?.(field, value);
  };

  const getPreviewStyles = () => ({
    background: `rgb(${theme.colors.background.join(',')})`,
    color: `rgb(${theme.colors.text.join(',')})`,
  });

  const getCardStyle = () => ({
    backgroundColor: `rgb(${theme.colors.cardBackground.join(',')})`,
    borderColor: `rgb(${theme.colors.border.join(',')})`,
  });

  const getHeaderStyle = () => ({
    backgroundColor: `rgb(${theme.colors.headerBg.join(',')})`,
    color: `rgb(${theme.colors.headerText.join(',')})`,
  });

  const getHighlightStyle = () => ({
    backgroundColor: `rgb(${theme.colors.highlight.join(',')})`,
    padding: '2px 6px',
    borderRadius: '2px',
  });

  const renderBlockContent = () => {
    switch (block.type) {
      case 'header':
        return (
          <div className="flex items-center gap-4 pb-4 border-b" style={{ borderColor: `rgb(${theme.colors.border.join(',')})` }}>
            <div 
              className="w-14 h-14 rounded flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={getHeaderStyle()}
            >
              {(quotationData.companyLogo as string) ? (
                <img src={quotationData.companyLogo as string} alt="Logo" className="w-full h-full object-contain rounded" />
              ) : 'LOGO'}
            </div>
            <div className="flex-1 min-w-0">
              <EditableText
                value={(quotationData.companyName as string) || ''}
                field="companyName"
                onSave={handleDataChange}
                placeholder="Company Name"
                as="h1"
                className="text-lg font-bold"
              />
              <p className="text-xs text-muted-foreground">Company Address & Contact</p>
            </div>
          </div>
        );

      case 'client-info':
        return (
          <div className="p-3 rounded border" style={getCardStyle()}>
            <p className="text-[10px] font-medium text-muted-foreground mb-1">QUOTATION FOR</p>
            <EditableText
              value={(quotationData.clientName as string) || ''}
              field="clientName"
              onSave={handleDataChange}
              placeholder="Client Name"
              as="p"
              className="font-semibold text-sm"
            />
            <EditableText
              value={(quotationData.clientAddress as string) || ''}
              field="clientAddress"
              onSave={handleDataChange}
              placeholder="Client Address"
              as="p"
              className="text-xs text-muted-foreground"
            />
          </div>
        );

      case 'project-info':
        return (
          <div className="p-3 rounded border" style={getCardStyle()}>
            <p className="text-[10px] font-medium text-muted-foreground mb-1">PROJECT DETAILS</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground shrink-0">Project:</span>
                <EditableText
                  value={(quotationData.quotationTitle as string) || ''}
                  field="quotationTitle"
                  onSave={handleDataChange}
                  placeholder="Project Name"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground shrink-0">Date:</span>
                <EditableText
                  value={(quotationData.dateOfProposal as string) || ''}
                  field="dateOfProposal"
                  onSave={handleDataChange}
                  placeholder="DD/MM/YYYY"
                />
              </div>
            </div>
          </div>
        );

      case 'items-table':
        return (
          <div>
            <div className="text-xs font-bold mb-2 pb-1 border-b-2" style={{ borderColor: `rgb(${theme.colors.accent.join(',')})` }}>
              SAMPLE SECTION
            </div>
            <table className="w-full text-[10px]" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: `rgb(${theme.colors.cardBackground.join(',')})` }}>
                  <th className="p-2 text-left border" style={{ borderColor: `rgb(${theme.colors.border.join(',')})` }}>Product</th>
                  <th className="p-2 text-center border" style={{ borderColor: `rgb(${theme.colors.border.join(',')})` }}>Area</th>
                  <th className="p-2 text-center border" style={{ borderColor: `rgb(${theme.colors.border.join(',')})` }}>Rate</th>
                  <th className="p-2 text-right border" style={{ borderColor: `rgb(${theme.colors.border.join(',')})` }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border" style={{ borderColor: `rgb(${theme.colors.border.join(',')})` }}>Sample Item</td>
                  <td className="p-2 text-center border" style={{ borderColor: `rgb(${theme.colors.border.join(',')})` }}>32 sq.ft</td>
                  <td className="p-2 text-center border" style={{ borderColor: `rgb(${theme.colors.border.join(',')})` }}>₹850</td>
                  <td className="p-2 text-right border" style={{ borderColor: `rgb(${theme.colors.border.join(',')})` }}>
                    <span style={getHighlightStyle()}>₹27,200</span>
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="text-[9px] text-muted-foreground mt-2 text-center italic">
              Table data is read-only in preview. Edit in form.
            </p>
          </div>
        );

      case 'summary':
        return (
          <div className="flex justify-end">
            <div className="w-56 p-3 rounded border" style={getCardStyle()}>
              <div className="flex justify-between mb-1 text-xs">
                <span>Subtotal</span>
                <span style={getHighlightStyle()}>₹{((quotationData.subtotal as number) || 50000).toLocaleString()}</span>
              </div>
              <div className="flex justify-between mb-1 text-xs">
                <span>Discount</span>
                <span>-₹3,000</span>
              </div>
              <div className="flex justify-between mb-1 text-xs">
                <span>GST (18%)</span>
                <span>₹8,460</span>
              </div>
              <div className="flex justify-between pt-2 mt-2 font-bold text-sm border-t" style={{ borderColor: `rgb(${theme.colors.border.join(',')})` }}>
                <span>Grand Total</span>
                <span style={getHighlightStyle()}>₹{((quotationData.grandTotal as number) || 55460).toLocaleString()}</span>
              </div>
            </div>
          </div>
        );

      case 'payment-stages':
        return (
          <div className="p-3 rounded border" style={getCardStyle()}>
            <p className="text-xs font-bold mb-2">STAGEWISE PAYMENT OPTION</p>
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div className="text-center p-2 rounded bg-muted/50">
                <p className="font-semibold">Stage 1</p>
                <p>Advance - 40%</p>
                <p className="font-bold" style={getHighlightStyle()}>₹22,184</p>
              </div>
              <div className="text-center p-2 rounded bg-muted/50">
                <p className="font-semibold">Stage 2</p>
                <p>Progress - 40%</p>
                <p className="font-bold">₹22,184</p>
              </div>
              <div className="text-center p-2 rounded bg-muted/50">
                <p className="font-semibold">Stage 3</p>
                <p>Completion - 20%</p>
                <p className="font-bold">₹11,092</p>
              </div>
            </div>
          </div>
        );

      case 'terms':
        return (
          <div className="p-3 rounded border" style={getCardStyle()}>
            <p className="text-xs font-bold mb-2">TERMS & CONDITIONS</p>
            <ul className="text-[10px] space-y-1 text-muted-foreground list-disc list-inside">
              <li>Project duration is 30 days after design phase</li>
              <li>Material dispatch as per schedule</li>
              <li>Site must be ready for work</li>
            </ul>
          </div>
        );

      case 'signature':
        return (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: `rgb(${theme.colors.border.join(',')})` }}>
            <div className="text-center">
              <div className="h-12 border-b mb-1" style={{ borderColor: `rgb(${theme.colors.border.join(',')})` }}></div>
              <p className="text-[9px] text-muted-foreground">Customer Signature</p>
            </div>
            <div className="text-center">
              <div className="h-12 border-b mb-1" style={{ borderColor: `rgb(${theme.colors.border.join(',')})` }}></div>
              <p className="text-[9px] text-muted-foreground">Authorized Signature</p>
            </div>
          </div>
        );

      case 'accept-reject':
        return (
          <div className="flex justify-center gap-4 pt-4">
            <div className="px-8 py-2 bg-green-500 text-white text-sm font-bold rounded cursor-pointer hover:bg-green-600 transition-colors">
              ✓ ACCEPT
            </div>
            <div className="px-8 py-2 bg-red-500 text-white text-sm font-bold rounded cursor-pointer hover:bg-red-600 transition-colors">
              ✗ REJECT
            </div>
          </div>
        );

      default:
        return <div className="p-4 text-center text-muted-foreground">Unknown block type</div>;
    }
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: block.visible ? 1 : 0.4, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "relative group rounded-lg transition-all duration-200",
        isSelected && "ring-2 ring-primary ring-offset-2",
        isHovered && !isSelected && "ring-1 ring-primary/50",
        isDragging && "z-50 shadow-2xl scale-[1.02]",
        !block.visible && "opacity-50"
      )}
      onClick={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {/* Control overlay */}
      <div className={cn(
        "absolute -top-8 left-0 right-0 flex items-center justify-between px-2 py-1 bg-background/95 backdrop-blur-sm rounded-t-lg border border-b-0 transition-opacity duration-200 z-10",
        (isHovered || isSelected) ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        <div className="flex items-center gap-2">
          {!block.locked && (
            <div 
              {...attributes} 
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          {block.locked && (
            <Lock className="h-3 w-3 text-muted-foreground" />
          )}
          <span className="text-xs font-medium">{BLOCK_LABELS[block.type]}</span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            {block.visible ? (
              <Eye className="h-3 w-3 text-muted-foreground" />
            ) : (
              <EyeOff className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Block content */}
      <div className={cn(
        "p-4 rounded-lg border transition-colors",
        isSelected ? "border-primary" : "border-transparent hover:border-muted-foreground/20"
      )} style={getPreviewStyles()}>
        {renderBlockContent()}
      </div>
    </motion.div>
  );
};
