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

// Compress images to reduce PDF size
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
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      } else {
        reject(new Error('Canvas context not available'));
      }
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
};

export const generateQuotationPDF = async (data: QuotationData) => {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 15;

  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  // Compress images
  let compressedLogo: string | null = null;
  if (data.companyLogo) {
    try {
      compressedLogo = await compressImage(data.companyLogo, 180, 140);
    } catch (error) {
      console.error('Logo compression error:', error);
    }
  }

  let compressedSignature: string | null = null;
  if (data.signatureUrl) {
    try {
      compressedSignature = await compressImage(data.signatureUrl, 220, 70);
    } catch (error) {
      console.error('Signature compression error:', error);
    }
  }

  // ============= PREMIUM HEADER =============
  const headerHeight = 45;
  const logoBoxWidth = 60;
  
  // Black logo box - left side with rounded right corners
  doc.setFillColor(0, 0, 0);
  doc.rect(margin, yPosition, logoBoxWidth, headerHeight, 'F');
  
  // Rounded corners on right side only
  doc.setFillColor(0, 0, 0);
  const cornerRadius = 10;
  doc.roundedRect(margin + logoBoxWidth - cornerRadius, yPosition, cornerRadius, headerHeight, cornerRadius, cornerRadius, 'F');

  // Add logo centered in black box
  if (compressedLogo) {
    try {
      const logoSize = 38;
      const logoX = margin + (logoBoxWidth - logoSize) / 2;
      const logoY = yPosition + (headerHeight - logoSize) / 2;
      doc.addImage(compressedLogo, 'JPEG', logoX, logoY, logoSize, logoSize, undefined, 'FAST');
    } catch (error) {
      console.error('Logo add error:', error);
    }
  }

  // White company details box - right side
  const companyBoxX = margin + logoBoxWidth;
  const companyBoxWidth = contentWidth - logoBoxWidth;
  
  doc.setFillColor(255, 255, 255);
  doc.rect(companyBoxX, yPosition, companyBoxWidth, headerHeight, 'F');
  
  // Subtle border around company box
  doc.setDrawColor(240, 240, 240);
  doc.setLineWidth(0.5);
  doc.rect(companyBoxX, yPosition, companyBoxWidth, headerHeight);

  // Company details
  const companyTextX = companyBoxX + 8;
  let companyTextY = yPosition + 10;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(data.companyName || 'COMPANY NAME', companyTextX, companyTextY);

  companyTextY += 7;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 70);

  if (data.companyAddress) {
    const addressLines = doc.splitTextToSize(data.companyAddress, companyBoxWidth - 16);
    doc.text(addressLines.slice(0, 1), companyTextX, companyTextY);
    companyTextY += 4.5;
  }
  if (data.companyPhone) {
    doc.text(`Phone: ${data.companyPhone}`, companyTextX, companyTextY);
    companyTextY += 4.5;
  }
  if (data.companyEmail) {
    doc.text(`Email: ${data.companyEmail}`, companyTextX, companyTextY);
    companyTextY += 4.5;
  }
  if (data.gstin) {
    doc.text(`GSTIN: ${data.gstin}`, companyTextX, companyTextY);
  }

  yPosition += headerHeight + 8;

  // Thin divider line
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // ============= QUOTATION DETAILS PANEL =============
  const detailsPanelHeight = 48;
  
  doc.setFillColor(244, 244, 244);
  doc.roundedRect(margin, yPosition, contentWidth, detailsPanelHeight, 3, 3, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('QUOTATION DETAILS', margin + 5, yPosition + 8);

  const detailsStartY = yPosition + 16;
  const col1X = margin + 5;
  const col2X = margin + contentWidth / 2 + 3;
  const labelWidth = 32;
  const valueWidth = (contentWidth / 2) - labelWidth - 10;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);

  let rowY = detailsStartY;

  // Left column
  doc.setFont('helvetica', 'bold');
  doc.text('Project Name:', col1X, rowY);
  doc.setFont('helvetica', 'normal');
  const projectText = doc.splitTextToSize(data.quotationTitle || 'N/A', valueWidth);
  doc.text(projectText[0], col1X + labelWidth, rowY);

  rowY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Client Name:', col1X, rowY);
  doc.setFont('helvetica', 'normal');
  const clientText = doc.splitTextToSize(data.clientName, valueWidth);
  doc.text(clientText[0], col1X + labelWidth, rowY);

  rowY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Client Address:', col1X, rowY);
  doc.setFont('helvetica', 'normal');
  const addressText = doc.splitTextToSize(data.clientAddress, valueWidth);
  doc.text(addressText.slice(0, 2), col1X + labelWidth, rowY);

  // Right column
  rowY = detailsStartY;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Date of Proposal:', col2X, rowY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.dateOfProposal, col2X + labelWidth, rowY);

  rowY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Valid Till:', col2X, rowY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.quotationValidTill, col2X + labelWidth, rowY);

  rowY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Place of Project:', col2X, rowY);
  doc.setFont('helvetica', 'normal');
  const placeText = doc.splitTextToSize(data.placeOfProject, valueWidth);
  doc.text(placeText[0], col2X + labelWidth, rowY);

  rowY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Project Type:', col2X, rowY);
  doc.setFont('helvetica', 'normal');
  const typeText = doc.splitTextToSize(data.projectType, valueWidth);
  doc.text(typeText[0], col2X + labelWidth, rowY);

  rowY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Warranty:', col2X, rowY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.warranty} Years`, col2X + labelWidth, rowY);

  yPosition += detailsPanelHeight + 12;

  // ============= PROJECT SECTIONS & ITEMS =============
  for (const section of data.sections) {
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 15;
    }

    // Section header
    doc.setFillColor(237, 237, 237);
    doc.roundedRect(margin, yPosition, contentWidth, 9, 2, 2, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(section.title.toUpperCase(), margin + 5, yPosition + 6);
    
    yPosition += 12;

    // Table data
    const tableData = section.items.map(item => [
      item.side || '-',
      item.productName,
      item.productDetails,
      item.widthFt.toFixed(1),
      item.heightFt.toFixed(1),
      item.sftArea.toFixed(2),
      item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Side', 'Product Name', 'Product Details', 'Width\n(Ft)', 'Height\n(Ft)', 'SQFT', 'Amount (₹)']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [237, 237, 237],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 4,
        halign: 'center',
        valign: 'middle',
        lineWidth: 0.1,
        lineColor: [220, 220, 220]
      },
      bodyStyles: {
        fontSize: 7.5,
        cellPadding: 4,
        textColor: [50, 50, 50],
        lineWidth: 0.1,
        lineColor: [230, 230, 230],
        overflow: 'linebreak',
        cellWidth: 'wrap'
      },
      alternateRowStyles: {
        fillColor: [252, 252, 252]
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center', overflow: 'linebreak' },
        1: { cellWidth: 30, halign: 'left', overflow: 'linebreak' },
        2: { cellWidth: 62, halign: 'left', overflow: 'linebreak' },
        3: { cellWidth: 15, halign: 'center' },
        4: { cellWidth: 15, halign: 'center' },
        5: { cellWidth: 15, halign: 'center' },
        6: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: [0, 0, 0] }
      },
      margin: { left: margin, right: margin },
      tableWidth: 'auto',
      didDrawPage: function(data) {
        // Ensure proper pagination
      }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 3;

    // Section total with beige background
    const totalBoxWidth = 70;
    const totalBoxX = pageWidth - margin - totalBoxWidth;
    
    doc.setFillColor(243, 237, 229);
    doc.roundedRect(totalBoxX, yPosition, totalBoxWidth, 8, 2, 2, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    const sectionTotal = section.items.reduce((sum, item) => sum + item.amount, 0);
    doc.text('SECTION TOTAL:', totalBoxX + 3, yPosition + 5.5);
    doc.text(`₹${sectionTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, totalBoxX + totalBoxWidth - 3, yPosition + 5.5, { align: 'right' });
    
    yPosition += 14;
  }

  // ============= PAYMENT SUMMARY BOX =============
  if (yPosition > pageHeight - 65) {
    doc.addPage();
    yPosition = 15;
  }

  const summaryBoxWidth = 80;
  const summaryBoxX = pageWidth - margin - summaryBoxWidth;
  const summaryBoxHeight = data.discount > 0 ? 50 : 45;

  doc.setFillColor(243, 237, 229);
  doc.roundedRect(summaryBoxX, yPosition, summaryBoxWidth, summaryBoxHeight, 3, 3, 'F');

  // Subtle border
  doc.setDrawColor(230, 220, 210);
  doc.setLineWidth(0.3);
  doc.roundedRect(summaryBoxX, yPosition, summaryBoxWidth, summaryBoxHeight, 3, 3);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('PAYMENT SUMMARY', summaryBoxX + 5, yPosition + 7);

  let summaryY = yPosition + 14;
  const summaryLineHeight = 6;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);

  doc.text('Subtotal:', summaryBoxX + 5, summaryY);
  doc.text(`₹${data.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryBoxX + summaryBoxWidth - 5, summaryY, { align: 'right' });
  summaryY += summaryLineHeight;

  if (data.discount > 0) {
    doc.text('Discount:', summaryBoxX + 5, summaryY);
    doc.text(`-₹${data.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryBoxX + summaryBoxWidth - 5, summaryY, { align: 'right' });
    summaryY += summaryLineHeight;
  }

  if (data.gstEnabled) {
    doc.text(`GST (${data.gstRate}%):`, summaryBoxX + 5, summaryY);
    doc.text(`₹${data.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryBoxX + summaryBoxWidth - 5, summaryY, { align: 'right' });
    summaryY += summaryLineHeight;
  }

  // Divider
  doc.setDrawColor(230, 220, 210);
  doc.setLineWidth(0.3);
  doc.line(summaryBoxX + 5, summaryY + 1, summaryBoxX + summaryBoxWidth - 5, summaryY + 1);
  summaryY += 5;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('GRAND TOTAL:', summaryBoxX + 5, summaryY);
  doc.text(`₹${data.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryBoxX + summaryBoxWidth - 5, summaryY, { align: 'right' });

  yPosition += summaryBoxHeight + 14;

  // ============= TERMS & CONDITIONS =============
  const addTermsSection = (title: string, bullets: string[]) => {
    if (yPosition > pageHeight - 35) {
      doc.addPage();
      yPosition = 15;
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(title, margin, yPosition);
    yPosition += 5;

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(70, 70, 70);

    bullets.forEach(bullet => {
      if (yPosition > pageHeight - 12) {
        doc.addPage();
        yPosition = 15;
      }
      
      const bulletLines = doc.splitTextToSize(`• ${bullet}`, contentWidth - 4);
      doc.text(bulletLines, margin + 3, yPosition);
      yPosition += bulletLines.length * 3.5 + 1.5;
    });

    yPosition += 3;
  };

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('PROJECT DURATION FOR 30 DAYS (AFTER DESIGN PHASE)', margin, yPosition);
  yPosition += 6;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 70);
  const introText = 'You have visualized your ideal home and decided to make it real. Once you finalize your design, the 30-day execution countdown begins. Below is the complete process and conditions.';
  const introLines = doc.splitTextToSize(introText, contentWidth);
  doc.text(introLines, margin, yPosition);
  yPosition += introLines.length * 3.5 + 6;

  addTermsSection('MATERIAL DISPATCH & EXECUTION PROCESS', [
    'After receiving the second stage payment, the material will be dispatched within 2 working weeks.',
    'The delivery schedule may vary with prior notice.',
    'Service charges apply after two years.',
    'Any design changes requested after finalization will incur extra cost.',
    'All applicable taxes are additional.',
    'Civil, plumbing, granite, and tiling work are not included.',
    'False ceiling light styles will follow standard specifications.',
    'Chimney and hob are not included.',
    'All 2D and 3D drawings must be approved before production begins.'
  ]);

  addTermsSection('SITE READINESS – IMPORTANT REQUIREMENT', [
    'Before measurements can be taken, flooring, wall plastering, electrical and plumbing work MUST be fully completed.',
    'If any of the above are incomplete: Measurements cannot be taken, drawings and production accuracy cannot be guaranteed, designer will not begin detailing.',
    'Special Case (Pre-Possession Planning): If the client wants design finalization before possession, no on-site measurements will be taken.',
    'Layout and elevations will be made only using builder floor plans.',
    'Design discussions pause after layout and elevation approval. Invoice for the next payment stage will be issued.',
    'Revised civil/electrical/plumbing drawings will be provided after payment.',
    'Design services remain paused until site is fully ready.',
    'Prices remain valid for 6 months after 20% payment.',
    'Before installation begins, flooring, wall plastering, electrical and plumbing work, and site inspection sign-off MUST be completed.',
    'If the site is not ready: Execution and installation cannot begin. Any delay caused due to incomplete site work is the client\'s responsibility.'
  ]);

  addTermsSection('IMPLICATIONS OF PAYMENT DELAY', [
    'Delay during Dispatch Stage: If payment is delayed, dispatch will be moved to the next available dispatch cycle (may be longer than the days delayed).',
    'Delay exceeding 2 weeks: Storage charges of ₹5,000 per week apply.',
    'Delay exceeding 1 month: Product warranty will be reduced by one full month.'
  ]);

  addTermsSection('DESIGN PHASE TIMELINES & DELAY POLICY', [
    'Execution timelines (30/45/60/90 days) begin after design sign-off, not after the first payment.',
    'Design Phase Start: Begins on the date the 5% advance payment is received.',
    'Design Phase Completion: Achieved when the client approves all drawings and the 55% payment is received.',
    'First Two Weeks Include: Welcome call, scheduling site visits (if site ready), designer assignment, first designer–client communication, first design meeting (within 7–10 days if possible).',
    'Delays NOT Counted Under Penalty: Client-side vendors, site not ready, client payment delays, client not providing timely selections, builder delays, client delays in approving quotation, force majeure situations.',
    'Company-Side Delay Penalty: Two-week grace period. After grace: ₹5,000 per month (pro-rata). Penalty cannot exceed 5% of total project value.',
    'No additional compensation is provided beyond this.'
  ]);

  addTermsSection('CHANGES DURING EXECUTION DUE TO TECHNICAL LIMITATION', [
    'Actual site conditions may require modifications to the approved design due to material limitations, installation feasibility, or structural constraints.',
    'The client will be informed, and changes will proceed only with approval.'
  ]);

  addTermsSection('SERVICE, WARRANTY & TRANSPARENCY', [
    'Product warranties range from 1 to 5 years, depending on material and manufacturer.',
    'The entire price is transparent with no hidden charges.',
    'All execution work will follow agreed drawings and specifications.',
    `A dedicated team from ${data.companyName || 'our company'} ensures timely handover.`
  ]);

  // ============= SIGNATURE SECTION =============
  if (yPosition > pageHeight - 45) {
    doc.addPage();
    yPosition = 15;
  }

  yPosition += 8;

  // Thin divider
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('CUSTOMER ACCEPTANCE', margin, yPosition);
  yPosition += 6;

  const signBoxWidth = 70;
  const signBoxHeight = 32;

  // Customer signature box
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPosition, signBoxWidth, signBoxHeight, 2, 2);
  
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('Customer Signature', margin + 3, yPosition + signBoxHeight + 5);

  // Company signature box
  const companySignX = pageWidth - margin - signBoxWidth;
  doc.roundedRect(companySignX, yPosition, signBoxWidth, signBoxHeight, 2, 2);

  // Add compressed signature
  if (compressedSignature) {
    try {
      doc.addImage(compressedSignature, 'JPEG', companySignX + 3, yPosition + 3, signBoxWidth - 6, signBoxHeight - 6, undefined, 'FAST');
    } catch (error) {
      console.error('Signature add error:', error);
    }
  }

  doc.text(`For ${data.companyName || 'Company'}`, companySignX + 3, yPosition + signBoxHeight + 5);

  // Footer
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(160, 160, 160);
  doc.text('This is a computer-generated quotation.', pageWidth / 2, pageHeight - 8, { align: 'center' });

  // Save with maximum compression
  doc.save(`Quotation_${data.clientName.replace(/\s+/g, '_')}.pdf`);
};
