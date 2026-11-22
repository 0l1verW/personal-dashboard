# Changelog

Alle nennenswerten Änderungen. Neueste oben. Das Projekt hat keine Versionsnummern; gezählt wird in „Runden“ (je ein Entwicklungsschritt). Ausführliche technische Notizen je Runde stehen in [`docs/entwicklung/`](docs/entwicklung/).

## Unveröffentlicht

### Hinzugefügt
- Anleitung (`docs/ANLEITUNG.md`), Entwickler-Doku (`docs/ENTWICKLUNG.md`), Lizenz (GPL-3.0), `CONTRIBUTING.md`, `SECURITY.md`, `THIRD_PARTY.md`.
- `scripts/build_all.py` (alle Tools bauen bzw. mit `--check` prüfen) und `scripts/make_update_zip.py` (Update-ZIP für `/system`).
- `quellcode/ernaehrung/mkbls.py`: erzeugt `bls.json.gz` aus dem BLS 4.0.
- GitHub: CI-Workflow, Vorlagen für Issues und Pull Requests, `.editorconfig`, `.gitattributes`.

### Geändert
- Startdaten des Semesterplaners sind jetzt zwei ausgedachte Beispielkurse; der eingebettete Stand im Notencockpit ist leer.
- Standard-Personen (falls `data/personen.json` fehlt) heißen jetzt Alex, Sam, Kim und Robin.

### Entfernt
- `dashboard/www/bls.json.gz` (Auszug aus dem BLS 4.0) liegt nicht mehr im Repo; siehe Anleitung, Abschnitt „Lebensmitteldatenbank“.
- Veraltete `dashboard/ANLEITUNG.md` (ersetzt durch `docs/ANLEITUNG.md`) und `dashboard/umzug.sh` (einmaliger Umzug von `pi-uni` nach `dashboard`, erledigt).

**Hinweis für bestehende Installationen:** Wer die Personen nie in der Verwaltung gespeichert hat (es gibt keine `data/personen.json`), sollte das vor dem Update einmal tun. Sonst gelten danach die neuen Standard-Personen und vorhandene Anmeldungen passen nicht mehr.

## Runde 8 – neues Tool „Einkaufsliste“ (22.11.2026)
- Gemeinsame Liste für die Familie, sortiert nach Bereichen in Laden-Reihenfolge.
- Schnelleingabe mit Mengen und Notizen, „Oft gekauft“, Abhaken in „Im Wagen“, wer eingetragen und wer gekauft hat.
- Tests (nicht im Repo): `test_einkauf.py`, `test_einkauf_export.py`.

## Runde 7 – Familie: eigene Daten je Person, private Aufgaben (22.11.2026)
- Je Person und Tool wählbar: gemeinsame oder eigene (leere) Daten; der Pi legt sie getrennt ab, die Tools merken nichts davon.
- Private Aufgaben: nur die eintragende Person sieht sie, auch kein Admin.
- Geteiltes Gerät: beim Personenwechsel verwirft das Gerät fremde lokale Kopien.
- Tests (nicht im Repo): `test_familie_http.py`, `test_familie_browser.py`.

## Runde 6b – Lebensmittel-Formular am Handy (20.11.2026)
- Formular „Neues Lebensmittel“ scrollt am Handy wieder (Nährwert-Tabelle wurde gequetscht).
- Neu angelegtes Lebensmittel erscheint direkt in der Trefferliste.
- Eigene Lebensmittel lassen sich aus „Eintragen“ und aus einem Eintrag heraus bearbeiten.
- Test (nicht im Repo): `test_lebensmittel_bearbeiten.py`.

## Runde 6, Schritt 3 – neues Tool „Training“ (20.11.2026)
- Vorlagen, Satz- und Pausen-Timer, kg/Wdh., Notizen, Fortschritt (Bestgewicht, Volumen, 1RM, Bestwert-Hinweis).
- Kachel mit Start-Knöpfen je Vorlage, Auffrischen im Hintergrund.
- Test (nicht im Repo): `test_schritt3.py` (Chromium und WebKit).

## Runde 6 – Umsetzung der Grill-Runde, Schritt 1 und 2 (20.11.2026)
- Sicherheitsnetz Uhr: geht die Pi-Uhr nach, löscht und archiviert der Pi nichts und zeigt einen roten Hinweis.
- Erinnerung, die Komplettsicherung herunterzuladen (nach 35 Tagen).
- Anmelde-Cookie 1 Jahr, verlängert sich bei jeder Nutzung.
- Tests (nicht im Repo): `harness.py`, `run_server.py`, `test_schritt1.py`, `test_schritt2.py`.

## Runde 5 – Ernährung: Eingabe am Handy (14.11.2026)
- Schnell- und Foto-Einträge lassen sich wieder bearbeiten (Menge optional, Umrechnen erst bei gültigem Bezug).
- Fokus bleibt beim Weitertippen erhalten: neu gezeichnet wird erst, wenn kein Feld mehr aktiv ist.
- Hinweis „Code unvollständig“ beim Foto-Code nur noch einmal je Eingabe.
- Test (nicht im Repo): `test_eingabe_handy.py`.

## Runde 4 – Tracker-Ergänzungen und Haushaltsbuch (12.11.2026)
- Ernährung: „Was passt noch?“, Wochenkonto, Bauchumfang.
- Neues Tool **Haushaltsbuch**: Buchungen per Schnellzeile („12,50 Rewe“), Kategorien nach 50/30/20, Fixkosten buchen sich selbst, Auswertung und Monatsplan, Kachel „frei im Monat“.
- Tests (nicht im Repo): `test_haushalt.py`, `test_essen3.py`.

## Rework – Startseite, gemeinsame Schicht, Delta-Sync (11.11.2026)
- Gemeinsame Schicht `www/shared/` (`shell.js`, `shell.css`): Home-Knopf, ein Theme für alle Tools, einheitlicher Kopf, Notencockpit auf Blau.
- Startseite: Kachel „Heute & Kalender“ über die ganze Breite, Gruppen, alle Tool-Kacheln 2x2.
- Kacheln mit Aktions-Knöpfen (z. B. „+250 ml“ Wasser), Addons `noten-sum.js` und `essen-sum.js`.
- Delta-Sync: Geräte schicken und holen nur Geändertes (laufende Nummer je Eintrag).
- Update-Seite unter `/system`: Programm-ZIP einspielen, Selbsttest, Rückweg über Programmsicherung.
- Health-Import vom iPhone-Kurzbefehl (aktive kcal, Gewicht) in die Ernährung.
- Tests (nicht im Repo): `seed.py`, `test_rework.py` (375/768/1280, hell/dunkel).

## Anfänge (Oktober bis 09.11.2026)
- 30.10.2026: erster Sync-Server für Semesterplaner und Notencockpit.
- 02.11.2026: Ordner `pi-uni` mit Planer, Cockpit und lokalen Schriften.
- 05./06.11.2026: neue Fassungen von Cockpit und Planer.
- 08./09.11.2026: Umbau zum Personal Dashboard: Anmeldung, Rechte, Komplettsicherung, Systemseite; neue Tools Aufgaben (Familie) und Ernährung.
