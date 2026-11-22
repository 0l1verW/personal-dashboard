#!/usr/bin/env python3
"""Erzeugt dashboard/www/bls.json.gz aus dem Bundeslebensmittelschlüssel (BLS) 4.0.

Der BLS wird vom Max Rubner-Institut unter CC BY 4.0 bereitgestellt (https://www.blsdb.de). Ein fertiger
Auszug liegt bereits im Repo; dieses Skript braucht man nur für eine neuere Version. Excel-Datei herunterladen, dann:

    pip install openpyxl
    python3 quellcode/ernaehrung/mkbls.py BLS_4_0.xlsx dashboard/www/bls.json

Es entstehen bls.json und bls.json.gz; der Pi liefert die .gz-Datei aus. Bei Änderungen an der Auswahl
oder Rundung bitte dashboard/www/LICENSE-BLS.txt anpassen (CC BY 4.0 verlangt, Änderungen anzugeben).
"""
import collections
import gzip
import json
import sys

import openpyxl

if len(sys.argv) != 3:
    sys.exit(__doc__)

wb = openpyxl.load_workbook(sys.argv[1], read_only=True); ws = wb.active
it = ws.iter_rows(values_only=True); h = next(it)
codes = "ENERCC PROT625 CHO FAT FIBT SUGAR NACL ALC FASAT FAPUN3 VITAA VITD VITE VITK THIA RIBF NIAEQ VITB6 FOL VITB12 VITC K CA MG FE ZN ID P".split()
keys = "kcal p kh f bal zucker salz alk sfa o3 vA vD vE vK b1 b2 b3 b6 fol b12 vC k ca mg fe zn jod phos".split()
col = {c: [i for i, x in enumerate(h) if isinstance(x, str) and x.split(' ')[0] == c][0] for c in codes}
types = collections.Counter(); rows = []; miss = collections.Counter()


def rnd(v, k):
    if k == 'b6': v = v / 1000          # Einheit an die App angepasst
    a = abs(v)
    if a >= 100: return round(v)
    if a >= 10: return round(v, 1)
    if a >= 1: return round(v, 2)
    return round(v, 3)


for r in it:
    if not r[0]: continue
    out = [r[0], r[1]]
    for c, k in zip(codes, keys):
        v = r[col[c]]; types[type(v).__name__] += 1
        if isinstance(v, (int, float)): out.append(rnd(float(v), k))
        elif isinstance(v, str) and v.strip() in ('<LOD', 'TR', '<LOQ', '<LOD or <LOQ'): out.append(0)
        else: out.append(None); miss[k] += 1
    rows.append(out)
print(types, len(rows)); print('ohne Wert:', dict(miss))
d = {"src": "Max Rubner-Institut (2025): Bundeslebensmittelschlüssel (BLS), Version 4.0. Karlsruhe.", "keys": keys, "rows": rows}
s = json.dumps(d, ensure_ascii=False, separators=(',', ':'))
open(sys.argv[2], 'w', encoding='utf-8').write(s)
gzip.open(sys.argv[2] + '.gz', 'wb', 9).write(s.encode())
print(len(s), 'Zeichen ->', sys.argv[2] + '.gz')
