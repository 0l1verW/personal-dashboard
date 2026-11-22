#!/usr/bin/env python3
"""Baut alle Tools aus quellcode/<tool>/ nach dashboard/www/.

    python3 scripts/build_all.py           # bauen
    python3 scripts/build_all.py --check   # nur prüfen, ob dashboard/www zum Quellcode passt (für CI)

Semesterplaner und Notencockpit haben (noch) keinen Quellcode im Repo; sie liegen nur gebaut vor.
"""
import os
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS = {                      # Quellordner -> Datei in dashboard/www
    'aufgaben': 'Aufgaben.html',
    'ernaehrung': 'Ernaehrung.html',
    'haushalt': 'Haushaltsbuch.html',
    'training': 'Training.html',
    'einkauf': 'Einkauf.html',
}


def build(src, out):
    subprocess.run([sys.executable, os.path.join(ROOT, 'quellcode', src, 'build.py'), out],
                   check=True, stdout=subprocess.DEVNULL)


def main():
    check = '--check' in sys.argv[1:]
    bad = []
    with tempfile.TemporaryDirectory() as tmp:
        for src, name in TOOLS.items():
            target = os.path.join(ROOT, 'dashboard', 'www', name)
            if not check:
                build(src, target)
                print('gebaut:', os.path.relpath(target, ROOT))
                continue
            out = os.path.join(tmp, name)
            build(src, out)
            with open(out, 'rb') as a, open(target, 'rb') as b:
                same = a.read() == b.read()
            print(('ok      ' if same else 'ANDERS  ') + name)
            if not same:
                bad.append(name)
    if bad:
        print('\nNicht neu gebaut: ' + ', '.join(bad) + '. Bitte  python3 scripts/build_all.py  ausführen und committen.')
        sys.exit(1)


if __name__ == '__main__':
    main()
