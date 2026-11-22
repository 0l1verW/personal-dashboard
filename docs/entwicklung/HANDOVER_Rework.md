# Handover-Ergänzung: Rework Startseite, gemeinsame Schicht, Delta-Sync, Update-Seite (Stand 11.11.2026)

Ergänzt `HANDOVER_Dashboard.md`. Alles unten ist **gebaut und getestet** (Testserver mit Beispieldaten, Chromium; Safari auf dem iPad nicht geprüft).

## 1. Gemeinsame Schicht `www/shared/` (neu)

- `server.py` fügt in jede Tool-Seite ein: `<script src="/shared/shell.js">` am Anfang von `<head>` und `<link href="/shared/shell.css">` **vor `</head>`** (also hinter den eigenen Styles des Tools). Fehlt `www/shared/shell.css`, passiert nichts.
- **Die Tool-Dateien und ihr Quellcode sind unverändert.** Sie laufen lokal und als Artefakt weiter ohne die Schicht. Deshalb gab es für diesen Rework keinen Neubau der Tools.
- `shell.js`:
  - setzt `html[data-app]` aus dem Dateinamen (`planer`, `noten`, `aufgaben`, `essen`);
  - fügt einen Home-Knopf (`a.ibtn.pdhome`) in den Kopf ein, wenn das Tool keinen hat (Planer, Cockpit);
  - nach einem Klick auf `#themeBtn` bzw. `[data-theme-set]` schreibt es das Theme in alle fünf Schlüssel (`launcher_theme`, `sp_theme`, `cockpit_theme`, `aufg_theme`, `essen_theme`); „wie System“ löscht alle.
- `shell.css` (alle Regeln mit `html[data-app]` davor, damit sie die Tool-Regeln sicher überstimmen):
  - neutrale Farb-Tokens hell/dunkel an **einer** Stelle (Akzent bleibt je Tool);
  - Notencockpit: Akzent Blau `#2F5FB3` (dunkel `#86ABF3`, Füllfarbe `#3A6BC4`) statt Lila;
  - Kopf: `.app` max. 1080 px, seitlicher Rand 20 px ab 641 px, Titel 20 px, Untertitel einzeilig mit Auslassung, Kopf-Knöpfe 40 px (Touch 44 px);
  - Aufgaben: Kopf 1080 px breit, Navigation/Inhalt bleiben 820 px mittig;
  - Ernährung: bis 860 px Reihenfolge Ring → Zeitleiste → Wasser/Sport/Gewicht/Ziel (`order`), am PC Ring-Karte mittig;
  - Cockpit-Studienplan bis 860 px mit Ausblendung am rechten Rand; kleine Schrift (`.vl small`, `.vp-tot small`) angehoben.
- **Regel für Änderungen:** in `shell.css` nur Eigenschaften setzen, die ein Tool nicht selbst je Breite umstellt (sonst überstimmt die Schicht dessen Media-Queries).

## 2. Startseite (`dashboard.html`)

- Aufbau: Kachel **„Heute & Kalender“** über die ganze Breite, darunter je Gruppe (`gruppe` aus `apps.json`, Überschrift nur bei mehr als einer Gruppe) ein eigenes Raster. Alle Tool-Kacheln sind jetzt `2x2`; unter 560 px ist jede Kachel volle Breite.
- `calItems(list)`: sammelt aus allen sichtbaren Tools `termine` **und** `zeilen` mit `due` (ohne `done`, doppelte nach Tool+Titel+Tag entfernt). `late` = `sc==='late'` oder (kein `sc`, `due` vorbei und Tag vor heute bzw. Uhrzeit gesetzt).
- `heuteTile(list)` ersetzt `calTile`: links Überfällig · Heute · Morgen (sonst „Danach“), rechts der Monat. Tag antippen → links dessen Einträge, „Heute“ setzt zurück. Zeilen sind Links zum Tool. Höchstens 10 Zeilen (Handy 16), danach „+N weitere“.
- 14-Tage-Leiste in einer Kachel nur noch, wenn `termine` Status (`sc`) tragen (Planer). In den Zeilen entfällt die Pille bei `sc==='late'` (stand doppelt neben „überfällig“).
- Auffrischen im Hintergrund: immer, wenn die Kurzinfo nicht `v:1` ist; **nach Zeit (20 Min) nur bei `bgZeit:true`** in `apps.json` (Planer). `bg` bleibt „hat ein Addon“.

