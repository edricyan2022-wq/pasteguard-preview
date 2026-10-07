(function(root){
  'use strict';
  function attach({window:win,document:doc,isEnabled,getScanOptions=()=>({}),isAIEnabled=()=>false,requestAIScan=null,onRedact=()=>{},onError=()=>{}}){
    let editing=false,continuation=null,aiTimer,aiEpoch=0;
    function target(event){
      const origin=event.composedPath().find(n=>n instanceof win.Element);if(!origin)return;
      if(origin.matches('textarea,input'))return !origin.readOnly&&!origin.disabled&&(origin.matches('textarea')||['text','search','url','email','tel'].includes(origin.type))?origin:undefined;
      if(!origin.isContentEditable)return;
      let host=origin;while(host.parentElement?.isContentEditable)host=host.parentElement;
      return host;
    }
    function selection(el){
      if(el.matches('textarea,input'))return {text:el.value,start:el.selectionStart??el.value.length,end:el.selectionEnd??el.value.length};
      const text=el.textContent||'',s=win.getSelection();if(!s?.rangeCount||!el.contains(s.anchorNode)||!el.contains(s.focusNode))return {text,start:text.length,end:text.length};
      const range=s.getRangeAt(0),prefix=range.cloneRange();prefix.selectNodeContents(el);prefix.setEnd(range.startContainer,range.startOffset);const start=prefix.toString().length;
      return {text,start,end:start+range.toString().length};
    }
    function write(el,text,caret,inputType){
      editing=true;
      try{
        if(el.matches('textarea,input')){const proto=el.matches('textarea')?win.HTMLTextAreaElement.prototype:win.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,text);if(el.selectionStart!==null)el.setSelectionRange(caret,caret);}
        else{el.textContent=text;const s=win.getSelection(),r=doc.createRange();if(el.firstChild)r.setStart(el.firstChild,Math.min(caret,el.firstChild.length));else r.setStart(el,0);r.collapse(true);s.removeAllRanges();s.addRange(r);}
        el.dispatchEvent(new win.InputEvent('input',{bubbles:true,composed:true,inputType:inputType||'insertText',data:null}));
      }finally{editing=false;}
    }
    function clean(el,text,caret,inputType){
      const scan=root.PasteGuard.scan(text,getScanOptions());if(!scan.findings.length)return false;
      let adjusted=caret;
      for(const f of scan.findings){if(caret>=f.end)adjusted+=10-(f.end-f.start);else if(caret>f.start)adjusted+=10-(caret-f.start);}
      write(el,scan.redacted,Math.max(0,Math.min(scan.redacted.length,adjusted)),inputType);onRedact(scan.findings);return true;
    }
    function before(event){
      if(!isEnabled()||editing||event.isComposing||!event.cancelable||event.inputType!=='insertText'||typeof event.data!=='string')return;
      const el=target(event);if(!el)return;
      const s=selection(el);
      if(continuation?.el===el&&s.start===s.end&&s.start===continuation.caret&&!/[\s"'`,;<>]/.test(event.data)){event.preventDefault();event.stopImmediatePropagation();return;}
      continuation=null;
      const candidate=s.text.slice(0,s.start)+event.data+s.text.slice(s.end),caret=s.start+event.data.length;
      try{const scan=root.PasteGuard.scan(candidate,getScanOptions());if(!scan.findings.length)return;event.preventDefault();event.stopImmediatePropagation();clean(el,candidate,caret,event.inputType);if(scan.findings.some(f=>caret>f.start&&caret<=f.end))continuation={el,caret:selection(el).start};}catch(error){event.preventDefault();event.stopImmediatePropagation();onError(error.message);}
    }
    function paste(event){
      if(!isEnabled()||editing||!event.cancelable||!event.clipboardData)return;
      continuation=null;const el=target(event),text=event.clipboardData.getData('text/plain');if(!el||!text)return;
      const s=selection(el),candidate=s.text.slice(0,s.start)+text+s.text.slice(s.end);
      try{const scan=root.PasteGuard.scan(candidate,getScanOptions());if(!scan.findings.length)return;event.preventDefault();event.stopImmediatePropagation();clean(el,candidate,s.start+text.length,'insertFromPaste');}catch(error){event.preventDefault();event.stopImmediatePropagation();onError(error.message);}
    }
    function fallback(event){if(!isEnabled()||editing||event.isComposing)return;continuation=null;const el=target(event);if(!el)return;const s=selection(el);try{clean(el,s.text,s.start,event.inputType);}catch(error){onError(error.message);}}
    function cancelAI(){aiEpoch++;win.clearTimeout(aiTimer);}
    function scheduleAI(event){
      cancelAI();if(!requestAIScan||!isEnabled()||!isAIEnabled()||event.isComposing)return;
      const el=target(event);if(!el)return;
      const stamp=aiEpoch;
      aiTimer=win.setTimeout(async()=>{
        if(!isEnabled()||!isAIEnabled()||stamp!==aiEpoch)return;
        const snapshot=selection(el).text;if(!snapshot.trim())return;
        if(snapshot.length>2000){onError('AI text limit exceeded. Shorten to 2,000 characters.');return;}
        try{
          const result=await requestAIScan(snapshot);
          if(stamp!==aiEpoch||!isEnabled()||!isAIEnabled()||selection(el).text!==snapshot||!(doc.activeElement===el||el.contains(doc.activeElement)))return;
          if(result.error)throw new Error(result.error);
          if(!Array.isArray(result.findings)||typeof result.redacted!=='string')throw new Error('Invalid AI result.');
          if(!result.findings.length)return;
          let caret=selection(el).start;
          for(const f of result.findings){if(caret>=f.end)caret+=10-(f.end-f.start);else if(caret>f.start)caret+=10-(caret-f.start);}
          // Do not schedule an endless scan of our own replacement event.
          write(el,result.redacted,Math.max(0,Math.min(result.redacted.length,caret)),'insertReplacementText');
          cancelAI();onRedact(result.findings);
        }catch(error){if(stamp===aiEpoch&&isEnabled()&&isAIEnabled())onError(error.message);}
      },300);
    }
    function resetContinuation(){continuation=null;cancelAI();}
    function navigation(event){if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown','Tab','Escape','Backspace','Delete'].includes(event.key)||event.ctrlKey||event.metaKey)resetContinuation();}
    win.addEventListener('beforeinput',before,true);win.addEventListener('paste',paste,true);win.addEventListener('input',fallback,true);win.addEventListener('input',scheduleAI,true);win.addEventListener('compositionend',fallback,true);win.addEventListener('compositionend',scheduleAI,true);win.addEventListener('keydown',navigation,true);win.addEventListener('pointerdown',resetContinuation,true);win.addEventListener('focusout',resetContinuation,true);
    const detach=()=>{cancelAI();win.removeEventListener('beforeinput',before,true);win.removeEventListener('paste',paste,true);win.removeEventListener('input',fallback,true);win.removeEventListener('input',scheduleAI,true);win.removeEventListener('compositionend',fallback,true);win.removeEventListener('compositionend',scheduleAI,true);win.removeEventListener('keydown',navigation,true);win.removeEventListener('pointerdown',resetContinuation,true);win.removeEventListener('focusout',resetContinuation,true);};
    detach.resetContinuation=resetContinuation;return detach;
  }
  root.PasteGuardProtection=Object.freeze({attach});
})(globalThis);

