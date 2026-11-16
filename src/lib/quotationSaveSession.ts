import { reconcileSavedQuotation, type SavedSection } from './quotation-ai/save-reconciliation';

export type QuotationSavePayload = Record<string, unknown> & { sections: SavedSection[] };
export type QuotationSaveAttempt = { id: string | null; payload: QuotationSavePayload; requestId: string; expectedVersion: number | null; projectId: string | null };
export type QuotationSaveAcknowledgement = Record<string, unknown> & { id: string; user_id?: string; reference_no?: string; version_number: number; sections: SavedSection[] };
type Mapping = ReturnType<typeof reconcileSavedQuotation>;
const remapSections = (sections: SavedSection[], mapping: Mapping) => sections.map(section => ({ ...section, id: mapping.sections[section.id] || section.id,
  items: section.items.map(item => ({ ...item, id: mapping.items[item.id] || item.id })) }));
const signature = (payload: QuotationSavePayload) => JSON.stringify({ ...payload, sections: payload.sections.map(section => ({ ...section, id: undefined, items: section.items.map(item => ({ ...item, id: undefined })) })) });

/** Keep an uncertain request key until it is acknowledged. Reconcile that save
 * first, then save any newer edits as an update rather than another creation. */
export class QuotationSaveSession {
  private pending: { attempt: QuotationSaveAttempt; signature: string } | null = null;
  private busy = false;
  private generation = 0;
  private aliases: Mapping = { sections: {}, items: {} };
  id: string | null = null;
  version: number | null = null;
  constructor(private transport: (attempt: QuotationSaveAttempt) => Promise<QuotationSaveAcknowledgement>) {}
  adopt(id: string, version: number) { this.reset(); this.id=id; this.version=version; }
  reset() { this.generation++; this.id=null; this.version=null; this.pending=null; this.aliases={sections:{},items:{}}; }
  private async send(attempt: QuotationSaveAttempt) {
    const generation = this.generation;
    try {
      const saved = await this.transport(attempt);
      if (generation !== this.generation) throw new Error('The editor changed while this save was running. Open My Quotations to check the saved result.');
      if (!saved?.id || !Number.isInteger(saved.version_number) || !Array.isArray(saved.sections)) throw new Error('Save acknowledgement is incomplete. Retry to confirm the saved result.');
      const mapping = reconcileSavedQuotation(attempt.payload.sections,saved.sections);
      for (const kind of ['sections','items'] as const) {
        for (const local of Object.keys(this.aliases[kind])) this.aliases[kind][local]=mapping[kind][this.aliases[kind][local]] || this.aliases[kind][local];
        Object.assign(this.aliases[kind],mapping[kind]);
      }
      this.id=saved.id; this.version=saved.version_number; this.pending=null;
      return { saved,mapping };
    } catch (error) {
      // A PostgreSQL rejection proves this transaction rolled back. Network or
      // incomplete-response failures leave the request key available for replay.
      const code = (error as { details?: { code?: string } } | null)?.details?.code;
      if (generation === this.generation && code && /^[0-9A-Z]{5}$/.test(code)) this.pending=null;
      throw error;
    }
  }
  async save(input: { id: string | null; version: number | null; payload: QuotationSavePayload; projectId?: string | null }) {
    if (this.busy) throw new Error('A quotation save is already in progress.');
    this.busy=true;
    try {
      let payload: QuotationSavePayload = JSON.parse(JSON.stringify(input.payload));
      const originalSignature=signature(payload);
      if (this.pending) {
        const pending=this.pending;
        const previous=await this.send(pending.attempt);
        if (pending.signature===originalSignature && pending.attempt.projectId===(input.projectId || null)) return { quotation: previous.saved, mapping: reconcileSavedQuotation(input.payload.sections,previous.saved.sections) };
      }
      payload={...payload,sections:remapSections(payload.sections,this.aliases)};
      const id=this.id || input.id;
      const expectedVersion=this.version ?? input.version;
      if (id && expectedVersion===null) throw new Error('Reload this quotation before saving. Your editor has been preserved.');
      const requestId=crypto.randomUUID();
      const attempt: QuotationSaveAttempt = { id,expectedVersion:id ? expectedVersion : null,requestId,projectId:input.projectId || null,
        payload:id ? payload : {...payload,quotation_number:`QT-${requestId}`} };
      this.pending={attempt,signature:originalSignature};
      const result=await this.send(attempt);
      return { quotation:result.saved,mapping:reconcileSavedQuotation(input.payload.sections,result.saved.sections) };
    } finally { this.busy=false; }
  }
}
