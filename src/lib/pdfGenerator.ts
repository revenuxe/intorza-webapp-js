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
  gstAmount: number;
  discount: number;
  grandTotal: number;
  companyLogo?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  gstin?: string;
  professionalAdvantages?: string; // For the text block in the summary image
  signatureUrl?: string;
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

    // Prepare Table Data
    const tableBody = section.items.map(item => [
      item.side || '-',
      item.productName,
      item.productDetails,
      item.widthFt.toFixed(1),
      item.heightFt.toFixed(1),
      item.sftArea.toFixed(2),
      formatCurrency(item.amount) // Uses new format helper
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
        // Adjust yPosition if table breaks page
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

  // --- 4. The "Shared Section" (Payment Summary & Timeline) ---
  if (yPosition > pageHeight - 100) {
    doc.addPage();
    yPosition = 15;
  }

  yPosition += 5;

  // Box Container for Summary
  const summaryBoxY = yPosition;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  
  // We will create two side-by-side columns conceptually, 
  // but looking at the user request, they want a "Shared Section" input.
  // We will build the Payment Summary Table first.

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text("PAYMENT SUMMARY", margin, yPosition);
  yPosition += 5;

  // 4a. Cost Breakdown Table (Replicating image style)
  const costData = [
    ['Net Amount', formatCurrency(data.subtotal)],
  ];
  
  if (data.gstEnabled) {
    costData.push([`GST @ ${data.gstRate}%`, formatCurrency(data.gstAmount)]);
  }
  
  if (data.discount > 0) {
    costData.push(['Special Discount', '-' + formatCurrency(data.discount)]);
  }

  costData.push(['TOTAL PAYABLE', formatCurrency(data.grandTotal)]);

  autoTable(doc, {
    startY: yPosition,
    body: costData,
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
      1: { cellWidth: 'auto', fillColor: [255, 255, 0], halign: 'right', fontStyle: 'bold' } // Yellow Highlight like image
    },
    margin: { left: margin, right: margin }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // 4b. Stagewise Payment Option (Based on USER TEXT request)
  // Text requested:
  // 1-PROJECT DURATION (Actually this is separate)
  // 2-PAYMENT TIMELINE=10% For design, 40% For production, 30% After material dispatch...
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text("STAGEWISE PAYMENT OPTION", margin, yPosition);
  yPosition += 5;

  const paymentStages = [
    ['1', 'Design Phase', '10%'],
    ['2', 'Production Phase', '40%'],
    ['3', 'After Material Dispatch', '30%'],
    ['4', 'Hardware & Accessories', '25%'], // Note: User requested 25%. Math (10+40+30+25+5 = 110%). Keeping user text.
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

  // --- 5. Terms & Conditions (Specific User Requests) ---
  
  if (yPosition > pageHeight - 60) {
    doc.addPage();
    yPosition = 15;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text("TERMS & CONDITIONS", margin, yPosition);
  yPosition += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  // Helper to add bullet points
  const addBullet = (text: string) => {
    const splitText = doc.splitTextToSize(text, contentWidth - 10);
    doc.text('•', margin, yPosition);
    doc.text(splitText, margin + 6, yPosition);
    yPosition += (splitText.length * 4.5) + 2;
  };

  // 1. PROJECT DURATION
  doc.setFont('helvetica', 'bold');
  doc.text("1. PROJECT DURATION", margin, yPosition);
  yPosition += 5;
  doc.setFont('helvetica', 'normal');
  addBullet("Project Duration for 30 Days (Challenge after Design Phase).");
  yPosition += 3;

  // 2. PAYMENT TIMELINE (Already in table, but adding note if needed, or skipping to next point)
  // User asked for "2-PAYMENT TIMELINE" in the text list, but we visualized it above. 
  // Let's add the hardware note here.
  
  doc.setFont('helvetica', 'bold');
  doc.text("2. HARDWARE SPECIFICATIONS", margin, yPosition);
  yPosition += 5;
  doc.setFont('helvetica', 'normal');
  
  // Point 3 from user request
  addBullet("All the hardware will be Ebco fittings. Hafele and Hettich will charge extra.");
  
  // Point 4 from user request
  addBullet("All Base unit kitchen: Ebco Soft Close Hinges are used.");
  addBullet("For Lofts: Ebco Normal Hinges will be used.");
  addBullet("Note: In case Soft Close is required for Lofts, it will cost extra.");
  
  // General Terms
  yPosition += 3;
  doc.setFont('helvetica', 'bold');
  doc.text("3. GENERAL TERMS", margin, yPosition);
  yPosition += 5;
  doc.setFont('helvetica', 'normal');
  addBullet("Validity: This quotation is valid for 15 days.");
  addBullet("Delivery: Material dispatch within 2 weeks after phase payment.");
  addBullet("Warranty: As per manufacturer standards (1-5 years depending on material).");

  // --- 6. Signature Section ---
  if (yPosition > pageHeight - 40) {
    doc.addPage();
    yPosition = pageHeight - 50;
  } else {
    yPosition += 10;
  }

  const signBoxWidth = 70;
  const companySignX = pageWidth - margin - signBoxWidth;

  // Company Signature
  if (data.signatureUrl) {
    try {
      let compressedSig = await compressImage(data.signatureUrl, 150, 60);
      doc.addImage(compressedSig, 'JPEG', companySignX, yPosition - 15, 50, 20);
    } catch (e) {}
  }
  
  doc.setFont('helvetica', 'bold');
  doc.text(`For ${data.companyName || 'Company'}`, companySignX, yPosition + 10);
  
  // Customer Acceptance
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition + 5, margin + 70, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text("Customer Signature", margin, yPosition + 10);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("This is a computer-generated invoice.", pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Save
  doc.save(`Quotation_${data.clientName.replace(/\s+/g, '_')}.pdf`);
};