### Vorschau-Vertrag: neu `aktionen`

```json
"aktionen":[{"l":"+250 ml","titel":"Ein Glas Wasser eintragen","key":"ernaehrung_v1","coll":"water","pre":"w","item":{"ml":250},
             "plus":[["ring2.wert",0.25],["balken.3.wert",0.25]]}]
```

- Das Dashboard zeigt je Aktion einen Knopf im Kachelkopf (nur bei Recht „Bearbeiten“).
- Klick: `PUT /api/<key>` mit `{savedAt, <coll>:{<id>:{…item, id, datum, zeit, upd}}}`. Nur für Keys im Sync-Modus **„liste“** gedacht – der Server führt den Eintrag zusammen, alle anderen Daten bleiben.
- Danach erhöht das Dashboard die in `plus` genannten Zahlen der Kurzinfo (nur wenn `zahl.datum` heute ist) und speichert sie nach `sum_<id>`. Beim nächsten Öffnen des Tools schreibt es seine Kurzinfo ohnehin neu.

## 3. Addons (neu)

- `addons/noten-sum.js`: ersetzt `pushSum()` des Cockpits durch die v1-Fassung (`zahl` Schnitt, `ring` ECTS von 180, `zaehler` bestanden/laufend/offen, `zeilen` laufende Module, sonst Beste Note/Rest-ECTS) und stellt `window.__dashSum()` bereit. Der Adapter im Dashboard bleibt für alte Stände.
- `addons/essen-sum.js`: ergänzt die Kurzinfo, die die App an `/api/sum_essen` schickt (fängt den `fetch` ab): Balkenfarben wie in der App (P `#2C7BD6`, KH `#D99318`, F `#B4567F`, Wasser `#2E9BB5`), `aktionen` „+250 ml“, `window.__dashSum()`.
- `apps.json`: Noten `kachel:"2x2"` + Addon, Essen + Addon, Planer `bgZeit:true`.
- Icons `noten-{64,180,192,512}.png` sind jetzt blau (aus den grünen umgefärbt). Schon angelegte Home-Bildschirm-Icons behalten das alte Bild, bis man sie neu anlegt.

## 4. Tests (`tests/`)

- `tests/seed.py`: füllt einen leeren Testserver mit Beispieldaten (Planer, Cockpit, Aufgaben inkl. Wunsch von Sam, Ernährung 3 Wochen).
- `tests/test_rework.py [URL] [Ordner]`: Dashboard und alle Tools bei 375/768/1280 hell/dunkel (kein horizontales Scrollen, keine Skriptfehler, keine Kachel läuft über, kein Loch am Handy, Kopf überall 1040 px, genau ein Home-Knopf, Titel 20 px), Kalender-Tag antippen, „+250 ml“ (ein Wasser-Eintrag mehr, übrige Daten unverändert, in der App angekommen), Theme-Wechsel gilt für alle Tools. Zusätzlich geprüft: Original-Stand vom Pi + `pi-update.zip` in einem frischen Ordner, alte Noten-Kurzinfo wird beim Dashboard-Aufruf auf v1 gehoben.
- Ablauf: `python3 server.py 8097` in einer Kopie ohne echte Daten, `python3 tests/seed.py`, `python3 tests/test_rework.py`.
- Nicht erneut gelaufen: die 48 Rechte- und 20 Sicherungs-Prüfungen aus `HANDOVER_Dashboard.md` (die Server-Änderung betrifft nur das Einfügen der zwei Tags und das Feld `bgZeit`).

## 5. Runde 2 (11.11.2026)

