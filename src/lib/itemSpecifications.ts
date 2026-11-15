import { z } from 'zod';
/** Canonical structured values, with a readable legacy adapter for old drafts/templates. */
export type ItemSpecification = { label: string; value: string };
const heading = 'Specifications:\n';
export function splitItemDetails(value: string) {
  const marker = '\n\n' + heading;
  const start = value.lastIndexOf(marker);
  const offset = start >= 0 ? start + marker.length : value.startsWith(heading) ? heading.length : -1;
  if (offset < 0) return { description: value, specifications: [] as ItemSpecification[] };
  const lines = value.slice(offset).split('\n');
  const specifications: ItemSpecification[] = [];
  for (const line of lines) {
    const match = /^([^:\r\n]{1,40}): (.+)$/.exec(line);
    if (!match || !match[1].trim() || !match[2].trim()) return { description: value, specifications: [] as ItemSpecification[] };
    specifications.push({ label: match[1].trim(), value: match[2].trim() });
  }
  if (specifications.length > 20 || specifications.some(row => row.value.length > 160) || new Set(specifications.map(row => row.label.toLowerCase())).size !== specifications.length) return { description: value, specifications: [] as ItemSpecification[] };
  return { description: start >= 0 ? value.slice(0, start) : '', specifications };
}
export function combineItemDetails(description: string, specifications: ItemSpecification[]) {
  const rows = specifications.filter(row => row.label.trim() && row.value.trim());
  if (!rows.length) return description;
  return (description.trimEnd() ? description.trimEnd() + '\n\n' : '') + heading + rows.map(row => `${row.label.trim()}: ${row.value.trim()}`).join('\n');
}
export const specificationAttributes: Record<string, string[]> = {
  "Material": ["BWP Plywood","BWR Plywood","Commercial Plywood","Marine Plywood","MDF","HDHMR","HDF","Particle Board","Block Board","Solid Wood","Rubber Wood","Teak Wood","WPC Board","PVC Foam Board","Gypsum Board","Calcium Silicate Board","Cement Board","Aluminium","Mild Steel","Stainless Steel","Toughened Glass","Fluted Glass","Mirror","Granite","Quartz","Marble","Solid Surface","Vitrified Tile","Ceramic Tile","SPC Flooring","Engineered Wood","Natural Veneer","Fabric","Leatherette"],
  "Brand": ["Century","Greenply","Kitply","Archidply","Duro","Action TESA","Greenpanel","Merino","Greenlam","Royale Touche","AICA Sunmica","CenturyLaminates","Hettich","Hafele","Blum","Ebco","Godrej","Ozone","Dorset","Asian Paints","Berger","Dulux","Nerolac","Indigo Paints","Gyproc","Saint-Gobain","Armstrong","Knauf","Kajaria","Somany","Johnson","Nitco","RAK Ceramics","AGL","Jaquar","Cera","Hindware","Kohler","Grohe","TOTO","Havells","Legrand","Schneider Electric","Anchor by Panasonic","GM","Polycab","Finolex","KEI","Philips","Wipro","Crompton","Faber","Elica","Bosch","Franke","Nirali","Fevicol","Pidilite","Dr. Fixit","MYK LATICRETE","Fosroc","Sika"],
  "Finish": ["Laminate","Acrylic","Veneer","PU Paint","Duco","Membrane","PET Finish","Polyester Finish","Melamine Polish","French Polish","Natural Oil Finish","Matte","Super Matte","High Gloss","Satin","Semi Gloss","Textured","Wood Grain","Fluted","Brushed","Polished","Honed","Leather Finish","Powder Coated","Anodised","Chrome","Brushed Nickel","Brass","Rose Gold","Matte Black","PVD Coated"],
  "Hardware": ["Hettich","Hafele","Blum","Ebco","Soft-close Hinges","Standard Hinges","Hydraulic Hinges","Concealed Hinges","165-degree Hinges","Soft-close Drawer Channels","Telescopic Drawer Channels","Concealed Drawer Runners","Tandem Drawer System","Slim Box Drawer System","Push-to-open Mechanism","Sliding Door System","Wardrobe Sliding System","Lift-up Mechanism","Gas Lift","Bi-fold Mechanism","Pocket Door System","Magnetic Catch","Cabinet Lock","Digital Lock","Tower Bolt","Shelf Support","Wardrobe Lift","Trouser Pull-out","Cutlery Tray","Bottle Pull-out","Corner Carousel","Magic Corner","Pantry Pull-out","Wicker Basket","Waste Bin Pull-out","Drawer Organiser"],
  "Colour / Code": ["White","Ivory","Off White","Beige","Cream","Light Grey","Charcoal Grey","Black","Walnut","Natural Oak","Teak","Wenge","Sage Green","Olive Green","Navy Blue","Terracotta","Champagne","Brass","Custom shade / code"],
  "Product": ["Royale","Royale Aspira","Royale Shyne","Apcolite","Tractor Emulsion","Weathercoat","Silk","Velvet Touch","Beauty","Excel","Dr. Fixit"],
  "Model": [],
  "Thickness": ["0.8 mm","1 mm","1.5 mm","2 mm","3 mm","4 mm","6 mm","8 mm","9 mm","10 mm","12 mm","15 mm","16 mm","18 mm","19 mm","20 mm","25 mm","30 mm","35 mm","40 mm"],
  "Grade": ["BWP","BWR","MR","Exterior Grade","Interior Grade","Moisture Resistant","Fire Retardant","E0","E1","SS 304","SS 316"],
  "Carcass Material": ["BWP Plywood","BWR Plywood","Commercial Plywood","HDHMR","MDF","Particle Board","WPC Board","PVC Foam Board","Stainless Steel","Aluminium"],
  "Shutter Material": ["BWP Plywood","BWR Plywood","HDHMR","MDF","Solid Wood","Aluminium Frame with Glass","Profile Shutter","Toughened Glass","Fluted Glass","WPC Board"],
  "Edge Banding": ["0.8 mm PVC","1 mm PVC","2 mm PVC","ABS Edge Band","Acrylic Edge Band","Veneer Edge Band","Solid Wood Lipping","Laser Edge Band"],
  "Handle Type": ["External Handle","Knob","Profile Handle","Gola Profile","J Profile","Edge Profile","Recessed Handle","Handleless","Push-to-open"],
  "Glass Type": ["Clear Glass","Toughened Glass","Laminated Glass","Frosted Glass","Fluted Glass","Tinted Glass","Back-painted Glass","Reeded Glass","Bevelled Mirror","Plain Mirror"],
  "Countertop Material": ["Granite","Quartz","Marble","Solid Surface","Sintered Stone","Porcelain Slab","Stainless Steel"],
  "Tile Size": ["300 x 300 mm","300 x 450 mm","300 x 600 mm","600 x 600 mm","600 x 1200 mm","800 x 800 mm","800 x 1600 mm","1200 x 1800 mm","1200 x 2400 mm"],
  "Laying Pattern": ["Straight Lay","Staggered","Brick Bond","Diagonal","Herringbone","Chevron","Book Match"],
  "Paint Type": ["Acrylic Emulsion","Premium Emulsion","Luxury Emulsion","Distemper","Enamel","Texture Paint","Exterior Emulsion","PU Paint","Epoxy Paint","Wood Stain"],
  "Surface Preparation": ["Sanding","Primer","Wall Putty","Crack Filling","Waterproofing","Old Paint Removal","Anti-rust Primer","Wood Filler"],
  "Coats": ["1 Coat","2 Coats","3 Coats","1 Primer + 2 Finish Coats","2 Putty + 1 Primer + 2 Finish Coats"],
  "Ceiling Type": ["Gypsum Board","POP","Calcium Silicate Board","Grid Ceiling","Wooden Ceiling","Metal Ceiling","PVC Ceiling","Stretch Ceiling"],
  "Light Type": ["Recessed Downlight","Surface Downlight","COB Spotlight","LED Strip","LED Profile","Track Light","Magnetic Track Light","Panel Light","Pendant Light","Chandelier","Wall Light","Cove Light","Under-cabinet Light"],
  "Colour Temperature": ["2700 K Warm White","3000 K Warm White","4000 K Neutral White","6500 K Cool White","Tunable White","RGB","RGBW"],
  "Wattage": ["3 W","5 W","7 W","9 W","12 W","15 W","18 W","20 W","24 W","30 W","36 W","40 W","48 W","12 W/m","18 W/m"],
  "Switch / Socket Type": ["Modular Switch","Two-way Switch","Bell Push","Dimmer","Fan Regulator","6 A Socket","16 A Socket","Universal Socket","USB Charging Socket","Data Socket","TV Socket","Smart Switch"],
  "Wire Size": ["1 sq.mm","1.5 sq.mm","2.5 sq.mm","4 sq.mm","6 sq.mm","10 sq.mm","16 sq.mm"],
  "Pipe Material": ["CPVC","UPVC","PVC","PPR","GI","Copper","Stainless Steel"],
  "Fabric Type": ["Cotton","Linen","Polyester","Velvet","Jacquard","Sheer","Blackout Fabric","Leatherette","Genuine Leather","Suede"],
  "Mounting": ["Wall Mounted","Floor Mounted","Ceiling Mounted","Recessed","Surface Mounted","Freestanding","Concealed"],
  "Warranty": ["1 year","2 years","3 years","5 years","7 years","10 years","As per manufacturer"],
};

export const itemSpecificationsSchema = z.array(z.object({
  label: z.string().trim().min(1).max(40).regex(/^[^:\r\n]+$/),
  value: z.string().trim().min(1).max(160).regex(/^[^\r\n]+$/),
}).strict()).max(20).superRefine((rows, context) => {
  const labels = rows.map(row => row.label.toLowerCase());
  if (new Set(labels).size !== labels.length) context.addIssue({ code: 'custom', message: 'Specification names must be unique.' });
});
export function normalizeItemDetails(description: string | null | undefined, specifications?: unknown) {
  const legacy = splitItemDetails(description ?? '');
  return { description: legacy.description, specifications: specifications == null ? legacy.specifications : itemSpecificationsSchema.parse(specifications) as ItemSpecification[] };
}
export function formatItemDetails(description: string | null | undefined, specifications?: unknown) {
  const normalized = normalizeItemDetails(description, specifications);
  return combineItemDetails(normalized.description, normalized.specifications);
}
