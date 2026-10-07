const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const context={};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'extension/detector.js'),'utf8'),context);
const scan=context.PasteGuard.scan;let passed=0;
function test(name,fn){fn();passed++;process.stdout.write('PASS '+name+'\n');}
test('fake AWS key and line number',()=>{const s=scan('hello\nAKIA0000000000000000');assert.equal(s.findings[0].line,2);assert.equal(s.redacted,'hello\n[REDACTED]');});
test('redacts value, preserves assignment',()=>assert.equal(scan('password="DemoPassword_4829"').redacted,'password="[REDACTED]"'));
test('JSON password and bearer credentials',()=>assert.equal(scan('{"password":"DemoPassword_4829"}\nBearer FAKE_TOKEN_123456789012').findings.length,2));
test('overlapping API assignment becomes one match',()=>{const s=scan('api_key="sk-proj-'+ 'A'.repeat(30)+'"');assert.equal(s.findings.length,1);assert.equal(s.redacted,'api_key="[REDACTED]"');});
test('private key block and truncated block',()=>{assert.equal(scan('-----BEGIN PRIVATE KEY-----\nFAKE\n-----END PRIVATE KEY-----').redacted,'[REDACTED]');assert.equal(scan('-----BEGIN RSA PRIVATE KEY-----\nFAKE').redacted,'[REDACTED]');});
test('database credentials',()=>assert.equal(scan('postgres://demo:FAKE_PASS@localhost/db').redacted,'postgres://[REDACTED]@localhost/db'));
test('normal code and placeholders',()=>{assert.equal(scan('const hello = 123;\napi_key=YOUR_API_KEY\npassword=changeme').findings.length,0);});
test('provider patterns',()=>{for(const text of ['ghp_'+'A'.repeat(36),'github_pat_'+'A'.repeat(30),'sk_live_'+'A'.repeat(24),'xoxb-'+'A'.repeat(24),'sk-ant-api03-'+'A'.repeat(30)])assert.equal(scan(text).findings.length,1,text);});
test('oversize fails explicitly',()=>assert.throws(()=>scan('a'.repeat(250001)),/too large/));
test('repeated calls are deterministic',()=>{assert.equal(scan('password=DemoPassword_4829').findings.length,1);assert.equal(scan('password=DemoPassword_4829').findings.length,1);});
test('many findings with correct redaction',()=>{const s=scan('password=FAKE_SECRET_123\n'.repeat(9000));assert.equal(s.findings.length,9000);assert.equal(s.findings[8999].line,9000);assert(!s.redacted.includes('FAKE_SECRET'));});

test('email redaction',()=>assert.equal(scan('Email: demo@example.com').redacted,'Email: [REDACTED]'));
test('US phone redaction',()=>assert.equal(scan('(312) 555-0123').redacted,'[REDACTED]'));
test('SSN-like redaction',()=>assert.equal(scan('123-45-6789').redacted,'[REDACTED]'));
test('card checksum and redaction',()=>assert.equal(scan('4242 4242 4242 4242').redacted,'[REDACTED]'));
test('invalid card left alone',()=>assert.equal(scan('4242 4242 4242 4243').findings.length,0));
test('combined PII and secret sample',()=>assert.equal(scan('demo@example.com (312) 555-0123 123-45-6789 password=FAKE_SECRET_123').findings.length,4));
test('redacted text has no new findings',()=>assert.equal(scan(scan('password=FAKE_SECRET_123 demo@example.com').redacted).findings.length,0));
test('long labeled secrets leave no tail',()=>assert.equal(scan('password='+ 'A'.repeat(3000)).redacted,'password=[REDACTED]'));
test('long bearer credentials leave no tail',()=>assert.equal(scan('Bearer '+ 'A'.repeat(3000)).redacted,'Bearer [REDACTED]'));
test('near-limit labeled secret leaves no tail',()=>assert.equal(scan('password='+ 'A'.repeat(249991)).redacted,'password=[REDACTED]'));
test('long dotted non-email is unchanged',()=>{const text='a.'.repeat(125000);assert.equal(scan(text).redacted,text);});
test('long dotted string with invalid email domain is unchanged',()=>{const text='a.'.repeat(120000)+'@localhost';assert.equal(scan(text).redacted,text);});
test('dotted email, punctuation and multiple addresses',()=>assert.equal(scan('first.last+tag@example.com, second@example.org!').redacted,'[REDACTED], [REDACTED]!'));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'extension/manifest.json'),'utf8'));
test('password in ordinary sentence',()=>assert.equal(scan('My password is DemoPassword_4829 please hide it').redacted,'My password is [REDACTED] please hide it'));
test('API key in ordinary sentence',()=>assert.equal(scan('The API key is FAKE_TOKEN_1234567890').redacted,'The API key is [REDACTED]'));
test('unlabeled guessing is opt-in',()=>assert.equal(scan('DemoPass12!').findings.length,0));
test('mixed unlabeled password in sentence',()=>assert.equal(scan('Use DemoPass12! here',{detectLikelySecrets:true}).redacted,'Use [REDACTED] here'));
test('long mixed token without provider prefix',()=>assert.equal(scan('aB3dE6gH9jK2mN5pQ8sT1vW4yZ7',{detectLikelySecrets:true}).redacted,'[REDACTED]'));
test('guessing keeps normal prose and placeholders',()=>{const text='Please fix our documentation. YOUR_API_KEY [REDACTED] changeme';assert.equal(scan(text,{detectLikelySecrets:true}).redacted,text);});
test('guessing is idempotent',()=>{const first=scan('DemoPass12! sk-proj-'+ 'A'.repeat(30),{detectLikelySecrets:true});assert.equal(scan(first.redacted,{detectLikelySecrets:true}).redacted,first.redacted);});
test('limited hosts and storage permission',()=>{assert.equal(manifest.content_scripts[0].matches.length,3);assert.equal(manifest.permissions.join(','),'storage');});
process.stdout.write(passed+' detector/package checks passed.\n');