### 5a. Kopf, Aufgaben-Layout, Symbole, Dialoge
- **Home-Knopf** (Planer, Cockpit) steht jetzt direkt hinter dem Titel (`shell.js` fügt ihn nach `.brand` ein). Am Handy liegt er in der Titelzeile, die Knopfleiste darunter behält ihren Platz (Semesterfeld wieder lesbar).
- **Aufgaben am PC (≥ 1024 px):** `.app` 1080 px; „Anstehend“ zweispaltig (`<div class="cols"><div class="side">…</div><div class="flow">…</div></div>` in `vAnstehend`): links Schnelleingabe, Wünsche, Neuigkeiten, Filter, Woche; rechts die Zeitleiste. Navigation `fit-content`. Quellcode geändert: `quellcode/aufgaben/app2.js`, `style.css`.
- **Planer ohne Emoji:** Symbolsatz `ICO()`/`I` in `quellcode/semesterplaner/app.js` (Kopieren, Team, Hinweis, Info, Sanduhr, Fahne, Gestrichen, Stift, Link, Mail, Start/Stopp, Uhr, Haken). Styles `.ico` am Ende von `style.css`. Der Text „⚠“ in den Startdaten (Notiz PI 3) bleibt – das ist Nutzertext.
- **Dialoge** (über `shell.css`): gleiche Abdunklung, Ecken 20 px, Titel 18 px, Schließen-Knopf 40/44 px; am Handy Planer, Cockpit, Aufgaben als Blatt von unten (Ernährung bleibt Vollbild wegen Tastatur und Suchliste).
- **Cockpit-Druckblatt und Analyse-Linien blau** (`shell.css`, Abschnitt 7; CSS überstimmt die `stroke`-Attribute). Kategorie-Farben im Cockpit sind unverändert.

### 5b. Dashboard
- Läuft jetzt auch als **Home-Bildschirm-App** (`icon_tags('dash', …)` ohne `standalone=False`). Achtung iOS: jede Home-Bildschirm-App hat ihren eigenen Speicher und ihre eigene Anmeldung.
- **Abhaken auf der Kachel:** Aufgaben-`pushSum()` liefert `id` und `ab:1` (wenn `canTick`) in `zeilen` und `termine`. Das Dashboard zeigt dafür einen Kreis (Aufgaben-Kachel und „Heute“). Klick → das Dashboard lädt `Aufgaben.html#hintergrund` unsichtbar (`actFrame`) und ruft `window.__dashAct('done', id)` (neu in `app3.js`) – also die echte `complete()` mit Wiederholung, Abwechseln und Verlauf. Toast mit „Rückgängig“ (`__dashAct('undo')`, nutzt die Rückgängig-Funktion von `complete()`). Das iframe bleibt 9 s für Rückgängig, nach 2,3 s lädt das Dashboard die Kurzinfos neu.

### 5c. Programm aktualisieren (`/system`, nur Besitzer)
- `POST /api/system_update?pruefen=1` (Body: Zip) → Vorschau `{dateien:[{pfad,status neu|geändert|gleich}], neustart}`; ohne `pruefen` → einspielen.
- Prüfung (`upd_lesen`): alles unter `dashboard/`, kein `..`, nichts unter `data/`, keine Verknüpfungen, nur erlaubte Endungen (`UPD_EXT`), JSON muss lesbar sein, `.py` muss kompilieren, Daten-Sicherungen (mit `manifest.json`) werden erkannt und abgelehnt.
- Einspielen: Daten-Sicherung (`dashboard-…-update.zip`), Programmsicherung der zu ersetzenden Dateien `data/sicherungen/programm-<Zeit>.zip` (Manifest mit `dateien` und `neu`, 5 behalten), bei geändertem `server.py` **Selbsttest**: Kopie des Programms ohne Daten in einem Temp-Ordner, `python3 server.py selbsttest` muss „SELBSTTEST OK“ ausgeben. Danach atomar schreiben; bei neuem `server.py` ersetzt sich der Prozess per `os.execv` selbst (geht mit und ohne systemd).
- Rückweg: `POST /api/system_programm?name=programm-….zip[&pruefen=1]` – stellt die gesicherten Dateien her und entfernt die damals neuen (vorher wieder eine Programmsicherung).
- `GET /api/system` liefert zusätzlich `programm:{liste, server, gestartet}`.
- Ab jetzt reicht für Updates `/system` → „Update-Datei wählen …“. Der ssh-Einzeiler bleibt als Notweg.

