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
interface Section { title: string; items: LineItem[]; }
interface QuotationData {
  quotationTitle: string; clientName: string; clientAddress: string;
  dateOfProposal: string; quotationValidTill: string; placeOfProject: string;
  warranty: string; projectType: string; sections: Section[]; subtotal: number;
  gstEnabled: boolean; gstRate: number; gstAmount: number; discount: number; grandTotal: number;
  companyLogo?: string; companyName?: string; companyAddress?: string;
  companyPhone?: string; companyEmail?: string; gstin?: string; signatureUrl?: string;
  socialMediaDiscountPct?: number;
}

const compressImage = async (imageUrl: string, maxW: number, maxH: number): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxW || h > maxH) {
        const r = Math.min(maxW / w, maxH / h);
        w = Math.round(w * r); h = Math.round(h * r);
      }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('no ctx'));
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = reject;
    img.src = imageUrl;
  });

const formatINR = (v?: number) => '₹ ' + Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const generateQuotationPDF = async (data: QuotationData) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight();
  const margin = 14, contentW = pageW - margin * 2;
  let y = 12;

  // compress assets
  let logoData: string | null = null, sigData: string | null = null;
  if (data.companyLogo) try { logoData = await compressImage(data.companyLogo, 300, 120); } catch { logoData = null; }
  if (data.signatureUrl) try { sigData = await compressImage(data.signatureUrl, 300, 100); } catch { sigData = null; }

  // ---------------- HEADER (SMALL logo top-left, compact info) ----------------
  const logoW = 36; const logoH = 36; // medium fixed size (prevents stretch)
  const logoX = margin, logoY = y;
  if (logoData) {
    try { doc.addImage(logoData, 'JPEG', logoX, logoY, logoW, logoH, undefined, 'FAST'); }
    catch { /* ignore */ }
  } else {
    // fallback initials
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.text((data.companyName || 'COMPANY').slice(0, 12), logoX + 2, logoY + 12);
  }

  // compact company info (no heavy background)
  const infoX = logoX + logoW + 8; const infoMaxW = contentW - logoW - 8;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(25, 25, 25);
  doc.text(data.companyName || 'COMPANY NAME', infoX, logoY + 8, { maxWidth: infoMaxW });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(90, 90, 90);
  let infoY = logoY + 14;
  if (data.companyAddress) { const a = doc.splitTextToSize(data.companyAddress, infoMaxW); doc.text(a, infoX, infoY); infoY += a.length * 3.8; }
  if (data.companyPhone) { doc.text(`Phone: ${data.companyPhone}`, infoX, infoY); infoY += 4.2; }
  if (data.companyEmail) { doc.text(`Email: ${data.companyEmail}`, infoX, infoY); infoY += 4.2; }
  if (data.gstin) { doc.text(`GSTIN: ${data.gstin}`, infoX, infoY); infoY += 4.2; }

  y += logoH + 8;
  doc.setDrawColor(230, 230, 230); doc.setLineWidth(0.3); doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ---------------- QUOTATION DETAILS (compact) ----------------
  const detailH = 48;
  doc.setFillColor(248, 248, 248); doc.roundedRect(margin, y, contentW, detailH, 3, 3, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(0,0,0);
  doc.text('QUOTATION DETAILS', margin + 6, y + 10);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  const leftX = margin + 6, rightX = margin + contentW / 2 + 4;
  let rowY = y + 18, labelW = 36, valW = contentW / 2 - labelW - 18;
  doc.setFont('helvetica', 'bold'); doc.text('Project Name:', leftX, rowY); doc.setFont('helvetica','normal'); doc.text(doc.splitTextToSize(data.quotationTitle || '-', valW)[0], leftX + labelW, rowY);
  rowY += 6; doc.setFont('helvetica','bold'); doc.text('Client Name:', leftX, rowY); doc.setFont('helvetica','normal'); doc.text(doc.splitTextToSize(data.clientName || '-', valW)[0], leftX + labelW, rowY);
  rowY += 6; doc.setFont('helvetica','bold'); doc.text('Client Address:', leftX, rowY); doc.setFont('helvetica','normal'); doc.text(doc.splitTextToSize(data.clientAddress || '-', valW * 1.6), leftX + labelW, rowY);
  rowY = y + 18; doc.setFont('helvetica','bold'); doc.text('Date of Proposal:', rightX, rowY); doc.setFont('helvetica','normal'); doc.text(data.dateOfProposal || '-', rightX + labelW, rowY);
  rowY += 6; doc.setFont('helvetica','bold'); doc.text('Valid Till:', rightX, rowY); doc.setFont('helvetica','normal'); doc.text(data.quotationValidTill || '-', rightX + labelW, rowY);
  rowY += 6; doc.setFont('helvetica','bold'); doc.text('Place of Project:', rightX, rowY); doc.setFont('helvetica','normal'); doc.text(doc.splitTextToSize(data.placeOfProject || '-', valW)[0], rightX + labelW, rowY);
  y += detailH + 10;

  // ---------------- ensureSpace helper ----------------
  const ensureSpace = (need: number) => {
    if (y + need > pageH - margin) { doc.addPage(); y = margin; }
  };

  // ---------------- SECTIONS & ITEMS: increase amount column width & right align ----------------
  for (const section of data.sections || []) {
    ensureSpace(100);
    doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(35,35,35); doc.text(section.title.toUpperCase(), margin + 2, y);
    y += 8;

    const body = (section.items || []).map(it => [
      it.side || '-', it.productName || '-', it.productDetails || '-', (it.widthFt||0).toFixed(1),
      (it.heightFt||0).toFixed(1), (it.sftArea||0).toFixed(2), formatINR(it.amount || 0)
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Side','Product Name','Product Details','Width (Ft)','Height (Ft)','SQFT','Amount']],
      body,
      theme: 'grid',
      headStyles: { fillColor:[245,245,245], textColor:[0,0,0], fontStyle:'bold', fontSize:8 },
      bodyStyles: { fontSize:8, cellPadding:4, overflow:'linebreak' },
      columnStyles: {
        0:{ cellWidth:16, halign:'center' },
        1:{ cellWidth:46, halign:'left' },
        2:{ cellWidth:62, halign:'left' },
        3:{ cellWidth:18, halign:'center' },
        4:{ cellWidth:18, halign:'center' },
        5:{ cellWidth:18, halign:'center' },
        // BIGGER amount column to avoid wrapping; right aligned and smaller font inside table
        6:{ cellWidth:48, halign:'right' }
      },
      margin:{ left: margin, right: margin },
      tableWidth: 'auto'
    });

    y = ((doc as any).lastAutoTable && (doc as any).lastAutoTable.finalY) ? (doc as any).lastAutoTable.finalY + 6 : y + 36;

    // section total — right aligned using fixed x
    const sTotal = (section.items || []).reduce((s, it) => s + (it.amount || 0), 0);
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.text('SECTION TOTAL', pageW - margin - 74, y);
    doc.text(formatINR(sTotal), pageW - margin - 6, y, { align: 'right' });
    y += 12;
  }

  // ---------------- PAYMENT SUMMARY (structured two-column layout to avoid overflow) ----------------
  ensureSpace(90);
  const sumBoxH = 70;
  doc.setFillColor(252,252,252); doc.roundedRect(margin, y, contentW, sumBoxH, 3, 3, 'F');
  doc.setDrawColor(230,230,230); doc.setLineWidth(0.35); doc.roundedRect(margin, y, contentW, sumBoxH, 3, 3);

  doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(0,0,0); doc.text('PAYMENT SUMMARY', margin + 8, y + 10);
  const leftCol = margin + 8; const rightCol = margin + contentW - 8;
  let sy = y + 18;
  doc.setFont('helvetica','normal'); doc.setFontSize(9);

  doc.text('Subtotal:', leftCol, sy); doc.text(formatINR(data.subtotal || 0), rightCol, sy, { align: 'right' }); sy += 7;

  if (data.socialMediaDiscountPct && data.socialMediaDiscountPct > 0) {
    const d = (data.subtotal || 0) * (data.socialMediaDiscountPct / 100);
    doc.text(`Social Media Discount (${data.socialMediaDiscountPct}%):`, leftCol, sy);
    doc.text(`- ${formatINR(d)}`, rightCol, sy, { align: 'right' });
    sy += 7;
  }

  if (data.discount && data.discount > 0) {
    doc.text('Discount:', leftCol, sy); doc.text(`- ${formatINR(data.discount)}`, rightCol, sy, { align: 'right' }); sy += 7;
  }

  if (data.gstEnabled) {
    doc.text(`GST (${data.gstRate}%):`, leftCol, sy); doc.text(formatINR(data.gstAmount || 0), rightCol, sy, { align: 'right' }); sy += 7;
  }

  // horizontal divider
  doc.setDrawColor(220,220,220); doc.setLineWidth(0.3); doc.line(leftCol, sy + 4, rightCol, sy + 4);
  sy += 9;
  doc.setFont('helvetica','bold'); doc.setFontSize(10);
  doc.text('NET PAYABLE (Rounded):', leftCol, sy); doc.text(formatINR(data.grandTotal || 0), rightCol, sy, { align: 'right' });

  y += sumBoxH + 12;

  // ---------------- PROJECT DURATION, PAYMENT TIMELINE, HARDWARE NOTE ----------------
  ensureSpace(110);
  doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.text('1. PROJECT DURATION', margin, y); y += 6;
  doc.setFont('helvetica','normal'); doc.setFontSize(8.2);
  const pd = 'PROJECT DURATION FOR 30 DAYS (AFTER DESIGN PHASE): Execution normally completes in 30 days from production start (design phase excluded). Delays due to site readiness, client delays, vendor issues or payment delays are excluded.';
  doc.text(doc.splitTextToSize(pd, contentW), margin, y); y += doc.splitTextToSize(pd, contentW).length * 4 + 6;

  ensureSpace(110);
  doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.text('2. PAYMENT TIMELINE', margin, y); y += 6;
  autoTable(doc, {
    startY: y,
    head: [['Stage','Percent','Notes']],
    body: [
      ['Design (Advance)','10%','For design & confirmation'],
      ['Production','40%','Move into production (carcass)'],
      ['After Material Dispatch','30%','Payment after materials dispatched to site'],
      ['Hardware & Accessories','25%','Payment for hardware & accessories (fittings)'],
      ['Handles & Handover','5%','On the day of handover']
    ],
    theme: 'striped',
    headStyles: { fontSize:9, fillColor:[245,245,245], fontStyle:'bold' },
    bodyStyles: { fontSize:8, cellPadding:4 },
    columnStyles: { 0:{ cellWidth: contentW*0.34 }, 1:{ cellWidth: contentW*0.14, halign:'center' }, 2:{ cellWidth: contentW*0.52 } },
    margin: { left: margin, right: margin }
  });
  y = ((doc as any).lastAutoTable && (doc as any).lastAutoTable.finalY) ? (doc as any).lastAutoTable.finalY + 8 : y + 36;

  ensureSpace(80);
  doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.text('3. HARDWARE & FITTINGS NOTE', margin, y); y += 6;
  doc.setFont('helvetica','normal'); doc.setFontSize(8.2);
  doc.text(doc.splitTextToSize('All hardware is Ebco by default. Hafele / Hettich available on request at extra cost. Final selection & charges confirmed before dispatch.', contentW), margin, y);
  y += 18;

  // ---------------- TERMS & CONDITIONS (expanded & grouped) ----------------
  ensureSpace(120);
  doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.text('TERMS & CONDITIONS', margin, y); y += 7;
  doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.text('Material & Dispatch', margin, y); y += 6;
  doc.setFont('helvetica','normal'); doc.setFontSize(8);
  const t1 = [
    'After receiving the 2nd stage payment, materials dispatched within 2 working weeks.',
    'Delivery schedule may vary with prior notice.',
    '2D and 3D drawings must be approved before production.'
  ];
  t1.forEach(s => { ensureSpace(40); doc.text('• ' + s, margin + 3, y); y += doc.splitTextToSize(s, contentW - 6).length * 4 + 2; });

  ensureSpace(100);
  doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.text('Site Readiness', margin, y); y += 6;
  doc.setFont('helvetica','normal'); doc.setFontSize(8);
  const t2 = [
    'Flooring must be finished before measurements.',
    'Plastering, electrical & plumbing must be complete for accurate measurements.',
    'If site not ready, DEXOHOMES will not take measurements and will pause design/execution.'
  ];
  t2.forEach(s => { ensureSpace(40); doc.text('• ' + s, margin + 3, y); y += doc.splitTextToSize(s, contentW - 6).length * 4 + 2; });

  ensureSpace(120);
  doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.text('Payment Delays & Penalties', margin, y); y += 6;
  doc.setFont('helvetica','normal'); doc.setFontSize(8);
  const t3 = [
    'Delay > 2 weeks after dispatch stage: storage charges of ₹5,000 per week.',
    'Delay > 1 month: warranty may be reduced proportionally.',
    'If payment delayed, dispatch moved to next available schedule.'
  ];
  t3.forEach(s => { ensureSpace(40); doc.text('• ' + s, margin + 3, y); y += doc.splitTextToSize(s, contentW - 6).length * 4 + 2; });

  // ---------------- SIGNATURE ----------------
  ensureSpace(100);
  doc.setDrawColor(220,220,220); doc.setLineWidth(0.3); doc.line(margin, y, pageW - margin, y); y += 8;
  doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.text('CUSTOMER ACCEPTANCE', margin, y); y += 9;
  const signW = 84, signH = 36;
  doc.roundedRect(margin, y, signW, signH, 2, 2); doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.text('Customer Signature', margin + 4, y + signH + 6);
  const compX = pageW - margin - signW;
  doc.roundedRect(compX, y, signW, signH, 2, 2);
  if (sigData) try { doc.addImage(sigData, 'JPEG', compX + 6, y + 6, signW - 12, signH - 10, undefined, 'FAST'); } catch {}
  doc.text(`For ${data.companyName || 'Company'}`, compX + 4, y + signH + 6);
  y += signH + 12;

  // footer
  doc.setFont('helvetica','italic'); doc.setFontSize(7.5); doc.setTextColor(140,140,140);
  doc.text('This is a computer-generated quotation. Prices valid for the period stated above.', pageW / 2, pageH - 8, { align: 'center' });

  const safeName = (data.clientName || 'client').replace(/\s+/g, '_');
  doc.save(`Quotation_${safeName}.pdf`);
};



