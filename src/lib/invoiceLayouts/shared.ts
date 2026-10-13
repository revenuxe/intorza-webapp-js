import jsPDF from 'jspdf';
import { PDFEditorSettings, InvoiceSettings, PDFTheme, getThemeById, hexToRgb, getFontById, applyBrandColorsToTheme } from '../pdfThemes';
import { getNumericFont, createPDFCurrencyFormatter } from '../pdfCurrencyFormatter';
import { DEFAULT_INVOICE_TERMS } from '../libraryDefaults';

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  nextPaymentDue?: string;
  nextPaymentAmount?: number;
  clientName: string;
  clientAddress?: string;
  projectName: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
  notes?: string;
  payments: {
    amount: number;
    payment_date: string;
    payment_method: string;
    notes?: string;
  }[];
  profile: {
    company_name?: string;
    full_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    gstin?: string;
    logo_url?: string;
    signature_url?: string;
    hero_image_url?: string;
    invoice_terms_conditions?: { id: string; title: string; points: string[] }[];
    // Bank details
    bank_name?: string;
    bank_account_number?: string;
    bank_ifsc_code?: string;
    bank_account_holder?: string;
    upi_id?: string;
    payment_qr_url?: string;
  };
  // Localization settings
  localization?: {
    currencyCode: string;
    currencySymbol: string;
    locale: string;
    taxLabel: string;
    taxRegistrationLabel: string;
    countryCode?: string;
  };
  editorSettings?: PDFEditorSettings;
  invoiceSettings?: InvoiceSettings;
  previewOnly?: boolean;
}

export interface InvoiceColors {
  TEXT_PRIMARY: [number, number, number];
  TEXT_SECONDARY: [number, number, number];
  TEXT_LIGHT: [number, number, number];
  BG_CARD: [number, number, number];
  BORDER: [number, number, number];
  ACCENT: [number, number, number];
  HIGHLIGHT: [number, number, number];
  HIGHLIGHT_TEXT: [number, number, number];
  HEADER_BG: [number, number, number];
  HEADER_TEXT: [number, number, number];
}

export interface LayoutContext {
  doc: jsPDF;
  data: InvoiceData;
  editorSettings: PDFEditorSettings | undefined;
  invoiceSettings: InvoiceSettings;
  theme: PDFTheme;
  COLORS: InvoiceColors;
  loc: {
    currencyCode: string;
    currencySymbol: string;
    locale: string;
    taxLabel: string;
    taxRegistrationLabel: string;
    countryCode?: string;
  };
  fmtCurrency: (amount: number) => string;
  logoPlacement: 'left' | 'center' | 'right';
  highlightAmounts: boolean;
  headingFont: string;
  bodyFont: string;
  setHeadingFont: (style?: 'normal' | 'bold') => void;
  setBodyFont: (style?: 'normal' | 'bold') => void;
  pageWidth: number;
  pageHeight: number;
  margin: number;
  contentWidth: number;
  NUMERIC_FONT: string;
}

// Currency-safe font for numeric values
export const NUMERIC_FONT = getNumericFont();

export const compressImage = async (imageUrl: string, maxWidth: number, maxHeight: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

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

    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Failed to load image'));
    };

    if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
      img.src = imageUrl;
    } else {
      const separator = imageUrl.includes('?') ? '&' : '?';
      img.src = `${imageUrl}${separator}t=${Date.now()}`;
    }
  });
};

