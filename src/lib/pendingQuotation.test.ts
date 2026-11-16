import { parsePendingQuotation } from './pendingQuotation';
it('accepts an empty draft and preserves optional settings',()=>{
 expect(parsePendingQuotation({sections:[],clientName:'Client',gstEnabled:false})).toEqual({sections:[],clientName:'Client',gstEnabled:false});
});
it.each([null,{}, {sections:'bad'}, {sections:[{id:'room',title:'Room',items:'bad'}]}, {sections:[],appliedPricing:{gstEnabled:'bad'}}])('rejects malformed draft fields without crashing restoration: %j',value=>{
 expect(parsePendingQuotation(value)).toBeNull();
});
