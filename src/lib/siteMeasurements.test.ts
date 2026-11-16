import { feetAndInches,splitFeet,roomIsMeasured,roomAmount } from './siteMeasurements';
it('converts tape measurements without treating inches as decimal feet',()=>{
 expect(feetAndInches('12','6')).toBe(12.5);expect(feetAndInches('','6')).toBe(.5);
 expect(splitFeet(12.5)).toEqual({feet:'12',inches:'6'});
});
it.each([['',''],['-1','0'],['12','12'],['1.5','0'],['1','-2'],['1','Infinity']])('rejects invalid feet/inches %s/%s',(ft,inch)=>expect(feetAndInches(ft,inch)).toBeNull());
it('requires positive finite floor dimensions',()=>{
 expect(roomIsMeasured({width_ft:12.5,length_ft:10})).toBe(true);
 expect(roomIsMeasured({width_ft:0,length_ft:10})).toBe(false);
 expect(roomIsMeasured({width_ft:Infinity,length_ft:10})).toBe(false);
});
it('recalculates each pricing mode using its actual billing quantity',()=>{
 expect(roomAmount({area_sqft:120,pricing_mode:'per_sqft',rate_per_sqft:100})).toBe(12000);
 expect(roomAmount({area_sqft:120,pricing_mode:'per_unit',quantity:2,rate_per_unit:750})).toBe(1500);
 expect(roomAmount({area_sqft:120,pricing_mode:'lump_sum',lump_sum_amount:5000})).toBe(5000);
});
