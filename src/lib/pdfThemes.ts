// PDF Theme Configuration
export interface PDFTheme {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: [number, number, number];
    secondary: [number, number, number];
    accent: [number, number, number];
    background: [number, number, number];
    cardBackground: [number, number, number];
    text: [number, number, number];
    textSecondary: [number, number, number];
    border: [number, number, number];
    highlight: [number, number, number];
    headerBg: [number, number, number];
    headerText: [number, number, number];
  };
  fonts: {
    heading: string;
    body: string;
  };
}

export const PDF_THEMES: PDFTheme[] = [
  {
    id: 'minimal-white',
    name: 'Minimal White',
    description: 'Clean and professional white theme',
    colors: {
      primary: [20, 20, 20],
      secondary: [80, 80, 80],
      accent: [0, 0, 0],
      background: [255, 255, 255],
      cardBackground: [250, 250, 250],
      text: [20, 20, 20],
      textSecondary: [100, 100, 100],
      border: [230, 230, 230],
      highlight: [255, 240, 0],
      headerBg: [255, 255, 255],
      headerText: [20, 20, 20],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'luxury-gold',
    name: 'Luxury Gold',
    description: 'Elegant gold accents on dark',
    colors: {
      primary: [212, 175, 55],
      secondary: [180, 142, 73],
      accent: [212, 175, 55],
      background: [255, 255, 255],
      cardBackground: [250, 248, 245],
      text: [40, 35, 30],
      textSecondary: [90, 80, 70],
      border: [212, 175, 55],
      highlight: [255, 223, 128],
      headerBg: [40, 35, 30],
      headerText: [212, 175, 55],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'soft-beige',
    name: 'Soft Beige',
    description: 'Warm beige tones for interiors',
    colors: {
      primary: [139, 119, 101],
      secondary: [169, 149, 131],
      accent: [139, 119, 101],
      background: [255, 255, 255],
      cardBackground: [250, 245, 240],
      text: [60, 50, 40],
      textSecondary: [120, 110, 100],
      border: [220, 210, 200],
      highlight: [255, 235, 200],
      headerBg: [139, 119, 101],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'corporate-blue',
    name: 'Corporate Blue',
    description: 'Professional blue corporate',
    colors: {
      primary: [30, 64, 124],
      secondary: [70, 104, 164],
      accent: [30, 64, 124],
      background: [255, 255, 255],
      cardBackground: [245, 248, 252],
      text: [30, 40, 60],
      textSecondary: [80, 90, 110],
      border: [200, 210, 230],
      highlight: [200, 220, 255],
      headerBg: [30, 64, 124],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'dark-matte',
    name: 'Dark Matte',
    description: 'Modern dark with subtle contrasts',
    colors: {
      primary: [255, 255, 255],
      secondary: [180, 180, 180],
      accent: [255, 200, 100],
      background: [255, 255, 255],
      cardBackground: [245, 245, 245],
      text: [30, 30, 30],
      textSecondary: [80, 80, 80],
      border: [60, 60, 60],
      highlight: [255, 200, 100],
      headerBg: [30, 30, 30],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    description: 'Natural green eco-friendly',
    colors: {
      primary: [46, 87, 67],
      secondary: [76, 117, 97],
      accent: [46, 87, 67],
      background: [255, 255, 255],
      cardBackground: [245, 250, 248],
      text: [30, 50, 40],
      textSecondary: [80, 100, 90],
      border: [180, 200, 190],
      highlight: [200, 235, 220],
      headerBg: [46, 87, 67],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'burgundy-elegant',
    name: 'Burgundy Elegant',
    description: 'Rich burgundy for luxury',
    colors: {
      primary: [128, 0, 32],
      secondary: [158, 30, 62],
      accent: [128, 0, 32],
      background: [255, 255, 255],
      cardBackground: [252, 248, 250],
      text: [50, 30, 35],
      textSecondary: [100, 80, 85],
      border: [220, 200, 205],
      highlight: [255, 220, 230],
      headerBg: [128, 0, 32],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    description: 'Calming teal and aqua',
    colors: {
      primary: [0, 128, 128],
      secondary: [32, 158, 158],
      accent: [0, 128, 128],
      background: [255, 255, 255],
      cardBackground: [245, 252, 252],
      text: [30, 60, 60],
      textSecondary: [80, 110, 110],
      border: [180, 220, 220],
      highlight: [200, 245, 245],
      headerBg: [0, 128, 128],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'charcoal-modern',
    name: 'Charcoal Modern',
    description: 'Charcoal with orange accents',
    colors: {
      primary: [54, 54, 54],
      secondary: [84, 84, 84],
      accent: [255, 140, 0],
      background: [255, 255, 255],
      cardBackground: [248, 248, 248],
      text: [40, 40, 40],
      textSecondary: [90, 90, 90],
      border: [200, 200, 200],
      highlight: [255, 220, 180],
      headerBg: [54, 54, 54],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'rose-pink',
    name: 'Rose Pink',
    description: 'Soft rose feminine touch',
    colors: {
      primary: [188, 143, 143],
      secondary: [208, 163, 163],
      accent: [188, 143, 143],
      background: [255, 255, 255],
      cardBackground: [255, 250, 250],
      text: [80, 60, 60],
      textSecondary: [130, 110, 110],
      border: [230, 210, 210],
      highlight: [255, 230, 230],
      headerBg: [188, 143, 143],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'midnight-purple',
    name: 'Midnight Purple',
    description: 'Deep purple elegance',
    colors: {
      primary: [75, 0, 130],
      secondary: [138, 43, 226],
      accent: [147, 112, 219],
      background: [255, 255, 255],
      cardBackground: [250, 248, 255],
      text: [45, 25, 70],
      textSecondary: [100, 80, 130],
      border: [200, 180, 220],
      highlight: [230, 200, 255],
      headerBg: [75, 0, 130],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'slate-professional',
    name: 'Slate Professional',
    description: 'Clean slate gray business',
    colors: {
      primary: [71, 85, 105],
      secondary: [100, 116, 139],
      accent: [71, 85, 105],
      background: [255, 255, 255],
      cardBackground: [248, 250, 252],
      text: [30, 41, 59],
      textSecondary: [100, 116, 139],
      border: [226, 232, 240],
      highlight: [241, 245, 249],
      headerBg: [71, 85, 105],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'terracotta-warm',
    name: 'Terracotta Warm',
    description: 'Earthy terracotta warmth',
    colors: {
      primary: [180, 90, 60],
      secondary: [200, 120, 90],
      accent: [180, 90, 60],
      background: [255, 255, 255],
      cardBackground: [255, 250, 245],
      text: [70, 40, 30],
      textSecondary: [130, 100, 80],
      border: [230, 200, 180],
      highlight: [255, 220, 200],
      headerBg: [180, 90, 60],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'navy-classic',
    name: 'Navy Classic',
    description: 'Timeless navy professional',
    colors: {
      primary: [0, 32, 63],
      secondary: [0, 53, 102],
      accent: [0, 82, 147],
      background: [255, 255, 255],
      cardBackground: [245, 248, 252],
      text: [0, 32, 63],
      textSecondary: [60, 80, 100],
      border: [180, 200, 220],
      highlight: [220, 235, 255],
      headerBg: [0, 32, 63],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'emerald-luxury',
    name: 'Emerald Luxury',
    description: 'Rich emerald sophistication',
    colors: {
      primary: [0, 100, 80],
      secondary: [16, 185, 129],
      accent: [52, 211, 153],
      background: [255, 255, 255],
      cardBackground: [240, 253, 250],
      text: [6, 78, 59],
      textSecondary: [20, 83, 45],
      border: [167, 243, 208],
      highlight: [209, 250, 229],
      headerBg: [0, 100, 80],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
];

export interface PDFEditorSettings {
  theme: string;
  logoPlacement: 'left' | 'center' | 'right';
  highlightAmounts: boolean;
  showBorders: boolean;
  compactMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
  tableStyle: 'minimal' | 'striped' | 'bordered';
  headerStyle: 'simple' | 'boxed' | 'underlined';
  customColors?: {
    primary?: string;
    accent?: string;
    highlight?: string;
  };
}

export const defaultEditorSettings: PDFEditorSettings = {
  theme: 'minimal-white',
  logoPlacement: 'left',
  highlightAmounts: true,
  showBorders: true,
  compactMode: false,
  fontSize: 'medium',
  tableStyle: 'bordered',
  headerStyle: 'simple',
};

// Invoice Settings
export interface InvoiceSettings {
  showCompanyLogo: boolean;
  showCompanyAddress: boolean;
  showClientAddress: boolean;
  showProjectName: boolean;
  showDueDate: boolean;
  showPaymentStatus: boolean;
  showTaxGst: boolean;
  showPaymentHistory: boolean;
  showSignatureArea: boolean;
  showTermsConditions: boolean;
  showNextPaymentDue: boolean;
}

export const defaultInvoiceSettings: InvoiceSettings = {
  showCompanyLogo: true,
  showCompanyAddress: true,
  showClientAddress: true,
  showProjectName: true,
  showDueDate: true,
  showPaymentStatus: true,
  showTaxGst: true,
  showPaymentHistory: true,
  showSignatureArea: true,
  showTermsConditions: true,
  showNextPaymentDue: true,
};

export const getInvoiceSettings = (): InvoiceSettings => {
  const stored = localStorage.getItem('invoiceSettings');
  if (stored) {
    try {
      return { ...defaultInvoiceSettings, ...JSON.parse(stored) };
    } catch {
      return defaultInvoiceSettings;
    }
  }
  return defaultInvoiceSettings;
};

export const saveInvoiceSettings = (settings: InvoiceSettings) => {
  localStorage.setItem('invoiceSettings', JSON.stringify(settings));
};

export const getEditorSettings = (): PDFEditorSettings => {
  const stored = localStorage.getItem('pdfEditorSettings');
  if (stored) {
    try {
      return { ...defaultEditorSettings, ...JSON.parse(stored) };
    } catch {
      return defaultEditorSettings;
    }
  }
  return defaultEditorSettings;
};

export const saveEditorSettings = (settings: PDFEditorSettings) => {
  localStorage.setItem('pdfEditorSettings', JSON.stringify(settings));
};

export const getThemeById = (themeId: string): PDFTheme => {
  return PDF_THEMES.find(t => t.id === themeId) || PDF_THEMES[0];
};

// Convert hex to RGB
export const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
};

// Convert RGB to hex
export const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
};
