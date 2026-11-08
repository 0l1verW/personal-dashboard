#!/usr/bin/env python3
"""Personal Dashboard auf dem Raspberry Pi: liefert die Tools aus www/, das Dashboard (/) und
speichert den Stand jedes Tools zentral in data/. Nur Python-Standardbibliothek nötig.
Welche Tools es gibt, steht in apps.json (Register) – neues Tool = HTML-Datei + Icons + Eintrag."""
import gzip, hashlib, hmac, http.cookies, io, json, os, re, secrets, shutil, socket, subprocess, sys, time, threading, zipfile
from urllib.parse import urlparse, parse_qs
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

BASE = os.path.dirname(os.path.abspath(__file__))
WWW, DATA = os.path.join(BASE, 'www'), os.path.join(BASE, 'data')
BACKUPS = os.path.join(DATA, 'backups')
PORT = int(os.environ.get('PORT', sys.argv[1] if len(sys.argv) > 1 and sys.argv[1].isdigit() else 8080))
KEEP_BACKUPS = 60                      # pro Key so viele Tages-Sicherungen behalten
NAME = re.compile(r'^[A-Za-z0-9_\-]{1,80}$')
LOCK = threading.Lock()
os.makedirs(BACKUPS, exist_ok=True)
TITLE = 'Personal Dashboard'

def read(name):
    with open(os.path.join(BASE, name), encoding='utf-8') as f: return f.read()

_reg = {'mt': None, 'apps': []}
def apps():
    """Register aus apps.json – wird bei Änderung der Datei neu gelesen (kein Neustart nötig)."""
    f = os.path.join(BASE, 'apps.json')
    try:
        mt = os.path.getmtime(f)
        if mt != _reg['mt']:
            with open(f, encoding='utf-8') as fh: _reg['apps'] = [a for a in json.load(fh) if a.get('id') and a.get('datei')]
            _reg['mt'] = mt
    except Exception as e:
        print('apps.json nicht lesbar:', e)
    return _reg['apps']

def app_of_file(fname):
    low = fname.lower()
    for a in apps():
        if a['datei'].lower() == low: return a
    return None

def installed():
    """Register-Tools, deren Datei vorhanden ist, plus unbekannte HTML-Dateien in www/ (wie früher)."""
    files = {n.lower(): n for n in os.listdir(WWW) if n.lower().endswith('.html')}
    out = []
    for a in apps():
        if a['datei'].lower() in files: out.append({**a, 'datei': files[a['datei'].lower()]})
    known = {a['datei'].lower() for a in apps()}
    for low, n in sorted(files.items()):
        if low not in known and low != 'index.html':
            out.append({'id': re.sub(r'[^a-z0-9]', '', low[:-5])[:20] or 'tool', 'datei': n, 'titel': n[:-5], 'kurz': n[:-5], 'gruppe': 'Weitere', 'keys': []})
    return out

def all_keys():
    return sorted({k for a in apps() for k in a.get('keys', [])})

def liste_keys():
    return sorted({k for a in apps() if a.get('sync') == 'liste' for k in a.get('keys', [])})

TOMB_DAYS = 60   # gelöschte Einträge so lange als Grabstein behalten (damit Offline-Geräte sie nicht wiederbeleben)
def is_coll(d):
    return isinstance(d, dict) and all(isinstance(v, dict) and 'upd' in v for v in d.values())
def merge(old, new):
    """Modus „liste“: Sammlungen ({id:{…,upd}}) pro Eintrag zusammenführen – der neuere upd gewinnt.
    Objekte mit upd (z. B. Einstellungen) als Ganzes nach upd, alles andere nach savedAt."""
    newer = saved_at(new) >= saved_at(old); out = dict(old)
    cut = (time.time() - TOMB_DAYS * 86400) * 1000
    for k, v in new.items():
        o = old.get(k)
        if isinstance(v, dict) and isinstance(o, dict) and is_coll(v) and is_coll(o) and (v or o) and not ('upd' in v and not is_coll(v)):
            c = dict(o)
            for i, it in v.items():
                if i not in c or float(it.get('upd') or 0) >= float(c[i].get('upd') or 0): c[i] = it
            out[k] = {i: it for i, it in c.items() if not (it.get('del') and float(it.get('upd') or 0) < cut)}
        elif isinstance(v, dict) and isinstance(o, dict) and 'upd' in v and 'upd' in o and not is_coll(v):
            out[k] = v if float(v.get('upd') or 0) >= float(o.get('upd') or 0) else o
        elif k not in old or newer:
            out[k] = v
    out['savedAt'] = max(saved_at(old), saved_at(new))
    return out

# ---------- Personen, Anmeldung (PIN/Passwort je Person) und Rechte ----------
AUTH_F = os.path.join(DATA, 'auth.json')      # {users:{pid:{salt,hash,kind}}, tokens:{sha256(token):{pid,ts,ua}}} – nie über /api lesbar
RECHTE_F = os.path.join(DATA, 'rechte.json')  # {savedAt, p:{pid:{admin,sicht,tools:{appId:none|view|edit}}}}
LEVELS = ('none', 'view', 'edit')
FAILS = {}                                    # pid -> Zeitpunkte falscher Eingaben (gegen Durchprobieren)
RESERVED = {'auth', 'rechte', 'ich', 'anmelden', 'abmelden', 'geheimnis'}

def jload(f, default):
    try:
        with open(f, encoding='utf-8') as fh: return json.load(fh)
    except Exception: return default
def jsave(f, obj, private=False):
    tmp = f + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as fh: json.dump(obj, fh, ensure_ascii=False); fh.flush(); os.fsync(fh.fileno())
    if private: os.chmod(tmp, 0o600)
    os.replace(tmp, f)
def personen():
    L = jload(os.path.join(DATA, 'personen.json'), {}).get('list') or []
    return L or [{'id': 'alex', 'name': 'Alex', 'owner': True}, {'id': 'sam', 'name': 'Sam'}, {'id': 'kim', 'name': 'Kim'}, {'id': 'robin', 'name': 'Robin'}]
def owner_id():
    L = personen(); return next((p['id'] for p in L if p.get('owner')), L[0]['id'])
def auth_load():
    a = jload(AUTH_F, {})
    if 'hash' in a and 'users' not in a:          # altes Format (nur Besitzer-Passwort) übernehmen
        oid = owner_id()
        if not os.path.exists(AUTH_F + '.alt'): shutil.copy2(AUTH_F, AUTH_F + '.alt')
        a = {'users': {oid: {'salt': a['salt'], 'hash': a['hash'], 'kind': 'pw'}},
             'tokens': {h: {**v, 'pid': oid} for h, v in (a.get('tokens') or {}).items()}}
        jsave(AUTH_F, a, True)
    a.setdefault('users', {}); a.setdefault('tokens', {})
    return a
