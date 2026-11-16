// Run against `npm run start` on localhost:8080. All account traffic is mocked;
// the synthetic session must never be used against the real database.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const uid='f14e93d0-bf5e-4b62-b102-f39a21494d91';
const qid='f14e93d0-bf5e-4b62-b102-f39a21494d92';
const project='gclsgkhtwqurniitfeir';
const user={id:uid,aud:'authenticated',role:'authenticated',email:'save-check@example.invalid',app_metadata:{provider:'email',providers:['email']},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:uid,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.synthetic`;
const browser=await chromium.launch({headless:true});
try {
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 await context.addInitScript(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key:`sb-${project}-auth-token`,session:{access_token:token,refresh_token:'synthetic',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}});
 await context.routeWebSocket(/supabase/,socket=>socket.close());
 const saves=[]; const counts={}; const errors=[];
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if (url.hostname==='localhost' || url.hostname==='127.0.0.1') return route.continue();
  if (!url.hostname.endsWith('.supabase.co')) return route.abort();
  const key=url.pathname; counts[key]=(counts[key]||0)+1;
  let body=[];
  if(key==='/auth/v1/user') body=user;
  else if(key.startsWith('/auth/')) body={};
  else if(key.endsWith('/profiles')) body=[{id:uid,company_name:'Synthetic',country_code:'IN',currency_code:'INR',currency_symbol:'₹',locale:'en-IN',is_pro:true,pro_plan:'yearly',pro_expiry:'2030-01-01T00:00:00Z',payment_status:'paid',action_count:0}];
  else if(key.endsWith('/coin_wallets')) body=[{balance:60,welcome_claimed_at:'2026-01-01T00:00:00Z'}];
  else if(key.endsWith('/rpc/reserve_quotation_reference')) body='QNO-TEST01';
  else if(key.endsWith('/rpc/process_quotation_jobs')) body={ready:0,failed:0,processed:0};
  else if(key.endsWith('/rpc/save_quotation_checked')) {
   const request=route.request().postDataJSON(); saves.push(request);
   if(saves.length===1) return route.abort('failed');
   body={...request.p_payload,id:qid,user_id:uid,reference_no:'QNO-TEST01',version_number:request.p_id ? 2 : 1,
    sections:request.p_payload.sections.map((section,s)=>({...section,id:`10000000-0000-4000-8000-${String(s+1).padStart(12,'0')}`,
     items:section.items.map((item,i)=>({...item,id:`20000000-0000-4000-8000-${String(s*100+i+1).padStart(12,'0')}`}))}))};
  }
  else if(key.includes('/rpc/')) body=null;
  if(route.request().headers().accept?.includes('application/vnd.pgrst.object+json') && Array.isArray(body)) body=body[0]||null;
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body),headers:{'access-control-allow-origin':'*'}});
 });
 const page=await context.newPage(); page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://localhost:8080/',{waitUntil:'networkidle'});
 const save=page.getByRole('button',{name:'Save as Draft',exact:true});
 await save.click();
 await page.getByText('Save failed',{exact:true}).waitFor();
 await save.click();
 await page.waitForURL(`**/?id=${qid}`);
 await page.getByText('Quotation saved',{exact:true}).waitFor();
 await page.waitForTimeout(500);
 assert.equal(saves.length,2,'Retry should confirm one creation');
 assert.deepEqual(saves[0],saves[1],'Uncertain creation must replay its original request');
 assert.equal(counts['/rest/v1/rpc/get_quotation_editor']||0,0,'Acknowledged creation should not reload the editor');
 await save.click();
 await page.getByText('Quotation updated',{exact:true}).waitFor();
 assert.equal(saves.length,3);
 assert.equal(saves[2].p_id,qid);
 assert.equal(saves[2].p_expected_version,1);
 assert.notEqual(saves[2].p_request_id,saves[0].p_request_id);
  await page.evaluate(()=>sessionStorage.setItem('pendingFormData',JSON.stringify({sections:[],projectTitle:'Restored draft',clientName:'Restored client'})));
  await page.goto('http://localhost:8080/?continueAction=saveDraft',{waitUntil:'networkidle'});
  await page.getByText('Quotation saved',{exact:true}).waitFor();
  assert.equal(saves.length,4,'Valid sign-in continuation should save once');
  assert.equal(saves[3].p_payload.quotation_title,'Restored draft');
  assert.equal(saves[3].p_payload.client_name,'Restored client');
  assert.equal(saves[3].p_id,null);
 assert.deepEqual(errors,[]);
  process.stdout.write(JSON.stringify({result:'PASS',checks:['Lost-response retry uses identical creation request','No editor reload after creation','Next save updates acknowledged ID/version','Valid sign-in draft resumes once','No browser runtime errors'],requests:counts})+'\n');
 await context.close();
} finally { await browser.close(); }
