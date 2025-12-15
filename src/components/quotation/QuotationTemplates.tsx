import { useState, useEffect } from "react";
import { FileText, Bed, ChefHat, Sofa, Tv, Bath, Package, DoorOpen, Plus, Star, Save, Trash2, BookOpen, Armchair, UtensilsCrossed, Flower2, BookMarked } from "lucide-react";
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

// Predefined Templates - Extended with more categories
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
          createItem("Base Cabinet - Long Arm", "Marine plywood laminate finish, 5 units", 0, 0, 850),
          createItem("Base Cabinet - Short Arm", "Marine plywood laminate finish, 3 units", 0, 0, 850),
          createItem("Corner Base Unit", "Lazy susan corner mechanism", 0, 0, 1100),
          createItem("Sink Unit", "Integrated sink cabinet with water stopper", 0, 0, 950),
        ],
      },
      {
        id: generateId(),
        title: "Wall Units",
        items: [
          createItem("Wall Cabinets - Long Wall", "Matching wall units with lift-up", 0, 0, 750),
          createItem("Wall Cabinets - Short Wall", "Corner optimized units", 0, 0, 750),
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
          createItem("Wall Units - Left", "Floor to ceiling storage units", 0, 0, 1100),
          createItem("Wall Units - Right", "Matching units with display area", 0, 0, 1100),
          createItem("Island Dresser", "Central island with drawers and mirror", 0, 0, 1400),
        ],
      },
      {
        id: generateId(),
        title: "Specialty Storage",
        items: [
          createItem("Bag Display", "Illuminated bag display shelves", 0, 0, 850),
          createItem("Shoe Wall", "Full wall shoe display system", 0, 0, 950),
          createItem("Jewelry Cabinet", "Lockable jewelry organization", 0, 0, 1200),
          createItem("Vanity Section", "Built-in vanity with LED mirror", 0, 0, 1000),
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

  // NEW: Guest Bedroom
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
          createItem("Queen Size Bed", "Upholstered bed with storage", 0, 0, 1000),
          createItem("Headboard Panel", "Simple upholstered headboard", 0, 0, 550),
          createItem("Bedside Table", "Compact bedside with drawer", 0, 0, 450),
        ],
      },
      {
        id: generateId(),
        title: "Storage",
        items: [
          createItem("2-Door Wardrobe", "Compact wardrobe with mirror", 0, 0, 850),
          createItem("Luggage Bench", "Bench with storage for guest luggage", 0, 0, 400),
          createItem("Wall Shelf", "Floating shelf for personal items", 0, 0, 300),
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
          createItem("King Size Bed", "Premium bed with memory foam support", 0, 0, 1100),
          createItem("Extended Headboard", "Wall-to-wall padded headboard", 0, 0, 750),
          createItem("Side Tables (Pair)", "Matching bedside units", 0, 0, 600),
          createItem("Reading Nook", "Built-in reading chair with light", 0, 0, 550),
        ],
      },
      {
        id: generateId(),
        title: "Work & Storage",
        items: [
          createItem("Compact Desk", "Wall-mounted work desk", 0, 0, 650),
          createItem("Wardrobe", "Full-height guest wardrobe", 0, 0, 950),
          createItem("TV Unit", "Compact TV panel with storage", 0, 0, 550),
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
          createItem("3-Seater Sofa", "Wooden frame with cushion upholstery", 0, 0, 1000),
          createItem("2-Seater Sofa", "Matching loveseat", 0, 0, 800),
          createItem("Single Seaters", "Pair of armchairs", 0, 0, 650),
          createItem("Center Table", "Carved wooden center table with glass", 0, 0, 550),
        ],
      },
      {
        id: generateId(),
        title: "Display & Storage",
        items: [
          createItem("Showcase", "Glass front wooden showcase", 0, 0, 1100),
          createItem("Corner Unit", "Traditional corner display unit", 0, 0, 750),
        ],
      },
    ],
  },

  // NEW: Dining Room
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
          createItem("Dining Table - 6 Seater", "Solid wood table with glass top", 0, 0, 850),
          createItem("Dining Chairs (6)", "Upholstered dining chairs set", 0, 0, 450),
          createItem("Table Runner", "Decorative table protection", 0, 0, 150),
        ],
      },
      {
        id: generateId(),
        title: "Storage",
        items: [
          createItem("Crockery Unit", "2-door crockery cabinet with glass", 0, 0, 950),
          createItem("Sideboard", "Serving sideboard with drawers", 0, 0, 750),
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
          createItem("Dining Table - 8 Seater", "Marble top with metal base", 0, 0, 1400),
          createItem("Dining Chairs (8)", "Italian leather chairs", 0, 0, 650),
          createItem("Bar Cabinet", "Rotating bar with glass holders", 0, 0, 1200),
        ],
      },
      {
        id: generateId(),
        title: "Display & Lighting",
        items: [
          createItem("Display Unit", "Full wall crockery display with LED", 0, 0, 1100),
          createItem("Console Table", "Marble console for serving", 0, 0, 850),
          createItem("Mirror Panel", "Decorative dining mirror", 0, 0, 550),
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

  // NEW: Modular Storage
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
          createItem("Base Module", "Floor-standing base unit with doors", 0, 0, 650),
          createItem("Stack Module", "Stackable storage cube", 0, 0, 450),
          createItem("Open Shelf Module", "Display shelf module", 0, 0, 350),
          createItem("Drawer Module", "2-drawer storage module", 0, 0, 550),
        ],
      },
      {
        id: generateId(),
        title: "Accessories",
        items: [
          createItem("Door Panels", "Interchangeable door panels", 0, 0, 250),
          createItem("Basket Inserts", "Wire basket organization", 0, 0, 200),
          createItem("Dividers", "Internal divider set", 0, 0, 150),
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
          createItem("Base Units (4)", "Floor units with varied doors", 0, 0, 750),
          createItem("Wall Units (4)", "Matching wall-mounted modules", 0, 0, 650),
          createItem("Open Display Units", "Glass-front display modules", 0, 0, 550),
          createItem("Corner Unit", "Corner optimization module", 0, 0, 700),
        ],
      },
      {
        id: generateId(),
        title: "Specialty Modules",
        items: [
          createItem("Media Module", "AV equipment housing with ventilation", 0, 0, 600),
          createItem("File Module", "Document filing system", 0, 0, 500),
          createItem("Safe Module", "Hidden safe compartment", 0, 0, 850),
        ],
      },
    ],
  },

  // NEW: Balcony Furniture
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
          createItem("Balcony Chair Set", "Weather-resistant chairs (2)", 0, 0, 450),
          createItem("Small Table", "Compact outdoor table", 0, 0, 350),
          createItem("Floor Cushions", "Outdoor cushion set", 0, 0, 200),
        ],
      },
      {
        id: generateId(),
        title: "Garden & Storage",
        items: [
          createItem("Planter Boxes", "Railing planters set", 0, 0, 300),
          createItem("Storage Bench", "Weather-proof storage seat", 0, 0, 450),
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
          createItem("Outdoor Sofa", "2-seater weatherproof sofa", 0, 0, 850),
          createItem("Lounge Chair", "Reclining outdoor lounger", 0, 0, 650),
          createItem("Coffee Table", "Weather-resistant center table", 0, 0, 450),
          createItem("Side Tables", "Compact side tables (2)", 0, 0, 350),
        ],
      },
      {
        id: generateId(),
        title: "Ambiance",
        items: [
          createItem("Vertical Garden", "Wall-mounted green panel", 0, 0, 750),
          createItem("Floor Planters", "Large decorative planters (3)", 0, 0, 500),
          createItem("String Lights", "Outdoor fairy light setup", 0, 0, 250),
          createItem("Privacy Screen", "Bamboo/fabric partition", 0, 0, 400),
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
          createItem("Double Vanity", "Twin basin vanity unit", 0, 0, 1400),
          createItem("Smart Mirror", "Touch LED mirror with clock", 0, 0, 950),
          createItem("Storage Tower", "Full height linen storage", 0, 0, 850),
          createItem("Medicine Cabinet", "Recessed medicine storage", 0, 0, 550),
        ],
      },
    ],
  },

  // Study/Office Templates
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
          createItem("Study Desk", "Wall-mounted folding desk", 0, 0, 650),
          createItem("Wall Bookshelf", "Full wall book storage", 0, 0, 850),
          createItem("Reading Nook", "Built-in window seat with storage", 0, 0, 750),
        ],
      },
      {
        id: generateId(),
        title: "Organization",
        items: [
          createItem("Desk Organizer", "Desktop stationery organizer", 0, 0, 300),
          createItem("Wall Grid", "Metal grid for notes and photos", 0, 0, 250),
          createItem("Magazine Rack", "Wall-mounted magazine holder", 0, 0, 200),
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
          createItem("Wall Mounted Mandir", "Carved wooden mandir with jaali", 0, 0, 1500),
          createItem("Brass Work", "Traditional brass embellishments", 0, 0, 450),
          createItem("Ceiling Pendant", "Decorative hanging lamp", 0, 0, 550),
        ],
      },
      {
        id: generateId(),
        title: "Seating & Storage",
        items: [
          createItem("Floor Seating", "Padded floor cushions (4)", 0, 0, 350),
          createItem("Side Storage", "Small cabinets for items", 0, 0, 550),
          createItem("Rug/Mat", "Traditional pooja mat", 0, 0, 200),
        ],
      },
    ],
  },

  // Foyer/Entrance Template
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
          createItem("Shoe Cabinet", "Tip-out shoe rack with mirror back", 0, 0, 850),
          createItem("Console Table", "Slim console with drawer", 0, 0, 650),
          createItem("Wall Mirror", "Full length decorative mirror", 0, 0, 550),
          createItem("Key Holder", "Wall mounted key organizer", 0, 0, 250),
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
          createItem("Designer Console", "Designer console with art piece", 0, 0, 1100),
          createItem("Statement Mirror", "Oversized decorative mirror", 0, 0, 850),
          createItem("Seating Bench", "Upholstered entry bench", 0, 0, 650),
        ],
      },
      {
        id: generateId(),
        title: "Storage & Organization",
        items: [
          createItem("Hidden Shoe Storage", "Pull-out shoe cabinet", 0, 0, 950),
          createItem("Coat Closet", "Concealed coat storage", 0, 0, 750),
          createItem("Umbrella Stand", "Designer umbrella holder", 0, 0, 350),
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

  const groupedUserTemplates = userTemplates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, QuotationTemplate[]>);

  const systemCategories = Object.keys(groupedTemplates);
  const userCategories = Object.keys(groupedUserTemplates);

  const renderCategoryGrid = (categories: string[], templates: Record<string, QuotationTemplate[]>, isUserTemplates = false) => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {categories.map((category) => {
        const categoryTemplates = templates[category];
        const Icon = categoryIcons[category] || FileText;
        return (
          <Card 
            key={category}
            className="cursor-pointer hover:bg-primary/5 hover:border-primary/30 transition-all duration-200 group"
            onClick={() => setSelectedCategory(category)}
          >
            <CardContent className="flex flex-col items-center justify-center p-4 md:p-6 gap-2 md:gap-3">
              <div className="p-2 md:p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Icon className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-medium text-sm md:text-base">{category}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground">
                  {categoryTemplates.length} {categoryTemplates.length === 1 ? 'template' : 'templates'}
                </p>
              </div>
              {isUserTemplates && (
                <Badge variant="secondary" className="text-[10px]">
                  <Star className="h-2 w-2 mr-1" />
                  Saved
                </Badge>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const renderTemplateList = (templates: QuotationTemplate[], isUserTemplates = false) => (
    <div className="space-y-3">
      {templates.map((template) => {
        const Icon = template.icon;
        return (
          <Card 
            key={template.id}
            className="cursor-pointer hover:bg-primary/5 hover:border-primary/30 transition-all duration-200 group"
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div 
                  className="flex items-center gap-3 flex-1"
                  onClick={() => handleSelectTemplate(template)}
                >
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base group-hover:text-primary transition-colors">
                      {template.name}
                    </CardTitle>
                    <CardDescription className="text-xs">{template.description}</CardDescription>
                  </div>
                </div>
                {isUserTemplates && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTemplate(template.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0" onClick={() => handleSelectTemplate(template)}>
              <div className="flex flex-wrap gap-1">
                {template.sections.slice(0, 3).map((section, idx) => (
                  <Badge 
                    key={idx} 
                    variant="outline"
                    className="text-[10px] bg-muted/50"
                  >
                    {section.title} ({section.items.length})
                  </Badge>
                ))}
                {template.sections.length > 3 && (
                  <Badge variant="outline" className="text-[10px]">
                    +{template.sections.length - 3} more
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none gap-2">
            <BookOpen className="h-4 w-4" />
            Templates
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[85vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Quotation Templates
            </DialogTitle>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "system" | "saved")} className="w-full">
            <div className="px-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="system" className="gap-2">
                  <Package className="h-4 w-4" />
                  System Templates
                </TabsTrigger>
                <TabsTrigger value="saved" className="gap-2">
                  <Star className="h-4 w-4" />
                  My Templates
                  {userTemplates.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-[10px] justify-center">
                      {userTemplates.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="h-[60vh] px-4">
              <TabsContent value="system" className="mt-4 mb-4">
                {!selectedCategory ? (
                  renderCategoryGrid(systemCategories, groupedTemplates)
                ) : (
                  <div className="space-y-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedCategory(null)}
                      className="mb-2"
                    >
                      ← Back to Categories
                    </Button>
                    {renderTemplateList(groupedTemplates[selectedCategory] || [])}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="saved" className="mt-4 mb-4">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading your templates...</div>
                ) : userTemplates.length === 0 ? (
                  <div className="text-center py-12 space-y-4">
                    <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto">
                      <Star className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">No saved templates yet</p>
                      <p className="text-sm text-muted-foreground">
                        Create a quotation and save it as a template for reuse
                      </p>
                    </div>
                  </div>
                ) : !selectedCategory || !groupedUserTemplates[selectedCategory] ? (
                  renderCategoryGrid(userCategories, groupedUserTemplates, true)
                ) : (
                  <div className="space-y-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedCategory(null)}
                      className="mb-2"
                    >
                      ← Back to Categories
                    </Button>
                    {renderTemplateList(groupedUserTemplates[selectedCategory] || [], true)}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>

          {/* Save as Template Button */}
          {currentSections && currentSections.length > 0 && currentSections[0].items[0]?.productName && (
            <div className="p-4 pt-0 border-t">
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={() => setShowSaveDialog(true)}
              >
                <Save className="h-4 w-4" />
                Save Current Quotation as Template
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Save Template Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              Save as Template
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                placeholder="e.g., My Kitchen Setup"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={newTemplateCategory}
                onChange={(e) => setNewTemplateCategory(e.target.value)}
              >
                {Object.keys(categoryIcons).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="text-sm text-muted-foreground">
              This will save {currentSections?.length || 0} sections with all items as a reusable template.
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveAsTemplate}>
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
