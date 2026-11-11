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
