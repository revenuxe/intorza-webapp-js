import { Check } from 'lucide-react';
const steps=['Site details','Rooms & photos','Quotation'];
export function MeasurementJourney({step,team=false}:{step:1|2|3;team?:boolean}){
 return <nav aria-label="Site visit progress" className="min-w-0"><ol className={`grid gap-2 ${team?'grid-cols-2':'grid-cols-3'}`}>
  {steps.slice(0,team?2:3).map((label,index)=><li key={label} aria-current={index===step-1?'step':undefined} className={`min-w-0 space-y-2 rounded-xl border p-2.5 text-xs sm:p-3 ${index===step-1?'border-primary/40 bg-primary/5 text-primary':'text-muted-foreground'}`}>
   <span className={`flex h-6 w-6 items-center justify-center rounded-full ${index<step-1?'bg-primary text-primary-foreground':'bg-muted'}`}>{index<step-1?<Check className="h-3.5 w-3.5"/>:index+1}</span>
   <span className="block break-words font-medium">{label}</span>{index===2&&<span className="block text-[10px]">Optional</span>}
  </li>)}
 </ol></nav>;
}
