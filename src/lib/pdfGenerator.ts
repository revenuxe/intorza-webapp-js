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
  quotationTitle?: string;
  clientName?: string;
  clientAddress?: string;
  dateOfProposal?: string;
  quotationValidTill?: string;
  placeOfProject?: string;
  warranty?: string;
  projectType?: string;
  sections?: Section[];
  subtotal?: number;
  gstEnabled?: boolean;
  gstRate?: number;
  gstAmount?: number;
  discount?: number;
  grandTotal?: number;
  companyLogo?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  gstin?: string;
  signatureUrl?: string;
  socialMediaDiscountPct?: number | null;
  totalSft?: number | null;
}

// ---- image compressor helper (reusable) ----
const compressImage = async (imageUrl: string, maxWidth: number, maxHeight: number): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxWidth || h > maxHeight) {
        const r = Math.min(maxWidth / w, maxHeight / h);
        w = Math.round(w * r);
        h = Math.round(h * r);
      }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context missing'));
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = reject;
    img.src = imageUrl;
  });

// ---- currency formatter used everywhere ----
const formatINR = (v?: number | null) => {
  const n = Number(v || 0);
  return '₹ ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ---- main generator ----
export const generateQuotationPDF = async (dataIn: QuotationData) => {
  // defaults
  const data: QuotationData = {
    gstRate: 18,
    gstEnabled: true,
    socialMediaDiscountPct: 6,
    sections: [],
    ...dataIn
  };

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = 12;

  // compress images (logo + signature)
  let compressedLogo: string | null = null;
  if (data.companyLogo) {
    try { compressedLogo = await compressImage(data.companyLogo, 360, 160); } catch (e) { console.warn(e); compressedLogo = null; }
  }
  let compressedSignature: string | null = null;
  if (data.signatureUrl) {
    try { compressedSignature = await compressImage(data.signatureUrl, 300, 100); } catch (e) { compressedSignature = null; }
  }

  // ---------- Header: small fixed-size logo at top-left + compact company info ----------
  const logoW = 40;
  const logoH = 28; // non-square helps avoid vertical stretch while keeping small
  const logoX = margin;
  const logoY = y;

  if (compressedLogo) {
    try { doc.addImage(compressedLogo, 'JPEG', logoX, logoY, logoW, logoH, undefined, 'FAST'); }
    catch (e) { console.warn('logo add failed', e); }
  } else {
    // fallback initials (no stretching)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text((data.companyName || 'COMPANY').slice(0, 12), logoX + 1, logoY + 10);
  }

  // compact company details to the right of logo (no big card)
  const infoX = logoX + logoW + 8;
  const infoMaxW = contentW - logoW - 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text(data.companyName || 'COMPANY NAME', infoX, logoY + 8, { maxWidth: infoMaxW });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(90, 90, 90);
  let infoY = logoY + 14;
  if (data.companyAddress) { const lines = doc.splitTextToSize(data.companyAddress, infoMaxW); doc.text(lines, infoX, infoY); infoY += lines.length * 3.8; }
  if (data.companyPhone) { doc.text(`Phone: ${data.companyPhone}`, infoX, infoY); infoY += 4.2; }
  if (data.companyEmail) { doc.text(`Email: ${data.companyEmail}`, infoX, infoY); infoY += 4.2; }
  if (data.gstin) { doc.text(`GSTIN: ${data.gstin}`, infoX, infoY); infoY += 4.2; }

  y += logoH + 8;

  // thin divider
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ---------- QUOTATION DETAILS (compact) ----------
  const detailH = 48;
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(margin, y, contentW, detailH, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('QUOTATION DETAILS', margin + 6, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const leftColX = margin + 6;
  const rightColX = margin + contentW / 2 + 4;
  let rowY = y + 18;
  const labelW = 36, valW = contentW / 2 - labelW - 18;

  doc.setFont('helvetica', 'bold'); doc.text('Project Name:', leftColX, rowY);
  doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(data.quotationTitle || '-', valW)[0], leftColX + labelW, rowY);

  rowY += 6; doc.setFont('helvetica', 'bold'); doc.text('Client Name:', leftColX, rowY);
  doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(data.clientName || '-', valW)[0], leftColX + labelW, rowY);

  rowY += 6; doc.setFont('helvetica', 'bold'); doc.text('Client Address:', leftColX, rowY);
  doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(data.clientAddress || '-', valW * 1.6), leftColX + labelW, rowY);

  rowY = y + 18; doc.setFont('helvetica', 'bold'); doc.text('Date of Proposal:', rightColX, rowY);
  doc.setFont('helvetica', 'normal'); doc.text(data.dateOfProposal || '-', rightColX + labelW, rowY);

  rowY += 6; doc.setFont('helvetica', 'bold'); doc.text('Valid Till:', rightColX, rowY);
  doc.setFont('helvetica', 'normal'); doc.text(data.quotationValidTill || '-', rightColX + labelW, rowY);

  rowY += 6; doc.setFont('helvetica', 'bold'); doc.text('Place of Project:', rightColX, rowY);
  doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(data.placeOfProject || '-', valW)[0], rightColX + labelW, rowY);

  y += detailH + 10;

  // ---------- helper: avoid clipping ----------
  const ensureSpace = (minSpace: number) => {
    if (y + minSpace > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // ---------- SECTIONS & ITEMS ----------
  for (const section of data.sections || []) {
    ensureSpace(100);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(30, 30, 30);
    doc.text(section.title.toUpperCase(), margin + 2, y);
    y += 8;

    // prepare table rows
    const rows = (section.items || []).map(it => [
      it.side || '-',
      it.productName || '-',
      it.productDetails || '-',
      (it.widthFt || 0).toFixed(1),
      (it.heightFt || 0).toFixed(1),
      (it.sftArea || 0).toFixed(2),
      formatINR(it.amount || 0)
    ]);

    // Use smaller font for units and amounts to prevent overflow:
    autoTable(doc, {
      startY: y,
      head: [['Side', 'Product Name', 'Product Details', 'Width (Ft)', 'Height (Ft)', 'SQFT', 'Amount']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 16, halign: 'center' },
        1: { cellWidth: 46, halign: 'left' },
        2: { cellWidth: 62, halign: 'left' },
        // reduce units font size and cell width slightly so they fit neatly
        3: { cellWidth: 18, halign: 'center', fontSize: 7 },
        4: { cellWidth: 18, halign: 'center', fontSize: 7 },
        5: { cellWidth: 18, halign: 'center', fontSize: 7 },
        // widen amount column substantially and make amount font smaller (prevents overflow)
        6: { cellWidth: 56, halign: 'right', fontSize: 7.2 }
      },
      margin: { left: margin, right: margin },
      tableWidth: 'auto'
    });

    y = ((doc as any).lastAutoTable && (doc as any).lastAutoTable.finalY) ? (doc as any).lastAutoTable.finalY + 6 : y + 34;

    // section total
    const sectionTotal = (section.items || []).reduce((s, it) => s + (it.amount || 0), 0);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    const totalX = pageW - margin - 84;
    doc.text('SECTION TOTAL', totalX + 6, y);
    doc.text(formatINR(sectionTotal), pageW - margin - 6, y, { align: 'right' });
    y += 12;
  }

  // ---------- PAYMENT SUMMARY (with default Social Media Discount 6% & GST line) ----------
  ensureSpace(100);
  const summaryH = 76;
  doc.setFillColor(252, 252, 252);
  doc.roundedRect(margin, y, contentW, summaryH, 4, 4, 'F');
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.35);
  doc.roundedRect(margin, y, contentW, summaryH, 4, 4);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(0, 0, 0);
  doc.text('PAYMENT SUMMARY', margin + 8, y + 10);

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  let sy = y + 18;
  const leftLabelX = margin + 8;
  const rightValueX = margin + contentW - 8;

  // Subtotal
  doc.text('Subtotal:', leftLabelX, sy);
  doc.text(formatINR(data.subtotal || 0), rightValueX, sy, { align: 'right' });
  sy += 7;

  // Social media discount line (default 6%):
  const smPct = data.socialMediaDiscountPct ?? 6;
  if (smPct > 0) {
    const smAmt = Number((data.subtotal || 0) * (smPct / 100));
    doc.text(`SOCIAL MEDIA SPECIAL DISCOUNT@ ${smPct}%:`, leftLabelX, sy);
    doc.text(`- ${formatINR(smAmt)}`, rightValueX, sy, { align: 'right' });
    sy += 7;
  }

  // GST
  if (data.gstEnabled) {
    const gstAmt = data.gstAmount != null ? data.gstAmount : Number(((data.subtotal || 0) - (data.discount || 0)) * ((data.gstRate || 18) / 100));
    doc.text(`GST of ${data.gstRate ?? 18}%:`, leftLabelX, sy);
    doc.text(formatINR(gstAmt), rightValueX, sy, { align: 'right' });
    sy += 7;
  }

  // TOTAL SFT (if provided)
  if (data.totalSft != null) {
    doc.text('TOTAL SFT:', leftLabelX, sy);
    doc.text(String(data.totalSft), rightValueX, sy, { align: 'right' });
    sy += 7;
  }

  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(leftLabelX, sy + 3, rightValueX, sy + 3);
  sy += 9;

  // Total / Net payable
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('NET PAYABLE (Rounded):', leftLabelX, sy);
  // prefer explicit grandTotal if provided, otherwise compute
  const computedGrand = data.grandTotal != null ? data.grandTotal : Number((data.subtotal || 0) - (data.discount || 0) - ((data.subtotal || 0) * ((smPct) / 100)) + (data.gstAmount || 0));
  doc.text(formatINR(computedGrand), rightValueX, sy, { align: 'right' });

  y += summaryH + 12;

  // ---------- Insert the long Terms & Conditions / Site readiness / revision-drawings text verbatim ----------
  ensureSpace(120);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0, 0, 0);
  doc.text('TERMS & CONDITIONS & SITE READINESS', margin, y);
  y += 8;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  // large block copied from user (verbatim). We'll break into paragraphs and let splitTextToSize handle wrapping.
  const bigText = `
and then produce revision drawings that can be executed in one of four ways:  
1.) Provide the builder with amended civil, electrical, and plumbing details for completion.
2.) Hire DEXOHOMES to revise the civil, electrical, and plumbing systems according to the plans.
3.) Hire DEXOHOMES-recommended vendor to complete civil, electrical, and plumbing adjustments according to plans.
4.) Hire a client-owned vendor to complete civil, electrical, and plumbing adjustments according to plans.

The following is the procedure in such a case:
1.) DEXOHOMES site survey and measurement team does not take site measurements.
2.) Based on the builder's layout plan, the furniture arrangement (first cut plan and elevations) is established.

If the customer insists on having measurements taken on a place that does not meet the three conditions listed above, the client is responsible.
3.) Design services are suspended after the furniture design is finalised to a layout and elevation level.
At this time, there will be no more design discussions about finishes and detailing.
4.) An invoice is issued for the remaining 15% payment.
5.) As per the payment, revised civil, electrical, and/or plumbing drawings are created, authorised, and given.
above-mentioned terms and conditions
6.) Design services are then put on hold until the project is ready for ownership and/or the builder's handover date, by accordance with the suspending design services terms and conditions listed below.
7.) Because the client has paid up to 20% of the projected project value, the estimated prices are valid. Guaranteed for an additional two months, bringing the total validity to six months.

(II) Site CONDITION is assessed again during the Kickoff meeting, resulting in the start of the Execution phase following the Client's approval.
The following four parts of the site should be completed for order for the Kickoff meeting to proceed according to DEXOHOMES guidelines:
1.) The flooring should be finished.
2.) Plastering should be done on the walls.
3.) Work on the electrical and plumbing systems should be completed.
4.) All work on the site must be reviewed and signed off.

If these tasks aren't accomplished, the site's preparedness isn't complete, and the Execution phase can't get started. If site readiness is not available, we will not be able to complete the project's execution and installation phases.
The Client is responsible for ensuring that the site is ready for installation and that there are no delays or pending work from the builder or the client's vendors.

DELAYS AND QUALITY PROBLEMS DURING THE DESIGN PHASE PENALTY
When we say we'll finish your project in 45 days, 60 days, or 90 days, we're referring to the time it takes to execute the project after Design Sign-off. In terms of execution, the agreement specifies the beginning and finishing dates.
The Design deadlines are in addition to the execution timelines already mentioned. Commencement Date (of Project): The starting date is the date on which the Accounts team realises the 5% advance as per the estimate.
Date of completion (of the project's design phase): The completion date is when we receive 55 per cent of the cash and the Client gives a final sign-off on all drawings and the scope of work.

The following activities will take place in the first two weeks after the 5 per cent advance is realised:
1.) The Client Happiness team will call you to say hello.
2.) Scheduling of site visits by the Site Measurement, Survey, and Record teams (this is subject to Site Readiness, which the customer must confirm).
3.) Designer assignment.
4.) Designers' initial contact with the client.
5.) The first meeting at the site will be organised and finished within the first 7-10 days, if possible, based on mutual convenience (DEXOHHOMES designer & Client) (and Site preparedness).

* Any delays caused by Client vendors, Site readiness, Payment delays, Client Selections not completed, Builder delays, Client delays in accepting quotations, and other delays due to Client dependencies in the design service days and/or due to force majeure conditions will not be included in the delayed days.
* After a two-week grace period, DEXOHOMES will charge Rs. 5,000 per week on a pro-rata basis for all days of delay beyond the handover date due to DEXOHOMES faults.
* The penalty will not exceed 5% of the project's total value.
* Aside from the above-mentioned delay compensation, no other compensation would be offered.

CHANGES IN DESIGN DUE TO TECHNICAL IMPOSSIBILITY
Due to site conditions, material modifications, and/or other factors, there may be design adjustments at the time of implementation. When the Client is informed of the changes, they should approve them.
`;

  // split into paragraphs and render with paging
  const paragraphs = bigText.trim().split(/\n\s*\n/);
  for (const p of paragraphs) {
    ensureSpace(80);
    const lines = doc.splitTextToSize(p.trim(), contentW);
    doc.text(lines, margin, y);
    y += lines.length * 4 + 6;
  }

  // ---------- Acceptance & signature lines (as requested) ----------
  ensureSpace(120);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0, 0, 0);
  doc.text('Accepteance from Customer For DEXOHOMES.', margin, y);
  y += 8;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text('Signatory Authorized Signatory', margin, y);
  y += 14;

  // signature boxes
  ensureSpace(90);
  const sigW = 86, sigH = 36;
  doc.roundedRect(margin, y, sigW, sigH, 2, 2); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(110, 110, 110);
  doc.text('Customer Signature', margin + 4, y + sigH + 6);

  const compX = pageW - margin - sigW;
  doc.roundedRect(compX, y, sigW, sigH, 2, 2);
  if (compressedSignature) {
    try { doc.addImage(compressedSignature, 'JPEG', compX + 6, y + 6, sigW - 12, sigH - 10, undefined, 'FAST'); } catch (e) { /* ignore */ }
  }
  doc.text(`For ${data.companyName || 'DEXOHOMES'}`, compX + 4, y + sigH + 6);
  y += sigH + 12;

  // ---------- final footer ----------
  doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(140, 140, 140);
  doc.text('This is a computer-generated quotation. Prices are valid for the period specified above.', pageW / 2, pageH - 8, { align: 'center' });

  // save
  const safeName = (data.clientName || 'client').replace(/\s+/g, '_');
  doc.save(`Quotation_${safeName}.pdf`);
};




