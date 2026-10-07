const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
let handler,calls=0,lastUrl,state={enabled:true,aiEnabled:true};
const ctx={URL,AbortSignal,fetch:async(url,options)=>{calls++;lastUrl=url;assert.equal(options.method,'POST');return {ok:true,json:async()=>({findings:[],redacted:JSON.parse(options.body).text})};},chrome:{runtime:{id:'test',onMessage:{addListener:fn=>handler=fn}},storage:{local:{get:async()=>state}}}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../extension/background.js'),'utf8'),ctx);
const ask=(request,sender={id:'test',url:'https://chatgpt.com/'})=>new Promise(resolve=>{const ongoing=handler(request,sender,resolve);if(ongoing!==true)resolve(null);});
(async()=>{
 assert.equal(await ask({type:'pasteguard-local-ai',text:'fake'},{id:'other',url:'https://chatgpt.com/'}),null);
 assert.match((await ask({type:'pasteguard-local-ai',text:'fake'},{id:'test',url:'https://evil.example/'})).error,/Unsupported/);
 assert.match((await ask({type:'pasteguard-local-ai',text:'x'.repeat(2001)})).error,/Unsupported/);assert.equal(calls,0);
 state.enabled=false;assert.match((await ask({type:'pasteguard-local-ai',text:'fake'})).error,/OFF/);assert.equal(calls,0);
 state.enabled=true;assert.equal((await ask({type:'pasteguard-local-ai',text:'fake'})).redacted,'fake');assert.equal(lastUrl,'http://127.0.0.1:4322/scan');assert.equal(calls,1);
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../extension/manifest.json'),'utf8'));assert.equal(manifest.version,'0.3.0');assert.equal(manifest.host_permissions.join(','),'http://127.0.0.1/*');assert.equal(manifest.permissions.join(','),'storage');
 console.log('PASS sender validation, supported host, size limit, OFF/no-fetch, fixed local endpoint, manifest');
})();

