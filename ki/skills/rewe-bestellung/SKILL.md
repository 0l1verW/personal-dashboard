---
name: "rewe-bestellung"
description: "Legt die Einkaufsliste (CSV-Export des Personal Dashboards oder eine Liste) bei REWE online in den Warenkorb, schlägt Ersatz für Nicht-Verfügbares vor und fragt bei ähnlichen Angeboten nach."
---

# REWE-Bestellung aus der Einkaufsliste

Ziel: die Einkaufsliste des Nutzers auf rewe.de in den Warenkorb legen – passend zu Anzahl, Menge und Notiz – und vor jeder Abweichung nachfragen. Besonders: Ist ein **ähnlicher Artikel im Angebot**, wird nicht still getauscht, sondern gefragt, ob das Angebot genommen werden soll. Ist ein Artikel **nicht verfügbar**, wird ein passendes **Ersatzprodukt vorgeschlagen** und gefragt.

## 1. Eingabe lesen

Normalfall ist die CSV aus der Einkaufsliste („Export für Online-Bestellung“, Datei `einkauf-rewe-JJJJ-MM-TT.csv` oder eingefügter Text). Komma-getrennt, UTF-8, Felder mit Komma stehen in Anführungszeichen.

| Spalte | Bedeutung |
|---|---|
| `nr` | Reihenfolge (Laden-Bereiche) |
| `artikel` | Was gekauft werden soll |
| `anzahl` | Packungen bzw. Stück, mindestens 1 |
| `gesamtmenge` + `einheit` | Nur bei g/kg/ml/l gefüllt: gewünschte Menge **insgesamt** (z. B. 500 g Hack) |
| `menge_original` | Wie eingetippt (z. B. „3 Dosen“, „2×“) |
| `notiz` | **Harte Vorgaben** für das Produkt: Bio, laktosefrei, vegan, Sorte, Fettstufe, Größe … (ältere Listen: auch Marke) |
| `suchbegriff` | marke + artikel + notiz, für die Shop-Suche gedacht |
| `bereich` | Laden-Bereich (nur Info) |
| `eingetragen_von` | Wer es auf die Liste gesetzt hat (nur Info) |
| `marke` | Gewünschte Marke; leer = egal. Fehlt die Spalte (ältere CSV), steht eine Marke ggf. in `notiz` |
| `andere_marke_ok` | Nur bei `marke`: `nein` = Marke ist **verbindlich** wie eine Notiz-Vorgabe; `ja` = diese Marke bevorzugen, eine ähnliche andere Marke ist aber in Ordnung |

Kommt keine CSV, sondern eine normale Liste, genauso vorgehen: Anzahl/Menge/Notiz aus dem Text ablesen.

Zu Beginn kurz bestätigen: „N Artikel gelesen“ – nicht die ganze Liste wiederholen.

## 2. Vorbereitung im Browser

- rewe.de im Browser öffnen (vorher den passenden Browser-Skill laden, z. B. `built-in-browser` oder `chrome-browser`).
- **Anmelden macht der Nutzer selbst.** Nie Passwörter, Codes oder Zahlungsdaten eintippen. Ist er nicht angemeldet: kurz Bescheid geben und warten.
- Prüfen, ob ein **Markt bzw. Lieferservice/Abholservice** gewählt ist – ohne Markt zeigt REWE keine gültigen Preise und Angebote. Fehlt er: fragen (PLZ bzw. Abholmarkt) oder den Nutzer wählen lassen.
- **Warenkorb vorher ansehen.** Liegt schon etwas drin: fragen, ob es bleiben soll. Nichts ungefragt löschen.

## 3. Je Artikel

1. **Suchen** mit `suchbegriff`; findet das nichts, mit `artikel`.
2. **Wunschprodukt wählen** – das Produkt, das der Nutzer ohne Angebot nehmen würde:
   - Alle Vorgaben aus `notiz` müssen erfüllt sein (laktosefrei heißt laktosefrei).
   - Steht eine `marke`, ein Produkt dieser Marke nehmen. Bei `andere_marke_ok` = `nein` gilt sie wie eine Notiz-Vorgabe; bei `ja` ist sie die erste Wahl, aber Angebote und Ersatz anderer Marken sind erlaubt (trotzdem nachfragen, nicht still tauschen).
   - Zeigt REWE frühere Käufe („Meine Produkte“, „Schon mal gekauft“), dieses Produkt bevorzugen.
   - Sonst ein übliches Standardprodukt in üblicher Größe, nicht das teuerste und nicht das exotischste.
