import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

function verifier(change: Record<string,unknown> = {}, orderChange: Record<string,unknown> = {}, ok=true) {
  const payment={id:'pay_test123',order_id:'order_test123',amount:49900,currency:'INR',status:'captured',captured:true,amount_refunded:0,...change};
  const order={id:'order_test123',amount:49900,currency:'INR',status:'paid',amount_paid:49900,notes:{user_id:'owner',plan:'monthly',type:'pro_activation'},...orderChange};
  const exported: Record<string, (...args: unknown[])=>Promise<unknown>>={};
  const source=fs.readFileSync(path.resolve(__dirname,'../../supabase/functions/_shared/verified-payment.ts'),'utf8');
  const fetch=jest.fn(async (url: string)=>({ok,json:async()=>url.includes('/payments/')?payment:order}));
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText,{
    exports:exported,fetch,Deno:{env:{get:()=> 'test-only-credential'}},AbortSignal:{timeout:()=>undefined},btoa:(value: string)=>Buffer.from(value).toString('base64'),
  });
  return {verify:()=>exported.getCapturedPayment('pay_test123','owner','order_test123'),fetch};
}
describe('provider-backed payment authorization',()=>{
  it('accepts matching owned, captured payment facts',async()=>{
    const test=verifier();
    await expect(test.verify()).resolves.toMatchObject({userId:'owner'});
    expect(test.fetch).toHaveBeenCalledTimes(2);
  });
  it('rejects another user’s genuine payment',async()=>{
    await expect(verifier({}, {notes:{user_id:'other',plan:'monthly',type:'pro_activation'}}).verify()).rejects.toThrow('ownership');
  });
  it.each([{amount:50},{currency:'USD'},{order_id:'order_other'},{status:'authorized',captured:false},{amount_refunded:49900}])('rejects inconsistent, unsettled or refunded payments: %j',async change=>{
    await expect(verifier(change).verify()).rejects.toThrow();
  });
  it('rejects an unrelated order purpose',async()=>{
    await expect(verifier({}, {notes:{user_id:'owner',plan:'monthly',type:'unrelated'}}).verify()).rejects.toThrow();
  });
  it('fails closed on provider errors',async()=>{
    await expect(verifier({}, {},false).verify()).rejects.toThrow('Could not verify');
  });
});
