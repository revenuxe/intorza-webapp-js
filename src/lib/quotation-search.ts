type SearchableQuotation = { reference_no?: string | null; quotation_number?: string | null; quotation_title?: string | null; project_name?: string | null; client_name?: string | null };
const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export function matchesQuotation(quotation: SearchableQuotation, search: string) {
 const terms=search.trim().split(/\s+/).map(normalize).filter(Boolean);
 const values=[quotation.reference_no,quotation.quotation_number,quotation.quotation_title,quotation.project_name,quotation.client_name].filter(Boolean).map(value=>normalize(value!));
 return terms.every(term=>values.some(value=>value.includes(term)));
}
