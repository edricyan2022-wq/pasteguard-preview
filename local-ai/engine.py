"""Local token classifier. No model downloads, networking, or snippet logs."""
from pathlib import Path
import json, time, threading
import numpy as np
import onnxruntime as ort
from tokenizers import Tokenizer

ROOT=Path(__file__).resolve().parent
LABELS={'PASSWORD','PERSON','LOCATION','EMAIL_ADDRESS','PHONE_NUMBER','CREDIT_CARD',
        'IBAN_CODE','US_BANK_NUMBER','US_DRIVER_LICENSE','US_ITIN','US_PASSPORT',
        'US_SSN','FINANCIAL','COORDINATE','IMEI','MAC_ADDRESS','IP_ADDRESS'}

class Detector:
    def __init__(self):
        self.tokenizer=Tokenizer.from_file(str(ROOT/'model/tokenizer.json'))
        self.tokenizer.no_truncation()
        self.labels=json.loads((ROOT/'model/config.json').read_text())['id2label']
        options=ort.SessionOptions();options.intra_op_num_threads=4
        self.session=ort.InferenceSession(str(ROOT/'model/model_int8.onnx'),options,providers=['CPUExecutionProvider'])
        self.lock=threading.Lock()

    def scan(self,text):
        if not isinstance(text,str) or len(text)>2000:
            raise ValueError('Use at most 2,000 characters in this AI test.')
        start=time.perf_counter()
        with self.lock:
            enc=self.tokenizer.encode(text)
            if len(enc.ids)>512:raise ValueError('Too many tokens. Shorten the text; no partial scan was performed.')
            values={'input_ids':enc.ids,'attention_mask':enc.attention_mask,'token_type_ids':enc.type_ids}
            feed={inp.name:np.array([values[inp.name]],dtype=np.int64) for inp in self.session.get_inputs()}
            logits=self.session.run(None,feed)[0][0]
        logits=logits-logits.max(axis=1,keepdims=True)
        probabilities=np.exp(logits);probabilities/=probabilities.sum(axis=1,keepdims=True)
        spans=[]
        for offset,row in zip(enc.offsets,probabilities):
            a,b=offset
            if a==b:continue
            index=int(row.argmax());label=self.labels[str(index)];score=float(row[index])
            kind=label[2:] if label.startswith(('B-','I-')) else label
            if kind not in LABELS or score<0.75:continue
            # Merge neighboring word pieces carrying the same entity label.
            if spans and spans[-1]['type']==kind and label.startswith('I-') and a>=spans[-1]['end'] and not text[spans[-1]['end']:a].strip():
                spans[-1]['end']=b;spans[-1]['score']=min(spans[-1]['score'],score)
            else:spans.append({'start':a,'end':b,'type':kind,'score':score})
        for span in spans:
            if span['type']=='PASSWORD':
                while span['start']>0 and text[span['start']-1] not in ' \n\t\r\"\'`,;<>:= ':
                    span['start']-=1
                while span['end']<len(text) and text[span['end']] not in ' \n\t\r\"\'`,;<>':
                    span['end']+=1
        merged=[]
        for span in sorted(spans,key=lambda s:(s['start'],-s['end'])):
            if '[REDACTED]' in text[span['start']:span['end']]:continue
            if merged and span['start']<merged[-1]['end']:
                merged[-1]['end']=max(merged[-1]['end'],span['end'])
            else:merged.append(span)
        # Browser caret and slicing use UTF-16 offsets, unlike Python's strings.
        findings=[{**s,'start':len(text[:s['start']].encode('utf-16-le'))//2,
                   'end':len(text[:s['end']].encode('utf-16-le'))//2} for s in merged]
        pieces=[];cursor=0
        for span in merged:pieces.extend([text[cursor:span['start']],'[REDACTED]']);cursor=span['end']
        pieces.append(text[cursor:])
        return {'redacted':''.join(pieces),'findings':findings,'milliseconds':round((time.perf_counter()-start)*1000,2)}

