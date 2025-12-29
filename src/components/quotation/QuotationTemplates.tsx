import { useState, useEffect, useMemo } from "react";
import { FileText, Bed, ChefHat, Sofa, Tv, Bath, Package, DoorOpen, Plus, Star, Save, Trash2, BookOpen, Armchair, UtensilsCrossed, Flower2, BookMarked, Warehouse, Car, Baby, Coffee, Shirt, Wine, Home, Layers, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
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
  {
    id: "island-kitchen",
    name: "Island Kitchen",
    description: "Kitchen with central island counter",
    icon: ChefHat,
    category: "Kitchen",
    sections: [
      {
        id: generateId(),
        title: "Main Counter",
        items: [
          createItem("Base Cabinets", "Marine plywood with laminate, continuous run", 12, 2.5, 850),
          createItem("Wall Cabinets", "Matching wall units with lift-up", 12, 1.5, 750),
          createItem("Tall Unit - Pantry", "Full height pantry pull-out", 2, 7, 1200),
          createItem("Tall Unit - Appliance", "Oven and microwave housing", 2, 7, 1100),
        ],
      },
      {
        id: generateId(),
        title: "Island Counter",
        items: [
          createItem("Island Base", "Island with storage on both sides", 6, 3, 1100),
          createItem("Island Countertop", "Quartz/granite island top with overhang", 7, 3.5, 650),
          createItem("Island Seating", "Bar stool space with footrest rail", 4, 1, 350),
          createItem("Island Sink/Hob", "Prep sink or hob installation", 2, 2, 550),
        ],
      },
    ],
  },
  {
    id: "straight-kitchen",
    name: "Straight/Single Wall Kitchen",
    description: "Linear kitchen for compact spaces",
    icon: ChefHat,
    category: "Kitchen",
    sections: [
      {
        id: generateId(),
        title: "Base Units",
        items: [
          createItem("Sink Cabinet", "Under-sink storage with water stopper", 3, 2.5, 900),
          createItem("Hob Cabinet", "Gas/induction hob base unit", 2, 2.5, 900),
          createItem("Base Cabinets", "Storage cabinets with shelves", 4, 2.5, 850),
          createItem("Drawer Unit", "3-drawer soft-close unit", 2, 2.5, 1050),
        ],
      },
      {
        id: generateId(),
        title: "Wall & Tall Units",
        items: [
          createItem("Wall Cabinets", "Full length wall storage", 10, 1.5, 750),
          createItem("Chimney Cover", "Designer chimney enclosure", 2, 2, 550),
          createItem("Open Shelves", "Display shelves for jars/spices", 2, 1, 450),
        ],
      },
    ],
  },
  {
    id: "g-shape-kitchen",
    name: "G-Shape Kitchen",
    description: "G-shaped kitchen with peninsula",
    icon: ChefHat,
    category: "Kitchen",
    sections: [
      {
        id: generateId(),
        title: "Main G-Shape",
        items: [
          createItem("Base Cabinets - Main Run", "3 sides continuous base units", 18, 2.5, 850),
          createItem("Peninsula Counter", "Extended counter with seating", 5, 2.5, 950),
          createItem("Corner Units (2)", "Blind corner with pull-out", 3, 2.5, 1100),
        ],
      },
      {
        id: generateId(),
        title: "Wall & Storage",
        items: [
          createItem("Wall Cabinets", "Full perimeter wall storage", 20, 1.5, 750),
          createItem("Tall Pantry", "Floor to ceiling pantry", 2, 7, 1200),
        ],
      },
    ],
  },
  {
    id: "modular-kitchen-acrylic",
    name: "Acrylic Finish Kitchen",
    description: "High-gloss acrylic modular kitchen",
    icon: ChefHat,
    category: "Kitchen",
    sections: [
      {
        id: generateId(),
        title: "Acrylic Base Units",
        items: [
          createItem("Base Cabinets - Acrylic", "High-gloss acrylic finish shutters", 10, 2.5, 1350),
          createItem("Drawer Unit - Premium", "Blum tandem with acrylic front", 2, 2.5, 1450),
          createItem("Corner Unit - Magic", "Le-mans corner system", 3, 2.5, 1500),
        ],
      },
      {
        id: generateId(),
        title: "Acrylic Wall Units",
        items: [
          createItem("Wall Cabinets - Acrylic", "Matching acrylic wall units", 10, 2, 1200),
          createItem("Glass Display", "Aluminium frame glass shutters", 3, 2, 1100),
        ],
      },
      {
        id: generateId(),
        title: "Premium Accessories",
        items: [
          createItem("Corian Countertop", "Seamless Corian solid surface", 12, 2, 950),
          createItem("Profile Handles", "Integrated aluminium profiles", 12, 0.5, 350),
        ],
      },
    ],
  },
  {
    id: "modular-kitchen-membrane",
    name: "Membrane Finish Kitchen",
    description: "Budget-friendly membrane kitchen",
    icon: ChefHat,
    category: "Kitchen",
    sections: [
      {
        id: generateId(),
        title: "Membrane Base Units",
        items: [
          createItem("Base Cabinets", "MDF with membrane finish", 10, 2.5, 650),
          createItem("Sink Cabinet", "Water-resistant MDF base", 3, 2.5, 700),
          createItem("Drawer Unit", "Standard telescopic drawers", 2, 2.5, 800),
        ],
      },
      {
        id: generateId(),
        title: "Membrane Wall Units",
        items: [
          createItem("Wall Cabinets", "MDF membrane wall units", 10, 1.5, 550),
          createItem("Corner Unit", "Simple corner cabinet", 2, 1.5, 600),
        ],
      },
    ],
  },
  {
    id: "wet-dry-kitchen",
    name: "Wet & Dry Kitchen",
    description: "Separate wet and dry cooking areas",
    icon: ChefHat,
    category: "Kitchen",
    sections: [
      {
        id: generateId(),
        title: "Dry Kitchen (Show Kitchen)",
        items: [
          createItem("Base Cabinets", "Premium laminate finish", 8, 2.5, 950),
          createItem("Wall Cabinets", "Glass front display units", 8, 2, 850),
          createItem("Island Counter", "Breakfast bar with storage", 5, 3, 1100),
          createItem("Coffee Station", "Appliance garage for small appliances", 2, 2, 650),
        ],
      },
      {
        id: generateId(),
        title: "Wet Kitchen (Cooking)",
        items: [
          createItem("Base Cabinets", "Marine plywood heavy-duty", 8, 2.5, 850),
          createItem("Sink Cabinet - Large", "Double bowl sink unit", 4, 2.5, 950),
          createItem("Hob Cabinet", "Gas/induction cooking zone", 3, 2.5, 900),
          createItem("Exhaust System", "Industrial chimney setup", 3, 2, 1050),
        ],
      },
    ],
  },
  {
    id: "pantry-storage",
    name: "Kitchen Pantry",
    description: "Dedicated pantry storage unit",
    icon: ChefHat,
    category: "Kitchen",
    sections: [
      {
        id: generateId(),
        title: "Pantry Units",
        items: [
          createItem("Tall Pantry - Pull Out", "Full height pull-out pantry", 2, 8, 1400),
          createItem("Tall Pantry - Swing", "Hinged door pantry with baskets", 3, 8, 1200),
          createItem("Counter Pantry", "Base level dry storage", 4, 2.5, 850),
          createItem("Overhead Storage", "Wall pantry cabinets", 6, 2, 750),
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
  {
    id: "wardrobe-lacquer",
    name: "Lacquer Finish Wardrobe",
    description: "Premium lacquered wardrobe with high-gloss finish",
    icon: DoorOpen,
    category: "Wardrobe",
    sections: [
      {
        id: generateId(),
        title: "Lacquer Structure",
        items: [
          createItem("Wardrobe Carcass", "BWP plywood with PU lacquer finish", 10, 9, 1400),
          createItem("Lacquer Doors", "High-gloss PU lacquer shutters", 10, 8, 1350),
          createItem("Profile Handles", "Integrated aluminium J-profile", 10, 0.5, 350),
        ],
      },
      {
        id: generateId(),
        title: "Premium Internals",
        items: [
          createItem("Pull-out Trouser Rack", "Aluminium trouser pull-out", 2, 2, 650),
          createItem("Tie & Belt Organizer", "Motorized tie rack", 1, 2, 550),
          createItem("LED Lighting", "Motion sensor LED strips", 10, 0.5, 450),
          createItem("Velvet Drawers", "Jewelry drawers with velvet lining", 2, 1.5, 750),
        ],
      },
    ],
  },
  {
    id: "wardrobe-glass-door",
    name: "Glass Door Wardrobe",
    description: "Modern wardrobe with glass/mirror doors",
    icon: DoorOpen,
    category: "Wardrobe",
    sections: [
      {
        id: generateId(),
        title: "Glass Door Structure",
        items: [
          createItem("Wardrobe Carcass", "Marine plywood with laminate", 8, 8, 950),
          createItem("Tinted Glass Doors", "Aluminium frame with tinted glass", 8, 7.5, 1250),
          createItem("Full Mirror Panels", "Beveled edge mirror on center doors", 4, 7.5, 850),
        ],
      },
      {
        id: generateId(),
        title: "Internal Organization",
        items: [
          createItem("Open Shelving", "Display shelves visible through glass", 4, 5, 550),
          createItem("Drawer Stack", "Concealed drawer section", 2, 3, 800),
          createItem("Hanging Section", "Double rod hanging area", 4, 4, 450),
        ],
      },
    ],
  },
  {
    id: "wardrobe-open-system",
    name: "Open Wardrobe System",
    description: "Minimalist open wardrobe without doors",
    icon: DoorOpen,
    category: "Wardrobe",
    sections: [
      {
        id: generateId(),
        title: "Open Frame",
        items: [
          createItem("Metal Frame Structure", "Powder-coated metal frame system", 8, 8, 750),
          createItem("Wooden Shelves", "Solid wood or plywood shelves", 8, 1, 450),
          createItem("Hanging Rods", "Multiple level hanging rods", 6, 0.5, 300),
        ],
      },
      {
        id: generateId(),
        title: "Accessories",
        items: [
          createItem("Fabric Baskets", "Canvas storage baskets", 2, 1.5, 250),
          createItem("Shoe Rack", "Open shoe display rack", 4, 2, 350),
          createItem("Drawer Inserts", "Modular drawer units", 2, 2, 550),
        ],
      },
    ],
  },
  {
    id: "wardrobe-corner",
    name: "Corner Wardrobe",
    description: "L-shaped corner wardrobe solution",
    icon: DoorOpen,
    category: "Wardrobe",
    sections: [
      {
        id: generateId(),
        title: "Corner Structure",
        items: [
          createItem("Corner Unit", "90-degree corner wardrobe", 4, 8, 1100),
          createItem("Left Wing", "Extended left side wardrobe", 5, 8, 950),
          createItem("Right Wing", "Extended right side wardrobe", 5, 8, 950),
        ],
      },
      {
        id: generateId(),
        title: "Corner Internals",
        items: [
          createItem("Carousel System", "Rotating corner carousel", 3, 5, 850),
          createItem("Pull-out Baskets", "Wire basket system", 2, 3, 450),
          createItem("Corner Shelves", "Curved corner shelves", 2, 4, 400),
        ],
      },
    ],
  },
  {
    id: "wardrobe-kids",
    name: "Kids Wardrobe",
    description: "Child-friendly wardrobe design",
    icon: DoorOpen,
    category: "Wardrobe",
    sections: [
      {
        id: generateId(),
        title: "Kids Structure",
        items: [
          createItem("Wardrobe Carcass", "Colorful laminate finish", 5, 6, 850),
          createItem("Low Hanging Rod", "Child-height accessible rod", 3, 3, 300),
          createItem("Soft-Close Doors", "Safe soft-close hinged doors", 5, 5.5, 750),
        ],
      },
      {
        id: generateId(),
        title: "Kid-Friendly Features",
        items: [
          createItem("Lower Drawers", "Easy-access lower drawers", 3, 1.5, 550),
          createItem("Display Shelves", "Open toy/book display", 2, 3, 400),
          createItem("Loft Storage", "Parent-access top storage", 5, 1.5, 450),
        ],
      },
    ],
  },
  {
    id: "wardrobe-his-hers",
    name: "His & Hers Wardrobe",
    description: "Dual section wardrobe for couples",
    icon: DoorOpen,
    category: "Wardrobe",
    sections: [
      {
        id: generateId(),
        title: "His Section",
        items: [
          createItem("Main Wardrobe - His", "6ft wide section with doors", 6, 8, 950),
          createItem("Trouser Rack", "Pull-out trouser organizer", 2, 2, 550),
          createItem("Tie/Belt Holder", "Accessory organizer", 1, 2, 350),
          createItem("Shirt Shelves", "Folded shirt storage", 2, 4, 450),
        ],
      },
      {
        id: generateId(),
        title: "Hers Section",
        items: [
          createItem("Main Wardrobe - Hers", "6ft wide section with doors", 6, 8, 950),
          createItem("Saree/Dress Hanging", "Full length hanging section", 3, 6, 450),
          createItem("Jewelry Drawers", "Velvet-lined jewelry drawers", 2, 1.5, 650),
          createItem("Bag Storage", "Bag display shelves", 2, 3, 450),
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
  {
    id: "master-bedroom-luxury",
    name: "Luxury Master Suite",
    description: "High-end master bedroom with all amenities",
    icon: Bed,
    category: "Bedroom",
    sections: [
      {
        id: generateId(),
        title: "Bed Setup",
        items: [
          createItem("Designer Bed", "Custom upholstered platform bed", 7, 7, 1500),
          createItem("Feature Headboard", "Full wall padded/wooden headboard", 12, 5, 1100),
          createItem("Floating Side Tables", "Wall-mounted nightstands", 2, 1.5, 550),
          createItem("Bench", "End of bed upholstered bench", 5, 1.5, 450),
        ],
      },
      {
        id: generateId(),
        title: "Seating Area",
        items: [
          createItem("Chaise Lounge", "Bedroom chaise with side table", 5, 2.5, 850),
          createItem("Reading Chair", "Accent chair with ottoman", 3, 3, 650),
          createItem("Floor Lamp", "Designer floor lamp", 1, 5, 350),
        ],
      },
      {
        id: generateId(),
        title: "Storage & Display",
        items: [
          createItem("Walk-in Closet Entry", "Closet doorway with dressing", 4, 8, 750),
          createItem("TV Wall Panel", "Concealed TV with artwork", 6, 5, 950),
          createItem("Display Niches", "Backlit display shelves", 2, 4, 550),
        ],
      },
    ],
  },
  {
    id: "bedroom-minimal",
    name: "Minimalist Bedroom",
    description: "Clean, simple bedroom design",
    icon: Bed,
    category: "Bedroom",
    sections: [
      {
        id: generateId(),
        title: "Essential Furniture",
        items: [
          createItem("Platform Bed", "Low platform bed no headboard", 6.5, 6.5, 950),
          createItem("Simple Headboard", "Wooden slat headboard", 6.5, 3, 450),
          createItem("Cube Side Tables", "Simple cube nightstands", 1.5, 1.5, 350),
        ],
      },
      {
        id: generateId(),
        title: "Storage",
        items: [
          createItem("Built-in Wardrobe", "Handle-less flush wardrobe", 8, 8, 1050),
          createItem("Floating Shelves", "Minimal wall shelves", 4, 0.5, 300),
        ],
      },
    ],
  },
  {
    id: "bedroom-indian-traditional",
    name: "Indian Traditional Bedroom",
    description: "Traditional Indian style bedroom",
    icon: Bed,
    category: "Bedroom",
    sections: [
      {
        id: generateId(),
        title: "Traditional Bed",
        items: [
          createItem("Carved Wooden Bed", "Sheesham/teak carved bed frame", 7, 6.5, 1400),
          createItem("Carved Headboard", "Traditional carved wooden headboard", 7, 4, 950),
          createItem("Bedside Tables", "Matching carved side tables", 2, 2.5, 650),
        ],
      },
      {
        id: generateId(),
        title: "Traditional Storage",
        items: [
          createItem("Wooden Almirah", "Traditional wooden wardrobe", 6, 7, 1100),
          createItem("Dressing Table", "Carved dressing table with mirror", 4, 5, 850),
          createItem("Trunk Chest", "Decorative storage trunk", 3, 2, 550),
        ],
      },
    ],
  },
  {
    id: "bedroom-contemporary",
    name: "Contemporary Bedroom",
    description: "Modern contemporary bedroom design",
    icon: Bed,
    category: "Bedroom",
    sections: [
      {
        id: generateId(),
        title: "Bed Area",
        items: [
          createItem("Floating Bed", "Wall-mounted floating bed frame", 6.5, 6.5, 1200),
          createItem("LED Headboard", "Headboard with integrated lighting", 8, 4, 950),
          createItem("Pendant Lights", "Hanging bedside pendant lights", 1, 3, 350),
        ],
      },
      {
        id: generateId(),
        title: "Features",
        items: [
          createItem("Feature Wall", "Textured/wooden accent wall", 12, 9, 750),
          createItem("TV Unit", "Integrated TV and display wall", 8, 5, 850),
          createItem("Study Nook", "Built-in study corner", 4, 6, 750),
        ],
      },
    ],
  },
  {
    id: "bedroom-scandinavian",
    name: "Scandinavian Bedroom",
    description: "Light, airy Nordic-inspired bedroom",
    icon: Bed,
    category: "Bedroom",
    sections: [
      {
        id: generateId(),
        title: "Light Furniture",
        items: [
          createItem("Oak Bed Frame", "Light oak wood bed frame", 6, 6.5, 1100),
          createItem("Simple Headboard", "Rounded oak headboard", 6, 3, 550),
          createItem("Wooden Side Tables", "Natural wood nightstands", 1.5, 2, 450),
        ],
      },
      {
        id: generateId(),
        title: "Storage & Decor",
        items: [
          createItem("White Wardrobe", "Clean white hinged wardrobe", 6, 8, 950),
          createItem("Open Shelving", "Wooden bracket shelves", 4, 4, 400),
          createItem("Woven Basket Storage", "Natural fiber storage baskets", 2, 1.5, 250),
        ],
      },
    ],
  },
  {
    id: "bedroom-industrial",
    name: "Industrial Bedroom",
    description: "Raw industrial style bedroom",
    icon: Bed,
    category: "Bedroom",
    sections: [
      {
        id: generateId(),
        title: "Industrial Furniture",
        items: [
          createItem("Metal Frame Bed", "Black metal bed frame", 6.5, 6.5, 850),
          createItem("Reclaimed Wood Headboard", "Rustic wood headboard", 7, 3.5, 650),
          createItem("Pipe Side Tables", "Industrial pipe nightstands", 1.5, 2, 450),
        ],
      },
      {
        id: generateId(),
        title: "Industrial Features",
        items: [
          createItem("Metal Wardrobe", "Locker-style metal wardrobe", 4, 7, 750),
          createItem("Pipe Shelving", "Industrial pipe wall shelves", 6, 4, 550),
          createItem("Edison Lighting", "Exposed bulb light fixtures", 3, 0.5, 350),
        ],
      },
    ],
  },
  {
    id: "bedroom-bohemian",
    name: "Bohemian Bedroom",
    description: "Eclectic boho-style bedroom",
    icon: Bed,
    category: "Bedroom",
    sections: [
      {
        id: generateId(),
        title: "Boho Furniture",
        items: [
          createItem("Low Platform Bed", "Cushioned low bed frame", 6.5, 6.5, 950),
          createItem("Macrame Headboard", "Woven macrame wall hanging", 6, 4, 450),
          createItem("Rattan Side Tables", "Natural rattan nightstands", 1.5, 2, 400),
        ],
      },
      {
        id: generateId(),
        title: "Boho Features",
        items: [
          createItem("Carved Cabinet", "Antique-style storage cabinet", 4, 5, 750),
          createItem("Hanging Chair", "Macrame swing chair", 3, 4, 550),
          createItem("Floor Cushions", "Large floor seating cushions", 3, 3, 300),
        ],
      },
    ],
  },
  {
    id: "twin-bedroom",
    name: "Twin Bed Bedroom",
    description: "Shared bedroom with two beds",
    icon: Bed,
    category: "Bedroom",
    sections: [
      {
        id: generateId(),
        title: "Twin Beds",
        items: [
          createItem("Single Beds (2)", "Matching single beds with storage", 3.5, 6.5, 850),
          createItem("Shared Headboard", "Full wall headboard for both beds", 10, 3.5, 750),
          createItem("Central Side Table", "Shared bedside table", 2, 2, 450),
        ],
      },
      {
        id: generateId(),
        title: "Shared Space",
        items: [
          createItem("Shared Wardrobe", "Double section wardrobe", 8, 8, 1050),
          createItem("Shared Desk", "Long study desk for two", 6, 2, 750),
          createItem("Bookshelf Divider", "Open shelf room divider", 3, 5, 550),
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
  {
    id: "living-room-indian",
    name: "Indian Living Room",
    description: "Traditional Indian living room setup",
    icon: Sofa,
    category: "Living Room",
    sections: [
      {
        id: generateId(),
        title: "Seating",
        items: [
          createItem("Diwan Set", "Traditional diwan with bolsters", 7, 3, 950),
          createItem("Floor Seating", "Gadda with cushions", 6, 6, 450),
          createItem("Wooden Chairs", "Traditional carved arm chairs (2)", 2, 3, 650),
        ],
      },
      {
        id: generateId(),
        title: "Display",
        items: [
          createItem("Temple Area", "Built-in small mandir", 2, 4, 750),
          createItem("Display Cabinet", "Brass artifacts showcase", 4, 6, 950),
          createItem("Wall Art Panel", "Traditional carved wall panel", 6, 4, 650),
        ],
      },
    ],
  },
  {
    id: "living-room-luxury",
    name: "Luxury Living Room",
    description: "High-end luxury living space",
    icon: Sofa,
    category: "Living Room",
    sections: [
      {
        id: generateId(),
        title: "Premium Seating",
        items: [
          createItem("Designer Sofa", "Italian leather modular sofa", 12, 5, 1600),
          createItem("Accent Chairs (2)", "Designer accent chairs", 3, 3, 850),
          createItem("Chaise Lounge", "Premium chaise with side table", 5, 2.5, 750),
        ],
      },
      {
        id: generateId(),
        title: "Tables & Accessories",
        items: [
          createItem("Marble Coffee Table", "Italian marble center table", 5, 3, 950),
          createItem("Console Table", "Marble top console", 6, 2.5, 750),
          createItem("Bar Cabinet", "Designer bar with LED", 4, 5, 1100),
        ],
      },
      {
        id: generateId(),
        title: "Display Wall",
        items: [
          createItem("Feature Wall", "Textured/stone feature wall", 12, 10, 850),
          createItem("Display Niches", "Backlit art display", 4, 5, 650),
          createItem("Fireplace Unit", "Electric fireplace console", 5, 4, 950),
        ],
      },
    ],
  },
  {
    id: "living-room-open-plan",
    name: "Open Plan Living",
    description: "Living-dining combined space",
    icon: Sofa,
    category: "Living Room",
    sections: [
      {
        id: generateId(),
        title: "Living Zone",
        items: [
          createItem("Sectional Sofa", "Large sectional for open space", 10, 8, 1350),
          createItem("Coffee Table Set", "Nesting coffee tables", 4, 2.5, 550),
          createItem("TV Console", "Long TV unit divider", 8, 2, 850),
        ],
      },
      {
        id: generateId(),
        title: "Dining Zone",
        items: [
          createItem("Dining Table", "8-seater table for open plan", 7, 4, 950),
          createItem("Dining Chairs (8)", "Matching chairs", 1.5, 3, 450),
          createItem("Partition Storage", "Open shelving divider", 4, 6, 750),
        ],
      },
    ],
  },
  {
    id: "living-room-compact",
    name: "Compact Living Room",
    description: "Space-efficient living room",
    icon: Sofa,
    category: "Living Room",
    sections: [
      {
        id: generateId(),
        title: "Compact Furniture",
        items: [
          createItem("2-Seater Sofa", "Compact sofa for small spaces", 5, 3, 850),
          createItem("Sofa Cum Bed", "Convertible sofa bed", 6, 3, 1050),
          createItem("Nesting Tables", "Stackable side tables", 2, 2, 350),
        ],
      },
      {
        id: generateId(),
        title: "Smart Storage",
        items: [
          createItem("Wall-Mounted Console", "Floating TV unit with storage", 5, 4, 750),
          createItem("Corner Shelf", "Corner display unit", 2, 5, 450),
          createItem("Ottoman Storage", "Storage ottoman as seating", 2, 2, 400),
        ],
      },
    ],
  },
  {
    id: "living-room-family",
    name: "Family Living Room",
    description: "Family-friendly living space",
    icon: Sofa,
    category: "Living Room",
    sections: [
      {
        id: generateId(),
        title: "Family Seating",
        items: [
          createItem("Large Sectional", "Oversized family sectional", 12, 8, 1400),
          createItem("Bean Bags (2)", "Kid-friendly seating", 3, 3, 350),
          createItem("Recliner", "Family recliner chair", 3, 3.5, 650),
        ],
      },
      {
        id: generateId(),
        title: "Family Features",
        items: [
          createItem("Entertainment Unit", "Full wall TV and game storage", 10, 8, 1100),
          createItem("Toy Storage", "Concealed toy/book storage", 4, 3, 550),
          createItem("Activity Corner", "Kids activity nook", 4, 4, 450),
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
  {
    id: "dining-room-10-seater",
    name: "Large Family Dining",
    description: "10-12 seater dining for large families",
    icon: UtensilsCrossed,
    category: "Dining Room",
    sections: [
      {
        id: generateId(),
        title: "Large Dining Set",
        items: [
          createItem("Dining Table - 10 Seater", "Extendable solid wood table", 8, 4.5, 1200),
          createItem("Dining Chairs (10)", "High-back upholstered chairs", 1.5, 3.5, 550),
          createItem("Bench Seating (2)", "Matching benches", 4, 1.5, 450),
        ],
      },
      {
        id: generateId(),
        title: "Storage & Service",
        items: [
          createItem("Large Crockery Unit", "Full wall crockery display", 8, 7, 1100),
          createItem("Buffet Table", "Long serving buffet", 7, 3, 850),
          createItem("Corner Bar", "Wet bar setup", 3, 5, 950),
        ],
      },
    ],
  },
  {
    id: "dining-breakfast-nook",
    name: "Breakfast Nook",
    description: "Cozy breakfast corner setup",
    icon: UtensilsCrossed,
    category: "Dining Room",
    sections: [
      {
        id: generateId(),
        title: "Nook Setup",
        items: [
          createItem("Corner Bench Seating", "L-shape banquette with storage", 6, 6, 850),
          createItem("Round Table", "Compact round table", 3.5, 3.5, 550),
          createItem("Pendant Light", "Statement pendant fixture", 2, 2, 350),
        ],
      },
    ],
  },
  {
    id: "dining-room-indian",
    name: "Indian Style Dining",
    description: "Traditional Indian dining room",
    icon: UtensilsCrossed,
    category: "Dining Room",
    sections: [
      {
        id: generateId(),
        title: "Traditional Set",
        items: [
          createItem("Round Dining Table", "Wooden carved round table", 5, 5, 950),
          createItem("Carved Chairs (6)", "Traditional carved chairs", 2, 3, 650),
          createItem("Serving Center", "Lazy susan for center", 2, 2, 350),
        ],
      },
      {
        id: generateId(),
        title: "Display",
        items: [
          createItem("Brass Display", "Brass items display cabinet", 4, 5, 950),
          createItem("Wall Shelf", "Decorative wall display", 4, 3, 550),
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
  {
    id: "tv-unit-corner",
    name: "Corner TV Unit",
    description: "Space-efficient corner TV setup",
    icon: Tv,
    category: "TV Unit",
    sections: [
      {
        id: generateId(),
        title: "Corner Setup",
        items: [
          createItem("Corner TV Cabinet", "Angled corner TV unit", 5, 5, 850),
          createItem("Side Shelves", "Corner wall shelves", 2, 4, 450),
          createItem("Base Storage", "Corner base cabinet", 4, 2, 650),
        ],
      },
    ],
  },
  {
    id: "tv-unit-concealed",
    name: "Concealed TV Unit",
    description: "Hidden TV with sliding/folding panel",
    icon: Tv,
    category: "TV Unit",
    sections: [
      {
        id: generateId(),
        title: "Concealed System",
        items: [
          createItem("TV Cavity", "Recessed TV mounting niche", 5, 4, 850),
          createItem("Sliding Panel", "Motorized sliding art panel", 6, 5, 1200),
          createItem("Remote Control System", "Smart home integration", 1, 1, 450),
        ],
      },
      {
        id: generateId(),
        title: "Surrounding Storage",
        items: [
          createItem("Side Cabinets", "Flanking storage units", 4, 6, 750),
          createItem("Base Drawer", "Media equipment drawer", 5, 1.5, 550),
        ],
      },
    ],
  },
  {
    id: "tv-unit-fireplace",
    name: "TV with Fireplace Unit",
    description: "Combined TV and fireplace wall",
    icon: Tv,
    category: "TV Unit",
    sections: [
      {
        id: generateId(),
        title: "Combined Unit",
        items: [
          createItem("Feature Wall Panel", "Stone/textured full wall", 12, 10, 950),
          createItem("TV Section", "Recessed TV mounting area", 5, 3.5, 650),
          createItem("Electric Fireplace", "Electric fireplace insert", 4, 2.5, 850),
        ],
      },
      {
        id: generateId(),
        title: "Accessories",
        items: [
          createItem("Mantle Shelf", "Fireplace mantle display", 5, 0.5, 350),
          createItem("Side Storage", "Built-in wood storage look", 2, 3, 450),
          createItem("LED Ambiance", "Mood lighting system", 10, 0.5, 350),
        ],
      },
    ],
  },
  {
    id: "tv-unit-bedroom",
    name: "Bedroom TV Unit",
    description: "Compact TV unit for bedrooms",
    icon: Tv,
    category: "TV Unit",
    sections: [
      {
        id: generateId(),
        title: "Bedroom TV",
        items: [
          createItem("Wall Panel", "Bedroom TV backpanel", 6, 5, 650),
          createItem("Floating Console", "Compact floating unit", 5, 1.5, 550),
          createItem("Side Shelves", "Decorative side shelves", 1.5, 3, 350),
        ],
      },
    ],
  },
  {
    id: "tv-unit-partition",
    name: "TV Partition Unit",
    description: "TV unit as room divider",
    icon: Tv,
    category: "TV Unit",
    sections: [
      {
        id: generateId(),
        title: "Partition Unit",
        items: [
          createItem("Double-Sided Unit", "TV visible from living, storage from dining", 6, 7, 1100),
          createItem("Rotating TV Mount", "360-degree rotating mount", 2, 3, 750),
          createItem("Display Shelves", "Open shelves both sides", 4, 5, 550),
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

  // =================== HOME THEATER TEMPLATES ===================
  {
    id: "home-theater",
    name: "Home Theater",
    description: "Complete home theater with acoustic treatment",
    icon: Tv,
    category: "Home Theater",
    sections: [
      {
        id: generateId(),
        title: "Seating & Screen",
        items: [
          createItem("Recliner Sofa Set", "Motorized recliners with cup holders (3-seater)", 9, 4, 1500),
          createItem("Screen Wall", "Acoustic wall with projector screen mount", 12, 8, 950),
          createItem("Riser Platform", "Elevated seating platform for rear row", 10, 4, 650),
        ],
      },
      {
        id: generateId(),
        title: "Equipment & Acoustics",
        items: [
          createItem("AV Cabinet", "Ventilated equipment cabinet", 4, 4, 850),
          createItem("Acoustic Panels", "Side wall acoustic treatment panels", 16, 6, 550),
          createItem("Ceiling Treatment", "Acoustic ceiling panels with star lights", 12, 10, 750),
          createItem("Soundproofing Door", "Acoustic door with seals", 3, 7, 1200),
        ],
      },
    ],
  },
  {
    id: "home-theater-compact",
    name: "Compact Media Room",
    description: "Small space theater setup",
    icon: Tv,
    category: "Home Theater",
    sections: [
      {
        id: generateId(),
        title: "Media Room",
        items: [
          createItem("Media Sofa", "Reclining sectional sofa", 7, 3.5, 1100),
          createItem("TV Wall Panel", "Soundbar integrated TV panel", 8, 6, 850),
          createItem("Equipment Rack", "Wall-mounted AV rack", 2, 4, 550),
          createItem("Ambient Lighting", "LED strip with dimmer control", 10, 0.5, 350),
        ],
      },
    ],
  },

  // =================== HOME GYM TEMPLATES ===================
  {
    id: "home-gym",
    name: "Home Gym",
    description: "Complete home fitness area",
    icon: Package,
    category: "Home Gym",
    sections: [
      {
        id: generateId(),
        title: "Flooring & Mirrors",
        items: [
          createItem("Rubber Flooring", "Interlocking rubber gym tiles", 12, 12, 350),
          createItem("Wall Mirrors", "Full wall gym mirrors", 12, 6, 650),
          createItem("Ballet Bar", "Wall-mounted exercise bar", 8, 0.5, 350),
        ],
      },
      {
        id: generateId(),
        title: "Storage & Equipment",
        items: [
          createItem("Weight Rack", "Dumbbell and plate storage", 4, 5, 550),
          createItem("Equipment Cabinet", "Yoga mats and accessory storage", 3, 6, 650),
          createItem("TV Mount", "Swivel TV mount for workouts", 2, 2, 350),
          createItem("Water Station", "Compact water cooler cabinet", 2, 3, 450),
        ],
      },
    ],
  },

  // =================== LIBRARY/READING ROOM TEMPLATES ===================
  {
    id: "home-library",
    name: "Home Library",
    description: "Traditional library with reading area",
    icon: BookOpen,
    category: "Library",
    sections: [
      {
        id: generateId(),
        title: "Book Storage",
        items: [
          createItem("Floor-to-Ceiling Bookcase", "Classic wooden bookcases with ladder", 16, 9, 1100),
          createItem("Rolling Ladder", "Library ladder with rail system", 1, 8, 850),
          createItem("Display Cabinet", "Glass-front rare book display", 4, 6, 950),
        ],
      },
      {
        id: generateId(),
        title: "Reading Area",
        items: [
          createItem("Reading Armchair", "Wing chair with ottoman (pair)", 3, 3.5, 750),
          createItem("Side Table", "Classic round side table", 2, 2.5, 450),
          createItem("Reading Lamp", "Adjustable floor lamp", 1, 5, 350),
          createItem("Library Desk", "Writing desk with leather top", 5, 3, 950),
        ],
      },
    ],
  },

  // =================== MUSIC ROOM TEMPLATES ===================
  {
    id: "music-room",
    name: "Music Room",
    description: "Practice room with acoustic treatment",
    icon: Package,
    category: "Music Room",
    sections: [
      {
        id: generateId(),
        title: "Acoustic Treatment",
        items: [
          createItem("Acoustic Panels", "Wall-mounted sound absorption panels", 20, 6, 550),
          createItem("Bass Traps", "Corner bass trap installation", 4, 6, 450),
          createItem("Floating Floor", "Decoupled floor system", 12, 10, 650),
          createItem("Acoustic Door", "Soundproof door with seals", 3, 7, 1100),
        ],
      },
      {
        id: generateId(),
        title: "Furniture",
        items: [
          createItem("Piano Platform", "Custom piano platform/stand", 6, 5, 750),
          createItem("Instrument Storage", "Guitar/instrument wall mounts", 6, 4, 550),
          createItem("Sheet Music Cabinet", "Music storage with organizers", 3, 5, 650),
          createItem("Recording Booth", "Portable vocal booth", 3, 4, 850),
        ],
      },
    ],
  },

  // =================== ART STUDIO TEMPLATES ===================
  {
    id: "art-studio",
    name: "Art Studio",
    description: "Creative workspace for artists",
    icon: Package,
    category: "Art Studio",
    sections: [
      {
        id: generateId(),
        title: "Work Area",
        items: [
          createItem("Art Table", "Adjustable tilting drafting table", 5, 4, 750),
          createItem("Easel Storage Wall", "Multiple easel display and storage", 8, 6, 650),
          createItem("Supply Cabinet", "Paint and material storage", 4, 6, 750),
          createItem("Sink Station", "Utility sink with splash back", 3, 3, 850),
        ],
      },
      {
        id: generateId(),
        title: "Display & Storage",
        items: [
          createItem("Canvas Rack", "Vertical canvas storage system", 6, 6, 550),
          createItem("Display Wall", "Gallery hanging system", 10, 6, 450),
          createItem("Tool Organizer", "Wall-mounted brush/tool storage", 4, 3, 350),
          createItem("Drying Rack", "Artwork drying station", 4, 6, 450),
        ],
      },
    ],
  },

  // =================== NURSERY TEMPLATES ===================
  {
    id: "nursery-room",
    name: "Baby Nursery",
    description: "Safe and cozy nursery setup",
    icon: Baby,
    category: "Nursery",
    sections: [
      {
        id: generateId(),
        title: "Sleep & Care",
        items: [
          createItem("Baby Crib", "Convertible crib with storage drawer", 4, 4.5, 850),
          createItem("Changing Station", "Wall-mounted changing table with storage", 3, 3.5, 750),
          createItem("Nursing Chair", "Glider rocking chair with ottoman", 2.5, 3.5, 650),
        ],
      },
      {
        id: generateId(),
        title: "Storage",
        items: [
          createItem("Wardrobe", "Baby clothes wardrobe with drawers", 4, 6, 850),
          createItem("Toy Storage", "Open cubby toy organizer", 4, 3, 550),
          createItem("Wall Shelf", "Decorative display shelves", 4, 1, 350),
          createItem("Diaper Caddy", "Wall-mounted diaper organization", 2, 2, 250),
        ],
      },
    ],
  },

  // =================== TEEN ROOM TEMPLATES ===================
  {
    id: "teen-bedroom",
    name: "Teen Bedroom",
    description: "Modern teen room with study and gaming",
    icon: Bed,
    category: "Teen Room",
    sections: [
      {
        id: generateId(),
        title: "Sleep & Lounge",
        items: [
          createItem("Loft Bed", "Elevated bed with desk underneath", 4, 8, 1100),
          createItem("Sofa Bed", "Convertible sofa for sleepovers", 6, 3, 750),
          createItem("Bean Bag Zone", "Large bean bags for gaming (3)", 4, 4, 400),
        ],
      },
      {
        id: generateId(),
        title: "Study & Gaming",
        items: [
          createItem("Gaming Desk", "L-shape desk with cable management", 5, 3, 850),
          createItem("Pegboard Wall", "Customizable organization wall", 6, 4, 450),
          createItem("Open Shelving", "Display shelves for collectibles", 6, 5, 550),
          createItem("Wardrobe", "Sliding door wardrobe", 6, 7, 950),
        ],
      },
    ],
  },

  // =================== SENIOR ROOM TEMPLATES ===================
  {
    id: "senior-bedroom",
    name: "Senior-Friendly Bedroom",
    description: "Accessible bedroom for elderly",
    icon: Bed,
    category: "Senior Room",
    sections: [
      {
        id: generateId(),
        title: "Accessible Furniture",
        items: [
          createItem("Adjustable Bed", "Electric adjustable bed with rails", 5.5, 6.5, 1400),
          createItem("Bedside Table", "Height-adjustable overbed table", 2, 2.5, 550),
          createItem("Grab Rails", "Wall-mounted support rails", 4, 0.5, 350),
        ],
      },
      {
        id: generateId(),
        title: "Storage & Comfort",
        items: [
          createItem("Low Wardrobe", "Easy-reach wardrobe with drawers", 6, 5, 850),
          createItem("Reading Chair", "Motorized lift recliner", 3, 3.5, 950),
          createItem("Medicine Cabinet", "Lockable medicine storage", 2, 3, 450),
          createItem("Emergency Panel", "Call button and light switch panel", 1, 1, 250),
        ],
      },
    ],
  },

  // =================== SERVANT QUARTER TEMPLATES ===================
  {
    id: "servant-room",
    name: "Staff Quarter",
    description: "Compact staff accommodation",
    icon: Bed,
    category: "Staff Quarter",
    sections: [
      {
        id: generateId(),
        title: "Basic Furniture",
        items: [
          createItem("Single Bed", "Steel bed with storage", 3.5, 6.5, 550),
          createItem("Wardrobe", "Compact 2-door wardrobe", 3, 6, 650),
          createItem("Study Table", "Simple desk with drawer", 3, 2, 450),
          createItem("Wall Shelf", "Storage shelf", 3, 1, 250),
        ],
      },
    ],
  },

  // =================== PET AREA TEMPLATES ===================
  {
    id: "pet-area",
    name: "Pet Corner",
    description: "Dedicated pet area with storage",
    icon: Home,
    category: "Pet Area",
    sections: [
      {
        id: generateId(),
        title: "Pet Furniture",
        items: [
          createItem("Built-in Pet House", "Integrated pet bed/house under stairs or niche", 3, 3, 650),
          createItem("Feeding Station", "Built-in food and water bowl station", 2, 1, 350),
          createItem("Pet Storage Cabinet", "Supplies and toy storage", 3, 4, 550),
          createItem("Cat Climbing Wall", "Wall-mounted cat shelves and perches", 4, 6, 450),
        ],
      },
    ],
  },

  // =================== COMMERCIAL - OFFICE TEMPLATES ===================
  {
    id: "office-reception",
    name: "Office Reception",
    description: "Professional reception area",
    icon: Layers,
    category: "Commercial Office",
    sections: [
      {
        id: generateId(),
        title: "Reception Desk",
        items: [
          createItem("Reception Counter", "Curved reception desk with storage", 8, 3.5, 1100),
          createItem("Back Panel", "Logo wall with lighting", 8, 6, 850),
          createItem("Waiting Sofa", "3+1+1 sofa set for visitors", 8, 4, 950),
          createItem("Coffee Table", "Center table with magazines", 4, 2.5, 450),
        ],
      },
      {
        id: generateId(),
        title: "Display & Storage",
        items: [
          createItem("Display Shelves", "Product/achievement display", 6, 5, 750),
          createItem("Coat Closet", "Visitor coat storage", 3, 6, 550),
          createItem("Planter Dividers", "Green dividers for waiting area", 6, 4, 450),
        ],
      },
    ],
  },
  {
    id: "office-cabin",
    name: "Executive Cabin",
    description: "Executive office cabin furniture",
    icon: Layers,
    category: "Commercial Office",
    sections: [
      {
        id: generateId(),
        title: "Desk Area",
        items: [
          createItem("Executive Desk", "L-shape executive desk with drawers", 7, 3.5, 1200),
          createItem("Executive Chair", "Leather executive chair", 2.5, 3.5, 850),
          createItem("Visitor Chairs", "Guest chairs (pair)", 2, 3, 550),
          createItem("Credenza", "Storage credenza behind desk", 6, 2.5, 750),
        ],
      },
      {
        id: generateId(),
        title: "Meeting & Storage",
        items: [
          createItem("Meeting Table", "4-seater round meeting table", 4, 4, 750),
          createItem("Bookcase", "Display bookcase with doors", 4, 6, 850),
          createItem("Sofa Set", "Small sofa for informal meetings", 5, 3, 750),
        ],
      },
    ],
  },
  {
    id: "conference-room",
    name: "Conference Room",
    description: "Meeting room setup",
    icon: Layers,
    category: "Commercial Office",
    sections: [
      {
        id: generateId(),
        title: "Conference Table",
        items: [
          createItem("Conference Table", "12-seater boardroom table with power", 12, 4.5, 1100),
          createItem("Conference Chairs (12)", "Ergonomic conference chairs", 1.5, 3, 550),
          createItem("Presentation Wall", "TV/projector wall with whiteboard", 10, 6, 850),
        ],
      },
      {
        id: generateId(),
        title: "Amenities",
        items: [
          createItem("Credenza", "Refreshment and storage credenza", 6, 2.5, 650),
          createItem("AV Cabinet", "Video conferencing equipment cabinet", 3, 4, 550),
          createItem("Acoustic Panels", "Wall acoustic treatment", 12, 6, 450),
        ],
      },
    ],
  },
  {
    id: "open-office",
    name: "Open Office Workstations",
    description: "Modular workstation system",
    icon: Layers,
    category: "Commercial Office",
    sections: [
      {
        id: generateId(),
        title: "Workstations (6 Cluster)",
        items: [
          createItem("Workstation Desks (6)", "Modular desks with partitions", 12, 6, 750),
          createItem("Task Chairs (6)", "Ergonomic office chairs", 1.5, 3, 450),
          createItem("Pedestals (6)", "Mobile storage pedestals", 1.5, 2, 350),
        ],
      },
      {
        id: generateId(),
        title: "Common Area",
        items: [
          createItem("Filing Cabinets", "Shared filing storage", 6, 4, 550),
          createItem("Printer Station", "Printer and supply station", 4, 3, 450),
          createItem("Locker Unit", "Personal locker storage", 6, 6, 650),
        ],
      },
    ],
  },

  // =================== COMMERCIAL - RETAIL TEMPLATES ===================
  {
    id: "retail-store",
    name: "Retail Store",
    description: "Retail shop interior",
    icon: Layers,
    category: "Commercial Retail",
    sections: [
      {
        id: generateId(),
        title: "Display & Shelving",
        items: [
          createItem("Wall Display Units", "Slatwall display system", 20, 8, 650),
          createItem("Gondola Shelving", "Center floor display units", 8, 5, 550),
          createItem("Display Tables", "Feature product tables", 4, 3, 450),
          createItem("Window Display", "Window showcase platform", 8, 4, 550),
        ],
      },
      {
        id: generateId(),
        title: "Checkout & Storage",
        items: [
          createItem("Checkout Counter", "POS counter with storage", 6, 3.5, 950),
          createItem("Back Storage", "Backroom storage shelving", 10, 8, 550),
          createItem("Security Cabinet", "Lockable valuable storage", 3, 5, 750),
        ],
      },
    ],
  },
  {
    id: "boutique-store",
    name: "Fashion Boutique",
    description: "Clothing store interior",
    icon: Shirt,
    category: "Commercial Retail",
    sections: [
      {
        id: generateId(),
        title: "Display",
        items: [
          createItem("Clothing Racks", "Display racks with shelves", 12, 5, 550),
          createItem("Mannequin Platforms", "Display pedestals", 4, 2, 350),
          createItem("Accessory Display", "Glass display cases", 6, 4, 750),
          createItem("Mirror Stations", "Full-length try-on mirrors", 6, 6, 550),
        ],
      },
      {
        id: generateId(),
        title: "Fitting & Checkout",
        items: [
          createItem("Fitting Rooms (3)", "Private changing rooms with seating", 4, 4, 850),
          createItem("Checkout Counter", "Boutique style checkout", 5, 3.5, 850),
          createItem("Seating Area", "Customer waiting sofa", 5, 3, 550),
        ],
      },
    ],
  },

  // =================== COMMERCIAL - RESTAURANT TEMPLATES ===================
  {
    id: "restaurant-dining",
    name: "Restaurant Dining Area",
    description: "Restaurant seating and display",
    icon: UtensilsCrossed,
    category: "Commercial Restaurant",
    sections: [
      {
        id: generateId(),
        title: "Seating",
        items: [
          createItem("Dining Tables (10)", "4-seater restaurant tables", 3, 3, 550),
          createItem("Dining Chairs (40)", "Restaurant chairs", 1.5, 3, 350),
          createItem("Booth Seating", "Upholstered booth seating for 12", 10, 4, 950),
          createItem("Bar Counter", "Bar area with stools", 8, 3.5, 1100),
        ],
      },
      {
        id: generateId(),
        title: "Service Area",
        items: [
          createItem("Service Station", "Waiter station with POS", 4, 3, 650),
          createItem("Display Counter", "Cake/dessert display", 4, 4, 850),
          createItem("Host Stand", "Entry host podium", 2, 3, 450),
        ],
      },
    ],
  },
  {
    id: "cafe-interior",
    name: "Café Interior",
    description: "Coffee shop furniture",
    icon: Coffee,
    category: "Commercial Restaurant",
    sections: [
      {
        id: generateId(),
        title: "Seating Mix",
        items: [
          createItem("Café Tables (8)", "2-seater round tables", 2.5, 2.5, 450),
          createItem("Chairs (16)", "Café chairs", 1.5, 3, 350),
          createItem("Sofa Seating", "Lounge sofa area", 8, 3, 750),
          createItem("Bar Stools (6)", "Counter seating", 1.5, 3, 350),
        ],
      },
      {
        id: generateId(),
        title: "Service",
        items: [
          createItem("Coffee Bar Counter", "Barista counter with display", 8, 3.5, 1100),
          createItem("Bakery Display", "Pastry display case", 4, 4, 850),
          createItem("Menu Board", "Wall-mounted menu display", 6, 4, 350),
        ],
      },
    ],
  },

  // =================== COMMERCIAL - SALON/SPA TEMPLATES ===================
  {
    id: "salon-interior",
    name: "Beauty Salon",
    description: "Hair and beauty salon setup",
    icon: Shirt,
    category: "Commercial Salon",
    sections: [
      {
        id: generateId(),
        title: "Styling Stations",
        items: [
          createItem("Styling Stations (6)", "Mirror units with storage", 2.5, 6, 850),
          createItem("Styling Chairs (6)", "Hydraulic salon chairs", 2, 3.5, 650),
          createItem("Wash Basins (3)", "Shampoo stations with chairs", 3, 4, 950),
        ],
      },
      {
        id: generateId(),
        title: "Support Areas",
        items: [
          createItem("Reception Desk", "Salon reception counter", 5, 3.5, 750),
          createItem("Waiting Area", "Waiting sofa and magazines", 6, 3, 550),
          createItem("Product Display", "Retail product shelves", 4, 6, 550),
          createItem("Storage Room", "Backroom storage cabinets", 6, 6, 650),
        ],
      },
    ],
  },
  {
    id: "spa-treatment",
    name: "Spa Treatment Room",
    description: "Wellness spa interior",
    icon: Bath,
    category: "Commercial Salon",
    sections: [
      {
        id: generateId(),
        title: "Treatment Area",
        items: [
          createItem("Massage Bed Cabinet", "Built-in treatment bed with storage", 6, 4, 950),
          createItem("Product Trolley", "Portable supply cart", 2, 3, 450),
          createItem("Ambient Lighting", "Dimmable mood lighting", 6, 6, 350),
          createItem("Water Feature", "Relaxation water element", 3, 4, 550),
        ],
      },
      {
        id: generateId(),
        title: "Support",
        items: [
          createItem("Robe Storage", "Guest robe and locker", 4, 5, 550),
          createItem("Relaxation Seating", "Post-treatment seating", 4, 3, 450),
          createItem("Tea Station", "Herbal tea service area", 3, 3, 350),
        ],
      },
    ],
  },

  // =================== COMMERCIAL - CLINIC TEMPLATES ===================
  {
    id: "clinic-reception",
    name: "Clinic Reception",
    description: "Medical clinic waiting area",
    icon: Layers,
    category: "Commercial Clinic",
    sections: [
      {
        id: generateId(),
        title: "Reception",
        items: [
          createItem("Reception Counter", "Medical reception desk", 8, 3.5, 950),
          createItem("Waiting Chairs (12)", "Comfortable waiting chairs", 1.5, 2.5, 350),
          createItem("Magazine Table", "Center tables for waiting", 3, 2, 350),
          createItem("Signage Panel", "Clinic branding wall", 6, 4, 450),
        ],
      },
      {
        id: generateId(),
        title: "Storage & Display",
        items: [
          createItem("Filing Cabinets", "Patient record storage", 6, 5, 650),
          createItem("Health Display", "Information display boards", 4, 5, 350),
          createItem("Hand Sanitizer Station", "Hygiene station", 1, 4, 250),
        ],
      },
    ],
  },
  {
    id: "doctor-cabin",
    name: "Doctor's Cabin",
    description: "Consultation room furniture",
    icon: Layers,
    category: "Commercial Clinic",
    sections: [
      {
        id: generateId(),
        title: "Consultation Area",
        items: [
          createItem("Doctor's Desk", "Medical consultation desk", 5, 3, 850),
          createItem("Doctor's Chair", "Ergonomic doctor chair", 2, 3, 550),
          createItem("Patient Chairs", "Visitor chairs (2)", 2, 2.5, 400),
          createItem("Examination Couch", "Medical examination bed cabinet", 6, 4, 750),
        ],
      },
      {
        id: generateId(),
        title: "Storage",
        items: [
          createItem("Medicine Cabinet", "Lockable medicine storage", 3, 5, 650),
          createItem("File Cabinet", "Patient file storage", 2, 4, 450),
          createItem("Wash Basin Unit", "Hand wash station", 2, 3, 550),
        ],
      },
    ],
  },

  // =================== COMMERCIAL - HOTEL TEMPLATES ===================
  {
    id: "hotel-room-standard",
    name: "Hotel Room - Standard",
    description: "Standard hotel room furniture",
    icon: Bed,
    category: "Commercial Hotel",
    sections: [
      {
        id: generateId(),
        title: "Sleep Area",
        items: [
          createItem("Hotel Bed", "King bed with headboard", 6.5, 6.5, 950),
          createItem("Side Tables", "Integrated bedside units", 1.5, 2, 450),
          createItem("Headboard Panel", "Full wall headboard with lighting", 8, 4, 650),
        ],
      },
      {
        id: generateId(),
        title: "Work & Storage",
        items: [
          createItem("Luggage Rack", "Folding luggage stand", 2.5, 2, 250),
          createItem("Work Desk", "Hotel desk with minibar", 4, 3, 650),
          createItem("Wardrobe", "Open closet with hangers", 4, 6, 750),
          createItem("TV Unit", "Wall-mounted TV panel", 5, 4, 550),
        ],
      },
    ],
  },
  {
    id: "hotel-room-suite",
    name: "Hotel Suite",
    description: "Luxury hotel suite furniture",
    icon: Bed,
    category: "Commercial Hotel",
    sections: [
      {
        id: generateId(),
        title: "Bedroom",
        items: [
          createItem("King Bed Premium", "Luxury upholstered bed", 7, 7, 1400),
          createItem("Headboard Feature", "Designer headboard wall", 10, 5, 950),
          createItem("Side Tables", "Premium bedside tables (pair)", 2, 2.5, 650),
          createItem("Bench", "End of bed upholstered bench", 5, 1.5, 450),
        ],
      },
      {
        id: generateId(),
        title: "Living Area",
        items: [
          createItem("Sofa Set", "Suite living room sofa", 7, 3, 950),
          createItem("Coffee Table", "Designer center table", 4, 2.5, 550),
          createItem("Dining Table", "In-room dining for 4", 4, 3.5, 650),
          createItem("Entertainment Unit", "Full wall TV and bar", 8, 6, 950),
        ],
      },
    ],
  },

  // =================== POOLSIDE TEMPLATES ===================
  {
    id: "poolside-furniture",
    name: "Poolside Furniture",
    description: "Pool area seating and storage",
    icon: Flower2,
    category: "Poolside",
    sections: [
      {
        id: generateId(),
        title: "Lounging",
        items: [
          createItem("Sun Loungers (4)", "Adjustable pool loungers", 2.5, 6.5, 650),
          createItem("Side Tables (4)", "Poolside drink tables", 1.5, 1.5, 250),
          createItem("Umbrellas (2)", "Large pool umbrellas", 8, 8, 450),
          createItem("Daybed", "Double daybed with canopy", 6, 6, 950),
        ],
      },
      {
        id: generateId(),
        title: "Support",
        items: [
          createItem("Pool Bar", "Outdoor bar counter", 6, 3.5, 1100),
          createItem("Towel Storage", "Outdoor towel cabinet", 3, 4, 450),
          createItem("Shower Area", "Outdoor shower enclosure", 3, 7, 650),
        ],
      },
    ],
  },

  // =================== GARDEN FURNITURE TEMPLATES ===================
  {
    id: "garden-seating",
    name: "Garden Seating",
    description: "Outdoor garden furniture",
    icon: Flower2,
    category: "Garden",
    sections: [
      {
        id: generateId(),
        title: "Seating Area",
        items: [
          createItem("Garden Bench Set", "Wooden garden benches (3)", 5, 2, 550),
          createItem("Swing Seat", "Garden swing with canopy", 5, 6, 750),
          createItem("Gazebo Seating", "Gazebo with built-in seating", 10, 10, 1200),
        ],
      },
      {
        id: generateId(),
        title: "Features",
        items: [
          createItem("Fountain/Water Feature", "Garden water feature", 4, 4, 850),
          createItem("Planter Walls", "Built-in garden planters", 10, 2, 450),
          createItem("Garden Storage", "Tool and cushion storage", 4, 5, 550),
          createItem("Pathway Lighting", "Garden path lights system", 20, 0.5, 350),
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
  "Teen Room": Bed,
  "Senior Room": Bed,
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
  "Home Theater": Tv,
  "Home Gym": Package,
  "Library": BookOpen,
  "Music Room": Package,
  "Art Studio": Package,
  "Nursery": Baby,
  "Staff Quarter": Bed,
  "Pet Area": Home,
  "Commercial Office": Layers,
  "Commercial Retail": Layers,
  "Commercial Restaurant": UtensilsCrossed,
  "Commercial Salon": Shirt,
  "Commercial Clinic": Layers,
  "Commercial Hotel": Bed,
  "Poolside": Flower2,
  "Garden": Flower2,
  "Custom": FileText,
  "My Templates": Star,
};

interface QuotationTemplatesProps {
  onSelectTemplate: (sections: Section[]) => void;
  currentSections?: Section[];
  onSetQuotationTitle?: (title: string) => void;
}

export const QuotationTemplates = ({ onSelectTemplate, currentSections, onSetQuotationTitle }: QuotationTemplatesProps) => {
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [userTemplates, setUserTemplates] = useState<QuotationTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateCategory, setNewTemplateCategory] = useState("Custom");
  const [activeTab, setActiveTab] = useState<"system" | "saved">("system");
  const [searchQuery, setSearchQuery] = useState("");

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
    
    // Auto-fill quotation title with template name
    if (onSetQuotationTitle) {
      onSetQuotationTitle(template.name);
    }
    
    setOpen(false);
    setSelectedCategory(null);
    setSearchQuery("");
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

  // Filter templates based on search query
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase();
    return QUOTATION_TEMPLATES.filter(
      template =>
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Filter user templates based on search
  const filteredUserTemplates = useMemo(() => {
    if (!searchQuery.trim()) return userTemplates;
    const query = searchQuery.toLowerCase();
    return userTemplates.filter(
      template =>
        template.name.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query)
    );
  }, [searchQuery, userTemplates]);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSelectedCategory(null); setSearchQuery(""); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Layers className="h-4 w-4" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[92vw] sm:max-w-md max-h-[75vh] p-0 overflow-hidden rounded-2xl">
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setSelectedCategory(null); setSearchQuery(""); }} className="flex flex-col h-full">
          {/* Header */}
          <div className="px-3 pt-3 pb-2 border-b bg-gradient-to-b from-muted/50 to-background">
            <div className="flex items-center gap-2 mb-2">
              {selectedCategory && activeTab === "system" && !searchQuery && (
                <button 
                  onClick={() => setSelectedCategory(null)} 
                  className="p-1.5 -ml-1 rounded-lg hover:bg-muted transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              <DialogTitle className="text-base font-semibold flex-1">
                {activeTab === "system" ? (selectedCategory || "Choose Category") : "My Templates"}
              </DialogTitle>
            </div>
            
            {/* Search Bar */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 h-9 text-sm rounded-xl bg-muted/50 border-0 focus-visible:ring-1"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>

            <TabsList className="grid w-full grid-cols-2 h-9">
              <TabsTrigger value="system" className="text-xs gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                System
              </TabsTrigger>
              <TabsTrigger value="saved" className="text-xs gap-1.5">
                <Star className="h-3.5 w-3.5" />
                Saved
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="system" className="mt-0 flex-1 overflow-hidden">
            <ScrollArea className="h-[45vh]">
              <div className="p-3">
                {/* Search Results */}
                {filteredTemplates ? (
                  filteredTemplates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Search className="h-10 w-10 text-muted-foreground/50 mb-3" />
                      <p className="text-sm font-medium">No templates found</p>
                      <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
                    </div>
                  ) : (
                    <div className="space-y-2 animate-fade-in">
                      {filteredTemplates.map((template, index) => {
                        const Icon = template.icon;
                        const totalItems = template.sections.reduce((acc, s) => acc + s.items.length, 0);
                        return (
                          <button
                            key={template.id}
                            className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-muted bg-card hover:border-primary hover:shadow-sm transition-all duration-200 active:scale-[0.98] text-left group"
                            onClick={() => handleSelectTemplate(template)}
                          >
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-semibold truncate group-hover:text-primary transition-colors">
                                {template.name}
                              </h4>
                              <p className="text-[10px] text-muted-foreground line-clamp-1">
                                {template.category} • {template.sections.length} sections
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  )
                ) : !selectedCategory ? (
                  /* STEP 1: Category Grid */
                  <div className="grid grid-cols-4 gap-2">
                    {categories.map((category, index) => {
                      const Icon = categoryIcons[category] || FileText;
                      const count = groupedTemplates[category]?.length || 0;
                      return (
                        <button
                          key={category}
                          onClick={() => setSelectedCategory(category)}
                          className="group flex flex-col items-center p-2 rounded-xl border border-transparent bg-muted/50 hover:bg-primary/5 hover:border-primary/30 transition-all duration-200 active:scale-95 animate-fade-in"
                          style={{ animationDelay: `${index * 20}ms` }}
                        >
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-[10px] font-medium text-center leading-tight line-clamp-2">
                            {category}
                          </span>
                          <span className="text-[9px] text-muted-foreground mt-0.5">
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* STEP 2: Template List */
                  <div className="space-y-2 animate-fade-in">
                    {groupedTemplates[selectedCategory]?.map((template, index) => {
                      const Icon = template.icon;
                      const totalItems = template.sections.reduce((acc, s) => acc + s.items.length, 0);
                      return (
                        <button
                          key={template.id}
                          className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-muted bg-card hover:border-primary hover:shadow-sm transition-all duration-200 active:scale-[0.98] text-left group"
                          onClick={() => handleSelectTemplate(template)}
                          style={{ animationDelay: `${index * 30}ms` }}
                        >
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-semibold truncate group-hover:text-primary transition-colors">
                              {template.name}
                            </h4>
                            <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                              {template.description}
                            </p>
                            <div className="flex items-center gap-1 mt-1.5">
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                {template.sections.length} sections
                              </span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                                {totalItems} items
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="saved" className="mt-0 flex-1 overflow-hidden">
            <ScrollArea className="h-[45vh]">
              <div className="p-3">
                {/* Save Current Template */}
                {currentSections && currentSections.length > 0 && !searchQuery && (
                  <div className="mb-3">
                    {showSaveDialog ? (
                      <Card className="border border-primary/30 bg-primary/5 animate-fade-in rounded-xl">
                        <CardContent className="p-3 space-y-3">
                          <div>
                            <Label className="text-xs font-medium">Template Name</Label>
                            <Input
                              value={newTemplateName}
                              onChange={(e) => setNewTemplateName(e.target.value)}
                              placeholder="e.g., My Kitchen Template"
                              className="mt-1.5 h-9 text-sm rounded-lg"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium">Category</Label>
                            <select
                              value={newTemplateCategory}
                              onChange={(e) => setNewTemplateCategory(e.target.value)}
                              className="w-full mt-1.5 h-9 rounded-lg border border-input bg-background px-3 text-sm"
                            >
                              {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleSaveAsTemplate} className="flex-1 h-9 text-xs">
                              <Save className="h-3.5 w-3.5 mr-1.5" />
                              Save
                            </Button>
                            <Button variant="outline" onClick={() => setShowSaveDialog(false)} className="h-9 px-4 text-xs">
                              Cancel
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <button
                        className="w-full flex items-center justify-center gap-1.5 p-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 hover:border-primary hover:bg-primary/10 transition-all text-primary text-xs font-medium"
                        onClick={() => setShowSaveDialog(true)}
                      >
                        <Plus className="h-4 w-4" />
                        Save Current Quotation
                      </button>
                    )}
                  </div>
                )}

                {/* User Templates List */}
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mb-3" />
                    <p className="text-xs text-muted-foreground">Loading...</p>
                  </div>
                ) : filteredUserTemplates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mb-3">
                      <Star className="h-7 w-7 text-amber-500" />
                    </div>
                    <p className="text-sm font-semibold">{searchQuery ? "No matches" : "No Saved Templates"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {searchQuery ? "Try a different search" : "Save a quotation for reuse"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredUserTemplates.map((template, index) => {
                      const totalItems = template.sections.reduce((acc, s) => acc + s.items.length, 0);
                      return (
                        <button
                          key={template.id}
                          className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-muted bg-card hover:border-amber-500 hover:shadow-sm transition-all duration-200 active:scale-[0.98] text-left group relative"
                          onClick={() => handleSelectTemplate(template)}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(template.id);
                            }}
                            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-destructive/10 hover:bg-destructive text-destructive hover:text-white opacity-0 group-hover:opacity-100 transition-all z-10"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/15 to-amber-500/5 flex items-center justify-center flex-shrink-0">
                            <Star className="h-5 w-5 text-amber-500" />
                          </div>
                          <div className="flex-1 min-w-0 pr-6">
                            <h4 className="text-xs font-semibold truncate">
                              {template.name}
                            </h4>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {template.category}
                            </p>
                            <div className="flex items-center gap-1 mt-1.5">
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium">
                                {template.sections.length} sections
                              </span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                                {totalItems} items
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </button>
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
