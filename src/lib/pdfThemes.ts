// PDF Theme Configuration
export type BorderStyle = 'solid' | 'dashed' | 'dotted' | 'double' | 'ornate' | 'triple' | 'elegant' | 'chain' | 'zigzag' | 'rope';
export type CornerStyle = 'none' | 'simple' | 'rounded' | 'flourish' | 'decorative' | 'floral' | 'art-deco' | 'celtic' | 'indian' | 'baroque' | 'leaf' | 'scroll';
export type DividerStyle = 'line' | 'dots' | 'wave' | 'arrows' | 'diamonds' | 'hearts' | 'leaves' | 'stars' | 'paisley' | 'lotus' | 'geometric' | 'swirl' | 'chain' | 'fleur-de-lis';
export type HeaderDecoration = 'none' | 'underline' | 'box' | 'banner' | 'ribbon' | 'ornamental' | 'gradient-bar' | 'double-line' | 'bracket' | 'scroll';
export type WatermarkStyle = 'none' | 'subtle' | 'pattern' | 'logo' | 'mandala' | 'geometric' | 'floral-pattern' | 'damask';

export interface ThemeDecorations {
  borderStyle: BorderStyle;
  borderWidth: number;
  showCornerOrnaments: boolean;
  cornerStyle: CornerStyle;
  dividerStyle: DividerStyle;
  showSectionDividers: boolean;
  headerDecoration: HeaderDecoration;
  showHeaderAccent: boolean;
  showPageBorder: boolean;
  pageBorderInset: number;
  showWatermark: boolean;
  watermarkStyle: WatermarkStyle;
  watermarkOpacity: number;
  tableHeaderDecoration: 'plain' | 'gradient' | 'striped' | 'bordered';
  showTableRowDividers: boolean;
  showFooterDecoration: boolean;
  footerStyle: 'minimal' | 'centered' | 'ornamental';
}

export interface PDFTheme {
  id: string;
  name: string;
  description: string;
  category: 'professional' | 'floral' | 'abstract' | 'decoration' | 'minimal' | 'luxury';
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
    decorationPrimary?: [number, number, number];
    decorationSecondary?: [number, number, number];
  };
  fonts: {
    heading: string;
    body: string;
  };
  decorations: ThemeDecorations;
}

// Default decorations by category
const minimalDecorations: ThemeDecorations = {
  borderStyle: 'solid', borderWidth: 0.3, showCornerOrnaments: false, cornerStyle: 'none',
  dividerStyle: 'line', showSectionDividers: false, headerDecoration: 'none', showHeaderAccent: false,
  showPageBorder: false, pageBorderInset: 0, showWatermark: false, watermarkStyle: 'none', watermarkOpacity: 0,
  tableHeaderDecoration: 'plain', showTableRowDividers: false, showFooterDecoration: false, footerStyle: 'minimal',
};

const professionalDecorations: ThemeDecorations = {
  borderStyle: 'solid', borderWidth: 0.5, showCornerOrnaments: false, cornerStyle: 'simple',
  dividerStyle: 'line', showSectionDividers: true, headerDecoration: 'underline', showHeaderAccent: true,
  showPageBorder: false, pageBorderInset: 0, showWatermark: false, watermarkStyle: 'none', watermarkOpacity: 0,
  tableHeaderDecoration: 'bordered', showTableRowDividers: true, showFooterDecoration: false, footerStyle: 'minimal',
};

const luxuryDecorations: ThemeDecorations = {
  borderStyle: 'double', borderWidth: 1.2, showCornerOrnaments: true, cornerStyle: 'flourish',
  dividerStyle: 'diamonds', showSectionDividers: true, headerDecoration: 'ornamental', showHeaderAccent: true,
  showPageBorder: true, pageBorderInset: 12, showWatermark: false, watermarkStyle: 'none', watermarkOpacity: 0,
  tableHeaderDecoration: 'gradient', showTableRowDividers: true, showFooterDecoration: true, footerStyle: 'ornamental',
};

const floralDecorations: ThemeDecorations = {
  borderStyle: 'ornate', borderWidth: 1.5, showCornerOrnaments: true, cornerStyle: 'floral',
  dividerStyle: 'leaves', showSectionDividers: true, headerDecoration: 'ornamental', showHeaderAccent: true,
  showPageBorder: true, pageBorderInset: 10, showWatermark: true, watermarkStyle: 'pattern', watermarkOpacity: 0.03,
  tableHeaderDecoration: 'gradient', showTableRowDividers: true, showFooterDecoration: true, footerStyle: 'ornamental',
};

const abstractDecorations: ThemeDecorations = {
  borderStyle: 'solid', borderWidth: 2, showCornerOrnaments: true, cornerStyle: 'decorative',
  dividerStyle: 'diamonds', showSectionDividers: true, headerDecoration: 'banner', showHeaderAccent: true,
  showPageBorder: true, pageBorderInset: 8, showWatermark: true, watermarkStyle: 'pattern', watermarkOpacity: 0.02,
  tableHeaderDecoration: 'striped', showTableRowDividers: true, showFooterDecoration: true, footerStyle: 'centered',
};

const decorationDecorations: ThemeDecorations = {
  borderStyle: 'double', borderWidth: 1.5, showCornerOrnaments: true, cornerStyle: 'flourish',
  dividerStyle: 'wave', showSectionDividers: true, headerDecoration: 'ribbon', showHeaderAccent: true,
  showPageBorder: true, pageBorderInset: 10, showWatermark: true, watermarkStyle: 'subtle', watermarkOpacity: 0.04,
  tableHeaderDecoration: 'gradient', showTableRowDividers: true, showFooterDecoration: true, footerStyle: 'ornamental',
};

