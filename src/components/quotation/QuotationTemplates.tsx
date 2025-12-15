import { useState } from "react";
import { FileText, Bed, ChefHat, Sofa, Tv, Bath, Package, DoorOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LineItem {
  id: string;
  side: string;
  productName: string;
  productDetails: string;
  widthFt: number;
  heightFt: number;
  sftArea: number;
  ratePerSft: number;
  amount: number;
}

interface Section {
  id: string;
  title: string;
  items: LineItem[];
}

interface QuotationTemplate {
  id: string;
  name: string;
  description: string;
  icon: typeof FileText;
  category: string;
  sections: Section[];
}

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Create item helper
const createItem = (productName: string, productDetails: string, widthFt: number = 0, heightFt: number = 0, ratePerSft: number = 0): LineItem => ({
  id: generateId(),
  side: "",
  productName,
  productDetails,
  widthFt,
  heightFt,
  sftArea: widthFt * heightFt,
  ratePerSft,
  amount: widthFt * heightFt * ratePerSft,
});

// Predefined Templates
const QUOTATION_TEMPLATES: QuotationTemplate[] = [
  // Kitchen Templates
  {
    id: "modular-kitchen-basic",
    name: "Modular Kitchen - Basic",
    description: "Basic modular kitchen with essential units",
    icon: ChefHat,
    category: "Kitchen",
    sections: [
      {
        id: generateId(),
        title: "Kitchen Base Units",
        items: [
          createItem("Base Cabinet", "Marine plywood with laminate finish, soft-close hinges", 0, 0, 850),
          createItem("Corner Unit", "L-shape corner with carousel, marine plywood", 0, 0, 950),
          createItem("Sink Cabinet", "Waterproof marine plywood with SS sink cutout", 0, 0, 900),
          createItem("Drawer Unit", "3-drawer tandem box system, soft-close", 0, 0, 1100),
        ],
      },
      {
        id: generateId(),
        title: "Kitchen Wall Units",
        items: [
          createItem("Wall Cabinet", "Marine plywood with laminate finish, lift-up mechanism", 0, 0, 750),
          createItem("Open Shelf Unit", "Marine plywood with laminate, adjustable shelves", 0, 0, 650),
          createItem("Corner Wall Unit", "Corner cabinet with revolving shelf", 0, 0, 850),
        ],
      },
      {
        id: generateId(),
        title: "Kitchen Accessories",
        items: [
          createItem("Countertop", "Granite/Quartz countertop with waterfall edge", 0, 0, 450),
          createItem("Backsplash", "Dado tiles installation", 0, 0, 350),
          createItem("Skirting", "SS skirting with adjustable legs", 0, 0, 250),
        ],
      },
    ],
  },
  {
    id: "modular-kitchen-premium",
    name: "Modular Kitchen - Premium",
    description: "Premium modular kitchen with advanced features",
    icon: ChefHat,
    category: "Kitchen",
    sections: [
      {
        id: generateId(),
        title: "Premium Base Units",
        items: [
          createItem("Base Cabinet - Handleless", "DERA plywood with PU finish, handleless profile", 0, 0, 1250),
          createItem("Magic Corner", "Premium magic corner with soft-close mechanism", 0, 0, 1400),
          createItem("Sink Cabinet", "DERA plywood with undermount sink support", 0, 0, 1200),
          createItem("Tall Unit", "Full height pull-out pantry system", 0, 0, 1500),
          createItem("Tandem Drawer Unit", "Grass/Blum tandem box with internal organizers", 0, 0, 1350),
        ],
      },
      {
        id: generateId(),
        title: "Premium Wall Units",
        items: [
          createItem("Wall Cabinet - Lift Up", "DERA plywood with servo-drive lift mechanism", 0, 0, 1100),
          createItem("Glass Display Unit", "Profile shutter with LED strip lighting", 0, 0, 1200),
          createItem("Hood Cabinet", "Chimney cover with integrated lighting", 0, 0, 950),
        ],
      },
      {
        id: generateId(),
        title: "Premium Accessories",
        items: [
          createItem("Quartz Countertop", "Imported quartz with waterfall edge", 0, 0, 750),
          createItem("Glass Backsplash", "Toughened printed glass backsplash", 0, 0, 550),
          createItem("Island Counter", "Island with breakfast bar and storage", 0, 0, 1100),
        ],
      },
    ],
  },

  // Wardrobe Templates
  {
    id: "wardrobe-sliding",
    name: "Sliding Wardrobe",
    description: "Modern sliding door wardrobe with internal organizers",
    icon: DoorOpen,
    category: "Wardrobe",
    sections: [
      {
        id: generateId(),
        title: "Wardrobe Structure",
        items: [
          createItem("Wardrobe Carcass", "BWP plywood with laminate finish, floor to ceiling", 0, 0, 950),
          createItem("Sliding Door System", "Aluminium profile sliding door with soft-close", 0, 0, 1100),
          createItem("Internal Shelves", "Adjustable shelves with laminate finish", 0, 0, 650),
        ],
      },
      {
        id: generateId(),
        title: "Internal Fittings",
        items: [
          createItem("Hanging Rod Section", "SS hanging rod with tie/belt pull-out", 0, 0, 450),
          createItem("Drawer Section", "Tandem box drawers with velvet liner", 0, 0, 850),
          createItem("Shoe Rack Section", "Pull-out shoe rack with angled shelves", 0, 0, 550),
          createItem("Accessory Tray", "Pull-out accessory tray with compartments", 0, 0, 650),
        ],
      },
    ],
  },
  {
    id: "wardrobe-hinged",
    name: "Hinged Door Wardrobe",
    description: "Classic hinged door wardrobe with full mirror",
    icon: DoorOpen,
    category: "Wardrobe",
    sections: [
      {
        id: generateId(),
        title: "Wardrobe Structure",
        items: [
          createItem("Wardrobe Carcass", "BWP plywood with veneer finish", 0, 0, 1050),
          createItem("Hinged Doors", "Soft-close hinged doors with handles", 0, 0, 850),
          createItem("Full Mirror Door", "Beveled edge mirror on door panel", 0, 0, 750),
        ],
      },
      {
        id: generateId(),
        title: "Internal Organization",
        items: [
          createItem("Loft Storage", "Top loft section with separate doors", 0, 0, 550),
          createItem("Hanging Space", "Double hanging rod for short/long garments", 0, 0, 400),
          createItem("Drawer Unit", "Internal drawer stack with soft-close", 0, 0, 800),
          createItem("Shelf Section", "Fixed and adjustable shelves", 0, 0, 500),
        ],
      },
    ],
  },

  // Bedroom Templates
  {
    id: "master-bedroom",
    name: "Master Bedroom Set",
    description: "Complete master bedroom furniture package",
    icon: Bed,
    category: "Bedroom",
    sections: [
      {
        id: generateId(),
        title: "Bed & Headboard",
        items: [
          createItem("King Size Bed", "Upholstered bed with hydraulic storage", 0, 0, 1200),
          createItem("Headboard Panel", "Padded headboard with fabric finish", 0, 0, 850),
          createItem("Side Tables", "Matching bedside tables with drawers (pair)", 0, 0, 650),
        ],
      },
      {
        id: generateId(),
        title: "Storage Units",
        items: [
          createItem("Dresser Unit", "Dresser with mirror and storage drawers", 0, 0, 950),
          createItem("Chest of Drawers", "5-drawer chest with soft-close mechanism", 0, 0, 750),
          createItem("Vanity Counter", "Wall-mounted vanity with LED mirror", 0, 0, 850),
        ],
      },
    ],
  },
  {
    id: "kids-bedroom",
    name: "Kids Bedroom Set",
    description: "Child-friendly bedroom furniture with study area",
    icon: Bed,
    category: "Bedroom",
    sections: [
      {
        id: generateId(),
        title: "Bed & Storage",
        items: [
          createItem("Single Bed with Trundle", "Bed with pull-out trundle and storage", 0, 0, 950),
          createItem("Bunk Bed", "Twin bunk bed with safety rails and ladder", 0, 0, 1100),
          createItem("Under-bed Storage", "Pull-out drawers under bed", 0, 0, 550),
        ],
      },
      {
        id: generateId(),
        title: "Study Area",
        items: [
          createItem("Study Table", "L-shape study desk with cable management", 0, 0, 750),
          createItem("Bookshelf Unit", "Open and closed storage combination", 0, 0, 650),
          createItem("Wall Shelves", "Floating shelves with colorful backpanel", 0, 0, 450),
        ],
      },
    ],
  },

  // Living Room Templates
  {
    id: "living-room-modern",
    name: "Modern Living Room",
    description: "Contemporary living room furniture set",
    icon: Sofa,
    category: "Living Room",
    sections: [
      {
        id: generateId(),
        title: "Seating",
        items: [
          createItem("Sofa Set", "L-shape sofa with premium fabric upholstery", 0, 0, 1200),
          createItem("Accent Chair", "Single seater accent chair", 0, 0, 650),
          createItem("Ottoman", "Matching ottoman with storage", 0, 0, 450),
        ],
      },
      {
        id: generateId(),
        title: "Storage & Display",
        items: [
          createItem("Console Unit", "Wall-mounted console with drawers", 0, 0, 850),
          createItem("Display Shelves", "Floating display shelves with LED", 0, 0, 550),
          createItem("Crockery Unit", "Glass door crockery display unit", 0, 0, 950),
        ],
      },
    ],
  },

  // TV Unit Templates
  {
    id: "tv-unit-modern",
    name: "Modern TV Unit",
    description: "Contemporary TV unit with storage",
    icon: Tv,
    category: "TV Unit",
    sections: [
      {
        id: generateId(),
        title: "TV Unit Components",
        items: [
          createItem("TV Panel", "Back panel with PU/Laminate finish, cable concealment", 0, 0, 750),
          createItem("Base Unit", "Floor unit with drawers and open shelves", 0, 0, 850),
          createItem("Wall Mounted Shelf", "Floating shelves above TV", 0, 0, 550),
          createItem("LED Strip", "Ambient LED strip lighting", 0, 0, 350),
        ],
      },
    ],
  },
  {
    id: "tv-unit-entertainment",
    name: "Entertainment Center",
    description: "Full wall entertainment unit with storage",
    icon: Tv,
    category: "TV Unit",
    sections: [
      {
        id: generateId(),
        title: "Entertainment Wall",
        items: [
          createItem("Full Wall Panel", "Wall-to-wall TV panel with textured finish", 0, 0, 950),
          createItem("Base Console", "Long base unit with multiple compartments", 0, 0, 950),
          createItem("Side Towers", "Tall storage units on both sides", 0, 0, 850),
          createItem("Display Niches", "Backlit display niches for artifacts", 0, 0, 650),
        ],
      },
    ],
  },

  // Bathroom Vanity Templates
  {
    id: "bathroom-vanity",
    name: "Bathroom Vanity",
    description: "Modern bathroom vanity with storage",
    icon: Bath,
    category: "Bathroom",
    sections: [
      {
        id: generateId(),
        title: "Vanity Unit",
        items: [
          createItem("Vanity Cabinet", "Marine plywood with PU finish, basin cutout", 0, 0, 1100),
          createItem("Mirror Unit", "LED mirror with defogger", 0, 0, 750),
          createItem("Side Cabinet", "Tall unit for toiletries storage", 0, 0, 650),
        ],
      },
    ],
  },

  // Study/Office Templates
  {
    id: "home-office",
    name: "Home Office Setup",
    description: "Complete home office furniture",
    icon: Package,
    category: "Study/Office",
    sections: [
      {
        id: generateId(),
        title: "Work Station",
        items: [
          createItem("Executive Desk", "L-shape desk with cable management", 0, 0, 950),
          createItem("Storage Pedestal", "Mobile pedestal with lock", 0, 0, 550),
          createItem("Monitor Stand", "Adjustable monitor riser with storage", 0, 0, 350),
        ],
      },
      {
        id: generateId(),
        title: "Storage",
        items: [
          createItem("File Cabinet", "4-drawer filing cabinet with lock", 0, 0, 750),
          createItem("Bookcase", "Open bookcase with adjustable shelves", 0, 0, 650),
          createItem("Wall Organizer", "Wall-mounted organizer with pinboard", 0, 0, 450),
        ],
      },
    ],
  },

  // Pooja Room Template
  {
    id: "pooja-unit",
    name: "Pooja Unit",
    description: "Traditional pooja unit with storage",
    icon: Package,
    category: "Pooja Room",
    sections: [
      {
        id: generateId(),
        title: "Pooja Unit",
        items: [
          createItem("Pooja Cabinet", "Teak veneer finish with carved doors", 0, 0, 1200),
          createItem("Bell Hanging", "Brass bell with chain fixture", 0, 0, 250),
          createItem("Storage Base", "Base cabinet for pooja items storage", 0, 0, 650),
          createItem("LED Lighting", "Warm LED strips for ambiance", 0, 0, 350),
        ],
      },
    ],
  },

  // Foyer/Entrance Template
  {
    id: "foyer-unit",
    name: "Foyer Unit",
    description: "Entrance foyer with shoe rack and mirror",
    icon: Package,
    category: "Foyer",
    sections: [
      {
        id: generateId(),
        title: "Foyer Elements",
        items: [
          createItem("Shoe Cabinet", "Tip-out shoe rack with mirror back", 0, 0, 850),
          createItem("Console Table", "Slim console with drawer", 0, 0, 650),
          createItem("Wall Mirror", "Full length decorative mirror", 0, 0, 550),
          createItem("Key Holder", "Wall mounted key organizer", 0, 0, 250),
        ],
      },
    ],
  },

  // Custom/Blank Template
  {
    id: "blank-template",
    name: "Blank Template",
    description: "Start from scratch with empty sections",
    icon: FileText,
    category: "Custom",
    sections: [
      {
        id: generateId(),
        title: "Section 1",
        items: [
          createItem("", "", 0, 0, 0),
        ],
      },
    ],
  },
];

// Group templates by category
const groupedTemplates = QUOTATION_TEMPLATES.reduce((acc, template) => {
  if (!acc[template.category]) {
    acc[template.category] = [];
  }
  acc[template.category].push(template);
  return acc;
}, {} as Record<string, QuotationTemplate[]>);

interface QuotationTemplatesProps {
  onSelectTemplate: (sections: Section[]) => void;
}

export const QuotationTemplates = ({ onSelectTemplate }: QuotationTemplatesProps) => {
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleSelectTemplate = (template: QuotationTemplate) => {
    // Generate new IDs for sections and items to avoid conflicts
    const newSections = template.sections.map(section => ({
      ...section,
      id: generateId(),
      items: section.items.map(item => ({
        ...item,
        id: generateId(),
      })),
    }));
    
    onSelectTemplate(newSections);
    setOpen(false);
    setSelectedCategory(null);
  };

  const categories = Object.keys(groupedTemplates);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
          <FileText className="h-4 w-4 mr-2" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4">
          {!selectedCategory ? (
            // Category Selection
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {categories.map((category) => {
                const templates = groupedTemplates[category];
                const Icon = templates[0].icon;
                return (
                  <Card 
                    key={category}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedCategory(category)}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-6 gap-3">
                      <Icon className="h-8 w-8 text-primary" />
                      <div className="text-center">
                        <p className="font-medium">{category}</p>
                        <p className="text-xs text-muted-foreground">{templates.length} templates</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            // Template Selection within Category
            <div className="space-y-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedCategory(null)}
                className="mb-2"
              >
                ← Back to Categories
              </Button>
              
              <div className="grid gap-3">
                {groupedTemplates[selectedCategory].map((template) => {
                  const Icon = template.icon;
                  return (
                    <Card 
                      key={template.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSelectTemplate(template)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{template.name}</CardTitle>
                            <CardDescription className="text-xs">{template.description}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-1">
                          {template.sections.map((section) => (
                            <span 
                              key={section.id} 
                              className="text-xs bg-muted px-2 py-1 rounded-md"
                            >
                              {section.title} ({section.items.length} items)
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
