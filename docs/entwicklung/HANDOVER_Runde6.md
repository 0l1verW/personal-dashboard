# Handover-Ergänzung: Runde 6 – Umsetzung der Grill-Runde 20.11.2026

Ergänzt `HANDOVER_Runde5.md`. Grundlage: Dokument „Entscheidungen Dashboard – Grill-Runde 20.11.2026“ (Artefakt). Lieferung je Schritt als `pi-update.zip` (Struktur `dashboard/…`), einspielen über `/system` → „Update-Datei wählen …“.

## 1. Server-Punkte (Schritt 1)

Geändert: `pi-uni/server.py`, `pi-uni/dashboard.html`, `pi-uni/system.html`. **Neustart nötig** (passiert beim Einspielen über `/system` von selbst; beim ssh-Weg `sudo systemctl restart dashboard`).

### 1a. Sicherheitsnetz Uhr (Abschnitt 1)
- `uhr_status(extra)` → `(geht_nach, neueste_ms)`. „Neueste“ = größter `savedAt`/`upd` in allen `data/*.json` (ohne `_*`, `auth`, `sicherung`, `gesundheit`; Liste-Keys über den Zwischenspeicher `state_load`), Zwischenspeicher je Datei (mtime/size), höchstens alle 30 s neu. `extra` = Zeitstempel der gerade ankommenden Daten, damit schon die erste Speicherung mit neuerer Geräte-Zeit zählt.
- Pi-Uhr gilt als nachgehend, wenn `neueste > jetzt + 10 Min` (`UHR_TOL`). Werte ab 2100 zählen nicht (`UHR_MAX`).
- Dann: `merge()`/`merge_s()` löschen keine Grabsteine (`cut = 0`), `archiv_of()` liefert `None` (Geräte bekommen und behalten alles), `new_token()` räumt keine alten Anmeldungen weg.
- `hinweise()` setzt einen **roten** Hinweis an den Anfang („Die Uhr des Pi geht nach (Pi: …, neuester Eintrag: …) … Zeitabgleich prüfen: timedatectl“). `zustand()` liefert `uhr:{falsch, neueste}`; `/system` zeigt eine Kachel „Uhrzeit“ (rot bei falscher Uhr). Das Dashboard sortiert Rotes vor Gelbes in der Hinweisleiste.
- Nicht erkannt werden kann eine Pi-Uhr, die **vorgeht** (dazu fehlt ein Bezug). Dagegen hilft NTP (Entscheidung: ausgehend nur NTP/apt).

### 1b. Erinnerung Sicherungs-Download (Abschnitt 2)
- `GET /api/system_download` und `GET /api/system_datei` merken sich den Zeitpunkt in `data/sicherung.json` → `download` (ms).
- `hinweise(z, cfg, besitzer)`: nur für den Besitzer (bzw. offenen Modus) gelb „noch nie heruntergeladen“ bzw. „seit N Tagen nicht heruntergeladen“, wenn älter als 35 Tage (`DOWNLOAD_TAGE`). Erscheint im Dashboard als Hinweisleiste und in `/system`.
- `/system`: neben „Herunterladen“ steht „Zuletzt heruntergeladen: …“ (gelb, wenn fällig); nach Klick lädt die Seite den Stand nach 2,5 s neu. Hinweistext: ZIP selbst aufheben, Download-Ordner in die Cloud.

### 1c. Cookie `pd_auth` 1 Jahr mit Verlängerung (Abschnitt 6)
- Neue Anmeldungen: `Max-Age=31536000` (`AUTH_AGE`). `pd_person` bleibt bei 10 Jahren.
- Jede ausgelieferte HTML-Seite (Dashboard, Tools, `/system` …) setzt den Cookie mit dem gleichen Token neu auf 1 Jahr (`H.send`, nur wenn über `pd_auth` angemeldet). API-Antworten setzen nichts.
- Token-Einträge in `auth.json` bekommen `seen` (Sekunden, höchstens einmal am Tag geschrieben). Bestehende Anmeldungen (10-Jahres-Cookie, ohne `seen`) bleiben gültig, bekommen beim nächsten Aufruf `seen` und den 1-Jahres-Cookie.
- Aufräumen: beim Anmelden werden Tokens entfernt, deren `seen` älter als 400 Tage ist (`TOKEN_WEG`); Tokens ohne `seen` bleiben bis zur nächsten Nutzung.