export const PDF_THEMES: PDFTheme[] = [
  // ===== MINIMAL THEMES =====
  {
    id: 'minimal-white',
    name: 'Minimal White',
    description: 'Clean and professional white theme',
    category: 'minimal',
    colors: {
      primary: [20, 20, 20], secondary: [80, 80, 80], accent: [0, 0, 0],
      background: [255, 255, 255], cardBackground: [250, 250, 250],
      text: [20, 20, 20], textSecondary: [100, 100, 100], border: [230, 230, 230],
      highlight: [255, 240, 0], headerBg: [255, 255, 255], headerText: [20, 20, 20],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: minimalDecorations,
  },
  {
    id: 'minimalist-black',
    name: 'Minimalist Black',
    description: 'Ultra-minimal monochrome',
    category: 'minimal',
    colors: {
      primary: [0, 0, 0], secondary: [50, 50, 50], accent: [0, 0, 0],
      background: [255, 255, 255], cardBackground: [250, 250, 250],
      text: [0, 0, 0], textSecondary: [80, 80, 80], border: [200, 200, 200],
      highlight: [240, 240, 240], headerBg: [0, 0, 0], headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: minimalDecorations,
  },
  
  // ===== PROFESSIONAL THEMES =====
  {
    id: 'corporate-blue',
    name: 'Corporate Blue',
    description: 'Professional blue corporate',
    category: 'professional',
    colors: {
      primary: [30, 64, 124], secondary: [70, 104, 164], accent: [30, 64, 124],
      background: [255, 255, 255], cardBackground: [245, 248, 252],
      text: [30, 40, 60], textSecondary: [80, 90, 110], border: [200, 210, 230],
      highlight: [200, 220, 255], headerBg: [30, 64, 124], headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: professionalDecorations,
  },
  {
    id: 'soft-beige',
    name: 'Soft Beige',
    description: 'Warm beige tones for interiors',
    category: 'professional',
    colors: {
      primary: [139, 119, 101], secondary: [169, 149, 131], accent: [139, 119, 101],
      background: [255, 255, 255], cardBackground: [250, 245, 240],
      text: [60, 50, 40], textSecondary: [120, 110, 100], border: [220, 210, 200],
      highlight: [255, 235, 200], headerBg: [139, 119, 101], headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: professionalDecorations,
  },
  {
    id: 'dark-matte',
    name: 'Dark Matte',
    description: 'Modern dark with subtle contrasts',
    category: 'professional',
    colors: {
      primary: [40, 40, 40], secondary: [80, 80, 80], accent: [255, 200, 100],
      background: [255, 255, 255], cardBackground: [245, 245, 245],
      text: [30, 30, 30], textSecondary: [80, 80, 80], border: [200, 200, 200],
      highlight: [255, 220, 180], headerBg: [40, 40, 40], headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: professionalDecorations,
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    description: 'Natural earthy green tones',
    category: 'professional',
    colors: {
      primary: [46, 125, 50], secondary: [76, 175, 80], accent: [27, 94, 32],
      background: [255, 255, 255], cardBackground: [248, 255, 248],
      text: [27, 42, 30], textSecondary: [66, 92, 70], border: [200, 230, 200],
      highlight: [220, 255, 220], headerBg: [46, 125, 50], headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: professionalDecorations,
  },
  {
    id: 'slate-grey',
    name: 'Slate Grey',
    description: 'Modern slate grey professional',
    category: 'professional',
    colors: {
      primary: [69, 90, 100], secondary: [96, 125, 139], accent: [69, 90, 100],
      background: [255, 255, 255], cardBackground: [248, 250, 252],
      text: [38, 50, 56], textSecondary: [84, 110, 122], border: [200, 210, 220],
      highlight: [225, 235, 245], headerBg: [55, 71, 79], headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: professionalDecorations,
  },
  {
    id: 'executive-grey',
    name: 'Executive Grey',
    description: 'Professional executive style',
    category: 'professional',
    colors: {
      primary: [66, 66, 66], secondary: [97, 97, 97], accent: [158, 158, 158],
      background: [255, 255, 255], cardBackground: [250, 250, 250],
      text: [33, 33, 33], textSecondary: [97, 97, 97], border: [224, 224, 224],
      highlight: [238, 238, 238], headerBg: [66, 66, 66], headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: professionalDecorations,
  },
  {
    id: 'cornflower-blue',
    name: 'Cornflower Blue',
    description: 'Soft blue professional look',
    category: 'professional',
    colors: {
      primary: [100, 149, 237], secondary: [135, 175, 245], accent: [65, 105, 225],
      background: [255, 255, 255], cardBackground: [248, 250, 255],
      text: [40, 55, 90], textSecondary: [85, 105, 145], border: [190, 210, 240],
      highlight: [220, 235, 255], headerBg: [100, 149, 237], headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: professionalDecorations,
  },
  
  // ===== LUXURY THEMES =====
  {
    id: 'luxury-gold',
    name: 'Luxury Gold',
    description: 'Elegant gold accents on dark',
    category: 'luxury',
    colors: {
      primary: [212, 175, 55], secondary: [180, 142, 73], accent: [212, 175, 55],
      background: [255, 255, 255], cardBackground: [250, 248, 245],
      text: [40, 35, 30], textSecondary: [90, 80, 70], border: [212, 175, 55],
      highlight: [255, 223, 128], headerBg: [40, 35, 30], headerText: [212, 175, 55],
      decorationPrimary: [212, 175, 55], decorationSecondary: [180, 142, 73],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: luxuryDecorations,
  },
  {
    id: 'marble-luxury',
    name: 'Marble Luxury',
    description: 'Premium marble with gold',
    category: 'luxury',
    colors: {
      primary: [183, 152, 95], secondary: [220, 196, 152], accent: [183, 152, 95],
      background: [255, 255, 255], cardBackground: [252, 251, 250],
      text: [45, 45, 45], textSecondary: [100, 100, 100], border: [220, 215, 210],
      highlight: [255, 245, 220], headerBg: [45, 45, 45], headerText: [183, 152, 95],
      decorationPrimary: [183, 152, 95], decorationSecondary: [220, 196, 152],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: luxuryDecorations,
  },
  {
    id: 'art-deco-gold',
    name: 'Art Deco Gold',
    description: 'Classic art deco with gold',
    category: 'luxury',
    colors: {
      primary: [207, 181, 59], secondary: [180, 155, 50], accent: [207, 181, 59],
      background: [255, 255, 255], cardBackground: [252, 250, 245],
      text: [30, 30, 30], textSecondary: [80, 75, 65], border: [207, 181, 59],
      highlight: [255, 245, 200], headerBg: [30, 30, 30], headerText: [207, 181, 59],
      decorationPrimary: [207, 181, 59], decorationSecondary: [255, 215, 80],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...luxuryDecorations, dividerStyle: 'arrows', cornerStyle: 'decorative' },
  },
  {
    id: 'royal-violet',
    name: 'Royal Violet',
    description: 'Regal purple sophistication',
    category: 'luxury',
    colors: {
      primary: [102, 51, 153], secondary: [138, 82, 186], accent: [186, 85, 211],
      background: [255, 255, 255], cardBackground: [252, 250, 255],
      text: [50, 30, 70], textSecondary: [100, 80, 120], border: [200, 180, 220],
      highlight: [235, 220, 255], headerBg: [102, 51, 153], headerText: [255, 255, 255],
      decorationPrimary: [138, 82, 186], decorationSecondary: [186, 85, 211],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: luxuryDecorations,
  },
  {
    id: 'rose-gold',
    name: 'Rose Gold',
    description: 'Elegant rose gold accent',
    category: 'luxury',
    colors: {
      primary: [183, 110, 121], secondary: [212, 148, 158], accent: [183, 110, 121],
      background: [255, 255, 255], cardBackground: [255, 252, 253],
      text: [55, 40, 45], textSecondary: [110, 90, 95], border: [230, 200, 205],
      highlight: [255, 235, 240], headerBg: [55, 40, 45], headerText: [212, 148, 158],
      decorationPrimary: [183, 110, 121], decorationSecondary: [212, 148, 158],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: luxuryDecorations,
  },
  {
    id: 'peacock-blue',
    name: 'Peacock Blue',
    description: 'Rich peacock feather tones',
    category: 'luxury',
    colors: {
      primary: [0, 95, 115], secondary: [0, 131, 143], accent: [0, 172, 193],
      background: [255, 255, 255], cardBackground: [248, 253, 255],
      text: [0, 60, 70], textSecondary: [45, 100, 115], border: [170, 210, 220],
      highlight: [210, 240, 250], headerBg: [0, 95, 115], headerText: [255, 255, 255],
      decorationPrimary: [0, 172, 193], decorationSecondary: [0, 131, 143],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...luxuryDecorations, dividerStyle: 'wave' },
  },
  {
    id: 'crystal-glam',
    name: 'Crystal Glam',
    description: 'Sparkling crystal luxury',
    category: 'luxury',
    colors: {
      primary: [176, 196, 222], secondary: [200, 215, 235], accent: [218, 165, 180],
      background: [255, 255, 255], cardBackground: [252, 254, 255],
      text: [50, 60, 80], textSecondary: [100, 115, 140], border: [210, 225, 245],
      highlight: [240, 248, 255], headerBg: [140, 165, 195], headerText: [255, 255, 255],
      decorationPrimary: [176, 196, 222], decorationSecondary: [218, 165, 180],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...luxuryDecorations, dividerStyle: 'stars' },
  },
  {
    id: 'velvet-night',
    name: 'Velvet Night',
    description: 'Deep velvet luxury feel',
    category: 'luxury',
    colors: {
      primary: [75, 0, 130], secondary: [106, 13, 173], accent: [148, 87, 235],
      background: [255, 255, 255], cardBackground: [252, 250, 255],
      text: [45, 20, 75], textSecondary: [95, 60, 130], border: [195, 170, 225],
      highlight: [235, 225, 255], headerBg: [55, 0, 100], headerText: [255, 255, 255],
      decorationPrimary: [148, 87, 235], decorationSecondary: [106, 13, 173],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: luxuryDecorations,
  },
  
  // ===== FLORAL THEMES =====
  {
    id: 'floral-blush',
    name: 'Floral Blush',
    description: 'Soft floral pink elegance',
    category: 'floral',
    colors: {
      primary: [219, 112, 147], secondary: [255, 182, 193], accent: [219, 112, 147],
      background: [255, 255, 255], cardBackground: [255, 250, 252],
      text: [80, 40, 60], textSecondary: [140, 100, 120], border: [255, 200, 210],
      highlight: [255, 228, 235], headerBg: [219, 112, 147], headerText: [255, 255, 255],
      decorationPrimary: [255, 182, 193], decorationSecondary: [219, 112, 147],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: floralDecorations,
  },
  {
    id: 'botanical-garden',
    name: 'Botanical Garden',
    description: 'Nature-inspired botanical greens',
    category: 'floral',
    colors: {
      primary: [85, 139, 47], secondary: [124, 179, 66], accent: [139, 195, 74],
      background: [255, 255, 255], cardBackground: [248, 255, 248],
      text: [33, 37, 41], textSecondary: [76, 90, 65], border: [200, 230, 200],
      highlight: [220, 255, 200], headerBg: [85, 139, 47], headerText: [255, 255, 255],
      decorationPrimary: [139, 195, 74], decorationSecondary: [124, 179, 66],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...floralDecorations, dividerStyle: 'leaves' },
  },
  {
    id: 'cherry-blossom',
    name: 'Cherry Blossom',
    description: 'Japanese sakura inspired',
    category: 'floral',
    colors: {
      primary: [255, 183, 197], secondary: [255, 218, 224], accent: [255, 105, 180],
      background: [255, 255, 255], cardBackground: [255, 252, 253],
      text: [70, 45, 55], textSecondary: [130, 100, 110], border: [255, 210, 220],
      highlight: [255, 230, 238], headerBg: [139, 69, 102], headerText: [255, 255, 255],
      decorationPrimary: [255, 183, 197], decorationSecondary: [255, 218, 224],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...floralDecorations, cornerStyle: 'floral', dividerStyle: 'hearts' },
  },
  {
    id: 'lavender-fields',
    name: 'Lavender Fields',
    description: 'Calming lavender floral tones',
    category: 'floral',
    colors: {
      primary: [150, 123, 182], secondary: [186, 164, 210], accent: [200, 162, 200],
      background: [255, 255, 255], cardBackground: [252, 250, 255],
      text: [60, 50, 75], textSecondary: [110, 95, 130], border: [210, 195, 225],
      highlight: [240, 230, 255], headerBg: [130, 100, 160], headerText: [255, 255, 255],
      decorationPrimary: [186, 164, 210], decorationSecondary: [200, 162, 200],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: floralDecorations,
  },
  {
    id: 'sunflower-meadow',
    name: 'Sunflower Meadow',
    description: 'Bright sunflower yellow warmth',
    category: 'floral',
    colors: {
      primary: [255, 193, 7], secondary: [255, 213, 79], accent: [255, 160, 0],
      background: [255, 255, 255], cardBackground: [255, 253, 245],
      text: [70, 55, 20], textSecondary: [130, 105, 50], border: [255, 225, 140],
      highlight: [255, 245, 200], headerBg: [245, 180, 0], headerText: [70, 55, 20],
      decorationPrimary: [255, 213, 79], decorationSecondary: [255, 160, 0],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...floralDecorations, dividerStyle: 'dots' },
  },
  {
    id: 'lotus-pond',
    name: 'Lotus Pond',
    description: 'Serene lotus pink & green',
    category: 'floral',
    colors: {
      primary: [236, 143, 158], secondary: [255, 182, 193], accent: [144, 190, 169],
      background: [255, 255, 255], cardBackground: [255, 252, 253],
      text: [70, 50, 55], textSecondary: [120, 95, 100], border: [240, 200, 210],
      highlight: [255, 235, 240], headerBg: [200, 110, 130], headerText: [255, 255, 255],
      decorationPrimary: [144, 190, 169], decorationSecondary: [236, 143, 158],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...floralDecorations, dividerStyle: 'wave', watermarkOpacity: 0.04 },
  },
  {
    id: 'orchid-elegance',
    name: 'Orchid Elegance',
    description: 'Exotic orchid purple beauty',
    category: 'floral',
    colors: {
      primary: [153, 50, 204], secondary: [186, 85, 211], accent: [218, 112, 214],
      background: [255, 255, 255], cardBackground: [253, 250, 255],
      text: [55, 30, 70], textSecondary: [105, 75, 125], border: [220, 180, 230],
      highlight: [245, 225, 255], headerBg: [140, 40, 180], headerText: [255, 255, 255],
      decorationPrimary: [218, 112, 214], decorationSecondary: [186, 85, 211],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: floralDecorations,
  },
  {
    id: 'tulip-garden',
    name: 'Tulip Garden',
    description: 'Spring tulip red & pink mix',
    category: 'floral',
    colors: {
      primary: [220, 53, 69], secondary: [255, 99, 132], accent: [255, 140, 157],
      background: [255, 255, 255], cardBackground: [255, 250, 251],
      text: [80, 35, 45], textSecondary: [140, 80, 95], border: [255, 190, 200],
      highlight: [255, 225, 230], headerBg: [200, 40, 55], headerText: [255, 255, 255],
      decorationPrimary: [255, 99, 132], decorationSecondary: [255, 140, 157],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...floralDecorations, dividerStyle: 'hearts' },
  },
  {
    id: 'jasmine-white',
    name: 'Jasmine White',
    description: 'Pure jasmine cream elegance',
    category: 'floral',
    colors: {
      primary: [245, 245, 220], secondary: [255, 250, 240], accent: [210, 180, 140],
      background: [255, 255, 255], cardBackground: [255, 253, 250],
      text: [60, 55, 50], textSecondary: [110, 100, 90], border: [230, 220, 200],
      highlight: [255, 250, 235], headerBg: [140, 120, 90], headerText: [255, 255, 255],
      decorationPrimary: [210, 180, 140], decorationSecondary: [245, 245, 220],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...floralDecorations, borderStyle: 'dashed', watermarkOpacity: 0.02 },
  },
  {
    id: 'rose-garden',
    name: 'Rose Garden',
    description: 'Classic red rose romance',
    category: 'floral',
    colors: {
      primary: [178, 34, 52], secondary: [220, 80, 100], accent: [255, 120, 140],
      background: [255, 255, 255], cardBackground: [255, 250, 251],
      text: [60, 25, 35], textSecondary: [120, 70, 85], border: [230, 180, 190],
      highlight: [255, 230, 235], headerBg: [150, 25, 45], headerText: [255, 255, 255],
      decorationPrimary: [220, 80, 100], decorationSecondary: [255, 120, 140],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...floralDecorations, dividerStyle: 'hearts', cornerStyle: 'floral' },
  },
  {
    id: 'peony-blush',
    name: 'Peony Blush',
    description: 'Soft peony pink charm',
    category: 'floral',
    colors: {
      primary: [255, 145, 175], secondary: [255, 182, 203], accent: [255, 105, 140],
      background: [255, 255, 255], cardBackground: [255, 252, 254],
      text: [80, 45, 60], textSecondary: [140, 95, 115], border: [255, 205, 220],
      highlight: [255, 235, 245], headerBg: [230, 120, 155], headerText: [255, 255, 255],
      decorationPrimary: [255, 182, 203], decorationSecondary: [255, 105, 140],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: floralDecorations,
  },
  {
    id: 'tropical-leaves',
    name: 'Tropical Leaves',
    description: 'Lush tropical foliage pattern',
    category: 'floral',
    colors: {
      primary: [34, 139, 34], secondary: [60, 179, 113], accent: [144, 238, 144],
      background: [255, 255, 255], cardBackground: [248, 255, 250],
      text: [25, 70, 35], textSecondary: [60, 120, 75], border: [180, 225, 195],
      highlight: [220, 255, 235], headerBg: [28, 115, 28], headerText: [255, 255, 255],
      decorationPrimary: [144, 238, 144], decorationSecondary: [60, 179, 113],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...floralDecorations, dividerStyle: 'leaves', watermarkOpacity: 0.05 },
  },
  
  // ===== ABSTRACT THEMES =====
  {
    id: 'geometric-blue',
    name: 'Geometric Blue',
    description: 'Modern geometric patterns',
    category: 'abstract',
    colors: {
      primary: [0, 102, 204], secondary: [51, 153, 255], accent: [0, 191, 255],
      background: [255, 255, 255], cardBackground: [248, 252, 255],
      text: [25, 50, 80], textSecondary: [70, 110, 150], border: [180, 210, 240],
      highlight: [220, 240, 255], headerBg: [0, 85, 170], headerText: [255, 255, 255],
      decorationPrimary: [0, 191, 255], decorationSecondary: [51, 153, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...abstractDecorations, dividerStyle: 'diamonds' },
  },
  {
    id: 'neon-pop',
    name: 'Neon Pop',
    description: 'Bold neon abstract art',
    category: 'abstract',
    colors: {
      primary: [255, 0, 102], secondary: [255, 51, 153], accent: [0, 255, 255],
      background: [255, 255, 255], cardBackground: [255, 250, 252],
      text: [50, 20, 40], textSecondary: [100, 60, 85], border: [255, 180, 210],
      highlight: [255, 230, 240], headerBg: [200, 0, 80], headerText: [255, 255, 255],
      decorationPrimary: [0, 255, 255], decorationSecondary: [255, 51, 153],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...abstractDecorations, dividerStyle: 'arrows', borderWidth: 2.5 },
  },
  {
    id: 'watercolor-wash',
    name: 'Watercolor Wash',
    description: 'Soft watercolor blend',
    category: 'abstract',
    colors: {
      primary: [135, 175, 210], secondary: [175, 200, 225], accent: [255, 180, 190],
      background: [255, 255, 255], cardBackground: [252, 254, 255],
      text: [50, 65, 85], textSecondary: [95, 115, 140], border: [200, 220, 240],
      highlight: [235, 245, 255], headerBg: [110, 150, 190], headerText: [255, 255, 255],
      decorationPrimary: [255, 180, 190], decorationSecondary: [175, 200, 225],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...abstractDecorations, dividerStyle: 'wave', borderStyle: 'dashed' },
  },
  {
    id: 'mondrian-blocks',
    name: 'Mondrian Blocks',
    description: 'Classic Mondrian primary colors',
    category: 'abstract',
    colors: {
      primary: [255, 50, 50], secondary: [0, 87, 183], accent: [255, 220, 0],
      background: [255, 255, 255], cardBackground: [252, 252, 252],
      text: [30, 30, 30], textSecondary: [80, 80, 80], border: [20, 20, 20],
      highlight: [245, 245, 245], headerBg: [20, 20, 20], headerText: [255, 255, 255],
      decorationPrimary: [255, 220, 0], decorationSecondary: [0, 87, 183],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...abstractDecorations, dividerStyle: 'line', borderWidth: 3, cornerStyle: 'decorative' },
  },
  {
    id: 'gradient-prism',
    name: 'Gradient Prism',
    description: 'Rainbow gradient spectrum',
    category: 'abstract',
    colors: {
      primary: [148, 103, 189], secondary: [180, 140, 210], accent: [102, 204, 255],
      background: [255, 255, 255], cardBackground: [252, 250, 255],
      text: [55, 40, 75], textSecondary: [105, 85, 130], border: [210, 190, 230],
      highlight: [240, 230, 255], headerBg: [120, 80, 160], headerText: [255, 255, 255],
      decorationPrimary: [102, 204, 255], decorationSecondary: [180, 140, 210],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...abstractDecorations, dividerStyle: 'stars' },
  },
  {
    id: 'brushstroke-ink',
    name: 'Brushstroke Ink',
    description: 'Bold ink brush abstract',
    category: 'abstract',
    colors: {
      primary: [30, 30, 30], secondary: [70, 70, 70], accent: [255, 90, 90],
      background: [255, 255, 255], cardBackground: [250, 250, 250],
      text: [20, 20, 20], textSecondary: [90, 90, 90], border: [180, 180, 180],
      highlight: [240, 240, 240], headerBg: [30, 30, 30], headerText: [255, 255, 255],
      decorationPrimary: [255, 90, 90], decorationSecondary: [70, 70, 70],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...abstractDecorations, dividerStyle: 'line', borderStyle: 'solid', borderWidth: 2 },
  },
  {
    id: 'pastel-dream',
    name: 'Pastel Dream',
    description: 'Soft pastel abstract blend',
    category: 'abstract',
    colors: {
      primary: [255, 179, 186], secondary: [255, 218, 193], accent: [178, 224, 255],
      background: [255, 255, 255], cardBackground: [255, 253, 254],
      text: [80, 60, 65], textSecondary: [130, 105, 115], border: [240, 215, 220],
      highlight: [255, 240, 245], headerBg: [230, 155, 165], headerText: [255, 255, 255],
      decorationPrimary: [178, 224, 255], decorationSecondary: [255, 218, 193],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...abstractDecorations, dividerStyle: 'dots', watermarkOpacity: 0.03 },
  },
  {
    id: 'mosaic-tiles',
    name: 'Mosaic Tiles',
    description: 'Colorful mosaic patterns',
    category: 'abstract',
    colors: {
      primary: [25, 118, 210], secondary: [66, 165, 245], accent: [255, 171, 0],
      background: [255, 255, 255], cardBackground: [250, 252, 255],
      text: [30, 50, 75], textSecondary: [75, 100, 130], border: [190, 215, 240],
      highlight: [225, 240, 255], headerBg: [20, 100, 180], headerText: [255, 255, 255],
      decorationPrimary: [255, 171, 0], decorationSecondary: [66, 165, 245],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...abstractDecorations, dividerStyle: 'diamonds', cornerStyle: 'decorative' },
  },
  {
    id: 'sunset-gradient',
    name: 'Sunset Gradient',
    description: 'Warm sunset orange hues',
    category: 'abstract',
    colors: {
      primary: [255, 99, 71], secondary: [255, 140, 105], accent: [255, 69, 0],
      background: [255, 255, 255], cardBackground: [255, 252, 250],
      text: [60, 35, 30], textSecondary: [120, 85, 75], border: [255, 200, 180],
      highlight: [255, 230, 210], headerBg: [255, 99, 71], headerText: [255, 255, 255],
      decorationPrimary: [255, 140, 105], decorationSecondary: [255, 69, 0],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...abstractDecorations, dividerStyle: 'wave' },
  },
  {
    id: 'ocean-coral',
    name: 'Ocean Coral',
    description: 'Coral reef inspired palette',
    category: 'abstract',
    colors: {
      primary: [255, 127, 80], secondary: [255, 160, 122], accent: [64, 224, 208],
      background: [255, 255, 255], cardBackground: [255, 252, 250],
      text: [50, 45, 42], textSecondary: [100, 95, 90], border: [255, 200, 180],
      highlight: [255, 228, 210], headerBg: [255, 127, 80], headerText: [255, 255, 255],
      decorationPrimary: [64, 224, 208], decorationSecondary: [255, 160, 122],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...abstractDecorations, dividerStyle: 'wave' },
  },
  {
    id: 'tropical-paradise',
    name: 'Tropical Paradise',
    description: 'Vibrant tropical colors',
    category: 'abstract',
    colors: {
      primary: [0, 172, 193], secondary: [38, 198, 218], accent: [255, 193, 7],
      background: [255, 255, 255], cardBackground: [248, 255, 255],
      text: [0, 77, 87], textSecondary: [45, 130, 145], border: [180, 230, 240],
      highlight: [220, 255, 255], headerBg: [0, 150, 170], headerText: [255, 255, 255],
      decorationPrimary: [255, 193, 7], decorationSecondary: [38, 198, 218],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...abstractDecorations, dividerStyle: 'stars' },
  },
  
  // ===== DECORATION THEMES =====
  {
    id: 'damask-royal',
    name: 'Damask Royal',
    description: 'Classic damask pattern elegance',
    category: 'decoration',
    colors: {
      primary: [88, 44, 131], secondary: [138, 82, 177], accent: [186, 143, 215],
      background: [255, 255, 255], cardBackground: [253, 250, 255],
      text: [50, 30, 65], textSecondary: [100, 75, 120], border: [200, 175, 220],
      highlight: [240, 228, 255], headerBg: [70, 35, 110], headerText: [255, 255, 255],
      decorationPrimary: [186, 143, 215], decorationSecondary: [138, 82, 177],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...decorationDecorations, dividerStyle: 'diamonds', cornerStyle: 'flourish' },
  },
  {
    id: 'moroccan-tile',
    name: 'Moroccan Tile',
    description: 'Exotic Moroccan patterns',
    category: 'decoration',
    colors: {
      primary: [0, 128, 128], secondary: [32, 178, 170], accent: [255, 165, 0],
      background: [255, 255, 255], cardBackground: [248, 255, 255],
      text: [25, 65, 65], textSecondary: [60, 115, 115], border: [175, 215, 215],
      highlight: [220, 250, 250], headerBg: [0, 105, 105], headerText: [255, 255, 255],
      decorationPrimary: [255, 165, 0], decorationSecondary: [32, 178, 170],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...decorationDecorations, dividerStyle: 'diamonds', cornerStyle: 'decorative' },
  },
  {
    id: 'victorian-lace',
    name: 'Victorian Lace',
    description: 'Delicate Victorian lace style',
    category: 'decoration',
    colors: {
      primary: [139, 115, 85], secondary: [180, 160, 130], accent: [205, 175, 149],
      background: [255, 255, 255], cardBackground: [255, 253, 250],
      text: [70, 55, 40], textSecondary: [120, 100, 80], border: [220, 205, 185],
      highlight: [250, 245, 235], headerBg: [110, 90, 65], headerText: [255, 255, 255],
      decorationPrimary: [205, 175, 149], decorationSecondary: [180, 160, 130],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...decorationDecorations, borderStyle: 'ornate', cornerStyle: 'flourish' },
  },
  {
    id: 'chinese-porcelain',
    name: 'Chinese Porcelain',
    description: 'Blue & white porcelain elegance',
    category: 'decoration',
    colors: {
      primary: [0, 70, 140], secondary: [51, 122, 183], accent: [204, 153, 51],
      background: [255, 255, 255], cardBackground: [250, 252, 255],
      text: [20, 45, 75], textSecondary: [65, 95, 130], border: [180, 200, 225],
      highlight: [230, 240, 250], headerBg: [0, 55, 115], headerText: [255, 255, 255],
      decorationPrimary: [204, 153, 51], decorationSecondary: [51, 122, 183],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...decorationDecorations, dividerStyle: 'wave', cornerStyle: 'decorative' },
  },
  {
    id: 'bohemian-spirit',
    name: 'Bohemian Spirit',
    description: 'Free-spirited boho patterns',
    category: 'decoration',
    colors: {
      primary: [205, 92, 92], secondary: [240, 128, 128], accent: [218, 165, 32],
      background: [255, 255, 255], cardBackground: [255, 252, 250],
      text: [75, 45, 45], textSecondary: [130, 95, 95], border: [230, 195, 195],
      highlight: [255, 235, 230], headerBg: [175, 75, 75], headerText: [255, 255, 255],
      decorationPrimary: [218, 165, 32], decorationSecondary: [240, 128, 128],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...decorationDecorations, dividerStyle: 'arrows', borderStyle: 'dashed' },
  },
  {
    id: 'scandinavian-cozy',
    name: 'Scandinavian Cozy',
    description: 'Warm Nordic hygge style',
    category: 'decoration',
    colors: {
      primary: [160, 140, 120], secondary: [190, 175, 160], accent: [210, 180, 140],
      background: [255, 255, 255], cardBackground: [253, 251, 248],
      text: [60, 50, 40], textSecondary: [110, 100, 85], border: [215, 205, 190],
      highlight: [245, 240, 230], headerBg: [130, 115, 95], headerText: [255, 255, 255],
      decorationPrimary: [210, 180, 140], decorationSecondary: [190, 175, 160],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...decorationDecorations, dividerStyle: 'line', borderStyle: 'solid', cornerStyle: 'simple' },
  },
  {
    id: 'art-nouveau',
    name: 'Art Nouveau',
    description: 'Organic Art Nouveau curves',
    category: 'decoration',
    colors: {
      primary: [85, 107, 47], secondary: [128, 150, 90], accent: [189, 183, 107],
      background: [255, 255, 255], cardBackground: [252, 255, 250],
      text: [45, 55, 30], textSecondary: [90, 105, 65], border: [195, 210, 175],
      highlight: [235, 245, 225], headerBg: [70, 90, 40], headerText: [255, 255, 255],
      decorationPrimary: [189, 183, 107], decorationSecondary: [128, 150, 90],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...decorationDecorations, dividerStyle: 'wave', cornerStyle: 'flourish' },
  },
  {
    id: 'japandi-zen',
    name: 'Japandi Zen',
    description: 'Japanese-Scandinavian fusion',
    category: 'decoration',
    colors: {
      primary: [107, 91, 77], secondary: [145, 130, 115], accent: [178, 162, 150],
      background: [255, 255, 255], cardBackground: [252, 250, 248],
      text: [55, 45, 38], textSecondary: [105, 95, 85], border: [210, 200, 190],
      highlight: [245, 240, 235], headerBg: [85, 72, 60], headerText: [255, 255, 255],
      decorationPrimary: [178, 162, 150], decorationSecondary: [145, 130, 115],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...decorationDecorations, dividerStyle: 'line', borderStyle: 'solid', watermarkOpacity: 0.02 },
  },
  {
    id: 'mediterranean-sun',
    name: 'Mediterranean Sun',
    description: 'Warm Mediterranean colors',
    category: 'decoration',
    colors: {
      primary: [204, 102, 0], secondary: [255, 140, 0], accent: [0, 119, 139],
      background: [255, 255, 255], cardBackground: [255, 252, 248],
      text: [80, 50, 20], textSecondary: [140, 95, 50], border: [240, 210, 175],
      highlight: [255, 240, 220], headerBg: [180, 90, 0], headerText: [255, 255, 255],
      decorationPrimary: [0, 119, 139], decorationSecondary: [255, 140, 0],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...decorationDecorations, dividerStyle: 'wave', cornerStyle: 'decorative' },
  },
  {
    id: 'indian-paisley',
    name: 'Indian Paisley',
    description: 'Rich Indian paisley motifs',
    category: 'decoration',
    colors: {
      primary: [180, 50, 50], secondary: [220, 90, 80], accent: [255, 193, 37],
      background: [255, 255, 255], cardBackground: [255, 252, 250],
      text: [70, 30, 30], textSecondary: [130, 75, 70], border: [230, 185, 180],
      highlight: [255, 235, 230], headerBg: [150, 40, 40], headerText: [255, 255, 255],
      decorationPrimary: [255, 193, 37], decorationSecondary: [220, 90, 80],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...decorationDecorations, dividerStyle: 'diamonds', cornerStyle: 'flourish', borderStyle: 'ornate' },
  },
  {
    id: 'nordic-frost',
    name: 'Nordic Frost',
    description: 'Scandinavian cool minimalism',
    category: 'decoration',
    colors: {
      primary: [140, 170, 185], secondary: [175, 200, 210], accent: [100, 140, 160],
      background: [255, 255, 255], cardBackground: [248, 252, 254],
      text: [40, 50, 60], textSecondary: [90, 105, 120], border: [200, 220, 230],
      highlight: [225, 240, 250], headerBg: [100, 140, 160], headerText: [255, 255, 255],
      decorationPrimary: [175, 200, 210], decorationSecondary: [140, 170, 185],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...decorationDecorations, dividerStyle: 'line', borderStyle: 'solid', cornerStyle: 'simple' },
  },
  {
    id: 'vintage-sepia',
    name: 'Vintage Sepia',
    description: 'Classic vintage brown tones',
    category: 'decoration',
    colors: {
      primary: [112, 66, 20], secondary: [160, 110, 60], accent: [139, 90, 43],
      background: [255, 255, 255], cardBackground: [255, 252, 248],
      text: [60, 40, 20], textSecondary: [110, 90, 70], border: [210, 190, 165],
      highlight: [255, 240, 220], headerBg: [112, 66, 20], headerText: [255, 255, 255],
      decorationPrimary: [160, 110, 60], decorationSecondary: [139, 90, 43],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' },
    decorations: { ...decorationDecorations, dividerStyle: 'dots', borderStyle: 'double' },
  },
];

// ===== FONT LIBRARY =====
// Note: jsPDF only has 3 built-in font families: helvetica, times, courier
// All fonts map to one of these families but provide different display names for user selection
export interface PDFFont {
  id: string;
  name: string;
  family: string; // jsPDF font family name (helvetica, times, or courier)
  category: 'serif' | 'sans-serif' | 'display' | 'monospace';
  description: string;
  recommended?: 'heading' | 'body' | 'both';
}

export const PDF_FONTS: PDFFont[] = [
  // ===== SANS-SERIF FONTS (Clean, Modern) =====
  { id: 'helvetica', name: 'Helvetica', family: 'helvetica', category: 'sans-serif', description: 'Classic Swiss design', recommended: 'both' },
  { id: 'arial', name: 'Arial', family: 'helvetica', category: 'sans-serif', description: 'Universal readability', recommended: 'both' },
  { id: 'roboto', name: 'Roboto', family: 'helvetica', category: 'sans-serif', description: 'Modern geometric', recommended: 'body' },
  { id: 'open-sans', name: 'Open Sans', family: 'helvetica', category: 'sans-serif', description: 'Friendly humanist', recommended: 'body' },
  { id: 'lato', name: 'Lato', family: 'helvetica', category: 'sans-serif', description: 'Warm and stable', recommended: 'both' },
  { id: 'montserrat', name: 'Montserrat', family: 'helvetica', category: 'sans-serif', description: 'Urban modern', recommended: 'heading' },
  { id: 'poppins', name: 'Poppins', family: 'helvetica', category: 'sans-serif', description: 'Geometric friendly', recommended: 'heading' },
  { id: 'inter', name: 'Inter', family: 'helvetica', category: 'sans-serif', description: 'Screen optimized', recommended: 'body' },
  { id: 'nunito', name: 'Nunito', family: 'helvetica', category: 'sans-serif', description: 'Rounded friendly', recommended: 'body' },
  { id: 'raleway', name: 'Raleway', family: 'helvetica', category: 'sans-serif', description: 'Elegant thin', recommended: 'heading' },
  
  // ===== SERIF FONTS (Traditional, Elegant) =====
  { id: 'times', name: 'Times New Roman', family: 'times', category: 'serif', description: 'Classic newspaper', recommended: 'both' },
  { id: 'georgia', name: 'Georgia', family: 'times', category: 'serif', description: 'Warm screen serif', recommended: 'both' },
  { id: 'palatino', name: 'Palatino', family: 'times', category: 'serif', description: 'Renaissance elegance', recommended: 'heading' },
  { id: 'garamond', name: 'Garamond', family: 'times', category: 'serif', description: 'French classic', recommended: 'both' },
  { id: 'bookman', name: 'Bookman', family: 'times', category: 'serif', description: 'Bold book style', recommended: 'heading' },
  { id: 'cambria', name: 'Cambria', family: 'times', category: 'serif', description: 'Modern transitional', recommended: 'body' },
  { id: 'libre-baskerville', name: 'Libre Baskerville', family: 'times', category: 'serif', description: 'Web optimized classic', recommended: 'both' },
  { id: 'merriweather', name: 'Merriweather', family: 'times', category: 'serif', description: 'Screen-friendly serif', recommended: 'body' },
  { id: 'playfair', name: 'Playfair Display', family: 'times', category: 'serif', description: 'High contrast display', recommended: 'heading' },
  { id: 'lora', name: 'Lora', family: 'times', category: 'serif', description: 'Contemporary serif', recommended: 'both' },
  
  // ===== DISPLAY FONTS (Headings) =====
  { id: 'century', name: 'Century Gothic', family: 'helvetica', category: 'display', description: 'Geometric display', recommended: 'heading' },
  { id: 'bebas', name: 'Bebas Neue', family: 'helvetica', category: 'display', description: 'Bold condensed', recommended: 'heading' },
  { id: 'oswald', name: 'Oswald', family: 'helvetica', category: 'display', description: 'Condensed gothic', recommended: 'heading' },
  { id: 'abril', name: 'Abril Fatface', family: 'times', category: 'display', description: 'Didone display', recommended: 'heading' },
  
  // ===== MONOSPACE FONTS (Technical) =====
  { id: 'courier', name: 'Courier New', family: 'courier', category: 'monospace', description: 'Classic typewriter', recommended: 'body' },
  { id: 'consolas', name: 'Consolas', family: 'courier', category: 'monospace', description: 'Modern coding', recommended: 'body' },
  { id: 'fira-code', name: 'Fira Code', family: 'courier', category: 'monospace', description: 'Developer favorite', recommended: 'body' },
  { id: 'source-code', name: 'Source Code Pro', family: 'courier', category: 'monospace', description: 'Adobe monospace', recommended: 'body' },
];

export const getFontById = (fontId: string): PDFFont => {
  return PDF_FONTS.find(f => f.id === fontId) || PDF_FONTS[0];
};

export const getFontsByCategory = (category: PDFFont['category']): PDFFont[] => {
  return PDF_FONTS.filter(f => f.category === category);
};

export const getHeadingFonts = (): PDFFont[] => {
  return PDF_FONTS.filter(f => f.recommended === 'heading' || f.recommended === 'both');
};

export const getBodyFonts = (): PDFFont[] => {
  return PDF_FONTS.filter(f => f.recommended === 'body' || f.recommended === 'both');
};

// ===== EDITOR SETTINGS =====
export interface PDFEditorSettings {
  theme: string;
  fontFamily: string; // Deprecated - use headingFont and bodyFont
  headingFont: string; // Font ID for titles/headings
  bodyFont: string; // Font ID for body text
  logoPlacement: 'left' | 'center' | 'right';
  highlightAmounts: boolean;
  showBorders: boolean;
  compactMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
  tableStyle: 'minimal' | 'striped' | 'bordered' | 'grid';
  headerStyle: 'simple' | 'boxed' | 'underlined' | 'full-width';
  sectionStyle: 'standard' | 'card' | 'line' | 'minimal';
  summaryStyle: 'right' | 'center' | 'full-width';
  pageMargins: 'narrow' | 'normal' | 'wide';
  // Decoration settings
  showDecorations: boolean;
  decorationIntensity: 'subtle' | 'medium' | 'bold';
  showPageBorder: boolean;
  showCornerOrnaments: boolean;
  showSectionDividers: boolean;
  customColors?: {
    primary?: string;
    accent?: string;
    highlight?: string;
  };
}

export const defaultEditorSettings: PDFEditorSettings = {
  theme: 'minimal-white',
  fontFamily: 'helvetica',
  headingFont: 'times',
  bodyFont: 'helvetica',
  logoPlacement: 'left',
  highlightAmounts: true,
  showBorders: true,
  compactMode: false,
  fontSize: 'medium',
  tableStyle: 'bordered',
  headerStyle: 'simple',
  sectionStyle: 'standard',
  summaryStyle: 'right',
  pageMargins: 'normal',
  showDecorations: true,
  decorationIntensity: 'medium',
  showPageBorder: true,
  showCornerOrnaments: true,
  showSectionDividers: true,
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
  showInvoiceNumber: boolean;
  showInvoiceDate: boolean;
  showPaymentProgress: boolean;
  showBankDetails: boolean;
  showQRCode: boolean;
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
  showInvoiceNumber: true,
  showInvoiceDate: true,
  showPaymentProgress: true,
  showBankDetails: false,
  showQRCode: false,
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

// Get custom themes from localStorage
const getStoredCustomThemes = (): PDFTheme[] => {
  try {
    const stored = localStorage.getItem('customPdfThemes');
    if (!stored) return [];
    const customThemes = JSON.parse(stored);
    return customThemes.map((ct: any) => ({
      id: ct.id,
      name: ct.name,
      description: 'Custom theme',
      category: 'decoration' as const,
      colors: {
        primary: hexToRgb(ct.colors.primary),
        secondary: hexToRgb(ct.colors.secondary),
        accent: hexToRgb(ct.colors.accent),
        background: hexToRgb(ct.colors.background),
        cardBackground: hexToRgb(ct.colors.background),
        text: hexToRgb(ct.colors.text),
        textSecondary: hexToRgb(ct.colors.text),
        border: hexToRgb(ct.colors.primary),
        highlight: hexToRgb(ct.colors.highlight),
        headerBg: hexToRgb(ct.colors.headerBg),
        headerText: hexToRgb(ct.colors.headerText),
        decorationPrimary: hexToRgb(ct.colors.decorationPrimary),
        decorationSecondary: hexToRgb(ct.colors.accent),
      },
      fonts: { heading: 'helvetica', body: 'helvetica' },
      decorations: ct.decorations,
    }));
  } catch {
    return [];
  }
};

// Convert hex to RGB (defined before use)
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

// Get all themes including custom
export const getAllThemes = (): PDFTheme[] => {
  return [...PDF_THEMES, ...getStoredCustomThemes()];
};

export const getThemeById = (themeId: string): PDFTheme => {
  // First check built-in themes
  const builtIn = PDF_THEMES.find(t => t.id === themeId);
  if (builtIn) return builtIn;
  
  // Then check custom themes
  const customThemes = getStoredCustomThemes();
  const custom = customThemes.find(t => t.id === themeId);
  if (custom) return custom;
  
  return PDF_THEMES[0];
};

export const getThemesByCategory = (category: PDFTheme['category']): PDFTheme[] => {
  const allThemes = getAllThemes();
  return allThemes.filter(t => t.category === category);
};
