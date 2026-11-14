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
