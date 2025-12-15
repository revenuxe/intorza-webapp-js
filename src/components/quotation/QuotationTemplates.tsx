import { useState, useEffect } from "react";
import { FileText, Bed, ChefHat, Sofa, Tv, Bath, Package, DoorOpen, Plus, Star, Save, Trash2, BookOpen, Armchair, UtensilsCrossed, Flower2, BookMarked, Warehouse, Car, Baby, Coffee, Shirt, Wine, Home, Layers } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  isUserTemplate?: boolean;
}

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Create item helper with standard dimensions
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

// Predefined Templates - Extended with standard dimensions
const QUOTATION_TEMPLATES: QuotationTemplate[] = [
  // =================== KITCHEN TEMPLATES ===================
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
          createItem("Base Cabinet", "Marine plywood with laminate finish, soft-close hinges", 2, 2.5, 850),
          createItem("Corner Unit", "L-shape corner with carousel, marine plywood", 2.5, 2.5, 950),
          createItem("Sink Cabinet", "Waterproof marine plywood with SS sink cutout", 3, 2.5, 900),
          createItem("Drawer Unit", "3-drawer tandem box system, soft-close", 2, 2.5, 1100),
        ],
      },
      {
        id: generateId(),
        title: "Kitchen Wall Units",
        items: [
          createItem("Wall Cabinet", "Marine plywood with laminate finish, lift-up mechanism", 2, 1.5, 750),
          createItem("Open Shelf Unit", "Marine plywood with laminate, adjustable shelves", 3, 1, 650),
          createItem("Corner Wall Unit", "Corner cabinet with revolving shelf", 2, 1.5, 850),
        ],
      },
      {
        id: generateId(),
        title: "Kitchen Accessories",
        items: [
          createItem("Countertop", "Granite/Quartz countertop with waterfall edge", 10, 2, 450),
          createItem("Backsplash", "Dado tiles installation", 10, 2, 350),
          createItem("Skirting", "SS skirting with adjustable legs", 10, 0.5, 250),
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
          createItem("Base Cabinet - Handleless", "DERA plywood with PU finish, handleless profile", 3, 2.5, 1250),
          createItem("Magic Corner", "Premium magic corner with soft-close mechanism", 3, 2.5, 1400),
          createItem("Sink Cabinet", "DERA plywood with undermount sink support", 3.5, 2.5, 1200),
          createItem("Tall Unit", "Full height pull-out pantry system", 2, 7, 1500),
          createItem("Tandem Drawer Unit", "Grass/Blum tandem box with internal organizers", 2, 2.5, 1350),
        ],
      },
      {
        id: generateId(),
        title: "Premium Wall Units",
        items: [
          createItem("Wall Cabinet - Lift Up", "DERA plywood with servo-drive lift mechanism", 3, 2, 1100),
          createItem("Glass Display Unit", "Profile shutter with LED strip lighting", 2, 2, 1200),
          createItem("Hood Cabinet", "Chimney cover with integrated lighting", 3, 1.5, 950),
        ],
      },
      {
        id: generateId(),
        title: "Premium Accessories",
        items: [
          createItem("Quartz Countertop", "Imported quartz with waterfall edge", 12, 2, 750),
          createItem("Glass Backsplash", "Toughened printed glass backsplash", 12, 2, 550),
          createItem("Island Counter", "Island with breakfast bar and storage", 5, 3, 1100),
        ],
      },
    ],
  },
  {
    id: "modular-kitchen-l-shape",
    name: "L-Shape Kitchen",
    description: "L-shaped modular kitchen layout",
    icon: ChefHat,
    category: "Kitchen",
    sections: [
      {
        id: generateId(),
        title: "L-Shape Base Units",
        items: [
          createItem("Base Cabinet - Long Arm", "Marine plywood laminate finish, 5 units", 10, 2.5, 850),
          createItem("Base Cabinet - Short Arm", "Marine plywood laminate finish, 3 units", 6, 2.5, 850),
          createItem("Corner Base Unit", "Lazy susan corner mechanism", 3, 2.5, 1100),
          createItem("Sink Unit", "Integrated sink cabinet with water stopper", 3, 2.5, 950),
        ],
      },
      {
        id: generateId(),
        title: "Wall Units",
        items: [
          createItem("Wall Cabinets - Long Wall", "Matching wall units with lift-up", 10, 1.5, 750),
          createItem("Wall Cabinets - Short Wall", "Corner optimized units", 6, 1.5, 750),
        ],
      },
    ],
  },
  {
    id: "modular-kitchen-u-shape",
    name: "U-Shape Kitchen",
    description: "U-shaped modular kitchen with maximum storage",
    icon: ChefHat,
    category: "Kitchen",
    sections: [
      {
        id: generateId(),
        title: "U-Shape Base Units",
        items: [
          createItem("Base Cabinet - Left Arm", "Marine plywood with soft-close", 8, 2.5, 850),
          createItem("Base Cabinet - Center", "Main work area with sink", 10, 2.5, 900),
          createItem("Base Cabinet - Right Arm", "Cooking zone with hob unit", 8, 2.5, 850),
          createItem("Corner Units (2)", "Magic corner with pull-out trays", 3, 2.5, 1200),
        ],
      },
      {
        id: generateId(),
        title: "Wall Units",
        items: [
          createItem("Wall Cabinets - All Sides", "Continuous wall storage", 26, 1.5, 750),
          createItem("Chimney Unit", "Designer chimney enclosure", 3, 2, 950),
        ],
      },
    ],
  },
  {
    id: "parallel-kitchen",
    name: "Parallel Kitchen",
    description: "Two parallel counters facing each other",
    icon: ChefHat,
    category: "Kitchen",
    sections: [
      {
        id: generateId(),
        title: "Counter 1 - Cooking Side",
        items: [
          createItem("Hob Cabinet", "Gas/induction hob unit with storage", 3, 2.5, 950),
          createItem("Base Cabinets", "Standard base units", 6, 2.5, 850),
          createItem("Chimney Unit", "Kitchen chimney enclosure", 3, 2, 950),
        ],
      },
      {
        id: generateId(),
        title: "Counter 2 - Prep Side",
        items: [
          createItem("Sink Cabinet", "Prep sink with drainboard", 4, 2.5, 900),
          createItem("Base Cabinets", "Storage and prep area", 5, 2.5, 850),
          createItem("Tall Unit - Fridge", "Refrigerator enclosure", 3, 7, 750),
        ],
      },
    ],
  },

  // =================== WARDROBE TEMPLATES ===================
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
          createItem("Wardrobe Carcass", "BWP plywood with laminate finish, floor to ceiling", 8, 8, 950),
          createItem("Sliding Door System", "Aluminium profile sliding door with soft-close", 8, 8, 1100),
          createItem("Internal Shelves", "Adjustable shelves with laminate finish", 8, 1, 650),
        ],
      },
      {
        id: generateId(),
        title: "Internal Fittings",
        items: [
          createItem("Hanging Rod Section", "SS hanging rod with tie/belt pull-out", 4, 4, 450),
          createItem("Drawer Section", "Tandem box drawers with velvet liner", 2, 2, 850),
          createItem("Shoe Rack Section", "Pull-out shoe rack with angled shelves", 2, 3, 550),
          createItem("Accessory Tray", "Pull-out accessory tray with compartments", 1.5, 1, 650),
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
          createItem("Wardrobe Carcass", "BWP plywood with veneer finish", 8, 8, 1050),
          createItem("Hinged Doors", "Soft-close hinged doors with handles", 8, 7, 850),
          createItem("Full Mirror Door", "Beveled edge mirror on door panel", 2, 6, 750),
        ],
      },
      {
        id: generateId(),
        title: "Internal Organization",
        items: [
          createItem("Loft Storage", "Top loft section with separate doors", 8, 1.5, 550),
          createItem("Hanging Space", "Double hanging rod for short/long garments", 4, 5, 400),
          createItem("Drawer Unit", "Internal drawer stack with soft-close", 2, 2.5, 800),
          createItem("Shelf Section", "Fixed and adjustable shelves", 2, 5, 500),
        ],
      },
    ],
  },
  {
    id: "wardrobe-walk-in",
    name: "Walk-in Closet",
    description: "Luxury walk-in closet with complete organization",
    icon: DoorOpen,
    category: "Wardrobe",
    sections: [
      {
        id: generateId(),
        title: "Closet Structure",
        items: [
          createItem("Wall Units - Left", "Floor to ceiling storage units", 10, 8, 1100),
          createItem("Wall Units - Right", "Matching units with display area", 10, 8, 1100),
          createItem("Island Dresser", "Central island with drawers and mirror", 4, 3, 1400),
        ],
      },
      {
        id: generateId(),
        title: "Specialty Storage",
        items: [
          createItem("Bag Display", "Illuminated bag display shelves", 3, 4, 850),
          createItem("Shoe Wall", "Full wall shoe display system", 6, 6, 950),
          createItem("Jewelry Cabinet", "Lockable jewelry organization", 2, 3, 1200),
          createItem("Vanity Section", "Built-in vanity with LED mirror", 4, 6, 1000),
        ],
      },
    ],
  },
  {
    id: "wardrobe-compact",
    name: "Compact Wardrobe",
    description: "Space-saving wardrobe for small rooms",
    icon: DoorOpen,
    category: "Wardrobe",
    sections: [
      {
        id: generateId(),
        title: "Compact Structure",
        items: [
          createItem("Wardrobe Carcass", "Marine plywood compact design", 5, 7, 900),
          createItem("Bi-fold Doors", "Space-saving bi-fold mechanism", 5, 6.5, 950),
          createItem("Loft Section", "Top storage with lift-up door", 5, 1.5, 550),
        ],
      },
      {
        id: generateId(),
        title: "Internal Fittings",
        items: [
          createItem("Hanging Section", "Single hanging rod", 2.5, 4, 400),
          createItem("Shelves", "Adjustable shelves", 2.5, 4, 500),
          createItem("Drawers", "3-drawer unit", 2, 2, 750),
        ],
      },
    ],
  },

  // =================== BEDROOM TEMPLATES ===================
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
          createItem("King Size Bed", "Upholstered bed with hydraulic storage", 6.5, 6.5, 1200),
          createItem("Headboard Panel", "Padded headboard with fabric finish", 8, 4, 850),
          createItem("Side Tables", "Matching bedside tables with drawers (pair)", 1.5, 2, 650),
        ],
      },
      {
        id: generateId(),
        title: "Storage Units",
        items: [
          createItem("Dresser Unit", "Dresser with mirror and storage drawers", 5, 6, 950),
          createItem("Chest of Drawers", "5-drawer chest with soft-close mechanism", 2.5, 4, 750),
          createItem("Vanity Counter", "Wall-mounted vanity with LED mirror", 4, 5, 850),
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
          createItem("Single Bed with Trundle", "Bed with pull-out trundle and storage", 3.5, 6.5, 950),
          createItem("Bunk Bed", "Twin bunk bed with safety rails and ladder", 3.5, 6.5, 1100),
          createItem("Under-bed Storage", "Pull-out drawers under bed", 3, 6, 550),
        ],
      },
      {
        id: generateId(),
        title: "Study Area",
        items: [
          createItem("Study Table", "L-shape study desk with cable management", 4, 2, 750),
          createItem("Bookshelf Unit", "Open and closed storage combination", 3, 5, 650),
          createItem("Wall Shelves", "Floating shelves with colorful backpanel", 4, 1, 450),
        ],
      },
    ],
  },
  {
    id: "guest-bedroom",
    name: "Guest Bedroom",
    description: "Comfortable guest room essentials",
    icon: Bed,
    category: "Guest Bedroom",
    sections: [
      {
        id: generateId(),
        title: "Sleeping Area",
        items: [
          createItem("Queen Size Bed", "Upholstered bed with storage", 5.5, 6.5, 1000),
          createItem("Headboard Panel", "Simple upholstered headboard", 6, 3, 550),
          createItem("Bedside Table", "Compact bedside with drawer", 1.5, 2, 450),
        ],
      },
      {
        id: generateId(),
        title: "Storage",
        items: [
          createItem("2-Door Wardrobe", "Compact wardrobe with mirror", 4, 7, 850),
          createItem("Luggage Bench", "Bench with storage for guest luggage", 3, 1.5, 400),
          createItem("Wall Shelf", "Floating shelf for personal items", 3, 0.5, 300),
        ],
      },
    ],
  },
  {
    id: "guest-bedroom-premium",
    name: "Guest Suite",
    description: "Premium guest suite with workspace",
    icon: Bed,
    category: "Guest Bedroom",
    sections: [
      {
        id: generateId(),
        title: "Sleeping & Comfort",
        items: [
          createItem("King Size Bed", "Premium bed with memory foam support", 6.5, 6.5, 1100),
          createItem("Extended Headboard", "Wall-to-wall padded headboard", 10, 4, 750),
          createItem("Side Tables (Pair)", "Matching bedside units", 1.5, 2, 600),
          createItem("Reading Nook", "Built-in reading chair with light", 3, 3, 550),
        ],
      },
      {
        id: generateId(),
        title: "Work & Storage",
        items: [
          createItem("Compact Desk", "Wall-mounted work desk", 4, 2, 650),
          createItem("Wardrobe", "Full-height guest wardrobe", 6, 8, 950),
          createItem("TV Unit", "Compact TV panel with storage", 5, 4, 550),
        ],
      },
    ],
  },

  // =================== LIVING ROOM TEMPLATES ===================
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
          createItem("Sofa Set", "L-shape sofa with premium fabric upholstery", 9, 6, 1200),
          createItem("Accent Chair", "Single seater accent chair", 2.5, 3, 650),
          createItem("Ottoman", "Matching ottoman with storage", 2, 2, 450),
        ],
      },
      {
        id: generateId(),
        title: "Storage & Display",
        items: [
          createItem("Console Unit", "Wall-mounted console with drawers", 6, 3, 850),
          createItem("Display Shelves", "Floating display shelves with LED", 6, 1, 550),
          createItem("Crockery Unit", "Glass door crockery display unit", 4, 6, 950),
        ],
      },
    ],
  },
  {
    id: "living-room-traditional",
    name: "Traditional Living Room",
    description: "Classic traditional living furniture",
    icon: Sofa,
    category: "Living Room",
    sections: [
      {
        id: generateId(),
        title: "Seating Arrangement",
        items: [
          createItem("3-Seater Sofa", "Wooden frame with cushion upholstery", 7, 3, 1000),
          createItem("2-Seater Sofa", "Matching loveseat", 5, 3, 800),
          createItem("Single Seaters", "Pair of armchairs", 3, 3, 650),
          createItem("Center Table", "Carved wooden center table with glass", 4, 2.5, 550),
        ],
      },
      {
        id: generateId(),
        title: "Display & Storage",
        items: [
          createItem("Showcase", "Glass front wooden showcase", 4, 6, 1100),
          createItem("Corner Unit", "Traditional corner display unit", 2.5, 5, 750),
        ],
      },
    ],
  },
  {
    id: "living-room-minimal",
    name: "Minimalist Living Room",
    description: "Clean lines and essential pieces only",
    icon: Sofa,
    category: "Living Room",
    sections: [
      {
        id: generateId(),
        title: "Essential Furniture",
        items: [
          createItem("Modular Sofa", "3-seater clean-line sofa", 8, 3, 1100),
          createItem("Coffee Table", "Low-profile center table", 4, 2, 450),
          createItem("Floor Lamp", "Designer floor lamp stand", 1, 5, 350),
        ],
      },
      {
        id: generateId(),
        title: "Storage",
        items: [
          createItem("Floating Console", "Wall-mounted minimal console", 6, 1.5, 650),
          createItem("Hidden Storage", "Concealed wall storage", 8, 3, 850),
        ],
      },
    ],
  },

  // =================== DINING ROOM TEMPLATES ===================
  {
    id: "dining-room-basic",
    name: "Dining Room - Basic",
    description: "Essential dining room furniture",
    icon: UtensilsCrossed,
    category: "Dining Room",
    sections: [
      {
        id: generateId(),
        title: "Dining Set",
        items: [
          createItem("Dining Table - 6 Seater", "Solid wood table with glass top", 5, 3.5, 850),
          createItem("Dining Chairs (6)", "Upholstered dining chairs set", 1.5, 3, 450),
          createItem("Table Runner", "Decorative table protection", 4, 1, 150),
        ],
      },
      {
        id: generateId(),
        title: "Storage",
        items: [
          createItem("Crockery Unit", "2-door crockery cabinet with glass", 4, 6, 950),
          createItem("Sideboard", "Serving sideboard with drawers", 5, 3, 750),
        ],
      },
    ],
  },
  {
    id: "dining-room-premium",
    name: "Dining Room - Premium",
    description: "Luxury dining room setup",
    icon: UtensilsCrossed,
    category: "Dining Room",
    sections: [
      {
        id: generateId(),
        title: "Premium Dining Set",
        items: [
          createItem("Dining Table - 8 Seater", "Marble top with metal base", 7, 4, 1400),
          createItem("Dining Chairs (8)", "Italian leather chairs", 1.5, 3.5, 650),
          createItem("Bar Cabinet", "Rotating bar with glass holders", 3, 5, 1200),
        ],
      },
      {
        id: generateId(),
        title: "Display & Lighting",
        items: [
          createItem("Display Unit", "Full wall crockery display with LED", 8, 7, 1100),
          createItem("Console Table", "Marble console for serving", 5, 2.5, 850),
          createItem("Mirror Panel", "Decorative dining mirror", 4, 4, 550),
        ],
      },
    ],
  },
  {
    id: "dining-room-compact",
    name: "Compact Dining",
    description: "Space-efficient dining solution",
    icon: UtensilsCrossed,
    category: "Dining Room",
    sections: [
      {
        id: generateId(),
        title: "Compact Set",
        items: [
          createItem("Dining Table - 4 Seater", "Foldable/extendable table", 3.5, 3, 650),
          createItem("Dining Chairs (4)", "Stackable chairs", 1.5, 3, 400),
          createItem("Wall Cabinet", "Wall-mounted crockery storage", 4, 3, 750),
        ],
      },
    ],
  },

  // =================== TV UNIT TEMPLATES ===================
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
          createItem("TV Panel", "Back panel with PU/Laminate finish, cable concealment", 8, 6, 750),
          createItem("Base Unit", "Floor unit with drawers and open shelves", 6, 1.5, 850),
          createItem("Wall Mounted Shelf", "Floating shelves above TV", 6, 1, 550),
          createItem("LED Strip", "Ambient LED strip lighting", 8, 0.5, 350),
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
          createItem("Full Wall Panel", "Wall-to-wall TV panel with textured finish", 12, 8, 950),
          createItem("Base Console", "Long base unit with multiple compartments", 10, 1.5, 950),
          createItem("Side Towers", "Tall storage units on both sides", 2, 6, 850),
          createItem("Display Niches", "Backlit display niches for artifacts", 2, 2, 650),
        ],
      },
    ],
  },
  {
    id: "tv-unit-compact",
    name: "Compact TV Unit",
    description: "Space-saving TV solution",
    icon: Tv,
    category: "TV Unit",
    sections: [
      {
        id: generateId(),
        title: "Compact Unit",
        items: [
          createItem("Floating TV Unit", "Wall-mounted compact unit", 5, 1.5, 650),
          createItem("TV Bracket", "Swivel TV mounting bracket", 2, 2, 350),
          createItem("Cable Management", "Hidden cable tray", 4, 0.5, 250),
        ],
      },
    ],
  },

  // =================== MODULAR STORAGE TEMPLATES ===================
  {
    id: "modular-storage-basic",
    name: "Modular Storage - Basic",
    description: "Flexible storage system with modules",
    icon: Package,
    category: "Modular Storage",
    sections: [
      {
        id: generateId(),
        title: "Storage Modules",
        items: [
          createItem("Base Module", "Floor-standing base unit with doors", 2, 2, 650),
          createItem("Stack Module", "Stackable storage cube", 2, 2, 450),
          createItem("Open Shelf Module", "Display shelf module", 2, 1.5, 350),
          createItem("Drawer Module", "2-drawer storage module", 2, 1.5, 550),
        ],
      },
      {
        id: generateId(),
        title: "Accessories",
        items: [
          createItem("Door Panels", "Interchangeable door panels", 2, 2, 250),
          createItem("Basket Inserts", "Wire basket organization", 2, 1, 200),
          createItem("Dividers", "Internal divider set", 2, 1, 150),
        ],
      },
    ],
  },
  {
    id: "modular-storage-premium",
    name: "Modular Storage - Full System",
    description: "Complete modular storage wall system",
    icon: Package,
    category: "Modular Storage",
    sections: [
      {
        id: generateId(),
        title: "Wall System",
        items: [
          createItem("Base Units (4)", "Floor units with varied doors", 8, 2.5, 750),
          createItem("Wall Units (4)", "Matching wall-mounted modules", 8, 2, 650),
          createItem("Open Display Units", "Glass-front display modules", 4, 3, 550),
          createItem("Corner Unit", "Corner optimization module", 2, 5, 700),
        ],
      },
      {
        id: generateId(),
        title: "Specialty Modules",
        items: [
          createItem("Media Module", "AV equipment housing with ventilation", 3, 2, 600),
          createItem("File Module", "Document filing system", 2, 3, 500),
          createItem("Safe Module", "Hidden safe compartment", 1.5, 2, 850),
        ],
      },
    ],
  },

  // =================== BALCONY TEMPLATES ===================
  {
    id: "balcony-basic",
    name: "Balcony Setup - Basic",
    description: "Essential balcony furniture",
    icon: Flower2,
    category: "Balcony",
    sections: [
      {
        id: generateId(),
        title: "Seating",
        items: [
          createItem("Balcony Chair Set", "Weather-resistant chairs (2)", 2, 3, 450),
          createItem("Small Table", "Compact outdoor table", 2, 2, 350),
          createItem("Floor Cushions", "Outdoor cushion set", 2, 2, 200),
        ],
      },
      {
        id: generateId(),
        title: "Garden & Storage",
        items: [
          createItem("Planter Boxes", "Railing planters set", 3, 1, 300),
          createItem("Storage Bench", "Weather-proof storage seat", 4, 1.5, 450),
        ],
      },
    ],
  },
  {
    id: "balcony-lounge",
    name: "Balcony Lounge",
    description: "Luxury balcony lounge setup",
    icon: Flower2,
    category: "Balcony",
    sections: [
      {
        id: generateId(),
        title: "Lounge Furniture",
        items: [
          createItem("Outdoor Sofa", "2-seater weatherproof sofa", 5, 2.5, 850),
          createItem("Lounge Chair", "Reclining outdoor lounger", 2.5, 6, 650),
          createItem("Coffee Table", "Weather-resistant center table", 3, 2, 450),
          createItem("Side Tables", "Compact side tables (2)", 1.5, 1.5, 350),
        ],
      },
      {
        id: generateId(),
        title: "Ambiance",
        items: [
          createItem("Vertical Garden", "Wall-mounted green panel", 4, 6, 750),
          createItem("Floor Planters", "Large decorative planters (3)", 2, 3, 500),
          createItem("String Lights", "Outdoor fairy light setup", 10, 0.5, 250),
          createItem("Privacy Screen", "Bamboo/fabric partition", 6, 6, 400),
        ],
      },
    ],
  },

  // =================== BATHROOM TEMPLATES ===================
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
          createItem("Vanity Cabinet", "Marine plywood with PU finish, basin cutout", 4, 2.5, 1100),
          createItem("Mirror Unit", "LED mirror with defogger", 3, 3, 750),
          createItem("Side Cabinet", "Tall unit for toiletries storage", 1.5, 5, 650),
        ],
      },
    ],
  },
  {
    id: "bathroom-premium",
    name: "Premium Bathroom",
    description: "Complete premium bathroom furniture",
    icon: Bath,
    category: "Bathroom",
    sections: [
      {
        id: generateId(),
        title: "Vanity & Storage",
        items: [
          createItem("Double Vanity", "Twin basin vanity unit", 6, 2.5, 1400),
          createItem("Smart Mirror", "Touch LED mirror with clock", 5, 3, 950),
          createItem("Storage Tower", "Full height linen storage", 2, 7, 850),
          createItem("Medicine Cabinet", "Recessed medicine storage", 2, 2, 550),
        ],
      },
    ],
  },

  // =================== STUDY/OFFICE TEMPLATES ===================
  {
    id: "home-office",
    name: "Home Office Setup",
    description: "Complete home office furniture",
    icon: BookMarked,
    category: "Study/Office",
    sections: [
      {
        id: generateId(),
        title: "Work Station",
        items: [
          createItem("Executive Desk", "L-shape desk with cable management", 6, 3, 950),
          createItem("Storage Pedestal", "Mobile pedestal with lock", 1.5, 2, 550),
          createItem("Monitor Stand", "Adjustable monitor riser with storage", 2, 1, 350),
        ],
      },
      {
        id: generateId(),
        title: "Storage",
        items: [
          createItem("File Cabinet", "4-drawer filing cabinet with lock", 1.5, 4, 750),
          createItem("Bookcase", "Open bookcase with adjustable shelves", 3, 6, 650),
          createItem("Wall Organizer", "Wall-mounted organizer with pinboard", 4, 3, 450),
        ],
      },
    ],
  },
  {
    id: "study-room",
    name: "Study Room",
    description: "Dedicated study room setup",
    icon: BookMarked,
    category: "Study/Office",
    sections: [
      {
        id: generateId(),
        title: "Study Furniture",
        items: [
          createItem("Study Desk", "Wall-mounted folding desk", 4, 2, 650),
          createItem("Wall Bookshelf", "Full wall book storage", 8, 7, 850),
          createItem("Reading Nook", "Built-in window seat with storage", 5, 3, 750),
        ],
      },
      {
        id: generateId(),
        title: "Organization",
        items: [
          createItem("Desk Organizer", "Desktop stationery organizer", 2, 1, 300),
          createItem("Wall Grid", "Metal grid for notes and photos", 3, 3, 250),
          createItem("Magazine Rack", "Wall-mounted magazine holder", 1.5, 2, 200),
        ],
      },
    ],
  },

  // =================== POOJA ROOM TEMPLATES ===================
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
          createItem("Pooja Cabinet", "Teak veneer finish with carved doors", 3, 5, 1200),
          createItem("Bell Hanging", "Brass bell with chain fixture", 0.5, 1, 250),
          createItem("Storage Base", "Base cabinet for pooja items storage", 3, 1.5, 650),
          createItem("LED Lighting", "Warm LED strips for ambiance", 3, 0.5, 350),
        ],
      },
    ],
  },
  {
    id: "pooja-room-full",
    name: "Pooja Room Complete",
    description: "Full pooja room with seating",
    icon: Package,
    category: "Pooja Room",
    sections: [
      {
        id: generateId(),
        title: "Main Unit",
        items: [
          createItem("Wall Mounted Mandir", "Carved wooden mandir with jaali", 4, 5, 1500),
          createItem("Brass Work", "Traditional brass embellishments", 2, 3, 450),
          createItem("Ceiling Pendant", "Decorative hanging lamp", 1.5, 2, 550),
        ],
      },
      {
        id: generateId(),
        title: "Seating & Storage",
        items: [
          createItem("Floor Seating", "Padded floor cushions (4)", 4, 4, 350),
          createItem("Side Storage", "Small cabinets for items", 2, 3, 550),
          createItem("Rug/Mat", "Traditional pooja mat", 4, 4, 200),
        ],
      },
    ],
  },

  // =================== FOYER TEMPLATES ===================
  {
    id: "foyer-unit",
    name: "Foyer Unit",
    description: "Entrance foyer with shoe rack and mirror",
    icon: DoorOpen,
    category: "Foyer",
    sections: [
      {
        id: generateId(),
        title: "Foyer Elements",
        items: [
          createItem("Shoe Cabinet", "Tip-out shoe rack with mirror back", 4, 4, 850),
          createItem("Console Table", "Slim console with drawer", 4, 2.5, 650),
          createItem("Wall Mirror", "Full length decorative mirror", 2, 6, 550),
          createItem("Key Holder", "Wall mounted key organizer", 1, 0.5, 250),
        ],
      },
    ],
  },
  {
    id: "foyer-premium",
    name: "Premium Foyer",
    description: "Luxury entrance with statement pieces",
    icon: DoorOpen,
    category: "Foyer",
    sections: [
      {
        id: generateId(),
        title: "Statement Pieces",
        items: [
          createItem("Designer Console", "Designer console with art piece", 5, 3, 1100),
          createItem("Statement Mirror", "Oversized decorative mirror", 4, 6, 850),
          createItem("Seating Bench", "Upholstered entry bench", 4, 1.5, 650),
        ],
      },
      {
        id: generateId(),
        title: "Storage & Organization",
        items: [
          createItem("Hidden Shoe Storage", "Pull-out shoe cabinet", 5, 4, 950),
          createItem("Coat Closet", "Concealed coat storage", 3, 6, 750),
          createItem("Umbrella Stand", "Designer umbrella holder", 1, 2, 350),
        ],
      },
    ],
  },

  // =================== UTILITY ROOM TEMPLATES ===================
  {
    id: "utility-room",
    name: "Utility Room",
    description: "Laundry and utility space organization",
    icon: Warehouse,
    category: "Utility Room",
    sections: [
      {
        id: generateId(),
        title: "Laundry Area",
        items: [
          createItem("Washer/Dryer Cabinet", "Stacked unit housing", 2.5, 6, 750),
          createItem("Folding Counter", "Pull-out folding surface", 4, 2, 550),
          createItem("Ironing Station", "Wall-mounted ironing board cabinet", 2, 4, 450),
        ],
      },
      {
        id: generateId(),
        title: "Storage",
        items: [
          createItem("Overhead Cabinets", "Wall storage for supplies", 6, 2, 650),
          createItem("Sink Unit", "Utility sink with cabinet", 3, 3, 850),
          createItem("Broom Closet", "Tall storage for cleaning tools", 2, 6, 550),
        ],
      },
    ],
  },

  // =================== BAR AREA TEMPLATES ===================
  {
    id: "home-bar",
    name: "Home Bar",
    description: "Stylish home bar setup",
    icon: Wine,
    category: "Bar Area",
    sections: [
      {
        id: generateId(),
        title: "Bar Counter",
        items: [
          createItem("Bar Counter", "Stone top bar counter with footrest", 5, 3.5, 1200),
          createItem("Bar Stools (3)", "High stools with back support", 1.5, 3, 550),
          createItem("Back Bar", "Display shelving with LED", 5, 5, 950),
        ],
      },
      {
        id: generateId(),
        title: "Storage & Display",
        items: [
          createItem("Wine Rack", "Custom wine bottle storage", 2, 4, 650),
          createItem("Glass Holder", "Hanging glass rack", 3, 1, 350),
          createItem("Mini Fridge Cabinet", "Beverage cooler housing", 2, 3, 550),
        ],
      },
    ],
  },

  // =================== DRESSING ROOM TEMPLATES ===================
  {
    id: "dressing-room",
    name: "Dressing Room",
    description: "Complete dressing and makeup area",
    icon: Shirt,
    category: "Dressing Room",
    sections: [
      {
        id: generateId(),
        title: "Vanity Area",
        items: [
          createItem("Vanity Desk", "Makeup table with storage", 4, 2.5, 850),
          createItem("LED Mirror", "Hollywood-style LED mirror", 4, 4, 750),
          createItem("Vanity Chair", "Upholstered vanity stool", 2, 2, 450),
        ],
      },
      {
        id: generateId(),
        title: "Storage",
        items: [
          createItem("Accessory Cabinets", "Display cabinets for accessories", 3, 5, 850),
          createItem("Jewelry Organizer", "Wall-mounted jewelry display", 2, 3, 550),
          createItem("Full Length Mirror", "Illuminated dressing mirror", 2, 6, 650),
        ],
      },
    ],
  },

  // =================== KIDS PLAY AREA TEMPLATES ===================
  {
    id: "kids-play-area",
    name: "Kids Play Area",
    description: "Fun and organized play space",
    icon: Baby,
    category: "Kids Play Area",
    sections: [
      {
        id: generateId(),
        title: "Play Zone",
        items: [
          createItem("Play Mat Area", "Soft foam play flooring", 8, 8, 350),
          createItem("Toy Storage", "Open cubby toy organizer", 6, 4, 650),
          createItem("Activity Table", "Kids activity table with chairs", 4, 3, 450),
        ],
      },
      {
        id: generateId(),
        title: "Creative Corner",
        items: [
          createItem("Art Station", "Easel and art supplies storage", 3, 4, 550),
          createItem("Reading Nook", "Cozy reading corner with cushions", 4, 4, 500),
          createItem("Wall Display", "Kids artwork display rail", 6, 1, 250),
        ],
      },
    ],
  },

  // =================== COFFEE BAR TEMPLATES ===================
  {
    id: "coffee-bar",
    name: "Coffee/Tea Station",
    description: "Dedicated beverage station",
    icon: Coffee,
    category: "Coffee Bar",
    sections: [
      {
        id: generateId(),
        title: "Coffee Station",
        items: [
          createItem("Counter Unit", "Compact counter with storage", 4, 3, 750),
          createItem("Overhead Cabinet", "Cup and ingredient storage", 4, 2, 550),
          createItem("Appliance Shelf", "Machine and kettle space", 3, 1.5, 350),
        ],
      },
    ],
  },

  // =================== GARAGE/PARKING TEMPLATES ===================
  {
    id: "garage-storage",
    name: "Garage Storage",
    description: "Organized garage storage system",
    icon: Car,
    category: "Garage",
    sections: [
      {
        id: generateId(),
        title: "Wall Storage",
        items: [
          createItem("Tool Board", "Pegboard tool organization", 6, 4, 450),
          createItem("Wall Cabinets", "Metal storage cabinets", 8, 3, 650),
          createItem("Shelf Rack", "Heavy-duty shelf system", 6, 6, 550),
        ],
      },
      {
        id: generateId(),
        title: "Work Area",
        items: [
          createItem("Workbench", "Steel workbench with vice", 6, 3, 750),
          createItem("Tool Cabinet", "Rolling tool chest", 2.5, 4, 650),
          createItem("Pegboard Extensions", "Additional tool hanging", 4, 3, 350),
        ],
      },
    ],
  },

  // =================== OUTDOOR LIVING TEMPLATES ===================
  {
    id: "outdoor-living",
    name: "Outdoor Living",
    description: "Terrace/patio furniture setup",
    icon: Flower2,
    category: "Outdoor Living",
    sections: [
      {
        id: generateId(),
        title: "Seating Area",
        items: [
          createItem("Outdoor Sofa Set", "Weather-resistant modular seating", 8, 6, 950),
          createItem("Outdoor Dining", "6-seater outdoor dining set", 6, 4, 850),
          createItem("Umbrella/Pergola", "Shade structure", 8, 8, 650),
        ],
      },
      {
        id: generateId(),
        title: "Features",
        items: [
          createItem("Planter Boxes", "Built-in planters", 6, 2, 450),
          createItem("BBQ Station", "Outdoor cooking area", 5, 3, 1100),
          createItem("Fire Pit Area", "Seating around fire feature", 6, 6, 750),
        ],
      },
    ],
  },

  // =================== CUSTOM/BLANK TEMPLATE ===================
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

