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
    description: 'Elegant gold accents on dark theme',
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
    description: 'Warm beige tones for interior design',
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
    description: 'Professional blue corporate theme',
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
    description: 'Modern dark theme with subtle contrasts',
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
    description: 'Natural green tones for eco-friendly feel',
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
    description: 'Rich burgundy for luxury projects',
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
    description: 'Calming teal and aqua tones',
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
    description: 'Sophisticated charcoal with orange accents',
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
    description: 'Soft rose tones for feminine touch',
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
];

export interface PDFEditorSettings {
  theme: string;
  logoPlacement: 'left' | 'center' | 'right';
  highlightAmounts: boolean;
  showBorders: boolean;
  compactMode: boolean;
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
