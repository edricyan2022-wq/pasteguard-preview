from engine import Detector
from pathlib import Path
import json,statistics
d=Detector()
cases=[
 ('person_location','My name is Olivia Bennett and I live in Austin.', ['Olivia Bennett','Austin']),
 ('simple_password','My password is sunshine.', ['sunshine']),
 ('mixed_password','My password is DemoPass12!.', ['DemoPass12!']),
 ('unlabeled_password','DemoPass12!', ['DemoPass12!']),
 ('email','Contact me at demo@example.com.', ['demo@example.com']),
 ('phone','Call me at (312) 555-0123.', ['(312) 555-0123']),
 ('address','I live at 123 Maple Street in Boston.', ['123 Maple Street','Boston']),
 ('api_key','sk-proj-'+ 'A'*30, ['sk-proj-'+ 'A'*30]),
 ('ordinary','Please help me improve this code and write a clear explanation.', []),
 ('emoji_name','🙂 My name is Olivia Bennett.', ['Olivia Bennett'])]
report=[]
for name,text,expected in cases:
    result=d.scan(text)
    # Coverage requires full removal, not just hiding a piece of the entity.
    utf16=text.encode('utf-16-le')
    def covered(secret):
        a=text.index(secret);b=a+len(secret)
        left=len(text[:a].encode('utf-16-le'))//2;right=len(text[:b].encode('utf-16-le'))//2
        return any(f['start']<=left and f['end']>=right for f in result['findings'])
    report.append({'case':name,'fake_input':text,'expected_items':expected,'full_items_caught':sum(covered(s) for s in expected),**result})
for _ in range(2):d.scan(cases[0][1])
times=[d.scan(cases[0][1])['milliseconds'] for _ in range(20)]
checks={}
try:d.scan('x'*2001);checks['oversize_rejected']=False
except ValueError:checks['oversize_rejected']=True
checks['utf16_offsets_correct']=report[-1]['redacted']=='🙂 My name is [REDACTED].'
checks['ordinary_text_unchanged']=report[-2]['redacted']==cases[-2][1]
result={'model':'onnx-community/bert-small-pii-detection-ONNX','revision':(Path(__file__).parent/'model/REVISION.txt').read_text().strip(),'scope':'Raw AI only; fake-data sample, not accuracy estimate. Rules separately cover API keys and labeled passwords.','cases':report,'checks':checks,'warm_compute_ms':{'median':statistics.median(times),'max':max(times),'min':min(times)}}
(Path(__file__).parent/'AUDIT.json').write_text(json.dumps(result,indent=2))
for row in report:print(row['case'],str(row['full_items_caught'])+'/'+str(len(row['expected_items'])),str(row['milliseconds'])+' ms')
print('Checks:',checks,'Compute:',result['warm_compute_ms'])

