# Entwicklung

Wie das Projekt aufgebaut ist, wie man ein Tool ändert und wie ein neues Tool dazukommt.

## Grundidee

- **Ein Tool = eine HTML-Datei** mit allem drin (CSS, Markup, JavaScript). Sie speichert ihren Stand in `localStorage` und läuft auch ohne Server, z. B. direkt aus dem Dateisystem.
- **Der Server** (`dashboard/server.py`, nur Python-Standardbibliothek) liefert die Datei aus und fügt dabei ein:
  - `sync.js`: spiegelt die in `apps.json` genannten `localStorage`-Keys auf den Pi und zurück,
  - `www/shared/shell.js` und `shell.css`: einheitlicher Kopf, Home-Knopf, ein Farbschema für alle Tools,
  - Icons, lokale Schriften (Google-Fonts-Links werden entfernt) und die Rechte der angemeldeten Person (`window.__PI_ROLE`).
- **Die Startseite** (`dashboard.html`) zeigt je Tool eine Kachel. Den Inhalt liefert das Tool selbst als Kurzinfo (`PUT /api/sum_<id>`).

## Lokal starten

```bash
python3 dashboard/server.py 8097      # http://localhost:8097, Daten in dashboard/data/
python3 dashboard/server.py selbsttest
```

Für Tests einen eigenen Port und am besten eine Kopie des Ordners ohne `data/` nehmen.

## Ein Tool ändern

Die neueren Tools haben Quellen unter `quellcode/<tool>/`:

| Ordner | gebaute Datei |
|---|---|
| `aufgaben/` | `dashboard/www/Aufgaben.html` |
| `ernaehrung/` | `dashboard/www/Ernaehrung.html` |
| `haushalt/` | `dashboard/www/Haushaltsbuch.html` |
| `training/` | `dashboard/www/Training.html` |
| `einkauf/` | `dashboard/www/Einkauf.html` |

Jeder Ordner hat `style.css`, `body.html`, ein oder mehrere `app*.js` und `build.py`, das alles zu einer Datei zusammensetzt. Nach einer Änderung:

```bash
python3 scripts/build_all.py           # alle Tools neu bauen
python3 scripts/build_all.py --check   # prüft, ob die gebauten Dateien zum Quellcode passen (läuft auch in der CI)
```

**Immer Quellcode und gebaute Datei zusammen committen.** Die gebaute Datei liegt im Repo, damit der Pi ohne Build-Schritt auskommt.

Semesterplaner und Notencockpit liegen bisher nur gebaut vor (`dashboard/www/`); Änderungen dort direkt in der HTML-Datei.

Icons erzeugen die `mkicons.py` in den Quellordnern (braucht Pillow):

```bash
python3 quellcode/training/mkicons.py dashboard/www/icons
```

## Ein neues Tool hinzufügen

1. HTML-Datei nach `dashboard/www/` legen (am besten mit Quellordner unter `quellcode/` wie oben).
2. Icons `dashboard/www/icons/<id>-{64,180,192,512}.png` anlegen. Fehlen sie, nimmt der Server ein allgemeines Icon.
3. Eintrag in `dashboard/apps.json`, z. B.:

   ```json
   {"id": "einkauf", "datei": "Einkauf.html", "titel": "Einkaufsliste", "kurz": "Einkauf",
    "gruppe": "Alltag", "farbe": "#C2720C", "kachel": "2x2", "keys": ["einkauf_v1"],
    "sync": "liste", "familie": true, "neu": true}
   ```

   Der Server liest `apps.json` bei jeder Änderung neu, ein Neustart ist nicht nötig.

### Felder in `apps.json`

