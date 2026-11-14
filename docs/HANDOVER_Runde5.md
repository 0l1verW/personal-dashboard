# Handover-Ergänzung: Runde 5 – Ernährung, Eingabe am Handy (14.11.2026)

Ergänzt `HANDOVER_Rework.md` (Abschnitt 8). Geändert: nur `quellcode/ernaehrung/app3.js` → `www/Ernaehrung.html` neu gebaut. Lieferung: `pi-update.zip` mit `dashboard/www/Ernaehrung.html` (kein Neustart nötig).

## 9a. Schnell-/Foto-Einträge bearbeiten
- **Fehler:** Schnell-Einträge haben `g:0`. Beim Bearbeiten stand „0“ im Mengenfeld, „Speichern“ brach mit „Menge eintragen“ ab. Trug man eine Menge ein, überschrieb `liveEdit(true)` die von Hand geänderten kcal mit den alten Werten (Faktor 1, weil `e.g` 0 war).
- **Jetzt:** Bei Einträgen ohne Lebensmittel ist die Menge freiwillig (Feld leer, „(optional)“). Bezug für das Umrechnen ist `sheet.base = {g, n}`: der Stand beim Öffnen, nach jeder Wert-Änderung neu gesetzt.
  - `liveEdit('menge')`: rechnet die Felder nur um, wenn Bezug und neue Menge > 0 sind. Sonst bleiben die Felder stehen.
  - `liveEdit('wert')`: übernimmt die Eingaben und merkt sie als neuen Bezug. Leere Felder bedeuten „kein Wert“.
  - Speichern: kcal ist Pflicht, gesättigt ≤ Fett, Menge 0–5000. Einträge mit Lebensmittel brauchen weiter eine Menge.
- Schnell-Eintrag hat ein optionales Feld **Menge (g)**, damit sich der Eintrag später umrechnen lässt. Auf dem Teller steht bei Einträgen ohne Menge kein „0 g“ mehr.

## 9b. Fokus beim Weitertippen
- **Fehler:** Die `change`-Handler riefen sofort `render()` auf. Am Handy tippt man ins nächste Feld (Gewicht → Bauch, Ziele kcal → Eiweiß, Profil, Tempo …), dann baute die Seite neu auf und die Tastatur ging zu.
- **Jetzt:** `renderSoon()` speichert sofort, zeichnet aber erst neu, wenn kein Feld in `#main` mehr den Fokus hat und kein Finger bzw. Mausknopf unten ist (`focusout`, `pointerup`). Ungültige Eingaben setzen weiter sofort per `render()` zurück. Checkboxen zeichnen sofort neu.

## 9c. Foto-Code (ESSEN1)
- Der Hinweis „Code unvollständig“ kommt nur noch einmal je Eingabe (`sheet.fw`), nicht bei jedem Tastendruck. `sheet.q` wird dabei mitgeführt.

## 9d. Test
- `tests/test_eingabe_handy.py`: 34 Prüfungen bei 375 px mit Touch (`tap`). Abgedeckt: Schnell-Eintrag ohne/mit Menge, Umrechnen von einer Korrektur aus, kcal als Pflichtfeld, Banane braucht Menge, Foto-Code (einmaliger Hinweis, Halbieren), Gewicht → Bauch und Ziele kcal → Eiweiß → KH ohne Fokusverlust, Knopf nach Eingabe, Sport. Dazu Layout 375/768/1280 hell/dunkel.
- Gegenprobe: Mit dem alten sofortigen `render()` schlagen die drei Fokus-Prüfungen fehl.
- Läuft gegen das gebaute HTML über `python3 -m http.server` (ohne Pi-Server). Der Ordner `/home/claude/work` ist im Skript fest eingetragen.
- Nicht geprüft: Safari auf dem iPhone (nur Chromium mit Touch-Emulation).
