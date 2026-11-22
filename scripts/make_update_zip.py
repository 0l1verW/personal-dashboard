#!/usr/bin/env python3
"""Packt den Programmstand als Update-ZIP für die Seite /system („Programm aktualisieren“).

    python3 scripts/make_update_zip.py                 # alles unter dashboard/ -> pi-update.zip
    python3 scripts/make_update_zip.py www/Einkauf.html sync.js   # nur diese Dateien (relativ zu dashboard/)

Das ZIP enthält nur Programmdateien (Pfade beginnen mit dashboard/). data/ ist nie dabei;
der Pi lehnt ein ZIP mit Daten ohnehin ab und sichert vor dem Einspielen alles.
"""
import os
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DASH = os.path.join(ROOT, 'dashboard')
SKIP_DIRS = {'data', '__pycache__'}
SKIP_EXT = {'.pyc', '.tmp'}


def files(args):
    if args:
        for a in args:
            p = os.path.normpath(os.path.join(DASH, a))
            if not p.startswith(DASH + os.sep) or not os.path.isfile(p):
                sys.exit('Nicht gefunden (Pfad relativ zu dashboard/): ' + a)
            yield p
        return
    for d, dirs, fs in os.walk(DASH):
        dirs[:] = sorted(x for x in dirs if x not in SKIP_DIRS)
        for f in sorted(fs):
            if os.path.splitext(f)[1] not in SKIP_EXT:
                yield os.path.join(d, f)


def main():
    out = os.path.join(ROOT, 'pi-update.zip')
    n = 0
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for p in files(sys.argv[1:]):
            z.write(p, 'dashboard/' + os.path.relpath(p, DASH).replace(os.sep, '/'))
            n += 1
    print(f'{os.path.relpath(out, ROOT)}: {n} Dateien. Einspielen: /system → „Update-Datei wählen …“')


if __name__ == '__main__':
    main()
