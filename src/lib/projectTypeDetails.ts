export const homeSizes = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5 BHK', '6 BHK', 'Other', 'Studio'];
export const floorOptions = ['Ground Floor', 'G+1', 'G+2', 'G+3', 'G+4', 'G+5', 'Other'];
export function displayProjectTypeDetails(value: string) {
  return value.replace(/\| Floors:\s*/gi, '| ')
    .replace(/\| Homes:\s*(.+)$/i, (_match, homes: string) => {
      const labels: Record<string, string> = { 'Ground Floor': 'G', 'First Floor': '1F', 'Second Floor': '2F', 'Third Floor': '3F', 'Fourth Floor': '4F', 'Fifth Floor': '5F' };
      return `| ${homes.split('; ').map(entry => {
        const [floor, size] = entry.split('=');
        return size && labels[floor] ? `${labels[floor]} ${size === 'Part of same home' ? 'Part of home' : size}` : entry;
      }).join(', ')}`;
    });
}
export const floorHomeOptions = [...homeSizes.slice(0, -1), 'Studio', 'Part of home', 'Parking / No residence'];
export function projectFloorNames(floors: string) {
  const count = floors === 'Ground Floor' ? 1 : /^G\+[1-5]$/.test(floors) ? Number(floors.slice(2)) + 1 : 0;
  return ['Ground Floor', 'First Floor', 'Second Floor', 'Third Floor', 'Fourth Floor', 'Fifth Floor'].slice(0, count);
}
export type ProjectTypeDetails = { type: string; size: string; floors: string; floorSizes?: Record<string, string> };

// Preserve optional details through existing quotation saving and PDF paths.
export function parseProjectTypeDetails(value: string): ProjectTypeDetails {
  const homes = value.match(/\s*\| Homes: (.+)$/);
  if (homes) value = value.slice(0, homes.index).trim();
  const floorMatch = value.match(/\s*\| Floors: (Ground Floor|G\+[1-5]|Other)$/i);
  const base = floorMatch ? value.slice(0, floorMatch.index).trim() : value.trim();
  const residential = base.match(/^Residential(?:\s*[-–—·]\s*(Studio|[1-6] BHK|Other))?$/i);
  const floorSizes = Object.fromEntries((homes?.[1].split('; ') ?? []).flatMap(entry => {
    const [floor, storedSize] = entry.split('=');
    const size = storedSize === 'Part of same home' ? 'Part of home' : storedSize;
    return projectFloorNames(floorMatch?.[1] ?? '').includes(floor) && floorHomeOptions.includes(size) ? [[floor, size]] : [];
  }));
  return {
    type: residential ? 'Residential' : base,
    size: homeSizes.find(size => size.toLowerCase() === residential?.[1]?.toLowerCase()) ?? '',
    floors: floorOptions.find(floor => floor.toLowerCase() === floorMatch?.[1]?.toLowerCase()) ?? '',
    ...(Object.keys(floorSizes).length ? { floorSizes } : {}),
  };
}

export function formatProjectTypeDetails({ type, size, floors, floorSizes }: ProjectTypeDetails) {
  const residential = type.toLowerCase() === 'residential';
  const homes = residential ? projectFloorNames(floors).filter(floor => floorSizes?.[floor] && floorHomeOptions.includes(floorSizes[floor])).map(floor => `${floor}=${floorSizes![floor]}`) : [];
  return `${type}${residential && size && !homes.length ? ` - ${size}` : ''}${floors ? ` | Floors: ${floors}` : ''}${homes.length ? ` | Homes: ${homes.join('; ')}` : ''}`;
}
