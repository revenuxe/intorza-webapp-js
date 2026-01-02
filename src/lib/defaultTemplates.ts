// Default section templates with country-specific pricing
// Prices are calibrated to local markets and currencies

interface DefaultTemplateItem {
  product_name: string;
  product_details: string;
  default_rate: number;
}

interface DefaultTemplate {
  template_name: string;
  category: string;
  items: DefaultTemplateItem[];
}

interface CountryTemplates {
  templates: DefaultTemplate[];
}

// Price multipliers relative to INR base prices
const PRICE_MULTIPLIERS: Record<string, number> = {
  // South Asia (lower cost markets)
  IN: 1,       // India - base
  PK: 0.7,    // Pakistan
  BD: 0.6,    // Bangladesh
  LK: 0.8,    // Sri Lanka
  NP: 0.65,   // Nepal
  
  // Southeast Asia
  TH: 0.9,    // Thailand
  MY: 1.2,    // Malaysia
  SG: 3.5,    // Singapore
  ID: 0.5,    // Indonesia
  PH: 0.7,    // Philippines
  VN: 0.5,    // Vietnam
  
  // Middle East (higher margins)
  AE: 3.0,    // UAE
  SA: 2.8,    // Saudi Arabia
  QA: 3.2,    // Qatar
  KW: 3.0,    // Kuwait
  BH: 2.8,    // Bahrain
  OM: 2.5,    // Oman
  
  // Europe
  GB: 2.5,    // UK
  DE: 2.8,    // Germany
  FR: 2.7,    // France
  IT: 2.5,    // Italy
  ES: 2.3,    // Spain
  NL: 2.8,    // Netherlands
  BE: 2.7,    // Belgium
  AT: 2.8,    // Austria
  CH: 4.0,    // Switzerland
  SE: 3.0,    // Sweden
  NO: 3.5,    // Norway
  DK: 3.2,    // Denmark
  FI: 2.9,    // Finland
  IE: 2.8,    // Ireland
  PT: 2.2,    // Portugal
  PL: 1.5,    // Poland
  CZ: 1.8,    // Czech Republic
  GR: 2.0,    // Greece
  
  // North America
  US: 2.8,    // USA
  CA: 2.6,    // Canada
  MX: 1.0,    // Mexico
  
  // Oceania
  AU: 2.8,    // Australia
  NZ: 2.5,    // New Zealand
  
  // Africa
  ZA: 1.2,    // South Africa
  EG: 0.6,    // Egypt
  NG: 0.8,    // Nigeria
  KE: 0.7,    // Kenya
  MA: 1.0,    // Morocco
  
  // East Asia
  JP: 3.0,    // Japan
  KR: 2.5,    // South Korea
  CN: 1.8,    // China
  HK: 3.2,    // Hong Kong
  TW: 2.2,    // Taiwan
  
  // South America
  BR: 1.2,    // Brazil
  AR: 0.8,    // Argentina
  CL: 1.5,    // Chile
  CO: 0.9,    // Colombia
  PE: 0.8,    // Peru
};

