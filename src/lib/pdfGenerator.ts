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

export const generateQuotationPDF = async (data: QuotationData) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 10;

  const leftMargin = 15;
  const rightMargin = 15;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  // ============= PREMIUM HEADER =============
  // Black logo section on left
  doc.setFillColor(0, 0, 0);
  doc.roundedRect(leftMargin, yPosition, 60, 45, 3, 3, 'F');

  // Add logo inside black box if available
  if (data.companyLogo) {
    try {
      const img = new Image();
      img.src = data.companyLogo;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      doc.addImage(data.companyLogo, 'PNG', leftMargin + 5, yPosition + 5, 50, 35);
    } catch (error) {
      console.error('Error loading logo:', error);
    }
  }

  // Company details on right with white background
  const companyDetailsX = leftMargin + 65;
  doc.setFillColor(255, 255, 255);
  doc.rect(companyDetailsX, yPosition, contentWidth - 65, 45);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(data.companyName || 'COMPANY NAME', companyDetailsX + 5, yPosition + 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  
  let companyY = yPosition + 15;
  if (data.companyAddress) {
    const addressLines = doc.splitTextToSize(data.companyAddress, 110);
    doc.text(addressLines, companyDetailsX + 5, companyY);
    companyY += addressLines.length * 4;
  }
  if (data.companyPhone) {
    doc.text(`Phone: ${data.companyPhone}`, companyDetailsX + 5, companyY);
    companyY += 4;
  }
  if (data.companyEmail) {
    doc.text(`Email: ${data.companyEmail}`, companyDetailsX + 5, companyY);
    companyY += 4;
  }
  if (data.gstin) {
    doc.text(`GSTIN: ${data.gstin}`, companyDetailsX + 5, companyY);
  }

  yPosition += 50;

  // Horizontal divider
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition);
  yPosition += 8;

  // ============= QUOTATION DETAILS BOX =============
  doc.setFillColor(244, 244, 244);
  doc.roundedRect(leftMargin, yPosition, contentWidth, 45, 3, 3, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('QUOTATION DETAILS', leftMargin + 5, yPosition + 7);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);

  const detailsY = yPosition + 13;
  const col1X = leftMargin + 5;
  const col2X = leftMargin + contentWidth / 2 + 5;

  // Left column
  doc.setFont('helvetica', 'bold');
  doc.text('Project Name:', col1X, detailsY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.quotationTitle || 'N/A', col1X + 30, detailsY);

  doc.setFont('helvetica', 'bold');
  doc.text('Client Name:', col1X, detailsY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(data.clientName, col1X + 30, detailsY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Client Address:', col1X, detailsY + 12);
  doc.setFont('helvetica', 'normal');
  const clientAddressLines = doc.splitTextToSize(data.clientAddress, 55);
  doc.text(clientAddressLines, col1X + 30, detailsY + 12);

  // Right column
  doc.setFont('helvetica', 'bold');
  doc.text('Date of Proposal:', col2X, detailsY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.dateOfProposal, col2X + 35, detailsY);

  doc.setFont('helvetica', 'bold');
  doc.text('Valid Till:', col2X, detailsY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(data.quotationValidTill, col2X + 35, detailsY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Place of Project:', col2X, detailsY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(data.placeOfProject, col2X + 35, detailsY + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('Project Type:', col2X, detailsY + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(data.projectType, col2X + 35, detailsY + 18);

  doc.setFont('helvetica', 'bold');
  doc.text('Warranty:', col2X, detailsY + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.warranty} Years`, col2X + 35, detailsY + 24);

  yPosition += 50;

  // ============= PROJECT SECTIONS & ITEMS =============
  for (const section of data.sections) {
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 15;
    }

    // Section header with soft grey background
    doc.setFillColor(237, 237, 237);
    doc.roundedRect(leftMargin, yPosition, contentWidth, 10, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(section.title.toUpperCase(), leftMargin + 5, yPosition + 7);
    yPosition += 12;

    // Items table
    const tableData = section.items.map(item => [
      item.side,
      item.productName,
      item.productDetails,
      item.widthFt.toString(),
      item.heightFt.toString(),
      item.sftArea.toFixed(2),
      `₹${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Side', 'Product Name', 'Product Details', 'Width (Ft)', 'Height (Ft)', 'Sft Area', 'Amount']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [237, 237, 237],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: 4
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: [40, 40, 40]
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250]
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 30 },
        2: { cellWidth: 60 },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 18, halign: 'center' },
        6: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: leftMargin, right: rightMargin }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 3;

    // Section total
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    const sectionTotal = section.items.reduce((sum, item) => sum + item.amount, 0);
    doc.text(`SECTION TOTAL: ₹${sectionTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, pageWidth - rightMargin, yPosition, { align: 'right' });
    yPosition += 10;
  }

  // ============= PAYMENT SUMMARY BOX =============
  if (yPosition > pageHeight - 70) {
    doc.addPage();
    yPosition = 15;
  }

  const summaryWidth = 80;
  const summaryX = pageWidth - rightMargin - summaryWidth;

  doc.setFillColor(243, 237, 229); // Soft beige
  doc.roundedRect(summaryX, yPosition, summaryWidth, 50, 3, 3, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('PAYMENT SUMMARY', summaryX + 5, yPosition + 7);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);

  let summaryY = yPosition + 14;
  doc.text('Subtotal:', summaryX + 5, summaryY);
  doc.text(`₹${data.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryX + summaryWidth - 5, summaryY, { align: 'right' });

  summaryY += 6;
  if (data.discount > 0) {
    doc.text('Discount:', summaryX + 5, summaryY);
    doc.text(`-₹${data.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryX + summaryWidth - 5, summaryY, { align: 'right' });
    summaryY += 6;
  }

  if (data.gstEnabled) {
    doc.text(`GST (${data.gstRate}%):`, summaryX + 5, summaryY);
    doc.text(`₹${data.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryX + summaryWidth - 5, summaryY, { align: 'right' });
    summaryY += 6;
  }

  // Grand total line
  doc.setDrawColor(200, 200, 200);
  doc.line(summaryX + 5, summaryY, summaryX + summaryWidth - 5, summaryY);
  summaryY += 6;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('GRAND TOTAL:', summaryX + 5, summaryY);
  doc.text(`₹${data.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryX + summaryWidth - 5, summaryY, { align: 'right' });

  yPosition += 60;

  // ============= PROJECT DURATION & PROCESS =============
  if (yPosition > pageHeight - 80) {
    doc.addPage();
    yPosition = 15;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('PROJECT DURATION FOR 30 DAYS (AFTER DESIGN PHASE)', leftMargin, yPosition);
  yPosition += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  const durationText = 'You have visualized your ideal home and decided to make it real. Once you finalize your design, the 30-day execution countdown begins. Below is the complete process and conditions.';
  const durationLines = doc.splitTextToSize(durationText, contentWidth);
  doc.text(durationLines, leftMargin, yPosition);
  yPosition += durationLines.length * 4 + 8;

  // ============= TERMS & CONDITIONS =============
  const addSection = (title: string, points: string[]) => {
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = 15;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(title, leftMargin, yPosition);
    yPosition += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);

    points.forEach(point => {
      if (yPosition > pageHeight - 15) {
        doc.addPage();
        yPosition = 15;
      }
      const lines = doc.splitTextToSize(`• ${point}`, contentWidth - 5);
      doc.text(lines, leftMargin + 3, yPosition);
      yPosition += lines.length * 4 + 2;
    });

    yPosition += 4;
  };

  addSection('MATERIAL DISPATCH & EXECUTION PROCESS', [
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

  addSection('SITE READINESS – IMPORTANT REQUIREMENT', [
    'Site Readiness Before Design Phase: Before measurements can be taken, flooring, wall plastering, electrical and plumbing work MUST be fully completed.',
    'If any of the above are incomplete: Measurements cannot be taken, drawings and production accuracy cannot be guaranteed, designer will not begin detailing.',
    'Special Case (Pre-Possession Planning): If the client wants design finalization before possession, no on-site measurements will be taken. Layout and elevations will be made only using builder floor plans.',
    'Design discussions pause after layout + elevation approval. Invoice for the next payment stage will be issued.',
    'Revised civil/electrical/plumbing drawings will be provided after payment.',
    'Design services remain paused until site is fully ready.',
    'Prices remain valid for 6 months after 20% payment.',
    'Site Readiness at Project Kickoff (Execution Start): Before installation begins, flooring, wall plastering, electrical and plumbing work, and site inspection sign-off MUST be completed.',
    'If the site is not ready: Execution and installation cannot begin. Any delay caused due to incomplete site work is the client\'s responsibility.'
  ]);

  addSection('IMPLICATIONS OF PAYMENT DELAY', [
    'Delay during Dispatch Stage: If payment is delayed, dispatch will be moved to the next available dispatch cycle (may be longer than the days delayed).',
    'Delay exceeding 2 weeks: Storage charges of ₹5,000 per week apply.',
    'Delay exceeding 1 month: Product warranty will be reduced by one full month.'
  ]);

  addSection('DESIGN PHASE TIMELINES & DELAY POLICY', [
    'Execution timelines (30/45/60/90 days) begin after design sign-off, not after the first payment.',
    'Design Phase Start: Begins on the date the 5% advance payment is received.',
    'Design Phase Completion: Achieved when the client approves all drawings and the 55% payment is received.',
    'First Two Weeks Include: Welcome call, scheduling site visits (if site ready), designer assignment, first designer–client communication, first design meeting (within 7–10 days if possible).',
    'Delays NOT Counted Under Penalty: Client-side vendors, site not ready, client payment delays, client not providing timely selections, builder delays, client delays in approving quotation, force majeure situations.',
    'Company-Side Delay Penalty: Two-week grace period. After grace: ₹5,000 per month (pro-rata). Penalty cannot exceed 5% of total project value.'
  ]);

  addSection('CHANGES DURING EXECUTION DUE TO TECHNICAL LIMITATION', [
    'Actual site conditions may require modifications to the approved design due to material limitations, installation feasibility, or structural constraints.',
    'The client will be informed, and changes will proceed only with approval.'
  ]);

  addSection('SERVICE, WARRANTY & TRANSPARENCY', [
    'Product warranties range from 1 to 5 years, depending on material and manufacturer.',
    'The entire price is transparent with no hidden charges.',
    'All execution work will follow agreed drawings and specifications.',
    `A dedicated team from ${data.companyName || 'our company'} ensures timely handover.`
  ]);

  // ============= SIGNATURE SECTION =============
  if (yPosition > pageHeight - 50) {
    doc.addPage();
    yPosition = 15;
  }

  yPosition += 10;

  // Thin divider line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('CUSTOMER ACCEPTANCE', leftMargin, yPosition);

  const signatureBoxWidth = 70;
  const signatureBoxHeight = 35;
  const signatureY = yPosition + 5;

  // Customer signature box
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.roundedRect(leftMargin, signatureY, signatureBoxWidth, signatureBoxHeight, 2, 2);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Customer Signature', leftMargin + 3, signatureY + signatureBoxHeight + 5);

  // Company signature box
  const companyBoxX = pageWidth - rightMargin - signatureBoxWidth;
  doc.roundedRect(companyBoxX, signatureY, signatureBoxWidth, signatureBoxHeight, 2, 2);

  // Add signature image if available
  if (data.signatureUrl) {
    try {
      const sigImg = new Image();
      sigImg.src = data.signatureUrl;
      await new Promise((resolve, reject) => {
        sigImg.onload = resolve;
        sigImg.onerror = reject;
      });
      doc.addImage(data.signatureUrl, 'PNG', companyBoxX + 5, signatureY + 5, signatureBoxWidth - 10, signatureBoxHeight - 10);
    } catch (error) {
      console.error('Error loading signature:', error);
    }
  }

  doc.text(`For ${data.companyName || 'Company'}`, companyBoxX + 3, signatureY + signatureBoxHeight + 5);

  // Footer
  yPosition = pageHeight - 10;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(150, 150, 150);
  doc.text('This is a computer-generated quotation.', pageWidth / 2, yPosition, { align: 'center' });

  // Save PDF
  doc.save(`Quotation_${data.clientName.replace(/\s+/g, '_')}.pdf`);
};
