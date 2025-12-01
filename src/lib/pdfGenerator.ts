
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
  projectDeadline?: string;
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
  socialMediaDiscountRate?: number;
  paymentStages?: {
    stage: string;
    milestone: string;
    percentage: number;
  }[];
  termsConditions?: {
    id: string;
    title: string;
    points: string[];
  }[];
}

// --- Helpers ---

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

  // --- Design System Colors ---
  const COLORS = {
    TEXT_PRIMARY: [20, 20, 20] as [number, number, number],      // Almost black
    TEXT_SECONDARY: [80, 80, 80] as [number, number, number],    // Dark Grey
    TEXT_LIGHT: [120, 120, 120] as [number, number, number],     // Light Grey
    BG_CARD: [250, 250, 250] as [number, number, number],        // Very light grey for cards
    BORDER: [230, 230, 230] as [number, number, number],         // Subtle borders
    ACCENT: [0, 0, 0] as [number, number, number],               // Black accent
    HIGHLIGHT: [255, 240, 0] as [number, number, number],        // Yellow highlight
  };

  // --- 1. Header Section (Clean & Minimal) ---
  
  // Logo - Top Left corner with rounded corners (10% corner radius)
  let compressedLogo: string | null = null;
  if (data.companyLogo) {
    try {
      compressedLogo = await compressImage(data.companyLogo, 400, 400);
      const logoSize = 25; // Smaller size for corner placement
      const cornerRadius = logoSize * 0.1; // 10% corner radius
      
      // Draw rounded rectangle for logo background (black)
      doc.setFillColor(0, 0, 0);
      doc.roundedRect(margin, yPosition, logoSize, logoSize, cornerRadius, cornerRadius, 'F');
      
      // Add logo on top of background
      doc.addImage(compressedLogo, 'JPEG', margin, yPosition, logoSize, logoSize, undefined, 'FAST');
    } catch (e) { console.error(e); }
  }

  // Company Details - Top Right
  const companyInfoX = pageWidth - margin;
  let headerTextY = yPosition + 5;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
  doc.text((data.companyName || 'COMPANY NAME').toUpperCase(), companyInfoX, headerTextY, { align: 'right' });
  
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
  if (data.companyPhone) contactDetails.push(data.companyPhone);
  if (data.companyEmail) contactDetails.push(data.companyEmail);
  
  if (contactDetails.length > 0) {
    doc.text(contactDetails.join(' | '), companyInfoX, headerTextY, { align: 'right' });
    headerTextY += 4.5;
  }
  
  if (data.gstin) {
    doc.setFont('helvetica', 'bold');
    doc.text(`GSTIN: ${data.gstin}`, companyInfoX, headerTextY, { align: 'right' });
  }

  yPosition += 35; // Move past header

  // --- 2. Info Cards (Client & Project) ---
  
  const cardHeight = 42;
  const gap = 5;
  const cardWidth = (contentWidth - gap) / 2;
  
  // Left Card: Client Info
  doc.setFillColor(COLORS.BG_CARD[0], COLORS.BG_CARD[1], COLORS.BG_CARD[2]);
  doc.setDrawColor(COLORS.BORDER[0], COLORS.BORDER[1], COLORS.BORDER[2]);
  doc.roundedRect(margin, yPosition, cardWidth, cardHeight, 2, 2, 'FD'); // Fill & Draw
  
  let cardY = yPosition + 8;
  const cardPadding = 6;
  const cardContentX = margin + cardPadding;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
  doc.text('QUOTATION FOR', cardContentX, cardY);
  
  cardY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
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
  const metaValueX = metaContentX + 30; // Align values
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
  doc.text('PROJECT DETAILS', metaContentX, metaY);
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

  addMeta('Date:', data.dateOfProposal);
  addMeta('Valid Till:', data.quotationValidTill);
  addMeta('Project:', data.quotationTitle.substring(0, 20)); // Truncate if too long
  addMeta('Warranty:', `${data.warranty} Years`);
  if (data.projectDeadline) {
    addMeta('Deadline:', data.projectDeadline);
  }

  yPosition += cardHeight + 10;

  // --- 3. Product Sections (Enhanced Cards) ---
  
  let totalSFT = 0;

  for (const section of data.sections) {
    // Check page break
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = 15;
    }

    // Section Header "Card"
    // Clean underline style with bold text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
    doc.text(section.title.toUpperCase(), margin, yPosition + 4);
    
    // Draw a thick accent line below title
    doc.setDrawColor(COLORS.ACCENT[0], COLORS.ACCENT[1], COLORS.ACCENT[2]);
    doc.setLineWidth(0.7);
    doc.line(margin, yPosition + 7, margin + 20, yPosition + 7); // Short accent line
    
    // Draw a thin full-width line
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
      formatCurrency(item.ratePerSft),
      formatCurrency(item.amount) 
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Side', 'Product', 'Details', 'W (ft)', 'H (ft)', 'Sq.Ft', 'Price/Sq.ft', 'Amount']],
      body: tableBody,
      theme: 'grid', // Cleaner looking than plain
      styles: {
        font: 'helvetica',
        fontSize: 7,
        textColor: COLORS.TEXT_SECONDARY,
        lineColor: COLORS.BORDER,
        lineWidth: 0.1,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [255, 255, 255], // White background
        textColor: COLORS.TEXT_PRIMARY, // Black text
        fontStyle: 'bold',
        fontSize: 7,
        lineWidth: 0.1,
        lineColor: COLORS.BORDER, // Border for header
        halign: 'left'
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center', fontSize: 6 },
        1: { cellWidth: 28, fontStyle: 'bold', fontSize: 7 },
        2: { cellWidth: 'auto', fontSize: 6 },
        3: { cellWidth: 12, halign: 'center', fontSize: 6 },
        4: { cellWidth: 12, halign: 'center', fontSize: 6 },
        5: { cellWidth: 14, halign: 'center', fontSize: 7 },
        6: { cellWidth: 24, halign: 'right', fontStyle: 'bold', fontSize: 7 },
        7: { cellWidth: 26, halign: 'right', fontStyle: 'bold', fontSize: 7 }
      },
      margin: { left: margin, right: margin },
      didDrawPage: (d) => {
        if (d.cursor) yPosition = d.cursor.y;
      }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 2;

    // Section Total - Right Aligned with yellow highlight
    const sectionTotal = section.items.reduce((sum, item) => sum + item.amount, 0);
    
    // Draw yellow highlight background
    const totalText = `Total ${section.title}:  ${formatCurrency(sectionTotal)}`;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const textWidth = doc.getTextWidth(totalText);
    const highlightPadding = 2;
    const highlightX = pageWidth - margin - textWidth - highlightPadding;
    const highlightY = yPosition + 1;
    const highlightHeight = 6;
    
    doc.setFillColor(COLORS.HIGHLIGHT[0], COLORS.HIGHLIGHT[1], COLORS.HIGHLIGHT[2]);
    doc.rect(highlightX, highlightY, textWidth + (highlightPadding * 2), highlightHeight, 'F');
    
    doc.setTextColor(COLORS.TEXT_PRIMARY[0], COLORS.TEXT_PRIMARY[1], COLORS.TEXT_PRIMARY[2]);
    doc.text(totalText, pageWidth - margin, yPosition + 6, { align: 'right' });
    
    yPosition += 15;
  }

  // --- 4. Payment Summary ---
  if (yPosition > pageHeight - 120) {
    doc.addPage();
    yPosition = 15;
  }

  // Calculations
  const subtotal = data.subtotal;
  let discountAmount = 0;
  let taxableAmount = subtotal;
  
  if (data.enableSocialMediaDiscount) {
    const discountRate = data.socialMediaDiscountRate || 6;
    discountAmount = subtotal * (discountRate / 100);
    taxableAmount = subtotal - discountAmount;
  } else if (data.discount) {
     discountAmount = data.discount;
     taxableAmount = subtotal - discountAmount;
  }

  const gstRate = data.gstRate || 18;
  const gstAmount = data.gstEnabled ? (taxableAmount * (gstRate / 100)) : 0;
  const finalTotal = taxableAmount + gstAmount;

  // Render Summary as a Table but with custom styling
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text("PAYMENT SUMMARY", margin, yPosition);
  yPosition += 6;

  const summaryData: any[] = [
    ['Total Project Area', `${totalSFT.toFixed(2)} Sq.Ft`],
    ['Subtotal Amount', formatCurrency(subtotal)],
  ];

  if (data.enableSocialMediaDiscount) {
    const discountRate = data.socialMediaDiscountRate || 6;
    summaryData.push([`Social Media Special Discount @ ${discountRate}%`, '-' + formatCurrency(discountAmount)]);
  } else if (data.discount && data.discount > 0) {
    summaryData.push(['Discount', '-' + formatCurrency(discountAmount)]);
  }

  if (data.gstEnabled) {
    summaryData.push(['Net Taxable Amount', formatCurrency(taxableAmount)]);
    summaryData.push([`GST @ ${gstRate}%`, formatCurrency(gstAmount)]);
  }

  summaryData.push(['GRAND TOTAL', formatCurrency(finalTotal)]);

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
    willDrawCell: (data) => {
      // Highlight all amount cells (column 1) with yellow
      if (data.column.index === 1 && data.section === 'body') {
        doc.setFillColor(COLORS.HIGHLIGHT[0], COLORS.HIGHLIGHT[1], COLORS.HIGHLIGHT[2]);
        doc.setTextColor(0, 0, 0);
      }
    },
    margin: { left: margin, right: margin }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // --- 5. Stagewise Payment Option ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text("STAGEWISE PAYMENT OPTION", margin, yPosition);
  yPosition += 6;

  const defaultPaymentStages = [
    { stage: '1', milestone: 'Design Phase', percentage: 10 },
    { stage: '2', milestone: 'Material Procurement', percentage: 30 },
    { stage: '3', milestone: 'Execution Start', percentage: 30 },
    { stage: '4', milestone: 'Mid-Execution', percentage: 20 },
    { stage: '5', milestone: 'Final Handover', percentage: 10 }
  ];

  const stagesData = data.paymentStages || defaultPaymentStages;
  const paymentStages = stagesData.map(stage => [
    stage.stage,
    stage.milestone,
    `${stage.percentage}%`,
    formatCurrency(finalTotal * (stage.percentage / 100))
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
    margin: { left: margin, right: margin }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // --- 6. Terms & Conditions ---
  
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
  
  // Helper to add titled blocks with points
  const addBlock = (title: string, points: string[]) => {
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 15;
    }
    if (title) {
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin, yPosition);
        yPosition += 4;
    }
    doc.setFont('helvetica', 'normal');
    
    // Ensure points is an array before iterating
    if (!points || !Array.isArray(points)) return;
    
    // Render each point as a bullet
    points.forEach((point) => {
      if (!point.trim()) return; // Skip empty points
      
      // Split point into lines that fit the width
      const splitText = doc.splitTextToSize(point, contentWidth - 5);
      
      splitText.forEach((line: string, lineIndex: number) => {
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = 15;
        }
        
        // Add bullet only on first line of each point
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

  // Use custom terms if provided, otherwise use default terms
  const defaultTerms = [
    {
      id: "1",
      title: "PROJECT DURATION FOR 30 DAYS (AFTER DESIGN PHASE)",
      points: ["The execution phase will commence post-design approval and is estimated to be completed within 30 working days, subject to site readiness and material availability."]
    },
    {
      id: "2",
      title: "MATERIAL DISPATCH & EXECUTION PROCESS",
      points: ["Materials will be dispatched as per the approved design and timeline.", "Installation will be carried out by trained professionals ensuring quality standards."]
    },
    {
      id: "3",
      title: "SITE READINESS",
      points: ["The client must ensure that the site is ready with completed civil work, electrical points, plumbing, and false ceiling before execution begins.", "Any delays due to site unreadiness will extend the project timeline."]
    },
    {
      id: "4",
      title: "IMPLICATIONS OF PAYMENT DELAY",
      points: ["Delayed payments may result in project timeline extensions and additional charges.", "Timely payments ensure smooth project execution and delivery."]
    },
    {
      id: "5",
      title: "DESIGN PHASE TIMELINES & DELAY POLICY",
      points: ["Design approval is expected within 7-10 working days.", "Delays in design approval will proportionally delay the overall project timeline."]
    },
    {
      id: "6",
      title: "CHANGES DURING EXECUTION DUE TO TECHNICAL LIMITATION",
      points: ["Any on-site technical constraints may require minor design modifications.", "Such changes will be communicated and executed with client consent."]
    },
    {
      id: "7",
      title: "SERVICE WARRANTY & TRANSPARENCY",
      points: ["We provide a warranty on manufacturing defects and workmanship.", "All materials used will be as per approved specifications with complete transparency."]
    }
  ];

  const termsToUse = data.termsConditions && data.termsConditions.length > 0 
    ? data.termsConditions 
    : defaultTerms;

  termsToUse.forEach(term => {
    if (term && term.title && term.points) {
      addBlock(term.title, term.points);
    }
  });

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
  
  // Signature Image
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
  doc.text("Signatory", margin, yPosition + 5);

  // Company Line
  doc.line(companySignX, yPosition, companySignX + signBoxWidth, yPosition);
  doc.text("Authorized Signatory", companySignX, yPosition + 5);

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
  doc.text("This quotation is computer-generated.", pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Save
  doc.save(`Quotation_${data.clientName.replace(/\s+/g, '_')}.pdf`);
};
