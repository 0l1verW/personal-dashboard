#!/usr/bin/env python3
"""Uni-Apps auf dem Raspberry Pi: liefert die HTML-Dateien aus www/ und speichert
den App-Stand zentral in data/. Nur Python-Standardbibliothek nötig."""
import json, os, re, shutil, sys, time, threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

BASE = os.path.dirname(os.path.abspath(__file__))
WWW, DATA = os.path.join(BASE, 'www'), os.path.join(BASE, 'data')
BACKUPS = os.path.join(DATA, 'backups')
PORT = int(os.environ.get('PORT', sys.argv[1] if len(sys.argv) > 1 else 8080))
KEEP_BACKUPS = 60                      # pro App so viele Tages-Sicherungen behalten
NAME = re.compile(r'^[A-Za-z0-9_\-]{1,80}$')
LOCK = threading.Lock()
SYNC = open(os.path.join(BASE, 'sync.js'), encoding='utf-8').read()
os.makedirs(BACKUPS, exist_ok=True)

def saved_at(obj):
    try: return float(obj.get('savedAt') or 0)
    except Exception: return 0

INDEX = """<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#5B4BE0"><title>Uni-Apps</title>{{ICON}}
<script>try{var t=localStorage.getItem('launcher_theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}</script>
<style>
:root{--bg:#EEF1F8;--card:#fff;--ink:#141B2C;--muted:#5C6680;--border:#E1E6F0;--accent:#5B4BE0;--accent2:#7C6BF0;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0D1016;--card:#161B25;--ink:#EAEEF6;--muted:#98A3B8;--border:#28303F;--accent:#8B7CF5;--accent2:#A396F7;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#0D1016;--card:#161B25;--ink:#EAEEF6;--muted:#98A3B8;--border:#28303F;--accent:#8B7CF5;--accent2:#A396F7;color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;min-height:100vh}
main{max-width:520px;margin:0 auto;padding:max(32px,env(safe-area-inset-top)) 16px 32px}
header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}
h1{font-size:30px;margin:0;letter-spacing:-.5px}
.tb{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;border:1px solid var(--border);background:var(--card);color:var(--ink);font-size:18px;cursor:pointer}
ul{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px}
a{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:14px;background:var(--card);border:1px solid var(--border);color:var(--ink);text-decoration:none;font-weight:600;transition:border-color .15s,transform .15s}
a:hover{border-color:var(--accent);transform:translateY(-1px)}
.ic{width:44px;height:44px;border-radius:11px;flex:none;display:block}
.nm{flex:1}.ar{color:var(--muted)}
p{color:var(--muted);font-size:13px;margin-top:18px}
</style></head><body><main>
<header><h1>Uni-Apps</h1><button class="tb" id="tb" title="Hell / Dunkel" aria-label="Farbschema wechseln"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></button></header>
<ul>{{ITEMS}}</ul>
<p>Daten werden über den Raspberry Pi zwischen deinen Geräten abgeglichen.</p>
</main><script>
document.getElementById('tb').onclick=function(){
  var r=document.documentElement, cur=r.getAttribute('data-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'), nx=cur==='dark'?'light':'dark';
  r.setAttribute('data-theme',nx);
  try{['launcher_theme','sp_theme','cockpit_theme'].forEach(function(k){localStorage.setItem(k,nx);});}catch(e){}
};
</script></body></html>"""

def icon_of(n):
    low = n.lower()
    return 'planer' if 'semester' in low or 'planer' in low else 'noten' if 'noten' in low or 'cockpit' in low else 'uni'

def icon_tags(ic, title):
    return (f'<link rel="apple-touch-icon" href="/icons/{ic}-180.png">'
            f'<link rel="icon" type="image/png" sizes="64x64" href="/icons/{ic}-64.png">'
            f'<link rel="manifest" href="/manifest-{ic}.json">'
            + ('<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">'
               '<meta name="apple-mobile-web-app-status-bar-style" content="default">' if ic != 'uni' else '')   # Startseite bleibt in Safari (sonst kein Zurück)
            + f'<meta name="apple-mobile-web-app-title" content="{title}">')