### 5d. Delta-Sync (Modus „liste“: Aufgaben, Ernährung)
- **Server:** jeder übernommene Eintrag bekommt `_s` (laufende Nummer, Server-Reihenfolge). `data/_sync_<key>.json` = `{seq, top:{feld:seq}, floor}`; `seq` wird beim Laden mit dem höchsten `_s` abgeglichen. `merge_s()` ersetzt `merge()` für Liste-Keys (gleiche Regeln: neueres `upd` gewinnt, gleiches `upd` mit anderem Inhalt → das Gesendete; **leere Sammlung löscht nichts**). Grabsteine > 60 Tage werden entfernt, `floor` merkt sich die höchste entfernte Nummer.
- `GET /api/<key>?d=1&seit=N` → `{seq, savedAt, d:{sammlung:{id:eintrag}}, top:{feld:wert}}` oder `{voll:1}` (N > seq oder N < floor). Ohne `d`: ganzer Stand + Header `X-Seq`.
- `PUT /api/<key>?d=1&seit=N` mit Teilstand `{savedAt, sammlung:{id:…}, feld:…}` → zusammenführen, Antwort wie GET-Delta **plus Korrekturen** (`korrektur()`): was das Gerät geschickt hat, der Pi aber anders oder gar nicht gespeichert hat (z. B. nicht erlaubte Änderung eines Familienmitglieds), geht zurück; Unsichtbares als `{id, upd, del:true}`.
- Ganzer PUT (alte, noch offene Tabs; Schnellaktion „+250 ml“) funktioniert weiter und stempelt nur, was sich wirklich ändert.
- Familie: `restrict()` und `filt()` wie bisher, Delta-Antworten nur mit sichtbaren Aufgaben/Verlaufseinträgen (`vis_ids`).
- **sync.js:** pro Liste-Key `pd_seq_<key>` (Nummer) und `pd_dirty_<key>` (`{c:{sammlung:{id:marke}}, t:{feld:marke}, n}`). Jede Speicherung der App wird mit dem vorigen Stand verglichen (pro Eintrag, Inhalt ohne `_s`), Geändertes wird vorgemerkt und 600 ms später als Delta gesendet; nach Erfolg werden nur Marken gelöscht, die sich inzwischen nicht geändert haben. Start (synchron, vor der App): ohne Nummer einmal ganzer PUT (Umstieg), sonst Delta senden/holen. Eigene, noch nicht gesendete Änderungen gehen vor, solange ihr `upd` größer ist. Beim Tippen (letzte Taste < 5 s oder ein anderes Feld als die Schnelleingabe ist gefüllt) wird nichts übernommen. Neue Kennung (Wiederherstellung) löscht auch `pd_seq_*`/`pd_dirty_*`. Planer und Cockpit („ganz“) unverändert.
- Gemessen: eine neue Aufgabe = 470 statt 2.150 Zeichen; bei Ernährung wächst der Unterschied mit jedem Tag.

### 5e. Ernährungs-Archiv
- `apps.json` Ernährung: `"archiv": {"sammlungen": ["log","water","burn"], "feld": "datum", "tage": 120}`. Der Pi liefert Geräten nur Einträge der letzten 120 Tage (ganzer Stand und Delta), `?alles=1` liefert alles. Seiten bekommen `window.__PI_ARCHIV`; `sync.js` entfernt ältere, nicht vorgemerkte Einträge lokal (nur beim Start und beim Übernehmen, danach meldet ein Storage-Event den Stand an die App).
- Verlauf (7/30/90 Tage), Bedarf (21 Tage) und Mikros bleiben vollständig. Häufig/Zuletzt in der Suche zählt nur noch die letzten 120 Tage. Gewicht, eigene Lebensmittel und Rezepte bleiben ganz auf dem Gerät.
- **Backup aus der App** („Backup“ im Daten-Blatt): `addons/essen-sum.js` fängt den Klick ab, holt `?alles=1` und ergänzt noch nicht gesendete Einträge des Geräts. Ohne Pi: lokaler Stand mit Hinweis.

