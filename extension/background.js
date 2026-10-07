'use strict';
chrome.runtime.onMessage.addListener((request,sender,reply)=>{
  if(sender.id!==chrome.runtime.id||request?.type!=='pasteguard-local-ai')return;
  const allowed=new Set(['https://chatgpt.com','https://claude.ai','https://gemini.google.com']);
  let origin;try{origin=new URL(sender.url).origin;}catch{return;}
  if(!allowed.has(origin)||typeof request.text!=='string'||request.text.length>2000){reply({error:'Unsupported AI request.'});return;}
  (async()=>{
    try{
      const state=await chrome.storage.local.get({enabled:false,aiEnabled:false});
      if(!state.enabled||!state.aiEnabled){reply({error:'Local AI is OFF.'});return;}
      const response=await fetch('http://127.0.0.1:4322/scan',{method:'POST',headers:{'Content-Type':'application/json','X-PasteGuard':'local-test'},body:JSON.stringify({text:request.text}),signal:AbortSignal.timeout(5000)});
      if(!response.ok){reply({error:'Local AI rejected this scan. Shorten the text.'});return;}
      reply(await response.json());
    }catch{reply({error:'Local AI unavailable. Start the local AI program. Pattern protection remains active.'});}
  })();
  return true;
});

