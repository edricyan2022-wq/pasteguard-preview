'use strict';
const input=document.getElementById('input');
const output=document.getElementById('output');
const result=document.getElementById('result');
const area=document.getElementById('output-area');
const copyStatus=document.getElementById('copy-status');
const sample='These values are FAKE test data:\n\nAWS_ACCESS_KEY_ID=AKIA0000000000000000\npassword="DemoPassword_4829"\nAuthorization: Bearer FAKE_TOKEN_1234567890123456\nEmail: demo@example.com\nPhone: (312) 555-0123\nCard: 4242 4242 4242 4242';
const demoToggle=document.getElementById('demo-toggle'),liveStatus=document.getElementById('live-status');
const likelyToggle=document.getElementById('likely-toggle');
function scanOptions(){return {detectLikelySecrets:likelyToggle?.checked===true};}
function liveNotice(findings){if(liveStatus)liveStatus.textContent='ON — redacted '+findings.length+' detected match'+(findings.length===1?'':'es')+'. Review before sharing.';}
function applyLive(){if(!demoToggle?.checked)return;try{const s=PasteGuard.scan(input.value,scanOptions());if(s.findings.length){input.value=s.redacted;reset();liveNotice(s.findings);}}catch(error){liveStatus.textContent=error.message;}}
likelyToggle?.addEventListener('change',()=>{if(demoToggle)applyLive();});
if(demoToggle){
  const liveProtection=PasteGuardProtection.attach({window,document,isEnabled:()=>demoToggle.checked,getScanOptions:scanOptions,onRedact:liveNotice,onError:message=>{liveStatus.textContent=message;}});
  demoToggle.addEventListener('change',()=>{liveProtection.resetContinuation();liveStatus.textContent=demoToggle.checked?'ON — recognized patterns are redacted as you type.':'OFF — new text stays unchanged. Previously redacted text stays redacted.';applyLive();});
}
function reset(){area.hidden=true;output.value='';copyStatus.textContent='';result.replaceChildren();const h=document.createElement('h2');h.textContent='Ready when you are.';const p=document.createElement('p');p.textContent='Check your current text to review possible secrets.';result.append(h,p);document.getElementById('chars').textContent=input.value.length.toLocaleString()+' characters';}
input.addEventListener('input',reset);
document.getElementById('sample').addEventListener('click',()=>{input.value=sample;reset();applyLive();input.focus();});
document.getElementById('clear').addEventListener('click',()=>{input.value='';reset();input.focus();});
function check(){
  result.replaceChildren();copyStatus.textContent='';area.hidden=true;
  const h=document.createElement('h2'),p=document.createElement('p');
  if(!input.value.trim()){h.textContent='Add some text first.';p.textContent='Use the fake example to try a scan.';result.append(h,p);return {findings:[]};}
  let scanned;
  try{scanned=PasteGuard.scan(input.value,scanOptions());}catch(error){h.textContent='Could not check this text.';p.textContent=error.message;result.append(h,p);return {error:error.message};}
  const findings=scanned.findings;
  h.textContent=findings.length ? findings.length+' possible secret'+(findings.length===1?'':'s')+' found.' : 'No selected patterns found.';
  h.className=findings.length?'warning-title':'';
  p.textContent=findings.length?'Review each match. The redacted copy removes these matches only.':'Other secrets or confidential content may still be present. Review before sharing.';
  result.append(h,p);
  if(findings.length){const ul=document.createElement('ul');ul.className='finding-list';for(const item of findings.slice(0,40)){const li=document.createElement('li'),label=document.createElement('span'),line=document.createElement('small');label.textContent=item.type;line.textContent='Line '+item.line;li.append(label,line);ul.append(li);}result.append(ul);if(findings.length>40){const more=document.createElement('p');more.textContent='Showing the first 40 matches. All detected matches are redacted below.';result.append(more);}}
  output.value=scanned.redacted;area.hidden=false;return {findings:findings.map(({type,severity,line})=>({type,severity,line}))};
}
document.getElementById('scan').addEventListener('click',check);
document.getElementById('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(output.value);copyStatus.textContent='Copied. Review the text before you share it.';}catch{output.focus();output.select();copyStatus.textContent='Copy unavailable here. Select the text and copy it manually.';}});
if(document.modelContext?.registerTool){const lifecycle=new AbortController();try{Promise.resolve(document.modelContext.registerTool({name:'check_text_for_secrets',title:'Check text for secrets',description:'Set the visible checker text and run a local pattern scan. Returns finding types and lines without secret values.',inputSchema:{type:'object',properties:{text:{type:'string',maxLength:250000}},required:['text'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute(value){if(!value||typeof value.text!=='string'||value.text.length>PasteGuard.LIMIT||Object.keys(value).some(k=>k!=='text'))throw new Error('Provide text up to 250,000 characters.');input.value=value.text;reset();return check();}},{signal:lifecycle.signal})).catch(()=>{});window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}catch{}}

