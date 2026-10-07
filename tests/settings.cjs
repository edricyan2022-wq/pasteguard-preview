const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const elements=new Map(),saved=[];for(const name of ['protection-toggle','protection-status','likely-toggle','ai-toggle'])elements.set(name,{checked:false,disabled:true,listeners:{},addEventListener(event,fn){this.listeners[event]=fn;}});
const ctx={document:{getElementById:id=>elements.get(id)},likelyToggle:elements.get('likely-toggle'),chrome:{storage:{local:{get:async defaults=>defaults,set:async values=>saved.push(values)}}}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../extension/settings.js'),'utf8'),ctx);
(async()=>{await Promise.resolve();for(const [id,key] of [['protection-toggle','enabled'],['likely-toggle','detectLikelySecrets'],['ai-toggle','aiEnabled']]){const el=elements.get(id);assert.equal(el.disabled,false);assert.equal(el.checked,false);el.checked=true;await el.listeners.change();assert.equal(el.disabled,false);assert.equal(saved.at(-1)[key],true);}console.log('PASS all three settings initialize OFF and save without errors');})();

