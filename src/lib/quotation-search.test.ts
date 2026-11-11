import { matchesQuotation } from './quotation-search';
const quotation={reference_no:'QNO-0001AZ',client_name:'Touheed Rahman',project_name:'Modern Kitchen',quotation_title:'Premium Package'};
it.each(['qno-0001az','QNO0001AZ','0001az','touheed','MODERN','premium','Touheed kitchen'])('matches %s',search=>expect(matchesQuotation(quotation,search)).toBe(true));
it('handles blank and nonmatching searches',()=>{expect(matchesQuotation(quotation,'  ')).toBe(true);expect(matchesQuotation(quotation,'bathroom')).toBe(false);expect(matchesQuotation({},'QNO')).toBe(false);});
