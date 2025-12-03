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

const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const compressImage = async (imageUrl: string, maxWidth: number, maxHeight: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
      }
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
};

export const generateInvoicePDF = async (data: InvoiceData) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let currentY = margin;

  // Colors
  const primaryColor: [number, number, number] = [0, 0, 0];
  const accentColor: [number, number, number] = [180, 142, 73];
  const highlightYellow: [number, number, number] = [255, 255, 150];
  const lightGray: [number, number, number] = [244, 244, 244];
  const softBeige: [number, number, number] = [243, 237, 229];

  // ===== HEADER SECTION =====
  const headerHeight = 45;
  const logoBoxWidth = 70;

  // Black background for logo
  doc.setFillColor(0, 0, 0);
  doc.roundedRect(margin, currentY, logoBoxWidth, headerHeight, 0, 8, 'F');

  // Company details on white background
  doc.setFillColor(255, 255, 255);
  doc.rect(margin + logoBoxWidth, currentY, pageWidth - margin * 2 - logoBoxWidth, headerHeight, 'F');

  // Add logo if available
  if (data.profile.logo_url) {
    try {
      const compressedLogo = await compressImage(data.profile.logo_url, 200, 150);
      const logoMaxWidth = logoBoxWidth - 16;
      const logoMaxHeight = headerHeight - 16;
      doc.addImage(compressedLogo, 'JPEG', margin + 8, currentY + 8, logoMaxWidth, logoMaxHeight);
    } catch (error) {
      console.error('Error loading logo:', error);
    }
  }

  // Company details text
  const detailsX = margin + logoBoxWidth + 10;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(data.profile.company_name || 'Your Company', detailsX, currentY + 12);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  
  let detailY = currentY + 18;
  if (data.profile.address) {
    const addressLines = doc.splitTextToSize(data.profile.address, pageWidth - margin * 2 - logoBoxWidth - 20);
    addressLines.forEach((line: string) => {
      doc.text(line, detailsX, detailY);
      detailY += 4;
    });
  }
  if (data.profile.phone) {
    doc.text(`Phone: ${data.profile.phone}`, detailsX, detailY);
    detailY += 4;
  }
  if (data.profile.email) {
    doc.text(`Email: ${data.profile.email}`, detailsX, detailY);
    detailY += 4;
  }
  if (data.profile.gstin) {
    doc.text(`GSTIN: ${data.profile.gstin}`, detailsX, detailY);
  }

  currentY += headerHeight + 10;

  // ===== INVOICE TITLE =====
  doc.setFillColor(...accentColor);
  doc.rect(margin, currentY, pageWidth - margin * 2, 10, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('INVOICE', pageWidth / 2, currentY + 7, { align: 'center' });
  currentY += 15;

  // ===== INFO CARDS =====
  const cardWidth = (pageWidth - margin * 2 - 8) / 2;
  const cardHeight = 40;

  // Client Info Card
  doc.setFillColor(...softBeige);
  doc.roundedRect(margin, currentY, cardWidth, cardHeight, 3, 3, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('BILL TO', margin + 6, currentY + 8);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(data.clientName, margin + 6, currentY + 16);
  doc.text(data.projectName, margin + 6, currentY + 22);

  // Invoice Details Card
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin + cardWidth + 8, currentY, cardWidth, cardHeight, 3, 3, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('INVOICE DETAILS', margin + cardWidth + 14, currentY + 8);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Invoice #: ${data.invoiceNumber}`, margin + cardWidth + 14, currentY + 16);
  doc.text(`Date: ${data.invoiceDate}`, margin + cardWidth + 14, currentY + 22);
  if (data.dueDate) {
    doc.text(`Due Date: ${data.dueDate}`, margin + cardWidth + 14, currentY + 28);
  }
  doc.text(`Status: ${data.status.toUpperCase()}`, margin + cardWidth + 14, currentY + 34);

  currentY += cardHeight + 12;

  // ===== PAYMENT SUMMARY =====
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('PAYMENT SUMMARY', margin, currentY);
  currentY += 8;

  const summaryData = [
    ['Total Amount', formatCurrency(data.totalAmount)],
    ['Paid Amount', formatCurrency(data.paidAmount)],
    ['Remaining Amount', formatCurrency(data.remainingAmount)],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Description', 'Amount']],
    body: summaryData,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
    headStyles: {
      fillColor: [237, 237, 237],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
    },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' },
    },
    didDrawCell: (cellData) => {
      // Highlight amounts in yellow
      if (cellData.section === 'body' && cellData.column.index === 1) {
        doc.setFillColor(...highlightYellow);
        doc.rect(cellData.cell.x, cellData.cell.y, cellData.cell.width, cellData.cell.height, 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(
          String(cellData.cell.text),
          cellData.cell.x + cellData.cell.width - 4,
          cellData.cell.y + cellData.cell.height / 2 + 1,
          { align: 'right' }
        );
      }
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  // ===== PAYMENT HISTORY =====
  if (data.payments && data.payments.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('PAYMENT HISTORY', margin, currentY);
    currentY += 8;

    const paymentRows = data.payments.map((payment, index) => [
      String(index + 1),
      payment.payment_date,
      payment.payment_method.toUpperCase(),
      formatCurrency(payment.amount),
      payment.notes || '-',
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Date', 'Method', 'Amount', 'Notes']],
      body: paymentRows,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [237, 237, 237],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 30 },
        2: { cellWidth: 30 },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 'auto' },
      },
      didDrawCell: (cellData) => {
        // Highlight amounts in yellow
        if (cellData.section === 'body' && cellData.column.index === 3) {
          doc.setFillColor(...highlightYellow);
          doc.rect(cellData.cell.x, cellData.cell.y, cellData.cell.width, cellData.cell.height, 'F');
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text(
            String(cellData.cell.text),
            cellData.cell.x + cellData.cell.width - 3,
            cellData.cell.y + cellData.cell.height / 2 + 1,
            { align: 'right' }
          );
        }
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;
  }

  // ===== STAGEWISE PAYMENT (if available) =====
  if (data.profile.payment_stages && data.profile.payment_stages.length > 0) {
    // Check if we need a new page
    if (currentY > pageHeight - 80) {
      doc.addPage();
      currentY = margin;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('STAGEWISE PAYMENT OPTION', margin, currentY);
    currentY += 8;

    const stageRows = data.profile.payment_stages.map((stage: any) => {
      const amount = (data.totalAmount * stage.percentage) / 100;
      return [stage.stage, stage.milestone, `${stage.percentage}%`, formatCurrency(amount)];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Stage', 'Milestone', 'Percentage', 'Amount']],
      body: stageRows,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [237, 237, 237],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 40, halign: 'right' },
      },
      didDrawCell: (cellData) => {
        if (cellData.section === 'body' && cellData.column.index === 3) {
          doc.setFillColor(...highlightYellow);
          doc.rect(cellData.cell.x, cellData.cell.y, cellData.cell.width, cellData.cell.height, 'F');
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text(
            String(cellData.cell.text),
            cellData.cell.x + cellData.cell.width - 3,
            cellData.cell.y + cellData.cell.height / 2 + 1,
            { align: 'right' }
          );
        }
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;
  }

  // ===== TERMS & CONDITIONS =====
  if (data.profile.invoice_terms_conditions && data.profile.invoice_terms_conditions.length > 0) {
    // Check if we need a new page
    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = margin;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('TERMS & CONDITIONS', margin, currentY);
    currentY += 8;

    data.profile.invoice_terms_conditions.forEach((term, termIndex) => {
      // Check for page break
      if (currentY > pageHeight - 30) {
        doc.addPage();
        currentY = margin;
      }

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text(`${termIndex + 1}. ${term.title}`, margin, currentY);
      currentY += 5;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);

      term.points.forEach((point) => {
        const bulletText = `• ${point}`;
        const lines = doc.splitTextToSize(bulletText, pageWidth - margin * 2 - 5);
        lines.forEach((line: string) => {
          if (currentY > pageHeight - 20) {
            doc.addPage();
            currentY = margin;
          }
          doc.text(line, margin + 5, currentY);
          currentY += 4;
        });
      });

      currentY += 3;
    });
  }

  // ===== SIGNATURE SECTION =====
  if (currentY > pageHeight - 50) {
    doc.addPage();
    currentY = margin;
  }

  currentY += 10;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  // Signature boxes
  const sigBoxWidth = (pageWidth - margin * 2 - 20) / 2;

  // Customer signature
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Customer Signature', margin, currentY);
  doc.line(margin, currentY + 15, margin + sigBoxWidth, currentY + 15);
  doc.text('Name: ________________________', margin, currentY + 22);
  doc.text('Date: ________________________', margin, currentY + 28);

  // Authorized signature
  doc.text('Authorized Signature', pageWidth - margin - sigBoxWidth, currentY);
  
  if (data.profile.signature_url) {
    try {
      const compressedSig = await compressImage(data.profile.signature_url, 150, 80);
      doc.addImage(compressedSig, 'JPEG', pageWidth - margin - sigBoxWidth, currentY + 3, 40, 12);
    } catch (error) {
      console.error('Error loading signature:', error);
    }
  }
  
  doc.line(pageWidth - margin - sigBoxWidth, currentY + 15, pageWidth - margin, currentY + 15);
  doc.text(`For ${data.profile.company_name || 'Company'}`, pageWidth - margin - sigBoxWidth, currentY + 22);

  // ===== FOOTER =====
  const footerY = pageHeight - 10;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('This is a computer-generated document. No signature is required.', pageWidth / 2, footerY, { align: 'center' });

  // Save the PDF
  doc.save(`Invoice_${data.invoiceNumber}.pdf`);
};
