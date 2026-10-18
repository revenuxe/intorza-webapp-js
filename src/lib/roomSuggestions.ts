/** Room and item names supplied for the manual quotation builder. */
export const ROOM_SUGGESTIONS: Record<string, string[]> = Object.fromEntries([
  ['Foyer / Entrance', 'Shoe Rack, Shoe Rack with Seating, Console Unit, Foyer Storage, Mirror, Decorative Partition, Wall Panel, Key Holder Unit, Bench, False Ceiling'],
  ['Living Room', 'TV Unit, TV Back Panel, TV Storage, Display Unit, Crockery Unit, Bookshelf, Partition, Wall Panel, Decorative Shelves, Console Unit, Seating Unit, False Ceiling, Bar Unit'],
  ['Dining Area', 'Crockery Unit, Crockery Unit with Glass Shutters, Dining Storage, Bar Unit, Display Unit, Console Unit, Wall Panel, Mirror Panel, Partition, Bench Seating, False Ceiling'],
  ['Master Bedroom', 'Wardrobe, Sliding Wardrobe, Wardrobe with Loft, Loft, Bed, Storage Bed, Headboard, Bedside Table, Dresser, Dresser with Mirror, Study Table, Study Unit, TV Unit, Bookshelf, Wall Panel, Window Seating, Storage Unit, False Ceiling'],
  ['Bedroom', 'Wardrobe, Sliding Wardrobe, Loft, Bed, Storage Bed, Headboard, Bedside Table, Dresser, Study Table, Study Unit, TV Unit, Bookshelf, Wall Panel, Storage Unit, False Ceiling'],
  ['Kids Bedroom', 'Wardrobe, Loft, Kids Bed, Bunk Bed, Headboard, Bedside Table, Study Table, Study Unit, Bookshelf, Toy Storage, Display Shelves, Window Seating, Wall Panel, Storage Unit, False Ceiling'],
  ['Guest Bedroom', 'Wardrobe, Loft, Bed, Storage Bed, Headboard, Bedside Table, Dresser, Study Table, TV Unit, Wall Panel, Storage Unit, False Ceiling'],
  ['Parents Bedroom', 'Wardrobe, Loft, Bed, Storage Bed, Headboard, Bedside Table, Dresser, TV Unit, Storage Unit, Wall Panel, False Ceiling'],
  ['Kitchen', 'Base Unit, Wall Unit, Tall Unit, Loft, Sink Unit, Hob Unit, Drawer Unit, Tandem Drawer Unit, Cutlery Unit, Bottle Pull-Out, Pantry Unit, Corner Unit, Crockery Unit, Appliance Unit, Microwave Unit, Oven Unit, Refrigerator Unit, Breakfast Counter, Countertop, Backsplash, Open Shelf'],
  ['Utility Area', 'Base Unit, Wall Unit, Overhead Storage, Tall Storage, Washing Machine Unit, Sink Unit, Utility Counter, Cleaning Storage, Open Shelves, Drying Unit'],
  ['Puja Room', 'Puja Unit, Mandir Unit, Base Storage, Drawer Storage, Back Panel, Jaali Panel, Puja Door, Display Shelf, Bell Panel, False Ceiling'],
  ['Study / Home Office', 'Study Table, Work Desk, Overhead Storage, Bookshelf, Filing Unit, Drawer Unit, Display Shelf, Wall Storage, Printer Unit, Wall Panel, False Ceiling'],
  ['Bathroom', 'Vanity Unit, Under-Sink Storage, Mirror Cabinet, Mirror, Tall Storage, Wall Shelf, Shower Partition, Niche Storage, Countertop'],
  ['Balcony', 'Seating Unit, Bench with Storage, Outdoor Storage, Planter Unit, Wall Shelf, Bar Counter, Deck Flooring, Wall Panel, Pergola'],
  ['Passage / Corridor', 'Console Unit, Storage Unit, Display Shelf, Wall Panel, Mirror Panel, False Ceiling'],
  ['Walk-in Wardrobe', 'Hanging Unit, Long Hanging Unit, Short Hanging Unit, Drawer Unit, Shelf Unit, Shoe Rack, Accessories Unit, Glass Wardrobe, Dresser, Mirror, Island Storage, Loft'],
  ['Home Bar', 'Bar Counter, Back Bar Unit, Bottle Storage, Glass Holder, Display Unit, Base Storage, Wall Storage, Wine Rack, Back Panel, Lighting Shelf'],
  ['Entertainment / TV Room', 'TV Unit, TV Back Panel, Media Storage, Display Unit, Bookshelf, Wall Panel, Acoustic Panel, Console Unit, False Ceiling'],
  ['Laundry Area', 'Washing Machine Unit, Dryer Unit, Base Storage, Overhead Storage, Tall Storage, Laundry Basket Unit, Countertop, Sink Unit, Open Shelves'],
  ['Store Room', 'Storage Cabinet, Tall Storage, Wall Shelves, Open Shelving, Loft, Utility Rack'],
  ['Servant / Staff Room', 'Wardrobe, Loft, Bed, Storage Bed, Wall Storage, Study Table'],
  ['Terrace', 'Outdoor Seating, Bench, Storage Bench, Bar Counter, Planter Unit, Pergola, Deck Flooring, Outdoor Storage'],
].map(([room, items]) => [room, items.split(', ')]));

export function getRoomSuggestions(title: string): string[] {
  const room = Object.keys(ROOM_SUGGESTIONS).find(name => name.toLowerCase() === title.trim().toLowerCase());
  return room ? ROOM_SUGGESTIONS[room] : [];
}
