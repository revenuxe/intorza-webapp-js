import { z } from 'zod';
import { normalizeReferenceText, referenceProduct } from './reference-pricing';
import type { PlanAnalysis, ProjectBrief, generatedSchema } from './floor-plan';
import { excludedWork, exclusionsForBrief } from './requirements';

const size = z.number().finite().positive().max(100000).nullable();
export const roomWorkSchema = z.object({
  roomName: z.string().trim().min(1).max(150),
  notes: z.string().trim().max(1000),
  decisions: z.record(z.boolean()).optional(),
  items: z.array(z.object({
    key: z.string().min(1).max(50), widthFt: size, heightFt: size,
    areaSqft: size, details: z.string().trim().max(600),
  }).strict()).min(1).max(20),
}).strict();
export type RoomWork = z.infer<typeof roomWorkSchema>;
type Room = PlanAnalysis['rooms'][number];
type WorkOption = { key: string; name: string; hint: string; default: boolean; unit: 'sqft' | 'piece' | 'lump_sum'; surface?: boolean };
const option = (key: string, name: string, hint: string, selected = false, surface = false, unit: WorkOption['unit'] = 'sqft'): WorkOption => ({ key, name, hint, default: selected, surface, unit });

/** Ask only about work applicable to this detected room and chosen scope. */
export function roomWorkOptions(room: Room, scope: ProjectBrief['scope']): WorkOption[] {
  const ceiling = option('ceiling', 'False ceiling', 'Use the ceiling coverage area; confirm cutouts and design.', true, true);
  const painting = option('painting', 'Wall painting', 'Enter the net wall area after openings, not the floor area.', true);
  const loft = option('loft', 'Loft storage', 'Measure the loft front separately from the wardrobe.', false);
  let options: WorkOption[];
  switch (room.kind) {
    case 'kitchen': options = [
      option('base_cabinets', 'Kitchen base cabinets', 'Total cabinet front length × front height; exclude appliance gaps.', true),
      option('wall_cabinets', 'Kitchen wall cabinets', 'Total wall-cabinet front length × height, excluding windows and chimney.', true),
      option('countertop', 'Kitchen countertop', 'Countertop length × depth; confirm sink and hob cutouts.', true),
      option('backsplash', 'Kitchen backsplash', 'Wall length × backsplash height; deduct openings.', true),
      option('tall_cabinets', 'Kitchen tall unit', 'Confirm the tall-unit location and front width × height.'), loft, ceiling, painting,
      option('plumbing', 'Kitchen plumbing', 'Confirm sink relocation and plumbing changes; priced separately.', false, false, 'lump_sum'),
    ]; break;
    case 'bedroom': options = [option('wardrobe', 'Wardrobe', 'Confirm the wardrobe wall, shutter style, front width × height and depth.', true), loft,
      option('bed_back', 'Bed back panelling', 'Confirm bed position and panel width × height.'),
      option('study_storage', 'Study storage', 'Confirm desk/storage location and cabinet front dimensions.'), ceiling, painting]; break;
    case 'living': options = [option('tv_unit', 'TV unit', 'Confirm the TV wall, cabinet fronts and back-panel dimensions.', true),
      option('wall_panelling', 'Wall panelling', 'Confirm the feature wall and panel width × height.'),
      option('shoe_storage', 'Shoe storage', 'Confirm entrance position and cabinet front width × height.'),
      option('pooja_unit', 'Pooja unit', 'Confirm location and front dimensions.'), ceiling, painting]; break;
    case 'bathroom': options = [option('vanity', 'Vanity cabinet', 'Confirm the basin wall and cabinet front dimensions.', true),
      option('mirror', 'Bathroom mirror', 'Mirror width × height.', true),
      option('tile_work', 'Bathroom wall tiles', 'Confirm whether existing tiles stay; measure only replacement wall coverage.'),
      option('plumbing', 'Bathroom plumbing', 'Confirm fixture or plumbing relocations; priced separately.', false, false, 'lump_sum')]; break;
    case 'study': options = [option('study_storage', 'Study storage', 'Confirm workstation wall and cabinet front dimensions.', true),
      option('bookshelf', 'Bookshelf', 'Confirm shelf location and front width × height.'), ceiling, painting]; break;
    case 'utility': options = [option('utility_storage', 'Utility storage', 'Confirm appliance clearances and cabinet front dimensions.', true),
      option('backsplash', 'Utility backsplash', 'Confirm the wet wall and tile coverage.'), painting]; break;
    case 'dining': options = [option('crockery_unit', 'Crockery unit', 'Confirm the crockery wall and front dimensions.', true),
      option('partition', 'Dining partition', 'Confirm placement and width × height.'), ceiling, painting]; break;
    case 'balcony': options = [option('utility_storage', 'Balcony storage', 'Confirm weather exposure and storage front dimensions.'), painting]; break;
    default: options = [option('storage', 'Room storage', 'Describe the intended storage and its front dimensions.', true), ceiling, painting];
  }
  if (scope === 'modular') return options.filter(item => !['ceiling','painting','plumbing','tile_work','mirror'].includes(item.key));
  if (scope === 'kitchen-wardrobes') return room.kind === 'bedroom'
    ? options.filter(item => ['wardrobe','loft'].includes(item.key))
    : options.filter(item => !['ceiling','painting','plumbing'].includes(item.key));
  return [...options,
    option('flooring', 'Flooring', 'Confirm whether existing flooring stays and the replacement coverage.', false, true),
    option('electrical', 'Electrical points', 'Confirm sockets, lighting and switch changes; price per point separately.', false, false, 'piece')];
}