def auth_save(a): jsave(AUTH_F, a, True)
def pw_hash(pw, salt): return hashlib.pbkdf2_hmac('sha256', pw.encode('utf-8'), bytes.fromhex(salt), 200_000).hex()
def tok_hash(t): return hashlib.sha256(t.encode('utf-8')).hexdigest()
def set_secret(a, pid, neu, kind):
    salt = secrets.token_hex(16); a['users'][pid] = {'salt': salt, 'hash': pw_hash(neu, salt), 'kind': kind, **({'len': len(neu)} if kind == 'pin' else {})}
def secret_ok(kind, v):
    return bool(re.fullmatch(r'\d{4,8}', v)) if kind == 'pin' else 4 <= len(v) <= 200

def rechte_raw(): return jload(RECHTE_F, {}).get('p') or {}
def rechte_of(pid, has_secret, raw=None):
    """Wirksame Rechte: Besitzer und Admins (nur mit PIN/Passwort) dürfen alles. Sonst je Tool none/view/edit;
    ohne Eintrag: Familien-Tools bearbeiten, alles andere kein Zugriff. Aufgaben-Sicht: eigene|alle."""
    r = (raw if raw is not None else rechte_raw()).get(pid) or {}
    admin = pid == owner_id() or (bool(r.get('admin')) and has_secret)
    tools = {}
    for x in apps():
        lv = (r.get('tools') or {}).get(x['id'])
        tools[x['id']] = 'edit' if admin else (lv if lv in LEVELS else ('edit' if x.get('familie') else 'none'))
    sicht = 'alle' if admin else (r.get('sicht') if r.get('sicht') in ('eigene', 'alle') else 'eigene')
    return {'admin': admin, 'tools': tools, 'sicht': sicht}
def admins():
    U = auth_load()['users']; raw = rechte_raw()
    if owner_id() not in U: return {p['id'] for p in personen()}
    return {p['id'] for p in personen() if rechte_of(p['id'], p['id'] in U, raw)['admin']}
def app_of_key(k): return next((x for x in apps() if k in x.get('keys', [])), None)
def app_by_id(i): return next((x for x in apps() if x['id'] == i), None)
def lvl_ok(have, need): return LEVELS.index(have or 'none') >= LEVELS.index(need)

def sees_own(t, p): return bool(p) and (t.get('von') == p or t.get('fuer') == p or t.get('erstVon') == p or p in ((t.get('wdh') or {}).get('rot') or []))
def creator(t, p): return t.get('von') == p or t.get('erstVon') == p
def filt(d, p):
    """Sicht „eigene“: nur Aufgaben, die die Person eingetragen hat oder die für sie sind (+ deren Verlauf)."""
    if not isinstance(d, dict) or not isinstance(d.get('tasks'), dict): return d
    out = dict(d)
    vis = {i: t for i, t in d['tasks'].items() if isinstance(t, dict) and (t.get('del') or sees_own(t, p))}
    out['tasks'] = vis
    if isinstance(d.get('log'), dict):
        out['log'] = {i: g for i, g in d['log'].items() if isinstance(g, dict) and (g.get('del') or (g.get('task') in vis and not vis[g['task']].get('del')))}
    return out
FUER_OK = ('status', 'erledigtVon', 'erledigtAm', 'check', 'upd')
def restrict(old, new, p, sicht, adm):
    """Was eine Person ohne Admin-Rechte in den Aufgaben ändern darf: neue Aufgaben eintragen (an einen Admin als Wunsch),
    eigene Einträge bearbeiten/löschen, sichtbare Aufgaben abhaken/Checkliste/Status, kommentieren, neue Listen.
    Alles andere wird still verworfen."""
    sees = (lambda t: True) if sicht == 'alle' else (lambda t: sees_own(t, p))
    out = {'savedAt': new.get('savedAt') or 0}
    OT = old.get('tasks') if isinstance(old.get('tasks'), dict) else {}
    NT = new.get('tasks') if isinstance(new.get('tasks'), dict) else {}
    acc = {}
    for i, t in NT.items():
        if not isinstance(t, dict): continue
        o = OT.get(i)
        if o is not None and float(t.get('upd') or 0) <= float(o.get('upd') or 0): continue   # unverändert
        if o is None:                                   # neu
            if t.get('del'): continue
            t = dict(t)
            if t.get('wdh'):                            # Folgetermin einer Wiederholung darf Von/Status der Vorlage behalten
                if not (sees(t) or p in ((t.get('wdh') or {}).get('rot') or [])): continue
            else:
                t['von'] = p; t['erstVon'] = p
                if t.get('fuer') != p and t.get('fuer') in adm: t['status'] = 'neu'
                elif t.get('status') not in ('offen', 'neu'): t['status'] = 'offen'
            acc[i] = t
        elif o.get('del') or not sees(o):
            continue                                    # Gelöschtes nicht wiederbeleben, Unsichtbares nicht anfassen
        elif creator(o, p):
            if o.get('status') == 'neu' and not t.get('del') and t.get('status') != 'neu':
                t = dict(t); t['status'] = 'neu'        # eigenen Wunsch nicht selbst annehmen
            acc[i] = t
        elif not t.get('del'):                          # von jemand anderem: nur Abhaken & Co.
            m = dict(o)
            for k in FUER_OK:
                if k in t: m[k] = t[k]
            if m.get('status') not in ('offen', 'arbeit', 'erledigt') or o.get('status') == 'neu': m['status'] = o.get('status')
            acc[i] = m
    out['tasks'] = acc
    vis = {**{i: t for i, t in OT.items() if isinstance(t, dict) and not t.get('del') and sees(t)}, **acc}
    OL = old.get('log') if isinstance(old.get('log'), dict) else {}
    out['log'] = {i: g for i, g in (new.get('log') or {}).items()
                  if isinstance(g, dict) and i not in OL and g.get('wer') == p and g.get('task') in vis} if isinstance(new.get('log'), dict) else {}
    OLi = old.get('lists') if isinstance(old.get('lists'), dict) else {}
    out['lists'] = {i: l for i, l in (new.get('lists') or {}).items() if isinstance(l, dict) and i not in OLi and not l.get('del')} if isinstance(new.get('lists'), dict) else {}
    for k in ('app', 'v', 'set'):
        if k not in old and k in new: out[k] = new[k]
    return out

# ---------- Komplettsicherung, Wiederherstellung und Zustand des Pi ----------
SICH_F = os.path.join(DATA, 'sicherung.json')   # {ziel: Pfad|"" (= SD-Karte), auto: bool, uhrzeit: "HH:MM", letzte: {...}}
STAND_F = os.path.join(DATA, '_stand.json')     # {epoch}: nach einer Wiederherstellung verwerfen Geräte ihre lokale Kopie
SD_DIR = os.path.join(DATA, 'sicherungen')
STARTED = time.time()
SAFE = re.compile(r'^[A-Za-z0-9_\-]{1,80}\.(json|ics)$')
ZIPNAME = re.compile(r'^dashboard-[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{4,6}(-[a-z]+)?\.zip$')
SLOCK = threading.Lock()
def epoch(): return int(jload(STAND_F, {}).get('epoch') or 0)
def sich_cfg():
    c = jload(SICH_F, {}); c.setdefault('ziel', ''); c.setdefault('auto', True); c.setdefault('uhrzeit', '03:30'); c.setdefault('letzte', None); return c
