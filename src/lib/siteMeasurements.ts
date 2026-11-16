export type RoomMeasurement = {width_ft:number;length_ft:number;height_ft?:number|null};
export function roomIsMeasured(room:RoomMeasurement){return Number.isFinite(Number(room.width_ft))&&Number(room.width_ft)>0&&Number.isFinite(Number(room.length_ft))&&Number(room.length_ft)>0;}
export function feetAndInches(feet:string,inches:string){
 if(!feet.trim()&&!inches.trim()) return null;
 const ft=Number(feet||0),inch=Number(inches||0);
 if(!Number.isFinite(ft)||!Number.isInteger(ft)||ft<0||!Number.isFinite(inch)||inch<0||inch>=12) return null;
 return Number((ft+inch/12).toFixed(8));
}
export function splitFeet(value:number){const feet=Math.floor(value||0);return {feet:String(feet),inches:String(Number((((value||0)-feet)*12).toFixed(6)))};}
export function visitStage(status:string){return status==='converted'?'Quotation created':status==='completed'?'Visit complete':'In progress';}
export function roomAmount(room:{area_sqft:number;pricing_mode?:string|null;rate_per_sqft?:number|null;lump_sum_amount?:number|null;quantity?:number|null;rate_per_unit?:number|null}){
 if(room.pricing_mode==='lump_sum')return Number(room.lump_sum_amount||0);
 if(room.pricing_mode==='per_unit')return Number(room.quantity??1)*Number(room.rate_per_unit||0);
 return Number(room.area_sqft||0)*Number(room.rate_per_sqft||0);
}
