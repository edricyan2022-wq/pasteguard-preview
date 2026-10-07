"""Download model assets only. Install requirements.txt first."""
from pathlib import Path
import urllib.request,hashlib
ROOT=Path(__file__).resolve().parent/'model';ROOT.mkdir(exist_ok=True)
REVISION='6cb4e77c2b2c7f81e731b88cffa9b7a6fc675a4c'
BASE=f'https://huggingface.co/onnx-community/bert-small-pii-detection-ONNX/resolve/{REVISION}/'
for name in ['config.json','tokenizer.json','README.md','onnx/model_int8.onnx']:
    dest=ROOT/Path(name).name
    urllib.request.urlretrieve(BASE+name,dest)
    if name.endswith('.onnx') and hashlib.sha256(dest.read_bytes()).hexdigest()!='40e94266f077c088d3dda3e12fe7be8faa1cae862c3e3fe84b799439c509095a':
        raise RuntimeError('Model checksum failed. Do not run.')
(ROOT/'REVISION.txt').write_text(REVISION)
print('Local AI model ready. Start server.py to use it.')

