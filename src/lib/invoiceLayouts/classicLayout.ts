import autoTable from 'jspdf-autotable';
import { LayoutContext, compressImage } from './shared';

// The original (and still default) invoice layout — extracted verbatim from the
// pre-refactor generateInvoicePDF, no visual change. Renders header/logo, the two
// info cards, Payment Summary table, Next Payment Due card, and Payment History
// table, returning the yPosition the shared sections (terms/bank/signature/footer)
// should continue from.
export const renderClassicHeaderAndSummary = async (ctx: LayoutContext): Promise<number> => {
  const {
    doc, data, invoiceSettings, COLORS, loc, fmtCurrency, logoPlacement, highlightAmounts,
    setHeadingFont, setBodyFont, pageWidth, margin, contentWidth, NUMERIC_FONT,
  } = ctx;

  let yPosition = 15;

  // --- 1. Header Section ---
  let compressedLogo: string | null = null;
  const logoSize = 25;
  const cornerRadius = logoSize * 0.1;

  if (invoiceSettings.showCompanyLogo && data.profile.logo_url) {
    try {
      compressedLogo = await compressImage(data.profile.logo_url, 400, 400);

      let logoX = margin;
      if (logoPlacement === 'center') {
        logoX = (pageWidth - logoSize) / 2;
      } else if (logoPlacement === 'right') {
        logoX = pageWidth - margin - logoSize;
      }

      doc.setFillColor(COLORS.HEADER_BG[0], COLORS.HEADER_BG[1], COLORS.HEADER_BG[2]);
      doc.roundedRect(logoX, yPosition, logoSize, logoSize, cornerRadius, cornerRadius, 'F');
      doc.addImage(compressedLogo, 'JPEG', logoX, yPosition, logoSize, logoSize, undefined, 'FAST');
    } catch (e) {
      console.error('Logo load error:', e);
    }
  }

  // Company Details
  let companyInfoX = pageWidth - margin;
  let companyInfoAlign: 'right' | 'left' | 'center' = 'right';

  if (logoPlacement === 'right') {
    companyInfoX = margin;
    companyInfoAlign = 'left';
  } else if (logoPlacement === 'center') {
    companyInfoX = pageWidth / 2;
    companyInfoAlign = 'center';
  }

  let headerTextY = yPosition + 5;
  if (logoPlacement === 'center') {
    headerTextY = yPosition + logoSize + 10;
  }

  setHeadingFont('bold');
  doc.setFontSize(18);
  doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
  doc.text((data.profile.company_name || 'COMPANY NAME').toUpperCase(), companyInfoX, headerTextY, { align: companyInfoAlign });

  headerTextY += 7;
  setBodyFont('normal');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.TEXT_SECONDARY[0], COLORS.TEXT_SECONDARY[1], COLORS.TEXT_SECONDARY[2]);

  if (invoiceSettings.showCompanyAddress) {
    if (data.profile.address) {
      const maxAddressWidth = logoPlacement === 'center' ? contentWidth - 20 : 90;
      const addressLines = doc.splitTextToSize(data.profile.address, maxAddressWidth);
      addressLines.forEach((line: string) => {
        doc.text(line, companyInfoX, headerTextY, { align: companyInfoAlign });
        headerTextY += 4.5;
      });
    }

    const contactDetails = [];
    if (data.profile.phone) contactDetails.push(data.profile.phone);
    if (data.profile.email) contactDetails.push(data.profile.email);

    if (contactDetails.length > 0) {
      doc.text(contactDetails.join(' | '), companyInfoX, headerTextY, { align: companyInfoAlign });
      headerTextY += 4.5;
    }

    if (data.profile.gstin) {
      setBodyFont('bold');
      doc.text(`${loc.taxRegistrationLabel}: ${data.profile.gstin}`, companyInfoX, headerTextY, { align: companyInfoAlign });
      headerTextY += 4.5;
    }
  }

  if (logoPlacement === 'center') {
    yPosition = headerTextY + 8;
  } else {
    yPosition += 35;
  }

  // --- 2. Info Cards ---
  const cardHeight = 42;
  const gap = 5;
  const cardWidth = (contentWidth - gap) / 2;

  // Left Card: Client Info
  doc.setFillColor(COLORS.BG_CARD[0], COLORS.BG_CARD[1], COLORS.BG_CARD[2]);
  doc.setDrawColor(COLORS.BORDER[0], COLORS.BORDER[1], COLORS.BORDER[2]);
  doc.roundedRect(margin, yPosition, cardWidth, cardHeight, 2, 2, 'FD');

  let cardY = yPosition + 8;
  const cardPadding = 6;
  const cardContentX = margin + cardPadding;

  setHeadingFont('bold');
  doc.setFontSize(8);
  doc.setTextColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
  doc.text('BILL TO', cardContentX, cardY);

  cardY += 6;
  setHeadingFont('bold');
  doc.setFontSize(11);
  doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
  doc.text(data.clientName, cardContentX, cardY);

  if (invoiceSettings.showProjectName) {
    cardY += 5;
    setBodyFont('normal');
    doc.setFontSize(9);
    doc.setTextColor(COLORS.TEXT_SECONDARY[0], COLORS.TEXT_SECONDARY[1], COLORS.TEXT_SECONDARY[2]);
    doc.text(data.projectName, cardContentX, cardY);
  }

  if (invoiceSettings.showClientAddress && data.clientAddress) {
    cardY += 5;
    setBodyFont('normal');
    doc.setFontSize(8);
    const clientAddr = doc.splitTextToSize(data.clientAddress, cardWidth - cardPadding * 2);
    doc.text(clientAddr, cardContentX, cardY);
  }

  // Right Card: Invoice Meta
  const rightCardX = margin + cardWidth + gap;
  doc.setFillColor(COLORS.BG_CARD[0], COLORS.BG_CARD[1], COLORS.BG_CARD[2]);
  doc.roundedRect(rightCardX, yPosition, cardWidth, cardHeight, 2, 2, 'FD');

  let metaY = yPosition + 8;
  const metaContentX = rightCardX + cardPadding;
  const metaLabelX = metaContentX;
  const metaValueX = metaContentX + 30;

  setHeadingFont('bold');
  doc.setFontSize(8);
  doc.setTextColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
  doc.text('INVOICE DETAILS', metaContentX, metaY);
  metaY += 6;

  const addMeta = (label: string, value: string) => {
    setBodyFont('normal');
    doc.setFontSize(9);
    doc.setTextColor(COLORS.TEXT_SECONDARY[0], COLORS.TEXT_SECONDARY[1], COLORS.TEXT_SECONDARY[2]);
    doc.text(label, metaLabelX, metaY);

    setBodyFont('bold');
    doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
    doc.text(value, metaValueX, metaY);
    metaY += 5.5;
  };

  addMeta('Invoice #:', data.invoiceNumber);
  addMeta('Date:', data.invoiceDate);
  if (invoiceSettings.showDueDate && data.dueDate) {
    addMeta('Due Date:', data.dueDate);
  }
  if (invoiceSettings.showPaymentStatus) {
    addMeta('Status:', data.status.toUpperCase());
  }

  yPosition += cardHeight + 10;

  // --- 3. Payment Summary ---
  setHeadingFont('bold');
  doc.setFontSize(10);
  doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
  doc.text("PAYMENT SUMMARY", margin, yPosition);
  yPosition += 6;

  const remainingPercentage = data.totalAmount > 0
    ? ((data.remainingAmount / data.totalAmount) * 100).toFixed(1)
    : '0.0';
  const paidPercentage = data.totalAmount > 0
    ? ((data.paidAmount / data.totalAmount) * 100).toFixed(1)
    : '0.0';

  const summaryData = [
    ['Total Amount', fmtCurrency(data.totalAmount)],
    [`Paid Amount (${paidPercentage}% paid)`, fmtCurrency(data.paidAmount)],
    [`Total Remaining (${remainingPercentage}% remaining)`, fmtCurrency(data.remainingAmount)],
  ];

  const labelColumnWidth = contentWidth * 0.45;
  const amountColumnWidth = contentWidth * 0.55;

  autoTable(doc, {
    startY: yPosition,
    body: summaryData,
    theme: 'grid',
    tableWidth: contentWidth,
    styles: {
      font: ctx.bodyFont,
      lineColor: COLORS.BORDER,
      lineWidth: 0.1,
      cellPadding: { top: 5, right: 10, bottom: 5, left: 10 },
      fontSize: 8,
      valign: 'middle',
      minCellHeight: 8,
    },
    columnStyles: {
      0: {
        cellWidth: labelColumnWidth,
        halign: 'left',
        fontStyle: 'bold',
        textColor: COLORS.TEXT_SECONDARY,
        fontSize: 8,
        valign: 'middle',
      },
      1: {
        cellWidth: amountColumnWidth,
        halign: 'right',
        font: NUMERIC_FONT,
        fontStyle: 'bold',
        textColor: COLORS.TEXT_PRIMARY,
        fontSize: 8,
        minCellWidth: 50,
        overflow: 'hidden' as const,
        valign: 'middle',
      },
    },
    didParseCell: (hookData) => {
      if (hookData.section !== 'body') return;
      const row = hookData.row?.raw as any[] | undefined;
      const label = String(row?.[0] ?? '');

      if (label.toLowerCase().startsWith('total amount')) {
        if (hookData.column.index === 0) {
          hookData.cell.styles.fontSize = 9;
          hookData.cell.styles.fontStyle = 'bold';
        }
        if (hookData.column.index === 1) {
          hookData.cell.styles.font = NUMERIC_FONT;
          hookData.cell.styles.fontSize = 9;
          hookData.cell.styles.fontStyle = 'bold';
        }
      }
      if (hookData.column.index === 1) {
        hookData.cell.styles.font = NUMERIC_FONT;
      }
    },
    willDrawCell: (cellData) => {
      if (highlightAmounts && cellData.column.index === 1 && cellData.section === 'body') {
        doc.setFillColor(COLORS.HIGHLIGHT[0], COLORS.HIGHLIGHT[1], COLORS.HIGHLIGHT[2]);
        doc.setTextColor(COLORS.HIGHLIGHT_TEXT[0], COLORS.HIGHLIGHT_TEXT[1], COLORS.HIGHLIGHT_TEXT[2]);
      }
    },
    margin: { left: margin, right: margin },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // --- 4. Next Payment Due ---
  if (invoiceSettings.showNextPaymentDue && data.nextPaymentDue && data.remainingAmount > 0) {
    doc.setFillColor(COLORS.BG_CARD[0], COLORS.BG_CARD[1], COLORS.BG_CARD[2]);
    doc.setDrawColor(COLORS.ACCENT[0], COLORS.ACCENT[1], COLORS.ACCENT[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, yPosition, contentWidth, 20, 2, 2, 'FD');

    setHeadingFont('bold');
    doc.setFontSize(9);
    doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
    doc.text("NEXT PAYMENT DUE", margin + 6, yPosition + 8);

    setBodyFont('normal');
    doc.setFontSize(9);
    doc.setTextColor(COLORS.TEXT_SECONDARY[0], COLORS.TEXT_SECONDARY[1], COLORS.TEXT_SECONDARY[2]);
    doc.text(`Date: ${data.nextPaymentDue}`, margin + 6, yPosition + 14);

    if (data.nextPaymentAmount) {
      setBodyFont('bold');
      doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
      doc.text(fmtCurrency(data.nextPaymentAmount), pageWidth - margin - 6, yPosition + 11, { align: 'right' });
    }

    yPosition += 25;
  }

  // --- 5. Payment History ---
  if (invoiceSettings.showPaymentHistory && data.payments && data.payments.length > 0) {
    setHeadingFont('bold');
    doc.setFontSize(10);
    doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
    doc.text("PAYMENT HISTORY", margin, yPosition);
    yPosition += 6;

    const paymentRows = data.payments.map((payment, index) => {
      const currCode = (data.localization?.currencyCode || 'INR').toUpperCase();
      const sanitizedNotes = (payment.notes || '-').replace(/₹/g, currCode + ' ');
      return [
        String(index + 1),
        payment.payment_date,
        (payment.payment_method || '-').toUpperCase(),
        fmtCurrency(payment.amount),
        sanitizedNotes,
      ];
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
        minCellHeight: 8,
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: COLORS.TEXT_PRIMARY,
        fontStyle: 'bold',
        lineColor: COLORS.BORDER,
        lineWidth: 0.1,
        fontSize: 7,
        halign: 'center',
        valign: 'middle',
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center', fontSize: 7, valign: 'middle' },
        1: { cellWidth: 30, fontSize: 7, valign: 'middle' },
        2: { cellWidth: 28, halign: 'center', fontSize: 7, valign: 'middle' },
        3: { cellWidth: 42, halign: 'right', fontSize: 8, font: NUMERIC_FONT, fontStyle: 'bold', overflow: 'hidden' as const, minCellWidth: 42, valign: 'middle' },
        4: { cellWidth: 'auto', fontSize: 7, valign: 'middle' },
      },
      didParseCell: (hookData) => {
        if (hookData.column.index === 3) {
          hookData.cell.styles.font = NUMERIC_FONT;
        }
      },
      willDrawCell: (cellData) => {
        if (highlightAmounts && cellData.column.index === 3 && cellData.section === 'body') {
          doc.setFillColor(COLORS.HIGHLIGHT[0], COLORS.HIGHLIGHT[1], COLORS.HIGHLIGHT[2]);
          doc.setTextColor(COLORS.HIGHLIGHT_TEXT[0], COLORS.HIGHLIGHT_TEXT[1], COLORS.HIGHLIGHT_TEXT[2]);
        }
      },
      margin: { left: margin, right: margin },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  return yPosition;
};
