# Fremde Bestandteile

Der Code dieses Repos steht unter der GPL-3.0 (siehe [LICENSE](LICENSE)). Folgende mitgelieferte Teile stammen von anderen und behalten ihre eigene Lizenz:

| Bestandteil | Ort | Lizenz |
|---|---|---|
| Inter (Schrift) | `dashboard/www/fonts/inter-*.woff2` | SIL Open Font License 1.1, [`LICENSE-Inter.txt`](dashboard/www/fonts/LICENSE-Inter.txt) |
| JetBrains Mono (Schrift) | `dashboard/www/fonts/jetbrains-mono-*.woff2` | SIL Open Font License 1.1, [`LICENSE-JetBrainsMono.txt`](dashboard/www/fonts/LICENSE-JetBrainsMono.txt) |
| Space Grotesk (Schrift) | `dashboard/www/fonts/space-grotesk-*.woff2` | SIL Open Font License 1.1, [`LICENSE-SpaceGrotesk.txt`](dashboard/www/fonts/LICENSE-SpaceGrotesk.txt) |
| ZXing (Barcode-Erkennung, `@zxing/library`) | `dashboard/www/vendor/zxing.min.js` | Apache License 2.0, [`LICENSE-zxing.txt`](dashboard/www/vendor/LICENSE-zxing.txt) |

## Daten, die nicht im Repo liegen

- **Bundeslebensmittelschlüssel (BLS) 4.0**, Max Rubner-Institut, Karlsruhe (2025). Kostenlos über [blsdb.de](https://www.blsdb.de); wird mit `quellcode/ernaehrung/mkbls.py` lokal in `bls.json.gz` umgewandelt. Für die Nutzung gelten die Bedingungen des Max Rubner-Instituts.

## Inhalte

- Die Grundliste der Lebensmittel in der Ernährung (`quellcode/ernaehrung/foods.js`) enthält gerundete Standardwerte, keine Herstellerangaben.
- Der Modulkatalog im Notencockpit gibt den öffentlichen Modulplan des Studiengangs BSc Informatik (Universität Tübingen, PO 2021) als Beispiel wieder. Er ist ohne Gewähr und nicht offiziell.