// Base templates in INR (Indian Rupees) - will be converted for each country
const BASE_TEMPLATES: DefaultTemplate[] = [
  {
    template_name: "Complete Kitchen",
    category: "Kitchen",
    items: [
      { product_name: "Base Cabinet", product_details: "Modular plywood with laminate finish, soft-close hinges", default_rate: 1650 },
      { product_name: "Wall Cabinet", product_details: "Wall mounted storage with adjustable shelves", default_rate: 1450 },
      { product_name: "Tall Unit", product_details: "Full height pantry unit with pull-out baskets", default_rate: 1850 },
      { product_name: "Kitchen Counter", product_details: "Granite/quartz countertop with waterfall edge", default_rate: 950 },
      { product_name: "Backsplash Panel", product_details: "Toughened glass or tile backsplash", default_rate: 550 },
    ]
  },
  {
    template_name: "Sliding Wardrobe",
    category: "Wardrobe",
    items: [
      { product_name: "Wardrobe Carcass", product_details: "18mm plywood with laminate finish", default_rate: 1250 },
      { product_name: "Sliding Door System", product_details: "Aluminum frame with mirror/lacquered glass", default_rate: 1650 },
      { product_name: "Internal Fittings", product_details: "Drawers, shelves, hanging rods, accessories", default_rate: 450 },
      { product_name: "Soft-close Mechanism", product_details: "Premium soft-close sliding system", default_rate: 350 },
    ]
  },
  {
    template_name: "Hinged Wardrobe",
    category: "Wardrobe",
    items: [
      { product_name: "Wardrobe Structure", product_details: "18mm plywood with veneer/laminate finish", default_rate: 1350 },
      { product_name: "Hinged Doors", product_details: "Swing doors with premium hinges", default_rate: 1150 },
      { product_name: "Internal Organization", product_details: "Custom shelving, drawers, and accessories", default_rate: 400 },
      { product_name: "Loft Storage", product_details: "Upper storage with flip-up doors", default_rate: 950 },
    ]
  },
  {
    template_name: "Entertainment Unit",
    category: "TV Unit",
    items: [
      { product_name: "TV Panel", product_details: "Wall-mounted panel with cable management", default_rate: 1150 },
      { product_name: "Base Console", product_details: "Floor unit with storage and display", default_rate: 1350 },
      { product_name: "Wall Shelves", product_details: "Floating shelves with LED lighting", default_rate: 850 },
      { product_name: "Side Storage", product_details: "Vertical storage units", default_rate: 1050 },
    ]
  },
  {
    template_name: "Master Bedroom",
    category: "Bedroom",
    items: [
      { product_name: "Bed with Storage", product_details: "King size bed with hydraulic storage", default_rate: 1450 },
      { product_name: "Headboard Panel", product_details: "Upholstered or wooden headboard", default_rate: 850 },
      { product_name: "Side Tables", product_details: "Matching bedside tables with drawers", default_rate: 650 },
      { product_name: "Dresser Unit", product_details: "Vanity table with mirror and storage", default_rate: 1250 },
    ]
  },
  {
    template_name: "Study Room",
    category: "Study",
    items: [
      { product_name: "Study Table", product_details: "L-shaped desk with cable management", default_rate: 1150 },
      { product_name: "Book Shelf", product_details: "Open shelving with closed storage", default_rate: 950 },
      { product_name: "Storage Cabinet", product_details: "File storage with lock", default_rate: 1050 },
      { product_name: "Wall Unit", product_details: "Wall-mounted display and storage", default_rate: 850 },
    ]
  },
  {
    template_name: "Living Room Storage",
    category: "Living Room",
    items: [
      { product_name: "Display Unit", product_details: "Glass-fronted display cabinet", default_rate: 1350 },
      { product_name: "Console Table", product_details: "Entry/hallway console with storage", default_rate: 950 },
      { product_name: "Bar Unit", product_details: "Compact bar with bottle storage", default_rate: 1450 },
      { product_name: "Shoe Rack", product_details: "Concealed shoe storage", default_rate: 850 },
    ]
  },
  {
    template_name: "Bathroom Vanity",
    category: "Bathroom",
    items: [
      { product_name: "Vanity Cabinet", product_details: "Waterproof cabinet with basin cutout", default_rate: 1850 },
      { product_name: "Mirror Unit", product_details: "LED mirror with storage", default_rate: 750 },
      { product_name: "Tall Cabinet", product_details: "Waterproof tall boy storage", default_rate: 1650 },
    ]
  },
];

// Get price multiplier for a country (default to 1 if not found)
const getMultiplier = (countryCode: string): number => {
  return PRICE_MULTIPLIERS[countryCode] || 1;
};