3. **Menge umrechnen**
   - `anzahl` = so viele Packungen/Stück in den Warenkorb.
   - Bei `gesamtmenge`: Packungen so wählen, dass die Menge erreicht wird und möglichst wenig übrig bleibt (500 g Hack → eine 500-g-Packung; 1 kg Mehl → eine 1-kg-Packung oder zwei 500-g-Packungen).
   - Loses Obst/Gemüse: Stückzahl übernehmen; wird nach Gewicht verkauft, sinnvoll schätzen und in der Übersicht vermerken.
4. **Angebote prüfen** (siehe Abschnitt 4).
5. **In den Warenkorb legen** – außer, es gibt eine offene Frage. Dann den Artikel vormerken und mit dem nächsten weitermachen.
6. **Nicht gefunden oder nicht verfügbar:** Ersatz suchen und als Frage vormerken (siehe Abschnitt 4a). Nicht still ersetzen.

## 4. Angebote: nachfragen statt tauschen

Angebote bei REWE erkennt man an „Angebot“/„Aktion“-Kennzeichen, durchgestrichenem Preis, Prozent-Label oder Mengenrabatt („2 für …“, „ab 2 Stück“). Bei jedem Artikel die ersten Suchtreffer (etwa zwei Reihen) darauf ansehen.

- **Ist das Wunschprodukt selbst im Angebot:** nehmen, in der Übersicht als Angebot markieren. Keine Frage nötig.
- **Ist eine ähnliche Alternative im Angebot:** fragen. Ähnlich heißt alles zugleich:
  - gleiche Produktart und gleicher Zweck (Vollmilch ↔ Vollmilch einer anderen Marke, nicht Vollmilch ↔ Kakaomilch),
  - alle `notiz`-Vorgaben erfüllt; eine verbindliche Marke (`andere_marke_ok` = `nein`, oder Marke in der `notiz`) schließt andere Marken aus – dann nicht fragen,
  - ähnliche Größe (etwa ±30 %) oder die gewünschte Gesamtmenge lässt sich damit genauso gut erreichen,
  - günstiger nach **Grundpreis** (€/kg, €/l, €/Stück), nicht nur nach Packungspreis.
- **Mengenrabatt, der mehr Stück verlangt als gewünscht** (z. B. „2 für 3 €“ bei Anzahl 1): ebenfalls fragen, ob eins mehr genommen werden soll.
- Gibt es mehrere passende Angebote, nur das günstigste nach Grundpreis anbieten.

## 4a. Nicht verfügbar: Ersatz vorschlagen

Nicht verfügbar heißt: „ausverkauft“, „derzeit nicht verfügbar“, „nicht lieferbar“, ausgegrauter oder fehlender „In den Warenkorb“-Knopf, oder die Suche findet das Wunschprodukt nicht (auch nicht mit einem einfacheren Begriff, z. B. ohne Marke oder Sorte, soweit die `notiz` das zulässt).

**Ersatz suchen:** Bis zu zwei verfügbare Ersatzprodukte heraussuchen, in dieser Rangfolge:
1. Gleiches Produkt in anderer Packungsgröße, mit der sich Anzahl bzw. Gesamtmenge genauso gut erreichen lässt.
2. Gleiche Produktart einer anderen Marke bzw. Eigenmarke (REWE Beste Wahl, ja!, REWE Bio) – nur, wenn keine verbindliche Marke vorgegeben ist (siehe `marke`/`andere_marke_ok`).
3. Nächstverwandte Sorte (Gouda jung ↔ Gouda mittelalt, Spaghetti ↔ Spaghettoni), nur wenn keine `notiz`-Vorgabe dagegen spricht.

Jeder Vorschlag muss:
- alle `notiz`-Vorgaben erfüllen (Bio, laktosefrei, vegan, Fettstufe …). Schreibt die `notiz` eine Marke vor, die nicht verfügbar ist: andere Größen/Sorten dieser Marke vorschlagen und als letzten Vorschlag die günstigste passende Alternative anderer Marke – ausdrücklich mit „andere Marke“ gekennzeichnet.
- verfügbar sein (Knopf „In den Warenkorb“ aktiv).
- nicht deutlich teurer nach Grundpreis sein (etwa +30 %); ist nichts Günstigeres da, den Aufpreis nennen.
- Ist ein Ersatz gerade im Angebot, das dazuschreiben; bei sonst gleich guten Vorschlägen den günstigeren nach Grundpreis zuerst.

Findet sich kein sinnvoller Ersatz (z. B. nur ganz andere Produkte), nicht raten: in der Frage nur „weglassen“ anbieten bzw. direkt auf die Liste „nicht bestellt“ setzen mit Grund „nicht verfügbar, kein passender Ersatz“.

