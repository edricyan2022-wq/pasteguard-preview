from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from pathlib import Path
import json,re
from engine import Detector

ROOT=Path(__file__).resolve().parent
PORT=4322
ORIGIN=f'http://127.0.0.1:{PORT}'
detector=Detector()
class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args):pass
    def reply(self,status,body,kind='application/json'):
        data=body.encode() if isinstance(body,str) else body
        self.send_response(status)
        self.send_header('Content-Type',kind)
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
        self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
    def valid_host(self):return self.headers.get('Host')==f'127.0.0.1:{PORT}'
    def do_GET(self):
        if not self.valid_host():return self.reply(403,'{}')
        files={'/':('index.html','text/html; charset=utf-8'),'/app.js':('app.js','application/javascript'),'/style.css':('style.css','text/css'),'/detector.js':('detector.js','application/javascript'),'/protection.js':('protection.js','application/javascript')}
        item=files.get(self.path)
        if self.path in ['/fixture.html','/fixture.js','/guard.js']:
            filename=self.path[1:]
            if (ROOT/filename).is_file():item=(filename,'text/html' if filename.endswith('.html') else 'application/javascript')
        if not item:return self.reply(404,'{}')
        self.reply(200,(ROOT/item[0]).read_bytes(),item[1])
    def do_POST(self):
        origin=self.headers.get('Origin')
        # No CORS headers: a foreign website cannot read results or pass a JSON
        # preflight. Chrome's extension worker may omit Origin on local fetches.
        valid_origin=origin is None or origin==ORIGIN or bool(re.fullmatch(r'chrome-extension://[a-p]{32}',origin or ''))
        if not self.valid_host() or not valid_origin or self.headers.get('Content-Type')!='application/json' or self.headers.get('X-PasteGuard')!='local-test':
            return self.reply(403,'{}')
        if self.path!='/scan':return self.reply(404,'{}')
        try:
            size=int(self.headers.get('Content-Length','0'))
            if not 0<size<=16000:raise ValueError('Invalid request size.')
            data=json.loads(self.rfile.read(size))
            if not isinstance(data,dict) or set(data)!={'text'}:raise ValueError('Provide text only.')
            self.reply(200,json.dumps(detector.scan(data['text'])))
        except (ValueError,TypeError):self.reply(400,json.dumps({'error':'Text too large or invalid. Use at most 2,000 characters and 512 tokens.'}))
        except Exception:self.reply(500,json.dumps({'error':'AI scan failed. Text was not declared safe.'}))
print(f'Local AI ready: {ORIGIN}',flush=True)
ThreadingHTTPServer(('127.0.0.1',PORT),Handler).serve_forever()

