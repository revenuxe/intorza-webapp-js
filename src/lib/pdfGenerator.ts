import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Interfaces ---
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
  gstAmount?: number;
  discount?: number;
  grandTotal?: number;
  companyLogo?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  gstin?: string;
  professionalAdvantages?: string;
  signatureUrl?: string;
  enableSocialMediaDiscount?: boolean;
}

// --- Helpers ---

const formatCurrency = (amount: number): string => {
  // Use Indian rupee system for better localization and clarity
  return '₹ ' + Math.round(amount).toLocaleString('en-IN');
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

// --- Main Generator Function ---

export const generateQuotationPDF = async (data: QuotationData) => {
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

  // --- Design System Colors (Brand Introduction) ---
  const COLORS = {
    BRAND: [40, 100, 150],           // Deep Teal/Blue for accents
    TEXT_PRIMARY: [30, 30, 30],      // Very Dark Grey
    TEXT_SECONDARY: [80, 80, 80],    // Dark Grey
    TEXT_LIGHT: [150, 150, 150],     // Light Grey for minor text
    BG_CARD: [245, 245, 245],        // Soft grey for cards/fill
    BORDER: [220, 220, 220],         // Subtle borders
    GRAND_TOTAL_BG: [40, 100, 150],  // BRAND color for final total
    GRAND_TOTAL_TEXT: [255, 255, 255], // White text on total
  };

  // --- 1. Header Section (Clean, Branded & Minimal) ---
  
  // Logo - Top Left, Smart Placement
  let compressedLogo: string | null = null;
  if (data.companyLogo) {
    try {
      compressedLogo = await compressImage(data.companyLogo, 200, 150);
      const logoSize = 30;
      doc.addImage(compressedLogo, 'JPEG', margin, yPosition, logoSize, logoSize, undefined, 'FAST');
    } catch (e) { console.error(e); }
  }

  // Company Details - Top Right, Branded Name
  const companyInfoX = pageWidth - margin;
  let headerTextY = yPosition + 5;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(COLORS.BRAND[0], COLORS.BRAND[1], COLORS.BRAND[2]); // Branded Company Name
  doc.text((data.companyName || 'PREMIUM INTERIORS').toUpperCase(), companyInfoX, headerTextY, { align: 'right' });
  
  headerTextY += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.TEXT_SECONDARY[0], COLORS.TEXT_SECONDARY[1], COLORS.TEXT_SECONDARY[2]);
  
  if (data.companyAddress) {
    const addressLines = doc.splitTextToSize(data.companyAddress, 90);
    addressLines.forEach((line: string) => {
      doc.text(line, companyInfoX, headerTextY, { align: 'right' });
      headerTextY += 4.5;
    });
  }
  
  const contactDetails = [];
  if (data.companyPhone) contactDetails.push(`P: ${data.companyPhone}`);
  if (data.companyEmail) contactDetails.push(`E: ${data.companyEmail}`);
  
  if (contactDetails.length > 0) {
    doc.text(contactDetails.join(' | '), companyInfoX, headerTextY, { align: 'right' });
    headerTextY += 4.5;
  }
  
  if (data.gstin) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
    doc.text(`GSTIN: ${data.gstin}`, companyInfoX, headerTextY, { align: 'right' });
  }

  // Full-width accent line below header
  yPosition = Math.max(yPosition + 35, headerTextY + 5);
  doc.setDrawColor(COLORS.BRAND[0], COLORS.BRAND[1], COLORS.BRAND[2]);
  doc.setLineWidth(1);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);

  yPosition += 8; // Move past header line

  // --- 2. Info Cards (Client & Project) ---
  
  const cardHeight = 42;
  const gap = 5;
  const cardWidth = (contentWidth - gap) / 2;
  
  // Left Card: Client Info
  doc.setFillColor(COLORS.BG_CARD[0], COLORS.BG_CARD[1], COLORS.BG_CARD[2]);
  doc.setDrawColor(COLORS.BORDER[0], COLORS.BORDER[1], COLORS.BORDER[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPosition, cardWidth, cardHeight, 2, 2, 'FD'); 
  
  let cardY = yPosition + 8;
  const cardPadding = 6;
  const cardContentX = margin + cardPadding;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
  doc.text('QUOTATION FOR CLIENT', cardContentX, cardY);
  
  cardY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12); // Slightly larger client name
  doc.setTextColor(COLORS.BRAND[0], COLORS.BRAND[1], COLORS.BRAND[2]);
  doc.text(data.clientName, cardContentX, cardY);
  
  cardY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.TEXT_SECONDARY[0], COLORS.TEXT_SECONDARY[1], COLORS.TEXT_SECONDARY[2]);
  const clientAddr = doc.splitTextToSize(data.clientAddress, cardWidth - (cardPadding * 2));
  doc.text(clientAddr, cardContentX, cardY);

  // Right Card: Project Meta
  const rightCardX = margin + cardWidth + gap;
  doc.setFillColor(COLORS.BG_CARD[0], COLORS.BG_CARD[1], COLORS.BG_CARD[2]);
  doc.roundedRect(rightCardX, yPosition, cardWidth, cardHeight, 2, 2, 'FD');
  
  let metaY = yPosition + 8;
  const metaContentX = rightCardX + cardPadding;
  const metaLabelX = metaContentX;
  const metaValueX = rightCardX + cardWidth - cardPadding; // Align values right
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
  doc.text('PROJECT METADATA', metaContentX, metaY);
  metaY += 6;

  const addMeta = (label: string, value: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(COLORS.TEXT_SECONDARY[0], COLORS.TEXT_SECONDARY[1], COLORS.TEXT_SECONDARY[2]);
    doc.text(label, metaLabelX, metaY);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
    doc.text(value, metaValueX, metaY, { align: 'right' }); // Right align value
    metaY += 5.5;
  };

  addMeta('Quotation Title:', data.quotationTitle.substring(0, 25) + (data.quotationTitle.length > 25 ? '...' : ''));
  addMeta('Date of Proposal:', data.dateOfProposal);
  addMeta('Quotation Valid Till:', data.quotationValidTill);
  addMeta('Warranty:', `${data.warranty} Years`);

  yPosition += cardHeight + 10;

  // --- 3. Product Sections (High-Impact Tables) ---
  
  let totalSFT = 0;

  for (const section of data.sections) {
    // Check page break
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = 15;
    }

    // Section Header (Enhanced Card Style)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
    doc.text(section.title.toUpperCase(), margin, yPosition + 4);
    
    // Draw a prominent BRAND accent line below title
    doc.setDrawColor(COLORS.BRAND[0], COLORS.BRAND[1], COLORS.BRAND[2]);
    doc.setLineWidth(1.5);
    doc.line(margin, yPosition + 7, margin + 40, yPosition + 7); // Short, thick accent line
    
    // Draw a thin grey full-width line
    doc.setDrawColor(COLORS.BORDER[0], COLORS.BORDER[1], COLORS.BORDER[2]);
    doc.setLineWidth(0.2);
    doc.line(margin, yPosition + 7, pageWidth - margin, yPosition + 7);

    yPosition += 12;

    // Calculate SFT
    section.items.forEach(item => totalSFT += item.sftArea);

    // Table
    const tableBody = section.items.map(item => [
      item.side || '-',
      item.productName,
      item.productDetails,
      item.widthFt.toFixed(1),
      item.heightFt.toFixed(1),
      item.sftArea.toFixed(2),
      formatCurrency(item.amount) 
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['SIDE', 'PRODUCT NAME', 'DETAILS', 'W (ft)', 'H (ft)', 'SQ.FT', 'AMOUNT']],
      body: tableBody,
      theme: 'grid', 
      styles: {
        font: 'helvetica',
        fontSize: 8.5,
        textColor: COLORS.TEXT_SECONDARY,
        lineColor: COLORS.BORDER,
        lineWidth: 0.1,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: COLORS.BRAND, // Brand Color Header
        textColor: [255, 255, 255], // White Text
        fontStyle: 'bold',
        lineWidth: 0.1,
        lineColor: COLORS.BRAND, 
        halign: 'left'
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 35, fontStyle: 'bold', textColor: COLORS.TEXT_PRIMARY },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 15, halign: 'right' }, // Right align numbers
        4: { cellWidth: 15, halign: 'right' },
        5: { cellWidth: 15, halign: 'right' },
        6: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: COLORS.TEXT_PRIMARY } // Currency Right Align
      },
      margin: { left: margin, right: margin },
      didDrawPage: (d) => {
        if (d.cursor) yPosition = d.cursor.y;
      }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 2;

    // Section Total - Right Aligned with styling
    const sectionTotal = section.items.reduce((sum, item) => sum + item.amount, 0);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(COLORS.BRAND[0], COLORS.BRAND[1], COLORS.BRAND[2]); // Brand color for section total
    doc.text(`Total for ${section.title}:  ${formatCurrency(sectionTotal)}`, pageWidth - margin, yPosition + 6, { align: 'right' });
    
    yPosition += 15;
  }

  // --- 4. Payment Summary (High-Contrast Totals) ---
  if (yPosition > pageHeight - 120) {
    doc.addPage();
    yPosition = 15;
  }

  // Calculations
  const subtotal = data.subtotal;
  let socialMediaDiscountAmount = 0;
  let taxableAmount = subtotal;
  
  if (data.enableSocialMediaDiscount) {
    socialMediaDiscountAmount = subtotal * 0.06;
    taxableAmount = subtotal - socialMediaDiscountAmount;
  } else if (data.discount) {
     socialMediaDiscountAmount = data.discount;
     taxableAmount = subtotal - socialMediaDiscountAmount;
  }

  const gstRate = 18;
  const gstAmount = data.gstEnabled ? (taxableAmount * (gstRate / 100)) : 0;
  const finalTotal = taxableAmount + gstAmount;

  // Render Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
  doc.text("PAYMENT SUMMARY", margin, yPosition);
  yPosition += 6;

  const summaryData: any[] = [
    ['Total Project Area', `${totalSFT.toFixed(2)} Sq.Ft`, COLORS.TEXT_SECONDARY],
    ['Subtotal Amount', formatCurrency(subtotal), COLORS.TEXT_PRIMARY],
  ];

  if (data.enableSocialMediaDiscount) {
    summaryData.push(['Social Media Discount @ 6%', '-' + formatCurrency(socialMediaDiscountAmount), COLORS.TEXT_PRIMARY]);
  } else if (data.discount && data.discount > 0) {
    summaryData.push(['Discount', '-' + formatCurrency(data.discount), COLORS.TEXT_PRIMARY]);
  }

  if (data.gstEnabled) {
    summaryData.push(['Net Taxable Amount', formatCurrency(taxableAmount), COLORS.TEXT_PRIMARY]);
    summaryData.push([`GST @ ${gstRate}%`, formatCurrency(gstAmount), COLORS.TEXT_PRIMARY]);
  }

  summaryData.push(['GRAND TOTAL', formatCurrency(finalTotal), COLORS.GRAND_TOTAL_TEXT]);

  autoTable(doc, {
    startY: yPosition,
    body: summaryData.map(row => [row[0], row[1]]),
    theme: 'plain', // Use plain theme and manage borders/fill manually
    styles: {
      cellPadding: 6,
      fontSize: 10
    },
    columnStyles: {
      0: { cellWidth: 120, halign: 'right', fontStyle: 'normal', textColor: COLORS.TEXT_SECONDARY },
      1: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' } 
    },
    willDrawCell: (cellData) => {
      const rowData = summaryData[cellData.row.index];
      const textColor = rowData[2];

      // Use a subtle background for all summary rows
      if (cellData.section === 'body') {
        doc.setDrawColor(COLORS.BORDER[0], COLORS.BORDER[1], COLORS.BORDER[2]);
        doc.setLineWidth(0.2);
        doc.rect(cellData.cell.x, cellData.cell.y, cellData.table.width, cellData.cell.height, 'D');
      }

      // Highlight the Grand Total Row dramatically
      if (cellData.row.index === summaryData.length - 1 && cellData.section === 'body') {
        doc.setFillColor(COLORS.GRAND_TOTAL_BG[0], COLORS.GRAND_TOTAL_BG[1], COLORS.GRAND_TOTAL_BG[2]);
        doc.rect(cellData.cell.x, cellData.cell.y, cellData.table.width, cellData.cell.height, 'F');
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.setFontSize(12);
      } else {
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      }
    },
    margin: { left: margin, right: margin }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // --- 5. Stagewise Payment (Clean, Clear) ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text("PAYMENT SCHEDULE", margin, yPosition);
  yPosition += 6;

  const paymentStages = [
    ['1', 'Design Phase', '10%'],
    ['2', 'Production Phase', '40%'],
    ['3', 'Material Dispatch', '30%'],
    ['4', 'Hardware & Accessories', '25%'],
    ['5', 'Handover', '5%']
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['#', 'STAGE / MILESTONE', 'PAYMENT %']],
    body: paymentStages,
    theme: 'grid',
    styles: {
        lineColor: COLORS.BORDER,
        lineWidth: 0.1,
        textColor: COLORS.TEXT_SECONDARY
    },
    headStyles: {
      fillColor: COLORS.BRAND, // Brand color header
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      lineColor: COLORS.BRAND,
      lineWidth: 0.1
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 35, halign: 'center', fontStyle: 'bold', textColor: COLORS.BRAND } // Highlight percentage
    },
    margin: { left: margin, right: margin }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // --- 6. Terms & Conditions ---
  
  if (yPosition > pageHeight - 60) {
    doc.addPage();
    yPosition = 15;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
  doc.text("TERMS & CONDITIONS", margin, yPosition);
  yPosition += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8); 
  
  // Helper to add titled blocks
  const addBlock = (title: string, lines: string[]) => {
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
    lines.forEach(line => {
        if (yPosition > pageHeight - 20) {
            doc.addPage();
            yPosition = 15;
        }
        const splitText = doc.splitTextToSize(line, contentWidth);
        doc.text(splitText, margin, yPosition);
        yPosition += (splitText.length * 3.5) + 2;
    });
    yPosition += 3;
  };

  // Add all terms text here (reused from previous step)
  addBlock("", [
    "Revision drawings can be executed in one of four ways:",
    "1.) Provide the builder with amended civil, electrical, and plumbing details for completion.",
    "2.) Hire the Company to revise the civil, electrical, and plumbing systems according to the plans.",
    "3.) Hire a Company-recommended vendor to complete civil, electrical, and plumbing adjustments according to the plans.",
    "4.) Hire a client-appointed vendor to complete civil, electrical, and plumbing adjustments according to the plans."
  ]);

  addBlock("Procedure for Client-Appointed Vendor / Incomplete Site:", [
    "1.) The Company's site survey and measurement team does not take site measurements if site-readiness conditions are not met.",
    "2.) Based on the builder's layout plan, the furniture arrangement (first-cut plan and elevations) will be created. If the customer insists on taking measurements at a site that does not meet these conditions, the client is solely responsible.",
    "3.) Design services will be suspended once the furniture design is finalized at a layout and elevation level. No further design discussions on finishes or detailing will take place at this stage.",
    "4.) An invoice will be issued for the remaining 15% payment.",
    "5.) Upon payment, revised civil, electrical, and/or plumbing drawings will be created, authorized, and provided as required.",
    "6.) Design services will remain on hold until the project is ready for execution or until possession/hand-over from the builder is complete.",
    "7.) Once the client has paid up to 20% of the project value, the quoted prices remain valid. Pricing is guaranteed for an additional two months (total validity: six months)."
  ]);

  addBlock("Site Condition Requirements:", [
    "Site condition is reassessed during the Kickoff Meeting, marking the start of the Execution Phase (post client approval). The following must be fully completed for execution to proceed:",
    "1.) Flooring must be fully completed.",
    "2.) Wall plastering should be finished.",
    "3.) Electrical and plumbing works must be completed.",
    "4.) All site work must be reviewed and signed off.",
    "Disclaimer: If these tasks are not completed, the site is not considered ready and the Execution Phase cannot begin. The Company will not be responsible for delays caused due to incomplete site readiness. The client is fully responsible for ensuring the site is ready and free from delays caused by the builder or any client-appointed vendors."
  ]);

  addBlock("Design Phase Delays & Penalties:", [
    "The promised execution timeline (30/45/60/90 days) begins after Design Sign-off, not earlier.",
    "Commencement Date: The date on which the Accounts Team receives the initial 5% advance payment.",
    "Design Phase Completion Date: The date on which the Company receives 55% payment and the client provides final approval of all drawings and scope.",
    "Within the first two weeks after the 5% advance is received, the following activities will occur:",
    "1.) The Client Happiness team will contact the client for onboarding.",
    "2.) Site visits will be scheduled by the Measurement/Survey/Record teams (subject to site readiness, confirmed by the client).",
    "3.) Designer assignment.",
    "4.) First contact between designer and client.",
    "5.) First design meeting (ideally completed within 7-10 days based on mutual availability and site readiness)."
  ]);

  addBlock("Delays NOT counted towards penalty:", [
    "• Client-appointed vendor delays",
    "• Incomplete site readiness",
    "• Payment delays",
    "• Delay in client selections",
    "• Builder delays",
    "• Client delays in approving quotations",
    "• Force-majeure situations"
  ]);

  addBlock("Penalty for Company-side delays:", [
    "After a two-week grace period, the Company will compensate at Rs. 5,000 per month on a pro-rata basis for delays beyond the committed handover date.",
    "Total penalty will not exceed 5% of the total project value.",
    "No additional compensation will be provided beyond this."
  ]);

  addBlock("Changes in Design due to Technical Impossibility:", [
    "During execution, site conditions, material limitations or other technical constraints may require changes to the approved design.",
    "When such changes occur, the client will be informed and execution will proceed only upon client approval."
  ]);

  // --- 7. Signature & Footer ---
  if (yPosition > pageHeight - 50) {
    doc.addPage();
    yPosition = pageHeight - 60;
  } else {
    yPosition += 10;
  }

  const signBoxWidth = 70;
  const companySignX = pageWidth - margin - signBoxWidth;
  
  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text("Acceptance from Customer", margin, yPosition);
  
  // Signature Image (If provided)
  if (data.signatureUrl) {
    try {
      let compressedSig = await compressImage(data.signatureUrl, 150, 60);
      doc.addImage(compressedSig, 'JPEG', companySignX, yPosition - 5, 50, 15);
    } catch (e) {}
  }

  yPosition += 20;

  doc.setDrawColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
  doc.setLineWidth(0.5);
  
  // Customer Line
  doc.line(margin, yPosition, margin + signBoxWidth, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text("Client Signatory", margin, yPosition + 5);

  // Company Line
  doc.line(companySignX, yPosition, companySignX + signBoxWidth, yPosition);
  doc.text("Authorized Signatory (for Company)", companySignX, yPosition + 5);

  // Footer (Thin line and watermark)
  doc.setDrawColor(COLORS.BRAND[0], COLORS.BRAND[1], COLORS.BRAND[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

  doc.setFontSize(7);
  doc.setTextColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
  doc.text("This is a premium quotation generated for your project. All amounts are in Indian Rupees (₹).", pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Save
  doc.save(`Quotation_${data.clientName.replace(/\s+/g, '_')}.pdf`);
};
