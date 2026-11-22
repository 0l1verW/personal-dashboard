---
name: "rewe-bestellung"
description: "Legt die Einkaufsliste (CSV-Export des Personal Dashboards oder eine Liste) bei REWE online in den Warenkorb und fragt nach, wenn ähnliche Artikel im Angebot sind."
---

# REWE-Bestellung aus der Einkaufsliste

Ziel: die Einkaufsliste des Nutzers auf rewe.de in den Warenkorb legen – passend zu Anzahl, Menge und Notiz – und vor jeder Abweichung nachfragen. Besonders: Ist ein **ähnlicher Artikel im Angebot**, wird nicht still getauscht, sondern gefragt, ob das Angebot genommen werden soll.

## 1. Eingabe lesen

Normalfall ist die CSV aus der Einkaufsliste („Export für Online-Bestellung“, Datei `einkauf-rewe-JJJJ-MM-TT.csv` oder eingefügter Text). Komma-getrennt, UTF-8, Felder mit Komma stehen in Anführungszeichen.

| Spalte | Bedeutung |
|---|---|
| `nr` | Reihenfolge (Laden-Bereiche) |
| `artikel` | Was gekauft werden soll |
| `anzahl` | Packungen bzw. Stück, mindestens 1 |
| `gesamtmenge` + `einheit` | Nur bei g/kg/ml/l gefüllt: gewünschte Menge **insgesamt** (z. B. 500 g Hack) |
| `menge_original` | Wie eingetippt (z. B. „3 Dosen“, „2×“) |
| `notiz` | **Harte Vorgaben** für das Produkt: Bio, laktosefrei, vegan, Marke, Sorte, Fettstufe, Größe … |
| `suchbegriff` | artikel + notiz, für die Shop-Suche gedacht |
| `bereich` | Laden-Bereich (nur Info) |
| `eingetragen_von` | Wer es auf die Liste gesetzt hat (nur Info) |

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
   - Alle Vorgaben aus `notiz` müssen erfüllt sein (laktosefrei heißt laktosefrei, eine genannte Marke heißt diese Marke).
   - Zeigt REWE frühere Käufe („Meine Produkte“, „Schon mal gekauft“), dieses Produkt bevorzugen.
   - Sonst ein übliches Standardprodukt in üblicher Größe, nicht das teuerste und nicht das exotischste.
3. **Menge umrechnen**
   - `anzahl` = so viele Packungen/Stück in den Warenkorb.
   - Bei `gesamtmenge`: Packungen so wählen, dass die Menge erreicht wird und möglichst wenig übrig bleibt (500 g Hack → eine 500-g-Packung; 1 kg Mehl → eine 1-kg-Packung oder zwei 500-g-Packungen).
   - Loses Obst/Gemüse: Stückzahl übernehmen; wird nach Gewicht verkauft, sinnvoll schätzen und in der Übersicht vermerken.
4. **Angebote prüfen** (siehe Abschnitt 4).
5. **In den Warenkorb legen** – außer, es gibt eine offene Frage. Dann den Artikel vormerken und mit dem nächsten weitermachen.
6. **Nicht gefunden oder ausverkauft:** einmal mit einem einfacheren Begriff suchen. Bleibt es dabei, nicht still ersetzen – als Frage vormerken, mit höchstens zwei Vorschlägen.

## 4. Angebote: nachfragen statt tauschen

Angebote bei REWE erkennt man an „Angebot“/„Aktion“-Kennzeichen, durchgestrichenem Preis, Prozent-Label oder Mengenrabatt („2 für …“, „ab 2 Stück“). Bei jedem Artikel die ersten Suchtreffer (etwa zwei Reihen) darauf ansehen.

