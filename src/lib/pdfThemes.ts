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
  // New themes
  {
    id: 'copper-rust',
    name: 'Copper Rust',
    description: 'Industrial copper tones',
    colors: {
      primary: [184, 115, 51],
      secondary: [205, 127, 50],
      accent: [184, 115, 51],
      background: [255, 255, 255],
      cardBackground: [255, 251, 245],
      text: [60, 40, 30],
      textSecondary: [120, 90, 70],
      border: [220, 190, 160],
      highlight: [255, 210, 160],
      headerBg: [184, 115, 51],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'sage-minimal',
    name: 'Sage Minimal',
    description: 'Soft sage green minimal',
    colors: {
      primary: [143, 166, 142],
      secondary: [163, 186, 162],
      accent: [143, 166, 142],
      background: [255, 255, 255],
      cardBackground: [248, 252, 248],
      text: [50, 60, 50],
      textSecondary: [100, 120, 100],
      border: [200, 220, 200],
      highlight: [220, 240, 220],
      headerBg: [143, 166, 142],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'lavender-dream',
    name: 'Lavender Dream',
    description: 'Soft lavender elegance',
    colors: {
      primary: [150, 123, 182],
      secondary: [170, 143, 202],
      accent: [150, 123, 182],
      background: [255, 255, 255],
      cardBackground: [252, 250, 255],
      text: [60, 50, 80],
      textSecondary: [110, 100, 130],
      border: [210, 200, 230],
      highlight: [235, 225, 255],
      headerBg: [150, 123, 182],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'sand-dune',
    name: 'Sand Dune',
    description: 'Desert sand natural tones',
    colors: {
      primary: [194, 178, 128],
      secondary: [214, 198, 148],
      accent: [194, 178, 128],
      background: [255, 255, 255],
      cardBackground: [255, 253, 248],
      text: [70, 60, 40],
      textSecondary: [130, 120, 100],
      border: [220, 210, 190],
      highlight: [255, 245, 220],
      headerBg: [194, 178, 128],
      headerText: [40, 35, 25],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'arctic-blue',
    name: 'Arctic Blue',
    description: 'Cool arctic ice tones',
    colors: {
      primary: [100, 149, 237],
      secondary: [135, 206, 250],
      accent: [100, 149, 237],
      background: [255, 255, 255],
      cardBackground: [248, 252, 255],
      text: [30, 50, 80],
      textSecondary: [80, 100, 140],
      border: [190, 210, 240],
      highlight: [220, 235, 255],
      headerBg: [100, 149, 237],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  // Decorative & Premium Themes
  {
    id: 'floral-blush',
    name: 'Floral Blush',
    description: 'Soft floral pink elegance',
    colors: {
      primary: [219, 112, 147],
      secondary: [255, 182, 193],
      accent: [219, 112, 147],
      background: [255, 255, 255],
      cardBackground: [255, 250, 252],
      text: [80, 40, 60],
      textSecondary: [140, 100, 120],
      border: [255, 200, 210],
      highlight: [255, 228, 235],
      headerBg: [219, 112, 147],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'botanical-garden',
    name: 'Botanical Garden',
    description: 'Nature-inspired botanical greens',
    colors: {
      primary: [85, 139, 47],
      secondary: [124, 179, 66],
      accent: [139, 195, 74],
      background: [255, 255, 255],
      cardBackground: [248, 255, 248],
      text: [33, 37, 41],
      textSecondary: [76, 90, 65],
      border: [200, 230, 200],
      highlight: [220, 255, 200],
      headerBg: [85, 139, 47],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'marble-luxury',
    name: 'Marble Luxury',
    description: 'Premium marble with gold',
    colors: {
      primary: [183, 152, 95],
      secondary: [220, 196, 152],
      accent: [183, 152, 95],
      background: [255, 255, 255],
      cardBackground: [252, 251, 250],
      text: [45, 45, 45],
      textSecondary: [100, 100, 100],
      border: [220, 215, 210],
      highlight: [255, 245, 220],
      headerBg: [45, 45, 45],
      headerText: [183, 152, 95],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'cherry-blossom',
    name: 'Cherry Blossom',
    description: 'Japanese sakura inspired',
    colors: {
      primary: [255, 183, 197],
      secondary: [255, 218, 224],
      accent: [255, 105, 180],
      background: [255, 255, 255],
      cardBackground: [255, 252, 253],
      text: [70, 45, 55],
      textSecondary: [130, 100, 110],
      border: [255, 210, 220],
      highlight: [255, 230, 238],
      headerBg: [139, 69, 102],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'royal-violet',
    name: 'Royal Violet',
    description: 'Regal purple sophistication',
    colors: {
      primary: [102, 51, 153],
      secondary: [138, 82, 186],
      accent: [186, 85, 211],
      background: [255, 255, 255],
      cardBackground: [252, 250, 255],
      text: [50, 30, 70],
      textSecondary: [100, 80, 120],
      border: [200, 180, 220],
      highlight: [235, 220, 255],
      headerBg: [102, 51, 153],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'sunset-gradient',
    name: 'Sunset Gradient',
    description: 'Warm sunset orange hues',
    colors: {
      primary: [255, 99, 71],
      secondary: [255, 140, 105],
      accent: [255, 69, 0],
      background: [255, 255, 255],
      cardBackground: [255, 252, 250],
      text: [60, 35, 30],
      textSecondary: [120, 85, 75],
      border: [255, 200, 180],
      highlight: [255, 230, 210],
      headerBg: [255, 99, 71],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'art-deco-gold',
    name: 'Art Deco Gold',
    description: 'Classic art deco with gold',
    colors: {
      primary: [207, 181, 59],
      secondary: [180, 155, 50],
      accent: [207, 181, 59],
      background: [255, 255, 255],
      cardBackground: [252, 250, 245],
      text: [30, 30, 30],
      textSecondary: [80, 75, 65],
      border: [207, 181, 59],
      highlight: [255, 245, 200],
      headerBg: [30, 30, 30],
      headerText: [207, 181, 59],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'ocean-coral',
    name: 'Ocean Coral',
    description: 'Coral reef inspired palette',
    colors: {
      primary: [255, 127, 80],
      secondary: [255, 160, 122],
      accent: [64, 224, 208],
      background: [255, 255, 255],
      cardBackground: [255, 252, 250],
      text: [50, 45, 42],
      textSecondary: [100, 95, 90],
      border: [255, 200, 180],
      highlight: [255, 228, 210],
      headerBg: [255, 127, 80],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'nordic-frost',
    name: 'Nordic Frost',
    description: 'Scandinavian cool minimalism',
    colors: {
      primary: [140, 170, 185],
      secondary: [175, 200, 210],
      accent: [100, 140, 160],
      background: [255, 255, 255],
      cardBackground: [248, 252, 254],
      text: [40, 50, 60],
      textSecondary: [90, 105, 120],
      border: [200, 220, 230],
      highlight: [225, 240, 250],
      headerBg: [100, 140, 160],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'vintage-sepia',
    name: 'Vintage Sepia',
    description: 'Classic vintage brown tones',
    colors: {
      primary: [112, 66, 20],
      secondary: [160, 110, 60],
      accent: [139, 90, 43],
      background: [255, 255, 255],
      cardBackground: [255, 252, 248],
      text: [60, 40, 20],
      textSecondary: [110, 90, 70],
      border: [210, 190, 165],
      highlight: [255, 240, 220],
      headerBg: [112, 66, 20],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'tropical-paradise',
    name: 'Tropical Paradise',
    description: 'Vibrant tropical colors',
    colors: {
      primary: [0, 172, 193],
      secondary: [38, 198, 218],
      accent: [255, 193, 7],
      background: [255, 255, 255],
      cardBackground: [248, 255, 255],
      text: [0, 77, 87],
      textSecondary: [45, 130, 145],
      border: [180, 230, 240],
      highlight: [220, 255, 255],
      headerBg: [0, 150, 170],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'minimalist-black',
    name: 'Minimalist Black',
    description: 'Ultra-minimal monochrome',
    colors: {
      primary: [0, 0, 0],
      secondary: [50, 50, 50],
      accent: [0, 0, 0],
      background: [255, 255, 255],
      cardBackground: [250, 250, 250],
      text: [0, 0, 0],
      textSecondary: [80, 80, 80],
      border: [200, 200, 200],
      highlight: [240, 240, 240],
      headerBg: [0, 0, 0],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'executive-grey',
    name: 'Executive Grey',
    description: 'Professional executive style',
    colors: {
      primary: [66, 66, 66],
      secondary: [97, 97, 97],
      accent: [158, 158, 158],
      background: [255, 255, 255],
      cardBackground: [250, 250, 250],
      text: [33, 33, 33],
      textSecondary: [97, 97, 97],
      border: [224, 224, 224],
      highlight: [238, 238, 238],
      headerBg: [66, 66, 66],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'peacock-blue',
    name: 'Peacock Blue',
    description: 'Rich peacock feather tones',
    colors: {
      primary: [0, 95, 115],
      secondary: [0, 131, 143],
      accent: [0, 172, 193],
      background: [255, 255, 255],
      cardBackground: [248, 253, 255],
      text: [0, 60, 70],
      textSecondary: [45, 100, 115],
      border: [170, 210, 220],
      highlight: [210, 240, 250],
      headerBg: [0, 95, 115],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'rose-gold',
    name: 'Rose Gold',
    description: 'Elegant rose gold accent',
    colors: {
      primary: [183, 110, 121],
      secondary: [212, 148, 158],
      accent: [183, 110, 121],
      background: [255, 255, 255],
      cardBackground: [255, 252, 253],
      text: [55, 40, 45],
      textSecondary: [110, 90, 95],
      border: [230, 200, 205],
      highlight: [255, 235, 240],
      headerBg: [55, 40, 45],
      headerText: [212, 148, 158],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  // ===== FLORAL THEMES =====
  {
    id: 'lavender-fields',
    name: 'Lavender Fields',
    description: 'Calming lavender floral tones',
    colors: {
      primary: [150, 123, 182],
      secondary: [186, 164, 210],
      accent: [200, 162, 200],
      background: [255, 255, 255],
      cardBackground: [252, 250, 255],
      text: [60, 50, 75],
      textSecondary: [110, 95, 130],
      border: [210, 195, 225],
      highlight: [240, 230, 255],
      headerBg: [130, 100, 160],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'sunflower-meadow',
    name: 'Sunflower Meadow',
    description: 'Bright sunflower yellow warmth',
    colors: {
      primary: [255, 193, 7],
      secondary: [255, 213, 79],
      accent: [255, 160, 0],
      background: [255, 255, 255],
      cardBackground: [255, 253, 245],
      text: [70, 55, 20],
      textSecondary: [130, 105, 50],
      border: [255, 225, 140],
      highlight: [255, 245, 200],
      headerBg: [245, 180, 0],
      headerText: [70, 55, 20],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'lotus-pond',
    name: 'Lotus Pond',
    description: 'Serene lotus pink & green',
    colors: {
      primary: [236, 143, 158],
      secondary: [255, 182, 193],
      accent: [144, 190, 169],
      background: [255, 255, 255],
      cardBackground: [255, 252, 253],
      text: [70, 50, 55],
      textSecondary: [120, 95, 100],
      border: [240, 200, 210],
      highlight: [255, 235, 240],
      headerBg: [200, 110, 130],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'orchid-elegance',
    name: 'Orchid Elegance',
    description: 'Exotic orchid purple beauty',
    colors: {
      primary: [153, 50, 204],
      secondary: [186, 85, 211],
      accent: [218, 112, 214],
      background: [255, 255, 255],
      cardBackground: [253, 250, 255],
      text: [55, 30, 70],
      textSecondary: [105, 75, 125],
      border: [220, 180, 230],
      highlight: [245, 225, 255],
      headerBg: [140, 40, 180],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'tulip-garden',
    name: 'Tulip Garden',
    description: 'Spring tulip red & pink mix',
    colors: {
      primary: [220, 53, 69],
      secondary: [255, 99, 132],
      accent: [255, 140, 157],
      background: [255, 255, 255],
      cardBackground: [255, 250, 251],
      text: [80, 35, 45],
      textSecondary: [140, 80, 95],
      border: [255, 190, 200],
      highlight: [255, 225, 230],
      headerBg: [200, 40, 55],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'jasmine-white',
    name: 'Jasmine White',
    description: 'Pure jasmine cream elegance',
    colors: {
      primary: [245, 245, 220],
      secondary: [255, 250, 240],
      accent: [210, 180, 140],
      background: [255, 255, 255],
      cardBackground: [255, 253, 250],
      text: [60, 55, 50],
      textSecondary: [110, 100, 90],
      border: [230, 220, 200],
      highlight: [255, 250, 235],
      headerBg: [140, 120, 90],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'rose-garden',
    name: 'Rose Garden',
    description: 'Classic red rose romance',
    colors: {
      primary: [178, 34, 52],
      secondary: [220, 80, 100],
      accent: [255, 120, 140],
      background: [255, 255, 255],
      cardBackground: [255, 250, 251],
      text: [60, 25, 35],
      textSecondary: [120, 70, 85],
      border: [230, 180, 190],
      highlight: [255, 230, 235],
      headerBg: [150, 25, 45],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'peony-blush',
    name: 'Peony Blush',
    description: 'Soft peony pink charm',
    colors: {
      primary: [255, 145, 175],
      secondary: [255, 182, 203],
      accent: [255, 105, 140],
      background: [255, 255, 255],
      cardBackground: [255, 252, 254],
      text: [80, 45, 60],
      textSecondary: [140, 95, 115],
      border: [255, 205, 220],
      highlight: [255, 235, 245],
      headerBg: [230, 120, 155],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  // ===== ABSTRACT THEMES =====
  {
    id: 'geometric-blue',
    name: 'Geometric Blue',
    description: 'Modern geometric patterns',
    colors: {
      primary: [0, 102, 204],
      secondary: [51, 153, 255],
      accent: [0, 191, 255],
      background: [255, 255, 255],
      cardBackground: [248, 252, 255],
      text: [25, 50, 80],
      textSecondary: [70, 110, 150],
      border: [180, 210, 240],
      highlight: [220, 240, 255],
      headerBg: [0, 85, 170],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'neon-pop',
    name: 'Neon Pop',
    description: 'Bold neon abstract art',
    colors: {
      primary: [255, 0, 102],
      secondary: [255, 51, 153],
      accent: [0, 255, 255],
      background: [255, 255, 255],
      cardBackground: [255, 250, 252],
      text: [50, 20, 40],
      textSecondary: [100, 60, 85],
      border: [255, 180, 210],
      highlight: [255, 230, 240],
      headerBg: [200, 0, 80],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'watercolor-wash',
    name: 'Watercolor Wash',
    description: 'Soft watercolor blend',
    colors: {
      primary: [135, 175, 210],
      secondary: [175, 200, 225],
      accent: [255, 180, 190],
      background: [255, 255, 255],
      cardBackground: [252, 254, 255],
      text: [50, 65, 85],
      textSecondary: [95, 115, 140],
      border: [200, 220, 240],
      highlight: [235, 245, 255],
      headerBg: [110, 150, 190],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'mondrian-blocks',
    name: 'Mondrian Blocks',
    description: 'Classic Mondrian primary colors',
    colors: {
      primary: [255, 50, 50],
      secondary: [0, 87, 183],
      accent: [255, 220, 0],
      background: [255, 255, 255],
      cardBackground: [252, 252, 252],
      text: [30, 30, 30],
      textSecondary: [80, 80, 80],
      border: [20, 20, 20],
      highlight: [245, 245, 245],
      headerBg: [20, 20, 20],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'gradient-prism',
    name: 'Gradient Prism',
    description: 'Rainbow gradient spectrum',
    colors: {
      primary: [148, 103, 189],
      secondary: [180, 140, 210],
      accent: [102, 204, 255],
      background: [255, 255, 255],
      cardBackground: [252, 250, 255],
      text: [55, 40, 75],
      textSecondary: [105, 85, 130],
      border: [210, 190, 230],
      highlight: [240, 230, 255],
      headerBg: [120, 80, 160],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'brushstroke-ink',
    name: 'Brushstroke Ink',
    description: 'Bold ink brush abstract',
    colors: {
      primary: [30, 30, 30],
      secondary: [70, 70, 70],
      accent: [255, 90, 90],
      background: [255, 255, 255],
      cardBackground: [250, 250, 250],
      text: [20, 20, 20],
      textSecondary: [90, 90, 90],
      border: [180, 180, 180],
      highlight: [240, 240, 240],
      headerBg: [30, 30, 30],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'pastel-dream',
    name: 'Pastel Dream',
    description: 'Soft pastel abstract blend',
    colors: {
      primary: [255, 179, 186],
      secondary: [255, 218, 193],
      accent: [178, 224, 255],
      background: [255, 255, 255],
      cardBackground: [255, 253, 254],
      text: [80, 60, 65],
      textSecondary: [130, 105, 115],
      border: [240, 215, 220],
      highlight: [255, 240, 245],
      headerBg: [230, 155, 165],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'mosaic-tiles',
    name: 'Mosaic Tiles',
    description: 'Colorful mosaic patterns',
    colors: {
      primary: [25, 118, 210],
      secondary: [66, 165, 245],
      accent: [255, 171, 0],
      background: [255, 255, 255],
      cardBackground: [250, 252, 255],
      text: [30, 50, 75],
      textSecondary: [75, 100, 130],
      border: [190, 215, 240],
      highlight: [225, 240, 255],
      headerBg: [20, 100, 180],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  // ===== DECORATION THEMES =====
  {
    id: 'damask-royal',
    name: 'Damask Royal',
    description: 'Classic damask pattern elegance',
    colors: {
      primary: [88, 44, 131],
      secondary: [138, 82, 177],
      accent: [186, 143, 215],
      background: [255, 255, 255],
      cardBackground: [253, 250, 255],
      text: [50, 30, 65],
      textSecondary: [100, 75, 120],
      border: [200, 175, 220],
      highlight: [240, 228, 255],
      headerBg: [70, 35, 110],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'moroccan-tile',
    name: 'Moroccan Tile',
    description: 'Exotic Moroccan patterns',
    colors: {
      primary: [0, 128, 128],
      secondary: [32, 178, 170],
      accent: [255, 165, 0],
      background: [255, 255, 255],
      cardBackground: [248, 255, 255],
      text: [25, 65, 65],
      textSecondary: [60, 115, 115],
      border: [175, 215, 215],
      highlight: [220, 250, 250],
      headerBg: [0, 105, 105],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'victorian-lace',
    name: 'Victorian Lace',
    description: 'Delicate Victorian lace style',
    colors: {
      primary: [139, 115, 85],
      secondary: [180, 160, 130],
      accent: [205, 175, 149],
      background: [255, 255, 255],
      cardBackground: [255, 253, 250],
      text: [70, 55, 40],
      textSecondary: [120, 100, 80],
      border: [220, 205, 185],
      highlight: [250, 245, 235],
      headerBg: [110, 90, 65],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'chinese-porcelain',
    name: 'Chinese Porcelain',
    description: 'Blue & white porcelain elegance',
    colors: {
      primary: [0, 70, 140],
      secondary: [51, 122, 183],
      accent: [204, 153, 51],
      background: [255, 255, 255],
      cardBackground: [250, 252, 255],
      text: [20, 45, 75],
      textSecondary: [65, 95, 130],
      border: [180, 200, 225],
      highlight: [230, 240, 250],
      headerBg: [0, 55, 115],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'bohemian-spirit',
    name: 'Bohemian Spirit',
    description: 'Free-spirited boho patterns',
    colors: {
      primary: [205, 92, 92],
      secondary: [240, 128, 128],
      accent: [218, 165, 32],
      background: [255, 255, 255],
      cardBackground: [255, 252, 250],
      text: [75, 45, 45],
      textSecondary: [130, 95, 95],
      border: [230, 195, 195],
      highlight: [255, 235, 230],
      headerBg: [175, 75, 75],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'scandinavian-cozy',
    name: 'Scandinavian Cozy',
    description: 'Warm Nordic hygge style',
    colors: {
      primary: [160, 140, 120],
      secondary: [190, 175, 160],
      accent: [210, 180, 140],
      background: [255, 255, 255],
      cardBackground: [253, 251, 248],
      text: [60, 50, 40],
      textSecondary: [110, 100, 85],
      border: [215, 205, 190],
      highlight: [245, 240, 230],
      headerBg: [130, 115, 95],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'art-nouveau',
    name: 'Art Nouveau',
    description: 'Organic Art Nouveau curves',
    colors: {
      primary: [85, 107, 47],
      secondary: [128, 150, 90],
      accent: [189, 183, 107],
      background: [255, 255, 255],
      cardBackground: [252, 255, 250],
      text: [45, 55, 30],
      textSecondary: [90, 105, 65],
      border: [195, 210, 175],
      highlight: [235, 245, 225],
      headerBg: [70, 90, 40],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'japandi-zen',
    name: 'Japandi Zen',
    description: 'Japanese-Scandinavian fusion',
    colors: {
      primary: [107, 91, 77],
      secondary: [145, 130, 115],
      accent: [178, 162, 150],
      background: [255, 255, 255],
      cardBackground: [252, 250, 248],
      text: [55, 45, 38],
      textSecondary: [105, 95, 85],
      border: [210, 200, 190],
      highlight: [245, 240, 235],
      headerBg: [85, 72, 60],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'mediterranean-sun',
    name: 'Mediterranean Sun',
    description: 'Warm Mediterranean colors',
    colors: {
      primary: [204, 102, 0],
      secondary: [255, 140, 0],
      accent: [0, 119, 139],
      background: [255, 255, 255],
      cardBackground: [255, 252, 248],
      text: [80, 50, 20],
      textSecondary: [140, 95, 50],
      border: [240, 210, 175],
      highlight: [255, 240, 220],
      headerBg: [180, 90, 0],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'indian-paisley',
    name: 'Indian Paisley',
    description: 'Rich Indian paisley motifs',
    colors: {
      primary: [180, 50, 50],
      secondary: [220, 90, 80],
      accent: [255, 193, 37],
      background: [255, 255, 255],
      cardBackground: [255, 252, 250],
      text: [70, 30, 30],
      textSecondary: [130, 75, 70],
      border: [230, 185, 180],
      highlight: [255, 235, 230],
      headerBg: [150, 40, 40],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'tropical-leaves',
    name: 'Tropical Leaves',
    description: 'Lush tropical foliage pattern',
    colors: {
      primary: [34, 139, 34],
      secondary: [60, 179, 113],
      accent: [144, 238, 144],
      background: [255, 255, 255],
      cardBackground: [248, 255, 250],
      text: [25, 70, 35],
      textSecondary: [60, 120, 75],
      border: [180, 225, 195],
      highlight: [220, 255, 235],
      headerBg: [28, 115, 28],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'crystal-glam',
    name: 'Crystal Glam',
    description: 'Sparkling crystal luxury',
    colors: {
      primary: [176, 196, 222],
      secondary: [200, 215, 235],
      accent: [218, 165, 180],
      background: [255, 255, 255],
      cardBackground: [252, 254, 255],
      text: [50, 60, 80],
      textSecondary: [100, 115, 140],
      border: [210, 225, 245],
      highlight: [240, 248, 255],
      headerBg: [140, 165, 195],
      headerText: [255, 255, 255],
    },
    fonts: { heading: 'helvetica', body: 'helvetica' }
  },
  {
    id: 'velvet-night',
    name: 'Velvet Night',
    description: 'Deep velvet luxury feel',
    colors: {
      primary: [75, 0, 130],
      secondary: [106, 13, 173],
      accent: [148, 87, 235],
      background: [255, 255, 255],
      cardBackground: [252, 250, 255],
      text: [45, 20, 75],
      textSecondary: [95, 60, 130],
      border: [195, 170, 225],
      highlight: [235, 225, 255],
      headerBg: [55, 0, 100],
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
  tableStyle: 'minimal' | 'striped' | 'bordered' | 'grid';
  headerStyle: 'simple' | 'boxed' | 'underlined' | 'full-width';
  sectionStyle: 'standard' | 'card' | 'line' | 'minimal';
  summaryStyle: 'right' | 'center' | 'full-width';
  pageMargins: 'narrow' | 'normal' | 'wide';
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
  sectionStyle: 'standard',
  summaryStyle: 'right',
  pageMargins: 'normal',
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