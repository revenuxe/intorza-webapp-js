export function quotationPdfFilename(customerName: string, referenceNo?: string | null) {
  const clean = (value: string) => Array.from(value).filter(char => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127).join('').replace(/[<>:"/\\|?*]/g, '').trim().replace(/[. ]+$/g, '');
  return `${clean(customerName).replace(/\s+/g, '_') || 'Customer'}_${clean(referenceNo || '') || 'Quotation'}.pdf`;
}

export function whatsappNumber(phone?: string | null) {
  if (!phone || !/^\+?[\d\s().-]+$/.test(phone.trim())) return null;
  const number = phone.trim().replace(/^00/, '').replace(/\D/g, '');
  return /^[1-9]\d{7,14}$/.test(number) ? number : null;
}

export async function shareQuotationFile(file: File, message: string): Promise<'shared' | 'cancelled' | 'unsupported' | 'retry'> {
  try {
    if (!navigator.share || !navigator.canShare?.({ files: [file] })) return 'unsupported';
    await navigator.share({ files: [file], text: message, title: file.name });
    return 'shared';
  } catch (error) {
    return error instanceof Error && error.name === 'AbortError' ? 'cancelled' : 'retry';
  }
}

export function quotationWhatsappMessage(customer: string, company: string, reference: string) {
  return `Hello ${customer} 👋

Greetings from ${company}!

Thank you for your interest in our interior design services.

We are pleased to share your interior quotation.

📋 *Ref No: ${reference}*

Please find your detailed quotation PDF attached for your review.

If you have any questions or require changes, feel free to contact us.

We look forward to creating your dream space!

Best regards,
${company}`;
}
