/** Essential starting items per room; additional items can be entered manually. */
export const ROOM_SUGGESTIONS: Record<string, string[]> = Object.fromEntries([
  ['Foyer / Entrance', 'Shoe Rack, Console Unit, Mirror'],
  ['Living Room', 'TV Unit, TV Back Panel, Display Unit, False Ceiling'],
  ['Dining Area', 'Crockery Unit, Dining Storage, Mirror Panel'],
  ['Master Bedroom', 'Wardrobe, Loft, Bed, Headboard, Bedside Table, Dresser'],
  ['Bedroom', 'Wardrobe, Loft, Bed, Bedside Table, Study Table'],
  ['Kids Bedroom', 'Wardrobe, Kids Bed, Study Table, Bookshelf, Toy Storage'],
  ['Guest Bedroom', 'Wardrobe, Bed, Bedside Table'],
  ['Parents Bedroom', 'Wardrobe, Bed, Bedside Table, Dresser'],
  ['Kitchen', 'Base Unit, Wall Unit, Tall Unit, Loft, Countertop, Backsplash'],
  ['Utility Area', 'Base Unit, Wall Unit, Washing Machine Unit, Sink Unit'],
  ['Puja Room', 'Puja Unit, Base Storage, Back Panel'],
  ['Study / Home Office', 'Study Table, Bookshelf, Drawer Unit, Overhead Storage'],
  ['Bathroom', 'Vanity Unit, Mirror Cabinet, Shower Partition'],
  ['Balcony', 'Bench with Storage, Planter Unit, Wall Shelf'],
  ['Passage / Corridor', 'Console Unit, Mirror Panel'],
  ['Walk-in Wardrobe', 'Hanging Unit, Drawer Unit, Shelf Unit, Shoe Rack, Dresser, Mirror'],
  ['Home Bar', 'Bar Counter, Back Bar Unit, Bottle Storage, Glass Holder'],
  ['Entertainment / TV Room', 'TV Unit, TV Back Panel, Media Storage, Acoustic Panel'],
  ['Laundry Area', 'Washing Machine Unit, Overhead Storage, Countertop, Sink Unit'],
  ['Store Room', 'Storage Cabinet, Open Shelving, Loft'],
  ['Servant / Staff Room', 'Wardrobe, Bed, Wall Storage'],
  ['Terrace', 'Outdoor Seating, Planter Unit, Pergola, Outdoor Storage'],
].map(([room, items]) => [room, items.split(', ')]));

export function getRoomSuggestions(title: string): string[] {
  const room = Object.keys(ROOM_SUGGESTIONS).find(name => name.toLowerCase() === title.trim().toLowerCase());
  return room ? ROOM_SUGGESTIONS[room] : [];
}
