import { applyOperations, toQuotation, type VoiceDraft } from './domain';

/** Transfer all generated rows, including pending measurements/rates, atomically. */
export function appendFloorPlanEstimate(existing: VoiceDraft, generated: VoiceDraft) {
  const retained = existing.sections.filter(section => section.items.length || section.title.trim());
  const draft = applyOperations({ ...generated, sections: [...retained, ...generated.sections] }, []);
  const sections = toQuotation(draft, true);
  const expected = [...retained, ...generated.sections].flatMap(section => section.items.map(item => item.id));
  const actual = sections.flatMap(section => section.items.map(item => item.id));
  if (expected.length !== actual.length || expected.some((id, index) => id !== actual[index])) {
    throw new Error('The editor could not receive every generated item. Your existing quotation is preserved.');
  }
  return { draft, sections };
}
