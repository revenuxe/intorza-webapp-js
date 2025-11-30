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
  subtotal: number; // This is the base amount before discount/tax
  gstEnabled: boolean;
  gstRate: number; // Should be 18 based on request
  // We will calculate gstAmount and grandTotal inside the generator to ensure the 6% logic flows correctly,
  // but keeping these for backward compatibility or if passed pre-calculated.
  gstAmount?: number;
  discount?: number; // Manual discount if any
  grandTotal?: number;
  companyLogo?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  gstin?: string;
  professionalAdvantages?: string;
  signatureUrl?: string;
  enableSocialMediaDiscount?: boolean; // New flag for the 6% logic
}

// --- Helpers ---

// Format currency: "INR 1,50,000" (No decimals)
const formatCurrency = (amount: number): string => {
  return 'INR ' + Math.round(amount).toLocaleString('en-IN');
};

// Compress images
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

  // Colors
  const COLOR_PRIMARY = [41, 41, 41]; // Dark Grey/Black
  const COLOR_ACCENT = [220, 220, 220]; // Light Grey
  const COLOR_HEADER_BG = [245, 245, 245]; // Very Light Grey for headers
  const COLOR_TEXT_MAIN = [0, 0, 0];
  const COLOR_TEXT_SUB = [80, 80, 80];
  const COLOR_HIGHLIGHT_YELLOW = [255, 255, 0]; // For discount highlight

  // --- 1. Header Section ---
  
  // Prepare Logo
  let compressedLogo: string | null = null;
  if (data.companyLogo) {
    try {
      compressedLogo = await compressImage(data.companyLogo, 200, 150);
    } catch (e) { console.error(e); }
  }

  // Draw Header Container
  const headerHeight = 45;
  
  // Logo (Left)
  if (compressedLogo) {
    const logoSize = 35;
    doc.addImage(compressedLogo, 'JPEG', margin, yPosition, logoSize, logoSize, undefined, 'FAST');
  }

  // Company Details (Right Aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.text((data.companyName || 'COMPANY NAME').toUpperCase(), pageWidth - margin, yPosition + 8, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(COLOR_TEXT_SUB[0], COLOR_TEXT_SUB[1], COLOR_TEXT_SUB[2]);
  
  let headerTextY = yPosition + 15;
  const lineHeight = 4.5;

  if (data.companyAddress) {
    const addressLines = doc.splitTextToSize(data.companyAddress, 80);
    addressLines.forEach((line: string) => {
      doc.text(line, pageWidth - margin, headerTextY, { align: 'right' });
      headerTextY += lineHeight;
    });
  }
  
  if (data.companyPhone) {
    doc.text(`Phone: ${data.companyPhone}`, pageWidth - margin, headerTextY, { align: 'right' });
    headerTextY += lineHeight;
  }
  if (data.companyEmail) {
    doc.text(`Email: ${data.companyEmail}`, pageWidth - margin, headerTextY, { align: 'right' });
    headerTextY += lineHeight;
  }
  if (data.gstin) {
    doc.text(`GSTIN: ${data.gstin}`, pageWidth - margin, headerTextY, { align: 'right' });
  }

  yPosition += headerHeight;

  // Divider Line
  doc.setDrawColor(COLOR_ACCENT[0], COLOR_ACCENT[1], COLOR_ACCENT[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  // --- 2. Client & Project Info (Grid Layout) ---
  const boxHeight = 40;
  
  // Left Side: Client Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(COLOR_TEXT_MAIN[0], COLOR_TEXT_MAIN[1], COLOR_TEXT_MAIN[2]);
  doc.text('QUOTATION FOR:', margin, yPosition);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(data.clientName, margin, yPosition + 7);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(COLOR_TEXT_SUB[0], COLOR_TEXT_SUB[1], COLOR_TEXT_SUB[2]);
  const clientAddr = doc.splitTextToSize(data.clientAddress, contentWidth / 2 - 10);
  doc.text(clientAddr, margin, yPosition + 13);

  // Right Side: Quotation Meta
  const rightColX = pageWidth / 2 + 10;
  let metaY = yPosition;
  
  const addMetaRow = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLOR_TEXT_MAIN[0], COLOR_TEXT_MAIN[1], COLOR_TEXT_MAIN[2]);
    doc.text(label, rightColX, metaY);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLOR_TEXT_SUB[0], COLOR_TEXT_SUB[1], COLOR_TEXT_SUB[2]);
    doc.text(value, rightColX + 35, metaY);
    metaY += 6;
  };

  addMetaRow('Date:', data.dateOfProposal);
  addMetaRow('Valid Till:', data.quotationValidTill);
  addMetaRow('Project:', data.quotationTitle);
  addMetaRow('Warranty:', data.warranty + ' Years');
  
  yPosition += boxHeight;

  // --- 3. Product Table ---
  
  let totalSFT = 0;

  for (const section of data.sections) {
    // Check space
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 15;
    }

    // Section Title
    doc.setFillColor(COLOR_HEADER_BG[0], COLOR_HEADER_BG[1], COLOR_HEADER_BG[2]);
    doc.rect(margin, yPosition, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(section.title.toUpperCase(), margin + 3, yPosition + 5.5);
    yPosition += 8;

    // Calculate Section SFT
    section.items.forEach(item => totalSFT += item.sftArea);

    // Prepare Table Data
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
      head: [['Side', 'Product', 'Details', 'W(ft)', 'H(ft)', 'Sq.Ft', 'Amount']],
      body: tableBody,
      theme: 'plain',
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 8,
        lineWidth: 0,
        valign: 'bottom',
        halign: 'left'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [50, 50, 50],
        valign: 'top',
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 10 }, // Side
        1: { cellWidth: 35, fontStyle: 'bold' }, // Product
        2: { cellWidth: 'auto' }, // Details
        3: { cellWidth: 12, halign: 'center' },
        4: { cellWidth: 12, halign: 'center' },
        5: { cellWidth: 12, halign: 'center' },
        6: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: margin, right: margin },
      didDrawPage: (d) => {
        if (d.cursor) {
           yPosition = d.cursor.y;
        }
      }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY;

    // Section Total Line
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 2;
    
    const sectionTotal = section.items.reduce((sum, item) => sum + item.amount, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Total for ${section.title}:`, pageWidth - 60, yPosition + 4, { align: 'right' });
    doc.text(formatCurrency(sectionTotal), pageWidth - margin, yPosition + 4, { align: 'right' });
    yPosition += 10;
  }

  // --- 4. Payment Summary ---
  if (yPosition > pageHeight - 120) {
    doc.addPage();
    yPosition = 15;
  }

  yPosition += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text("PAYMENT SUMMARY", margin, yPosition);
  yPosition += 5;

  // Calculations for Summary
  const subtotal = data.subtotal;
  let socialMediaDiscountAmount = 0;
  let taxableAmount = subtotal;
  
  // Logic: 6% Discount on Subtotal
  if (data.enableSocialMediaDiscount) {
    socialMediaDiscountAmount = subtotal * 0.06;
    taxableAmount = subtotal - socialMediaDiscountAmount;
  } else if (data.discount) {
     socialMediaDiscountAmount = data.discount;
     taxableAmount = subtotal - socialMediaDiscountAmount;
  }

  // GST Calculation (18% on Taxable Amount)
  const gstRate = 18; // Fixed as per request
  const gstAmount = data.gstEnabled ? (taxableAmount * (gstRate / 100)) : 0;
  const finalTotal = taxableAmount + gstAmount;

  const summaryData: any[] = [
    ['Total SFT', `${totalSFT.toFixed(2)} Sq.Ft`],
    ['Net Amount', formatCurrency(subtotal)],
  ];

  if (data.enableSocialMediaDiscount) {
    summaryData.push(['SOCIAL MEDIA SPECIAL DISCOUNT @ 6%', '-' + formatCurrency(socialMediaDiscountAmount)]);
  } else if (data.discount && data.discount > 0) {
    summaryData.push(['Discount', '-' + formatCurrency(data.discount)]);
  }

  if (data.gstEnabled) {
    summaryData.push(['Net Payable BEFORE GST', formatCurrency(taxableAmount)]);
    summaryData.push([`GST @ ${gstRate}%`, formatCurrency(gstAmount)]);
  }

  summaryData.push(['TOTAL', formatCurrency(finalTotal)]);

  autoTable(doc, {
    startY: yPosition,
    body: summaryData,
    theme: 'grid',
    bodyStyles: {
      fontSize: 9,
      fontStyle: 'bold',
      textColor: [0, 0, 0],
      cellPadding: 4,
      lineWidth: 0.1,
      lineColor: [0, 0, 0]
    },
    columnStyles: {
      0: { cellWidth: 100, fillColor: [255, 255, 255], halign: 'right' },
      1: { cellWidth: 'auto', fillColor: [255, 255, 255], halign: 'right', fontStyle: 'bold' } 
    },
    willDrawCell: (data) => {
        if (data.section === 'body' && data.row.index === summaryData.length - 1) {
             doc.setFillColor(COLOR_HIGHLIGHT_YELLOW[0], COLOR_HIGHLIGHT_YELLOW[1], COLOR_HIGHLIGHT_YELLOW[2]);
        }
    },
    margin: { left: margin, right: margin }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // --- 5. Stagewise Payment ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text("STAGEWISE PAYMENT OPTION", margin, yPosition);
  yPosition += 5;

  const paymentStages = [
    ['1', 'Design Phase', '10%'],
    ['2', 'Production Phase', '40%'],
    ['3', 'After Material Dispatch', '30%'],
    ['4', 'Hardware & Accessories', '25%'],
    ['5', 'Handles & Handover', '5%']
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['Stage', 'Milestone', '% Payment']],
    body: paymentStages,
    theme: 'grid',
    headStyles: {
      fillColor: [220, 220, 220],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      lineColor: [0, 0, 0],
      lineWidth: 0.1
    },
    bodyStyles: {
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.1
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 30, halign: 'center' }
    },
    margin: { left: margin, right: margin }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // --- 6. Terms & Conditions (Detailed) ---
  
  if (yPosition > pageHeight - 60) {
    doc.addPage();
    yPosition = 15;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text("TERMS & CONDITIONS", margin, yPosition);
  yPosition += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5); // Slightly smaller for dense text
  
  // Helper to add titled blocks
  const addBlock = (title: string, lines: string[]) => {
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 15;
    }
    if (title) {
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin, yPosition);
        yPosition += 5;
    }
    doc.setFont('helvetica', 'normal');
    lines.forEach(line => {
        if (yPosition > pageHeight - 20) {
            doc.addPage();
            yPosition = 15;
        }
        const splitText = doc.splitTextToSize(line, contentWidth);
        doc.text(splitText, margin, yPosition);
        yPosition += (splitText.length * 4) + 2;
    });
    yPosition += 3;
  };

  // 1. Revision Drawings
  addBlock("", [
    "Revision drawings can be executed in one of four ways:",
    "1.) Provide the builder with amended civil, electrical, and plumbing details for completion.",
    "2.) Hire the Company to revise the civil, electrical, and plumbing systems according to the plans.",
    "3.) Hire a Company-recommended vendor to complete civil, electrical, and plumbing adjustments according to the plans.",
    "4.) Hire a client-appointed vendor to complete civil, electrical, and plumbing adjustments according to the plans."
  ]);

  // 2. Procedure for Client-Appointed/Incomplete Site
  addBlock("Procedure for Client-Appointed Vendor / Incomplete Site:", [
    "1.) The Company's site survey and measurement team does not take site measurements if site-readiness conditions are not met.",
    "2.) Based on the builder's layout plan, the furniture arrangement (first-cut plan and elevations) will be created. If the customer insists on taking measurements at a site that does not meet these conditions, the client is solely responsible.",
    "3.) Design services will be suspended once the furniture design is finalized at a layout and elevation level. No further design discussions on finishes or detailing will take place at this stage.",
    "4.) An invoice will be issued for the remaining 15% payment.",
    "5.) Upon payment, revised civil, electrical, and/or plumbing drawings will be created, authorized, and provided as required.",
    "6.) Design services will remain on hold until the project is ready for execution or until possession/hand-over from the builder is complete.",
    "7.) Once the client has paid up to 20% of the project value, the quoted prices remain valid. Pricing is guaranteed for an additional two months (total validity: six months)."
  ]);

  // 3. Site Condition Requirements
  addBlock("Site Condition Requirements:", [
    "Site condition is reassessed during the Kickoff Meeting, marking the start of the Execution Phase (post client approval). The following must be fully completed for execution to proceed:",
    "1.) Flooring must be fully completed.",
    "2.) Wall plastering should be finished.",
    "3.) Electrical and plumbing works must be completed.",
    "4.) All site work must be reviewed and signed off.",
    "Disclaimer: If these tasks are not completed, the site is not considered ready and the Execution Phase cannot begin. The Company will not be responsible for delays caused due to incomplete site readiness. The client is fully responsible for ensuring the site is ready and free from delays caused by the builder or any client-appointed vendors."
  ]);

  // 4. Design Phase Delays & Penalties
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

  // 5. Technical Impossibility
  addBlock("Changes in Design due to Technical Impossibility:", [
    "During execution, site conditions, material limitations or other technical constraints may require changes to the approved design.",
    "When such changes occur, the client will be informed and execution will proceed only upon client approval."
  ]);

  // --- 7. Signature & Acceptance Section ---
  if (yPosition > pageHeight - 50) {
    doc.addPage();
    yPosition = pageHeight - 60;
  } else {
    yPosition += 10;
  }

  const signBoxWidth = 80;
  
  // Left: Customer
  doc.setFont('helvetica', 'bold');
  doc.text("Acceptance from Customer.", margin, yPosition);
  
  // Right: Company
  // If signature image exists
  const companySignX = pageWidth - margin - signBoxWidth;
  if (data.signatureUrl) {
    try {
      let compressedSig = await compressImage(data.signatureUrl, 150, 60);
      doc.addImage(compressedSig, 'JPEG', companySignX, yPosition - 10, 50, 20);
    } catch (e) {}
  }

  yPosition += 25; // Space for signature

  doc.setLineWidth(0.5);
  doc.setDrawColor(0,0,0);
  
  // Customer Line
  doc.line(margin, yPosition, margin + signBoxWidth, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text("Signatory", margin, yPosition + 5);

  // Company Line
  doc.line(companySignX, yPosition, companySignX + signBoxWidth, yPosition);
  doc.text("Authorized Signatory", companySignX, yPosition + 5);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("This is a computer-generated invoice.", pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Save
  doc.save(`Quotation_${data.clientName.replace(/\s+/g, '_')}.pdf`);
};
