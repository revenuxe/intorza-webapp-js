// Local production-build smoke checks. All account HTTP/WebSocket traffic is mocked.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const project='gclsgkhtwqurniitfeir';
const key=`sb-${project}-auth-token`;
const uid='f14e93d0-bf5e-4b62-b102-f39a21494d91';
const user={id:uid,aud:'authenticated',role:'authenticated',email:'auth-check@example.invalid',app_metadata:{provider:'email',providers:['email']},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const expires=Math.floor(Date.now()/1000)+3600;
const access=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:uid,role:'authenticated',aud:'authenticated',exp:expires})}.synthetic`;
const browser=await chromium.launch({headless:true});
try {
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 const requests=[]; const errors=[];
 let rejectLogout=true;
 await context.routeWebSocket(/supabase/,socket=>socket.close());
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname==='localhost') return route.continue();
  if(!url.hostname.endsWith('.supabase.co')) return route.abort();
  const path=url.pathname; requests.push(path);
  if(path==='/auth/v1/logout' && rejectLogout){rejectLogout=false;return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Synthetic logout failure'})});}
  let body=[];
  if(path==='/auth/v1/user') body=user;
  else if(path.startsWith('/auth/')) body={};
  else if(path.endsWith('/profiles')) body=[{id:uid,is_pro:true,pro_plan:'yearly',pro_expiry:'2099-01-01T00:00:00Z',payment_status:'paid',company_name:'Synthetic',country_code:'IN',locale:'en-IN',currency_symbol:'₹',email:user.email}];
  else if(path.endsWith('/coin_wallets')) body=[{balance:60,welcome_claimed_at:'2026-01-01T00:00:00Z'}];
  else if(path.endsWith('/rpc/is_admin')) body=false;
  else if(path.endsWith('/rpc/process_quotation_jobs')) body={ready:0,processed:0,failed:0};
  else if(path.includes('/rpc/')) body=null;
  if(route.request().headers().accept?.includes('application/vnd.pgrst.object+json')&&Array.isArray(body)) body=body[0]||null;
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 for(const [protectedPath,loginPath] of [['/quotations','/auth'],['/admin/dashboard','/admin/login'],['/team/dashboard','/team/login']]){
  await page.goto(`http://localhost:8080${protectedPath}`,{waitUntil:'domcontentloaded'});
  await page.waitForURL(`http://localhost:8080${loginPath}`,{timeout:20_000});
 }
 await page.evaluate(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key,session:{access_token:access,refresh_token:'synthetic',expires_at:expires,expires_in:3600,token_type:'bearer',user}});
 await page.goto('http://localhost:8080/quotations',{waitUntil:'networkidle'});
 await page.getByRole('heading',{name:'My Quotations',exact:true}).waitFor();
 await page.goto('http://localhost:8080/?continueAction=saveDraft',{waitUntil:'networkidle'});
 await page.getByText('Draft could not be restored',{exact:true}).waitFor();
 assert.equal(requests.includes('/rest/v1/rpc/save_quotation_checked'),false,'Missing resumed draft must not automatically save an empty quotation');
 await page.goto('http://localhost:8080/quotations',{waitUntil:'networkidle'});
 const otherTab=await context.newPage();
 await otherTab.goto('http://localhost:8080/quotations',{waitUntil:'networkidle'});
 const editorTab=await context.newPage();
 await editorTab.goto('http://localhost:8080/',{waitUntil:'networkidle'});
 await editorTab.locator('#clientName').fill('Synthetic private client');
 await otherTab.getByRole('button',{name:'Account menu',exact:true}).click();
 await otherTab.getByRole('menuitem',{name:'Logout',exact:true}).click();
 await otherTab.getByText('Sign-out could not be fully confirmed. Check your connection.',{exact:true}).waitFor();
 // The installed SDK removes the local session even when remote revocation
 // fails. Both tabs must still remove private content; never restore that session.
 await page.waitForURL('http://localhost:8080/auth',{timeout:20_000});
 await otherTab.waitForURL('http://localhost:8080/auth',{timeout:20_000});
 await editorTab.getByRole('button',{name:'Login',exact:true}).waitFor();
 assert.equal(await editorTab.locator('#clientName').inputValue(),'','Logout must clear the public editor account form');
 await otherTab.evaluate(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key,session:{access_token:access,refresh_token:'synthetic',expires_at:expires,expires_in:3600,token_type:'bearer',user}});
 await otherTab.goto('http://localhost:8080/quotations',{waitUntil:'networkidle'});
 await page.goto('http://localhost:8080/quotations',{waitUntil:'networkidle'});
 await otherTab.getByRole('button',{name:'Account menu',exact:true}).click();
 await otherTab.getByRole('menuitem',{name:'Logout',exact:true}).click();
 await page.waitForURL('http://localhost:8080/auth',{timeout:20_000});
 assert.equal(await page.getByRole('heading',{name:'My Quotations',exact:true}).count(),0,'Logout must unmount private quotation content');
 assert.equal(requests.some(path=>path.includes('admin_quotation')||path.includes('admin_dashboard')),false,'Anonymous portal access must not mount admin data queries');
 assert.deepEqual(errors,[]);
 process.stdout.write(JSON.stringify({result:'PASS',checks:['Workspace sign-in redirect','Admin sign-in redirect','Team sign-in redirect','Signed-in quotation page','Missing resumed draft cannot auto-save','Remote logout failure reported while local sessions are removed','Logout clears the public quotation editor','Successful cross-tab logout unmounts private content','No browser runtime errors']})+'\n');
 await context.close();
}finally{await browser.close();}
