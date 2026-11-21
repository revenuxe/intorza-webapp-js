import { parseProjectTypeDetails, projectFloorNames } from './projectTypeDetails';

export const quotationFloorNames = projectFloorNames('G+5');

// Floor-qualified room titles travel through the established section save,
// version, copy and PDF contracts without requiring a database rollout.
export function splitFloorRoomTitle(title: string) {
  const match = title.match(/^(Ground Floor|First Floor|Second Floor|Third Floor|Fourth Floor|Fifth Floor) — ([\s\S]*)$/);
  return match ? { floor: match[1], room: match[2] } : { floor: '', room: title };
}
export function floorRoomTitle(floor: string, room: string) {
  return floor ? `${floor} — ${room}` : room;
}
export function groupFloorSections<T extends { title: string }>(sections: T[], projectType: string): T[] {
  const available = projectFloorNames(parseProjectTypeDetails(projectType).floors);
  return sections.map(section => {
    const { floor, room } = splitFloorRoomTitle(section.title);
    return { ...section, title: floorRoomTitle(floor || available[0] || '', room) };
  }).sort((a, b) => {
    const first = splitFloorRoomTitle(a.title).floor, second = splitFloorRoomTitle(b.title).floor;
    return (first ? quotationFloorNames.indexOf(first) : -1) - (second ? quotationFloorNames.indexOf(second) : -1);
  });
}
export function nextQuotationFloor(sections: { title: string }[], projectType: string) {
  const used = new Set(sections.map(section => splitFloorRoomTitle(section.title).floor));
  return projectFloorNames(parseProjectTypeDetails(projectType).floors).find(floor => !used.has(floor));
}