export function defaultRoomWork(room: Room, scope: ProjectBrief['scope']): RoomWork {
  return { roomName: room.name, notes: '', items: roomWorkOptions(room, scope).filter(item => item.default).map(item => ({
    key: item.key, widthFt: null, heightFt: null,
    areaSqft: item.surface && ['printed','user'].includes(room.source) && room.widthFt && room.lengthFt
      ? Math.round(room.widthFt * room.lengthFt * 10000) / 10000 : null,
    details: '',
  })) };
}

function automaticRoomWork(room: Room, brief: ProjectBrief) {
  const scope = brief.scope, extras = brief.quoteExtras ?? [];
  const answer = defaultRoomWork(room, scope);
  // Scope defines the baseline: modular cabinetry versus full interiors.
  // Other optional trades require explicit selection.
  const core: Record<Room['kind'], string[]> = {
    kitchen: ['base_cabinets', 'wall_cabinets', 'countertop', 'loft'], bedroom: ['wardrobe', 'loft'], living: ['tv_unit'],
    dining: ['crockery_unit'], study: ['study_storage'], bathroom: ['vanity'], utility: ['utility_storage'],
    balcony: [], other: [],
  };
  const available = new Set(roomWorkOptions(room, scope).map(item => item.key));
  const fullInterior = scope === 'complete' ? ['ceiling', 'painting'] : [];
  const excluded = (key: string) => excludedWork(key, room.name, exclusionsForBrief(brief, [room]));
  const selected = new Set([...core[room.kind], ...fullInterior, ...extras].filter(key => available.has(key) && !excluded(key)));
  const items = answer.items.filter(item => selected.has(item.key));
  for (const key of selected) if (!items.some(item => item.key === key)) items.push({ key, widthFt: null, heightFt: null, areaSqft: null, details: '' });
  return { ...answer, items };
}

