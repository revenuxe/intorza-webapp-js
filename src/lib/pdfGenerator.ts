
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DEFAULT_QUOTATION_TERMS } from './libraryDefaults';
import { PDFEditorSettings, getThemeById, hexToRgb, PDFTheme, getFontById, applyBrandColorsToTheme, defaultAdvancedSettings } from './pdfThemes';
import { drawAllDecorations, drawSectionDivider, drawFooterDecoration } from './pdfDecorations';
import { formatPDFCurrency, formatPDFNumber, getNumericFont, createPDFCurrencyFormatter, registerPDFCurrencyFont } from './pdfCurrencyFormatter';
import { normalizeTermsSections } from './termsResolver';
import { fitFixedColumnWidths } from './pdfTableLayout';
import { formatWarrantyForPdf } from './warrantyFormatter';
import {
  getPDFFontScale,
  getPDFLayoutMetrics,
  getPDFSummaryLayout,
  getPDFTableLineWidths,
  getPDFTableTheme,
} from './pdfEditorStyles';

// --- Settings Interface ---
export interface QuotationPdfSettings {
  showCompanyLogo: boolean;
  showCompanyAddress: boolean;
  showProjectDetails: boolean;
  showDetailedSizeColumns: boolean;
  useSimpleItemLayout: boolean;
  showSubtotal: boolean;
  showTaxGst: boolean;
  showGrandTotal: boolean;
  showPaymentStages: boolean;
  showTermsConditions: boolean;
  showSignatureArea: boolean;
  // Form field settings
  showClientName: boolean;
  showClientAddress: boolean;
  showDateOfProposal: boolean;
  showQuotationValidTill: boolean;
  showProjectDeadline: boolean;
  showPlaceOfProject: boolean;
  showWarranty: boolean;
  showProjectType: boolean;
  showSideColumn: boolean;
  showProductDetails: boolean;
  showDiscount: boolean;
  showSocialMediaDiscount: boolean;
  // Payment & Bank Details
  showBankDetails: boolean;
  showQRCode: boolean;
  showProfessionalAdvantages: boolean;
  showQuotationNumber: boolean;
  showItemImages: boolean;
}

// --- Interfaces ---
export interface LineItem {
  side: string;
  productName: string;
  productDetails: string;
  widthFt: number;
  heightFt: number;
  sftArea: number;
  ratePerSft: number;
  amount: number;
  imageUrls?: string[];
}

export interface Section {
  title: string;
  items: LineItem[];
}

export interface QuotationData {
  quotationId?: string;
  quotationTitle: string;
  clientName: string;
  clientAddress: string;
  dateOfProposal: string;
  quotationValidTill: string;
  projectDeadline?: string;
  placeOfProject: string;
  warranty: string;
  projectType: string;
  sections: Section[];
  subtotal: number;
  gstEnabled: boolean;
  gstRate: number;
  gstAmount?: number;
  discount?: number;
  grandTotal?: number;
  companyLogo?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  gstin?: string;
  professionalAdvantages?: string;
  signatureUrl?: string;
  enableSocialMediaDiscount?: boolean;
  socialMediaDiscountRate?: number;
  paymentStages?: {
    stage: string;
    milestone: string;
    percentage: number;
  }[];
  termsConditions?: {
    id: string;
    title: string;
    points: string[];
  }[];
  // Bank details
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    accountHolder?: string;
    upiId?: string;
    qrCodeUrl?: string;
  };
  // Localization settings
  localization?: {
    currencyCode: string;
    currencySymbol: string;
    locale: string;
    taxLabel: string;
    taxRegistrationLabel: string;
    areaUnit: string;
    areaUnitShort: string;
    countryCode?: string;
  };
  settings?: QuotationPdfSettings;
  editorSettings?: PDFEditorSettings;
  // Preview mode - if true, returns doc without saving
  previewOnly?: boolean;
}

// --- Helpers ---
// Currency-safe font for numeric values (always use helvetica for numbers)
const NUMERIC_FONT = getNumericFont();

const compressImage = async (imageUrl: string, maxWidth: number, maxHeight: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    // Handle timeout
    const timeout = setTimeout(() => {
      reject(new Error('Image load timeout'));
    }, 10000);
    
    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        canvas.width = width || 100;
        canvas.height = height || 100;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          reject(new Error('Canvas context not available'));
        }
      } catch (e) {
        reject(e);
      }
    };
    
    img.onerror = (e) => {
      clearTimeout(timeout);
      console.error('Image load error:', e);
      reject(new Error('Failed to load image'));
    };
    
    // Handle different URL formats
    if (imageUrl.startsWith('data:')) {
      img.src = imageUrl;
    } else if (imageUrl.startsWith('blob:')) {
      img.src = imageUrl;
    } else {
      // For remote URLs, try with timestamp to avoid cache issues
      const separator = imageUrl.includes('?') ? '&' : '?';
      img.src = `${imageUrl}${separator}t=${Date.now()}`;
    }
  });
};

// --- Main Generator Function ---

