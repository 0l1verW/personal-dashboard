# Mitmachen

Danke fürs Interesse! Das ist ein privates Projekt, Issues und Pull Requests sind trotzdem willkommen.

## Fehler und Ideen

- Erst in den [Issues](../../issues) schauen, ob es das Thema schon gibt.
- Für Fehler die Vorlage „Fehler melden“ nutzen: Tool, Gerät/Browser, Schritte, erwartetes und tatsächliches Verhalten.
- **Keine persönlichen Daten** in Issues, Screenshots oder angehängte Sicherungen packen.
- Sicherheitslücken nicht öffentlich melden, siehe [SECURITY.md](SECURITY.md).

## Pull Requests

1. Einen Branch vom aktuellen `main` anlegen.
2. Bei Tools mit Quellordner (`quellcode/<tool>/`) **den Quellcode ändern** und mit `python3 scripts/build_all.py` neu bauen. Quellcode und gebaute Datei zusammen committen.
3. Vor dem PR:
   ```bash
   python3 dashboard/server.py selbsttest
   python3 scripts/build_all.py --check
   ```
   und die geänderten Seiten bei 375, 768 und 1280 px, hell und dunkel ansehen.
4. Im PR kurz beschreiben, was sich ändert und wie es geprüft wurde. Nennenswerte Änderungen in `CHANGELOG.md` unter „Unveröffentlicht“ eintragen.

Hintergrund zum Aufbau: [docs/ENTWICKLUNG.md](docs/ENTWICKLUNG.md).

## Stil

- Server: nur Python-Standardbibliothek, keine zusätzlichen Pakete.
- Tools: eine HTML-Datei je Tool, kein Framework, keine Inhalte aus dem Internet zur Laufzeit.
- Oberflächentexte auf Deutsch, kurz und klar. Bedienbar per Touch (Knöpfe ≥ 44 px) und Tastatur.
- Daten bleiben abwärtskompatibel: neue Felder mit Standardwert ergänzen statt alte umzubauen.

Mit einem Beitrag stimmst du zu, dass er unter der [GPL-3.0](LICENSE) steht.
