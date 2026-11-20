# Handover-Ergänzung: Runde 6b – Lebensmittel-Formular am Handy, eigene Lebensmittel bearbeiten (20.11.2026)

Ergänzt `HANDOVER_Runde6.md`. Geändert: `quellcode/ernaehrung/app3.js`, `quellcode/ernaehrung/style.css` → `www/Ernaehrung.html`. **Kein Neustart nötig**, keine Datenänderung. Lieferung als `pi-update.zip` (`dashboard/www/Ernaehrung.html`), einspielen über `/system`.

## Fehler und Ursachen
1. **Formular „Neues Lebensmittel“ (u. a. nach Barcode → „Mit Nummer anlegen“) am Handy abgeschnitten, nicht scrollbar.** `.dlg .db` ist eine Flex-Spalte mit `overflow:auto`; die Nährwert-Tabelle `.nk` hat `overflow:hidden` → ihre Mindesthöhe ist 0, der Browser quetscht sie statt zu scrollen (iPhone 375×667: 117 von 463 px, mit offener Tastatur 0 px; Eiweiß/Salz unerreichbar). Gleiches Risiko bei `.res` (Trefferliste) und `.lst`.
   Fix: `.dlg .db>*{flex-shrink:0}` – das Blatt scrollt jetzt.
2. **Neu angelegtes Lebensmittel nach „Speichern“ nicht in der Trefferliste.** Rückweg setzte die Suche auf leer; eigene Lebensmittel ohne Nutzung punkten (2) unter der Grundliste (4) und fielen hinter Platz 60 → „Gespeichert – Menge wählen“, aber nichts zu sehen.
   Fix: Rückweg setzt die Suche auf EAN bzw. Name des Lebensmittels.
3. **Eigene Lebensmittel nach dem Anlegen nur unter „Lebensmittel → Eigene“ änderbar.**
   - Im Blatt „Eintragen“ hat ein aufgeklapptes eigenes Lebensmittel jetzt „Bearbeiten“ (`data-fedit`); nach dem Speichern zurück ins Blatt, Lebensmittel bleibt offen, Teller bleibt.
   - Im Eintrag-Blatt (Eintrag aus eigenem Lebensmittel): Zeile „Werte kommen aus deinem Lebensmittel …“ + „Nährwerte bearbeiten“. Nach dem Speichern zurück in den Eintrag; **dieser** Eintrag wird mit den neuen Werten neu berechnet (`scale(je100, g)`), andere frühere Einträge bleiben unverändert.
   - `data-fedit` merkt sich `back`, wenn es aus `add` oder `edit` kommt; aus der Ansicht „Lebensmittel“ wie bisher ohne Rückweg.

## Tests
- `tests/test_lebensmittel_bearbeiten.py` (Playwright/Chromium, Seite als `file://`): 80 Prüfungen bei 375×667, 375×380 (Tastatur offen), 768×1024, 1280×800 – Tabelle nicht gequetscht, jedes Nährwertfeld bis Salz erreichbar, Lebensmittel nach Anlegen offen, Bearbeiten vorbelegt, geänderte kcal sichtbar, Eintrag → „Nährwerte bearbeiten“ → Eintrag neu berechnet, kein horizontales Scrollen, keine JS-Fehler. Gegen den alten Stand schlagen die Prüfungen wie erwartet fehl.
- Nicht erneut gelaufen: `test_schritt2.py` u. a. (brauchen den Server-Harness); WebKit nicht geprüft.