/** Every confirmed work field survives sparse AI output, including unpriced work. */
export function ensureRoomWorkCoverage(raw: z.infer<typeof generatedSchema>, rooms: Room[], brief: ProjectBrief) {
  const exclusions = exclusionsForBrief(brief, rooms);
  if (!brief.roomWork?.length) {
    if (!brief.automatic) return raw;
    // Automatic mode: keep the AI's room-specific proposal and supplement any
    // omitted essential work, without forcing the user through a checklist.
    const baseline = ensureRoomWorkCoverage({ sections: [], assumptions: [] }, rooms,
      { ...brief, roomWork: rooms.map(room => automaticRoomWork(room, brief)) });
    return { ...raw, sections: rooms.map(room => {
      const options = roomWorkOptions(room, brief.scope);
      const proposed = raw.sections.filter(section => section.roomName === room.name).flatMap(section => section.items).flatMap(item => {
        const task = options.find(option => normalizeReferenceText(option.key) === normalizeReferenceText(item.productName)
          || referenceProduct(option.name) === referenceProduct(item.productName));
        if (!task) return [];
        if (excludedWork(task.key, room.name, exclusions)) return [];
        return [{ ...item, productName: task.name }];
      });
      const essentials = baseline.sections.find(section => section.roomName === room.name)!.items;
      const items: z.infer<typeof generatedSchema>['sections'][number]['items'] = [...proposed];
      for (const item of essentials) if (!items.some(row => normalizeReferenceText(row.productName) === normalizeReferenceText(item.productName))) items.push(item);
      return { title: room.name, roomName: room.name, items };
    }) };
  }
  const sections = rooms.map(room => {
    const answer = brief.roomWork?.find(row => row.roomName === room.name);
    if (!answer) throw new Error(`Confirm the work required in ${room.name} before generating.`);
    const options = roomWorkOptions(room, brief.scope);
    if (answer.decisions) for (const option of options) {
      if (excludedWork(option.key, room.name, exclusions)) continue;
      if (answer.decisions[option.key] == null) throw new Error(`Confirm whether ${room.name} needs ${option.name.toLowerCase()}.`);
      if (answer.items.some(item => item.key === option.key) !== answer.decisions[option.key]) throw new Error(`The work choices for ${room.name} changed. Review its yes/no answers.`);
    }
    if (new Set(answer.items.map(item => item.key)).size !== answer.items.length) throw new Error(`Duplicate work choices in ${room.name}.`);
    const generated = raw.sections.filter(section => section.roomName === room.name).flatMap(section => section.items);
    return { title: room.name, roomName: room.name, items: answer.items.filter(work => !excludedWork(work.key, room.name, exclusions)).map(work => {
      const task = options.find(item => item.key === work.key);
      if (!task) throw new Error(`That work choice is not available for ${room.name} in this scope.`);
      const proposed = generated.find(item => item.productName.trim().toLowerCase() === task.name.toLowerCase());
      const area = task.unit !== 'sqft' ? null : work.areaSqft ?? (work.widthFt && work.heightFt ? Math.round(work.widthFt * work.heightFt * 10000) / 10000 : null);
      const details = [task.unit === 'sqft' ? '' : `Billing: ${task.unit}; price separately. No square-foot amount is assumed.`,
        work.details, answer.notes, proposed?.description, task.hint].filter(Boolean).join(' ').slice(0, 1000);
      return { productName: task.name, description: details, ...(proposed?.specifications ? { specifications: proposed.specifications } : {}), ...(proposed?.side ? { side: proposed.side } : {}), rateId: task.unit === 'sqft' ? proposed?.rateId ?? null : null,
        quantity: area, measurementStatus: area == null ? 'unknown' as const : 'estimated' as const,
        measurementReason: area == null ? `${room.name}: ${task.hint}` : `${room.name}: confirmed work coverage ${area} sqft; verify on site.` };
    }) };
  });
  const designNotes = brief.design ? [
    brief.design.coordinatedLook === true ? 'Design direction: coordinate the selected cabinetry, colours and finishes; verify door/window clearances on site.' : '',
    brief.design.retainExisting === true ? 'Retain specified existing furniture and finishes wherever possible. Confirm refurbishment versus new supply before final pricing.' : '',
    brief.design.notes ? `User design requirements: ${brief.design.notes}`.slice(0, 600) : '',
  ].filter(Boolean) : [];
  return { ...raw, sections, assumptions: [...new Set([...raw.assumptions, ...designNotes])].slice(0, 20) };
}
