import { applyOperations, toQuotation, type VoiceDraft } from './domain';
import { excludedWork, type WorkExclusion } from './requirements';

/** Transfer all generated rows, including pending measurements/rates, atomically. */
export function appendFloorPlanEstimate(existing: VoiceDraft, generated: VoiceDraft, exclusions: WorkExclusion[] = []) {
  const retained = existing.sections.filter(section => section.items.length || section.title.trim())
    .map(section => ({ ...section, items: section.items.filter(item => !excludedWork(item.productName, section.title, exclusions)) }));
  const draft = applyOperations({ ...generated, sections: [...retained, ...generated.sections] }, []);
  const sections = toQuotation(draft, true);
  const expected = [...retained, ...generated.sections].flatMap(section => section.items.map(item => item.id));
  const actual = sections.flatMap(section => section.items.map(item => item.id));
  if (expected.length !== actual.length || expected.some((id, index) => id !== actual[index])) {
    throw new Error('The editor could not receive every generated item. Your existing quotation is preserved.');
  }
  return { draft, sections };
}
