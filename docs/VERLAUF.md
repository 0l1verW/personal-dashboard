# Entwicklungsverlauf

Was in welcher Runde dazukam. Die Runden ab dem 11.11.2026 sind hier beschrieben; ihr Code ist noch nicht im Repo (siehe README).

## Rework – Startseite, gemeinsame Schicht, Delta-Sync (11.11.2026)
- Gemeinsame Schicht `www/shared/` (`shell.js`, `shell.css`): Home-Knopf, ein Theme für alle Tools, einheitlicher Kopf, Notencockpit auf Blau.
- Startseite: Kachel „Heute & Kalender“ über die ganze Breite, Gruppen, alle Tool-Kacheln 2x2.
- Kacheln mit Aktions-Knöpfen (z. B. „+250 ml“ Wasser), Addons `noten-sum.js` und `essen-sum.js`.
- Delta-Sync: Geräte schicken und holen nur Geändertes (laufende Nummer je Eintrag).
- Update-Seite unter `/system`: Programm-ZIP einspielen, Selbsttest, Rückweg über Programmsicherung.
- Health-Import vom iPhone-Kurzbefehl (aktive kcal, Gewicht) in die Ernährung.
- Tests: `seed.py`, `test_rework.py` (375/768/1280, hell/dunkel).

## Runde 4 – Tracker-Ergänzungen und Haushaltsbuch (12.11.2026)
- Ernährung: „Was passt noch?“, Wochenkonto, Bauchumfang.
- Neues Tool **Haushaltsbuch**: Buchungen per Schnellzeile („12,50 Rewe“), Kategorien nach 50/30/20, Fixkosten buchen sich selbst, Auswertung und Monatsplan, Kachel „frei im Monat“.
- Tests: `test_haushalt.py`, `test_essen3.py`.

## Runde 5 – Ernährung: Eingabe am Handy (14.11.2026)
- Schnell- und Foto-Einträge lassen sich wieder bearbeiten (Menge optional, Umrechnen erst bei gültigem Bezug).
- Fokus bleibt beim Weitertippen erhalten: neu gezeichnet wird erst, wenn kein Feld mehr aktiv ist.
- Hinweis „Code unvollständig“ beim Foto-Code nur noch einmal je Eingabe.
- Test: `test_eingabe_handy.py`.

## Runde 6 – Umsetzung der Grill-Runde, Schritt 1 und 2 (20.11.2026)
- Sicherheitsnetz Uhr: geht die Pi-Uhr nach, löscht und archiviert der Pi nichts und zeigt einen roten Hinweis.
- Erinnerung, die Komplettsicherung herunterzuladen (nach 35 Tagen).
- Anmelde-Cookie 1 Jahr, verlängert sich bei jeder Nutzung.
- Tests: `harness.py`, `run_server.py`, `test_schritt1.py`, `test_schritt2.py`.

## Runde 6, Schritt 3 – neues Tool „Training“ (20.11.2026)
- Vorlagen, Satz- und Pausen-Timer, kg/Wdh., Notizen, Fortschritt (Bestgewicht, Volumen, 1RM, Bestwert-Hinweis).
- Kachel mit Start-Knöpfen je Vorlage, Auffrischen im Hintergrund.
- Test: `test_schritt3.py` (Chromium und WebKit).

## Runde 6b – Lebensmittel-Formular am Handy (20.11.2026)
- Formular „Neues Lebensmittel“ scrollt am Handy wieder (Nährwert-Tabelle wurde gequetscht).
- Neu angelegtes Lebensmittel erscheint direkt in der Trefferliste.
- Eigene Lebensmittel lassen sich aus „Eintragen“ und aus einem Eintrag heraus bearbeiten.
- Test: `test_lebensmittel_bearbeiten.py`.

## Runde 7 – Familie: eigene Daten je Person, private Aufgaben (22.11.2026)
- Je Person und Tool wählbar: gemeinsame oder eigene (leere) Daten; der Pi legt sie getrennt ab, die Tools merken nichts davon.
- Private Aufgaben: nur die eintragende Person sieht sie, auch kein Admin.
- Geteiltes Gerät: beim Personenwechsel verwirft das Gerät fremde lokale Kopien.
- Tests: `test_familie_http.py`, `test_familie_browser.py`.
