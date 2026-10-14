import { chromium } from '@playwright/test';
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage();
  const errors=[];const missing=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.url().includes('/_next/static/') && response.status()>=400)missing.push({path:new URL(response.url()).pathname,status:response.status()});});
  const response=await page.goto('https://app.intorza.com/',{waitUntil:'domcontentloaded',timeout:30000});
  await page.getByRole('heading',{name:'Create Quotation',exact:true}).waitFor({timeout:30000});
  console.log(JSON.stringify({status:response.status(),workspaceRendered:true,missingChunks:missing,pageErrors:errors.length,cache:response.headers()['cache-control']}));
  if(missing.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