// Round to appropriate values based on currency
const roundPrice = (price: number, countryCode: string): number => {
  // Countries with lower value currencies - round to nearest 10
  const lowValueCurrencies = ['IN', 'PK', 'BD', 'LK', 'NP', 'ID', 'VN', 'JP', 'KR'];
  
  // Countries with mid-value currencies - round to nearest 5
  const midValueCurrencies = ['MX', 'ZA', 'EG', 'TH', 'MY', 'PH', 'BR', 'CN', 'HK', 'TW'];
  
  if (lowValueCurrencies.includes(countryCode)) {
    return Math.round(price / 10) * 10;
  } else if (midValueCurrencies.includes(countryCode)) {
    return Math.round(price / 5) * 5;
  } else {
    // High value currencies (USD, EUR, GBP, etc.) - round to whole number
    return Math.round(price);
  }
};

// Generate templates for a specific country
export const getDefaultTemplatesForCountry = (countryCode: string): DefaultTemplate[] => {
  const multiplier = getMultiplier(countryCode);
  
  return BASE_TEMPLATES.map(template => ({
    ...template,
    items: template.items.map(item => ({
      ...item,
      default_rate: roundPrice(item.default_rate * multiplier, countryCode)
    }))
  }));
};

// Create default templates in database for a user
export const createDefaultTemplatesForUser = async (
  supabase: any,
  userId: string,
  countryCode: string
): Promise<{ success: boolean; count: number; error?: string }> => {
  try {
    // Check if user already has templates
    const { data: existingTemplates, error: checkError } = await supabase
      .from('section_templates')
      .select('id')
      .eq('user_id', userId)
      .limit(1);
    
    if (checkError) throw checkError;
    
    // If user already has templates, don't create defaults
    if (existingTemplates && existingTemplates.length > 0) {
      return { success: true, count: 0 };
    }
    
    const templates = getDefaultTemplatesForCountry(countryCode);
    
    const templatesData = templates.map(template => ({
      user_id: userId,
      template_name: template.template_name,
      category: template.category,
      items: template.items,
      country_code: countryCode,
      is_default: true,
      usage_count: 0
    }));
    
    const { error: insertError } = await supabase
      .from('section_templates')
      .insert(templatesData);
    
    if (insertError) throw insertError;
    
    return { success: true, count: templates.length };
  } catch (error: any) {
    console.error('Error creating default templates:', error);
    return { success: false, count: 0, error: error.message };
  }
};

// Create default item pricing library for a user
export const createDefaultItemsForUser = async (
  supabase: any,
  userId: string,
  countryCode: string
): Promise<{ success: boolean; count: number; error?: string }> => {
  try {
    // Check if user already has items
    const { data: existingItems, error: checkError } = await supabase
      .from('item_usage_patterns')
      .select('id')
      .eq('user_id', userId)
      .limit(1);
    
    if (checkError) throw checkError;
    
    // If user already has items, don't create defaults
    if (existingItems && existingItems.length > 0) {
      return { success: true, count: 0 };
    }
    
    const templates = getDefaultTemplatesForCountry(countryCode);
    
    // Flatten all items from templates, removing duplicates
    const uniqueItems = new Map<string, DefaultTemplateItem & { category: string }>();
    templates.forEach(template => {
      template.items.forEach(item => {
        if (!uniqueItems.has(item.product_name.toLowerCase())) {
          uniqueItems.set(item.product_name.toLowerCase(), {
            ...item,
            category: template.category
          });
        }
      });
    });
    
    const itemsData = Array.from(uniqueItems.values()).map(item => ({
      user_id: userId,
      product_name: item.product_name,
      product_details: item.product_details,
      default_rate: item.default_rate,
      preferred_rate: item.default_rate,
      category: item.category,
      country_code: countryCode,
      usage_count: 0
    }));
    
    const { error: insertError } = await supabase
      .from('item_usage_patterns')
      .insert(itemsData);
    
    if (insertError) throw insertError;
    
    return { success: true, count: itemsData.length };
  } catch (error: any) {
    console.error('Error creating default items:', error);
    return { success: false, count: 0, error: error.message };
  }
};
