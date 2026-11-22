# Handover-Ergänzung: Runde 8 – Neues Tool „Einkaufsliste“ (22.11.2026)

Ergänzt `HANDOVER_Runde7.md`. Gewünscht von Alex: eigenes Tool im Dashboard für die ganze Familie, nach Laden-Bereich sortiert, häufige Artikel antippen, Mengen und Notizen, wer eingetragen / gekauft hat.

Neu: `quellcode/einkauf/` (`body.html`, `style.css`, `app.js`, `build.py`, `mkicons.py`) → `www/Einkauf.html` (`python3 quellcode/einkauf/build.py dashboard/www/Einkauf.html`), Icons `www/icons/einkauf-{64,180,192,512}.png` (`python3 quellcode/einkauf/mkicons.py dashboard/www/icons`; liegen nur im Update-Zip).
Geändert: `pi-uni/apps.json` (Eintrag vor dem Haushaltsbuch). **Kein Neustart nötig**, `server.py`, `sync.js`, `shell.js`, `dashboard.html` unverändert. Lieferung `pi-update-einkauf.zip` (unabhängig vom Runde-7-Update).

## Register
`{"id":"einkauf","datei":"Einkauf.html","titel":"Einkaufsliste","kurz":"Einkauf","gruppe":"Alltag","farbe":"#C2720C","kachel":"2x2","keys":["einkauf_v1"],"sync":"liste","familie":true,"neu":true}`
- `familie:true` → jede Person darf ohne Freigabe bearbeiten (Verwaltung kann auf Sehen/Kein stellen). Kein `proPerson`: eine gemeinsame Liste. „Eigene (leer)“ aus Runde 7 geht trotzdem, falls jemand eine eigene Liste will.
- Hell/Dunkel über den gemeinsamen Schlüssel `launcher_theme` (deshalb keine Änderung an `shell.js`/`dashboard.html` nötig). `html[data-app]` = `einkauf` (Fallback aus dem Dateinamen).

## Daten (`einkauf_v1`, Sync „liste“)
- `items{id,name,menge,notiz,ber,von,erst,status:'offen'|'gekauft',gekauftVon,gekauftAm,bestellt?,upd}`
- `arts{id:'a-'+norm(name),name,ber,n,last,upd}` – Artikel-Gedächtnis: Bereich (auch von Hand korrigiert) und wie oft gekauft.
- `set{order:[bereich],upd}` – Reihenfolge der Bereiche im Laden, gilt für alle. `normalize()` ergänzt neue Bereiche hinten.

## Bedienung
- **Schnelleingabe** `parseAll()`: mehrere Artikel mit `,` `;` Zeilenumbruch; Menge vorn oder hinten mit Einheit (`2 Milch`, `Milch 2x`, `500 g Hack`, `Mehl 1 kg`), Notiz in Klammern oder nach ` – `. Live-Vorschau mit Menge und Ziel-Bereich. Steht ein Artikel schon offen drauf: Menge/Notiz werden übernommen, sonst Hinweis „steht schon drauf“.
- **Bereiche** `BER` (10, Obst & Gemüse … Sonstiges). `guessBer()`: zuerst das Gedächtnis (`arts`), sonst Stichwörter (`KW`, `=wort` nur ganzes Wort); es gewinnt das Stichwort, das am weitesten hinten endet (Apfel|saft → Getränke, Tomaten|mark → Vorrat). 33 Beispielwörter geprüft.
- **Abhaken** → „Im Wagen“ (24 h sichtbar, zurückholbar, Rückgängig im Hinweis), „gekauft von …“, zählt `arts.n`. „Gekaufte entfernen“ löscht sie; nach 7 Tagen räumt die App selbst auf (`cleanup`).
- **Oft gekauft**: bis 14 Chips nach `n`/`last`, ohne was schon offen ist; ohne Verlauf Startvorschläge (Milch, Brot, Eier …).
- **Blatt** je Artikel: Name, Menge, Notiz, Bereich (wird gemerkt), „eingetragen von / gekauft von“, Löschen, „Wieder auf die Liste“.
- **Einstellungen**: Reihenfolge im Laden mit ↑/↓, Standard-Reihenfolge.
- Nur ansehen: keine Eingabe, Haken gesperrt. Ohne Pi (Datei/Artefakt) läuft alles lokal.
- **Kachel** v1 (`PUT /api/sum_einkauf`, `window.__dashSum`): `zahl` = offene Artikel, `zeilen` = erste 6 in Laden-Reihenfolge (Menge, Bereich, Notiz, von), `leer`. `#neu` setzt den Fokus in die Eingabe.