**Frage** (wird mit den Angebots-Fragen gesammelt), z. B. „Hafermilch Oatly Barista – nicht verfügbar. Ersatz?“ mit den Optionen
- „Ersatz: Alpro Barista Hafer 1 l – 2,29 € (2,29 €/l)“
- „Ersatz: REWE Bio Haferdrink Barista 1 l – 1,49 € (1,49 €/l) – andere Marke“
- „Weglassen“

Die Mengenangabe beim Ersatz an `anzahl`/`gesamtmenge` anpassen und in der Option nennen, wenn sie vom Original abweicht (z. B. „2 × 250 g statt 1 × 500 g“).

Wird ein Artikel erst **im Warenkorb oder beim Lieferzeitfenster** als nicht verfügbar markiert, genauso vorgehen: Ersatz suchen, fragen, dann tauschen.

**Fragen sammeln, nicht einzeln unterbrechen.** Erst alle eindeutigen Artikel einlegen, dann alle Fragen auf einmal stellen:

- Mit dem Fragen-Werkzeug (AskUserQuestion, höchstens 4 Fragen pro Aufruf, bei Bedarf mehrere Runden). Je Artikel eine Frage, z. B. „Milch laktosefrei – Angebot nehmen?“ mit den Optionen
  - „Angebot: Minus L Milch 1,5 % 1 l – 1,19 € statt 1,49 € (1,19 €/l)“
  - „Wunschprodukt: Weihenstephan laktosefrei 1 l – 1,69 € (1,69 €/l)“
- Ohne Fragen-Werkzeug: eine kurze nummerierte Liste im Chat, Antwort z. B. „1A 2B 3A“.
- Gilt ein Angebot nur bis zu einem Datum oder nur mit REWE-Bonus/App, das dazuschreiben.

Danach die Antworten umsetzen und die vorgemerkten Artikel einlegen. Gewählte Ersatzprodukte in der Übersicht unter „Hinweis“ als „Ersatz für …“ markieren; bei „Weglassen“ den Artikel auf die Liste „nicht bestellt“ setzen.

## 5. Warenkorb prüfen und abschließen

1. Warenkorb öffnen und jede Zeile gegen die CSV prüfen (Produkt, Anzahl). Abweichungen korrigieren.
2. Übersicht im Chat:

| Nr | Artikel | Im Warenkorb | Anzahl | Preis | Angebot | Hinweis |
|---|---|---|---|---|---|---|

   Dazu Summe, ggf. Mindestbestellwert und Liefer-/Servicegebühr, wie REWE sie anzeigt, und eine Liste „nicht bestellt“ mit Grund (z. B. „nicht verfügbar, Ersatz abgelehnt“).

   Ersatzprodukte gelten als bestellt – sie bleiben beim Abhaken in der Einkaufsliste angehakt.
3. **Nicht selbst bestellen.** Kein Zahlungsweg wählen, keine Zahlungsdaten eingeben, nicht „Zahlungspflichtig bestellen“ klicken. Der Nutzer prüft und schickt die Bestellung ab. Nur wenn er es in diesem Gespräch ausdrücklich verlangt: Lieferzeitfenster und Gesamtsumme in einer Frage bestätigen lassen, dann den letzten Klick machen – Zahlungsdaten trotzdem nie eingeben oder ändern.
4. Am Ende erinnern: In der Einkaufsliste „Export für Online-Bestellung“ öffnen, bei allem, was nicht bestellt wurde (Liste „nicht bestellt“ oder vom Nutzer aus dem Warenkorb entfernt), das Häkchen entfernen und dann „… als bestellt abhaken“ klicken. Die nicht bestellten Artikel namentlich nennen.

## Regeln

- `notiz` und eine verbindliche `marke` sind verbindlich. Lieber fragen als eine Vorgabe verletzen.
- Nichts still ersetzen: Angebot, Ersatz für Ausverkauftes, andere Packungsgröße mit deutlich mehr Menge – alles kommt als Frage.
- Ist ein Artikel nur unscharf („Käse“ ohne Sorte), ein übliches Produkt wählen und in der Übersicht markieren, statt zu fragen – Fragen sind für Angebote, Ersatz und echte Unklarheiten da.
- Preise und Angebote nur so angeben, wie die Seite sie zeigt. Nichts erfinden.
- Nur die Website rewe.de; die REWE-App ist nicht erreichbar.
- Antworten auf Deutsch, kurz; keine Schritt-für-Schritt-Protokolle, nur Fragen und die Übersicht am Ende.