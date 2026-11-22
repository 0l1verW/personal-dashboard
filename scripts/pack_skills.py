#!/usr/bin/env python3
"""Prüft die Claude-Skills unter ki/skills/ und packt sie als ZIP zum Hochladen in Claude.

    python3 scripts/pack_skills.py           # prüfen und nach dist/<name>.zip packen
    python3 scripts/pack_skills.py --check   # nur prüfen (für CI)

Geprüft wird, was Claude beim Hochladen verlangt: SKILL.md mit Frontmatter (name, description),
Ordnername = name, Beschreibung höchstens 200 Zeichen. Im ZIP liegt der Skill-Ordner oben (<name>/SKILL.md).
"""
import os
import re
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKILLS = os.path.join(ROOT, 'ki', 'skills')
DIST = os.path.join(ROOT, 'dist')


def check(name):
    f = os.path.join(SKILLS, name, 'SKILL.md')
    if not os.path.isfile(f):
        return ['SKILL.md fehlt']
    s = open(f, encoding='utf-8').read()
    m = re.match(r'^---\n(.*?)\n---\n', s, re.S)
    if not m:
        return ['Frontmatter (--- … ---) fehlt']
    fm = dict(re.findall(r'^(\w+):\s*"?(.*?)"?\s*$', m.group(1), re.M))
    err = []
    if fm.get('name') != name:
        err.append(f'name „{fm.get("name")}“ passt nicht zum Ordner „{name}“')
    d = fm.get('description', '')
    if not d:
        err.append('description fehlt')
    elif len(d) > 200:
        err.append(f'description hat {len(d)} Zeichen (höchstens 200)')
    return err


def main():
    only_check = '--check' in sys.argv[1:]
    names = sorted(n for n in os.listdir(SKILLS) if os.path.isdir(os.path.join(SKILLS, n)))
    bad = False
    for n in names:
        err = check(n)
        if err:
            bad = True
            print(f'FEHLER  {n}: ' + '; '.join(err))
            continue
        if only_check:
            print(f'ok      {n}')
            continue
        os.makedirs(DIST, exist_ok=True)
        out = os.path.join(DIST, n + '.zip')
        with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
            for d, _, fs in os.walk(os.path.join(SKILLS, n)):
                for f in sorted(fs):
                    p = os.path.join(d, f)
                    z.write(p, os.path.relpath(p, SKILLS).replace(os.sep, '/'))
        print(f'gepackt {os.path.relpath(out, ROOT)}')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