- **Ist das Wunschprodukt selbst im Angebot:** nehmen, in der Übersicht als Angebot markieren. Keine Frage nötig.
- **Ist eine ähnliche Alternative im Angebot:** fragen. Ähnlich heißt alles zugleich:
  - gleiche Produktart und gleicher Zweck (Vollmilch ↔ Vollmilch einer anderen Marke, nicht Vollmilch ↔ Kakaomilch),
  - alle `notiz`-Vorgaben erfüllt (eine Marken-Vorgabe schließt andere Marken aus – dann nicht fragen),
  - ähnliche Größe (etwa ±30 %) oder die gewünschte Gesamtmenge lässt sich damit genauso gut erreichen,
  - günstiger nach **Grundpreis** (€/kg, €/l, €/Stück), nicht nur nach Packungspreis.
- **Mengenrabatt, der mehr Stück verlangt als gewünscht** (z. B. „2 für 3 €“ bei Anzahl 1): ebenfalls fragen, ob eins mehr genommen werden soll.
- Gibt es mehrere passende Angebote, nur das günstigste nach Grundpreis anbieten.

**Fragen sammeln, nicht einzeln unterbrechen.** Erst alle eindeutigen Artikel einlegen, dann alle Fragen auf einmal stellen:

- Mit dem Fragen-Werkzeug (AskUserQuestion, höchstens 4 Fragen pro Aufruf, bei Bedarf mehrere Runden). Je Artikel eine Frage, z. B. „Milch laktosefrei – Angebot nehmen?“ mit den Optionen
  - „Angebot: Minus L Milch 1,5 % 1 l – 1,19 € statt 1,49 € (1,19 €/l)“
  - „Wunschprodukt: Weihenstephan laktosefrei 1 l – 1,69 € (1,69 €/l)“
- Ohne Fragen-Werkzeug: eine kurze nummerierte Liste im Chat, Antwort z. B. „1A 2B 3A“.
- Gilt ein Angebot nur bis zu einem Datum oder nur mit REWE-Bonus/App, das dazuschreiben.

Danach die Antworten umsetzen und die vorgemerkten Artikel einlegen.

## 5. Warenkorb prüfen und abschließen

1. Warenkorb öffnen und jede Zeile gegen die CSV prüfen (Produkt, Anzahl). Abweichungen korrigieren.
2. Übersicht im Chat:

| Nr | Artikel | Im Warenkorb | Anzahl | Preis | Angebot | Hinweis |
|---|---|---|---|---|---|---|

   Dazu Summe, ggf. Mindestbestellwert und Liefer-/Servicegebühr, wie REWE sie anzeigt, und eine Liste „nicht bestellt“ mit Grund.
3. **Nicht selbst bestellen.** Kein Zahlungsweg wählen, keine Zahlungsdaten eingeben, nicht „Zahlungspflichtig bestellen“ klicken. Der Nutzer prüft und schickt die Bestellung ab. Nur wenn er es in diesem Gespräch ausdrücklich verlangt: Lieferzeitfenster und Gesamtsumme in einer Frage bestätigen lassen, dann den letzten Klick machen – Zahlungsdaten trotzdem nie eingeben oder ändern.
4. Am Ende erinnern: In der Einkaufsliste „Export für Online-Bestellung“ öffnen, bei allem, was nicht bestellt wurde (Liste „nicht bestellt“ oder vom Nutzer aus dem Warenkorb entfernt), das Häkchen entfernen und dann „… als bestellt abhaken“ klicken. Die nicht bestellten Artikel namentlich nennen.

## Regeln

- `notiz` ist verbindlich. Lieber fragen als eine Vorgabe verletzen.
- Nichts still ersetzen: Angebot, Ersatz für Ausverkauftes, andere Packungsgröße mit deutlich mehr Menge – alles kommt als Frage.
- Ist ein Artikel nur unscharf („Käse“ ohne Sorte), ein übliches Produkt wählen und in der Übersicht markieren, statt zu fragen – Fragen sind für Angebote, Ersatz und echte Unklarheiten da.
- Preise und Angebote nur so angeben, wie die Seite sie zeigt. Nichts erfinden.
- Nur die Website rewe.de; die REWE-App ist nicht erreichbar.
- Antworten auf Deutsch, kurz; keine Schritt-für-Schritt-Protokolle, nur Fragen und die Übersicht am Ende.