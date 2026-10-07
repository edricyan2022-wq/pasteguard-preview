(function(root) {
  'use strict';
  const LIMIT = 250000;
  const rules = [
    ['Private key', 'high', /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----[\s\S]*?(?:-----END (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----|$)/g],
    ['AWS access key ID', 'high', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
    ['GitHub token', 'high', /\b(?:gh[pousr]_[A-Za-z0-9]{36,255}|github_pat_[A-Za-z0-9_]{22,255})\b/g],
    ['API secret key', 'high', /\bsk-(?:proj-|ant-api\d{2}-)?[A-Za-z0-9_-]{20,255}\b/g],
    ['Stripe secret key', 'high', /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,255}\b/g],
    ['Slack token', 'high', /\bxox[baprs]-[A-Za-z0-9-]{16,255}\b/g],
    ['Bearer credential', 'review', /\bBearer\s+([A-Za-z0-9._~+\/-]{12,}={0,2})/gi, 1],
    ['Password or secret in a sentence', 'review', /\b(?:password|passwd|pwd|api[ _-]?key|api[ _-]?secret|client[ _-]?secret|access[ _-]?token|secret[ _-]?key)\s+(?:is|equals)\s+["']?([^\s"'`,;<>]{6,})/gi, 1],
    ['Possible password or secret', 'review', /\b(?:password|passwd|pwd|api[_-]?key|api[_-]?secret|client[_-]?secret|access[_-]?token|secret[_-]?key|aws[_-]?secret[_-]?access[_-]?key)["']?\s*[:=]\s*["']?([^\s"'`,;<>]{6,})/gi, 1],
    ['Database URL credentials', 'high', /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/([^\s/@]+:[^\s/@]+)@/gi, 1],
    ['US phone number', 'review', /(?<!\w)(?:\+1[ .-]?)?(?:\([2-9]\d{2}\)[ .-]?|[2-9]\d{2}[ .-])[2-9]\d{2}[ .-]\d{4}(?!\d)/g],
    ['SSN-like number', 'review', /\b(?!000|666|9\d\d)\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g],
    ['Payment card-like number', 'review', /(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)/g, 0, value=>{const digits=value.replace(/\D/g,'');if(digits.length<13||digits.length>19||/^(\d)\1+$/.test(digits))return false;let sum=0;for(let i=digits.length-1,j=0;i>=0;i--,j++){let n=Number(digits[i]);if(j%2){n*=2;if(n>9)n-=9;}sum+=n;}return sum%10===0;}]
  ];
  const placeholders = /^(?:\[REDACTED\]|<[^>]+>|\$\{[^}]+\}|\*+|your[_-].*|changeme|example|placeholder|undefined|null)$/i;
  function scan(text, {detectLikelySecrets=false}={}) {
    if(typeof text !== 'string') throw new TypeError('Text is required.');
    if(text.length > LIMIT) throw new RangeError('Text is too large. Check a smaller section (250,000 characters maximum).');
    const candidates=[];
    // Opt-in heuristic, not proof that a string is a secret. Never guess
    // inside URLs, paths, assignments or placeholders; exact rules handle those.
    if(detectLikelySecrets){
      for(const match of text.matchAll(/[^\s"'`,;<>]+/g)){
        const value=match[0];
        if(value.length<10 || value.length>4096 || placeholders.test(value) || /[:=\/\\@]/.test(value))continue;
        const classes=[/[a-z]/,/[A-Z]/,/\d/,/[^A-Za-z0-9]/].filter(r=>r.test(value)).length;
        const passwordLike=classes===4 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);
        const tokenLike=value.length>=24 && classes>=3 && new Set(value).size>=12;
        if(passwordLike||tokenLike)candidates.push({type:'Possible unlabeled secret',severity:'review',start:match.index,end:match.index+value.length});
      }
    }
    // Walk from each @ instead of retrying a greedy local-part expression at
    // every word boundary. Long dotted strings otherwise cause quadratic work.
    const localChar=/[A-Z0-9.!#$%&'*+\/=?^_`{|}~-]/i;
    const domain=/^[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?)+\b/i;
    for(let at=text.indexOf('@');at!==-1;at=text.indexOf('@',at+1)){
      let start=at;while(start>0&&localChar.test(text[start-1]))start--;
      while(start<at&&!/[A-Z0-9_]/i.test(text[start]))start++;
      if(start===at)continue;
      const match=domain.exec(text.slice(at+1));
      if(match)candidates.push({type:'Email address',severity:'review',start,end:at+1+match[0].length});
    }
    for(const [type,severity,regex,group,validate] of rules) {
      regex.lastIndex=0;
      for(const match of text.matchAll(regex)) {
        const value=group ? match[group] : match[0];
        if(validate && !validate(value)) continue;
        if(group && placeholders.test(value)) continue;
        const start=match.index+(group ? match[0].lastIndexOf(value) : 0);
        candidates.push({type,severity,start,end:start+value.length});
      }
    }
    candidates.sort((a,b)=>a.start-b.start || b.end-a.end);
    const findings=[];
    let line=1,lineCursor=0;
    for(const item of candidates) {
      if(findings.length && item.start<findings[findings.length-1].end) continue;
      while(lineCursor<item.start){if(text[lineCursor]==='\n')line++;lineCursor++;}
      findings.push({...item,line});
    }
    const pieces=[];let cursor=0;
    for(const item of findings){pieces.push(text.slice(cursor,item.start),'[REDACTED]');cursor=item.end;}
    pieces.push(text.slice(cursor));const redacted=pieces.join('');
    return {findings,redacted};
  }
  root.PasteGuard=Object.freeze({scan,LIMIT});
})(globalThis);

