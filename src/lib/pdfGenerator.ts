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
  socialMediaDiscountPct?: number; // optional
}

// compressImage helper (keeps your original or replace with this)
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
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        // quality 0.7 to keep size small
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      } else {
        reject(new Error('Canvas context not available'));
      }
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
};

const formatINR = (value: number | undefined | null) => {
  const num = Number(value || 0);
  return '₹ ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 12;

  // compress images (logo + signature)
  let compressedLogo: string | null = null;
  if (data.companyLogo) {
    try {
      compressedLogo = await compressImage(data.companyLogo, 600, 300);
    } catch (e) {
      console.warn('Logo compression failed', e);
    }
  }
  let compressedSignature: string | null = null;
  if (data.signatureUrl) {
    try {
      compressedSignature = await compressImage(data.signatureUrl, 400, 120);
    } catch (e) {
      console.warn('Signature compression failed', e);
    }
  }

  // ---------- Header: bigger left logo card + right company details ----------
  const headerH = 56;
  const logoBoxW = 86;

  // left black rounded block
  doc.setFillColor(15, 15, 15);
  doc.roundedRect(margin, y, logoBoxW, headerH, 8, 8, 'F');

  // add logo centered in black box (if present)
  if (compressedLogo) {
    try {
      const logoW = 48;
      const logoH = 48;
      doc.addImage(
        compressedLogo,
        'JPEG',
        margin + (logoBoxW - logoW) / 2,
        y + (headerH - logoH) / 2,
        logoW,
        logoH,
        undefined,
        'FAST'
      );
    } catch (e) {
      console.warn('Add logo error', e);
    }
  }

  // right white company block
  const companyX = margin + logoBoxW + 6;
  const companyW = contentWidth - logoBoxW - 6;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(companyX, y, companyW, headerH, 8, 8, 'F');

  // light border
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.roundedRect(companyX, y, companyW, headerH, 8, 8);

  // company text
  const textX = companyX + 8;
  let textY = y + 12;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(data.companyName || 'COMPANY NAME', textX, textY, { maxWidth: companyW - 16 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  textY += 7;
  if (data.companyAddress) {
    const lines = doc.splitTextToSize(data.companyAddress, companyW - 16);
    doc.text(lines, textX, textY);
    textY += lines.length * 4;
  }
  if (data.companyPhone) {
    doc.text(`Phone: ${data.companyPhone}`, textX, textY);
    textY += 4.4;
  }
  if (data.companyEmail) {
    doc.text(`Email: ${data.companyEmail}`, textX, textY);
    textY += 4.4;
  }
  if (data.gstin) {
    doc.text(`GSTIN: ${data.gstin}`, textX, textY);
  }

  y += headerH + 8;

  // thin divider
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ---------- QUOTATION DETAILS PANEL ----------
  const detailsH = 52;
  doc.setFillColor(246, 246, 246);
  doc.roundedRect(margin, y, contentWidth, detailsH, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('QUOTATION DETAILS', margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const leftX = margin + 6;
  const rightX = margin + contentWidth / 2 + 4;
  let rowY = y + 18;
  const labelW = 36;
  const valW = contentWidth / 2 - labelW - 20;

  doc.setFont('helvetica', 'bold');
  doc.text('Project Name:', leftX, rowY);
  doc.setFont('helvetica', 'normal');
  doc.text(doc.splitTextToSize(data.quotationTitle || 'N/A', valW)[0], leftX + labelW, rowY);

  rowY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Client Name:', leftX, rowY);
  doc.setFont('helvetica', 'normal');
  doc.text(doc.splitTextToSize(data.clientName || '-', valW)[0], leftX + labelW, rowY);

  rowY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Client Address:', leftX, rowY);
  doc.setFont('helvetica', 'normal');
  const addr = doc.splitTextToSize(data.clientAddress || '-', valW * 1.8);
  doc.text(addr.slice(0, 2), leftX + labelW, rowY);

  // right column
  rowY = y + 18;
  doc.setFont('helvetica', 'bold');
  doc.text('Date of Proposal:', rightX, rowY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.dateOfProposal || '-', rightX + labelW, rowY);

  rowY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Valid Till:', rightX, rowY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.quotationValidTill || '-', rightX + labelW, rowY);

  rowY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Place of Project:', rightX, rowY);
  doc.setFont('helvetica', 'normal');
  doc.text(doc.splitTextToSize(data.placeOfProject || '-', valW)[0], rightX + labelW, rowY);

  rowY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Project Type:', rightX, rowY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.projectType || '-', rightX + labelW, rowY);

  y += detailsH + 12;

  // ---------- SECTIONS & ITEMS (existing loop) ----------
  for (const section of data.sections || []) {
    if (y > pageHeight - 120) {
      doc.addPage();
      y = 12;
    }

    // section header bar
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(margin, y, contentWidth, 9.2, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(section.title.toUpperCase(), margin + 6, y + 6.6);

    y += 12;

    // build table body
    const rows = section.items.map(item => [
      item.side || '-',
      item.productName || '-',
      item.productDetails || '',
      (item.widthFt || 0).toFixed(1),
      (item.heightFt || 0).toFixed(1),
      (item.sftArea || 0).toFixed(2),
      formatINR(item.amount || 0)
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Side', 'Product Name', 'Product Details', 'Width\n(Ft)', 'Height\n(Ft)', 'SQFT', 'Amount']],
      body: rows,
      theme: 'grid',
      headStyles: {
        fillColor: [242, 242, 242],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 4
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 4,
        textColor: [55, 55, 55],
        overflow: 'linebreak',
        cellWidth: 'wrap'
      },
      columnStyles: {
        0: { cellWidth: 16, halign: 'center' },
        1: { cellWidth: 42, halign: 'left' },
        2: { cellWidth: 62, halign: 'left' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 18, halign: 'center' },
        6: { cellWidth: 36, halign: 'right', fontStyle: 'bold' } // widened to avoid overflow
      },
      margin: { left: margin, right: margin },
      tableWidth: 'auto'
    });

    y = (doc as any).lastAutoTable.finalY + 6;

    // section total
    const sectionTotal = section.items.reduce((s, it) => s + (it.amount || 0), 0);
    const totalW = 78;
    const totalX = pageWidth - margin - totalW;

    doc.setFillColor(247, 241, 233);
    doc.roundedRect(totalX, y, totalW, 10, 3, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('SECTION TOTAL', totalX + 6, y + 6);
    doc.text(formatINR(sectionTotal), totalX + totalW - 6, y + 6, { align: 'right' });

    y += 16;
  }

  // ---------- PAYMENT SUMMARY (highlighted box like screenshot) ----------
  if (y > pageHeight - 120) {
    doc.addPage();
    y = 12;
  }

  const summaryW = contentWidth;
  const summaryH = 56;
  doc.setFillColor(250, 245, 230);
  doc.roundedRect(margin, y, summaryW, summaryH, 4, 4, 'F');
  doc.setDrawColor(230, 220, 200);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, summaryW, summaryH, 4, 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('PAYMENT SUMMARY', margin + 6, y + 9);

  // summary lines: Subtotal, Social media discount (if provided), Net payable without GST, Round off, GRAND TOTAL
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  let sy = y + 17;
  const labelX = margin + 8;
  const valueX = margin + summaryW - 8;

  doc.text('Subtotal:', labelX, sy);
  doc.text(formatINR(data.subtotal || 0), valueX, sy, { align: 'right' });
  sy += 6;

  if (data.socialMediaDiscountPct && data.socialMediaDiscountPct > 0) {
    doc.text(`Social Media Special Discount (${data.socialMediaDiscountPct}%) :`, labelX, sy);
    const discountAmount = Number((data.subtotal || 0) * (data.socialMediaDiscountPct / 100));
    doc.text(`- ${formatINR(discountAmount)}`, valueX, sy, { align: 'right' });
    sy += 6;
  }

  if (data.discount && data.discount > 0) {
    doc.text('Discount:', labelX, sy);
    doc.text(`- ${formatINR(data.discount)}`, valueX, sy, { align: 'right' });
    sy += 6;
  }

  if (data.gstEnabled) {
    doc.text(`GST (${data.gstRate}%):`, labelX, sy);
    doc.text(formatINR(data.gstAmount || 0), valueX, sy, { align: 'right' });
    sy += 6;
  }

  // divider
  doc.setDrawColor(220, 210, 190);
  doc.setLineWidth(0.4);
  doc.line(margin + 8, sy + 2, margin + summaryW - 8, sy + 2);
  sy += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('NET PAYABLE (Rounded):', labelX, sy);
  doc.text(formatINR(data.grandTotal || 0), valueX, sy, { align: 'right' });

  y += summaryH + 12;

  // ---------- Insert the highlighted screenshot section content as requested ----------
  // 1. PROJECT DURATION
  const projectTitle = '1. PROJECT DURATION';
  const projectText = 'PROJECT DURATION FOR 30 DAYS (CHALLENGE AFTER DESIGN PHASE): Once design sign-off is complete and payments are on schedule, execution begins. The typical execution duration is 30 days from the start of production (excluding design phase). Delays due to site-readiness, client-side vendors, or payment delays are not included.';

  if (y > pageHeight - 120) {
    doc.addPage();
    y = 12;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(projectTitle, margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  const projLines = doc.splitTextToSize(projectText, contentWidth);
  doc.text(projLines, margin, y);
  y += projLines.length * 4 + 8;

  // 2. PAYMENT TIMELINE (as requested)
  if (y > pageHeight - 140) {
    doc.addPage();
    y = 12;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('2. PAYMENT TIMELINE', margin, y);
  y += 6;

  // table for timeline
  const timelineHead = [['Stage', 'Percent', 'Description']];
  const timelineBody = [
    ['Design (Advance)', '10%', 'Initial design & confirmation'],
    ['Production', '40%', 'Move into production (carcass)'],
    ['After Material Dispatch', '30%', 'Payment after material dispatched to site'],
    ['Hardware & Accessories', '25%', 'Payment for hardware and accessories (fittings)'],
    ['Handles & Handover', '5%', 'On the day of handover']
  ];

  autoTable(doc, {
    startY: y,
    head: timelineHead,
    body: timelineBody,
    theme: 'striped',
    headStyles: { fontSize: 9, fontStyle: 'bold', fillColor: [235, 235, 235] },
    bodyStyles: { fontSize: 8, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.45 },
      1: { cellWidth: contentWidth * 0.15, halign: 'center' },
      2: { cellWidth: contentWidth * 0.40 }
    },
    margin: { left: margin, right: margin }
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // 3. HARDWARE NOTE (Ebco/Hafele/Hettich)
  const hwTitle = '3. HARDWARE & FITTINGS NOTE';
  const hwText = 'All hardware will be Ebco fittings by default. Hafele and Hettich fittings are available on request and will be charged extra depending on model & availability. Final selection & extra charges (if any) will be confirmed before dispatch.';

  if (y > pageHeight - 80) {
    doc.addPage();
    y = 12;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(hwTitle, margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  const hwLines = doc.splitTextToSize(hwText, contentWidth);
  doc.text(hwLines, margin, y);
  y += hwLines.length * 4 + 10;

  // ---------- TERMS & CONDITIONS & SITE READINESS (reuse earlier addTermsSection pattern) ----------
  const addBulletedSection = (title: string, bullets: string[]) => {
    if (y > pageHeight - 80) {
      doc.addPage();
      y = 12;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(title, margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    bullets.forEach(b => {
      if (y > pageHeight - 60) {
        doc.addPage();
        y = 12;
      }
      const lines = doc.splitTextToSize('• ' + b, contentWidth - 6);
      doc.text(lines, margin + 3, y);
      y += lines.length * 4 + 2;
    });
    y += 4;
  };

  addBulletedSection('MATERIAL DISPATCH & EXECUTION PROCESS', [
    'After receiving the second stage payment, the material will be dispatched within 2 working weeks.',
    'Delivery schedule may vary with prior notice.',
    'Any design changes after finalization will incur extra cost.',
    'All applicable taxes are additional.',
    'Civil, plumbing, granite, and tiling work are not included.'
  ]);

  addBulletedSection('SITE READINESS – IMPORTANT REQUIREMENT', [
    'Flooring must be finished before measurements.',
    'Plastering on walls must be completed.',
    'Electrical and plumbing work must be finished.',
    'If site is not ready, on-site measurements will not be taken; client accepts responsibility for consequences.'
  ]);

  addBulletedSection('IMPLICATIONS OF PAYMENT DELAY', [
    'If payment is delayed during dispatch stage, dispatch will be moved to the next available schedule.',
    'Delay > 2 weeks: storage charges of ₹5,000 per week apply.',
    'Delay > 1 month: product warranty may be reduced accordingly.'
  ]);

  addBulletedSection('CHANGES DURING EXECUTION DUE TO TECHNICAL LIMITATION', [
    'Site conditions may require adjustments; client will be informed and approval taken before changes.'
  ]);

  // ---------- SIGNATURE BLOCK ----------
  if (y > pageHeight - 80) {
    doc.addPage();
    y = 12;
  }

  // divider
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('CUSTOMER ACCEPTANCE', margin, y);
  y += 8;

  const signW = 78;
  const signH = 36;

  // customer signature box (left)
  doc.setDrawColor(200, 200, 200);
  doc.roundedRect(margin, y, signW, signH, 2, 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.text('Customer Signature', margin + 4, y + signH + 6);

  // company signature box (right)
  const compX = pageWidth - margin - signW;
  doc.roundedRect(compX, y, signW, signH, 2, 2);

  if (compressedSignature) {
    try {
      doc.addImage(compressedSignature, 'JPEG', compX + 6, y + 6, signW - 12, signH - 10, undefined, 'FAST');
    } catch (e) {
      console.warn('signature add error', e);
    }
  }
  doc.text(`For ${data.companyName || 'Company'}`, compX + 4, y + signH + 6);

  y += signH + 14;

  // footer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(150, 150, 150);
  doc.text('This is a computer-generated quotation. Prices are valid for the period specified above.', pageWidth / 2, pageHeight - 8, { align: 'center' });

  // save
  const safeClient = (data.clientName || 'client').replace(/\s+/g, '_');
  doc.save(`Quotation_${safeClient}.pdf`);
};

