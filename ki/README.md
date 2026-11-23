# KI-Unterstützung

Zwei Tools arbeiten mit einem KI-Assistenten zusammen, hier **Claude** von Anthropic. Die Tools selbst bleiben ohne KI und ohne Internet voll nutzbar; die KI übernimmt nur zwei Aufgaben, die mühsam von Hand sind:

| Was | Tool | Skill | Schnittstelle |
|---|---|---|---|
| Essen fotografieren statt abwiegen und eintippen | Ernährung | [`essen-foto`](skills/essen-foto/SKILL.md) | Codezeile `ESSEN1 […]` ins Suchfeld einfügen |
| Einkaufsliste online bestellen | Einkaufsliste | [`rewe-bestellung`](skills/rewe-bestellung/SKILL.md) | CSV aus „Export für Online-Bestellung“ |

Ein **Skill** ist eine Anleitung für Claude (eine `SKILL.md`), die Claude automatisch benutzt, wenn eine passende Anfrage kommt. Die Schnittstellen sind bewusst einfach (Text bzw. CSV), damit sie auch mit anderen Assistenten oder von Hand funktionieren.

## Skills installieren

**Claude im Browser, Desktop- und Handy-App:**

1. Skills packen:
   ```bash
   python3 scripts/pack_skills.py        # erzeugt dist/essen-foto.zip und dist/rewe-bestellung.zip
   ```
2. In Claude unter *Settings → Capabilities* „Code execution and file creation“ einschalten (Voraussetzung für eigene Skills).
3. *Customize → Skills* → „+“ → *Create skill* → *Upload* → ZIP wählen. Für jeden Skill einmal.

Die Bezeichnungen der Menüs können sich ändern; maßgeblich ist die [Hilfe von Anthropic](https://support.claude.com/en/articles/12512180-using-skills-in-claude).

**Claude Code:** den Ordner nach `~/.claude/skills/` kopieren, z. B. `cp -r ki/skills/essen-foto ~/.claude/skills/`.

Nach einer Änderung an einer `SKILL.md` den Skill neu packen und hochladen; den alten vorher in Claude löschen oder ersetzen.

## Essen-Foto → Ernährung

**Ablauf:** Essen fotografieren, Foto an Claude schicken („Was hat das?“). Claude antwortet mit einer kurzen Tabelle und einer Codezeile. Codezeile kopieren, in der Ernährung *Eintragen* öffnen und die Zeile ins Suchfeld einfügen: Jeder Bestandteil liegt dann als eigener Eintrag auf dem Teller, wo man Mengen prüfen, Teile entfernen und dann „Eintragen“ tippen kann. Korrekturen („eher 300 g Nudeln“, „ohne Soße“) einfach an Claude schreiben; es kommt eine neue, vollständige Zeile.

**Format `ESSEN1`** (wird von `fotoCode()` in `quellcode/ernaehrung/app3.js` gelesen):

```
ESSEN1 [{"t":"Reis, gekocht","g":180,"kcal":230,"p":4.7,"kh":50.4,"f":0.5,"sfa":0.1,"bal":0.9,"zucker":0.1,"salz":0}]
```

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `t` | ja | Name, höchstens 60 Zeichen (sonst „Foto-Schätzung“) |
| `g` oder `ml` | ja | Menge in Gramm, bei Getränken stattdessen Milliliter (0 bis 5000). `ml` macht den Eintrag zum Getränk; alkoholfreie zählen zum Trinken. |
| `kcal` | ja | Energie für genau diese Menge; Teile ohne `kcal` werden ignoriert |
| `p`, `kh`, `f`, `sfa`, `bal`, `zucker`, `salz`, `alk` | nein | Eiweiß, Kohlenhydrate, Fett, gesättigte Fettsäuren, Ballaststoffe, Zucker, Salz, Alkohol in Gramm für diese Menge |

- Nach `ESSEN1` steht ein JSON-Array (oder ein einzelnes Objekt), höchstens 20 Teile. Typografische Anführungszeichen werden toleriert.
- Werte gelten für die angegebene Menge, nicht je 100 g. Werte außerhalb 0 bis 20 000 werden verworfen.
- Ist der Code abgeschnitten, zeigt das Tool einmal einen Hinweis und legt nichts auf den Teller.

## Einkaufsliste → REWE-Warenkorb

**Ablauf:** In der Einkaufsliste *Export für Online-Bestellung* öffnen, Artikel auswählen, „CSV herunterladen“ oder „CSV kopieren“. Die Datei bzw. den Text an Claude geben („Bestell das bei REWE“). Claude öffnet rewe.de im Browser, legt alles in den Warenkorb und fragt gesammelt nach, wenn ein ähnlicher Artikel im Angebot ist. Ist etwas nicht verfügbar, schlägt Claude bis zu zwei passende Ersatzprodukte vor (Vorgaben aus der Notiz bleiben erfüllt) oder bietet „weglassen“ an; getauscht wird erst nach Rückfrage. **Anmelden, Bezahlen und Abschicken bleiben beim Nutzer**; der Skill gibt nie Zahlungsdaten ein. Danach im selben Export-Blatt die Häkchen bei nicht Bestelltem entfernen und den Rest „als bestellt abhaken“.

Voraussetzung: Claude kann einen Browser steuern (z. B. Claude in Chrome oder der eingebaute Browser der Desktop-App).

**CSV-Format** (`csvExport()` in `quellcode/einkauf/app.js`): UTF-8, Komma-getrennt, Felder mit Komma, Anführungszeichen oder Zeilenumbruch in `"…"`, erste Zeile = Spaltennamen, Zeilen in Laden-Reihenfolge.

| Spalte | Inhalt |
|---|---|
| `nr` | laufende Nummer |
| `artikel` | Name, wie eingetragen |
| `anzahl` | Packungen bzw. Stück (mindestens 1) |
| `gesamtmenge`, `einheit` | nur bei g, kg, ml, l: gewünschte Menge insgesamt |
| `menge_original` | Menge, wie eingetippt |
| `notiz` | verbindliche Vorgaben (Bio, laktosefrei, Marke …) |
| `suchbegriff` | Artikel und Notiz zusammen, für die Shop-Suche |
| `bereich` | Laden-Bereich |
| `eingetragen_von` | wer den Artikel eingetragen hat |

Der Skill ist auf rewe.de zugeschnitten; für einen anderen Shop eine Kopie anlegen und Abschnitt 2 bis 5 anpassen. Die CSV bleibt gleich.

## Datenschutz

- Ein Essensfoto bzw. die Einkaufsliste geht dabei an den KI-Anbieter, anders als alle übrigen Daten des Dashboards, die im Heimnetz bleiben. Die CSV enthält in `eingetragen_von` die Namen der Personen; wer das nicht möchte, löscht die Spalte vor dem Hochladen.
- Die Skills sehen nur, was man ihnen im Gespräch gibt. Sie haben keinen Zugriff auf den Pi.

## Pflege

Die Formate sind ein Vertrag zwischen Tool und Skill: Wer `fotoCode()` oder `csvExport()` ändert, passt die zugehörige `SKILL.md` im selben Commit an (und umgekehrt) und lädt den Skill neu hoch. `python3 scripts/pack_skills.py --check` prüft Name und Beschreibung; das läuft auch in der CI.

## Mit KI am Code arbeiten

Das Projekt ist größtenteils mit Claude als Programmier-Partner entstanden. Regeln für KI-Assistenten, die am Repo arbeiten (Aufbau, Prüfungen, was nie ins Repo darf), stehen in [`CLAUDE.md`](../CLAUDE.md) im Hauptordner.