### 1d. Tests
- Neue Test-Grundlage `tests/harness.py` + `tests/run_server.py` (startet `server.py` unverändert, fügt nur im Test einen Fehler-Haken `window.__errs` in HTML-Antworten ein).
  - Chromium per Playwright mit drei Profilen: 375 = iPhone (Touch, mobil, iOS-UA), 768 = iPad (Touch), 1280 = PC.
  - **WebKit** per WebKitGTK + WebDriver (`apt install webkit2gtk-driver xvfb`, `pip install selenium`), Seite in einem iframe genau 375/768/1280 breit (MiniBrowser-Fenster wird nicht schmaler). Cookies dort per `document.cookie` (Selenium `add_cookie` geht in WebKitGTK nicht).
  - **Firefox und Playwrights eigenes WebKit ließen sich in der Testumgebung nicht installieren** (Download-Server gesperrt). Firefox ist daher nicht geprüft.
- `tests/test_schritt1.py`: 207 Prüfungen – Selbsttest, Uhr richtig/nachgehend (Grabstein, Archiv, Hinweis, auch sofort nach einer Speicherung mit neuerer Zeit), Download-Erinnerung (nie, 34/40 Tage, nur Besitzer), Cookie (1 Jahr, Verlängerung bei Seitenaufruf, alte Anmeldung bleibt gültig, Aufräumen > 400 Tage), Dashboard und `/system` in Chromium und WebKit bei 375/768/1280 hell/dunkel ohne Fehler und ohne horizontales Scrollen.
- Achtung Testumgebung: Server-Uhr UTC, Browser Europe/Berlin.

## 2. Ernährung (Schritt 2)

Geändert: `quellcode/ernaehrung/app1.js`, `app2.js`, `app3.js`, `style.css` → `www/Ernaehrung.html`; dazu `pi-uni/server.py`, `pi-uni/sync.js`, `pi-uni/apps.json`. **Neustart nötig** (wegen `server.py`; über `/system` automatisch). Keine Datenänderung, keine Migration.

### 2a. Mikro-Karte (Abschnitt 15)
- `microCard(ks, titel, cap, bezug, bezugTxt)` in `app1.js` neu aufgebaut:
  - **immer sichtbar** (Ø pro Tag): Ballaststoffe (gegen Ziel `bal`), Zucker, Salz (max. 6 g, `SALZ_MAX`), gesättigte Fette (max. `sfaMax()`, „–“ wenn unter 50 % des Fetts bekannt, Hinweis unter 80 %).
  - Knopf **„Vitamine & Mineralstoffe“** (`data-mikauf`, `aria-expanded`), **standardmäßig eingeklappt**; Zustand nur auf dem Gerät (`localStorage.essen_mikro_auf`).
  - Aufgeklappt: die 18 Werte nur, wenn `mikCov(bezug) >= 0,70` (Median-Abdeckung der kcal mit Vitamin-/Mineralwerten, `MIKRO_MIN`). Sonst ein Hinweis mit dem tatsächlichen Anteil.
  - Bezug: unter **Tag** die 7 Tage bis zu diesem Tag (`woche(day)`), unter **Verlauf** der gewählte Zeitraum (7 Tage = die Woche).
- Unter „Tag“ erscheint die Karte weiter nur mit dem Schalter „Mikronährstoff-Karte auch unter „Tag“ zeigen“ (`set.mikro`); unter „Verlauf“ immer. Text unter „Ziele“ angepasst.
- Foto-Skill bleibt ohne Mikros (Entscheidung).

