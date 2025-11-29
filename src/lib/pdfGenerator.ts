import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface LineItem {
  side: string;
  productName: string;
  productDetails: string;
  widthFt: number;
  heightFt: number;
  depth: number;
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
}

export const generateQuotationPDF = async (data: QuotationData) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Add company logo at top center if available
  if (data.companyLogo) {
    try {
      const img = new Image();
      img.src = data.companyLogo;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      const imgWidth = 40;
      const imgHeight = 30;
      doc.addImage(data.companyLogo, 'PNG', (pageWidth - imgWidth) / 2, yPosition, imgWidth, imgHeight);
      yPosition += imgHeight + 10;
    } catch (error) {
      console.error('Error loading logo:', error);
    }
  }

  // Company name
  if (data.companyName) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(data.companyName, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;
  }

  // Quotation title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(200, 150, 50); // Gold color
  doc.text(data.quotationTitle, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Client and project details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  const leftColumn = 20;
  const rightColumn = 120;
  
  doc.text(`Client Name: ${data.clientName}`, leftColumn, yPosition);
  yPosition += 6;
  doc.text(`Client Address: ${data.clientAddress}`, leftColumn, yPosition);
  yPosition += 6;
  doc.text(`Date of Proposal: ${data.dateOfProposal}`, leftColumn, yPosition);
  doc.text(`Place of Project: ${data.placeOfProject}`, rightColumn, yPosition);
  yPosition += 6;
  doc.text(`Quotation Valid till: ${data.quotationValidTill}`, leftColumn, yPosition);
  doc.text(`Warranty: ${data.warranty} Years`, rightColumn, yPosition);
  yPosition += 6;
  doc.text(`Project Estimate: INR ₹${data.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, leftColumn, yPosition);
  yPosition += 6;
  doc.text(`Project Type: ${data.projectType}`, leftColumn, yPosition);
  yPosition += 10;

  // Add sections with items
  for (const section of data.sections) {
    // Check if we need a new page
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 20;
    }

    // Section heading
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(leftColumn - 5, yPosition - 5, pageWidth - 30, 8, 'F');
    doc.text(section.title.toUpperCase(), leftColumn, yPosition);
    yPosition += 10;

    // Create table for section items
    const tableData = section.items.map(item => [
      item.side,
      item.productName,
      item.productDetails,
      item.widthFt.toString(),
      item.heightFt.toString(),
      item.depth.toString(),
      item.sftArea.toFixed(2),
      `₹${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    ]);

    (doc as any).autoTable({
      startY: yPosition,
      head: [['Side', 'Product Name', 'Product Details', 'Width (Ft)', 'Height (Ft)', 'Depth', 'Sft Area', 'Amount']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 8
      },
      bodyStyles: {
        fontSize: 8
      },
      columnStyles: {
        2: { cellWidth: 50 }, // Product Details wider
        7: { halign: 'right' } // Amount right-aligned
      },
      margin: { left: leftColumn, right: leftColumn }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 5;

    // Section total
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const sectionTotal = section.items.reduce((sum, item) => sum + item.amount, 0);
    doc.text(`TOTAL: ₹${sectionTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, pageWidth - 30, yPosition, { align: 'right' });
    yPosition += 10;
  }

  // Payment Summary
  if (yPosition > pageHeight - 60) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT SUMMARY', leftColumn, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Net Amount: INR ₹${data.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, leftColumn, yPosition);
  yPosition += 6;

  if (data.gstEnabled) {
    doc.text(`GST of ${data.gstRate}%: INR ₹${data.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, leftColumn, yPosition);
    yPosition += 6;
  } else {
    doc.text('GST of 18%: INR ₹0.00', leftColumn, yPosition);
    yPosition += 6;
  }

  if (data.discount > 0) {
    doc.text(`Discount: INR ₹${data.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, leftColumn, yPosition);
    yPosition += 6;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Net payable Amount: INR ₹${data.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, leftColumn, yPosition);
  yPosition += 15;

  // Professional Advantages section
  if (data.professionalAdvantages) {
    if (yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Take Professional Advantages from ${data.companyName || 'Us'}`, leftColumn, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const advantagesLines = doc.splitTextToSize(data.professionalAdvantages, pageWidth - 40);
    doc.text(advantagesLines, leftColumn, yPosition);
    yPosition += advantagesLines.length * 5 + 10;

    // Professional advantages details
    const advantages = [
      { title: 'Costs for designers', desc: "You will be assigned a personal designer who will assist you in designing your ideal home." },
      { title: 'Experience in 2D and 3D design', desc: 'We will assist you in virtually experiencing your new house before you make a decision.' },
      { title: 'Management of projects', desc: 'Our Execution Team will take care of everything and ensure that your new house is built on time.' },
      { title: 'Warranty on service', desc: 'Product warranties range from one to five years, depending on the product type and the manufacturer guarantee.' },
      { title: 'QUALITY OF MATERIAL', desc: 'The greatest Indian and international brands would be chosen by the client.' },
      { title: 'ENTIRE TRANSPARENCY', desc: 'We are known for our dedication; everything is included in the final quote, and there are no additional or hidden fees.' }
    ];

    for (const adv of advantages) {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.text(adv.title, leftColumn, yPosition);
      yPosition += 5;
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(adv.desc, pageWidth - 40);
      doc.text(descLines, leftColumn, yPosition);
      yPosition += descLines.length * 5 + 5;
    }
  }

  // Save PDF
  doc.save(`Quotation_${data.clientName.replace(/\s+/g, '_')}.pdf`);
};
