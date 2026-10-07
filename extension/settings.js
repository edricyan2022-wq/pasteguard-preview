'use strict';
const aiToggle=document.getElementById('ai-toggle');
const toggle=document.getElementById('protection-toggle'),status=document.getElementById('protection-status');
function render(enabled){toggle.checked=enabled;status.textContent=enabled?'ON — redacts recognized patterns in supported AI text fields.':'OFF — leaves your text alone.';}
chrome.storage.local.get({enabled:false,detectLikelySecrets:false,aiEnabled:false}).then(state=>{render(state.enabled===true);toggle.disabled=false;likelyToggle.checked=state.detectLikelySecrets===true;likelyToggle.disabled=false;aiToggle.checked=state.aiEnabled===true;aiToggle.disabled=false;}).catch(()=>{status.textContent='Settings could not load. Protection remains off.';});
toggle.addEventListener('change',async()=>{toggle.disabled=true;try{await chrome.storage.local.set({enabled:toggle.checked});render(toggle.checked);}catch{render(!toggle.checked);status.textContent='Could not save the change. Try again.';}finally{toggle.disabled=false;}});

likelyToggle.addEventListener('change',async()=>{likelyToggle.disabled=true;try{await chrome.storage.local.set({detectLikelySecrets:likelyToggle.checked});}catch{likelyToggle.checked=!likelyToggle.checked;status.textContent='Could not save likely-secret mode.';}finally{likelyToggle.disabled=false;}});

aiToggle.addEventListener('change',async()=>{aiToggle.disabled=true;try{await chrome.storage.local.set({aiEnabled:aiToggle.checked});}catch{aiToggle.checked=!aiToggle.checked;status.textContent='Could not save local AI setting.';}finally{aiToggle.disabled=false;}});

