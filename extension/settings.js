'use strict';
const toggle=document.getElementById('protection-toggle'),status=document.getElementById('protection-status');
function render(enabled){toggle.checked=enabled;status.textContent=enabled?'ON — redacts recognized patterns in supported AI text fields.':'OFF — leaves your text alone.';}
chrome.storage.local.get({enabled:false}).then(state=>{render(state.enabled===true);toggle.disabled=false;}).catch(()=>{status.textContent='Settings could not load. Protection remains off.';});
toggle.addEventListener('change',async()=>{toggle.disabled=true;try{await chrome.storage.local.set({enabled:toggle.checked});render(toggle.checked);}catch{render(!toggle.checked);status.textContent='Could not save the change. Try again.';}finally{toggle.disabled=false;}});

