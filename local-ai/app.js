'use strict';
const input=document.getElementById('input'),toggle=document.getElementById('enabled'),status=document.getElementById('status'),timing=document.getElementById('timing');
const likely=document.getElementById('likely');
let epoch=0,timer,controller,composing=false;
function cancel(){epoch++;clearTimeout(timer);controller?.abort();controller=null;}
PasteGuardProtection.attach({window,document,isEnabled:()=>toggle.checked,getScanOptions:()=>({detectLikelySecrets:likely.checked}),onRedact:()=>{status.textContent='Pattern redacted. AI context scan is next.';},onError:()=>{status.textContent='Pattern scan failed. Review your text.';}});
async function scan(manual=false){
  if(!manual&&!toggle.checked)return;
  const rules=PasteGuard.scan(input.value,{detectLikelySecrets:likely.checked});
  if(rules.findings.length){let caret=input.selectionStart;for(const f of rules.findings){if(caret>=f.end)caret+=10-(f.end-f.start);else if(caret>f.start)caret+=10-(caret-f.start);}input.value=rules.redacted;if(document.activeElement===input)input.setSelectionRange(Math.max(0,caret),Math.max(0,caret));}
  const snapshot=input.value;if(!snapshot.trim())return;
  cancel();const stamp=epoch;controller=new AbortController();const began=performance.now();
  status.textContent='Scanning locally…';
  try{
    const response=await fetch('/scan',{method:'POST',headers:{'Content-Type':'application/json','X-PasteGuard':'local-test'},body:JSON.stringify({text:snapshot}),signal:controller.signal});
    const result=await response.json();
    if(stamp!==epoch||input.value!==snapshot||(!manual&&!toggle.checked))return;
    if(!response.ok)throw new Error(result.error);
    let caret=input.selectionStart;
    for(const f of result.findings){if(caret>=f.end)caret+=10-(f.end-f.start);else if(caret>f.start)caret+=10-(caret-f.start);}
    input.value=result.redacted;
    if(document.activeElement===input)input.setSelectionRange(Math.max(0,Math.min(input.value.length,caret)),Math.max(0,Math.min(input.value.length,caret)));
    const count=result.findings.length+rules.findings.length;
    status.textContent=count?`Redacted ${count} possible sensitive item(s) using rules and AI. Review it.`:'AI found no extra matches. This does not mean safe.';
    timing.textContent=`AI computation: ${result.milliseconds} ms. Full request: ${(performance.now()-began).toFixed(1)} ms. Typing delay: 300 ms.`;
  }catch(error){if(error.name!=='AbortError'&&stamp===epoch){status.textContent='AI could not scan. Review your text.';timing.textContent=error.message;}}
}
function changed(){cancel();if(toggle.checked&&!composing){status.textContent='Waiting for typing pause…';timer=setTimeout(()=>scan(),300);}}
input.addEventListener('input',changed);
input.addEventListener('compositionstart',()=>{composing=true;cancel();});
input.addEventListener('compositionend',()=>{composing=false;changed();});
toggle.addEventListener('change',()=>{cancel();status.textContent=toggle.checked?'ON. AI scans after a typing pause.':'OFF. Your new text stays unchanged.';if(toggle.checked)changed();});
likely.addEventListener('change',changed);
document.getElementById('scan').addEventListener('click',()=>scan(true));