### 5f. Tests (`tests/`)
- `test_instanz.sh <name> <port>`: frische Testinstanz aus dem Arbeitsstand ohne Daten (`/home/claude/t/<name>`).
- `test_sync_http.py <url> <datenordner>`: 23 Prüfungen – Nummern, Delta, gleiches/älteres `upd`, alter Tab mit ganzem Stand, `voll` bei Nummer zu groß bzw. vor `floor`, leere Sammlung, Archiv, Familie.
- `test_sync_browser.py <url> <datenordner>`: 24 Prüfungen mit zwei bzw. vier Geräten – gleichzeitig eintragen, offline + Löschung, gleiche Aufgabe auf zwei Geräten, Senden blockiert + neu laden, Tippen, Umstieg ohne Nummer, neue Kennung, Ernährungs-Archiv + Backup, Familie (Wunsch, Abhaken, verbotenes Umbenennen wird korrigiert).
- `test_update.py <url> <programmordner>`: 25 Prüfungen – Vorschau, Einspielen, Programmsicherung, Rückweg, sieben Arten kaputter Zips, Selbsttest verhindert nicht startenden Server, Neustart, Bedienung über die Seite (Handy), Rechte.
- `test_abhaken.py <url>`: Abhaken auf der Kachel + Rückgängig.
- `test_rework.py` (Runde 1) läuft unverändert durch. Zusätzlich geprüft: Original-Stand vom Pi + `pi-update.zip` mit Daten im alten Format (ohne `_s`).

## 6. Bekannte Reste

- Blaue Noten-Icons liegen nur im Update-Zip (Bilder lassen sich nicht ins Projekt schreiben).
- Die Rechte-Prüfungen (48) und Sicherungs-Prüfungen (20) aus `HANDOVER_Dashboard.md` liegen nicht als Skript vor und wurden nicht erneut ausgeführt; Anmeldung und Sicherung sind unverändert, die Familienrechte im Sync sind über `test_sync_http.py`/`test_sync_browser.py` geprüft.
- Safari/iPad nicht geprüft (nur Chromium).
- Aufgaben-Verlauf (`log`) wird nicht archiviert; wächst langsam.
- Ein Gerät, das länger als 60 Tage offline war, lädt beim nächsten Mal ganz neu (`voll`) – gewollt.

## 7. Runde 3 – Ernährung (11.11.2026)

Quellen: `quellcode/ernaehrung/` (app1–3.js, style.css; body.html/foods.js unverändert). Tests: `tests/test_essen3.py` (50 Prüfungen).

### 7a. Gesättigte Fettsäuren
- Feld „davon gesättigt“ im Lebensmittel-Formular (Packungsreihenfolge), im Schnell-Eintrag und beim Bearbeiten von Schnell-/Foto-Einträgen. Prüfung: nicht größer als Fett.
- Tag: Balken „davon gesättigt“ unter Fett, rot über der Grenze. Grenze = `ziele.sfa` (g) oder automatisch 10 % der kcal (`sfa:0`).
- `sfaOf(Liste)` liefert Summe + Abdeckung (Anteil des Fetts mit bekanntem Wert). Fehlende Werte zählen nicht als 0; alte Einträge werden aus dem Lebensmittel nachgerechnet, sobald es einen Wert hat. Unter 80 % Abdeckung steht ein Hinweis.
- Verlauf: Ø gesättigt (g und % der kcal), Ø Ballaststoffe. Tag: zusätzlich Zucker, Salz.

