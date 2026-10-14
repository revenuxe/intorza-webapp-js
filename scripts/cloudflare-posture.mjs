import { spawnSync } from 'node:child_process';
const auth = spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','auth','token','--json'],{encoding:'utf8'});
if (auth.status !== 0) throw new Error('Cloudflare authentication unavailable; credentials suppressed.');
const credentials=JSON.parse(auth.stdout);
const token=credentials.token || credentials.api_token || credentials.oauth_token || credentials.access_token;
if (!token) throw new Error(`Unsupported credential envelope; fields: ${Object.keys(credentials).join(',')}`);
async function get(path) {
  const response=await fetch(`https://api.cloudflare.com/client/v4${path}`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(15000)});
  const body=await response.json();
  return {status:response.status,ok:body.success,data:body.result};
}
const zones=await get('/zones?name=intorza.com');
if (!zones.ok) throw new Error(`Cloudflare zone inspection denied: HTTP ${zones.status}`);
const zone=zones.data.find(z=>z.name==='intorza.com');
if (!zone) throw new Error('Production zone not found in the authenticated account.');
console.log(JSON.stringify({zone:zone.name,status:zone.status,plan:zone.plan?.name}));
for (const setting of ['ssl','always_use_https','min_tls_version','security_level']) {
  const result=await get(`/zones/${zone.id}/settings/${setting}`);
  console.log(JSON.stringify({setting,status:result.status,value:result.ok?result.data?.value:'not authorized'}));
}
for (const [name,path] of [
  ['worker-domains',`/accounts/${zone.account.id}/workers/domains`],
  ['worker-routes',`/zones/${zone.id}/workers/routes`],
  ['rulesets',`/zones/${zone.id}/rulesets`],
  ['bots',`/zones/${zone.id}/bot_management`],
  ['access',`/accounts/${zone.account.id}/access/apps`],
  ['builds',`/accounts/${zone.account.id}/builds/triggers`],
]) {
  const result=await get(path);
  console.log(JSON.stringify({check:name,status:result.status,authorized:result.ok,
    summary:result.ok?name==='rulesets'?result.data?.map(x=>({name:x.name,phase:x.phase})):
      name==='access'?result.data?.map(x=>({name:x.name,domain:x.domain})):
      name==='worker-domains'?result.data?.map(x=>({hostname:x.hostname,service:x.service,environment:x.environment})):
      name==='worker-routes'?result.data?.map(x=>({pattern:x.pattern,script:x.script})):
      name==='builds'?'build configuration readable':'configuration readable':undefined}));
}