### 2b. Archiv für Gewicht und Bauchumfang (Abschnitt 12)
- `apps.json` Ernährung: `"archiv": {"sammlungen": ["log","water","burn","weight","mass"], "feld": "datum", "tage": 120, "tageJe": {"weight": 730, "mass": 730}}`.
- `server.py`: `archiv_of()` liefert zusätzlich `abJe` (Stichtag je Sammlung); `alt(ar, it, sammlung)` nutzt ihn (ganzer Stand, Delta). `?alles=1` liefert weiter alles (Backup aus der App über `addons/essen-sum.js`).
- `sync.js` `prune()`: je Sammlung `ar.abJe[c] || ar.ab`. Gerät behält Gewicht und Bauch 2 Jahre, Essen/Wasser/Sport 120 Tage. Eigene Lebensmittel und Rezepte bleiben ganz auf dem Gerät.

### 2c. Tests
- `tests/test_schritt2.py`: 218 Prüfungen – Archiv (ganzer Stand, Delta, `?alles=1`, Stichtage auf der Seite, Gerät behält 2 Jahre Gewicht), Mikro-Karte (eingeklappt, Grundwerte, Aufklappen per Tippen, bleibt nach Neuladen, 100 %/0 %, Grenze 70 % genau: 0,70 sichtbar, 0,55 Hinweis), Schnell-Eintrag als Rückfall-Test, alle vier Ansichten (auf/zu) bei 375/768/1280 hell/dunkel in Chromium und WebKit ohne Fehler und ohne horizontales Scrollen.
- `tests/test_schritt1.py` erneut grün (Testdaten um Nährwerte ergänzt, weil Ernährung jetzt mitläuft).
- Nicht erneut gelaufen: ältere Tests aus Runde 3–5 (`test_essen3.py`, `test_eingabe_handy.py`); deren Codepfade sind unverändert.

## 3. Neues Tool „Training“ (Schritt 3, Abschnitt 17)

Neu: `quellcode/training/` (`body.html`, `style.css`, `app1.js` Daten/Logik/Timer/Kachel, `app2.js` Ansichten/Blätter, `app3.js` Ereignisse/Init, `build.py`, `mkicons.py`) → `www/Training.html` (`python3 quellcode/training/build.py dashboard/www/Training.html`), Icons `www/icons/training-{64,180,192,512}.png` (`python3 quellcode/training/mkicons.py dashboard/www/icons`).
Geändert: `pi-uni/apps.json` (Eintrag), `pi-uni/server.py` (`bg` auch ohne Addon), `pi-uni/dashboard.html` (Kachel-Links, `bis`, Theme-Schlüssel), `www/shared/shell.js` (Theme-Schlüssel). **Neustart nötig** (wegen `server.py`; über `/system` automatisch).
Die Icon-PNGs liegen im Update-Zip, nicht als Projektdatei (Bilder lassen sich nicht ins Projekt schreiben) – neu erzeugbar mit `mkicons.py`.

### 3a. Daten (`training_v1`, Sync „liste“, eigene Gruppe „Sport“, nicht Familie)
- `uebungen{id,name,gruppe,upd}` · `vorlagen{id,name,uebungen:[id],ord,upd}` · `trainings{id,datum,start,ende,name,vorlage,notiz,uebNotiz{u:text},reihe:[u],namen{u:name},saetze:[{uebung,nr,kg,wdh,satzSek,pauseSek,notiz?,t}],lauf,upd}` · `set{wochenziel,schritt,upd}`.
- Erster Start: 16 Übungen und Vorlagen Push/Pull/Beine mit **festen IDs und `upd:1`** (zwei Geräte legen nichts doppelt an).
- `normalize()`/`trN()` ergänzen fehlende Felder mit Standardwert; keine Migration. Gelöschte Übungen bleiben als Grabstein mit Namen (Verlauf zeigt den Namen weiter; zusätzlich `namen` im Training).
- Kein Archiv (Datenmenge klein).

