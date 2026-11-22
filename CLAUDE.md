# Hinweise für KI-Assistenten

Diese Datei lesen Claude Code und ähnliche Assistenten automatisch, wenn sie in diesem Repo arbeiten. Für Menschen steht dasselbe ausführlicher in [docs/ENTWICKLUNG.md](docs/ENTWICKLUNG.md).

## Projekt

Selbst gehostetes Dashboard für den Raspberry Pi. `dashboard/server.py` (nur Python-Standardbibliothek) liefert Tools aus `dashboard/www/` aus und gleicht ihre `localStorage`-Daten ab. Jedes Tool ist **eine** HTML-Datei; die neueren werden aus `quellcode/<tool>/` gebaut. Oberfläche und Doku sind auf Deutsch.

## Regeln

- **Quellcode ändern, nicht die gebaute Datei.** Danach `python3 scripts/build_all.py`; Quelle und gebaute HTML gemeinsam committen. Semesterplaner und Notencockpit haben keinen Quellordner, dort direkt in `dashboard/www/`.
- **Keine neuen Abhängigkeiten:** Server nur mit Standardbibliothek, Tools ohne Framework und ohne Laden aus dem Internet.
- **Daten abwärtskompatibel halten:** neue Felder mit Standardwert in `normalize()`, keine Migration bestehender Stände. Sync „liste“: Einträge mit `upd`, Löschen als Grabstein, automatisch angelegte Einträge mit festen IDs und `upd: 1`.
- **Verträge mit den Claude-Skills** (`ki/skills/`): Änderst du `fotoCode()` (Ernährung, Format `ESSEN1`) oder `csvExport()` (Einkaufsliste), passe die zugehörige `SKILL.md` im selben Commit an, und umgekehrt.
- **Keine persönlichen Daten**: nichts aus `data/`, keine echten Namen, Kurse, Mailadressen, Noten oder eingebetteten Stände („HTML mit Daten speichern“). Beispielpersonen heißen Alex, Sam, Kim, Robin; Beispielkurse sind ausgedacht.
- `CHANGELOG.md` unter „Unveröffentlicht“ ergänzen; bei Bedienungsänderungen `docs/ANLEITUNG.md`.

## Prüfen

```bash
python3 dashboard/server.py selbsttest
python3 scripts/build_all.py --check
python3 scripts/pack_skills.py --check
node --check dashboard/sync.js
```

Oberflächen bei 375, 768 und 1280 px Breite, hell und dunkel ansehen: kein waagrechtes Scrollen, keine Skriptfehler, Knöpfe mindestens 44 px auf Touch-Geräten.
