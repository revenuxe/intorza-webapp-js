import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  clientName: string;
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
    payment_stages?: any[];
    invoice_terms_conditions?: { id: string; title: string; points: string[] }[];
  };
}

// --- Design System Colors (same as quotation PDF) ---
const COLORS = {
  TEXT_PRIMARY: [20, 20, 20] as [number, number, number],
  TEXT_SECONDARY: [80, 80, 80] as [number, number, number],
  TEXT_LIGHT: [120, 120, 120] as [number, number, number],
  BG_CARD: [250, 250, 250] as [number, number, number],
  BORDER: [230, 230, 230] as [number, number, number],
  ACCENT: [0, 0, 0] as [number, number, number],
  HIGHLIGHT: [255, 240, 0] as [number, number, number],
};

const formatCurrency = (amount: number): string => {
  return 'INR ' + Math.round(amount).toLocaleString('en-IN');
};

const compressImage = async (imageUrl: string, maxWidth: number, maxHeight: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = width * ratio;
        height = height * ratio;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } else {
        reject(new Error('Canvas context not available'));
      }
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
};

export const generateInvoicePDF = async (data: InvoiceData) => {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = 15;

  // --- 1. Header Section (Same as Quotation) ---
  
  // Logo - Top Left corner with rounded corners
  if (data.profile.logo_url) {
    try {
      const compressedLogo = await compressImage(data.profile.logo_url, 400, 400);
      const logoSize = 25;
      const cornerRadius = logoSize * 0.1;
      
      doc.setFillColor(0, 0, 0);
      doc.roundedRect(margin, yPosition, logoSize, logoSize, cornerRadius, cornerRadius, 'F');
      doc.addImage(compressedLogo, 'JPEG', margin, yPosition, logoSize, logoSize, undefined, 'FAST');
    } catch (e) { console.error(e); }
  }

  // Company Details - Top Right
  const companyInfoX = pageWidth - margin;
  let headerTextY = yPosition + 5;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
  doc.text((data.profile.company_name || 'COMPANY NAME').toUpperCase(), companyInfoX, headerTextY, { align: 'right' });
  
  headerTextY += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.TEXT_SECONDARY[0], COLORS.TEXT_SECONDARY[1], COLORS.TEXT_SECONDARY[2]);
  
  if (data.profile.address) {
    const addressLines = doc.splitTextToSize(data.profile.address, 90);
    addressLines.forEach((line: string) => {
      doc.text(line, companyInfoX, headerTextY, { align: 'right' });
      headerTextY += 4.5;
    });
  }
  
  const contactDetails = [];
  if (data.profile.phone) contactDetails.push(data.profile.phone);
  if (data.profile.email) contactDetails.push(data.profile.email);
  
  if (contactDetails.length > 0) {
    doc.text(contactDetails.join(' | '), companyInfoX, headerTextY, { align: 'right' });
    headerTextY += 4.5;
  }
  
  if (data.profile.gstin) {
    doc.setFont('helvetica', 'bold');
    doc.text(`GSTIN: ${data.profile.gstin}`, companyInfoX, headerTextY, { align: 'right' });
  }

  yPosition += 35;

  // --- 2. Info Cards (Client & Invoice Details) ---
  
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
  
  cardY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.TEXT_SECONDARY[0], COLORS.TEXT_SECONDARY[1], COLORS.TEXT_SECONDARY[2]);
  doc.text(data.projectName, cardContentX, cardY);

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
  if (data.dueDate) {
    addMeta('Due Date:', data.dueDate);
  }
  addMeta('Status:', data.status.toUpperCase());

  yPosition += cardHeight + 10;

  // --- 3. Payment Summary ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
  doc.text("PAYMENT SUMMARY", margin, yPosition);
  yPosition += 6;

  const summaryData = [
    ['Total Amount', formatCurrency(data.totalAmount)],
    ['Paid Amount', formatCurrency(data.paidAmount)],
    ['Remaining Amount', formatCurrency(data.remainingAmount)],
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
      if (cellData.column.index === 1 && cellData.section === 'body') {
        doc.setFillColor(COLORS.HIGHLIGHT[0], COLORS.HIGHLIGHT[1], COLORS.HIGHLIGHT[2]);
        doc.setTextColor(0, 0, 0);
      }
    },
    margin: { left: margin, right: margin }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // --- 4. Payment History ---
  if (data.payments && data.payments.length > 0) {
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
        if (cellData.column.index === 3 && cellData.section === 'body') {
          doc.setFillColor(COLORS.HIGHLIGHT[0], COLORS.HIGHLIGHT[1], COLORS.HIGHLIGHT[2]);
          doc.setTextColor(0, 0, 0);
        }
      },
      margin: { left: margin, right: margin }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // --- 5. Stagewise Payment Option ---
  if (data.profile.payment_stages && data.profile.payment_stages.length > 0) {
    if (yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = 15;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
    doc.text("STAGEWISE PAYMENT OPTION", margin, yPosition);
    yPosition += 6;

    const paymentStages = data.profile.payment_stages.map((stage: any) => [
      stage.stage,
      stage.milestone,
      `${stage.percentage}%`,
      formatCurrency(data.totalAmount * (stage.percentage / 100))
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Stage / Milestone', 'Payment %', 'Amount']],
      body: paymentStages,
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
        1: { cellWidth: 'auto', fontSize: 7 },
        2: { cellWidth: 22, halign: 'center', fontStyle: 'bold', fontSize: 7 },
        3: { cellWidth: 35, halign: 'right', fontStyle: 'bold', fontSize: 7 }
      },
      willDrawCell: (cellData) => {
        if (cellData.column.index === 3 && cellData.section === 'body') {
          doc.setFillColor(COLORS.HIGHLIGHT[0], COLORS.HIGHLIGHT[1], COLORS.HIGHLIGHT[2]);
          doc.setTextColor(0, 0, 0);
        }
      },
      margin: { left: margin, right: margin }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // --- 6. Terms & Conditions ---
  if (data.profile.invoice_terms_conditions && data.profile.invoice_terms_conditions.length > 0) {
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

  // --- 7. Signature & Footer ---
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

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
  doc.text("This invoice is computer-generated.", pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Save
  doc.save(`Invoice_${data.invoiceNumber}.pdf`);
};
