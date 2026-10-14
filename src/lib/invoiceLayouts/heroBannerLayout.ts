import autoTable from 'jspdf-autotable';
import { LayoutContext, compressImage, resolveHeroImageSource } from './shared';
import { PDFTheme } from '../pdfThemes';

type RGB = [number, number, number];

const luminance = (c: RGB) => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;

// Many of the 51 color themes have a light/white headerBg (that's the point of
// "Minimal White" etc.), which would wash out a dark banner if used as-is. Picks the
// darker of primary/headerBg and, if even that's too light, blends it toward a
// neutral dark slate so the banner always reads as "dark banner" regardless of theme.
const getBannerColor = (theme: PDFTheme): RGB => {
  const candidate: RGB = luminance(theme.colors.headerBg) <= luminance(theme.colors.primary)
    ? theme.colors.headerBg
    : theme.colors.primary;
  if (luminance(candidate) <= 0.45) return candidate;
  const darkSlate: RGB = [30, 41, 59];
  return [
    Math.round(candidate[0] * 0.35 + darkSlate[0] * 0.65),
    Math.round(candidate[1] * 0.35 + darkSlate[1] * 0.65),
    Math.round(candidate[2] * 0.35 + darkSlate[2] * 0.65),
  ];
};

export const renderHeroBannerHeaderAndSummary = async (ctx: LayoutContext): Promise<number> => {
  const {
    doc, data, invoiceSettings, theme, COLORS, fmtCurrency, highlightAmounts,
    setHeadingFont, setBodyFont, pageWidth, margin, contentWidth, NUMERIC_FONT,
  } = ctx;

  const bannerColor = getBannerColor(theme);
  const bannerHeight = 26;
  const heroHeight = 45;

  // --- 1. Full-width dark banner ---
  doc.setFillColor(bannerColor[0], bannerColor[1], bannerColor[2]);
  doc.rect(0, 0, pageWidth, bannerHeight, 'F');

  setHeadingFont('bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('Invoice', margin, bannerHeight / 2 + 2);

  setBodyFont('bold');
  doc.setFontSize(11);
  doc.text(`#${data.invoiceNumber}`, pageWidth - margin, bannerHeight / 2 + 2, { align: 'right' });

  // --- 2. Full-width hero photo band (with graceful fallback) ---
  const heroSource = resolveHeroImageSource(data.profile);
  const heroTop = bannerHeight;

  if (heroSource.type === 'color') {
    // Lighter tint of the banner color — a valid, intentional-looking band on its own.
    doc.setFillColor(
      Math.round(bannerColor[0] + (255 - bannerColor[0]) * 0.7),
      Math.round(bannerColor[1] + (255 - bannerColor[1]) * 0.7),
      Math.round(bannerColor[2] + (255 - bannerColor[2]) * 0.7),
    );
    doc.rect(0, heroTop, pageWidth, heroHeight, 'F');
  } else {
    try {
      const imgUrl = heroSource.type === 'image' ? heroSource.url : heroSource.url;
      const compressed = await compressImage(imgUrl, 1000, 400);
      if (heroSource.type === 'image') {
        doc.addImage(compressed, 'JPEG', 0, heroTop, pageWidth, heroHeight, undefined, 'FAST');
      } else {
        // Logo-only fallback: solid tinted band with the logo centered/enlarged on it.
        doc.setFillColor(
          Math.round(bannerColor[0] + (255 - bannerColor[0]) * 0.85),
          Math.round(bannerColor[1] + (255 - bannerColor[1]) * 0.85),
          Math.round(bannerColor[2] + (255 - bannerColor[2]) * 0.85),
        );
        doc.rect(0, heroTop, pageWidth, heroHeight, 'F');
        const logoSize = 30;
        doc.addImage(compressed, 'JPEG', (pageWidth - logoSize) / 2, heroTop + (heroHeight - logoSize) / 2, logoSize, logoSize, undefined, 'FAST');
      }
    } catch (e) {
      console.error('Hero image load error:', e);
      doc.setFillColor(240, 240, 240);
      doc.rect(0, heroTop, pageWidth, heroHeight, 'F');
    }
  }

  // --- 3. Small logo tile overlapping the photo's bottom-right corner ---
  if (invoiceSettings.showCompanyLogo && data.profile.logo_url && heroSource.type === 'image') {
    try {
      const tileSize = 20;
      const tileX = pageWidth - margin - tileSize;
      const tileY = heroTop + heroHeight - tileSize / 2;
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(tileX, tileY, tileSize, tileSize, 2, 2, 'F');
      const compressedLogo = await compressImage(data.profile.logo_url, 300, 300);
      doc.addImage(compressedLogo, 'JPEG', tileX + 2, tileY + 2, tileSize - 4, tileSize - 4, undefined, 'FAST');
    } catch (e) {
      // logo tile is decorative — skip silently if it fails
    }
  }

  let yPosition = heroTop + heroHeight + 14;

  // --- 4. Two-column body: summary table (left) + Bill-To/totals sidebar (right) ---
  const sidebarWidth = contentWidth * 0.34;
  const mainWidth = contentWidth - sidebarWidth - 8;
  const sidebarX = margin + mainWidth + 8;
  const bodyTop = yPosition;

  // Left: summary table with a colored header row
  setHeadingFont('bold');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
  doc.text('SUMMARY', margin, yPosition);
  yPosition += 5;

  const remainingPercentage = data.totalAmount > 0 ? ((data.remainingAmount / data.totalAmount) * 100).toFixed(1) : '0.0';
  const paidPercentage = data.totalAmount > 0 ? ((data.paidAmount / data.totalAmount) * 100).toFixed(1) : '0.0';
  const summaryRows = [
    ['Total Amount', fmtCurrency(data.totalAmount)],
    [`Paid (${paidPercentage}%)`, fmtCurrency(data.paidAmount)],
    [`Remaining (${remainingPercentage}%)`, fmtCurrency(data.remainingAmount)],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['Description', 'Amount']],
    body: summaryRows,
    theme: 'grid',
    tableWidth: mainWidth,
    styles: {
      font: ctx.bodyFont,
      lineColor: COLORS.BORDER,
      lineWidth: 0.1,
      fontSize: 8,
      cellPadding: { top: 5, right: 4, bottom: 5, left: 4 },
      valign: 'middle',
    },
    headStyles: {
      fillColor: bannerColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: mainWidth * 0.6, textColor: COLORS.TEXT_SECONDARY },
      1: { cellWidth: mainWidth * 0.4, halign: 'right', font: NUMERIC_FONT, fontStyle: 'bold', textColor: COLORS.TEXT_PRIMARY, overflow: 'hidden' as const },
    },
    willDrawCell: (cellData) => {
      if (highlightAmounts && cellData.section === 'body' && cellData.column.index === 1 && cellData.row.index === summaryRows.length - 1) {
        doc.setFillColor(COLORS.HIGHLIGHT[0], COLORS.HIGHLIGHT[1], COLORS.HIGHLIGHT[2]);
        doc.setTextColor(COLORS.HIGHLIGHT_TEXT[0], COLORS.HIGHLIGHT_TEXT[1], COLORS.HIGHLIGHT_TEXT[2]);
      }
    },
    margin: { left: margin, right: pageWidth - margin - mainWidth, top: 20, bottom: 22 },
  });

  const leftBottom = (doc as any).lastAutoTable.finalY;

  // Right: sidebar card — Bill To + stacked totals
  const sidebarPadding = 5;
  let sideY = bodyTop;

  setHeadingFont('bold');
  doc.setFontSize(8);
  doc.setTextColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
  doc.text('BILL TO', sidebarX, sideY);
  sideY += 6;

  setHeadingFont('bold');
  doc.setFontSize(10);
  doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
  doc.text(data.clientName, sidebarX, sideY);
  sideY += 5;

  if (invoiceSettings.showClientAddress && data.clientAddress) {
    setBodyFont('normal');
    doc.setFontSize(8);
    doc.setTextColor(COLORS.TEXT_SECONDARY[0], COLORS.TEXT_SECONDARY[1], COLORS.TEXT_SECONDARY[2]);
    const clientAddr = doc.splitTextToSize(data.clientAddress, sidebarWidth - sidebarPadding);
    doc.text(clientAddr, sidebarX, sideY);
    sideY += clientAddr.length * 4;
  }

  sideY += 6;
  doc.setDrawColor(COLORS.BORDER[0], COLORS.BORDER[1], COLORS.BORDER[2]);
  doc.setLineWidth(0.3);
  doc.line(sidebarX, sideY, sidebarX + sidebarWidth, sideY);
  sideY += 8;

  setBodyFont('normal');
  doc.setFontSize(8);
  doc.setTextColor(COLORS.TEXT_SECONDARY[0], COLORS.TEXT_SECONDARY[1], COLORS.TEXT_SECONDARY[2]);
  doc.text('Date', sidebarX, sideY);
  setBodyFont('bold');
  doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
  doc.text(data.invoiceDate, sidebarX + sidebarWidth, sideY, { align: 'right' });
  sideY += 8;

  // Big total, called out
  doc.setFillColor(bannerColor[0], bannerColor[1], bannerColor[2]);
  doc.roundedRect(sidebarX, sideY, sidebarWidth, 18, 2, 2, 'F');
  setBodyFont('normal');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL', sidebarX + sidebarPadding, sideY + 7);
  setHeadingFont('bold');
  doc.setFontSize(13);
  doc.setFont(NUMERIC_FONT, 'bold');
  doc.text(fmtCurrency(data.totalAmount), sidebarX + sidebarWidth - sidebarPadding, sideY + 13, { align: 'right' });
  sideY += 24;

  yPosition = Math.max(leftBottom, sideY) + 10;

  // --- 5. Next Payment Due ---
  if (invoiceSettings.showNextPaymentDue && data.nextPaymentDue && data.remainingAmount > 0) {
    doc.setFillColor(COLORS.BG_CARD[0], COLORS.BG_CARD[1], COLORS.BG_CARD[2]);
    doc.setDrawColor(COLORS.ACCENT[0], COLORS.ACCENT[1], COLORS.ACCENT[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, yPosition, contentWidth, 20, 2, 2, 'FD');

    setHeadingFont('bold');
    doc.setFontSize(9);
    doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
    doc.text('NEXT PAYMENT DUE', margin + 6, yPosition + 8);

    setBodyFont('normal');
    doc.setFontSize(9);
    doc.setTextColor(COLORS.TEXT_SECONDARY[0], COLORS.TEXT_SECONDARY[1], COLORS.TEXT_SECONDARY[2]);
    doc.text(`Date: ${data.nextPaymentDue}`, margin + 6, yPosition + 14);

    if (data.nextPaymentAmount) {
      doc.setFont(NUMERIC_FONT, 'bold');
      doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
      doc.text(fmtCurrency(data.nextPaymentAmount), pageWidth - margin - 6, yPosition + 11, { align: 'right' });
    }

    yPosition += 25;
  }

  // --- 6. Payment History ---
  if (invoiceSettings.showPaymentHistory && data.payments && data.payments.length > 0) {
    setHeadingFont('bold');
    doc.setFontSize(10);
    doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
    doc.text('PAYMENT HISTORY', margin, yPosition);
    yPosition += 6;

    const paymentRows = data.payments.map((payment, index) => {
      const currCode = (data.localization?.currencyCode || 'INR').toUpperCase();
      const sanitizedNotes = (payment.notes || '-').replace(/₹/g, currCode + ' ');
      return [String(index + 1), payment.payment_date, (payment.payment_method || '-').toUpperCase(), fmtCurrency(payment.amount), sanitizedNotes];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Date', 'Method', 'Amount', 'Notes']],
      body: paymentRows,
      theme: 'grid',
      styles: {
        font: ctx.bodyFont,
        lineColor: COLORS.BORDER,
        lineWidth: 0.1,
        textColor: COLORS.TEXT_SECONDARY,
        fontSize: 7,
        cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
        valign: 'middle',
      },
      headStyles: {
        fillColor: bannerColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7,
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center', fontSize: 7 },
        1: { cellWidth: 30, fontSize: 7 },
        2: { cellWidth: 28, halign: 'center', fontSize: 7 },
        3: { cellWidth: 42, halign: 'right', fontSize: 8, font: NUMERIC_FONT, fontStyle: 'bold', overflow: 'hidden' as const, minCellWidth: 42 },
        4: { cellWidth: 'auto', fontSize: 7 },
      },
      didParseCell: (hookData) => {
        if (hookData.column.index === 3) hookData.cell.styles.font = NUMERIC_FONT;
      },
      willDrawCell: (cellData) => {
        if (highlightAmounts && cellData.column.index === 3 && cellData.section === 'body') {
          doc.setFillColor(COLORS.HIGHLIGHT[0], COLORS.HIGHLIGHT[1], COLORS.HIGHLIGHT[2]);
          doc.setTextColor(COLORS.HIGHLIGHT_TEXT[0], COLORS.HIGHLIGHT_TEXT[1], COLORS.HIGHLIGHT_TEXT[2]);
        }
      },
      margin: { left: margin, right: margin, top: 20, bottom: 22 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  return yPosition;
};
