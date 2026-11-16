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
const projects=[];
const rooms=[];
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
  else if(path.endsWith('/site_measurement_projects')) body=url.searchParams.has('id')?[projects.find(p=>'eq.'+p.id===url.searchParams.get('id')) || projects[0]]:projects;
  else if(path.endsWith('/site_measurement_rooms')) body=rooms;
  else if(path.includes('/rpc/')) body=null;
  if(route.request().headers().accept?.includes('application/vnd.pgrst.object+json')&&Array.isArray(body)) body=body[0]||null;
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });

 await context.addInitScript(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key,session:{access_token:access,refresh_token:'synthetic',expires_at:expires,expires_in:3600,token_type:'bearer',user}});

 projects.length=0;rooms.length=0;let roomWrites=0,completions=0,conversions=0;let quote=null;
 const qid='f14e93d0-bf5e-4b62-b102-f39a21494d96';
 await context.route('**/rest/v1/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname,method=request.method();let body;
  if(path.endsWith('/site_measurement_projects')&&method==='POST'){
   const visit=request.postDataJSON();projects.push({...visit,created_at:new Date().toISOString(),room_count:0,total_area:0,photo_count:0,team_member:null,quotation_id:null});body=[projects.at(-1)];
  }else if(path.endsWith('/site_measurement_projects')&&method==='PATCH'){Object.assign(projects[0],request.postDataJSON());body=[];}
  else if(path.endsWith('/site_measurement_rooms')&&method==='POST'){
   roomWrites++;const room=request.postDataJSON();const existing=rooms.find(r=>r.id===room.id);const saved={...room,area_sqft:room.width_ft*room.length_ft,pricing_mode:'per_sqft',rate_per_sqft:0,room_photos:[]};if(existing)Object.assign(existing,saved);else rooms.push(saved);body=[];
  }else if(path.endsWith('/rpc/complete_site_measurement')){completions++;projects[0].status='completed';body=projects[0];}
  else if(path.endsWith('/rpc/convert_site_measurement')){
   conversions++;const data=request.postDataJSON(),price=data.p_pricing[0];assert.equal(price.expected_width_ft,12.5);assert.equal(price.expected_length_ft,10);
   assert.equal(price.rate_per_sqft,100);projects[0].quotation_id=qid;projects[0].status='converted';
   quote={id:qid,user_id:uid,reference_no:'QNO-TEST01',group_reference_no:'QNO-TEST01',quotation_title:projects[0].client_name,project_name:projects[0].client_name,client_name:projects[0].client_name,date_of_proposal:'2026-11-16',version_number:1,status:'draft',subtotal:12500,grand_total:12500,item_images:[],plan_project:null,sections:[{id:'30000000-0000-4000-8000-000000000001',section_name:'Master bedroom',items:[{id:'40000000-0000-4000-8000-000000000001',product_name:'Master bedroom work',measurement_unit:'Sq.ft',side:'A',width_ft:12.5,height_ft:10,sft_area:125,rate_per_sft:100,amount:12500}]}]};
   body={quotation_id:qid,existing:false};
  }else if(path.endsWith('/rpc/get_quotation_editor'))body=quote;
  else return route.fallback();
  if(request.headers().accept?.includes('application/vnd.pgrst.object+json')&&Array.isArray(body))body=body[0]||null;
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://localhost:8080/site-measurement/new',{waitUntil:'networkidle'});
 await page.getByLabel(/Client or project name/).fill('Guided site visit');
 await page.getByRole('button',{name:'Continue to rooms'}).click();await page.waitForURL('**/site-measurement/*');
 await page.getByRole('button',{name:'Measure first room'}).click();
 await page.getByRole('combobox',{name:'Room type'}).click();await page.getByRole('option',{name:'Bedroom',exact:true}).click();
 await page.getByLabel('Room name (optional)').fill('Master bedroom');
 await page.getByLabel('Width (feet)',{exact:true}).fill('12');await page.getByLabel('Width (inches)',{exact:true}).fill('6');await page.getByLabel('Length (feet)',{exact:true}).fill('10');
 assert.equal(await page.getByText('125.0 sq.ft',{exact:true}).count(),1);
 await page.getByRole('button',{name:'Save room',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
 await page.getByText(/12.5.*10.*125.0/).waitFor();assert.equal(rooms[0].width_ft,12.5);assert.equal(rooms[0].length_ft,10);
 await page.getByRole('button',{name:'Photos for Master bedroom'}).click();await page.getByRole('heading',{name:'Room photos (optional)'}).waitFor();
 await page.getByRole('button',{name:'Close',exact:true}).first().click();
 await page.getByRole('button',{name:'Finish visit',exact:true}).click();await page.getByRole('button',{name:'Visit complete',exact:true}).waitFor();
 await page.getByRole('button',{name:'Create quotation',exact:true}).click();await page.getByRole('heading',{name:'Prepare a quotation'}).waitFor();
 await page.getByLabel('Rate per sq.ft',{exact:true}).fill('100');await page.getByRole('button',{name:'Create draft quotation',exact:true}).click();
 await page.waitForURL('**/?id='+qid);await page.waitForTimeout(300);
 assert.equal(roomWrites,1);assert.equal(completions,1);assert.equal(conversions,1);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'PASS',checks:['Create site visit','Save 12 ft 6 in × 10 ft as 125 sq.ft','Open room photos','Finish visit','Create priced draft through one RPC','Open quotation editor'],roomWrites,completions,conversions}));
 await context.close();
}finally{await browser.close();}
