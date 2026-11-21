import { quotationPdfFilename, quotationWhatsappMessage, shareQuotationFile, whatsappNumber } from './quotationSharing';

test('quotation filenames preserve reference zeros and sanitize customer names', () => {
  expect(quotationPdfFilename('Rahul Sharma', 'QNO-00008H')).toBe('Rahul_Sharma_QNO-00008H.pdf');
  expect(quotationPdfFilename(' Priya / Reddy:*? ', 'QNO-00009A')).toBe('Priya_Reddy_QNO-00009A.pdf');
});

test('WhatsApp numbers normalize international formatting and reject malformed input', () => {
  expect(whatsappNumber('+91 (98765) 43210')).toBe('919876543210');
  expect(whatsappNumber('0091 98765 43210')).toBe('919876543210');
  for (const value of [null, '', '123', '09876543210', '91abc9876543210', '1234567890123456']) {
    expect(whatsappNumber(value)).toBeNull();
  }
});

test('message uses the supplied customer, business and exact quotation reference without a link', () => {
  const message = quotationWhatsappMessage('Rahul Sharma', 'Example Interiors', 'QNO-00008H');
  expect(message).toContain('Hello Rahul Sharma 👋');
  expect(message).toContain('Greetings from Example Interiors!');
  expect(message).toContain('*Ref No: QNO-00008H*');
  expect(message).not.toMatch(/https?:\/\//);
});

describe('native PDF sharing', () => {
  const file = new File(['pdf'], 'Rahul_QNO-00008H.pdf', { type: 'application/pdf' });
  const originalShare = Object.getOwnPropertyDescriptor(navigator, 'share');
  const originalCanShare = Object.getOwnPropertyDescriptor(navigator, 'canShare');

  afterEach(() => {
    for (const [key, descriptor] of [['share', originalShare], ['canShare', originalCanShare]] as const) {
      if (descriptor) Object.defineProperty(navigator, key, descriptor);
      else Reflect.deleteProperty(navigator, key);
    }
  });

  function setup(share = jest.fn().mockResolvedValue(undefined), supported = true) {
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: jest.fn().mockReturnValue(supported) });
    return share;
  }

  test('passes the actual PDF and message together without a recipient or link', async () => {
    const share = setup();
    expect(await shareQuotationFile(file, 'Quotation message')).toBe('shared');
    expect(share).toHaveBeenCalledWith({ files: [file], text: 'Quotation message', title: file.name });
  });

  test('does not share when files are unsupported', async () => {
    const share = setup(jest.fn(), false);
    expect(await shareQuotationFile(file, 'Message')).toBe('unsupported');
    expect(share).not.toHaveBeenCalled();
  });

  test('allows retry when the browser requires a new user gesture', async () => {
    setup(jest.fn().mockRejectedValue(new DOMException('User activation required', 'NotAllowedError')));
    expect(await shareQuotationFile(file, 'Message')).toBe('retry');
  });

  test('handles cancellation without claiming delivery', async () => {
    setup(jest.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError')));
    expect(await shareQuotationFile(file, 'Message')).toBe('cancelled');
  });
});
