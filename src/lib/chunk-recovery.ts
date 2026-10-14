// Runs before Next hydration: a missing bootstrap chunk cannot load a React
// error boundary. Retry once, preserving drafts and sessions, then offer a
// manual reload instead of creating an automatic reload loop.
export const chunkRecoveryScript = `(function(){
var pending=false,key='intorza-chunk-recovery';
function recover(){
 if(pending || !navigator.onLine)return;
 pending=true;
 var prior=0;try{prior=Number(sessionStorage.getItem(key)||0);}catch(e){}
 if(Date.now()-prior>60000){
  try{sessionStorage.setItem(key,String(Date.now()));}catch(e){show();return;}
  var url=new URL(location.href);url.searchParams.set('__intorza_reload',String(Date.now()));location.replace(url.href);return;
 }
 show();
}
function show(){
 function mount(){
  if(document.getElementById('intorza-update-recovery'))return;
  var box=document.createElement('div');box.id='intorza-update-recovery';box.setAttribute('role','alert');
  box.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#faf9f6;display:flex;align-items:center;justify-content:center;padding:24px;font:16px system-ui;color:#333';
  var content=document.createElement('div');var title=document.createElement('h1');title.textContent='An update is ready';
  var message=document.createElement('p');message.textContent='Reload to open the latest app. Your saved session and drafts will be kept.';
  var button=document.createElement('button');button.textContent='Reload app';button.style.cssText='padding:12px 20px;cursor:pointer';
  button.onclick=function(){var url=new URL(location.href);url.searchParams.set('__intorza_reload',String(Date.now()));location.replace(url.href);};
  content.append(title,message,button);box.append(content);document.body.append(box);
 }
 if(document.body)mount();else document.addEventListener('DOMContentLoaded',mount,{once:true});
}
window.addEventListener('error',function(event){var el=event.target;if(el && el.tagName==='SCRIPT'){try{var url=new URL(el.src,location.href);if(url.origin===location.origin && url.pathname.indexOf('/_next/static/')===0)recover();}catch(e){}}},true);
window.addEventListener('unhandledrejection',function(event){var message=String(event.reason && (event.reason.message||event.reason)||'');if(/ChunkLoadError|Loading chunk .*failed|Failed to fetch dynamically imported module/.test(message))recover();});
})();`;