### 3b. Ablauf und Timer
- Start: Vorlage antippen = Training läuft, oder „Leeres Training“. Pro Übung „Letztes Mal (Datum): 60 × 10 · …“.
- Timer oben (sticky): „Satz N starten“ → Satzzeit läuft → „Fertig“ → kg/Wdh mit ±-Knöpfen (Schritt 1/1,25/2,5/5 kg einstellbar), Vorschlag = voriger Satz, sonst gleicher Satz vom letzten Mal → „Speichern“. **Die Pause zählt ab „Fertig“** und wird beim nächsten „Satz starten“ am vorigen Satz gespeichert. „Abbrechen“ / „Verwerfen“ geht zurück in die Pause.
- Alle Zeiten sind Zeitstempel in `lauf` → stimmt nach Sperren/Neuladen. Kein Ton, kein Wake-Lock, kein Service Worker (bräuchten HTTPS; so entschieden). Offline: Seite einmal geladen, dann geht alles lokal, Pi gleicht später ab.
- Notiz pro Training, optional pro Übung und pro Satz. Kein RPE. „Satz eintragen“ ohne Timer, Übung spontan suchen/anlegen, als Vorlage speichern, vergangene Trainings bearbeiten (Name/Datum/Zeiten, Sätze antippen). Löschen per zweitem Tippen statt Dialog.
- Bestwerte: neues Bestgewicht oder höheres geschätztes 1RM (Epley) gegenüber allen früheren Trainings → goldener Hinweis + Abzeichen am Satz (nur wenn es die Übung vorher schon gab).

### 3c. Ansichten
Training (Start/laufend) · Verlauf (nach Wochen) · Fortschritt (je Übung: bestes Gewicht, bestes 1RM, meistes Volumen, meiste Wdh., Diagramm 1RM-Linie + schwerster Satz, alle Trainings) · Übungen (Vorlagen sortieren/bearbeiten/starten, Übungen nach Muskelgruppe, Wochenziel, ±-Schritt). JSON-Backup speichern/einlesen (zusammenführen nach `upd`).

### 3d. Kachel (v1, ohne Addon)
- Die Seite setzt selbst `window.__dashSum` und schickt `PUT /api/sum_training`. `apps.json` `"bg": true` → `server.py` meldet `bg` auch ohne `addon`, damit das Dashboard die Kachel im Hintergrund auffrischt.
- Inhalt: Zahl/Ring „Trainings diese Woche“ (Ziel), Zeilen „Läuft: …“ und letzte Trainings mit Datum, **neues Feld `links`** `[{l,hash,titel}]` (Vorlagen → `#start=<id>`, laufend → `#laeuft`) und **`bis`** (Beginn der nächsten Woche).
- `dashboard.html`: `links` als Knöpfe (`.tlinks`, 2 bzw. 4 je Breite, eine Zeile weniger), `bgCheck` frischt auch auf, wenn `bis` vorbei ist. „+“ auf der Kachel = `#neu` = leeres Training.
- Hash in der Seite: `#start=<Vorlage>`, `#neu`, `#laeuft`; `#hintergrund` wird ignoriert. Läuft schon ein Training, wird kein zweites gestartet.

### 3e. Tests
- `tests/test_schritt3.py`: 341 Prüfungen – Auslieferung mit Sync, Icon, Sync „liste“ mit zwei Geräten; kompletter Ablauf am iPhone-Profil per Tippen (Vorlage, Satz/Pause-Zeiten, Vorschlag, ±, Abbrechen, Übungswahl, Notizen, neue Übung, Satz ohne Timer, Beenden, „Letztes Mal“, Bestwert, Neuladen mit laufender Pause, Fortschritt, Vorlage anlegen/umsortieren); zweites Gerät sieht alles; Dashboard frischt abgelaufene Kachel (`bis`) im Hintergrund auf, Kachel-Knopf startet „Push“; 15 Zustände (alle Ansichten, alle Timer-Phasen, alle Blätter) bei 375/768/1280 hell/dunkel in Chromium und WebKit ohne Fehler und ohne horizontales Scrollen.
- `test_schritt1.py` (207) und `test_schritt2.py` (218) erneut grün. Firefox weiter nicht prüfbar (s. 1d).
