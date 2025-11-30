import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface LineItem {
  side: string;
  productName: string;
  productDetails: string;
  widthFt: number;
  heightFt: number;
  sftArea: number;
  ratePerSft: number;
  amount: number;
}

interface Section {
  title: string;
  items: LineItem[];
}

interface QuotationData {
  quotationTitle: string;
  clientName: string;
  clientAddress: string;
  dateOfProposal: string;
  quotationValidTill: string;
  placeOfProject: string;
  warranty: string;
  projectType: string;
  sections: Section[];
  subtotal: number;
  gstEnabled: boolean;
  gstRate: number;
  gstAmount: number;
  discount: number;
  grandTotal: number;
  companyLogo?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  gstin?: string;
  professionalAdvantages?: string;
  signatureUrl?: string;
}

// Helper function to compress and optimize images
const compressImage = async (imageUrl: string, maxWidth: number, maxHeight: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions maintaining aspect ratio
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
        // Compress to JPEG at 80% quality
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } else {
        reject(new Error('Canvas context not available'));
      }
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
};

export const generateQuotationPDF = async (data: QuotationData) => {
  // Initialize PDF with compression
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 12;

  const margin = 12;
  const contentWidth = pageWidth - (margin * 2);

  // Compress logo if available
  let compressedLogo: string | null = null;
  if (data.companyLogo) {
    try {
      compressedLogo = await compressImage(data.companyLogo, 200, 160);
    } catch (error) {
      console.error('Error compressing logo:', error);
    }
  }

  // Compress signature if available
  let compressedSignature: string | null = null;
  if (data.signatureUrl) {
    try {
      compressedSignature = await compressImage(data.signatureUrl, 240, 80);
    } catch (error) {
      console.error('Error compressing signature:', error);
    }
  }

  // ============= PREMIUM HEADER =============
  const logoBoxWidth = 55;
  const logoBoxHeight = 40;
  const companyBoxX = margin + logoBoxWidth + 3;
  const companyBoxWidth = contentWidth - logoBoxWidth - 3;

  // Black background for logo
  doc.setFillColor(0, 0, 0);
  doc.roundedRect(margin, yPosition, logoBoxWidth, logoBoxHeight, 2, 2, 'F');

  // Add compressed logo
  if (compressedLogo) {
    try {
      doc.addImage(compressedLogo, 'JPEG', margin + 3, yPosition + 3, logoBoxWidth - 6, logoBoxHeight - 6, undefined, 'FAST');
    } catch (error) {
      console.error('Error adding logo:', error);
    }
  }

  // Company details box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.3);
  doc.roundedRect(companyBoxX, yPosition, companyBoxWidth, logoBoxHeight, 2, 2, 'FD');

  // Company name
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(data.companyName || 'COMPANY NAME', companyBoxX + 4, yPosition + 7);

  // Company details
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  
  let companyY = yPosition + 13;
  const maxCompanyWidth = companyBoxWidth - 8;
  
  if (data.companyAddress) {
    const addressLines = doc.splitTextToSize(data.companyAddress, maxCompanyWidth);
    doc.text(addressLines.slice(0, 2), companyBoxX + 4, companyY);
    companyY += Math.min(addressLines.length, 2) * 3.5;
  }
  if (data.companyPhone) {
    doc.text(`Phone: ${data.companyPhone}`, companyBoxX + 4, companyY);
    companyY += 3.5;
  }
  if (data.companyEmail) {
    doc.text(`Email: ${data.companyEmail}`, companyBoxX + 4, companyY);
    companyY += 3.5;
  }
  if (data.gstin) {
    doc.text(`GSTIN: ${data.gstin}`, companyBoxX + 4, companyY);
  }

  yPosition += logoBoxHeight + 6;

  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 6;

  // ============= QUOTATION DETAILS BOX =============
  const detailsBoxHeight = 42;
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, yPosition, contentWidth, detailsBoxHeight, 2, 2, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('QUOTATION DETAILS', margin + 3, yPosition + 6);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);

  const detailsY = yPosition + 11;
  const col1X = margin + 3;
  const col2X = margin + contentWidth / 2 + 2;
  const labelWidth = 28;

  // Left column
  doc.setFont('helvetica', 'bold');
  doc.text('Project Name:', col1X, detailsY);
  doc.setFont('helvetica', 'normal');
  const projectNameText = doc.splitTextToSize(data.quotationTitle || 'N/A', contentWidth / 2 - labelWidth - 8);
  doc.text(projectNameText[0], col1X + labelWidth, detailsY);

  doc.setFont('helvetica', 'bold');
  doc.text('Client Name:', col1X, detailsY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.clientName, col1X + labelWidth, detailsY + 5);

  doc.setFont('helvetica', 'bold');
  doc.text('Client Address:', col1X, detailsY + 10);
  doc.setFont('helvetica', 'normal');
  const addressText = doc.splitTextToSize(data.clientAddress, contentWidth / 2 - labelWidth - 8);
  doc.text(addressText.slice(0, 2), col1X + labelWidth, detailsY + 10);

  // Right column
  doc.setFont('helvetica', 'bold');
  doc.text('Date of Proposal:', col2X, detailsY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.dateOfProposal, col2X + 30, detailsY);

  doc.setFont('helvetica', 'bold');
  doc.text('Valid Till:', col2X, detailsY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.quotationValidTill, col2X + 30, detailsY + 5);

  doc.setFont('helvetica', 'bold');
  doc.text('Place of Project:', col2X, detailsY + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.placeOfProject, col2X + 30, detailsY + 10);

  doc.setFont('helvetica', 'bold');
  doc.text('Project Type:', col2X, detailsY + 15);
  doc.setFont('helvetica', 'normal');
  const projectTypeText = doc.splitTextToSize(data.projectType, contentWidth / 2 - 35);
  doc.text(projectTypeText[0], col2X + 30, detailsY + 15);

  doc.setFont('helvetica', 'bold');
  doc.text('Warranty:', col2X, detailsY + 20);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.warranty} Years`, col2X + 30, detailsY + 20);

  yPosition += detailsBoxHeight + 6;

  // ============= PROJECT SECTIONS & ITEMS =============
  for (const section of data.sections) {
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = 12;
    }

    // Section header
    doc.setFillColor(238, 238, 238);
    doc.roundedRect(margin, yPosition, contentWidth, 8, 1.5, 1.5, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(section.title.toUpperCase(), margin + 3, yPosition + 5.5);
    yPosition += 10;

    // Items table
    const tableData = section.items.map(item => [
      item.side,
      item.productName,
      item.productDetails.substring(0, 80) + (item.productDetails.length > 80 ? '...' : ''),
      item.widthFt.toFixed(1),
      item.heightFt.toFixed(1),
      item.sftArea.toFixed(2),
      `₹${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Side', 'Product Name', 'Product Details', 'Width\n(Ft)', 'Height\n(Ft)', 'Sft\nArea', 'Amount']],
      body: tableData,
      theme: 'plain',
      headStyles: {
        fillColor: [238, 238, 238],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: 2,
        halign: 'left',
        lineWidth: 0.1,
        lineColor: [200, 200, 200]
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 2,
        textColor: [40, 40, 40],
        lineWidth: 0.1,
        lineColor: [230, 230, 230]
      },
      alternateRowStyles: {
        fillColor: [252, 252, 252]
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 28 },
        2: { cellWidth: 60 },
        3: { cellWidth: 13, halign: 'center' },
        4: { cellWidth: 13, halign: 'center' },
        5: { cellWidth: 13, halign: 'center' },
        6: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: [0, 0, 0] }
      },
      margin: { left: margin, right: margin },
      tableLineWidth: 0.1,
      tableLineColor: [200, 200, 200]
    });

    yPosition = (doc as any).lastAutoTable.finalY + 2;

    // Section total
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    const sectionTotal = section.items.reduce((sum, item) => sum + item.amount, 0);
    doc.text(`SECTION TOTAL: ₹${sectionTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 8;
  }

  // ============= PAYMENT SUMMARY BOX =============
  if (yPosition > pageHeight - 60) {
    doc.addPage();
    yPosition = 12;
  }

  const summaryWidth = 75;
  const summaryX = pageWidth - margin - summaryWidth;

  doc.setFillColor(245, 240, 235);
  doc.setDrawColor(220, 215, 210);
  doc.setLineWidth(0.3);
  doc.roundedRect(summaryX, yPosition, summaryWidth, 42, 2, 2, 'FD');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('PAYMENT SUMMARY', summaryX + 3, yPosition + 6);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);

  let summaryY = yPosition + 12;
  const summaryLineHeight = 5;

  doc.text('Subtotal:', summaryX + 3, summaryY);
  doc.text(`₹${data.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryX + summaryWidth - 3, summaryY, { align: 'right' });
  summaryY += summaryLineHeight;

  if (data.discount > 0) {
    doc.text('Discount:', summaryX + 3, summaryY);
    doc.text(`-₹${data.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryX + summaryWidth - 3, summaryY, { align: 'right' });
    summaryY += summaryLineHeight;
  }

  if (data.gstEnabled) {
    doc.text(`GST (${data.gstRate}%):`, summaryX + 3, summaryY);
    doc.text(`₹${data.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryX + summaryWidth - 3, summaryY, { align: 'right' });
    summaryY += summaryLineHeight;
  }

  // Divider line
  doc.setDrawColor(220, 215, 210);
  doc.line(summaryX + 3, summaryY + 1, summaryX + summaryWidth - 3, summaryY + 1);
  summaryY += 5;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('GRAND TOTAL:', summaryX + 3, summaryY);
  doc.text(`₹${data.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryX + summaryWidth - 3, summaryY, { align: 'right' });

  yPosition += 50;

  // ============= TERMS & CONDITIONS =============
  if (yPosition > pageHeight - 50) {
    doc.addPage();
    yPosition = 12;
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('PROJECT DURATION FOR 30 DAYS (AFTER DESIGN PHASE)', margin, yPosition);
  yPosition += 6;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  const durationText = 'You have visualized your ideal home and decided to make it real. Once you finalize your design, the 30-day execution countdown begins.';
  const durationLines = doc.splitTextToSize(durationText, contentWidth);
  doc.text(durationLines, margin, yPosition);
  yPosition += durationLines.length * 3.5 + 5;

  const addTermsSection = (title: string, points: string[]) => {
    if (yPosition > pageHeight - 30) {
      doc.addPage();
      yPosition = 12;
    }

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(title, margin, yPosition);
    yPosition += 4;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);

    points.forEach(point => {
      if (yPosition > pageHeight - 10) {
        doc.addPage();
        yPosition = 12;
      }
      const lines = doc.splitTextToSize(`• ${point}`, contentWidth - 2);
      doc.text(lines, margin + 2, yPosition);
      yPosition += lines.length * 3 + 1;
    });

    yPosition += 2;
  };

  addTermsSection('MATERIAL DISPATCH & EXECUTION', [
    'Material dispatched within 2 weeks after second payment. Delivery schedule may vary.',
    'Service charges apply after two years. Design changes after finalization incur extra cost.',
    'Civil, plumbing, granite work not included. All 2D/3D drawings must be approved first.'
  ]);

  addTermsSection('SITE READINESS REQUIREMENT', [
    'Flooring, plastering, electrical/plumbing must be complete before measurements.',
    'Pre-possession: Layouts made from builder plans only. Services pause until site ready.',
    'Installation cannot begin if site not ready. Delays are client responsibility.'
  ]);

  addTermsSection('PAYMENT DELAY IMPLICATIONS', [
    'Delayed payment: Dispatch moved to next cycle. 2+ weeks: ₹5,000/week storage.',
    '1+ month delay: Warranty reduced by one month.'
  ]);

  addTermsSection('DESIGN PHASE & DELAYS', [
    'Execution starts after design sign-off, not first payment.',
    'Company delays after 2-week grace: ₹5,000/month (max 5% project value).',
    'Client/builder/site delays: No penalty applied.'
  ]);

  addTermsSection('WARRANTY & TRANSPARENCY', [
    `Warranties: 1-5 years per product. Transparent pricing. ${data.companyName || 'We'} ensure timely handover.`
  ]);

  // ============= SIGNATURE SECTION =============
  if (yPosition > pageHeight - 40) {
    doc.addPage();
    yPosition = 12;
  }

  yPosition += 6;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 6;

  const signatureBoxWidth = 65;
  const signatureBoxHeight = 30;
  const signatureY = yPosition;

  // Customer signature box
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, signatureY, signatureBoxWidth, signatureBoxHeight, 1.5, 1.5);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Customer Signature', margin + 2, signatureY + signatureBoxHeight + 4);

  // Company signature box
  const companyBoxSignX = pageWidth - margin - signatureBoxWidth;
  doc.roundedRect(companyBoxSignX, signatureY, signatureBoxWidth, signatureBoxHeight, 1.5, 1.5);

  // Add compressed signature
  if (compressedSignature) {
    try {
      doc.addImage(compressedSignature, 'JPEG', companyBoxSignX + 2, signatureY + 2, signatureBoxWidth - 4, signatureBoxHeight - 4, undefined, 'FAST');
    } catch (error) {
      console.error('Error adding signature:', error);
    }
  }

  doc.text(`For ${data.companyName || 'Company'}`, companyBoxSignX + 2, signatureY + signatureBoxHeight + 4);

  // Footer
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(150, 150, 150);
  doc.text('This is a computer-generated quotation.', pageWidth / 2, pageHeight - 6, { align: 'center' });

  // Save with compression
  doc.save(`Quotation_${data.clientName.replace(/\s+/g, '_')}.pdf`);
};
