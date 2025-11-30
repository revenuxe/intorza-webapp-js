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
  signatureUrl?: string;
  socialMediaDiscountPct?: number;
}

// Simple image compressor helper (re-usable)
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
      if (!ctx) return reject(new Error('Canvas unavailable'));
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
};

const formatINR = (value?: number | null) => {
  const n = Number(value || 0);
  return '₹ ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const generateQuotationPDF = async (data: QuotationData) => {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = 12;

  // compress images
  let compressedLogo: string | null = null;
  if (data.companyLogo) {
    try { compressedLogo = await compressImage(data.companyLogo, 400, 200); } catch (e) { console.warn(e); }
  }
  let compressedSignature: string | null = null;
  if (data.signatureUrl) {
    try { compressedSignature = await compressImage(data.signatureUrl, 300, 100); } catch (e) { console.warn(e); }
  }

  // ---------------- Header: medium logo top-left + small info card ----------------
  const logoW = 44; // medium size
  const logoH = 44;
  const logoX = margin;
  const logoY = y;

  // add logo image if available (no background card)
  if (compressedLogo) {
    try {
      doc.addImage(compressedLogo, 'JPEG', logoX, logoY, logoW, logoH, undefined, 'FAST');
    } catch (e) { console.warn('logo add error', e); }
  } else {
    // fallback: small company initials
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text((data.companyName || 'COMPANY').slice(0, 12), logoX + 2, logoY + 12);
  }

  // compact company info box to the right of logo (simple, small)
  const infoX = logoX + logoW + 8;
  const infoW = contentW - logoW - 8;
  const infoY = logoY;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text(data.companyName || 'COMPANY NAME', infoX, infoY + 8, { maxWidth: infoW });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  let infoTextY = infoY + 14;
  if (data.companyAddress) {
    const lines = doc.splitTextToSize(data.companyAddress, infoW);
    doc.text(lines, infoX, infoTextY);
    infoTextY += lines.length * 3.8;
  }
  if (data.companyPhone) { doc.text(`Phone: ${data.companyPhone}`, infoX, infoTextY); infoTextY += 4.2; }
  if (data.companyEmail) { doc.text(`Email: ${data.companyEmail}`, infoX, infoTextY); infoTextY += 4.2; }
  if (data.gstin) { doc.text(`GSTIN: ${data.gstin}`, infoX, infoTextY); infoTextY += 4.2; }

  y += logoH + 8;

  // subtle divider
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ---------------- Quotation details (compact) ----------------
  const detailH = 46;
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(margin, y, contentW, detailH, 3, 3, 'F'); // very subtle background to separate
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('QUOTATION DETAILS', margin + 6, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const leftColX = margin + 6;
  const rightColX = margin + contentW / 2 + 4;
  let rowY = y + 18;
  const labelW = 36;
  const valW = contentW / 2 - labelW - 18;

  // Left
  doc.setFont('helvetica', 'bold'); doc.text('Project Name:', leftColX, rowY);
  doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(data.quotationTitle || '-', valW)[0], leftColX + labelW, rowY);

  rowY += 6; doc.setFont('helvetica', 'bold'); doc.text('Client Name:', leftColX, rowY);
  doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(data.clientName || '-', valW)[0], leftColX + labelW, rowY);

  rowY += 6; doc.setFont('helvetica', 'bold'); doc.text('Client Address:', leftColX, rowY);
  doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(data.clientAddress || '-', valW * 1.6), leftColX + labelW, rowY);

  // Right
  rowY = y + 18; doc.setFont('helvetica', 'bold'); doc.text('Date of Proposal:', rightColX, rowY);
  doc.setFont('helvetica', 'normal'); doc.text(data.dateOfProposal || '-', rightColX + labelW, rowY);

  rowY += 6; doc.setFont('helvetica', 'bold'); doc.text('Valid Till:', rightColX, rowY);
  doc.setFont('helvetica', 'normal'); doc.text(data.quotationValidTill || '-', rightColX + labelW, rowY);

  rowY += 6; doc.setFont('helvetica', 'bold'); doc.text('Place of Project:', rightColX, rowY);
  doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(data.placeOfProject || '-', valW)[0], rightColX + labelW, rowY);

  y += detailH + 10;

  // ---------------- Sections & Items: loop with pagination guards ----------------
  const ensureSpace = (minSpace: number) => {
    if (y + minSpace > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  for (const section of data.sections || []) {
    ensureSpace(80); // ensure table + header fit

    // Section heading
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text(section.title.toUpperCase(), margin + 2, y);
    y += 8;

    // Prepare rows - ensure amounts formatted with INR helper
    const rows = (section.items || []).map(it => [
      it.side || '-',
      it.productName || '-',
      it.productDetails || '-',
      (it.widthFt || 0).toFixed(1),
      (it.heightFt || 0).toFixed(1),
      (it.sftArea || 0).toFixed(2),
      formatINR(it.amount || 0)
    ]);

    // Add table and allow autoTable to compute finalY
    autoTable(doc, {
      startY: y,
      head: [['Side', 'Product Name', 'Product Details', 'Width (Ft)', 'Height (Ft)', 'SQFT', 'Amount']],
      body: rows,
      theme: 'grid',
      headStyles: {
        fillColor: [245, 245, 245],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 8
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 4,
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { cellWidth: 16, halign: 'center' },
        1: { cellWidth: 46, halign: 'left' },
        2: { cellWidth: 62, halign: 'left' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 18, halign: 'center' },
        6: { cellWidth: 44, halign: 'right' } // widened for amounts
      },
      margin: { left: margin, right: margin },
      tableWidth: 'auto',
    });

    // lastAutoTable.finalY may be undefined in rare cases; protect
    const lastY = ((doc as any).lastAutoTable && (doc as any).lastAutoTable.finalY) ? (doc as any).lastAutoTable.finalY : y + 30;
    y = lastY + 8;

    // Section total
    const sTotal = (section.items || []).reduce((s, it) => s + (it.amount || 0), 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('SECTION TOTAL', pageW - margin - 68, y);
    doc.text(formatINR(sTotal), pageW - margin - 6, y, { align: 'right' });
    y += 12;
  }

  // ---------------- Payment Summary: ensure fits whole box ----------------
  ensureSpace(90);
  const sumBoxH = 66;
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(margin, y, contentW, sumBoxH, 3, 3, 'F');
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.35);
  doc.roundedRect(margin, y, contentW, sumBoxH, 3, 3);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('PAYMENT SUMMARY', margin + 6, y + 9);

  const labelX = margin + 8;
  const valueX = margin + contentW - 8;
  let sy = y + 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Subtotal:', labelX, sy); doc.text(formatINR(data.subtotal || 0), valueX, sy, { align: 'right' }); sy += 7;

  if (data.socialMediaDiscountPct && data.socialMediaDiscountPct > 0) {
    const d = (data.subtotal || 0) * (data.socialMediaDiscountPct / 100);
    doc.text(`Social Media Discount (${data.socialMediaDiscountPct}%):`, labelX, sy);
    doc.text(`- ${formatINR(d)}`, valueX, sy, { align: 'right' });
    sy += 7;
  }

  if (data.discount && data.discount > 0) {
    doc.text('Discount:', labelX, sy); doc.text(`- ${formatINR(data.discount)}`, valueX, sy, { align: 'right' }); sy += 7;
  }

  if (data.gstEnabled) {
    doc.text(`GST (${data.gstRate}%):`, labelX, sy); doc.text(formatINR(data.gstAmount || 0), valueX, sy, { align: 'right' }); sy += 7;
  }

  // divider
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(labelX, sy + 3, valueX, sy + 3);
  sy += 9;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('NET PAYABLE (Rounded):', labelX, sy);
  doc.text(formatINR(data.grandTotal || 0), valueX, sy, { align: 'right' });

  y += sumBoxH + 12;

  // ---------------- Insert PROJECT DURATION, PAYMENT TIMELINE, HARDWARE NOTE ----------------
  const smallHeading = (t: string) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0, 0, 0); doc.text(t, margin, y); y += 6; };
  const smallBody = (s: string) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(8.2); const lines = doc.splitTextToSize(s, contentW); doc.text(lines, margin, y); y += lines.length * 4 + 6; };

  ensureSpace(80);
  smallHeading('1. PROJECT DURATION');
  smallBody('PROJECT DURATION FOR 30 DAYS (AFTER DESIGN PHASE): Once design sign-off is complete and payments are on schedule, execution begins. The typical execution duration is 30 days from the start of production (excluding design). Delays caused by site readiness, client vendors, or payment delays are excluded.');

  ensureSpace(80);
  smallHeading('2. PAYMENT TIMELINE');
  // timeline table (compact)
  autoTable(doc, {
    startY: y,
    head: [['Stage', 'Percent', 'Description']],
    body: [
      ['Design (Advance)', '10%', 'Initial design & confirmation'],
      ['Production', '40%', 'Move into production (carcass)'],
      ['After Material Dispatch', '30%', 'Payment after material dispatched to site'],
      ['Hardware & Accessories', '25%', 'Payment for hardware & accessories (fittings)'],
      ['Handles & Handover', '5%', 'On the day of handover']
    ],
    theme: 'plain',
    headStyles: { fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8, cellPadding: 4 },
    columnStyles: { 0: { cellWidth: contentW * 0.35 }, 1: { cellWidth: contentW * 0.15, halign: 'center' }, 2: { cellWidth: contentW * 0.45 } },
    margin: { left: margin, right: margin }
  });
  y = ((doc as any).lastAutoTable && (doc as any).lastAutoTable.finalY) ? (doc as any).lastAutoTable.finalY + 8 : y + 36;

  ensureSpace(80);
  smallHeading('3. HARDWARE & FITTINGS NOTE');
  smallBody('All hardware will be Ebco fittings by default. Hafele and Hettich fittings are available on request and will be charged extra depending on model & availability. Final selection & extra charges (if any) will be confirmed before dispatch.');

  // ---------------- Terms bullets (short) ----------------
  ensureSpace(120);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text('MATERIAL DISPATCH & EXECUTION PROCESS', margin, y); y += 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  const bullets = [
    'After receiving the second stage payment, material will be dispatched within 2 working weeks.',
    'Delivery schedule may vary with prior notice.',
    'Any design changes after finalization will incur extra cost.',
    'All applicable taxes are additional.',
    'Civil, plumbing, granite, and tiling work are not included.'
  ];
  bullets.forEach(b => { ensureSpace(40); const bl = doc.splitTextToSize('• ' + b, contentW); doc.text(bl, margin + 3, y); y += bl.length * 4 + 2; });

  // ---------------- Signature block ----------------
  ensureSpace(90);
  doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.3); doc.line(margin, y, pageW - margin, y); y += 8;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('CUSTOMER ACCEPTANCE', margin, y); y += 9;

  const signW = 80; const signH = 36;
  doc.roundedRect(margin, y, signW, signH, 2, 2); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(110, 110, 110); doc.text('Customer Signature', margin + 4, y + signH + 6);
  const compX = pageW - margin - signW;
  doc.roundedRect(compX, y, signW, signH, 2, 2);
  if (compressedSignature) {
    try { doc.addImage(compressedSignature, 'JPEG', compX + 6, y + 6, signW - 12, signH - 10, undefined, 'FAST'); } catch (e) { console.warn('signature add error', e); }
  }
  doc.text(`For ${data.companyName || 'Company'}`, compX + 4, y + signH + 6);
  y += signH + 14;

  // footer
  doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(140, 140, 140);
  doc.text('This is a computer-generated quotation. Prices are valid for the period specified above.', pageW / 2, pageH - 8, { align: 'center' });

  const safeClient = (data.clientName || 'client').replace(/\s+/g, '_');
  doc.save(`Quotation_${safeClient}.pdf`);
};