| Feld | Bedeutung |
|---|---|
| `id` | kurze Kennung (Kachel `sum_<id>`, Rechte, Icons) |
| `datei` | HTML-Datei in `www/` |
| `titel`, `kurz` | Name auf der Kachel bzw. kurz |
| `gruppe` | Überschrift auf der Startseite |
| `farbe`, `kachel` | Akzentfarbe, Kachelgröße (`2x2`) |
| `keys` | `localStorage`-Keys, die der Pi abgleicht |
| `sync` | `ganz` (neuester Gesamtstand gewinnt) oder `liste` (Abgleich pro Eintrag, siehe unten) |
| `familie` | `true`: jede Person darf ohne eigene Freigabe bearbeiten |
| `proPerson` | `true`: Kachel je Person (z. B. Aufgaben) |
| `addon` | Skript unter `www/`, das zusätzlich eingefügt wird (z. B. Kachel-Anpassung für ältere Tools) |
| `bg`, `bgZeit` | Startseite frischt die Kachel im Hintergrund auf (immer bzw. alle 20 Minuten) |
| `archiv` | nur Einträge der letzten N Tage auf die Geräte geben (`sammlungen`, `feld`, `tage`, `tageJe`) |
| `neu` | Markierung „neu“ auf der Startseite |

### Datenformat für `sync: "liste"`

Der gespeicherte Stand ist ein Objekt mit **Sammlungen** der Form `{id: {…, upd: <ms>}}` und einfachen Feldern (z. B. `set`). Regeln:

- Jede Änderung setzt `upd = Date.now()` am Eintrag. Der neuere Eintrag gewinnt.
- Löschen = Grabstein `{id, upd, del: true}`, nicht entfernen. Der Server räumt alte Grabsteine nach 60 Tagen weg.
- Einträge, die beim ersten Start automatisch entstehen (z. B. Standard-Kategorien), brauchen **feste IDs und `upd: 1`**, damit zwei Geräte nichts doppelt anlegen.
- Der Pi vergibt je Eintrag eine laufende Nummer `_s`; `sync.js` schickt und holt damit nur Geändertes.

### Kachel (Kurzinfo v1)

Das Tool schickt eine Kurzinfo an `PUT /api/sum_<id>` und stellt sie zusätzlich als `window.__dashSum()` bereit. Felder (alle optional):

```js
{v: 1, savedAt: Date.now(),
 zahl:   {wert, einheit, label},                 // große Zahl
 ring:   {wert, von, label},                     // Fortschrittsring
 balken: [{l, wert, von, einheit, farbe}],
 zeilen: [{t, sub, due, ton: 'bad'|'warn', id, ab: 1}],   // ab: auf der Kachel abhakbar (Tool braucht window.__dashAct)
 termine:[{t, datum, due}],                      // landen im Kalender „Heute“
 links:  [{l, hash, titel}],                     // Knöpfe, öffnen das Tool mit #hash
 aktionen:[…],                                   // Schnellaktionen, siehe docs/entwicklung/HANDOVER_Rework.md
 leer: 'Text, wenn nichts da ist', bis: <ms>}    // bis: danach frischt die Startseite die Kachel auf
```

Hash-Konventionen: `#neu` öffnet die Eingabe, `#hintergrund` heißt „unsichtbar geladen“ (keine automatischen Buchungen o. Ä.).

## Prüfen vor einem Commit

```bash
python3 -m py_compile dashboard/server.py
python3 dashboard/server.py selbsttest
python3 scripts/build_all.py --check
```

Dazu die geänderten Tools im Browser bei 375, 768 und 1280 px Breite, hell und dunkel ansehen. Die CI (`.github/workflows/ci.yml`) führt die drei Befehle oben und `node --check` für alle Skripte aus.

Die Browser-Tests aus der Entwicklung (Playwright) sind nicht Teil des Repos; die Notizen in `docs/entwicklung/` beschreiben, was jeweils geprüft wurde.

## Persönliche Daten

Echte Daten gehören **nie** ins Repo: `data/` ist ausgeschlossen. Beispieldaten im Code (Startkurse, Standard-Personen) sind ausgedacht. Wer ein Tool mit „HTML mit Daten speichern“ exportiert, bettet seinen Stand in die Datei ein; so eine Datei nicht committen.