def usb_ziele():
    """Eingehängte Laufwerke unter /media oder /mnt (USB-Stick, Festplatte), auf die der Dienst schreiben darf."""
    out = []
    try:
        for line in open('/proc/mounts', encoding='utf-8'):
            p = line.split()
            if len(p) < 3: continue
            mp = p[1].replace('\\040', ' ')
            if not (mp.startswith('/media/') or mp.startswith('/mnt/')) or p[2] not in ('vfat', 'exfat', 'ext4', 'ext3', 'ntfs', 'ntfs3', 'fuseblk', 'btrfs', 'xfs'): continue
            if not os.access(mp, os.W_OK): continue
            du = shutil.disk_usage(mp); out.append({'pfad': mp, 'name': os.path.basename(mp) or mp, 'frei': du.free, 'gesamt': du.total})
    except Exception: pass
    return out
def ziel_ordner(c=None):
    """(Ordner, Ort, Hinweis). Gewählter Stick nicht eingesteckt → SD-Karte als Ersatz."""
    c = c or sich_cfg(); z = c.get('ziel') or ''
    if z:
        if os.path.isdir(z) and os.access(z, os.W_OK):
            d = os.path.join(z, 'dashboard-sicherungen'); os.makedirs(d, exist_ok=True); return d, 'usb', ''
        os.makedirs(SD_DIR, exist_ok=True); return SD_DIR, 'sd', 'USB-Ziel nicht gefunden – auf die SD-Karte gesichert'
    os.makedirs(SD_DIR, exist_ok=True); return SD_DIR, 'sd', ''
def daten_dateien():
    return sorted(n for n in os.listdir(DATA) if SAFE.match(n) and not n.startswith('_') and n != 'sicherung.json' and os.path.isfile(os.path.join(DATA, n)))
def zip_bauen(grund='auto'):
    buf = io.BytesIO(); files = daten_dateien()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('manifest.json', json.dumps({'app': 'personal-dashboard', 'erstellt': int(time.time() * 1000), 'grund': grund,
                                                'host': socket.gethostname(), 'dateien': files}, ensure_ascii=False, indent=1))
        for n in files:
            with LOCK:
                with open(os.path.join(DATA, n), 'rb') as fh: z.writestr('data/' + n, fh.read())
        if os.path.exists(os.path.join(BASE, 'apps.json')): z.write(os.path.join(BASE, 'apps.json'), 'apps.json')
    return buf.getvalue(), len(files)
def sicherungen(d, ort):
    try: L = [n for n in os.listdir(d) if ZIPNAME.match(n)]
    except Exception: return []
    return [{'name': n, 'ort': ort, 'groesse': os.path.getsize(os.path.join(d, n)), 'ts': int(os.path.getmtime(os.path.join(d, n)) * 1000)} for n in sorted(L, reverse=True)]
def sichern(grund='auto'):
    """Komplettsicherung schreiben, alte aufräumen (SD: 14, USB: 60 behalten). Gibt das Ergebnis zurück und merkt es sich."""
    with SLOCK:
        c = sich_cfg(); d, ort, hinweis = ziel_ordner(c)
        try:
            data, n = zip_bauen(grund)
            name = time.strftime('dashboard-%Y-%m-%d_%H%M%S') + ('' if grund == 'auto' else '-' + grund) + '.zip'
            f = os.path.join(d, name); tmp = f + '.tmp'
            with open(tmp, 'wb') as fh: fh.write(data); fh.flush(); os.fsync(fh.fileno())
            os.replace(tmp, f)
            keep = 60 if ort == 'usb' else 14
            alle = sicherungen(d, ort)
            for x in [x for x in alle if not x['name'].endswith('-vorher.zip')][keep:] + [x for x in alle if x['name'].endswith('-vorher.zip')][5:]:
                try: os.remove(os.path.join(d, x['name']))
                except Exception: pass
            res = {'ok': True, 'ts': int(time.time() * 1000), 'ort': ort, 'name': name, 'groesse': len(data), 'dateien': n, 'grund': grund, 'hinweis': hinweis}
        except Exception as e:
            res = {'ok': False, 'ts': int(time.time() * 1000), 'ort': ort, 'fehler': str(e)[:200], 'grund': grund}
        if grund != 'vorher':
            c['letzte'] = res; jsave(SICH_F, c)
        return res
def zip_lesen(raw):
    """Prüft eine Sicherung und gibt {dateiname: bytes} zurück (nur erlaubte Dateien)."""
    z = zipfile.ZipFile(io.BytesIO(raw))
    man = json.loads(z.read('manifest.json'))
    if man.get('app') != 'personal-dashboard': raise ValueError('keine Dashboard-Sicherung')
    out = {}
    for info in z.infolist():
        n = info.filename
        if n.startswith('data/') and SAFE.match(n[5:]) and not n[5:].startswith('_') and n[5:] != 'sicherung.json' and info.file_size < 50_000_000:
            b = z.read(info)
            if n.endswith('.json'): json.loads(b)          # muss gültiges JSON sein
            out[n[5:]] = b
        elif n == 'apps.json':
            b = z.read(info); json.loads(b); out['/apps.json'] = b
    if not any(k.endswith('.json') and k != '/apps.json' for k in out): raise ValueError('Sicherung enthält keine Daten')
    return out, man
def zurueckspielen(raw):
    files, man = zip_lesen(raw)
    vorher = sichern('vorher')                              # aktueller Stand bleibt als Sicherung erhalten
    with LOCK:
        for n, b in files.items():
            f = os.path.join(BASE, 'apps.json') if n == '/apps.json' else os.path.join(DATA, n)
            tmp = f + '.tmp'
            with open(tmp, 'wb') as fh: fh.write(b); fh.flush(); os.fsync(fh.fileno())
            if n == 'auth.json': os.chmod(tmp, 0o600)
            os.replace(tmp, f)
        jsave(STAND_F, {'epoch': int(time.time() * 1000), 'von': man.get('erstellt')})
    return {'ok': True, 'dateien': len(files), 'erstellt': man.get('erstellt'), 'vorher': vorher.get('name')}
