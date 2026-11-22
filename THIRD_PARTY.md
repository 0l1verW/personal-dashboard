# Fremde Bestandteile

Der Code dieses Repos steht unter der GPL-3.0 (siehe [LICENSE](LICENSE)). Folgende mitgelieferte Teile stammen von anderen und behalten ihre eigene Lizenz:

| Bestandteil | Ort | Lizenz |
|---|---|---|
| Inter (Schrift) | `dashboard/www/fonts/inter-*.woff2` | SIL Open Font License 1.1, [`LICENSE-Inter.txt`](dashboard/www/fonts/LICENSE-Inter.txt) |
| JetBrains Mono (Schrift) | `dashboard/www/fonts/jetbrains-mono-*.woff2` | SIL Open Font License 1.1, [`LICENSE-JetBrainsMono.txt`](dashboard/www/fonts/LICENSE-JetBrainsMono.txt) |
| Space Grotesk (Schrift) | `dashboard/www/fonts/space-grotesk-*.woff2` | SIL Open Font License 1.1, [`LICENSE-SpaceGrotesk.txt`](dashboard/www/fonts/LICENSE-SpaceGrotesk.txt) |
| ZXing (Barcode-Erkennung, `@zxing/library`) | `dashboard/www/vendor/zxing.min.js` | Apache License 2.0, [`LICENSE-zxing.txt`](dashboard/www/vendor/LICENSE-zxing.txt) |
| Bundeslebensmittelschlüssel (BLS) 4.0, Auszug | `dashboard/www/bls.json.gz` | CC BY 4.0, [`LICENSE-BLS.txt`](dashboard/www/LICENSE-BLS.txt) |

## Bundeslebensmittelschlüssel

Quelle: Max Rubner-Institut (2025): Bundeslebensmittelschlüssel (BLS), Version 4.0 – Deutsche Nährstoffdatenbank. [blsdb.de](https://www.blsdb.de), Lizenz [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.de). `bls.json.gz` ist ein bearbeiteter Auszug (28 von 138 Nährstoffen, gerundet); was genau geändert wurde, steht in [`LICENSE-BLS.txt`](dashboard/www/LICENSE-BLS.txt). Erzeugt mit `quellcode/ernaehrung/mkbls.py`. Das Max Rubner-Institut ist an diesem Projekt nicht beteiligt.

## Inhalte

- Die Grundliste der Lebensmittel in der Ernährung (`quellcode/ernaehrung/foods.js`) enthält gerundete Standardwerte, keine Herstellerangaben.
- Der Modulkatalog im Notencockpit gibt den öffentlichen Modulplan des Studiengangs BSc Informatik (Universität Tübingen, PO 2021) als Beispiel wieder. Er ist ohne Gewähr und nicht offiziell.