export const generateQuotationPDF = async (data: QuotationData) => {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
    compress: true
  });
  registerPDFCurrencyFont(doc);

  // Default settings if not provided
  const settings: QuotationPdfSettings = {
    showCompanyLogo: true,
    showCompanyAddress: true,
    showProjectDetails: true,
    showDetailedSizeColumns: true,
    useSimpleItemLayout: false,
    showSubtotal: true,
    showTaxGst: true,
    showGrandTotal: true,
    showPaymentStages: true,
    showTermsConditions: true,
    showSignatureArea: true,
    showClientName: true,
    showClientAddress: true,
    showDateOfProposal: true,
    showQuotationValidTill: true,
    showProjectDeadline: true,
    showPlaceOfProject: true,
    showWarranty: true,
    showProjectType: true,
    showSideColumn: true,
    showProductDetails: true,
    showDiscount: true,
    showSocialMediaDiscount: true,
    showBankDetails: false,
    showQRCode: false,
    showProfessionalAdvantages: true,
    showQuotationNumber: true,
    showItemImages: true,
    ...data.settings
  };
  const warrantyDisplay = formatWarrantyForPdf(data.warranty);

  // Get theme from editor settings
  const editorSettings = data.editorSettings;
  const boldAmounts = editorSettings?.boldAmounts ?? false;
  let theme: PDFTheme = editorSettings ? getThemeById(editorSettings.theme) : getThemeById('minimal-white');
  
  // Apply brand colors if enabled and available
  if (editorSettings?.useBrandColors && editorSettings?.brandColors) {
    theme = applyBrandColorsToTheme(theme, editorSettings.brandColors);
  }
  
  const logoPlacement = editorSettings?.logoPlacement || 'left';
  const highlightAmounts = editorSettings?.highlightAmounts ?? true;
  
  // Get font settings - separate heading and body fonts
  const headingFontSettings = getFontById(editorSettings?.headingFont || 'times');
  const bodyFontSettings = getFontById(editorSettings?.bodyFont || 'helvetica');
  const headingFont = headingFontSettings.family;
  const bodyFont = bodyFontSettings.family;
  
  // Set default body font for entire document
  doc.setFont(bodyFont);
  
  // Helper functions to switch fonts
  const setHeadingFont = (style: 'normal' | 'bold' = 'bold') => doc.setFont(headingFont, style);
  const setBodyFont = (style: 'normal' | 'bold' = 'normal') => doc.setFont(bodyFont, style);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Calculate margin & insets based on decoration settings
  const hasBorderDecoration = editorSettings?.showDecorations && editorSettings?.showPageBorder && theme.decorations.pageBorderInset > 0;
  const borderInset = hasBorderDecoration ? theme.decorations.pageBorderInset : 0;
  // Filled elements (info cards, table headers) sitting right at the same offset as the
  // border line read as "touching" it even a few mm out, so bordered themes get a
  // noticeably wider clearance than the flat 15mm used everywhere else.
  const layoutMetrics = getPDFLayoutMetrics(
    pageWidth,
    pageHeight,
    { pageMargins: editorSettings?.pageMargins || 'normal' },
    hasBorderDecoration ? borderInset : 0,
  );
  const { margin, contentWidth, pageTopY, pageBottomY } = layoutMetrics;
  // Content and footer use separate boundaries so the last table row stays clear of
  // the footer and page decorations.
  let yPosition = pageTopY;
  const fontScale = getPDFFontScale(editorSettings?.fontSize || 'medium');
  const setPdfFontSize = (size: number) => doc.setFontSize(size * fontScale);
  const tableStyle = editorSettings?.tableStyle || 'bordered';
  const tableTheme = getPDFTableTheme(tableStyle);
  const showBorders = editorSettings?.showBorders ?? true;
  const compactMode = editorSettings?.compactMode ?? false;
  const tableLineWidths = getPDFTableLineWidths(tableStyle, showBorders);
  const cardBorderStyle = showBorders ? 'FD' : 'F';
  const headerStyle = editorSettings?.headerStyle || 'simple';

  // --- Design System Colors (from theme) ---
  const getHighlightColor = (): [number, number, number] => {
    if (editorSettings?.customColors?.highlight) {
      return hexToRgb(editorSettings.customColors.highlight);
    }
    return theme.colors.highlight;
  };

  // Calculate contrasting text color for highlighted backgrounds
  const getContrastingTextColor = (bgColor: [number, number, number]): [number, number, number] => {
    // Calculate relative luminance using sRGB formula
    const luminance = (0.299 * bgColor[0] + 0.587 * bgColor[1] + 0.114 * bgColor[2]) / 255;
    // Use white text for dark backgrounds, dark text for light backgrounds
    return luminance > 0.5 ? [20, 20, 20] : [255, 255, 255];
  };

  const highlightColor = getHighlightColor();
  const highlightTextColor = getContrastingTextColor(highlightColor);

  const COLORS = {
    TEXT_PRIMARY: [0, 0, 0] as [number, number, number], // Solid black
    TEXT_SECONDARY: [0, 0, 0] as [number, number, number], // Solid black
    TEXT_LIGHT: [40, 40, 40] as [number, number, number], // Dark gray for labels
    BG_CARD: theme.colors.cardBackground,
    BORDER: theme.colors.border,
    ACCENT: theme.colors.accent,
    HIGHLIGHT: highlightColor,
    HIGHLIGHT_TEXT: highlightTextColor,
    HEADER_BG: theme.colors.headerBg,
    HEADER_TEXT: theme.colors.headerText,
  };
  const headerTextColor = headerStyle === 'full-width'
    ? getContrastingTextColor(COLORS.HEADER_BG)
    : COLORS.TEXT_PRIMARY;
  const renderTable = (options: Parameters<typeof autoTable>[1]) => {
    const didParseCell = options.didParseCell;
    const headStyles = options.headStyles;
    autoTable(doc, {
      ...options,
      theme: tableTheme,
      tableLineWidth: tableLineWidths.table,
      tableLineColor: COLORS.BORDER,
      styles: {
        ...options.styles,
        lineWidth: tableLineWidths.cell,
        ...(compactMode ? { cellPadding: 2 } : {}),
      },
      headStyles: {
        ...headStyles,
        lineWidth: showBorders ? headStyles?.lineWidth : 0,
      },
      didParseCell: (hookData) => {
        didParseCell?.(hookData);
        hookData.cell.styles.fontSize *= fontScale;
      },
    });
  };

  // --- 1. Header Section (Clean & Minimal) ---
  
  // Logo placement based on editor settings
  let compressedLogo: string | null = null;
  const logoSize = 25;
  const cornerRadius = logoSize * 0.1;
  const headerBandHeight = logoPlacement === 'center' ? 70 : 36;
  if (headerStyle === 'full-width') {
    doc.setFillColor(COLORS.HEADER_BG[0], COLORS.HEADER_BG[1], COLORS.HEADER_BG[2]);
    doc.rect(margin, yPosition, contentWidth, headerBandHeight, 'F');
  } else if (headerStyle === 'boxed' && showBorders) {
    doc.setDrawColor(COLORS.BORDER[0], COLORS.BORDER[1], COLORS.BORDER[2]);
    doc.roundedRect(margin, yPosition, contentWidth, headerBandHeight, 2, 2, 'S');
  }
  
  if (settings.showCompanyLogo && data.companyLogo) {
    try {
      compressedLogo = await compressImage(data.companyLogo, 400, 400);
      
      let logoX = margin;
      if (logoPlacement === 'center') {
        logoX = (pageWidth - logoSize) / 2;
      } else if (logoPlacement === 'right') {
        logoX = pageWidth - margin - logoSize;
      }
      
      // Draw rounded rectangle for logo background
      doc.setFillColor(COLORS.HEADER_BG[0], COLORS.HEADER_BG[1], COLORS.HEADER_BG[2]);
      doc.roundedRect(logoX, yPosition, logoSize, logoSize, cornerRadius, cornerRadius, 'F');
      
      // Add logo on top of background
      doc.addImage(compressedLogo, 'JPEG', logoX, yPosition, logoSize, logoSize, undefined, 'FAST');
    } catch (e) { console.error(e); }
  }

  // Company Details positioning based on logo placement
  let companyInfoX = pageWidth - margin;
  let companyInfoAlign: 'right' | 'left' | 'center' = 'right';
  let headerStartY = yPosition;
  
  if (logoPlacement === 'right') {
    companyInfoX = margin;
    companyInfoAlign = 'left';
  } else if (logoPlacement === 'center') {
    companyInfoX = pageWidth / 2;
    companyInfoAlign = 'center';
  }
  
  let headerTextY = yPosition + 5;
  if (logoPlacement === 'center') {
    // For center layout, position text below logo with proper spacing
    headerTextY = yPosition + logoSize + 10;
  }
  
  setHeadingFont('bold');
  setPdfFontSize(18);
  doc.setTextColor(headerTextColor[0], headerTextColor[1], headerTextColor[2]);
  doc.text((data.companyName || 'COMPANY NAME').toUpperCase(), companyInfoX, headerTextY, { align: companyInfoAlign });
  
  headerTextY += 7;
  setBodyFont('normal');
  setPdfFontSize(9);
  doc.setTextColor(headerTextColor[0], headerTextColor[1], headerTextColor[2]);
  
  // Company address and contact details
  if (settings.showCompanyAddress) {
    if (data.companyAddress) {
      const maxAddressWidth = logoPlacement === 'center' ? contentWidth - 20 : 90;
      const addressLines = doc.splitTextToSize(data.companyAddress, maxAddressWidth);
      addressLines.forEach((line: string) => {
        doc.text(line, companyInfoX, headerTextY, { align: companyInfoAlign });
        headerTextY += 4.5;
      });
    }
    
    const contactDetails = [];
    if (data.companyPhone) contactDetails.push(data.companyPhone);
    if (data.companyEmail) contactDetails.push(data.companyEmail);
    
    if (contactDetails.length > 0) {
      doc.text(contactDetails.join(' | '), companyInfoX, headerTextY, { align: companyInfoAlign });
      headerTextY += 4.5;
    }
    
  // Get tax registration label from localization (e.g., "GSTIN", "VAT No", "Tax ID")
  const taxRegLabel = data.localization?.taxRegistrationLabel || 'GSTIN';
  if (data.gstin) {
      setBodyFont('bold');
      doc.text(`${taxRegLabel}: ${data.gstin}`, companyInfoX, headerTextY, { align: companyInfoAlign });
      headerTextY += 4.5;
    }
  }

  if (headerStyle === 'underlined') {
    doc.setDrawColor(COLORS.ACCENT[0], COLORS.ACCENT[1], COLORS.ACCENT[2]);
    doc.setLineWidth(showBorders ? 0.5 : 0.25);
    doc.line(margin, headerTextY + 1, pageWidth - margin, headerTextY + 1);
  }

  // Calculate yPosition based on layout - ensure no overlap with cards
  if (logoPlacement === 'center') {
    yPosition = headerTextY + 8; // Add extra space after center-aligned header
  } else {
    yPosition += 35; // Standard spacing for left/right layouts
  }
  if (headerStyle === 'full-width') {
    yPosition = Math.max(yPosition, pageTopY + headerBandHeight + 8);
  }

  // --- 2. Info Cards (Client & Project) ---
  if (settings.showProjectDetails) {
    const headerColumns = editorSettings?.headerInfoColumns || 2;
    const gap = 8;

    if (headerColumns === 1) {
      // Single row: Quotation For + Project Details side-by-side in one card
      const cardHeight = 48;
      doc.setFillColor(COLORS.BG_CARD[0], COLORS.BG_CARD[1], COLORS.BG_CARD[2]);
      doc.setDrawColor(COLORS.BORDER[0], COLORS.BORDER[1], COLORS.BORDER[2]);
      doc.roundedRect(margin, yPosition, contentWidth, cardHeight, 2, 2, cardBorderStyle);

      const halfWidth = contentWidth / 2;
      const cardPadding = 8;
      let leftY = yPosition + 10;
      const leftX = margin + cardPadding;

      // Left half: Client info
      setHeadingFont('bold');
      setPdfFontSize(8);
      doc.setTextColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
      doc.text('QUOTATION FOR', leftX, leftY);
      leftY += 7;
      setHeadingFont('bold');
      setPdfFontSize(11);
      doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
      doc.text(data.clientName, leftX, leftY);
      leftY += 6;
      setBodyFont('normal');
      setPdfFontSize(9);
      doc.setTextColor(COLORS.TEXT_SECONDARY[0], COLORS.TEXT_SECONDARY[1], COLORS.TEXT_SECONDARY[2]);
      const clientAddr1 = doc.splitTextToSize(data.clientAddress, halfWidth - (cardPadding * 2));
      doc.text(clientAddr1, leftX, leftY);

      // Right half: Project details
      let rightY = yPosition + 10;
      const rightX = margin + halfWidth + cardPadding;
      const metaValueOffset = 32;

      setHeadingFont('bold');
      setPdfFontSize(8);
      doc.setTextColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
      doc.text('PROJECT DETAILS', rightX, rightY);
      rightY += 7;

      const addMetaSingle = (label: string, value: string) => {
        setBodyFont('normal');
        setPdfFontSize(9);
        doc.setTextColor(COLORS.TEXT_SECONDARY[0], COLORS.TEXT_SECONDARY[1], COLORS.TEXT_SECONDARY[2]);
        doc.text(label, rightX, rightY);
        setBodyFont('bold');
        doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
        doc.text(value, rightX + metaValueOffset, rightY);
        rightY += 6;
      };

      addMetaSingle('Date:', data.dateOfProposal);
      addMetaSingle('Valid Till:', data.quotationValidTill);
      addMetaSingle('Project:', data.quotationTitle.substring(0, 20));
      if (settings.showWarranty && warrantyDisplay) addMetaSingle('Warranty:', warrantyDisplay);

      // Vertical divider
      doc.setDrawColor(COLORS.BORDER[0], COLORS.BORDER[1], COLORS.BORDER[2]);
      doc.setLineWidth(0.3);
      doc.line(margin + halfWidth, yPosition + 6, margin + halfWidth, yPosition + cardHeight - 6);

      yPosition += cardHeight + 10;

    } else if (headerColumns === 3) {
      const cardWidth = (contentWidth - gap * 2) / 3;
      const cardPadding = 6;
      const c1X = margin + cardPadding;
      const c2X = margin + cardWidth + gap;
      const c3X = margin + (cardWidth + gap) * 2;
      const contentInset = 9;
      const titleHeight = 6;
      const metadataLineHeight = 4.5;
      const rowGap = 1.5;
      const metadataLabelWidth = 19;
      const metadataValueWidth = cardWidth - cardPadding * 2 - metadataLabelWidth;
      const lineCount = (lines: string[]) => Math.max(lines.length, 1);
      const metadataRows = (fields: Array<[string, string]>) => {
        setBodyFont('bold');
        setPdfFontSize(8);
        return fields.map(([label, value]) => ({
          label,
          lines: doc.splitTextToSize(value, metadataValueWidth) as string[],
        }));
      };

      const projectRows = metadataRows([
        ['Date:', data.dateOfProposal],
        ['Valid:', data.quotationValidTill],
        ['Project:', data.quotationTitle],
      ]);
      const additionalRows = metadataRows([
        ...(settings.showWarranty && warrantyDisplay ? [['Warranty:', warrantyDisplay] as [string, string]] : []),
        ...(data.projectType ? [['Type:', data.projectType] as [string, string]] : []),
        ...(data.placeOfProject ? [['Place:', data.placeOfProject] as [string, string]] : []),
        ...(data.projectDeadline ? [['Deadline:', data.projectDeadline] as [string, string]] : []),
      ]);

      const metadataHeight = (rows: typeof projectRows) =>
        rows.reduce((height, row) => height + lineCount(row.lines) * metadataLineHeight + rowGap, 0);
      const clientName = String(data.clientName ?? '');
      const clientAddress = String(data.clientAddress ?? '');
      setHeadingFont('bold');
      setPdfFontSize(10);
      const clientNameLines = doc.splitTextToSize(clientName, cardWidth - cardPadding * 2) as string[];
      setBodyFont('normal');
      setPdfFontSize(8);
      const clientAddressLines = doc.splitTextToSize(clientAddress, cardWidth - cardPadding * 2) as string[];
      const clientContentHeight = contentInset + titleHeight +
        lineCount(clientNameLines) * 5 + 2 +
        lineCount(clientAddressLines) * metadataLineHeight + cardPadding;
      const projectContentHeight = contentInset + titleHeight + metadataHeight(projectRows) + cardPadding;
      const additionalContentHeight = contentInset + titleHeight + metadataHeight(additionalRows) + cardPadding;
      const cardHeight = Math.max(48, clientContentHeight, projectContentHeight, additionalContentHeight);

      if (yPosition + cardHeight > pageBottomY) {
        doc.addPage();
        yPosition = pageTopY;
      }

      doc.setFillColor(COLORS.BG_CARD[0], COLORS.BG_CARD[1], COLORS.BG_CARD[2]);
      doc.setDrawColor(COLORS.BORDER[0], COLORS.BORDER[1], COLORS.BORDER[2]);
      doc.roundedRect(margin, yPosition, cardWidth, cardHeight, 2, 2, cardBorderStyle);
      doc.roundedRect(c2X, yPosition, cardWidth, cardHeight, 2, 2, cardBorderStyle);
      doc.roundedRect(c3X, yPosition, cardWidth, cardHeight, 2, 2, cardBorderStyle);

      let c1Y = yPosition + contentInset;
      setHeadingFont('bold');
      setPdfFontSize(7);
      doc.setTextColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
      doc.text('QUOTATION FOR', c1X, c1Y);
      c1Y += titleHeight;
      setHeadingFont('bold');
      setPdfFontSize(10);
      doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
      doc.text(clientNameLines, c1X, c1Y, { lineHeightFactor: 1.15 });
      c1Y += lineCount(clientNameLines) * 5 + 2;
      setBodyFont('normal');
      setPdfFontSize(8);
      doc.setTextColor(COLORS.TEXT_SECONDARY[0], COLORS.TEXT_SECONDARY[1], COLORS.TEXT_SECONDARY[2]);
      doc.text(clientAddressLines, c1X, c1Y, { lineHeightFactor: 1.15 });

      const drawMetadataCard = (
        x: number,
        title: string,
        rows: typeof projectRows,
      ) => {
        let rowY = yPosition + contentInset;
        const contentX = x + cardPadding;
        setHeadingFont('bold');
        setPdfFontSize(7);
        doc.setTextColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
        doc.text(title, contentX, rowY);
        rowY += titleHeight;

        for (const row of rows) {
          setBodyFont('normal');
          setPdfFontSize(8);
          doc.setTextColor(COLORS.TEXT_SECONDARY[0], COLORS.TEXT_SECONDARY[1], COLORS.TEXT_SECONDARY[2]);
          doc.text(row.label, contentX, rowY);
          setBodyFont('bold');
          doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
          doc.text(row.lines, contentX + metadataLabelWidth, rowY, { lineHeightFactor: 1.15 });
          rowY += lineCount(row.lines) * metadataLineHeight + rowGap;
        }
      };

      drawMetadataCard(c2X, 'PROJECT DETAILS', projectRows);
      drawMetadataCard(c3X, 'ADDITIONAL INFO', additionalRows);

      yPosition += cardHeight + 10;

    } else {
      // Default: Two cards (existing behavior)
      const cardHeight = 48;
      const cardWidth = (contentWidth - gap) / 2;

      // Left Card: Client Info
      doc.setFillColor(COLORS.BG_CARD[0], COLORS.BG_CARD[1], COLORS.BG_CARD[2]);
      doc.setDrawColor(COLORS.BORDER[0], COLORS.BORDER[1], COLORS.BORDER[2]);
      doc.roundedRect(margin, yPosition, cardWidth, cardHeight, 2, 2, cardBorderStyle);
      
      let cardY = yPosition + 10;
      const cardPadding = 8;
      const cardContentX = margin + cardPadding;
      
      setHeadingFont('bold');
      setPdfFontSize(8);
      doc.setTextColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
      doc.text('QUOTATION FOR', cardContentX, cardY);
      
      cardY += 7;
      setHeadingFont('bold');
      setPdfFontSize(11);
      doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
      doc.text(data.clientName, cardContentX, cardY);
      
      cardY += 6;
      setBodyFont('normal');
      setPdfFontSize(9);
      doc.setTextColor(COLORS.TEXT_SECONDARY[0], COLORS.TEXT_SECONDARY[1], COLORS.TEXT_SECONDARY[2]);
      const clientAddr = doc.splitTextToSize(data.clientAddress, cardWidth - (cardPadding * 2));
      doc.text(clientAddr, cardContentX, cardY);

      // Right Card: Project Meta
      const rightCardX = margin + cardWidth + gap;
      doc.setFillColor(COLORS.BG_CARD[0], COLORS.BG_CARD[1], COLORS.BG_CARD[2]);
      doc.roundedRect(rightCardX, yPosition, cardWidth, cardHeight, 2, 2, cardBorderStyle);
      
      let metaY = yPosition + 10;
      const metaContentX = rightCardX + cardPadding;
      const metaLabelX = metaContentX;
      const metaValueX = metaContentX + 32;
      
      setHeadingFont('bold');
      setPdfFontSize(8);
      doc.setTextColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
      doc.text('PROJECT DETAILS', metaContentX, metaY);
      metaY += 7;

      const addMeta = (label: string, value: string) => {
        setBodyFont('normal');
        setPdfFontSize(9);
        doc.setTextColor(COLORS.TEXT_SECONDARY[0], COLORS.TEXT_SECONDARY[1], COLORS.TEXT_SECONDARY[2]);
        doc.text(label, metaLabelX, metaY);
        
        setBodyFont('bold');
        doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
        doc.text(value, metaValueX, metaY);
        metaY += 6;
      };

      addMeta('Date:', data.dateOfProposal);
      addMeta('Valid Till:', data.quotationValidTill);
      addMeta('Project:', data.quotationTitle.substring(0, 20));
      if (settings.showWarranty && warrantyDisplay) addMeta('Warranty:', warrantyDisplay);
      if (data.projectDeadline) {
        addMeta('Deadline:', data.projectDeadline);
      }

      yPosition += cardHeight + 10;
    }
  }

  // --- 3. Product Sections (Enhanced Cards) ---
  
  let totalSFT = 0;

  for (const section of data.sections) {
    // Check page break
    if (yPosition > pageBottomY - 35) {
      doc.addPage();
      yPosition = pageTopY;
    }

    // Section Header "Card"
    // Clean underline style with bold text
    setHeadingFont('bold');
    setPdfFontSize(8.5);
    doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
    doc.text(section.title.toUpperCase(), margin, yPosition + 4);
    
    // Draw a thick accent line below title
    doc.setDrawColor(COLORS.ACCENT[0], COLORS.ACCENT[1], COLORS.ACCENT[2]);
    doc.setLineWidth(0.7);
    doc.line(margin, yPosition + 7, margin + 20, yPosition + 7); // Short accent line
    
    // Draw a thin full-width line
    doc.setDrawColor(COLORS.BORDER[0], COLORS.BORDER[1], COLORS.BORDER[2]);
    doc.setLineWidth(0.2);
    doc.line(margin, yPosition + 7, pageWidth - margin, yPosition + 7);

    yPosition += compactMode ? 9 : 12;

    // Calculate SFT
    section.items.forEach(item => totalSFT += item.sftArea);

    // Table - different layouts based on settings
    if (settings.useSimpleItemLayout) {
      // Get localized currency formatter using professional formatter
      const fmtCurrencyLocal = createPDFCurrencyFormatter({
        currencyCode: data.localization?.currencyCode || 'INR',
        currencySymbol: data.localization?.currencySymbol || '₹',
        locale: data.localization?.locale || 'en-IN',
        countryCode: data.localization?.countryCode || 'IN',
      });
      
      // Simple layout: Description, Quantity, Rate, Amount
      const tableBody = section.items.map(item => [
        item.productName,
        item.productDetails || '-',
        item.sftArea.toFixed(2),
        fmtCurrencyLocal(item.ratePerSft),
        fmtCurrencyLocal(item.amount) 
      ]);

      renderTable({
        startY: yPosition,
        head: [['Product', 'Description', 'Qty', 'Rate', 'Amount']],
        body: tableBody,
        styles: {
          font: bodyFont,
          fontSize: 7,
          textColor: COLORS.TEXT_SECONDARY,
          lineColor: COLORS.BORDER,
          lineWidth: 0.1,
          cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
          valign: 'middle',
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: COLORS.TEXT_PRIMARY,
          fontStyle: 'bold',
          fontSize: 7,
          lineWidth: 0.1,
          lineColor: COLORS.BORDER,
          halign: 'left',
          valign: 'middle',
        },
        columnStyles: {
          0: { cellWidth: 32, fontStyle: 'bold', fontSize: 8, valign: 'middle' },
          1: { cellWidth: 'auto', fontSize: 7, valign: 'middle' }, // Details - auto expands
          2: { cellWidth: 18, halign: 'center', fontSize: 8, valign: 'middle' },
          // Rate column - reduced width
          3: { cellWidth: 28, halign: 'right', font: NUMERIC_FONT, fontStyle: boldAmounts ? 'bold' : 'normal', fontSize: 8, overflow: 'hidden' as const, minCellWidth: 28, valign: 'middle' },
          // Amount column - reduced width
          4: { cellWidth: 32, halign: 'right', font: NUMERIC_FONT, fontStyle: boldAmounts ? 'bold' : 'normal', fontSize: 8, overflow: 'hidden' as const, minCellWidth: 32, valign: 'middle' }
        },
        margin: { left: margin, right: margin, top: pageTopY, bottom: pageHeight - pageBottomY },
        didDrawPage: (d) => {
          if (d.cursor) yPosition = d.cursor.y;
        }
      });
    } else {
      // Detailed layout with size columns - respect all settings
      const showSizeColumns = settings.showDetailedSizeColumns;
      const showSide = settings.showSideColumn;
      const showDetails = settings.showProductDetails;
      const hasAnyImages = settings.showItemImages && section.items.some(item => item.imageUrls && item.imageUrls.length > 0);
      
      // Get localization for table headers
      const areaShort = data.localization?.areaUnitShort || 'Sq.Ft';
      const lengthShort = 'ft'; // TODO: Could be localized
      
      // Build dynamic header
      const headerCols: string[] = [];
      if (showSide) headerCols.push('Side');
      headerCols.push('Product');
      if (showDetails) headerCols.push('Details');
      if (hasAnyImages) headerCols.push('Img');
      if (showSizeColumns) {
        headerCols.push(`W (${lengthShort})`, `H (${lengthShort})`, areaShort);
      }
      headerCols.push(`Price/${areaShort}`, 'Amount');
      
      const tableHead = [headerCols];
      
      // Track which column index is the image column
      let imageColIndex = -1;
      {
        let ci = 0;
        if (showSide) ci++;
        ci++; // product
        if (showDetails) ci++;
        if (hasAnyImages) { imageColIndex = ci; ci++; }
      }
      
      // Build dynamic body rows
      const tableBody = section.items.map(item => {
        const row: string[] = [];
        if (showSide) row.push(item.side || '-');
        row.push(item.productName);
        if (showDetails) row.push(item.productDetails || '-');
        if (hasAnyImages) row.push(''); // placeholder for image cell
        if (showSizeColumns) {
          row.push(item.widthFt.toFixed(1), item.heightFt.toFixed(1), item.sftArea.toFixed(2));
        }
        // Use professional currency formatting
        const fmtCurrencyLocal = createPDFCurrencyFormatter({
          currencyCode: data.localization?.currencyCode || 'INR',
          currencySymbol: data.localization?.currencySymbol || '₹',
          locale: data.localization?.locale || 'en-IN',
          countryCode: data.localization?.countryCode || 'IN',
        });
        row.push(fmtCurrencyLocal(item.ratePerSft), fmtCurrencyLocal(item.amount));
        return row;
      });

      // Get advanced settings with fallback to defaults
      const advSettings = editorSettings?.advancedSettings || defaultAdvancedSettings;

      // Reserve space for descriptions and cell padding before assigning widths
      // to fixed columns, whether or not this section contains images.
      const horizontalCellPadding = hasAnyImages ? 1 : 1.25;
      const columnCount = headerCols.length;
      const minDetailsWidth = showDetails ? Math.min(40, contentWidth * 0.23) : 0;
      const imageColumnWidths = fitFixedColumnWidths([
        ...(showSide ? [Math.min(advSettings!.columnWidths.side, 12)] : []),
        showDetails ? Math.min(advSettings!.columnWidths.product, 26) : 34,
        ...(hasAnyImages ? [14] : []),
        ...(showSizeColumns
          ? [
              Math.min(advSettings!.columnWidths.width, 12),
              Math.min(advSettings!.columnWidths.height, 12),
              Math.min(advSettings!.columnWidths.area, 14),
            ]
          : []),
        Math.min(advSettings!.columnWidths.rate, 23),
        Math.min(advSettings!.columnWidths.amount, 24),
      ], contentWidth - horizontalCellPadding * 2 * columnCount, minDetailsWidth);
      let imageWidthIndex = 0;
      const nextImageWidth = () => imageColumnWidths[imageWidthIndex++];
      const colStyles: any = {};
      let colIndex = 0;
      // Side column
      if (showSide) { 
        colStyles[colIndex++] = { 
          cellWidth: nextImageWidth(),
          halign: 'center', 
          fontSize: 6, 
          valign: 'middle' 
        }; 
      }
      // Product column
      colStyles[colIndex++] = { 
        cellWidth: nextImageWidth(),
        fontStyle: 'bold', 
        fontSize: advSettings!.fontSizes.productName, 
        valign: 'middle' 
      };
      // Details column - auto expands to fill available space
      if (showDetails) { 
        colStyles[colIndex++] = { 
          cellWidth: 'auto', 
          minCellWidth: minDetailsWidth,
          fontSize: advSettings!.fontSizes.details, 
          valign: 'middle' 
        }; 
      }
      // Image column - compact 14mm
      if (hasAnyImages) {
        colStyles[colIndex++] = {
          cellWidth: nextImageWidth(),
          halign: 'center',
          valign: 'middle',
          cellPadding: { top: 1, right: 1, bottom: 1, left: 1 },
        };
      }
      // Size columns
      if (showSizeColumns) {
        const wWidth = nextImageWidth();
        const hWidth = nextImageWidth();
        const aWidth = nextImageWidth();
        colStyles[colIndex++] = { cellWidth: wWidth, halign: 'center', fontSize: 6, valign: 'middle' };
        colStyles[colIndex++] = { cellWidth: hWidth, halign: 'center', fontSize: 6, valign: 'middle' };
        colStyles[colIndex++] = { cellWidth: aWidth, halign: 'center', fontSize: 6, valign: 'middle' };
      }
      // Rate column
      colStyles[colIndex++] = { 
        cellWidth: nextImageWidth(),
        halign: 'right', 
        font: NUMERIC_FONT,
        fontStyle: boldAmounts ? 'bold' : 'normal',
        fontSize: advSettings!.fontSizes.amounts, 
        overflow: 'hidden' as const, 
        valign: 'middle' 
      };
      // Amount column
      colStyles[colIndex++] = { 
        cellWidth: nextImageWidth(),
        halign: 'right', 
        font: NUMERIC_FONT,
        fontStyle: boldAmounts ? 'bold' : 'normal',
        fontSize: advSettings!.fontSizes.amounts, 
        overflow: 'hidden' as const, 
        valign: 'middle' 
      };

      const columnStyles = colStyles;

      // Pre-load images for the image column
      const itemImageCache: Map<number, string> = new Map();
      if (hasAnyImages) {
        for (let i = 0; i < section.items.length; i++) {
          const item = section.items[i];
          if (item.imageUrls && item.imageUrls.length > 0) {
            try {
              const compressed = await compressImage(item.imageUrls[0], 120, 120);
              itemImageCache.set(i, compressed);
            } catch (e) {
              console.error('Failed to load item image:', e);
            }
          }
        }
      }

      renderTable({
        startY: yPosition,
        head: tableHead,
        body: tableBody,
        styles: {
          font: bodyFont,
          fontSize: advSettings!.fontSizes.tableBody,
          textColor: COLORS.TEXT_SECONDARY,
          lineColor: COLORS.BORDER,
          lineWidth: advSettings!.tableBorderWidth,
          cellPadding: {
            top: Math.max(advSettings!.rowPadding, 3),
            right: horizontalCellPadding,
            bottom: Math.max(advSettings!.rowPadding, 3),
            left: horizontalCellPadding,
          },
          valign: 'middle',
          minCellHeight: hasAnyImages ? 12 : 8,
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: COLORS.TEXT_PRIMARY,
          fontStyle: 'bold',
          fontSize: advSettings!.fontSizes.tableHeader,
          lineWidth: advSettings!.tableBorderWidth,
          lineColor: COLORS.BORDER,
          halign: 'center',
          valign: 'middle',
        },
        columnStyles: columnStyles as any,
        margin: { left: margin, right: margin, top: pageTopY, bottom: pageHeight - pageBottomY },
        didDrawCell: (hookData) => {
          // Draw image in the image column
          if (hasAnyImages && hookData.section === 'body' && hookData.column.index === imageColIndex) {
            const rowIndex = hookData.row.index;
            const imgData = itemImageCache.get(rowIndex);
            if (imgData) {
              const cell = hookData.cell;
              const imgSize = Math.min(cell.width - 2, cell.height - 2, 10);
              const imgX = cell.x + (cell.width - imgSize) / 2;
              const imgY = cell.y + (cell.height - imgSize) / 2;
              doc.addImage(imgData, 'JPEG', imgX, imgY, imgSize, imgSize, undefined, 'FAST');
            }
          }
        },
        didDrawPage: (d) => {
          if (d.cursor) yPosition = d.cursor.y;
        }
      });
    }
    
    yPosition = (doc as any).lastAutoTable.finalY + (compactMode ? 1 : 2);



    // Section Total - Right aligned with highlight (numeric-safe)
    const sectionTotal = section.items.reduce((sum, item) => sum + item.amount, 0);

    const fmtCurrencyLocal = createPDFCurrencyFormatter({
      currencyCode: data.localization?.currencyCode || 'INR',
      currencySymbol: data.localization?.currencySymbol || '₹',
      locale: data.localization?.locale || 'en-IN',
      countryCode: data.localization?.countryCode || 'IN',
    });

    const labelText = `Total ${section.title}:`;
    const amountText = fmtCurrencyLocal(sectionTotal);

    // Get advanced settings for highlight styling
    const advSettingsHighlight = editorSettings?.advancedSettings || defaultAdvancedSettings;
    const highlightPadding = advSettingsHighlight!.highlightPadding;
    const highlightHeight = advSettingsHighlight!.highlightPadding + 4;
    const labelFontSize = advSettingsHighlight!.fontSizes.sectionTitle;
    const amountFontSize = advSettingsHighlight!.fontSizes.sectionTitle;
    const TOTAL_AMOUNT_FONT = NUMERIC_FONT;

    // The table's own bottom margin keeps its rows out of the footer/corner-ornament
    // zone, but the total bar is drawn manually right after — without this check it
    // could still land in that zone if the table finished right at the boundary.
    if (yPosition + highlightHeight > pageBottomY) {
      doc.addPage();
      yPosition = pageTopY;
    }

    // Measure widths using their respective fonts
    setBodyFont('bold');
    setPdfFontSize(labelFontSize);
    const labelWidth = doc.getTextWidth(labelText + ' ');

    doc.setFont(TOTAL_AMOUNT_FONT, 'bold');
    setPdfFontSize(amountFontSize);
    const amountWidth = doc.getTextWidth(amountText);

    const totalWidth = labelWidth + amountWidth;
    const highlightX = pageWidth - margin - totalWidth - (highlightPadding * 2);
    const highlightY = yPosition;

    // Draw highlight background - right aligned to page margin
    doc.setFillColor(COLORS.HIGHLIGHT[0], COLORS.HIGHLIGHT[1], COLORS.HIGHLIGHT[2]);
    doc.rect(highlightX, highlightY, totalWidth + (highlightPadding * 2), highlightHeight, 'F');

    // Set text color for highlighted text
    doc.setTextColor(COLORS.HIGHLIGHT_TEXT[0], COLORS.HIGHLIGHT_TEXT[1], COLORS.HIGHLIGHT_TEXT[2]);

    const textY = yPosition + 5.7;
    const textStartX = highlightX + highlightPadding;

    // Label in user-selected body font
    setBodyFont('bold');
    setPdfFontSize(labelFontSize);
    doc.text(labelText, textStartX, textY);

    // Amount in a bold, currency-safe font - right aligned within the box
    doc.setFont(TOTAL_AMOUNT_FONT, 'bold');
    setPdfFontSize(amountFontSize);
    doc.text(amountText, pageWidth - margin - highlightPadding, textY, { align: 'right' });

    // Restore body font for subsequent content
    setBodyFont('normal');

    yPosition += compactMode ? 8 : 12;
  }

  // --- 4. Payment Summary ---
  if (yPosition > pageBottomY - 105) {
    doc.addPage();
    yPosition = pageTopY;
  }

  // Calculations
  const subtotal = data.subtotal;
  let discountAmount = 0;
  let taxableAmount = subtotal;
  
  if (data.enableSocialMediaDiscount) {
    const discountRate = data.socialMediaDiscountRate || 6;
    discountAmount = subtotal * (discountRate / 100);
    taxableAmount = subtotal - discountAmount;
  } else if (data.discount) {
     discountAmount = data.discount;
     taxableAmount = subtotal - discountAmount;
  }

  const gstRate = data.gstRate || 18;
  const gstAmount = data.gstEnabled ? (taxableAmount * (gstRate / 100)) : 0;
  const finalTotal = taxableAmount + gstAmount;

  // Render Summary as a Table but with custom styling
  setHeadingFont('bold');
  setPdfFontSize(10);
  doc.text("PAYMENT SUMMARY", margin, yPosition);
  yPosition += compactMode ? 4 : 6;

  // Get localization settings with defaults
  const loc = data.localization || {
    currencyCode: 'INR',
    currencySymbol: '₹',
    locale: 'en-IN',
    taxLabel: 'GST',
    taxRegistrationLabel: 'GSTIN',
    areaUnit: 'Square Feet',
    areaUnitShort: 'Sq.Ft',
    countryCode: 'IN',
  };

  // Create professional currency formatter for summary section
  const fmtCurrency = createPDFCurrencyFormatter({
    currencyCode: loc.currencyCode,
    currencySymbol: loc.currencySymbol,
    locale: loc.locale,
    countryCode: loc.countryCode || 'IN',
  });

  const summaryData: any[] = [
    ['Total Project Area', `${totalSFT.toFixed(2)} ${loc.areaUnitShort}`],
  ];

  if (settings.showSubtotal) {
    summaryData.push(['Subtotal Amount', fmtCurrency(subtotal)]);
  }

  if (data.enableSocialMediaDiscount) {
    const discountRate = data.socialMediaDiscountRate || 6;
    summaryData.push([`Social Media Special Discount @ ${discountRate}%`, '-' + fmtCurrency(discountAmount)]);
  } else if (data.discount && data.discount > 0) {
    summaryData.push(['Discount', '-' + fmtCurrency(discountAmount)]);
  }

  if (settings.showTaxGst && data.gstEnabled) {
    summaryData.push(['Net Taxable Amount', fmtCurrency(taxableAmount)]);
    summaryData.push([`${loc.taxLabel} @ ${gstRate}%`, fmtCurrency(gstAmount)]);
  }

  if (settings.showGrandTotal) {
    summaryData.push(['GRAND TOTAL', fmtCurrency(finalTotal)]);
  }

  // Calculate optimal column widths - ensure amount column has enough space
  const summaryLayout = getPDFSummaryLayout(
    pageWidth,
    margin,
    editorSettings?.summaryStyle || 'right',
  );
  const labelColumnWidth = summaryLayout.tableWidth * 0.55;
  const amountColumnWidth = summaryLayout.tableWidth * 0.45;

  renderTable({
    startY: yPosition,
    body: summaryData,
    tableWidth: summaryLayout.tableWidth,
     styles: {
       font: bodyFont,
       lineColor: COLORS.BORDER,
       lineWidth: 0.1,
       cellPadding: compactMode
         ? { top: 3, right: 6, bottom: 3, left: 6 }
         : { top: 6, right: 12, bottom: 6, left: 12 },
       fontSize: 10,
       valign: 'middle',
     },
     columnStyles: {
       0: { 
         cellWidth: labelColumnWidth, 
         halign: 'left', 
         fontStyle: 'bold', 
         textColor: COLORS.TEXT_SECONDARY, 
         fontSize: 9,
         valign: 'middle',
       },
       1: { 
         cellWidth: amountColumnWidth, 
         halign: 'right',
         font: NUMERIC_FONT,
         fontStyle: boldAmounts ? 'bold' : 'normal',
         textColor: COLORS.TEXT_PRIMARY, 
         fontSize: 9,
         minCellWidth: 55,
         overflow: 'hidden' as const,
         valign: 'middle',
       }
     },
    didParseCell: (hookData) => {
      if (hookData.section !== 'body') return;
      const row = hookData.row?.raw as any[] | undefined;
      const label = String(row?.[0] ?? '');

      // Make the GRAND TOTAL row slightly larger and bolder (like the reference PDF)
      if (label.toUpperCase() === 'GRAND TOTAL') {
        if (hookData.column.index === 0) {
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.fontSize = 10;
        }
        if (hookData.column.index === 1) {
          hookData.cell.styles.font = NUMERIC_FONT;
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.fontSize = 11;
        }
      }
    },
    willDrawCell: (cellData) => {
      if (cellData.column.index === 1 && cellData.section === 'body') {
        doc.setFillColor(COLORS.HIGHLIGHT[0], COLORS.HIGHLIGHT[1], COLORS.HIGHLIGHT[2]);
        doc.setTextColor(COLORS.HIGHLIGHT_TEXT[0], COLORS.HIGHLIGHT_TEXT[1], COLORS.HIGHLIGHT_TEXT[2]);
      }
    },
    margin: {
      left: summaryLayout.left,
      right: pageWidth - summaryLayout.left - summaryLayout.tableWidth,
      top: pageTopY,
      bottom: pageHeight - pageBottomY,
    }
  });

  yPosition = (doc as any).lastAutoTable.finalY + (compactMode ? 10 : 15);

  // --- 5. Stagewise Payment Option ---
  if (settings.showPaymentStages) {
    setHeadingFont('bold');
    setPdfFontSize(10);
    doc.text("STAGEWISE PAYMENT OPTION", margin, yPosition);
    yPosition += compactMode ? 4 : 6;

    const defaultPaymentStages = [
      { stage: '1', milestone: 'Design Phase', percentage: 10 },
      { stage: '2', milestone: 'Material Procurement', percentage: 30 },
      { stage: '3', milestone: 'Execution Start', percentage: 30 },
      { stage: '4', milestone: 'Mid-Execution', percentage: 20 },
      { stage: '5', milestone: 'Final Handover', percentage: 10 }
    ];

    const stagesData = data.paymentStages || defaultPaymentStages;
    const paymentStages = stagesData.map(stage => [
      stage.stage,
      stage.milestone,
      `${stage.percentage}%`,
      fmtCurrency(finalTotal * (stage.percentage / 100))
    ]);

    renderTable({
      startY: yPosition,
      head: [['#', 'Stage / Milestone', 'Payment %', 'Amount']],
      body: paymentStages,
      styles: {
          font: bodyFont,
          lineColor: COLORS.BORDER,
          lineWidth: 0.1,
          textColor: COLORS.TEXT_SECONDARY,
          fontSize: 7,
          cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
          valign: 'middle',
      },
      headStyles: {
        fillColor: COLORS.BG_CARD,
        textColor: COLORS.TEXT_PRIMARY,
        fontStyle: 'bold',
        lineColor: COLORS.BORDER,
        lineWidth: 0.1,
        fontSize: 7,
        valign: 'middle',
      },
       columnStyles: {
         0: { cellWidth: 12, halign: 'center', fontSize: 8, valign: 'middle' },
         1: { cellWidth: 'auto', fontSize: 8, valign: 'middle' },
         2: { cellWidth: 22, halign: 'center', fontStyle: 'bold', fontSize: 8, valign: 'middle' },
         // Amount column - fixed width, right-aligned, numeric-safe, BOLD
         3: { cellWidth: 42, halign: 'right', font: NUMERIC_FONT, fontStyle: boldAmounts ? 'bold' : 'normal', fontSize: 8, overflow: 'hidden' as const, minCellWidth: 42, valign: 'middle' }
       },
      margin: { left: margin, right: margin, top: pageTopY, bottom: pageHeight - pageBottomY }
    });

    yPosition = (doc as any).lastAutoTable.finalY + (compactMode ? 10 : 15);
  }

  // --- 6. Terms & Conditions ---
  const termsToUse = normalizeTermsSections(data.termsConditions ?? DEFAULT_QUOTATION_TERMS);
  if (settings.showTermsConditions && termsToUse.length > 0) {
    // Always start Terms & Conditions on its own fresh page rather than
    // wherever the previous section (e.g. payment summary) happened to end —
    // otherwise it visually reads as part of the quotation instead of its
    // own section. Skip only if the current page is already blank.
    if (yPosition > pageTopY) {
      doc.addPage();
      yPosition = pageTopY;
    }

  setHeadingFont('bold');
  setPdfFontSize(10);
  doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
  doc.text("TERMS & CONDITIONS", margin, yPosition);
  yPosition += compactMode ? 6 : 8;

  setBodyFont('normal');
  setPdfFontSize(7);
  
  // Helper to add titled blocks with points
  const addBlock = (title: string, points: string[]) => {
    if (yPosition > pageBottomY - 25) {
      doc.addPage();
      yPosition = pageTopY;
    }
    if (title) {
        setBodyFont('bold');
        doc.text(title, margin, yPosition);
        yPosition += compactMode ? 3 : 4;
    }
    setBodyFont('normal');
    
    // Ensure points is an array before iterating
    if (!points || !Array.isArray(points)) return;
    
    // Render each point as a bullet
    points.forEach((point) => {
      if (!point.trim()) return; // Skip empty points
      
      // Split point into lines that fit the width
      const splitText = doc.splitTextToSize(point, contentWidth - 5);
      
      splitText.forEach((line: string, lineIndex: number) => {
        if (yPosition > pageBottomY - 5) {
          doc.addPage();
          yPosition = pageTopY;
        }
        
        // Add bullet only on first line of each point
        if (lineIndex === 0) {
          doc.text("•", margin, yPosition);
          doc.text(line, margin + 5, yPosition);
        } else {
          doc.text(line, margin + 5, yPosition);
        }
        yPosition += compactMode ? 3 : 3.5;
      });
    });
    yPosition += compactMode ? 1 : 2;
  };

  termsToUse.forEach(term => {
    addBlock(term.title, term.points);
  });
  } // End of showTermsConditions

  // --- 6.5 Bank Details Section ---
  if (settings.showBankDetails && data.bankDetails) {
    const bank = data.bankDetails;
    const hasBankInfo = bank.bankName || bank.accountNumber || bank.ifscCode || bank.upiId;
    
    if (hasBankInfo) {
      if (yPosition > pageBottomY - 65) {
        doc.addPage();
        yPosition = pageTopY;
      }

      setHeadingFont('bold');
      setPdfFontSize(10);
      doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
      doc.text("BANK & PAYMENT DETAILS", margin, yPosition);
      yPosition += 8;

      // Bank details card
      const cardWidth = settings.showQRCode && bank.qrCodeUrl ? contentWidth - 50 : contentWidth;
      doc.setFillColor(COLORS.BG_CARD[0], COLORS.BG_CARD[1], COLORS.BG_CARD[2]);
      doc.setDrawColor(COLORS.BORDER[0], COLORS.BORDER[1], COLORS.BORDER[2]);
      doc.roundedRect(margin, yPosition, cardWidth, 35, 2, 2, cardBorderStyle);

      let bankY = yPosition + 6;
      const labelX = margin + 5;
      const valueX = margin + 45;

      setBodyFont('normal');
      setPdfFontSize(8);

      const addBankRow = (label: string, value: string) => {
        doc.setTextColor(COLORS.TEXT_SECONDARY[0], COLORS.TEXT_SECONDARY[1], COLORS.TEXT_SECONDARY[2]);
        doc.text(label, labelX, bankY);
        setBodyFont('bold');
        doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
        doc.text(value, valueX, bankY);
        setBodyFont('normal');
        bankY += 5.5;
      };

      if (bank.bankName) addBankRow('Bank:', bank.bankName);
      if (bank.accountHolder) addBankRow('A/C Holder:', bank.accountHolder);
      if (bank.accountNumber) addBankRow('A/C Number:', bank.accountNumber);
      if (bank.ifscCode) addBankRow('IFSC Code:', bank.ifscCode);
      if (bank.upiId) addBankRow('UPI ID:', bank.upiId);

      // QR Code
      if (settings.showQRCode && bank.qrCodeUrl) {
        try {
          const compressedQR = await compressImage(bank.qrCodeUrl, 200, 200);
          const qrX = pageWidth - margin - 40;
          doc.addImage(compressedQR, 'JPEG', qrX, yPosition, 35, 35, undefined, 'FAST');
        } catch (e) {
          console.error('QR code load error:', e);
        }
      }

      yPosition += 42;
    }
  }

  if (settings.showSignatureArea) {
    if (yPosition > pageBottomY - 35) {
      doc.addPage();
      yPosition = pageBottomY - 45;
    } else {
      yPosition += 10;
    }

    const signBoxWidth = 70;
    const companySignX = pageWidth - margin - signBoxWidth;
    
    setHeadingFont('bold');
    setPdfFontSize(10);
    doc.text("Acceptance from Customer", margin, yPosition);
    
    if (data.signatureUrl) {
      try {
        let compressedSig = await compressImage(data.signatureUrl, 150, 60);
        doc.addImage(compressedSig, 'JPEG', companySignX, yPosition - 5, 50, 15);
      } catch (e) {}
    }

    yPosition += 20;

    doc.setDrawColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
    doc.setLineWidth(0.5);
    
    doc.line(margin, yPosition, margin + signBoxWidth, yPosition);
    setBodyFont('normal');
    setPdfFontSize(9);
    doc.text("Signatory", margin, yPosition + 5);

    doc.line(companySignX, yPosition, companySignX + signBoxWidth, yPosition);
    doc.text("Authorized Signatory", companySignX, yPosition + 5);
  }

  // --- Accept/Reject Links Section ---
  const showAcceptReject = editorSettings?.showAcceptRejectButtons ?? true;
  if (data.quotationId && showAcceptReject) {
    if (yPosition > pageBottomY - 30) {
      doc.addPage();
      yPosition = pageTopY;
    } else {
      yPosition += 15;
    }

    // Get the base URL for the app
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://intorza.com';
    const acceptUrl = `${baseUrl}/quotation-response?id=${data.quotationId}&action=accept`;
    const rejectUrl = `${baseUrl}/quotation-response?id=${data.quotationId}&action=reject`;

    // Draw a separator line
    doc.setDrawColor(COLORS.BORDER[0], COLORS.BORDER[1], COLORS.BORDER[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Title
    setHeadingFont('bold');
    setPdfFontSize(10);
    doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
    doc.text("RESPOND TO THIS QUOTATION", pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Larger, more clickable buttons
    const buttonWidth = 60;
    const buttonHeight = 14;
    const buttonGap = 15;
    const totalButtonWidth = buttonWidth * 2 + buttonGap;
    const startX = (pageWidth - totalButtonWidth) / 2;

    // Accept button - larger and more prominent
    doc.setFillColor(34, 197, 94); // Green
    doc.roundedRect(startX, yPosition, buttonWidth, buttonHeight, 3, 3, 'F');
    
    // Add clickable link area covering the entire button
    doc.link(startX, yPosition, buttonWidth, buttonHeight, { url: acceptUrl });
    
    doc.setTextColor(255, 255, 255);
    setHeadingFont('bold');
    setPdfFontSize(11);
    doc.text("ACCEPT", startX + buttonWidth / 2, yPosition + 9.5, { align: 'center' });

    // Reject button - larger and more prominent
    const rejectX = startX + buttonWidth + buttonGap;
    doc.setFillColor(239, 68, 68); // Red
    doc.roundedRect(rejectX, yPosition, buttonWidth, buttonHeight, 3, 3, 'F');
    
    // Add clickable link area covering the entire button
    doc.link(rejectX, yPosition, buttonWidth, buttonHeight, { url: rejectUrl });
    
    doc.setTextColor(255, 255, 255);
    setHeadingFont('bold');
    setPdfFontSize(11);
    doc.text("REJECT", rejectX + buttonWidth / 2, yPosition + 9.5, { align: 'center' });

    yPosition += buttonHeight + 8;

    // URL text for manual access
    setBodyFont('normal');
    setPdfFontSize(7);
    doc.setTextColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
    doc.text("Or copy the links below:", pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 5;
    doc.setTextColor(COLORS.ACCENT[0], COLORS.ACCENT[1], COLORS.ACCENT[2]);
    doc.textWithLink(acceptUrl, pageWidth / 2, yPosition, { url: acceptUrl, align: 'center' });
    yPosition += 4;
    doc.textWithLink(rejectUrl, pageWidth / 2, yPosition, { url: rejectUrl, align: 'center' });
  }

  // --- Apply decorations & footer to ALL pages ---
  const totalPagesCount = doc.getNumberOfPages();
  const footerClearance = hasBorderDecoration ? borderInset + 24 : 10;
  const footerY = pageHeight - footerClearance;

  for (let p = 1; p <= totalPagesCount; p++) {
    doc.setPage(p);

    // Draw decorations
    if (editorSettings) {
      drawAllDecorations(doc, theme, editorSettings, p, totalPagesCount);
    }

    // Footer — single centered line, well clear of both corners, rather than a
    // separate right-aligned page number that used to sit right where the corner
    // ornaments reach in from the edge.
    setPdfFontSize(6.5);
    doc.setTextColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
    doc.text(
      `This quotation is computer-generated.   Page ${p} of ${totalPagesCount}`,
      pageWidth / 2,
      footerY,
      { align: 'center' },
    );
  }

  // If previewOnly is set, just return the doc without saving
  if (data.previewOnly) {
    return doc;
  }

  // Generate PDF and handle sharing + download
  const fileName = `Quotation_${data.clientName.replace(/\s+/g, '_')}.pdf`;
  const pdfBlob = doc.output('blob');
  
  // Always save the file first
  doc.save(fileName);
  
  // Then try Web Share API (primarily works on mobile)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      const shareData = { files: [file], title: `Quotation for ${data.clientName}` };
      
      // Check if file sharing is supported
      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      }
    } catch (err) {
      // User cancelled or share failed - file already downloaded
      const error = err as Error;
      if (error.name !== 'AbortError') {
        console.log('Share failed:', error.message);
      }
    }
  }
  
  return doc;
};