### 7b. Bedarf und Defizit (neu gerechnet)
- Modell: Bedarf = Grundbedarf (Ruhe + Alltag) + Sport. `ziele.kcal` ist das Ziel **an Tagen ohne Sport**; `budget(tag) = ziele.kcal + Sport × Anteil` (wie bisher).
- `tdee()` (28 Tage, zwischengespeichert in `TD`): Ø gegessen − Steigung der Ausgleichsgeraden durch alle Gewichtswerte × 7700. Vorher: nur Anfang/Ende des Trends, 21 Tage.
- Unvollständige Tage (unter 60 % des Grundumsatzes, ohne Profil unter 900 kcal) zählen nicht mit.
- Der angerechnete Sport-Schnitt wird abgezogen → `base`. Vorher zählte Sport doppelt (im gemessenen Bedarf und als Zuschlag).
- Bis 21 Tage/21 Tage Gewichtsspanne da sind, wird mit der Formel gemischt (`c`). Unplausible Messung (außerhalb 60–160 % der Formel) → Startwert bleibt, Hinweis.
- Formel-Startwert: Mifflin-St Jeor × Alltag; kommen Tageswerte von der Uhr (`burn.tag`), stattdessen × 1,1.
- `needOn(tag)`, `bilanz(7)` (Ø gegessen − Bedarf, dazu Trend der Waage), `prognose()` (Zielgewicht `phase.zielKg`).
- Ziele: Tempo-Chips in % des Körpergewichts, Defizit in kcal und % des Bedarfs, Warnungen (über 25 % des Bedarfs, über 1 %/Woche, unter Grundumsatz).

### 7c. Makroverteilung
- `STIL` (ausgewogen, kraft, ausdauer, lowcarb): Eiweiß in g/kg je Phase, Fett als Anteil der kcal (mind. 0,6 g/kg), Kohlenhydrate = Rest. `set.makro = {stil, pkg}`; `pkg` überschreibt g/kg.
- Grundlage: ISSN-Positionspapiere 2017 (Diets and body composition) und 2026 (Diets for body weight reduction); DGE-Referenzwerte (Fett ~30 En%, gesättigt ≤ 10 En%, Ballaststoffe ≥ 30 g).
- Tag: „x von 3 eiweißreichen Mahlzeiten (ab 20 g)“ – die 20 g sind eine eigene Faustregel.

### 7d. Garmin / Apple Health ohne Internet am Pi
- Weg: Garmin Connect schreibt in Apple Health → iOS-Kurzbefehl liest „Aktive Energie“ von heute → POST an `http://<pi>:8080/api/import_<token>` mit JSON `{aktiv, kg?, datum?}`. Nur im Heimnetz.
- Server: `GESUND_F = data/gesundheit.json` (Token, letzter Import). `GET /api/gesundheit` zeigt die Adresse (braucht Schreibrecht auf „essen“), `PUT` erzeugt eine neue. 20 Fehlversuche in 10 min → 429.
- `zahl_summe()` versteht Zahl, „612,4 kcal“, Listen und mehrzeiligen Text (summiert selbst).
- `gesund_import()` schreibt über `liste_store()` (neu, aus `liste_put` herausgezogen) in `ernaehrung_v1`: `burn['g'+datum] = {kcal, name:'Garmin', tag:1}` – jeder Lauf ersetzt den Tageswert. Gewicht nur, wenn an dem Tag kein von Hand eingetragenes steht.
- App: ein Tageswert (`tag`) ersetzt Einzel-Einträge des Tages (`dayBurn`), nichts zählt doppelt. Anleitung unter Ziele → Sport.
- Nicht getestet: der Kurzbefehl selbst auf einem iPhone (nur der Empfang am Pi).

### 7e. Dashboard
- Heute-Kachel begrenzt jetzt nach Höhe statt nach Anzahl (drei Zwischenüberschriften + 7 Zeilen wurden um 6 px abgeschnitten).

## 8. Runde 4 – Tracker-Ergänzungen und Haushaltsbuch (12.11.2026)

