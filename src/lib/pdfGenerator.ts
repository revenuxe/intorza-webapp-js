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
      compressedLogo = await compressImage(data.companyLogo, 200, 160);
    } catch (error) {
      console.error('Logo compression error:', error);
    }
  }

  let compressedSignature: string | null = null;
  if (data.signatureUrl) {
    try {
      compressedSignature = await compressImage(data.signatureUrl, 240, 80);
    } catch (error) {
      console.error('Signature compression error:', error);
    }
  }

  // ============= ENHANCED HEADER =============
  const headerHeight = 48;
  const logoBoxWidth = 65;
  
  // Premium black logo section
  doc.setFillColor(0, 0, 0);
  const cornerRadius = 8;
  doc.roundedRect(margin, yPosition, logoBoxWidth, headerHeight, cornerRadius, cornerRadius, 'F');

  // Add logo centered in black box
  if (compressedLogo) {
    try {
      const logoSize = 40;
      const logoX = margin + (logoBoxWidth - logoSize) / 2;
      const logoY = yPosition + (headerHeight - logoSize) / 2;
      doc.addImage(compressedLogo, 'JPEG', logoX, logoY, logoSize, logoSize, undefined, 'FAST');
    } catch (error) {
      console.error('Logo add error:', error);
    }
  }

  // White company details section with enhanced styling
  const companyBoxX = margin + logoBoxWidth + 3;
  const companyBoxWidth = contentWidth - logoBoxWidth - 3;
  
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(companyBoxX, yPosition, companyBoxWidth, headerHeight, 5, 5, 'F');
  
  // Elegant border
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.8);
  doc.roundedRect(companyBoxX, yPosition, companyBoxWidth, headerHeight, 5, 5);

  // Company details with better alignment
  const companyTextX = companyBoxX + 10;
  let companyTextY = yPosition + 12;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(data.companyName || 'COMPANY NAME', companyTextX, companyTextY);

  companyTextY += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);

  if (data.companyAddress) {
    const addressLines = doc.splitTextToSize(data.companyAddress, companyBoxWidth - 20);
    doc.text(addressLines.slice(0, 1), companyTextX, companyTextY);
    companyTextY += 5;
  }
  if (data.companyPhone) {
    doc.text(`📞 ${data.companyPhone}`, companyTextX, companyTextY);
    companyTextY += 5;
  }
  if (data.companyEmail) {
    doc.text(`✉ ${data.companyEmail}`, companyTextX, companyTextY);
    companyTextY += 5;
  }
  if (data.gstin) {
    doc.setFont('helvetica', 'bold');
    doc.text(`GSTIN: ${data.gstin}`, companyTextX, companyTextY);
  }

  yPosition += headerHeight + 10;

  // Elegant divider
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 12;

  // ============= QUOTATION DETAILS PANEL =============
  const detailsPanelHeight = 52;
  
  doc.setFillColor(248, 248, 250);
  doc.roundedRect(margin, yPosition, contentWidth, detailsPanelHeight, 4, 4, 'F');
  
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPosition, contentWidth, detailsPanelHeight, 4, 4);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('QUOTATION DETAILS', margin + 6, yPosition + 9);

  const detailsStartY = yPosition + 18;
  const col1X = margin + 6;
  const col2X = margin + contentWidth / 2 + 4;
  const labelWidth = 35;
  const valueWidth = (contentWidth / 2) - labelWidth - 12;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);

  let rowY = detailsStartY;

  // Left column
  doc.setFont('helvetica', 'bold');
  doc.text('Project Name:', col1X, rowY);
  doc.setFont('helvetica', 'normal');
  const projectText = doc.splitTextToSize(data.quotationTitle || 'N/A', valueWidth);
  doc.text(projectText[0], col1X + labelWidth, rowY);

  rowY += 6.5;
  doc.setFont('helvetica', 'bold');
  doc.text('Client Name:', col1X, rowY);
  doc.setFont('helvetica', 'normal');
  const clientText = doc.splitTextToSize(data.clientName, valueWidth);
  doc.text(clientText[0], col1X + labelWidth, rowY);

  rowY += 6.5;
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

  rowY += 6.5;
  doc.setFont('helvetica', 'bold');
  doc.text('Valid Till:', col2X, rowY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.quotationValidTill, col2X + labelWidth, rowY);

  rowY += 6.5;
  doc.setFont('helvetica', 'bold');
  doc.text('Place of Project:', col2X, rowY);
  doc.setFont('helvetica', 'normal');
  const placeText = doc.splitTextToSize(data.placeOfProject, valueWidth);
  doc.text(placeText[0], col2X + labelWidth, rowY);

  rowY += 6.5;
  doc.setFont('helvetica', 'bold');
  doc.text('Project Type:', col2X, rowY);
  doc.setFont('helvetica', 'normal');
  const typeText = doc.splitTextToSize(data.projectType, valueWidth);
  doc.text(typeText[0], col2X + labelWidth, rowY);

  rowY += 6.5;
  doc.setFont('helvetica', 'bold');
  doc.text('Warranty:', col2X, rowY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.warranty} Years`, col2X + labelWidth, rowY);

  yPosition += detailsPanelHeight + 14;

  // ============= PROJECT SECTIONS & ITEMS =============
  for (const section of data.sections) {
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 15;
    }

    // Enhanced section header
    doc.setFillColor(240, 240, 242);
    doc.roundedRect(margin, yPosition, contentWidth, 10, 3, 3, 'F');
    
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, yPosition, contentWidth, 10, 3, 3);
    
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(section.title.toUpperCase(), margin + 6, yPosition + 7);
    
    yPosition += 13;

    // Enhanced table
    const tableData = section.items.map(item => [
      item.side || '-',
      item.productName,
      item.productDetails,
      item.widthFt.toFixed(1),
      item.heightFt.toFixed(1),
      item.sftArea.toFixed(2),
      '₹ ' + Math.round(item.amount).toLocaleString('en-IN')
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Side', 'Product Name', 'Product Details', 'Width\n(Ft)', 'Height\n(Ft)', 'SQFT', 'Amount']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [240, 240, 242],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 8.5,
        cellPadding: 5,
        halign: 'center',
        valign: 'middle',
        lineWidth: 0.2,
        lineColor: [210, 210, 210]
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 5,
        textColor: [40, 40, 40],
        lineWidth: 0.2,
        lineColor: [230, 230, 230],
        overflow: 'linebreak',
        cellWidth: 'wrap'
      },
      alternateRowStyles: {
        fillColor: [252, 252, 253]
      },
      columnStyles: {
        0: { cellWidth: 13, halign: 'center', overflow: 'linebreak' },
        1: { cellWidth: 32, halign: 'left', overflow: 'linebreak' },
        2: { cellWidth: 60, halign: 'left', overflow: 'linebreak' },
        3: { cellWidth: 16, halign: 'center' },
        4: { cellWidth: 16, halign: 'center' },
        5: { cellWidth: 16, halign: 'center' },
        6: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: [0, 0, 0], fontSize: 8.5 }
      },
      margin: { left: margin, right: margin },
      tableWidth: 'auto'
    });

    yPosition = (doc as any).lastAutoTable.finalY + 4;

    // Enhanced section total
    const totalBoxWidth = 75;
    const totalBoxX = pageWidth - margin - totalBoxWidth;
    
    doc.setFillColor(255, 250, 240);
    doc.roundedRect(totalBoxX, yPosition, totalBoxWidth, 9, 3, 3, 'F');
    
    doc.setDrawColor(245, 220, 180);
    doc.setLineWidth(0.5);
    doc.roundedRect(totalBoxX, yPosition, totalBoxWidth, 9, 3, 3);
    
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    const sectionTotal = section.items.reduce((sum, item) => sum + item.amount, 0);
    doc.text('SECTION TOTAL:', totalBoxX + 4, yPosition + 6);
    doc.text(`₹ ${Math.round(sectionTotal).toLocaleString('en-IN')}`, totalBoxX + totalBoxWidth - 4, yPosition + 6, { align: 'right' });
    
    yPosition += 16;
  }

  // ============= PAYMENT SUMMARY BOX =============
  if (yPosition > pageHeight - 70) {
    doc.addPage();
    yPosition = 15;
  }

  const summaryBoxWidth = 85;
  const summaryBoxX = pageWidth - margin - summaryBoxWidth;
  const summaryBoxHeight = data.discount > 0 ? 54 : 48;

  doc.setFillColor(255, 250, 240);
  doc.roundedRect(summaryBoxX, yPosition, summaryBoxWidth, summaryBoxHeight, 4, 4, 'F');

  doc.setDrawColor(240, 220, 190);
  doc.setLineWidth(0.8);
  doc.roundedRect(summaryBoxX, yPosition, summaryBoxWidth, summaryBoxHeight, 4, 4);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('PAYMENT SUMMARY', summaryBoxX + 6, yPosition + 8);

  let summaryY = yPosition + 16;
  const summaryLineHeight = 6.5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);

  doc.text('Subtotal:', summaryBoxX + 6, summaryY);
  doc.setFont('helvetica', 'bold');
  doc.text(`₹ ${Math.round(data.subtotal).toLocaleString('en-IN')}`, summaryBoxX + summaryBoxWidth - 6, summaryY, { align: 'right' });
  summaryY += summaryLineHeight;

  doc.setFont('helvetica', 'normal');
  if (data.discount > 0) {
    doc.text('Discount:', summaryBoxX + 6, summaryY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 50, 50);
    doc.text(`- ₹ ${Math.round(data.discount).toLocaleString('en-IN')}`, summaryBoxX + summaryBoxWidth - 6, summaryY, { align: 'right' });
    doc.setTextColor(40, 40, 40);
    summaryY += summaryLineHeight;
  }

  if (data.gstEnabled) {
    doc.setFont('helvetica', 'normal');
    doc.text(`GST (${data.gstRate}%):`, summaryBoxX + 6, summaryY);
    doc.setFont('helvetica', 'bold');
    doc.text(`₹ ${Math.round(data.gstAmount).toLocaleString('en-IN')}`, summaryBoxX + summaryBoxWidth - 6, summaryY, { align: 'right' });
    summaryY += summaryLineHeight;
  }

  // Elegant divider
  doc.setDrawColor(230, 210, 180);
  doc.setLineWidth(0.5);
  doc.line(summaryBoxX + 6, summaryY + 1.5, summaryBoxX + summaryBoxWidth - 6, summaryY + 1.5);
  summaryY += 6;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('GRAND TOTAL:', summaryBoxX + 6, summaryY);
  doc.setFontSize(13);
  doc.text(`₹ ${Math.round(data.grandTotal).toLocaleString('en-IN')}`, summaryBoxX + summaryBoxWidth - 6, summaryY, { align: 'right' });

  yPosition += summaryBoxHeight + 16;

  // ============= PROJECT DURATION =============
  if (yPosition > pageHeight - 40) {
    doc.addPage();
    yPosition = 15;
  }

  doc.setFillColor(245, 250, 255);
  doc.roundedRect(margin, yPosition, contentWidth, 12, 3, 3, 'F');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('PROJECT DURATION', margin + 6, yPosition + 8);
  
  yPosition += 16;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  const durationText = 'Project execution timeline begins after design finalization and typically completes within 30-45 days depending on project scope. Design phase duration varies based on project complexity and client approval timelines.';
  const durationLines = doc.splitTextToSize(durationText, contentWidth - 4);
  doc.text(durationLines, margin + 2, yPosition);
  yPosition += durationLines.length * 4 + 8;

  // ============= PAYMENT TIMELINE =============
  if (yPosition > pageHeight - 50) {
    doc.addPage();
    yPosition = 15;
  }

  doc.setFillColor(255, 250, 245);
  doc.roundedRect(margin, yPosition, contentWidth, 12, 3, 3, 'F');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('PAYMENT TIMELINE', margin + 6, yPosition + 8);
  
  yPosition += 16;

  const paymentSchedule = [
    '10% - Design Phase (Upon project commencement)',
    '40% - Production Phase (After design approval)',
    '30% - Material Dispatch (When materials arrive at site)',
    '15% - Hardware & Accessories (During installation)',
    '5% - Handover (On project completion)'
  ];

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);

  paymentSchedule.forEach((payment, index) => {
    if (yPosition > pageHeight - 15) {
      doc.addPage();
      yPosition = 15;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}.`, margin + 3, yPosition);
    doc.setFont('helvetica', 'normal');
    const paymentLines = doc.splitTextToSize(payment, contentWidth - 10);
    doc.text(paymentLines, margin + 8, yPosition);
    yPosition += paymentLines.length * 4 + 2;
  });

  yPosition += 6;

  // ============= HARDWARE SPECIFICATIONS =============
  if (yPosition > pageHeight - 40) {
    doc.addPage();
    yPosition = 15;
  }

  doc.setFillColor(250, 245, 255);
  doc.roundedRect(margin, yPosition, contentWidth, 12, 3, 3, 'F');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('HARDWARE SPECIFICATIONS', margin + 6, yPosition + 8);
  
  yPosition += 16;

  const hardwareSpecs = [
    'All hardware fittings will be EBCO brand as standard',
    'Hafele and Hettich fittings available at additional cost upon request',
    'Base unit kitchen cabinets: EBCO Soft Close Hinges (included)',
    'Loft cabinets: EBCO Normal Hinges (included)',
    'Soft Close hinges for loft cabinets available at extra cost'
  ];

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);

  hardwareSpecs.forEach(spec => {
    if (yPosition > pageHeight - 15) {
      doc.addPage();
      yPosition = 15;
    }
    
    const specLines = doc.splitTextToSize(`• ${spec}`, contentWidth - 4);
    doc.text(specLines, margin + 3, yPosition);
    yPosition += specLines.length * 4 + 2;
  });

  yPosition += 8;

  // ============= TERMS & CONDITIONS =============
  const addTermsSection = (title: string, bullets: string[]) => {
    if (yPosition > pageHeight - 35) {
      doc.addPage();
      yPosition = 15;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(title, margin, yPosition);
    yPosition += 6;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);

    bullets.forEach(bullet => {
      if (yPosition > pageHeight - 12) {
        doc.addPage();
        yPosition = 15;
      }
      
      const bulletLines = doc.splitTextToSize(`• ${bullet}`, contentWidth - 4);
      doc.text(bulletLines, margin + 3, yPosition);
      yPosition += bulletLines.length * 3.8 + 1.5;
    });

    yPosition += 4;
  };

  addTermsSection('MATERIAL DISPATCH & EXECUTION', [
    'Material dispatch within 2 working weeks after second stage payment',
    'Delivery schedules may vary with prior notice',
    'Service charges applicable after warranty period',
    'Design changes after finalization will incur additional costs',
    'All applicable taxes are additional to quoted prices',
    'Civil, plumbing, granite, and tiling work excluded from scope',
    'False ceiling lighting follows standard specifications',
    'Chimney and hob not included unless specified',
    'All 2D and 3D drawings must be approved before production'
  ]);

  addTermsSection('SITE READINESS REQUIREMENTS', [
    'Flooring, plastering, electrical, and plumbing must be complete before measurements',
    'Incomplete site work prevents accurate measurements and production',
    'Pre-possession planning: Design based on builder plans only, no site measurements',
    'Design services pause after layout approval until site is ready',
    'Prices valid for 6 months from 20% advance payment',
    'Site inspection sign-off required before installation begins',
    'Delays due to incomplete site work are client\'s responsibility'
  ]);

  addTermsSection('PAYMENT DELAY IMPLICATIONS', [
    'Payment delays move dispatch to next available cycle',
    'Storage charges of ₹5,000 per week apply after 2 weeks delay',
    'Warranty reduced by one month for delays exceeding 30 days'
  ]);

  addTermsSection('DESIGN PHASE TIMELINES', [
    'Execution timeline starts after complete design sign-off',
    'Design phase begins from 5% advance payment date',
    'First design meeting scheduled within 7-10 days if site ready',
    'Company delays beyond grace period: ₹5,000/month penalty (max 5% of project value)',
    'Client-side delays, vendor issues, and force majeure not counted as penalties'
  ]);

  addTermsSection('TECHNICAL MODIFICATIONS', [
    'Site conditions may require design modifications for practical implementation',
    'Changes proceed only with client approval',
    'Material limitations or structural constraints may necessitate adjustments'
  ]);

  addTermsSection('WARRANTY & SERVICE', [
    `Product warranties: 1-5 years depending on material and manufacturer`,
    'Transparent pricing with no hidden charges',
    'Execution follows approved drawings and specifications',
    `Dedicated team ensures timely project handover`
  ]);

  // ============= SIGNATURE SECTION =============
  if (yPosition > pageHeight - 50) {
    doc.addPage();
    yPosition = 15;
  }

  yPosition += 10;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 12;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('CUSTOMER ACCEPTANCE', margin, yPosition);
  yPosition += 7;

  const signBoxWidth = 75;
  const signBoxHeight = 35;

  // Customer signature
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, yPosition, signBoxWidth, signBoxHeight, 3, 3);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Customer Signature & Date', margin + 3, yPosition + signBoxHeight + 5);

  // Company signature
  const companySignX = pageWidth - margin - signBoxWidth;
  doc.roundedRect(companySignX, yPosition, signBoxWidth, signBoxHeight, 3, 3);

  if (compressedSignature) {
    try {
      doc.addImage(compressedSignature, 'JPEG', companySignX + 4, yPosition + 4, signBoxWidth - 8, signBoxHeight - 8, undefined, 'FAST');
    } catch (error) {
      console.error('Signature add error:', error);
    }
  }

  doc.text(`For ${data.companyName || 'Company'}`, companySignX + 3, yPosition + signBoxHeight + 5);

  // Footer
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(140, 140, 140);
  doc.text('This is a computer-generated quotation and does not require a physical signature for validity.', pageWidth / 2, pageHeight - 8, { align: 'center' });

  doc.save(`Quotation_${data.clientName.replace(/\s+/g, '_')}.pdf`);
};
