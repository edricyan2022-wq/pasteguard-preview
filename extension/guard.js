(()=>{
  'use strict';let enabled=false,protection;
  chrome.storage.local.get({enabled:false}).then(state=>{enabled=state.enabled===true;}).catch(()=>{});
  chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.enabled){enabled=changes.enabled.newValue===true;protection?.resetContinuation();if(!enabled)document.getElementById('pasteguard-notice')?.remove();}});
  function notice(message){
    document.getElementById('pasteguard-notice')?.remove();const host=document.createElement('div');host.id='pasteguard-notice';const shadow=host.attachShadow({mode:'closed'}),box=document.createElement('div');
    box.style.cssText='position:fixed;bottom:20px;right:20px;z-index:2147483647;background:#111b2b;color:#f2f5fa;border:1px solid #617087;border-radius:10px;padding:16px;max-width:320px;font:14px/1.5 system-ui;box-shadow:0 12px 48px #0006';
    const p=document.createElement('p');p.textContent=message;const button=document.createElement('button');button.textContent='Dismiss';button.onclick=()=>host.remove();box.append(p,button);shadow.append(box);(document.body||document.documentElement).append(host);
  }
  protection=PasteGuardProtection.attach({window,document,isEnabled:()=>enabled,onRedact:findings=>notice('PasteGuard redacted '+findings.length+' detected match'+(findings.length===1?'':'es')+'. Review your text before sending.'),onError:message=>notice('PasteGuard could not check this text. '+message)});
})();

