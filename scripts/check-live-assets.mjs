const origin=process.env.CHECK_SITE_ORIGIN || 'https://app.intorza.com';
for(const path of ['/','/auth']){
  const response=await fetch(origin+path,{signal:AbortSignal.timeout(15000)});
  const html=await response.text();
  console.log(JSON.stringify({path,status:response.status,cache:response.headers.get('cache-control'),cfCache:response.headers.get('cf-cache-status'),age:response.headers.get('age')}));
  const sources=[...new Set([...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]).filter(p=>p.startsWith('/_next/')))];
  for(const source of sources){const asset=await fetch(origin+source,{signal:AbortSignal.timeout(15000)});console.log(JSON.stringify({source,status:asset.status,type:asset.headers.get('content-type')}));if(!asset.ok)process.exitCode=1;await asset.body?.cancel();}
}
const stale=await fetch(origin+'/_next/static/chunks/046zgdjmv00q8.js',{signal:AbortSignal.timeout(15000)});
console.log(JSON.stringify({previousDeploymentChunkStatus:stale.status}));
