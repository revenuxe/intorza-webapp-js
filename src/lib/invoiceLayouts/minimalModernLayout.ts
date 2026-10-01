import autoTable from 'jspdf-autotable';
import { LayoutContext, compressImage } from './shared';

// Clean, centered-title layout: small logo top-left, big centered "INVOICE" title,
// plain text info block (no card fills — a single divider line is the only
// separator), thin-bordered summary table, and a closing accent rule + thank-you
// note. Selectable alongside "classic", not the default.
export const renderMinimalModernHeaderAndSummary = async (ctx: LayoutContext): Promise<number> => {
  const {
    doc, data, invoiceSettings, COLORS, fmtCurrency, highlightAmounts,
    setHeadingFont, setBodyFont, pageWidth, margin, contentWidth, NUMERIC_FONT,
  } = ctx;

  let yPosition = 18;

  // --- 1. Small logo, top-left ---
  const logoSize = 16;
  if (invoiceSettings.showCompanyLogo && data.profile.logo_url) {
    try {
      const compressedLogo = await compressImage(data.profile.logo_url, 300, 300);
      doc.addImage(compressedLogo, 'JPEG', margin, yPosition, logoSize, logoSize, undefined, 'FAST');
    } catch (e) {
      console.error('Logo load error:', e);
    }
  }

  // --- 2. Centered title ---
  setHeadingFont('bold');
  doc.setFontSize(26);
  doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
  doc.text('INVOICE', pageWidth / 2, yPosition + 12, { align: 'center' });

  setBodyFont('normal');
  doc.setFontSize(10);
  doc.setTextColor(COLORS.TEXT_SECONDARY[0], COLORS.TEXT_SECONDARY[1], COLORS.TEXT_SECONDARY[2]);
  doc.text(`#${data.invoiceNumber}`, pageWidth / 2, yPosition + 19, { align: 'center' });

  yPosition += 30;

  // Company name, centered, small
  if (data.profile.company_name) {
    setBodyFont('bold');
    doc.setFontSize(10);
    doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
    doc.text(data.profile.company_name, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;
  }

  doc.setDrawColor(COLORS.BORDER[0], COLORS.BORDER[1], COLORS.BORDER[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // --- 3. Plain two-column info block (no card fills) ---
  const colWidth = contentWidth / 2;
  const leftX = margin;
  const rightX = margin + colWidth;
  const blockStartY = yPosition;

  setHeadingFont('bold');
  doc.setFontSize(8);
  doc.setTextColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
  doc.text('CLIENT', leftX, yPosition);
  doc.text('INVOICE DETAILS', rightX, yPosition);
  yPosition += 6;

  let leftY = yPosition;
  setHeadingFont('bold');
  doc.setFontSize(11);
  doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
  doc.text(data.clientName, leftX, leftY);
  leftY += 5.5;

  if (invoiceSettings.showProjectName) {
    setBodyFont('normal');
    doc.setFontSize(9);
    doc.setTextColor(COLORS.TEXT_SECONDARY[0], COLORS.TEXT_SECONDARY[1], COLORS.TEXT_SECONDARY[2]);
    doc.text(data.projectName, leftX, leftY);
    leftY += 5;
  }

  if (invoiceSettings.showClientAddress && data.clientAddress) {
    setBodyFont('normal');
    doc.setFontSize(8);
    const clientAddr = doc.splitTextToSize(data.clientAddress, colWidth - 10);
    doc.text(clientAddr, leftX, leftY);
    leftY += clientAddr.length * 4;
  }

  let rightY = yPosition;
  const addMeta = (label: string, value: string) => {
    setBodyFont('normal');
    doc.setFontSize(9);
    doc.setTextColor(COLORS.TEXT_SECONDARY[0], COLORS.TEXT_SECONDARY[1], COLORS.TEXT_SECONDARY[2]);
    doc.text(label, rightX, rightY);
    setBodyFont('bold');
    doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
    doc.text(value, rightX + 26, rightY);
    rightY += 5.5;
  };

  addMeta('Date:', data.invoiceDate);
  if (invoiceSettings.showDueDate && data.dueDate) addMeta('Due:', data.dueDate);
  if (invoiceSettings.showPaymentStatus) addMeta('Status:', data.status.toUpperCase());
  if (invoiceSettings.showTaxGst && data.profile.gstin) addMeta(`${ctx.loc.taxRegistrationLabel}:`, data.profile.gstin);

  yPosition = Math.max(leftY, rightY, blockStartY + 20) + 8;

  doc.setDrawColor(COLORS.BORDER[0], COLORS.BORDER[1], COLORS.BORDER[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // --- 4. Plain-bordered summary table (thin lines, no filled backgrounds) ---
  const remainingPercentage = data.totalAmount > 0 ? ((data.remainingAmount / data.totalAmount) * 100).toFixed(1) : '0.0';
  const paidPercentage = data.totalAmount > 0 ? ((data.paidAmount / data.totalAmount) * 100).toFixed(1) : '0.0';

  const summaryData = [
    ['Total Amount', fmtCurrency(data.totalAmount)],
    [`Paid (${paidPercentage}%)`, fmtCurrency(data.paidAmount)],
    [`Remaining (${remainingPercentage}%)`, fmtCurrency(data.remainingAmount)],
  ];

  autoTable(doc, {
    startY: yPosition,
    body: summaryData,
    theme: 'plain',
    tableWidth: contentWidth,
    styles: {
      font: ctx.bodyFont,
      lineColor: COLORS.BORDER,
      lineWidth: 0.15,
      cellPadding: { top: 4, right: 2, bottom: 4, left: 2 },
      fontSize: 9,
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.6, halign: 'left', textColor: COLORS.TEXT_SECONDARY },
      1: { cellWidth: contentWidth * 0.4, halign: 'right', font: NUMERIC_FONT, fontStyle: 'bold', textColor: COLORS.TEXT_PRIMARY, overflow: 'hidden' as const },
    },
    didParseCell: (hookData) => {
      const row = hookData.row?.raw as any[] | undefined;
      const label = String(row?.[0] ?? '');
      if (label.startsWith('Total Amount')) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fontSize = 11;
        if (hookData.column.index === 1) hookData.cell.styles.font = NUMERIC_FONT;
      }
      // Thin top border on every row so it still reads as a "table" without fills
      hookData.cell.styles.lineWidth = { top: 0.15, right: 0, bottom: 0, left: 0 } as any;
    },
    willDrawCell: (cellData) => {
      if (highlightAmounts && cellData.column.index === 1 && cellData.row.index === summaryData.length - 1) {
        doc.setTextColor(COLORS.ACCENT[0], COLORS.ACCENT[1], COLORS.ACCENT[2]);
      }
    },
    margin: { left: margin, right: margin, top: 20, bottom: 22 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // --- 5. Next Payment Due (plain text, no card) ---
  if (invoiceSettings.showNextPaymentDue && data.nextPaymentDue && data.remainingAmount > 0) {
    setBodyFont('bold');
    doc.setFontSize(9);
    doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
    doc.text(`Next payment due ${data.nextPaymentDue}`, margin, yPosition);
    if (data.nextPaymentAmount) {
      doc.text(fmtCurrency(data.nextPaymentAmount), pageWidth - margin, yPosition, { align: 'right' });
    }
    yPosition += 10;
  }

  // --- 6. Payment History (same thin-line table style) ---
  if (invoiceSettings.showPaymentHistory && data.payments && data.payments.length > 0) {
    setHeadingFont('bold');
    doc.setFontSize(9);
    doc.setTextColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
    doc.text('PAYMENT HISTORY', margin, yPosition);
    yPosition += 5;

    const paymentRows = data.payments.map((payment, index) => {
      const currCode = (data.localization?.currencyCode || 'INR').toUpperCase();
      const sanitizedNotes = (payment.notes || '-').replace(/₹/g, currCode + ' ');
      return [String(index + 1), payment.payment_date, (payment.payment_method || '-').toUpperCase(), fmtCurrency(payment.amount), sanitizedNotes];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Date', 'Method', 'Amount', 'Notes']],
      body: paymentRows,
      theme: 'plain',
      styles: {
        font: ctx.bodyFont,
        lineColor: COLORS.BORDER,
        lineWidth: 0.15,
        textColor: COLORS.TEXT_SECONDARY,
        fontSize: 7,
        cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
        valign: 'middle',
      },
      headStyles: {
        textColor: COLORS.TEXT_LIGHT,
        fontStyle: 'bold',
        fontSize: 7,
        halign: 'center',
        lineWidth: { top: 0, right: 0, bottom: 0.3, left: 0 } as any,
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 30 },
        2: { cellWidth: 28, halign: 'center' },
        3: { cellWidth: 42, halign: 'right', font: NUMERIC_FONT, fontStyle: 'bold', overflow: 'hidden' as const, minCellWidth: 42 },
        4: { cellWidth: 'auto' },
      },
      didParseCell: (hookData) => {
        if (hookData.section === 'body') {
          hookData.cell.styles.lineWidth = { top: 0.15, right: 0, bottom: 0, left: 0 } as any;
        }
        if (hookData.column.index === 3) hookData.cell.styles.font = NUMERIC_FONT;
      },
      margin: { left: margin, right: margin, top: 20, bottom: 22 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // --- 7. Accent rule + thank-you note ---
  doc.setDrawColor(COLORS.ACCENT[0], COLORS.ACCENT[1], COLORS.ACCENT[2]);
  doc.setLineWidth(0.8);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  setBodyFont('normal');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.TEXT_SECONDARY[0], COLORS.TEXT_SECONDARY[1], COLORS.TEXT_SECONDARY[2]);
  doc.text(data.notes?.trim() || 'Thank you for your business!', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  return yPosition;
};