class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=WWW, **k)
    def log_message(self, fmt, *a): pass
    def send(self, code, body=b'', ctype='application/json'):
        self.send_response(code); self.send_header('Content-Type', ctype)
        self.send_header('Cache-Control', 'no-store'); self.send_header('Content-Length', str(len(body)))
        self.end_headers(); self.wfile.write(body)

    def key(self):
        p = self.path.split('?')[0]
        if not p.startswith('/api/'): return None
        k = p[5:]; return k if NAME.match(k) else ''

    def do_GET(self):
        mf = re.match(r'^/manifest-(uni|planer|noten)\.json$', self.path.split('?')[0])
        if mf:
            ic = mf.group(1); names = {'uni': ('Uni-Apps', 'Uni', '/'), 'planer': ('Semesterplaner', 'Planer', '/Semesterplaner.html'), 'noten': ('Notencockpit', 'Noten', '/Notencockpit.html')}
            n, sn, start = names[ic]
            body = json.dumps({'name': n, 'short_name': sn, 'start_url': start, 'display': 'standalone', 'background_color': '#0D1016', 'theme_color': '#5B4BE0',
                               'icons': [{'src': f'/icons/{ic}-192.png', 'sizes': '192x192', 'type': 'image/png'}, {'src': f'/icons/{ic}-512.png', 'sizes': '512x512', 'type': 'image/png'}]})
            return self.send(200, body.encode(), 'application/manifest+json')
        m = re.match(r'^/([a-z0-9_-]{1,40})\.ics$', self.path.split('?')[0])
        if m:                                       # Kalender-Abos: /abgaben.ics, /termine.ics, /kalender.ics
            f = os.path.join(DATA, 'ics_' + m.group(1) + '.ics')
            if not os.path.exists(f):
                return self.send(404, b'Kalender noch nicht vorhanden - einmal den Semesterplaner auf dem Pi oeffnen.', 'text/plain; charset=utf-8')
            with open(f, 'rb') as fh: return self.send(200, fh.read(), 'text/calendar; charset=utf-8')
        k = self.key()
        if k is not None:
            if not k: return self.send(400)
            f = os.path.join(DATA, k + '.json')
            if not os.path.exists(f): return self.send(404)
            with open(f, 'rb') as fh: return self.send(200, fh.read())
        p = self.path.split('?')[0]
        if p == '/': return self.index()
        if p.endswith('.html') or p.endswith('.htm'):
            f = os.path.join(WWW, os.path.normpath(p.lstrip('/')))
            if not f.startswith(WWW) or not os.path.isfile(f): return self.send(404, b'nicht gefunden', 'text/plain')
            html = open(f, encoding='utf-8').read()
            low = os.path.basename(f).lower()
            ic, title = ('planer', 'Planer') if 'semester' in low or 'planer' in low else ('noten', 'Noten') if 'noten' in low or 'cockpit' in low else ('uni', os.path.basename(f)[:-5])
            tag = icon_tags(ic, title) + '<script>' + SYNC + '</script>'
            m = re.search(r'<head[^>]*>', html, re.I)
            html = html[:m.end()] + tag + html[m.end():] if m else tag + html
            return self.send(200, html.encode('utf-8'), 'text/html; charset=utf-8')
        return super().do_GET()

    def index(self):
        items = ''.join(
            f'<li><a href="/{n}"><img class="ic" src="/icons/{icon_of(n)}-180.png" alt=""><span class="nm">{n[:-5]}</span><span class="ar">→</span></a></li>'
            for n in sorted(os.listdir(WWW), key=str.lower) if n.endswith('.html'))
        page = INDEX.replace('{{ITEMS}}', items).replace('{{ICON}}', icon_tags('uni', 'Uni'))
        self.send(200, page.encode('utf-8'), 'text/html; charset=utf-8')

    def do_PUT(self):
        k = self.key()
        if not k: return self.send(400)
        n = int(self.headers.get('Content-Length') or 0)
        if n <= 0 or n > 20_000_000: return self.send(413)
        raw = self.rfile.read(n)
        if k.startswith('ics_'):                    # Kalender-Abo: fertige .ics vom Semesterplaner
            if n > 5_000_000 or not raw.lstrip().startswith(b'BEGIN:VCALENDAR'): return self.send(400)
            f = os.path.join(DATA, k + '.ics'); tmp = f + '.tmp'
            with LOCK:
                with open(tmp, 'wb') as fh: fh.write(raw); fh.flush(); os.fsync(fh.fileno())
                os.replace(tmp, f)
            return self.send(200, b'{"ok":true}')
        try: new = json.loads(raw)
        except Exception: return self.send(400, b'{"error":"kein JSON"}')
        if not isinstance(new, dict): return self.send(400)
        f = os.path.join(DATA, k + '.json')
        with LOCK:
            if os.path.exists(f):
                try: old = json.load(open(f, encoding='utf-8'))
                except Exception: old = {}
                if saved_at(new) < saved_at(old):     # älterer Stand darf neueren nicht überschreiben
                    return self.send(409, b'{"error":"aelter als Server-Stand"}')
                day = time.strftime('%Y-%m-%d')
                bk = os.path.join(BACKUPS, f'{k}_{day}.json')
                if not os.path.exists(bk): shutil.copy2(f, bk)
                olds = sorted(x for x in os.listdir(BACKUPS) if x.startswith(k + '_'))
                for x in olds[:-KEEP_BACKUPS]: os.remove(os.path.join(BACKUPS, x))
            tmp = f + '.tmp'
            with open(tmp, 'wb') as fh: fh.write(raw); fh.flush(); os.fsync(fh.fileno())
            os.replace(tmp, f)
        self.send(200, b'{"ok":true}')
    do_POST = do_PUT   # für sendBeacon beim Schließen

if __name__ == '__main__':
    print(f'Uni-Apps laufen auf Port {PORT} – Daten in {DATA}')
    ThreadingHTTPServer(('0.0.0.0', PORT), H).serve_forever()