def auto_sicherung():
    """Läuft im Hintergrund: einmal täglich zur eingestellten Uhrzeit (und nach dem Start, wenn die letzte älter als 26 Std. ist)."""
    time.sleep(20)
    while True:
        try:
            c = sich_cfg(); L = c.get('letzte') or {}; last = (L.get('ts') or 0) / 1000
            hh, mm = (c.get('uhrzeit') or '03:30').split(':'); now = time.localtime()
            faellig = (now.tm_hour, now.tm_min) >= (int(hh), int(mm)) and time.strftime('%Y-%m-%d', time.localtime(last)) != time.strftime('%Y-%m-%d', now)
            if c.get('auto', True) and (faellig or time.time() - last > 26 * 3600): sichern('auto')
        except Exception as e: print('Sicherung fehlgeschlagen:', e)
        time.sleep(60)
def lies(p, default=''):
    try:
        with open(p, encoding='utf-8', errors='replace') as fh: return fh.read().strip().strip('\x00')
    except Exception: return default
def zustand():
    z = {'host': socket.gethostname(), 'modell': lies('/proc/device-tree/model') or 'unbekannt', 'python': sys.version.split()[0],
         'seit': int(STARTED * 1000), 'jetzt': int(time.time() * 1000)}
    t = lies('/sys/class/thermal/thermal_zone0/temp'); z['temp'] = round(int(t) / 1000, 1) if t.isdigit() else None
    try: z['laufzeit'] = int(float(lies('/proc/uptime', '0').split()[0]))
    except Exception: z['laufzeit'] = None
    try: z['last'] = [round(x, 2) for x in os.getloadavg()]; z['kerne'] = os.cpu_count()
    except Exception: z['last'] = None
    mi = {}
    for line in lies('/proc/meminfo').splitlines():
        p = line.split()
        if len(p) >= 2 and p[1].isdigit(): mi[p[0].rstrip(':')] = int(p[1]) * 1024
    z['ram'] = {'gesamt': mi.get('MemTotal'), 'frei': mi.get('MemAvailable')} if mi else None
    du = shutil.disk_usage(DATA); z['sd'] = {'gesamt': du.total, 'frei': du.free}
    z['strom'] = None
    try:
        r = subprocess.run(['vcgencmd', 'get_throttled'], capture_output=True, text=True, timeout=2)
        m = re.search(r'0x[0-9a-fA-F]+', r.stdout or '')
        if m:
            v = int(m.group(0), 16)
            z['strom'] = {'roh': m.group(0), 'unterspannung': bool(v & 1), 'gedrosselt': bool(v & 4), 'war_unterspannung': bool(v & 0x10000), 'war_gedrosselt': bool(v & 0x40000)}
    except Exception: pass
    groesse = lambda d: sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(d) for f in fs)
    z['daten'] = {'groesse': sum(os.path.getsize(os.path.join(DATA, n)) for n in daten_dateien()), 'tagessicherungen': groesse(BACKUPS) if os.path.isdir(BACKUPS) else 0}
    tools = []
    for a in apps():
        ts = [os.path.getmtime(os.path.join(DATA, k + '.json')) for k in a.get('keys', []) if os.path.exists(os.path.join(DATA, k + '.json'))]
        tools.append({'id': a['id'], 'titel': a.get('kurz') or a['titel'], 'farbe': a.get('farbe'), 'geaendert': int(max(ts) * 1000) if ts else None})
    z['tools'] = tools
    return z
def hinweise(z, c):
    h = []
    if z.get('temp') is not None and z['temp'] >= 80: h.append(('rot', f"Pi sehr heiß ({z['temp']} °C) – Belüftung prüfen"))
    elif z.get('temp') is not None and z['temp'] >= 70: h.append(('gelb', f"Pi warm ({z['temp']} °C)"))
    s = z.get('strom') or {}
    if s.get('unterspannung'): h.append(('rot', 'Unterspannung jetzt – Netzteil zu schwach (Datenverlust möglich)'))
    elif s.get('war_unterspannung'): h.append(('gelb', 'Seit dem Start gab es Unterspannung – besseres Netzteil empfohlen'))
    sd = z['sd']; frei = sd['frei'] / sd['gesamt'] if sd['gesamt'] else 1
    if frei < 0.05: h.append(('rot', 'SD-Karte fast voll'))
    elif frei < 0.15: h.append(('gelb', 'SD-Karte wird voll'))
    L = c.get('letzte') or {}
    if not L: h.append(('gelb', 'Noch keine Komplettsicherung'))
    elif not L.get('ok'): h.append(('rot', 'Letzte Sicherung fehlgeschlagen: ' + (L.get('fehler') or '')))
    elif time.time() * 1000 - L.get('ts', 0) > 2 * 86400000: h.append(('gelb', 'Letzte Sicherung ist älter als 2 Tage'))
    if L.get('hinweis'): h.append(('gelb', L['hinweis']))
    if not c.get('ziel'): h.append(('info', 'Sicherungen liegen auf der SD-Karte – ein USB-Stick schützt auch bei Kartendefekt'))
    return [{'ton': t, 'text': x} for t, x in h]

def icon_id(app_id):
    return app_id if os.path.exists(os.path.join(WWW, 'icons', f'{app_id}-180.png')) else 'uni'

def saved_at(obj):
    try: return float(obj.get('savedAt') or 0)
    except Exception: return 0

def icon_tags(app_id, title, standalone=True):
    ic = icon_id(app_id)
    return (f'<link rel="apple-touch-icon" href="/icons/{ic}-180.png">'
            f'<link rel="icon" type="image/png" sizes="64x64" href="/icons/{ic}-64.png">'
            f'<link rel="manifest" href="/manifest-{app_id}.json">'
            + ('<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">'
               '<meta name="apple-mobile-web-app-status-bar-style" content="default">' if standalone else '')   # Dashboard bleibt in Safari (sonst kein Zurück)
            + f'<meta name="apple-mobile-web-app-title" content="{title}">')

