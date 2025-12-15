import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDFEditorSettings, InvoiceSettings, getThemeById, hexToRgb, PDFTheme } from './pdfThemes';

interface InvoiceData {
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
    invoice_terms_conditions?: { id: string; title: string; points: string[] }[];
    // Bank details
    bank_name?: string;
    bank_account_number?: string;
    bank_ifsc_code?: string;
    bank_account_holder?: string;
    upi_id?: string;
    payment_qr_url?: string;
  };
  editorSettings?: PDFEditorSettings;
  invoiceSettings?: InvoiceSettings;
}

const formatCurrency = (amount: number): string => {
  return 'INR ' + Math.round(amount).toLocaleString('en-IN');
};

const compressImage = async (imageUrl: string, maxWidth: number, maxHeight: number): Promise<string> => {
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
    
    img.onerror = (e) => {
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

export const generateInvoicePDF = async (data: InvoiceData) => {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  // Get settings
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
    ...data.invoiceSettings
  };

  // Get theme
  const theme: PDFTheme = editorSettings ? getThemeById(editorSettings.theme) : getThemeById('minimal-white');
  const logoPlacement = editorSettings?.logoPlacement || 'left';
  const highlightAmounts = editorSettings?.highlightAmounts ?? true;

  const getHighlightColor = (): [number, number, number] => {
    if (editorSettings?.customColors?.highlight) {
      return hexToRgb(editorSettings.customColors.highlight);
    }
    return theme.colors.highlight;
  };

  const COLORS = {
    TEXT_PRIMARY: theme.colors.text,
    TEXT_SECONDARY: theme.colors.textSecondary,
    TEXT_LIGHT: [120, 120, 120] as [number, number, number],
    BG_CARD: theme.colors.cardBackground,
    BORDER: theme.colors.border,
    ACCENT: theme.colors.accent,
    HIGHLIGHT: getHighlightColor(),
    HEADER_BG: theme.colors.headerBg,
    HEADER_TEXT: theme.colors.headerText,
  };

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
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
    // For center layout, position text below logo with proper spacing
    headerTextY = yPosition + logoSize + 10;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
  doc.text((data.profile.company_name || 'COMPANY NAME').toUpperCase(), companyInfoX, headerTextY, { align: companyInfoAlign });
  
  headerTextY += 7;
  doc.setFont('helvetica', 'normal');
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
      doc.setFont('helvetica', 'bold');
      doc.text(`GSTIN: ${data.profile.gstin}`, companyInfoX, headerTextY, { align: companyInfoAlign });
      headerTextY += 4.5;
    }
  }

  // Calculate yPosition based on layout - ensure no overlap with cards
  if (logoPlacement === 'center') {
    yPosition = headerTextY + 8; // Add extra space after center-aligned header
  } else {
    yPosition += 35; // Standard spacing for left/right layouts
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
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
  doc.text('BILL TO', cardContentX, cardY);
  
  cardY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
  doc.text(data.clientName, cardContentX, cardY);
  
  if (invoiceSettings.showProjectName) {
    cardY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(COLORS.TEXT_SECONDARY[0], COLORS.TEXT_SECONDARY[1], COLORS.TEXT_SECONDARY[2]);
    doc.text(data.projectName, cardContentX, cardY);
  }

  if (invoiceSettings.showClientAddress && data.clientAddress) {
    cardY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const clientAddr = doc.splitTextToSize(data.clientAddress, cardWidth - (cardPadding * 2));
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
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
  doc.text('INVOICE DETAILS', metaContentX, metaY);
  metaY += 6;

  const addMeta = (label: string, value: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(COLORS.TEXT_SECONDARY[0], COLORS.TEXT_SECONDARY[1], COLORS.TEXT_SECONDARY[2]);
    doc.text(label, metaLabelX, metaY);
    
    doc.setFont('helvetica', 'bold');
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
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
  doc.text("PAYMENT SUMMARY", margin, yPosition);
  yPosition += 6;

  // Calculate remaining percentage
  const remainingPercentage = data.totalAmount > 0 
    ? ((data.remainingAmount / data.totalAmount) * 100).toFixed(1)
    : '0.0';
  const paidPercentage = data.totalAmount > 0 
    ? ((data.paidAmount / data.totalAmount) * 100).toFixed(1)
    : '0.0';

  const summaryData = [
    ['Total Amount', formatCurrency(data.totalAmount)],
    ['Paid Amount', `${formatCurrency(data.paidAmount)} (${paidPercentage}% paid)`],
    ['Total Remaining', `${formatCurrency(data.remainingAmount)} (${remainingPercentage}% remaining)`],
  ];

  autoTable(doc, {
    startY: yPosition,
    body: summaryData,
    theme: 'grid',
    styles: {
      lineColor: COLORS.BORDER,
      lineWidth: 0.1,
      cellPadding: 5,
      fontSize: 8
    },
    columnStyles: {
      0: { cellWidth: 120, halign: 'right', fontStyle: 'bold', textColor: COLORS.TEXT_SECONDARY, fontSize: 8 },
      1: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold', textColor: COLORS.TEXT_PRIMARY, fontSize: 8 }
    },
    willDrawCell: (cellData) => {
      if (highlightAmounts && cellData.column.index === 1 && cellData.section === 'body') {
        doc.setFillColor(COLORS.HIGHLIGHT[0], COLORS.HIGHLIGHT[1], COLORS.HIGHLIGHT[2]);
        doc.setTextColor(0, 0, 0);
      }
    },
    margin: { left: margin, right: margin }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // --- 4. Next Payment Due ---
  if (invoiceSettings.showNextPaymentDue && data.nextPaymentDue && data.remainingAmount > 0) {
    doc.setFillColor(COLORS.BG_CARD[0], COLORS.BG_CARD[1], COLORS.BG_CARD[2]);
    doc.setDrawColor(COLORS.ACCENT[0], COLORS.ACCENT[1], COLORS.ACCENT[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, yPosition, contentWidth, 20, 2, 2, 'FD');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
    doc.text("NEXT PAYMENT DUE", margin + 6, yPosition + 8);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(COLORS.TEXT_SECONDARY[0], COLORS.TEXT_SECONDARY[1], COLORS.TEXT_SECONDARY[2]);
    doc.text(`Date: ${data.nextPaymentDue}`, margin + 6, yPosition + 14);
    
    if (data.nextPaymentAmount) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
      doc.text(formatCurrency(data.nextPaymentAmount), pageWidth - margin - 6, yPosition + 11, { align: 'right' });
    }
    
    yPosition += 25;
  }

  // --- 5. Payment History ---
  if (invoiceSettings.showPaymentHistory && data.payments && data.payments.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
    doc.text("PAYMENT HISTORY", margin, yPosition);
    yPosition += 6;

    const paymentRows = data.payments.map((payment, index) => [
      String(index + 1),
      payment.payment_date,
      (payment.payment_method || '-').toUpperCase(),
      formatCurrency(payment.amount),
      payment.notes || '-',
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Date', 'Method', 'Amount', 'Notes']],
      body: paymentRows,
      theme: 'grid',
      styles: {
        lineColor: COLORS.BORDER,
        lineWidth: 0.1,
        textColor: COLORS.TEXT_SECONDARY,
        fontSize: 7,
        cellPadding: 3
      },
      headStyles: {
        fillColor: COLORS.BG_CARD,
        textColor: COLORS.TEXT_PRIMARY,
        fontStyle: 'bold',
        lineColor: COLORS.BORDER,
        lineWidth: 0.1,
        fontSize: 7
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center', fontSize: 7 },
        1: { cellWidth: 30, fontSize: 7 },
        2: { cellWidth: 25, halign: 'center', fontSize: 7 },
        3: { cellWidth: 35, halign: 'right', fontStyle: 'bold', fontSize: 7 },
        4: { cellWidth: 'auto', fontSize: 6 }
      },
      willDrawCell: (cellData) => {
        if (highlightAmounts && cellData.column.index === 3 && cellData.section === 'body') {
          doc.setFillColor(COLORS.HIGHLIGHT[0], COLORS.HIGHLIGHT[1], COLORS.HIGHLIGHT[2]);
          doc.setTextColor(0, 0, 0);
        }
      },
      margin: { left: margin, right: margin }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // --- 6. Terms & Conditions ---
  if (invoiceSettings.showTermsConditions && data.profile.invoice_terms_conditions && data.profile.invoice_terms_conditions.length > 0) {
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 15;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
    doc.text("TERMS & CONDITIONS", margin, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);

    const addBlock = (title: string, points: string[]) => {
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 15;
      }
      if (title) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
        doc.text(title, margin, yPosition);
        yPosition += 4;
      }
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(COLORS.TEXT_SECONDARY[0], COLORS.TEXT_SECONDARY[1], COLORS.TEXT_SECONDARY[2]);
      
      if (!points || !Array.isArray(points)) return;
      
      points.forEach((point) => {
        if (!point || !point.trim()) return;
        
        const splitText = doc.splitTextToSize(point, contentWidth - 5);
        
        splitText.forEach((line: string, lineIndex: number) => {
          if (yPosition > pageHeight - 20) {
            doc.addPage();
            yPosition = 15;
          }
          
          if (lineIndex === 0) {
            doc.text("•", margin, yPosition);
            doc.text(line, margin + 5, yPosition);
          } else {
            doc.text(line, margin + 5, yPosition);
          }
          yPosition += 3.5;
        });
      });
      yPosition += 2;
    };

    data.profile.invoice_terms_conditions.forEach(term => {
      if (term && term.title && term.points) {
        addBlock(term.title, term.points);
      }
    });
  }

  // --- 6.5 Bank Details Section ---
  if (invoiceSettings.showBankDetails && data.profile) {
    const bank = data.profile;
    const hasBankInfo = bank.bank_name || bank.bank_account_number || bank.bank_ifsc_code || bank.upi_id;
    
    if (hasBankInfo) {
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = 15;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
      doc.text("BANK & PAYMENT DETAILS", margin, yPosition);
      yPosition += 8;

      // Bank details card
      const showQR = invoiceSettings.showQRCode && bank.payment_qr_url;
      const cardWidth = showQR ? contentWidth - 50 : contentWidth;
      doc.setFillColor(COLORS.BG_CARD[0], COLORS.BG_CARD[1], COLORS.BG_CARD[2]);
      doc.setDrawColor(COLORS.BORDER[0], COLORS.BORDER[1], COLORS.BORDER[2]);
      doc.roundedRect(margin, yPosition, cardWidth, 35, 2, 2, 'FD');

      let bankY = yPosition + 6;
      const labelX = margin + 5;
      const valueX = margin + 45;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      const addBankRow = (label: string, value: string) => {
        doc.setTextColor(COLORS.TEXT_SECONDARY[0], COLORS.TEXT_SECONDARY[1], COLORS.TEXT_SECONDARY[2]);
        doc.text(label, labelX, bankY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
        doc.text(value, valueX, bankY);
        doc.setFont('helvetica', 'normal');
        bankY += 5.5;
      };

      if (bank.bank_name) addBankRow('Bank:', bank.bank_name);
      if (bank.bank_account_holder) addBankRow('A/C Holder:', bank.bank_account_holder);
      if (bank.bank_account_number) addBankRow('A/C Number:', bank.bank_account_number);
      if (bank.bank_ifsc_code) addBankRow('IFSC Code:', bank.bank_ifsc_code);
      if (bank.upi_id) addBankRow('UPI ID:', bank.upi_id);

      // QR Code
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
    }
  }

  // --- 7. Signature & Footer ---
  if (invoiceSettings.showSignatureArea) {
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = pageHeight - 60;
    } else {
      yPosition += 10;
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
      } catch (e) {}
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
  }

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
  doc.text("This invoice is computer-generated.", pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Return blob for sharing or save directly
  const fileName = `Invoice_${data.invoiceNumber}.pdf`;
  const pdfBlob = doc.output('blob');
  
  // Try Web Share API first
  if (navigator.share && navigator.canShare) {
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
    const shareData = { files: [file], title: `Invoice ${data.invoiceNumber}` };
    
    if (navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return; // Successfully shared
      } catch (err) {
        // User cancelled or share failed, fall back to download
        if ((err as Error).name !== 'AbortError') {
          console.log('Share failed, downloading instead');
        }
      }
    }
  }
  
  // Fallback: download the file
  doc.save(fileName);
};