export const buildLayoutContext = (data: InvoiceData): LayoutContext => {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const editorSettings = data.editorSettings;
  const invoiceSettings: InvoiceSettings = {
    showCompanyLogo: true,
    showCompanyAddress: true,
    showClientAddress: true,
    showProjectName: true,
    showDueDate: true,
    showPaymentStatus: true,
    showTaxGst: true,
    showPaymentHistory: true,
    showSignatureArea: true,
    showTermsConditions: true,
    showNextPaymentDue: true,
    ...data.invoiceSettings,
  } as InvoiceSettings;

  let theme: PDFTheme = editorSettings ? getThemeById(editorSettings.theme) : getThemeById('minimal-white');

  if (editorSettings?.useBrandColors && editorSettings?.brandColors) {
    theme = applyBrandColorsToTheme(theme, editorSettings.brandColors);
  }

  const logoPlacement = editorSettings?.logoPlacement || 'left';
  const highlightAmounts = editorSettings?.highlightAmounts ?? true;

  const headingFontSettings = getFontById(editorSettings?.headingFont || 'times');
  const bodyFontSettings = getFontById(editorSettings?.bodyFont || 'helvetica');
  const headingFont = headingFontSettings.family;
  const bodyFont = bodyFontSettings.family;

  doc.setFont(bodyFont);

  const setHeadingFont = (style: 'normal' | 'bold' = 'bold') => doc.setFont(headingFont, style);
  const setBodyFont = (style: 'normal' | 'bold' = 'normal') => doc.setFont(bodyFont, style);

  const loc = data.localization || {
    currencyCode: 'INR',
    currencySymbol: '₹',
    locale: 'en-IN',
    taxLabel: 'GST',
    taxRegistrationLabel: 'GSTIN',
  };

  const fmtCurrency = createPDFCurrencyFormatter({
    currencyCode: loc.currencyCode,
    currencySymbol: loc.currencySymbol,
    locale: loc.locale,
    countryCode: data.localization?.countryCode || 'IN',
  });

  const getHighlightColor = (): [number, number, number] => {
    if (editorSettings?.customColors?.highlight) {
      return hexToRgb(editorSettings.customColors.highlight);
    }
    return theme.colors.highlight;
  };

  const getContrastingTextColor = (bgColor: [number, number, number]): [number, number, number] => {
    const luminance = (0.299 * bgColor[0] + 0.587 * bgColor[1] + 0.114 * bgColor[2]) / 255;
    return luminance > 0.5 ? [20, 20, 20] : [255, 255, 255];
  };

  const highlightColor = getHighlightColor();
  const highlightTextColor = getContrastingTextColor(highlightColor);

  const COLORS: InvoiceColors = {
    TEXT_PRIMARY: [0, 0, 0],
    TEXT_SECONDARY: [0, 0, 0],
    TEXT_LIGHT: [40, 40, 40],
    BG_CARD: theme.colors.cardBackground,
    BORDER: theme.colors.border,
    ACCENT: theme.colors.accent,
    HIGHLIGHT: highlightColor,
    HIGHLIGHT_TEXT: highlightTextColor,
    HEADER_BG: theme.colors.headerBg,
    HEADER_TEXT: theme.colors.headerText,
  };

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  return {
    doc,
    data,
    editorSettings,
    invoiceSettings,
    theme,
    COLORS,
    loc,
    fmtCurrency,
    logoPlacement,
    highlightAmounts,
    headingFont,
    bodyFont,
    setHeadingFont,
    setBodyFont,
    pageWidth,
    pageHeight,
    margin,
    contentWidth,
    NUMERIC_FONT,
  };
};

// --- Hero image resolution (Hero Banner layout) ---
// Falls back gracefully so the layout never renders broken/empty:
// 1. profile.hero_image_url if set
// 2. profile.logo_url, enlarged, on a solid color band
// 3. solid color band only
export type HeroImageSource =
  | { type: 'image'; url: string }
  | { type: 'logo'; url: string }
  | { type: 'color' };

export const resolveHeroImageSource = (profile: InvoiceData['profile']): HeroImageSource => {
  if (profile.hero_image_url) return { type: 'image', url: profile.hero_image_url };
  if (profile.logo_url) return { type: 'logo', url: profile.logo_url };
  return { type: 'color' };
};

// --- Shared sections: identical across every layout ---

export const renderTermsAndConditions = async (ctx: LayoutContext, startY: number): Promise<number> => {
  const { doc, data, invoiceSettings, COLORS, margin, contentWidth, pageHeight, setHeadingFont, setBodyFont } = ctx;
  let yPosition = startY;
  const termsToUse = data.profile.invoice_terms_conditions ?? DEFAULT_INVOICE_TERMS;

  if (!invoiceSettings.showTermsConditions || !termsToUse.length) {
    return yPosition;
  }

  doc.addPage();
  yPosition = 15;

  const termsLineHeight = 3.2;
  const titleGap = 3.5;
  const blockGap = 1.5;
  const headerGap = 6;
  const signatureBlockHeight = invoiceSettings.showSignatureArea ? 35 : 0;

  let estimatedHeight = headerGap + 4;
  termsToUse.forEach(term => {
    if (!term || !term.title || !term.points) return;
    estimatedHeight += titleGap;
    term.points.forEach((p) => {
      if (!p || !p.trim()) return;
      const lines = doc.splitTextToSize(p, contentWidth - 5);
      estimatedHeight += lines.length * termsLineHeight;
    });
    estimatedHeight += blockGap;
  });
  estimatedHeight += signatureBlockHeight;

  setHeadingFont('bold');
  doc.setFontSize(10);
  doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
  doc.text("TERMS & CONDITIONS", margin, yPosition);
  yPosition += headerGap;

  setBodyFont('normal');
  doc.setFontSize(7);

  const addBlock = (title: string, points: string[]) => {
    if (title) {
      setBodyFont('bold');
      doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
      doc.text(title, margin, yPosition);
      yPosition += titleGap;
    }
    setBodyFont('normal');
    doc.setTextColor(COLORS.TEXT_SECONDARY[0], COLORS.TEXT_SECONDARY[1], COLORS.TEXT_SECONDARY[2]);

    if (!points || !Array.isArray(points)) return;

    points.forEach((point) => {
      if (!point || !point.trim()) return;
      const splitText = doc.splitTextToSize(point, contentWidth - 5);
      splitText.forEach((line: string, lineIndex: number) => {
        if (lineIndex === 0) {
          doc.text("•", margin, yPosition);
          doc.text(line, margin + 5, yPosition);
        } else {
          doc.text(line, margin + 5, yPosition);
        }
        yPosition += termsLineHeight;
      });
    });
    yPosition += blockGap;
  };

  termsToUse.forEach(term => {
    if (term && term.title && term.points) {
      addBlock(term.title, term.points);
    }
  });

  return yPosition;
};

