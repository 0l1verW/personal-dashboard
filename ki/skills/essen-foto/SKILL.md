---
name: "essen-foto"
description: "Schätzt aus einem Essensfoto die Nährwerte je Bestandteil und gibt eine ESSEN1-Codezeile für das Ernährungstool des Personal Dashboards aus. Bei Essensfotos mit Frage nach Kalorien."
---

# Essen-Foto → Nährwert-Code fürs Ernährungstool

Der Nutzer fotografiert sein Essen. Du schätzt, was auf dem Bild ist und wie viel, und gibst eine einzige Codezeile aus. Er kopiert sie in das Ernährungstool des Personal Dashboards („Eintragen“ → Suchfeld) – dann liegt jeder Bestandteil als eigener Eintrag auf dem Teller.

Antworte auf Deutsch und **sehr kurz**: nur Tabelle + Codeblock (siehe Ausgabe). Kein Vorwort, keine Erklärung des Vorgehens.

## Vorgehen

1. **Bestandteile erkennen.** Zerlege das Gericht in sinnvolle Teile, die man getrennt schätzen kann (z. B. „Reis, gekocht“, „Hähnchenbrust, gebraten“, „Brokkoli, gedünstet“, „Erdnusssoße“). Getränke nur, wenn sie zu sehen sind. Höchstens 8 Teile; Kleinkram (Petersilie, ein paar Kräuter) weglassen.
2. **Menge in Gramm schätzen** – essfertig (gekocht, gebraten), nicht roh. Anhaltspunkte:
   - Essteller 26–28 cm, Dessertteller ~20 cm, Suppenteller ~400 ml, Müslischale ~300 ml
   - Gabel ~19 cm, Esslöffel ~15 ml, Teelöffel ~5 ml
   - Handfläche Fleisch/Fisch ≈ 100–120 g; Faust Reis/Nudeln gekocht ≈ 150 g
   - Mensa-/Restaurantportionen eher großzügig ansetzen
3. **Versteckte Energie mitzählen:** Bratfett/Öl (gebraten, glänzend: meist 5–15 g), Butter, Soßen, Dressing, Käse obendrauf. Lieber als eigenen Teil („Bratöl“, „Dressing“) aufführen, damit der Nutzer es streichen oder anpassen kann.
4. **Nährwerte** mit typischen deutschen Werten (BLS-ähnlich) für **genau diese Menge** berechnen – nicht je 100 g.
5. **Plausibilität:** Je Teil gilt ungefähr `kcal ≈ 4·p + 4·kh + 9·f + 2·bal (+7·Alkohol)`. Weicht es mehr als ~10 % ab, korrigieren.
   - **Gesättigte Fettsäuren (`sfa`)** immer mitschätzen, sobald ein Teil 1 g Fett oder mehr hat – das Tool zeigt sie als eigenen Balken mit Tagesgrenze. `sfa` ist nie größer als `f`. Grobe Anteile am Fett: Butter, Sahne, Käse, Kokos ~60–65 %; Rind, Schwein, Wurst, Schokolade ~40–50 %; Geflügel, Ei ~30 %; Lachs, Olivenöl, Nüsse, Avocado ~10–20 %; Raps- und Sonnenblumenöl ~7–12 %.
6. **Verpackung mit Nährwerttabelle im Bild?** Dann die Werte von der Packung nehmen und auf die gezeigte Menge umrechnen.
7. **Hinweise des Nutzers haben Vorrang** („halbe Portion gegessen“, „ohne Soße“, „200 g Nudeln“, „Mensa“): entsprechend anpassen. Nur nachfragen, wenn das Bild wirklich nicht zu deuten ist – sonst schätzen und Unsicherheit benennen.

## Ausgabe – nur diese zwei Teile, sonst nichts

1. **Tabelle** mit genau drei Spalten und einer fetten Summenzeile:

| Was | Menge | kcal |
|---|---|---|
| Reis, gekocht | 180 g | 230 |
| Linsencurry | 250 g | 300 |
| **Gesamt** | **430 g** | **530** |

2. **Der Code als Codeblock** (dreifache Backticks, damit die App einen Kopieren-Knopf zeigt), Inhalt in **einer einzigen Zeile**:

```
ESSEN1 [{"t":"Reis, gekocht","g":180,"kcal":230,"p":4.7,"kh":50.4,"f":0.5,"sfa":0.1,"bal":0.9,"zucker":0.1,"salz":0},{"t":"Linsencurry","g":250,"kcal":300,"p":15,"kh":33,"f":10,"bal":9,"zucker":6,"salz":1.5,"sfa":5}]
```

Keine Überschrift, keine Einleitung, keine Makro-Spalten, kein Hinweis zum Einfügen. Nur wenn etwas wirklich unklar ist (z. B. Menge kaum erkennbar), darunter **ein** kurzer Satz dazu.

## Regeln für den Code (sonst nimmt das Tool ihn nicht)

- Beginnt mit `ESSEN1 `, danach ein JSON-Array mit einem Objekt je Bestandteil.
- **Eine Zeile** im Codeblock, keine Zeilenumbrüche, keine Backticks im Inhalt, nur gerade Anführungszeichen `"`. Codeblock ohne Sprachangabe.
- Pflicht je Objekt: `t` (Name, max. 60 Zeichen, deutsch, mit Zubereitung), `g` (Gramm, Zahl) – **bei Getränken stattdessen `ml`** (Milliliter, kein `g`) –, `kcal`.
- Getränke (Wasser, Schorle, Saft, Limo, Cola, Kaffee, Tee, Milch, Bier, Wein …) immer mit `ml`: Das Tool zeigt sie dann in ml und zählt alkoholfreie Getränke automatisch zum Trinken. Bei Alkohol zusätzlich `alk` (Gramm Alkohol) angeben. In der Tabelle die Menge dann als „300 ml“ schreiben.
- Immer mit angeben: `p` (Eiweiß g), `kh` (Kohlenhydrate g), `f` (Fett g), `sfa` (gesättigte Fettsäuren g, höchstens so viel wie `f`). Wenn schätzbar: `bal` (Ballaststoffe g), `zucker` (g), `salz` (g), `alk` (Alkohol g).
- Zahlen mit Punkt als Dezimaltrenner, keine Einheiten, keine Anführungszeichen um Zahlen. kcal ganzzahlig, Gramm-Werte mit höchstens 1 Nachkommastelle (Salz 2).
- Werte gelten für die geschätzte Menge `g`, **nicht** je 100 g.
- Keine Mikronährstoffe (Vitamine, Mineralstoffe) erfinden – aus einem Foto nicht seriös schätzbar.
- Höchstens 20 Objekte.

## Wenn der Nutzer korrigiert

Sagt er z. B. „das waren eher 300 g Nudeln“ oder „ohne Käse“, gib wieder nur die angepasste Tabelle und einen **neuen vollständigen Codeblock** aus (nicht nur die Änderung).