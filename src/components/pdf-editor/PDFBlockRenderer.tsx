import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, EyeOff, Lock, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PDFBlock } from "./types";
import { PDFTheme, PDFEditorSettings } from "@/lib/pdfThemes";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
  editorSettings: PDFEditorSettings;
  customizeSettings: Record<string, unknown>;
  fonts: { heading: string; body: string };
  fontSizeScale: number;
}

const BLOCK_LABELS: Record<string, string> = {
  'header': 'Company Header',
  'client-info': 'Client Information',
  'project-info': 'Project Details',
  'items-table': 'Quotation Items',
  'summary': 'Price Summary',
  'payment-stages': 'Payment Stages',
  'terms': 'Terms & Conditions',
  'warranty': 'Warranty',
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
  style = {},
  multiline = false,
}: {
  value: string;
  field: string;
  onSave: (field: string, value: string) => void;
  className?: string;
  placeholder?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing) {
      if (multiline && textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.select();
      } else if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }
  }, [isEditing, multiline]);

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
    if (e.key === 'Enter' && !multiline) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-start gap-1 relative z-10">
        {multiline ? (
          <Textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="text-xs min-h-[60px] min-w-[150px] bg-white"
          />
        ) : (
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="h-6 text-xs py-0 px-2 min-w-[80px] bg-white"
          />
        )}
        <button 
          onClick={handleSave}
          className="p-0.5 hover:bg-green-100 rounded text-green-600 bg-white shadow-sm"
        >
          <Check className="h-3 w-3" />
        </button>
        <button 
          onClick={handleCancel}
          className="p-0.5 hover:bg-red-100 rounded text-red-600 bg-white shadow-sm"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <span 
      className={cn(
        className,
        "cursor-text hover:bg-primary/10 hover:outline hover:outline-2 hover:outline-primary/40 rounded px-0.5 transition-all inline-block",
        !value && "text-muted-foreground italic"
      )}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      title="Click to edit"
    >
      {value || placeholder}
    </span>
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
  fonts,
  fontSizeScale,
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
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDataChange = (field: string, value: string) => {
    onDataChange?.(field, value);
  };

  // Theme-based styles computed once
  const themeStyles = useMemo(() => {
    const bgRgb = theme.colors.background;
    const cardBgRgb = theme.colors.cardBackground;
    const borderRgb = theme.colors.border;
    const textRgb = theme.colors.text;
    const accentRgb = theme.colors.accent;
    const highlightRgb = theme.colors.highlight;
    const headerBgRgb = theme.colors.headerBg;
    const headerTextRgb = theme.colors.headerText;
    const decorRgb = theme.colors.decorationPrimary || accentRgb;

    // Calculate contrast for highlight
    const highlightLuminance = (0.299 * highlightRgb[0] + 0.587 * highlightRgb[1] + 0.114 * highlightRgb[2]) / 255;
    const highlightTextColor = highlightLuminance > 0.5 ? [20, 20, 20] : [255, 255, 255];

    return {
      background: `rgb(${bgRgb.join(',')})`,
      cardBackground: `rgb(${cardBgRgb.join(',')})`,
      border: `rgb(${borderRgb.join(',')})`,
      text: `rgb(${textRgb.join(',')})`,
      accent: `rgb(${accentRgb.join(',')})`,
      highlight: `rgb(${highlightRgb.join(',')})`,
      highlightText: `rgb(${highlightTextColor.join(',')})`,
      headerBg: `rgb(${headerBgRgb.join(',')})`,
      headerText: `rgb(${headerTextRgb.join(',')})`,
      decoration: `rgb(${decorRgb.join(',')})`,
    };
  }, [theme]);

  // Font sizes based on scale
  const sizes = useMemo(() => ({
    heading: `${18 * fontSizeScale}px`,
    subheading: `${12 * fontSizeScale}px`,
    label: `${10 * fontSizeScale}px`,
    body: `${11 * fontSizeScale}px`,
    small: `${9 * fontSizeScale}px`,
    tiny: `${8 * fontSizeScale}px`,
  }), [fontSizeScale]);

  const showDecorations = editorSettings.showDecorations !== false;
  const showSectionDividers = editorSettings.showSectionDividers !== false;

  // Card style based on settings
  const getCardStyle = (): React.CSSProperties => ({
    backgroundColor: themeStyles.cardBackground,
    border: editorSettings.showBorders ? `1px solid ${themeStyles.border}` : 'none',
    borderRadius: '4px',
    padding: `${(editorSettings.advancedSettings?.cardPadding || 8) * 0.75}px`,
  });

  // Highlight style for amounts
  const getHighlightStyle = (): React.CSSProperties => {
    if (!editorSettings.highlightAmounts) return {};
    const padding = editorSettings.advancedSettings?.highlightPadding || 4;
    const radius = editorSettings.advancedSettings?.highlightBorderRadius || 2;
    return {
      backgroundColor: themeStyles.highlight,
      color: themeStyles.highlightText,
      padding: `${padding * 0.3}px ${padding * 0.6}px`,
      borderRadius: `${radius}px`,
      fontWeight: 600,
    };
  };

  // Section divider component
  const SectionDivider = () => {
    if (!showDecorations || !showSectionDividers) return null;
    return (
      <div 
        className="h-px mb-3"
        style={{
          background: `linear-gradient(90deg, transparent, ${themeStyles.decoration}, transparent)`,
        }}
      />
    );
  };

  const renderBlockContent = () => {
    switch (block.type) {
      case 'header':
        return (
          <div className="relative">
            <div 
              className="flex items-center gap-4 pb-4"
              style={{
                borderBottom: `2px solid ${themeStyles.accent}`,
                flexDirection: editorSettings.logoPlacement === 'center' ? 'column' : 'row',
                alignItems: editorSettings.logoPlacement === 'center' ? 'center' : 'flex-start',
              }}
            >
              {/* Logo */}
              <div 
                className="shrink-0 rounded flex items-center justify-center overflow-hidden"
                style={{
                  width: '56px',
                  height: '56px',
                  backgroundColor: themeStyles.headerBg,
                  order: editorSettings.logoPlacement === 'right' ? 1 : 0,
                }}
              >
                {(quotationData.companyLogo as string) ? (
                  <img 
                    src={quotationData.companyLogo as string} 
                    alt="Logo" 
                    className="w-full h-full object-contain" 
                  />
                ) : (
                  <span style={{ color: themeStyles.headerText, fontSize: sizes.tiny, fontWeight: 700 }}>LOGO</span>
                )}
              </div>
              
              {/* Company Info */}
              <div 
                className="flex-1 min-w-0"
                style={{
                  textAlign: editorSettings.logoPlacement === 'center' ? 'center' : 
                            editorSettings.logoPlacement === 'right' ? 'left' : 'right',
                }}
              >
                <EditableText
                  value={(quotationData.companyName as string) || ''}
                  field="companyName"
                  onSave={handleDataChange}
                  placeholder="Company Name"
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: sizes.heading,
                    fontWeight: 700,
                    color: themeStyles.text,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                />
                <p style={{ fontSize: sizes.small, color: themeStyles.text, opacity: 0.7, marginTop: '4px' }}>
                  Company Address & Contact
                </p>
              </div>
            </div>
          </div>
        );

      case 'client-info':
        return (
          <div style={getCardStyle()}>
            <p style={{ fontSize: sizes.tiny, fontWeight: 600, color: themeStyles.text, opacity: 0.6, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              QUOTATION FOR
            </p>
            <EditableText
              value={(quotationData.clientName as string) || ''}
              field="clientName"
              onSave={handleDataChange}
              placeholder="Client Name"
              style={{
                fontFamily: fonts.heading,
                fontSize: sizes.subheading,
                fontWeight: 700,
                color: themeStyles.text,
                display: 'block',
              }}
            />
            <EditableText
              value={(quotationData.clientAddress as string) || ''}
              field="clientAddress"
              onSave={handleDataChange}
              placeholder="Client Address"
              style={{
                fontSize: sizes.small,
                color: themeStyles.text,
                opacity: 0.7,
                display: 'block',
                marginTop: '2px',
              }}
            />
          </div>
        );

      case 'project-info':
        return (
          <div style={getCardStyle()}>
            <p style={{ fontSize: sizes.tiny, fontWeight: 600, color: themeStyles.text, opacity: 0.6, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              PROJECT DETAILS
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: editorSettings.headerInfoColumns === 1 ? '1fr' : '1fr 1fr', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: sizes.small, color: themeStyles.text, opacity: 0.6 }}>Project:</span>
                <EditableText
                  value={(quotationData.quotationTitle as string) || ''}
                  field="quotationTitle"
                  onSave={handleDataChange}
                  placeholder="Project Name"
                  style={{ fontSize: sizes.body, fontWeight: 600, color: themeStyles.text }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: sizes.small, color: themeStyles.text, opacity: 0.6 }}>Date:</span>
                <EditableText
                  value={(quotationData.dateOfProposal as string) || ''}
                  field="dateOfProposal"
                  onSave={handleDataChange}
                  placeholder="DD/MM/YYYY"
                  style={{ fontSize: sizes.body, fontWeight: 600, color: themeStyles.text }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: sizes.small, color: themeStyles.text, opacity: 0.6 }}>Valid Till:</span>
                <span style={{ fontSize: sizes.body, fontWeight: 600, color: themeStyles.text }}>
                  {(quotationData.quotationValidTill as string) || '30 days'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: sizes.small, color: themeStyles.text, opacity: 0.6 }}>Location:</span>
                <span style={{ fontSize: sizes.body, fontWeight: 600, color: themeStyles.text }}>
                  {(quotationData.placeOfProject as string) || 'On-site'}
                </span>
              </div>
            </div>
          </div>
        );

      case 'items-table': {
        const tableStyle = editorSettings.tableStyle || 'bordered';
        const cellStyle: React.CSSProperties = {
          padding: `${(editorSettings.advancedSettings?.rowPadding || 4) * 0.75}px`,
          fontSize: sizes.small,
          border: tableStyle === 'minimal' ? 'none' : `1px solid ${themeStyles.border}`,
          color: themeStyles.text,
        };
        
        return (
          <div>
            <div 
              style={{
                fontSize: sizes.body,
                fontFamily: fonts.heading,
                fontWeight: 700,
                marginBottom: '8px',
                paddingBottom: '4px',
                borderBottom: `2px solid ${themeStyles.accent}`,
                color: themeStyles.text,
              }}
            >
              SAMPLE SECTION
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: tableStyle === 'striped' || tableStyle === 'grid' ? themeStyles.cardBackground : 'transparent' }}>
                  <th style={{ ...cellStyle, textAlign: 'left', fontWeight: 600 }}>Product</th>
                  <th style={{ ...cellStyle, textAlign: 'center', fontWeight: 600 }}>Area</th>
                  <th style={{ ...cellStyle, textAlign: 'center', fontWeight: 600 }}>Rate</th>
                  <th style={{ ...cellStyle, textAlign: 'right', fontWeight: 600 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={cellStyle}>Sample Item</td>
                  <td style={{ ...cellStyle, textAlign: 'center' }}>32 sq.ft</td>
                  <td style={{ ...cellStyle, textAlign: 'center' }}>₹850</td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}>
                    <span style={getHighlightStyle()}>₹27,200</span>
                  </td>
                </tr>
                <tr style={tableStyle === 'striped' ? { backgroundColor: themeStyles.cardBackground } : {}}>
                  <td style={cellStyle}>Another Item</td>
                  <td style={{ ...cellStyle, textAlign: 'center' }}>24 sq.ft</td>
                  <td style={{ ...cellStyle, textAlign: 'center' }}>₹950</td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}>
                    <span style={getHighlightStyle()}>₹22,800</span>
                  </td>
                </tr>
              </tbody>
            </table>
            <p style={{ fontSize: sizes.tiny, color: themeStyles.text, opacity: 0.5, marginTop: '8px', textAlign: 'center', fontStyle: 'italic' }}>
              Table data is read-only in preview. Edit in form.
            </p>
          </div>
        );
      }

      case 'summary': {
        const summaryPosition = editorSettings.summaryStyle || 'right';
        const containerStyle: React.CSSProperties = {
          display: 'flex',
          justifyContent: summaryPosition === 'center' ? 'center' : summaryPosition === 'full-width' ? 'stretch' : 'flex-end',
        };
        
        return (
          <div style={containerStyle}>
            <div style={{ 
              ...getCardStyle(), 
              width: summaryPosition === 'full-width' ? '100%' : '200px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: sizes.small, color: themeStyles.text }}>
                <span>Subtotal</span>
                <span style={getHighlightStyle()}>₹{((quotationData.subtotal as number) || 50000).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: sizes.small, color: themeStyles.text }}>
                <span>Discount</span>
                <span>-₹3,000</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: sizes.small, color: themeStyles.text }}>
                <span>GST (18%)</span>
                <span>₹8,460</span>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                paddingTop: '8px', 
                marginTop: '8px', 
                fontWeight: 700, 
                fontSize: sizes.subheading,
                borderTop: `1px solid ${themeStyles.border}`,
                color: themeStyles.text,
              }}>
                <span>Grand Total</span>
                <span style={getHighlightStyle()}>₹{((quotationData.grandTotal as number) || 55460).toLocaleString()}</span>
              </div>
            </div>
          </div>
        );
      }

      case 'payment-stages': {
        const paymentStages = (quotationData.paymentStages as Array<{ stageName?: string; percentage?: number; amount?: number }>) || [
          { stageName: 'Advance', percentage: 40, amount: 22184 },
          { stageName: 'Progress', percentage: 40, amount: 22184 },
          { stageName: 'Completion', percentage: 20, amount: 11092 },
        ];
        return (
          <div style={getCardStyle()}>
            <SectionDivider />
            <p style={{ fontSize: sizes.body, fontFamily: fonts.heading, fontWeight: 700, marginBottom: '8px', color: themeStyles.text }}>
              STAGEWISE PAYMENT OPTION
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(paymentStages.length, 3)}, 1fr)`, gap: '8px' }}>
              {paymentStages.map((stage, index) => (
                <div 
                  key={index} 
                  style={{ 
                    textAlign: 'center', 
                    padding: '8px', 
                    borderRadius: '4px', 
                    backgroundColor: themeStyles.cardBackground,
                    border: `1px solid ${themeStyles.border}`,
                  }}
                >
                  <p style={{ fontWeight: 600, fontSize: sizes.small, color: themeStyles.text }}>Stage {index + 1}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: sizes.tiny }}>
                    <EditableText
                      value={stage.stageName || `Stage ${index + 1}`}
                      field={`paymentStage.${index}.stageName`}
                      onSave={handleDataChange}
                      placeholder="Stage Name"
                      style={{ fontSize: sizes.tiny, color: themeStyles.text }}
                    />
                    <span style={{ color: themeStyles.text }}>-</span>
                    <EditableText
                      value={String(stage.percentage || 0)}
                      field={`paymentStage.${index}.percentage`}
                      onSave={handleDataChange}
                      placeholder="0"
                      style={{ fontSize: sizes.tiny, width: '20px', color: themeStyles.text }}
                    />
                    <span style={{ color: themeStyles.text }}>%</span>
                  </div>
                  <p style={{ fontWeight: 700, ...(index === 0 ? getHighlightStyle() : { color: themeStyles.text }), marginTop: '4px', fontSize: sizes.small }}>
                    ₹{(stage.amount || 0).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'terms': {
        const termsContent = (quotationData.termsConditions as string[]) || [
          'Project duration is 30 days after design phase',
          'Material dispatch as per schedule',
          'Site must be ready for work',
        ];
        return (
          <div style={getCardStyle()}>
            <SectionDivider />
            <p style={{ fontSize: sizes.body, fontFamily: fonts.heading, fontWeight: 700, marginBottom: '8px', color: themeStyles.text }}>
              TERMS & CONDITIONS
            </p>
            <ul style={{ fontSize: sizes.small, color: themeStyles.text, opacity: 0.8, margin: 0, paddingLeft: '16px' }}>
              {termsContent.map((term, index) => (
                <li key={index} style={{ marginBottom: '4px' }}>
                  <EditableText
                    value={term}
                    field={`terms.${index}`}
                    onSave={handleDataChange}
                    placeholder="Enter term"
                    style={{ fontSize: sizes.small }}
                  />
                </li>
              ))}
            </ul>
          </div>
        );
      }

      case 'warranty': {
        const warrantyText = (quotationData.warranty as string) || '1 year warranty on all work performed. Warranty covers manufacturing defects and installation issues.';
        return (
          <div style={getCardStyle()}>
            <SectionDivider />
            <p style={{ fontSize: sizes.body, fontFamily: fonts.heading, fontWeight: 700, marginBottom: '8px', color: themeStyles.text }}>
              WARRANTY
            </p>
            <EditableText
              value={warrantyText}
              field="warranty"
              onSave={handleDataChange}
              placeholder="Enter warranty terms"
              style={{ fontSize: sizes.small, color: themeStyles.text, opacity: 0.8 }}
              multiline
            />
          </div>
        );
      }

      case 'signature':
        return (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', paddingTop: '16px' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ height: '48px', borderBottom: `1px solid ${themeStyles.border}`, marginBottom: '4px' }} />
              <p style={{ fontSize: sizes.small, color: themeStyles.text, opacity: 0.7 }}>Customer Signature</p>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ height: '48px', borderBottom: `1px solid ${themeStyles.border}`, marginBottom: '4px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                {(quotationData.signatureUrl as string) && (
                  <img 
                    src={quotationData.signatureUrl as string} 
                    alt="Signature" 
                    style={{ maxHeight: '44px', objectFit: 'contain' }}
                  />
                )}
              </div>
              <p style={{ fontSize: sizes.small, color: themeStyles.text, opacity: 0.7 }}>Authorized Signature</p>
            </div>
          </div>
        );

      case 'accept-reject':
        return (
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', paddingTop: '16px' }}>
            <button
              style={{
                padding: '10px 24px',
                backgroundColor: '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: sizes.body,
                cursor: 'pointer',
              }}
            >
              ✓ Accept Quotation
            </button>
            <button
              style={{
                padding: '10px 24px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: sizes.body,
                cursor: 'pointer',
              }}
            >
              ✗ Reject
            </button>
          </div>
        );

      default:
        return (
          <div style={{ padding: '16px', backgroundColor: themeStyles.cardBackground, borderRadius: '4px' }}>
            <p style={{ fontSize: sizes.small, color: themeStyles.text, opacity: 0.6 }}>Unknown block type: {block.type}</p>
          </div>
        );
    }
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isSelected && "ring-2 ring-primary ring-offset-2",
        isDragging && "z-50"
      )}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={onSelect}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      {/* Block controls overlay */}
      <AnimatePresence>
        {(isHovered || isSelected) && (
          <motion.div
            className="absolute -top-3 left-0 right-0 flex items-center justify-between z-20"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
          >
            <div className="flex items-center gap-1">
              <div
                {...attributes}
                {...listeners}
                className={cn(
                  "cursor-grab active:cursor-grabbing p-1 rounded bg-background/95 backdrop-blur-sm shadow-sm border",
                  block.locked && "cursor-not-allowed opacity-50"
                )}
              >
                <GripVertical className="h-3 w-3 text-muted-foreground" />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground bg-background/95 px-2 py-0.5 rounded shadow-sm border">
                {BLOCK_LABELS[block.type] || block.type}
              </span>
              {block.locked && (
                <div className="p-1 rounded bg-background/95 shadow-sm border">
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisibility();
              }}
              className="p-1 rounded bg-background/95 shadow-sm border hover:bg-muted transition-colors"
              title={block.visible ? "Hide block" : "Show block"}
            >
              {block.visible ? (
                <Eye className="h-3 w-3 text-muted-foreground" />
              ) : (
                <EyeOff className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Block content */}
      <div className="pt-1">
        {renderBlockContent()}
      </div>
    </motion.div>
  );
};