export const renderBankDetails = async (ctx: LayoutContext, startY: number): Promise<number> => {
  const { doc, data, invoiceSettings, COLORS, margin, contentWidth, pageWidth, pageHeight, setHeadingFont, setBodyFont } = ctx;
  let yPosition = startY;

  if (!(invoiceSettings.showBankDetails && data.profile)) return yPosition;

  const bank = data.profile;
  const hasBankInfo = bank.bank_name || bank.bank_account_number || bank.bank_ifsc_code || bank.upi_id;
  if (!hasBankInfo) return yPosition;

  if (yPosition > pageHeight - 80) {
    doc.addPage();
    yPosition = 15;
  }

  setHeadingFont('bold');
  doc.setFontSize(10);
  doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
  doc.text("BANK & PAYMENT DETAILS", margin, yPosition);
  yPosition += 8;

  const showQR = invoiceSettings.showQRCode && bank.payment_qr_url;
  const cardWidth = showQR ? contentWidth - 50 : contentWidth;
  doc.setFillColor(COLORS.BG_CARD[0], COLORS.BG_CARD[1], COLORS.BG_CARD[2]);
  doc.setDrawColor(COLORS.BORDER[0], COLORS.BORDER[1], COLORS.BORDER[2]);
  doc.roundedRect(margin, yPosition, cardWidth, 35, 2, 2, 'FD');

  let bankY = yPosition + 6;
  const labelX = margin + 5;
  const valueX = margin + 45;

  setBodyFont('normal');
  doc.setFontSize(8);

  const addBankRow = (label: string, value: string) => {
    doc.setTextColor(COLORS.TEXT_SECONDARY[0], COLORS.TEXT_SECONDARY[1], COLORS.TEXT_SECONDARY[2]);
    doc.text(label, labelX, bankY);
    setBodyFont('bold');
    doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
    doc.text(value, valueX, bankY);
    setBodyFont('normal');
    bankY += 5.5;
  };

  if (bank.bank_name) addBankRow('Bank:', bank.bank_name);
  if (bank.bank_account_holder) addBankRow('A/C Holder:', bank.bank_account_holder);
  if (bank.bank_account_number) addBankRow('A/C Number:', bank.bank_account_number);
  if (bank.bank_ifsc_code) addBankRow('IFSC Code:', bank.bank_ifsc_code);
  if (bank.upi_id) addBankRow('UPI ID:', bank.upi_id);

  if (showQR && bank.payment_qr_url) {
    try {
      const compressedQR = await compressImage(bank.payment_qr_url, 200, 200);
      const qrX = pageWidth - margin - 40;
      doc.addImage(compressedQR, 'JPEG', qrX, yPosition, 35, 35, undefined, 'FAST');
    } catch (e) {
      console.error('QR code load error:', e);
    }
  }

  yPosition += 42;
  return yPosition;
};

export const renderSignatureArea = async (ctx: LayoutContext, startY: number): Promise<number> => {
  const { doc, data, invoiceSettings, COLORS, margin, pageWidth, pageHeight } = ctx;
  let yPosition = startY;

  if (!invoiceSettings.showSignatureArea) return yPosition;

  if (yPosition > pageHeight - 50) {
    doc.addPage();
    yPosition = 15;
  } else {
    yPosition += 8;
  }

  const signBoxWidth = 70;
  const companySignX = pageWidth - margin - signBoxWidth;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
  doc.text("Acceptance from Customer", margin, yPosition);

  if (data.profile.signature_url) {
    try {
      const compressedSig = await compressImage(data.profile.signature_url, 150, 60);
      doc.addImage(compressedSig, 'JPEG', companySignX, yPosition - 5, 50, 15);
    } catch (e) {
      // ignore — signature is optional decoration
    }
  }

  yPosition += 20;

  doc.setDrawColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
  doc.setLineWidth(0.5);

  doc.line(margin, yPosition, margin + signBoxWidth, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.TEXT_SECONDARY[0], COLORS.TEXT_SECONDARY[1], COLORS.TEXT_SECONDARY[2]);
  doc.text("Signatory", margin, yPosition + 5);

  doc.line(companySignX, yPosition, companySignX + signBoxWidth, yPosition);
  doc.text("Authorized Signatory", companySignX, yPosition + 5);

  return yPosition;
};

export const renderFooter = (ctx: LayoutContext): void => {
  const { doc, COLORS, pageWidth, pageHeight } = ctx;
  doc.setFontSize(7);
  doc.setTextColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
  doc.text("This invoice is computer-generated.", pageWidth / 2, pageHeight - 10, { align: 'center' });
};