### 8a. Ernährung
- **„Was passt noch?“** (`wasPasst`, Karte unter „Tag“, nur heute): aus Lebensmitteln/Rezepten, die mind. 2× eingetragen wurden, die gewohnte Portion (bei Bedarf bis auf die Hälfte verkleinert), sortiert nach gedecktem Rest-Eiweiß bzw. Rest-Kalorien; Abzug, wenn die Grenze für gesättigte Fettsäuren reißt. Antippen trägt ein.
- **Wochenkonto** (`wochenkonto`, Mo–So): Tagesziel − gegessen über abgeschlossene, vollständig erfasste Tage; Anzeige ab ±50 kcal, dazu „gleichmäßig verteilt heute x kcal“.
- **Bauchumfang**: neue Sammlung `mass` (`m<Datum>` → `{bauch}`), Eingabe neben dem Gewicht, im Verlauf mit Änderung über ~4 Wochen und Hinweis, wenn die Waage steht und der Bauch schmaler wird.
- **Health-Import**: Anleitung empfiehlt jetzt das Feld `datum` vom iPhone (der Pi hat offline keine verlässliche Uhr).
- Skill `essen-foto`: Vorschlag, `sfa` immer mitzuschätzen (Karte im Chat; nur der Nutzer kann speichern).

### 8b. Haushaltsbuch (neues Tool)
- Dateien: `www/Haushaltsbuch.html` (Quellen `quellcode/haushalt/`: `app.js`, `style.css`, `body.html`, `build.py`), Icons `haushalt-*.png`, Eintrag in `apps.json` (`haushalt_v1`, Sync „liste“, Gruppe Alltag, nicht „familie“ → für andere Personen erst nach Freigabe sichtbar).
- `shell.js`: `haushaltsbuch → haushalt`, Theme-Schlüssel `haushalt_theme` (auch in `dashboard.html`). `shell.css`: Dialoge wie bei Ernährung als Vollbild am Handy.
- Daten: `tx` (Buchungen: `datum, betrag, art aus|ein, kat, notiz, fix?`), `cats` (`name, gruppe bedarf|wunsch|sparen, farbe, budget, ord`), `fix` (`name, betrag, art, kat, intervall 1|3|6|12, tag, ab, bis`), `set` (`einkommen, ziel{bedarf,wunsch,sparen}, klein`).
- Standard-Kategorien haben feste Kennungen (`c-…`, `upd:1`), damit zwei Geräte beim ersten Start nichts doppelt anlegen.
- **Fixkosten** buchen sich beim Öffnen: `fixDue(monat)` liefert Termine mit fester Kennung `x_<fixId>_<JJJJMM>`; `bookFix()` legt fehlende an (aktueller und voriger Monat, höchstens 35 Tage zurück). Gelöschte Buchungen bleiben als Grabstein und kommen nicht wieder.
- **Monat** (`monat(m)`): Einkommen = Maximum aus Plan und Eingegangenem; `res` = was vom Sparziel noch fehlt (wird reserviert); `frei = Einkommen − Ausgaben − offene Fixkosten − res`; `proTag = frei / Resttage`.
- **Schnellzeile** (`parseQuick`, `guess`): „12,50 Rewe“, „Rewe 12,50“, „+450 Nebenjob“. Gleiche Notiz wie früher → gleiche Kategorie; sonst öffnet sich das Blatt einmal.
- **Auswertung**: Monate, Ø je Kategorie mit Trend, Wochentage, kleine Beträge (`set.klein`), häufigste Notizen, Sätze unter „Was auffällt“ (ab 8 variablen Buchungen). Verhalten = variable Ausgaben ohne Fixkosten und ohne Sparen.
- **Plan**: Einkommen, 50/30/20 (änderbar), „noch zu verteilen“, Budgets je Kategorie, Vorschlag aus Ø 3 Monate/Fixkosten, Fixkosten & Abos mit Monats- und Jahressumme.
- Kachel `sum_haushalt` (v1): frei im Monat, Ring verplant/Einkommen, bis zu 3 Umschläge, letzte Ausgaben.
- Nicht gebaut: Bank-CSV-Import, mehrere Konten, gemeinsame Kasse, Monatsrückblick mit Fragen (Kakeibo).

### 8c. Tests
- `tests/test_haushalt.py <url>` (48 Prüfungen), `tests/test_essen3.py` (jetzt 56). `test_rework.py`: Kalender-Prüfung hängt nicht mehr am Datum.
- Achtung Testumgebung: Server-Uhr (UTC) und Browser (Europe/Berlin) können um Mitternacht verschiedene Tage haben.