class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=WWW, **k)
    def log_message(self, fmt, *a): pass
    def send(self, code, body=b'', ctype='application/json', extra=()):
        self.send_response(code); self.send_header('Content-Type', ctype)
        for h, v in extra: self.send_header(h, v)
        self.send_header('Cache-Control', 'no-store'); self.send_header('Content-Length', str(len(body)))
        self.end_headers(); self.wfile.write(body)

    def cookies(self):
        c = http.cookies.SimpleCookie()
        try: c.load(self.headers.get('Cookie') or '')
        except Exception: pass
        return {k: v.value for k, v in c.items()}
    def ctx(self):
        """Wer ist das? {pid, admin, tools, sicht, open}. Ohne Besitzer-Passwort („offen“) darf jedes Gerät alles."""
        if hasattr(self, '_ctx'): return self._ctx
        a = auth_load(); U = a['users']; ck = self.cookies(); ids = {p['id'] for p in personen()}
        allapps = {x['id']: 'edit' for x in apps()}
        if owner_id() not in U:
            p = ck.get('pd_person'); r = {'pid': p if p in ids else None, 'admin': True, 'open': True, 'tools': allapps, 'sicht': 'alle'}
        else:
            pid = None; t = ck.get('pd_auth')
            if t:
                e = a['tokens'].get(tok_hash(t))
                if e and e.get('pid') in ids and e['pid'] in U: pid = e['pid']
            if not pid:
                p = ck.get('pd_person')
                if p in ids and p not in U: pid = p        # Personen ohne PIN dürfen sich einfach auswählen
            if not pid: r = {'pid': None, 'admin': False, 'open': False, 'tools': {i: 'none' for i in allapps}, 'sicht': 'eigene'}
            else: r = {'pid': pid, 'open': False, **rechte_of(pid, pid in U)}
        self._ctx = r; return r
    def role_js(self, page=None):
        c = self.ctx(); U = auth_load()['users']
        return json.dumps({**c, 'ownerId': owner_id(), 'lock': {p: u.get('kind', 'pw') for p, u in U.items()},
                           'plen': {p: u['len'] for p, u in U.items() if u.get('kind') == 'pin' and u.get('len')},
                           'admins': sorted(admins()), 'ro': bool(page and c['tools'].get(page) == 'view')}, ensure_ascii=False).replace('</', '<\\/')
    def zur_anmeldung(self, p):
        z = p if p.startswith('/') and not p.startswith('//') else '/'
        self.send_response(302); self.send_header('Location', '/anmelden?z=' + z.replace('&', '%26') + ('&kein=1' if self.ctx()['pid'] else ''))
        self.send_header('Cache-Control', 'no-store'); self.send_header('Content-Length', '0'); self.end_headers()
    def jbody(self, raw):
        try:
            x = json.loads(raw); return x if isinstance(x, dict) else {}
        except Exception: return {}

    def key(self):
        p = self.path.split('?')[0]
        if not p.startswith('/api/'): return None
        k = p[5:]; return k if NAME.match(k) else ''

    def do_GET(self):
        p = self.path.split('?')[0]
        mf = re.match(r'^/manifest-([a-z0-9_-]{1,40})\.json$', p)
        if mf:
            aid = mf.group(1); a = next((x for x in apps() if x['id'] == aid), None)
            n, sn, start = (TITLE, 'Dashboard', '/') if not a else (a['titel'], a.get('kurz') or a['titel'], '/' + a['datei'])
            ic = icon_id(aid)
            body = json.dumps({'name': n, 'short_name': sn, 'start_url': start, 'display': 'standalone', 'background_color': '#0D1016', 'theme_color': '#5B4BE0',
                               'icons': [{'src': f'/icons/{ic}-192.png', 'sizes': '192x192', 'type': 'image/png'}, {'src': f'/icons/{ic}-512.png', 'sizes': '512x512', 'type': 'image/png'}]})
            return self.send(200, body.encode(), 'application/manifest+json')
        mi = re.match(r'^/icons/([a-z0-9_-]{1,40})-(64|180|192|512)\.png$', p)
        if mi and not os.path.exists(os.path.join(WWW, 'icons', f'{mi.group(1)}-{mi.group(2)}.png')):
            self.path = f'/icons/uni-{mi.group(2)}.png'   # Tool ohne eigenes Icon → Standard-Icon
            return super().do_GET()
        m = re.match(r'^/([a-z0-9_-]{1,40})\.ics$', p)
        if m:                                       # Kalender-Abos: /abgaben.ics, /termine.ics, …
            f = os.path.join(DATA, 'ics_' + m.group(1) + '.ics')
            if not os.path.exists(f):
                return self.send(404, b'Kalender noch nicht vorhanden - einmal das Tool auf dem Pi oeffnen.', 'text/plain; charset=utf-8')
            with open(f, 'rb') as fh: return self.send(200, fh.read(), 'text/calendar; charset=utf-8')
        if p in ('/anmelden', '/verwaltung', '/system'):
            page = read(p[1:] + '.html').replace('{{TITLE}}', TITLE).replace('{{ROLE}}', self.role_js())
            page = page.replace('{{PERSONEN}}', json.dumps(personen(), ensure_ascii=False).replace('</', '<\\/'))
            if p in ('/verwaltung', '/system') and not self.ctx()['admin']: return self.zur_anmeldung(p)
            return self.send(200, page.encode('utf-8'), 'text/html; charset=utf-8')
        k = self.key()
        if k is not None:
            if not k or k in ('auth', 'anmelden', 'abmelden', 'geheimnis', 'sicherung', '_stand'): return self.send(400)
            c = self.ctx()
            if k == 'ich': return self.send(200, self.role_js().encode())
            if k == 'rechte': return self.rechte_get()
            if k.startswith('system'): return self.system_get(k)
            fam = False
            if k == 'personen': pass
            elif k.startswith('sum_'):
                x = app_by_id(k[4:].split('__')[0])
                if not x or not lvl_ok(c['tools'].get(x['id']), 'view'): return self.send(403, b'{"error":"kein Zugriff"}')
                if x.get('proPerson'):
                    if not c['pid']: return self.send(404)
                    k = 'sum_' + x['id'] + '__' + c['pid']
            else:
                x = app_of_key(k)
                if x is None and not c['admin']: return self.send(403, b'{"error":"kein Zugriff"}')
                if x is not None and not lvl_ok(c['tools'].get(x['id']), 'view'): return self.send(403, b'{"error":"kein Zugriff"}')
                fam = x is not None and x.get('proPerson') and c['sicht'] != 'alle'
            f = os.path.join(DATA, k + '.json')
            if not os.path.exists(f): return self.send(404)
            with open(f, 'rb') as fh: raw = fh.read()
            if fam:
                try: raw = json.dumps(filt(json.loads(raw), c['pid']), ensure_ascii=False, separators=(',', ':')).encode('utf-8')
                except Exception: return self.send(500)
            return self.send(200, raw)
        if p == '/bls.json':                        # Lebensmitteldatenbank (BLS 4.0) – vorkomprimiert, gecacht
            f = os.path.join(WWW, 'bls.json.gz')
            if not os.path.exists(f): return self.send(404)
            tag = '"%d"' % int(os.path.getmtime(f))
            if self.headers.get('If-None-Match') == tag:
                self.send_response(304); self.send_header('ETag', tag); self.end_headers(); return
            with open(f, 'rb') as fh: body = fh.read()
            if 'gzip' not in (self.headers.get('Accept-Encoding') or ''):
                body = gzip.decompress(body); enc = None
            else: enc = 'gzip'
            self.send_response(200); self.send_header('Content-Type', 'application/json')
            if enc: self.send_header('Content-Encoding', enc)
            self.send_header('ETag', tag); self.send_header('Cache-Control', 'no-cache')
            self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body); return
        if p in ('/', '/index.html'): return self.index()
        if p.endswith('.html') or p.endswith('.htm'):
            f = os.path.join(WWW, os.path.normpath(p.lstrip('/')))
            if not f.startswith(WWW) or not os.path.isfile(f): return self.send(404, b'nicht gefunden', 'text/plain')
            html = open(f, encoding='utf-8').read()
            a = app_of_file(os.path.basename(f))
            c = self.ctx()
            if not (lvl_ok(c['tools'].get(a['id']), 'view') if a else c['admin']): return self.zur_anmeldung(p)
            vis = [x for x in apps() if lvl_ok(c['tools'].get(x['id']), 'view')]
            keys = sorted({k for x in vis for k in x.get('keys', [])})
            ro = sorted({k for x in vis if c['tools'].get(x['id']) == 'view' for k in x.get('keys', [])})
            aid, title = (a['id'], a.get('kurz') or a['titel']) if a else ('uni', os.path.basename(f)[:-5])
            html = re.sub(r'<link[^>]+fonts\.(?:googleapis|gstatic)\.com[^>]*>\s*', '', html)   # Google Fonts raus …
            tag = (icon_tags(aid, title) + '<link rel="stylesheet" href="/fonts/fonts.css">'   # … lokale Schriften rein
                   + '<script>window.__PI_KEYS=' + json.dumps(keys) + ';window.__PI_RO=' + json.dumps(ro) + ';window.__PI_LISTE=' + json.dumps(liste_keys()) + ';window.__PI_EPOCH=' + str(epoch()) + ';window.__PI_ROLE=' + self.role_js(a['id'] if a else None) + ';</script><script>' + read('sync.js') + '</script>')
            mh = re.search(r'<head[^>]*>', html, re.I)
            html = html[:mh.end()] + tag + html[mh.end():] if mh else tag + html
            ad = a.get('addon') if a else None           # Zusatz-Skript eines Tools (z. B. Dashboard-Kurzinfo), am Ende von <body>
            if ad and re.match(r'^[a-z0-9_/-]+\.js$', ad) and os.path.isfile(os.path.join(WWW, ad)):
                st = '<script src="/' + ad + '"></script>'
                i = html.lower().rfind('</body>')
                html = html[:i] + st + html[i:] if i >= 0 else html + st
            return self.send(200, html.encode('utf-8'), 'text/html; charset=utf-8')
        return super().do_GET()

    def index(self):
        c = self.ctx()
        reg = [{**{k: a.get(k) for k in ('id', 'datei', 'titel', 'kurz', 'gruppe', 'farbe', 'kachel', 'familie', 'neu')}, 'icon': icon_id(a['id']), 'bg': bool(a.get('addon')), 'lvl': c['tools'].get(a['id'], 'edit' if c['admin'] else 'none')}
               for a in installed() if lvl_ok(c['tools'].get(a['id'], 'edit' if c['admin'] else 'none'), 'view')]
        page = (read('dashboard.html').replace('{{APPS}}', json.dumps(reg, ensure_ascii=False).replace('</', '<\\/'))
                .replace('{{ICON}}', icon_tags('dash', 'Dashboard', standalone=False)).replace('{{TITLE}}', TITLE).replace('{{ROLE}}', self.role_js()))
        self.send(200, page.encode('utf-8'), 'text/html; charset=utf-8')

    def do_PUT(self):
        k = self.key()
        if not k: return self.send(400)
        n = int(self.headers.get('Content-Length') or 0)
        if k == 'abmelden': return self.abmelden()
        if k.startswith('system'): return self.system_post(k, n)
        if n <= 0 or n > 20_000_000: return self.send(413)
        raw = self.rfile.read(n)
        if k == 'anmelden': return self.anmelden(raw)
        if k == 'abmelden': return self.abmelden()
        if k == 'geheimnis': return self.geheimnis(raw)
        if k == 'rechte': return self.rechte_put(raw)
        if k in ('auth', 'ich', 'sicherung', '_stand'): return self.send(400)
        e = parse_qs(urlparse(self.path).query).get('e')
        if e and not k.startswith('sum_') and e[0].isdigit() and int(e[0]) != epoch(): return self.send(409, b'{"error":"epoch"}')   # Gerät hat Stand von vor einer Wiederherstellung
        c = self.ctx(); app = None; per_app = False
        if k == 'personen':
            if not c['admin']: return self.send(403, b'{"error":"nur Admins"}')
            return self.personen_put(raw)
        if k.startswith('ics_'):
            if not c['admin']: return self.send(403, b'{"error":"nur Admins"}')
        elif k.startswith('sum_'):
            app = app_by_id(k[4:].split('__')[0])
            if not app: return self.send(403)
            if app.get('proPerson'):                   # Kachel je Person (z. B. Aufgaben)
                if not c['pid'] or not lvl_ok(c['tools'].get(app['id']), 'view'): return self.send(403)
                k = 'sum_' + app['id'] + '__' + c['pid']
            elif not lvl_ok(c['tools'].get(app['id']), 'edit'): return self.send(403, b'{"error":"nur ansehen"}')
        else:
            app = app_of_key(k)
            if app is None and not c['admin']: return self.send(403, b'{"error":"kein Zugriff"}')
            if app is not None and not lvl_ok(c['tools'].get(app['id']), 'edit'): return self.send(403, b'{"error":"nur ansehen"}')
            per_app = app is not None and app.get('proPerson') and not c['admin']
        if k.startswith('ics_'):                    # Kalender-Abo: fertige .ics aus einem Tool
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
        liste = k in liste_keys()
        fam = per_app
        with LOCK:
            if fam:                                   # Familienmitglied: nur Erlaubtes übernehmen, nur eigene Sicht zurück
                try:
                    with open(f, encoding='utf-8') as fh: old = json.load(fh)
                except Exception: old = {}
                per = c['pid']
                new = merge(old, restrict(old, new, per, c['sicht'], admins()))
                vis = json.dumps(new if c['sicht'] == 'alle' else filt(new, per), ensure_ascii=False, separators=(',', ':')).encode('utf-8')
                if new == old: return self.send(200, vis)
                if os.path.exists(f):
                    day = time.strftime('%Y-%m-%d'); bk = os.path.join(BACKUPS, f'{k}_{day}.json')
                    if not os.path.exists(bk): shutil.copy2(f, bk)
                raw = json.dumps(new, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
                tmp = f + '.tmp'
                with open(tmp, 'wb') as fh: fh.write(raw); fh.flush(); os.fsync(fh.fileno())
                os.replace(tmp, f)
                return self.send(200, vis)
            if os.path.exists(f):
                try: old = json.load(open(f, encoding='utf-8'))
                except Exception: old = {}
                if liste:                             # pro Eintrag zusammenführen statt ganz ersetzen
                    new = merge(old, new); raw = json.dumps(new, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
                    if new == old: return self.send(200, raw)
                elif saved_at(new) < saved_at(old):   # älterer Stand darf neueren nicht überschreiben
                    return self.send(409, b'{"error":"aelter als Server-Stand"}')
                if not k.startswith('sum_'):          # Kurzinfos fürs Dashboard brauchen keine Sicherung
                    day = time.strftime('%Y-%m-%d')
                    bk = os.path.join(BACKUPS, f'{k}_{day}.json')
                    if not os.path.exists(bk): shutil.copy2(f, bk)
                    olds = sorted(x for x in os.listdir(BACKUPS) if x.startswith(k + '_'))
                    for x in olds[:-KEEP_BACKUPS]: os.remove(os.path.join(BACKUPS, x))
            tmp = f + '.tmp'
            with open(tmp, 'wb') as fh: fh.write(raw); fh.flush(); os.fsync(fh.fileno())
            os.replace(tmp, f)
        self.send(200, raw if liste else b'{"ok":true}')
    do_POST = do_PUT   # für sendBeacon beim Schließen

    def cookie_hdrs(self, pid, token=None):
        h = [('Set-Cookie', f'pd_person={pid or ""}; Path=/; Max-Age=315360000; SameSite=Lax')]
        h.append(('Set-Cookie', f'pd_auth={token}; Path=/; Max-Age=315360000; HttpOnly; SameSite=Lax') if token
                 else ('Set-Cookie', 'pd_auth=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'))
        return h
    def drop_token(self):
        t = self.cookies().get('pd_auth')
        if t:
            with LOCK:
                a = auth_load()
                if a['tokens'].pop(tok_hash(t), None) is not None: auth_save(a)
    def new_token(self, a, pid):
        t = secrets.token_urlsafe(32)
        a['tokens'][tok_hash(t)] = {'pid': pid, 'ts': int(time.time()), 'ua': (self.headers.get('User-Agent') or '')[:120]}
        return t
    def anmelden(self, raw):
        x = self.jbody(raw); pid = str(x.get('pid') or ''); pw = str(x.get('pw') or '')
        if pid not in {p['id'] for p in personen()}: return self.send(400, b'{"error":"unbekannt"}')
        a = auth_load(); u = a['users'].get(pid)
        if owner_id() not in a['users'] or not u:          # offen oder Person ohne PIN: einfach wählen
            self.drop_token()
            return self.send(200, b'{"ok":true}', extra=self.cookie_hdrs(pid))
        now = time.time()
        with LOCK:
            L = FAILS.setdefault(pid, []); L[:] = [t for t in L if now - t < 900]
            if len(L) >= 8: return self.send(429, b'{"error":"zu viele Versuche - 15 Min warten"}')
        if not hmac.compare_digest(pw_hash(pw, u['salt']), u['hash']):
            with LOCK: FAILS[pid].append(now)
            time.sleep(1.2); return self.send(403, b'{"error":"falsch"}')
        self.drop_token()
        with LOCK:
            a = auth_load(); t = self.new_token(a, pid)
            uu = a['users'].get(pid) or {}
            if uu.get('kind') == 'pin' and not uu.get('len'): uu['len'] = len(pw)   # ältere PINs: Länge nachtragen (für automatisches Anmelden)
            auth_save(a)
        return self.send(200, b'{"ok":true}', extra=self.cookie_hdrs(pid, t))
    def abmelden(self):
        self.drop_token()
        return self.send(200, b'{"ok":true}', extra=self.cookie_hdrs(None))
    def geheimnis(self, raw):
        """PIN/Passwort setzen, ändern oder entfernen. Selbst: altes nötig (falls vorhanden). Admins: für andere ohne altes;
        das des Besitzers ändert nur der Besitzer selbst."""
        c = self.ctx(); x = self.jbody(raw)
        pid = str(x.get('pid') or ''); neu = str(x.get('neu') or ''); alt = str(x.get('alt') or ''); kind = 'pin' if x.get('kind') == 'pin' else 'pw'
        if pid not in {p['id'] for p in personen()} or not c['pid']: return self.send(400)
        oid = owner_id(); selbst = pid == c['pid']
        if not selbst and (not c['admin'] or (pid == oid and not c['open'])): return self.send(403, b'{"error":"nicht erlaubt"}')
        if neu and not secret_ok(kind, neu): return self.send(400, b'{"error":"PIN 4-8 Ziffern, Passwort mind. 4 Zeichen"}')
        if not neu and pid == oid and not selbst: return self.send(403, b'{"error":"nur der Besitzer selbst"}')   # selbst entfernen = offener Modus
        with LOCK:
            a = auth_load(); u = a['users'].get(pid)
            if selbst and u and not c['open'] and not hmac.compare_digest(pw_hash(alt, u['salt']), u['hash']):
                time.sleep(1.2); return self.send(403, b'{"error":"altes falsch"}')
            if neu: set_secret(a, pid, neu, kind)
            else: a['users'].pop(pid, None)
            a['tokens'] = {h: e for h, e in a['tokens'].items() if e.get('pid') != pid}   # alle Geräte dieser Person abmelden …
            t = self.new_token(a, pid) if (selbst and neu) or (pid == oid and c['open']) else None   # … außer diesem
            auth_save(a)
        return self.send(200, b'{"ok":true}', extra=self.cookie_hdrs(pid, t) if t else ())
    def rechte_get(self):
        c = self.ctx()
        if not c['admin']: return self.send(403)
        U = auth_load()['users']; raw = rechte_raw()
        body = {'personen': personen(), 'ownerId': owner_id(), 'open': c['open'], 'ich': c['pid'],
                'lock': {p: u.get('kind', 'pw') for p, u in U.items()},
                'plen': {p: u['len'] for p, u in U.items() if u.get('kind') == 'pin' and u.get('len')},
                'apps': [{'id': x['id'], 'titel': x['titel'], 'farbe': x.get('farbe'), 'familie': bool(x.get('familie')), 'proPerson': bool(x.get('proPerson'))} for x in apps()],
                'rechte': {p['id']: {**rechte_of(p['id'], p['id'] in U, raw), 'adminFlag': bool((raw.get(p['id']) or {}).get('admin'))} for p in personen()}}
        return self.send(200, json.dumps(body, ensure_ascii=False).encode('utf-8'))
    def rechte_put(self, raw):
        c = self.ctx()
        if not c['admin']: return self.send(403, b'{"error":"nur Admins"}')
        x = self.jbody(raw).get('p') or {}; ids = {p['id'] for p in personen()}; ap = {a['id'] for a in apps()}; out = {}
        for pid, r in x.items():
            if pid not in ids or not isinstance(r, dict): continue
            out[pid] = {'admin': bool(r.get('admin')) or pid == owner_id(), 'sicht': 'alle' if r.get('sicht') == 'alle' else 'eigene',
                        'tools': {k: v for k, v in (r.get('tools') or {}).items() if k in ap and v in LEVELS}}
        with LOCK: jsave(RECHTE_F, {'savedAt': int(time.time() * 1000), 'p': out})
        return self.rechte_get()
    def personen_put(self, raw):
        x = self.jbody(raw); L = x.get('list')
        if not isinstance(L, list): return self.send(400)
        oid = owner_id(); clean = []; seen = set()
        for p in L:
            if not isinstance(p, dict) or not re.fullmatch(r'[A-Za-z0-9_-]{1,40}', str(p.get('id') or '')) or p['id'] in seen: continue
            seen.add(p['id'])
            clean.append({'id': p['id'], 'name': str(p.get('name') or p['id'])[:40], 'kz': str(p.get('kz') or '')[:20], 'farbe': str(p.get('farbe') or '#7D8597')[:20], **({'owner': True} if p['id'] == oid else {})})
        if oid not in seen: return self.send(400, b'{"error":"Besitzer fehlt"}')
        with LOCK:
            jsave(os.path.join(DATA, 'personen.json'), {'savedAt': x.get('savedAt') or int(time.time() * 1000), 'list': clean})
            a = auth_load(); gone = set(a['users']) - seen
            if gone:                                            # entfernte Personen: Zugang und Rechte weg
                for g in gone: a['users'].pop(g, None)
                a['tokens'] = {h: e for h, e in a['tokens'].items() if e.get('pid') in seen}; auth_save(a)
            r = jload(RECHTE_F, {})
            if any(g not in seen for g in (r.get('p') or {})):
                r['p'] = {k: v for k, v in r['p'].items() if k in seen}; jsave(RECHTE_F, r)
        return self.send(200, b'{"ok":true}')

def _sys_methods():
    def system_get(self, k):
        c = self.ctx()
        if not c['admin']: return self.send(403, b'{"error":"nur Admins"}')
        q = parse_qs(urlparse(self.path).query)
        if k == 'system':
            cfg = sich_cfg(); z = zustand(); d, ort, _ = ziel_ordner(cfg)
            liste = sicherungen(SD_DIR, 'sd') + (sicherungen(d, 'usb') if ort == 'usb' else [])
            body = {'zustand': z, 'hinweise': hinweise(z, cfg), 'besitzer': c['pid'] == owner_id() or c['open'],
                    'sicherung': {'ziel': cfg['ziel'], 'auto': cfg['auto'], 'uhrzeit': cfg['uhrzeit'], 'letzte': cfg['letzte'], 'ort': ort,
                                  'ziele': usb_ziele(), 'liste': sorted(liste, key=lambda x: -x['ts'])[:40], 'dateien': len(daten_dateien())}}
            return self.send(200, json.dumps(body, ensure_ascii=False).encode('utf-8'))
        if k == 'system_hinweise':
            return self.send(200, json.dumps(hinweise(zustand(), sich_cfg()), ensure_ascii=False).encode('utf-8'))
        if k == 'system_download':                  # frische Komplettsicherung direkt herunterladen
            data, _ = zip_bauen('download'); name = time.strftime('dashboard-%Y-%m-%d_%H%M') + '-download.zip'
            return self.send(200, data, 'application/zip', extra=[('Content-Disposition', f'attachment; filename="{name}"')])
        if k == 'system_datei':
            name = (q.get('name') or [''])[0]; ort = (q.get('ort') or ['sd'])[0]
            d = SD_DIR if ort == 'sd' else ziel_ordner()[0]
            f = os.path.join(d, name)
            if not ZIPNAME.match(name) or not os.path.isfile(f): return self.send(404)
            with open(f, 'rb') as fh: return self.send(200, fh.read(), 'application/zip', extra=[('Content-Disposition', f'attachment; filename="{name}"')])
        return self.send(404)
    def system_post(self, k, n):
        c = self.ctx()
        if not c['admin']: return self.send(403, b'{"error":"nur Admins"}')
        if n > 200_000_000: return self.send(413)
        raw = self.rfile.read(n) if n > 0 else b''
        if k == 'system_sichern':
            return self.send(200, json.dumps(sichern('manuell'), ensure_ascii=False).encode('utf-8'))
        if k == 'system_einstellung':
            x = self.jbody(raw); cfg = sich_cfg()
            if 'ziel' in x:
                z = str(x.get('ziel') or '')
                if z and z not in [u['pfad'] for u in usb_ziele()]: return self.send(400, b'{"error":"Ziel nicht gefunden"}')
                cfg['ziel'] = z
            if 'auto' in x: cfg['auto'] = bool(x['auto'])
            if 'uhrzeit' in x and re.fullmatch(r'([01]\d|2[0-3]):[0-5]\d', str(x['uhrzeit'])): cfg['uhrzeit'] = x['uhrzeit']
            jsave(SICH_F, cfg); return self.send(200, b'{"ok":true}')
        if k == 'system_zurueck':                   # nur der Besitzer: überschreibt alles inkl. Personen und PINs
            if not (c['pid'] == owner_id() or c['open']): return self.send(403, b'{"error":"nur der Besitzer"}')
            q = parse_qs(urlparse(self.path).query); name = (q.get('name') or [''])[0]
            if name:
                ort = (q.get('ort') or ['sd'])[0]; f = os.path.join(SD_DIR if ort == 'sd' else ziel_ordner()[0], name)
                if not ZIPNAME.match(name) or not os.path.isfile(f): return self.send(404, b'{"error":"nicht gefunden"}')
                with open(f, 'rb') as fh: raw = fh.read()
            try: res = zurueckspielen(raw)
            except Exception as e: return self.send(400, json.dumps({'error': 'Ungültige Sicherung: ' + str(e)[:150]}, ensure_ascii=False).encode('utf-8'))
            return self.send(200, json.dumps(res, ensure_ascii=False).encode('utf-8'))
        return self.send(404)
    H.system_get = system_get; H.system_post = system_post
_sys_methods()

def passwort_setzen():
    """Notfall: Passwort des Besitzers auf dem Pi setzen (python3 server.py passwort)."""
    import getpass
    a = auth_load(); oid = owner_id()
    print('Passwort für ' + oid.capitalize() + (' (ersetzt das alte, alle seine Geräte werden abgemeldet)' if oid in a['users'] else ''))
    while True:
        p1 = getpass.getpass('Neues Passwort: ')
        if len(p1) < 4: print('Mindestens 4 Zeichen.'); continue
        if getpass.getpass('Nochmal: ') != p1: print('Stimmt nicht überein.'); continue
        break
    set_secret(a, oid, p1, 'pw'); a['tokens'] = {h: e for h, e in a['tokens'].items() if e.get('pid') != oid}; auth_save(a)
    print('Gespeichert.')

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'passwort': passwort_setzen(); sys.exit(0)
    print(f'{TITLE} läuft auf Port {PORT} – Daten in {DATA} – {len(apps())} Tools im Register')
    threading.Thread(target=auto_sicherung, daemon=True).start()
    ThreadingHTTPServer(('0.0.0.0', PORT), H).serve_forever()