## 8b. Export für Online-Bestellung (REWE über Claude)
- Knopf „Export für Online-Bestellung“ unter der Liste (nur bei offenen Artikeln) → Blatt mit Auswahl (siehe 8c), „CSV herunterladen“ (`einkauf-rewe-JJJJ-MM-TT.csv`), „CSV kopieren“ (auf dem Pi ohne HTTPS über das markierte Textfeld + `execCommand('copy')`), Vorschau und Abhaken der gewählten Artikel als bestellt (setzt `gekauft` + `bestellt:1`, zählt für „Oft gekauft“, mit Rückgängig; „Im Wagen“ zeigt „bestellt von …“).
- `csvExport(liste?)`: Komma-getrennt, UTF-8, Felder mit `,` `"` Zeilenumbruch in Anführungszeichen. Ohne Argument alle offenen Artikel, im Blatt nur die gewählten (`expCsv()`), immer in Laden-Reihenfolge (`ladenSort`), `nr` fortlaufend. Spalten: `nr, artikel, anzahl, gesamtmenge, einheit, menge_original, notiz, suchbegriff, bereich, eingetragen_von`. `mengeTeile()`: g/kg/ml/l → `gesamtmenge`+`einheit`, `anzahl` 1; sonst Zahl (× oder Stückeinheit wie Dosen/Pck) → `anzahl`; leer → 1.
- Gegenstück: Claude-Skill **`rewe-bestellung`** (vorgeschlagen 22.11.2026, gespeichert in Alexs Skills, nicht im Projekt). Liest die CSV, legt auf rewe.de in den Warenkorb (Anmeldung und Markt wählt Alex), `notiz` ist verbindlich, rechnet Mengen um, **fragt gesammelt nach, wenn eine ähnliche Alternative (gleiche Art, Notiz erfüllt, ±30 % Größe, günstiger nach Grundpreis) oder ein Mengenrabatt im Angebot ist**, ersetzt nie still, schickt die Bestellung nicht selbst ab und gibt keine Zahlungsdaten ein.

## 8c. Nur Bestelltes abhaken (22.11.2026)
Anlass: Alex nimmt im REWE-Warenkorb manchmal Artikel wieder heraus; „Alles als bestellt abhaken“ hätte die mit abgehakt (und auch alles, was nach dem Export eingetragen wurde).
- Export-Blatt hat eine **Auswahlliste** (Checkbox je Artikel, Laden-Reihenfolge, Menge und Notiz), Zähler „4 von 6“ und Knopf „Alle/Keine“. Beim Öffnen sind alle offenen Artikel gewählt.
- Sheet-Zustand: `sheet={m:'exp', ids:[…], sel:Set}`. `ids` = Momentaufnahme der offenen Artikel beim Öffnen (`openExp()`) – später Eingetragenes erscheint nicht und wird nie mit abgehakt. `expAlle()` = davon noch offene, `expWahl()` = davon gewählte.
- Die Auswahl gilt für **CSV, Download, Kopieren und Abhaken** gleichermaßen. Abhaken-Knopf: „Alle 6 als bestellt abhaken“ bzw. „4 von 6 als bestellt abhaken“; ohne Auswahl gesperrt (auch Download/Kopieren). Rückfrage nennt, wie viele abgewählt auf der Liste bleiben.
- `alleBestellt(liste)` hakt nur die übergebenen, noch offenen Artikel ab; Rückgängig stellt genau diese wieder her. Abgewählte zählen nicht für „Oft gekauft“.
- Hakt ein anderes Gerät ab, während das Blatt offen ist (storage-Ereignis), verschwindet der Artikel aus der Auswahl; die Liste wird nur neu gezeichnet, wenn sich Artikel geändert haben (Scrollposition bleibt).
- Ablauf für Alex: exportieren → bestellen lassen → Blatt wieder öffnen → Häkchen bei dem entfernen, was nicht im Warenkorb gelandet ist → abhaken.
- Lieferung: nur `www/Einkauf.html` (`pi-update-einkauf-8c.zip`, über System → Programm aktualisieren). Kein Neustart, keine Datenänderung (`bestellt:1` wie bisher).

## Tests
- `tests/test_einkauf.py <url>`: 58 Prüfungen (Chromium) – Rechte (`familie:true`, Kim nur ansehen), Eintragen mit Menge/Notiz/Bereich, Doppelt, zweites Gerät (Sam) sieht „von Alex“, trägt ein, hakt ab → Alex sieht „gekauft von Sam“, Rückgängig, Oft gekauft, Bereich ändern wird gemerkt, Reihenfolge gilt für beide, Aufräumen, Kachel, 375/768/1280 hell/dunkel ohne Querscrollen/Überlauf, Blatt passt, keine Skriptfehler. (In Runde 8c nicht erneut gelaufen – braucht die volle Pi-Testinstanz; 8c ändert nur das Export-Blatt.)
- `tests/test_einkauf_export.py <url>`: 37 Prüfungen – Spalten, Anzahl/Menge/Einheit je Fall, Maskierung von Komma und Anführungszeichen (mit Python-`csv` gelesen), Reihenfolge, Download = Anzeige, Kopieren, alles als bestellt + Rückgängig; **8c:** Auswahl vollständig beim Öffnen, Abwählen ändert CSV/Download/Zähler/Knopf, später Eingetragenes bleibt außen vor, nur Gewähltes wird abgehakt („bestellt von dir“, Zähler „Oft gekauft“ nur dafür), Rückgängig, Keine/Alle mit gesperrten Knöpfen, Abhaken auf anderem Gerät, Blatt 375/768/1280 hell/dunkel. Läuft auch gegen einen einfachen Webserver mit nur `Einkauf.html` (dann legt der Test je Breite zwei Artikel an).
- Nicht geprüft: WebKit/Safari und Firefox (hier nicht installierbar), Darstellung der Kachel im echten `dashboard.html` (lag nur als Platzhalter vor), der Skill gegen die echte REWE-Seite (am 22.11.2026 einmal von Hand durchgespielt: Warenkorb korrekt gefüllt, Anmeldung über Passkey nur in Alexs Chrome möglich).