// Category icons mapping
const categoryIcons: Record<string, typeof FileText> = {
  "Kitchen": ChefHat,
  "Wardrobe": DoorOpen,
  "Bedroom": Bed,
  "Guest Bedroom": Bed,
  "Living Room": Sofa,
  "Dining Room": UtensilsCrossed,
  "TV Unit": Tv,
  "Modular Storage": Package,
  "Balcony": Flower2,
  "Bathroom": Bath,
  "Study/Office": BookMarked,
  "Pooja Room": Package,
  "Foyer": DoorOpen,
  "Utility Room": Warehouse,
  "Bar Area": Wine,
  "Dressing Room": Shirt,
  "Kids Play Area": Baby,
  "Coffee Bar": Coffee,
  "Garage": Car,
  "Outdoor Living": Flower2,
  "Custom": FileText,
  "My Templates": Star,
};

interface QuotationTemplatesProps {
  onSelectTemplate: (sections: Section[]) => void;
  currentSections?: Section[];
}

export const QuotationTemplates = ({ onSelectTemplate, currentSections }: QuotationTemplatesProps) => {
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [userTemplates, setUserTemplates] = useState<QuotationTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateCategory, setNewTemplateCategory] = useState("Custom");
  const [activeTab, setActiveTab] = useState<"system" | "saved">("system");

  useEffect(() => {
    if (open) {
      loadUserTemplates();
    }
  }, [open]);

  const loadUserTemplates = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('quotation_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('usage_count', { ascending: false });

      if (error) throw error;

      const templates: QuotationTemplate[] = (data || []).map(t => ({
        id: t.id,
        name: t.template_name,
        description: t.description || '',
        icon: Star,
        category: t.category,
        sections: t.sections as unknown as Section[],
        isUserTemplate: true,
      }));

      setUserTemplates(templates);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = async (template: QuotationTemplate) => {
    // Generate new IDs for sections and items to avoid conflicts
    const newSections = template.sections.map(section => ({
      ...section,
      id: generateId(),
      items: section.items.map(item => ({
        ...item,
        id: generateId(),
      })),
    }));
    
    // Update usage count for user templates
    if (template.isUserTemplate) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('quotation_templates')
          .update({ usage_count: (template as any).usage_count + 1 || 1 })
          .eq('id', template.id);
      }
    }
    
    onSelectTemplate(newSections);
    setOpen(false);
    setSelectedCategory(null);
    toast.success(`Applied "${template.name}" template`);
  };

  const handleSaveAsTemplate = async () => {
    if (!currentSections || currentSections.length === 0) {
      toast.error("No sections to save as template");
      return;
    }

    if (!newTemplateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please login to save templates");
        return;
      }

      const { error } = await supabase.from('quotation_templates').insert([{
        user_id: user.id,
        template_name: newTemplateName.trim(),
        category: newTemplateCategory,
        description: `Custom template with ${currentSections.length} sections`,
        sections: currentSections as any,
      }]);

      if (error) throw error;

      toast.success("Template saved to My Library");
      setShowSaveDialog(false);
      setNewTemplateName("");
      loadUserTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error("Failed to save template");
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('quotation_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      toast.success("Template deleted");
      loadUserTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error("Failed to delete template");
    }
  };

  // Group templates by category
  const groupedTemplates = QUOTATION_TEMPLATES.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, QuotationTemplate[]>);

  const categories = Object.keys(groupedTemplates);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Layers className="h-4 w-4" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-lg">Quotation Templates</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1">
          <div className="px-4 border-b">
            <TabsList className="grid w-full max-w-[300px] grid-cols-2">
              <TabsTrigger value="system" className="text-xs">
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                System Templates
              </TabsTrigger>
              <TabsTrigger value="saved" className="text-xs">
                <Star className="h-3.5 w-3.5 mr-1.5" />
                My Templates
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="system" className="mt-0 flex-1">
            <div className="flex h-[60vh]">
              {/* Category Sidebar */}
              <ScrollArea className="w-48 border-r bg-muted/30">
                <div className="p-2 space-y-1">
                  {categories.map((category) => {
                    const Icon = categoryIcons[category] || FileText;
                    const count = groupedTemplates[category]?.length || 0;
                    return (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs rounded-lg transition-colors ${
                          selectedCategory === category
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="flex-1 truncate">{category}</span>
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                          {count}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Templates Grid */}
              <ScrollArea className="flex-1">
                <div className="p-4">
                  {!selectedCategory ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Layers className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm font-medium">Select a category</p>
                      <p className="text-xs mt-1">Choose from {QUOTATION_TEMPLATES.length} templates</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {groupedTemplates[selectedCategory]?.map((template) => {
                        const Icon = template.icon;
                        const totalItems = template.sections.reduce((acc, s) => acc + s.items.length, 0);
                        return (
                          <Card
                            key={template.id}
                            className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
                            onClick={() => handleSelectTemplate(template)}
                          >
                            <CardHeader className="p-3 pb-2">
                              <div className="flex items-start gap-2">
                                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                  <Icon className="h-4 w-4 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <CardTitle className="text-sm font-medium truncate">
                                    {template.name}
                                  </CardTitle>
                                  <CardDescription className="text-[10px] line-clamp-1 mt-0.5">
                                    {template.description}
                                  </CardDescription>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="p-3 pt-0">
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                  {template.sections.length} sections
                                </Badge>
                                <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                                  {totalItems} items
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="saved" className="mt-0 flex-1">
            <ScrollArea className="h-[60vh]">
              <div className="p-4">
                {/* Save Current Template Button */}
                {currentSections && currentSections.length > 0 && (
                  <Card className="mb-4 border-dashed">
                    <CardContent className="p-4">
                      {showSaveDialog ? (
                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs">Template Name</Label>
                            <Input
                              value={newTemplateName}
                              onChange={(e) => setNewTemplateName(e.target.value)}
                              placeholder="e.g., My Kitchen Template"
                              className="mt-1 h-9"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Category</Label>
                            <select
                              value={newTemplateCategory}
                              onChange={(e) => setNewTemplateCategory(e.target.value)}
                              className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                            >
                              {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleSaveAsTemplate} className="flex-1">
                              <Save className="h-3.5 w-3.5 mr-1.5" />
                              Save Template
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setShowSaveDialog(false)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full border-dashed"
                          onClick={() => setShowSaveDialog(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Save Current Quotation as Template
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* User Templates */}
                {loading ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
                    <p className="text-xs">Loading templates...</p>
                  </div>
                ) : userTemplates.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Star className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium">No saved templates</p>
                    <p className="text-xs mt-1">Save your quotations as templates for reuse</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {userTemplates.map((template) => {
                      const totalItems = template.sections.reduce((acc, s) => acc + s.items.length, 0);
                      return (
                        <Card
                          key={template.id}
                          className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group relative"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(template.id);
                            }}
                            className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity bg-destructive/10 hover:bg-destructive/20 text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                          <div onClick={() => handleSelectTemplate(template)}>
                            <CardHeader className="p-3 pb-2">
                              <div className="flex items-start gap-2">
                                <div className="p-2 rounded-lg bg-amber-500/10">
                                  <Star className="h-4 w-4 text-amber-600" />
                                </div>
                                <div className="flex-1 min-w-0 pr-6">
                                  <CardTitle className="text-sm font-medium truncate">
                                    {template.name}
                                  </CardTitle>
                                  <CardDescription className="text-[10px] line-clamp-1 mt-0.5">
                                    {template.category}
                                  </CardDescription>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="p-3 pt-0">
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                  {template.sections.length} sections
                                </Badge>
                                <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                                  {totalItems} items
                                </Badge>
                              </div>
                            </CardContent>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
