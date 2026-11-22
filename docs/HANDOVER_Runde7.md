# Handover-Ergänzung: Runde 7 – Familie: eigene Daten je Person, private Aufgaben (22.11.2026)

Ergänzt `HANDOVER_Runde6.md` / `HANDOVER_Runde6b.md`. Auftrag von Alex: „ein übergreifendes, miteinander agierendes Aufgabentool, und bei Bedarf die bestehenden Tools leer für eine Person einbinden“. Damit sind Abschnitt 3 (Familienteil eingefroren) überholt und Abschnitt 4 (Variante B: ein Server, ein Dashboard je Person) sowie Abschnitt 5 (private Aufgaben) der Grill-Runde umgesetzt.

Geändert: `pi-uni/server.py`, `pi-uni/sync.js`, `pi-uni/verwaltung.html`, `quellcode/aufgaben/app1.js`, `app2.js`, `app3.js`, `style.css` → `www/Aufgaben.html`. `apps.json` unverändert. **Neustart nötig** (server.py; über `/system` automatisch). Keine Migration, keine Datenänderung.

Annahmen (Alex hat diese zwei Fragen offen gelassen): Welche Tools getrennt laufen, entscheidet der Admin je Person in der Verwaltung. Eigene Daten einer Person sieht niemand sonst, auch kein Admin.

## 1. Eigene Daten je Person („Daten: Eigene (leer)“)

- `rechte.json` je Person neu `eigen: [appId]`. Erlaubt für alle Tools ohne `proPerson` (also nicht Aufgaben); der Besitzer hat nie eigene (`eigen_of()`).
- Verwaltung: unter jedem Tool (Recht ≠ Kein, nicht beim Besitzer) Zeile „Daten: Gemeinsam | Eigene (leer)“. `rechte_put` filtert Unerlaubtes.
- Server bildet den Key um: `H.skey(k)` → `<key>__<pid>` (z. B. `ernaehrung_v1__sam.json`). Die Tools merken nichts (gleicher localStorage-Key). Gilt für Modus „liste“ und „ganz“, für ganzen Stand und Delta, mit Archiv (`app_of_key` arbeitet mit `base_key`).
- Kachel: `H.sumkey()` → `sum_<id>__<pid>` bei `proPerson` oder eigenen Daten; ein angefragtes Suffix wird ignoriert (keine fremde Kachel abrufbar). Dashboard-Register hat zusätzlich `eigen`.
- Schutz: jeder direkt angefragte Daten-Key mit `__` ist gesperrt (403), auch für Admins und den Besitzer. In der Komplettsicherung liegen die Dateien trotzdem lesbar.
- Health-Import schreibt nur in `ernaehrung_v1`: `/api/gesundheit` ist für Personen mit eigener Ernährung gesperrt (403). Kalender (`ics_*` außer Aufgaben) einer Person mit eigenen Daten werden nicht geschrieben (200, `uebersprungen`).
- Zurück auf „Gemeinsam“: die eigene Datei bleibt auf dem Pi und ist beim nächsten Umschalten wieder da.
- **sync.js**: Seiten bekommen `window.__PI_MAP` (Key → Ablage). Wechselt die Ablage gegenüber `pd_map_<key>` (andere Person am selben Gerät, eigene Daten an/aus), verwirft das Gerät seine Kopie samt `pd_seq_`/`pd_dirty_` und lädt neu. Erstes Mal mit dieser Version: nur bei eigenen Daten verwerfen, sonst bleiben unsynchronisierte Änderungen erhalten. Aufgaben tragen die Person als Marke (`aufgaben_v1@<pid>`) → bei Personenwechsel am selben Gerät keine fremden (privaten) Aufgaben mehr im lokalen Speicher.

## 2. Private Aufgaben (Feld `privat`)

- Wirkt nur, wenn die Aufgabe für die eintragende Person selbst ist (`fuer` leer oder = `von`) und nicht mit anderen abwechselt (`priv_ok`). Dann sieht sie nur `von` – auch kein Admin (`hidden(t, p)`).
- Server: `sicht_of()` (ersetzt den Filter bei Aufgaben für alle, auch Admins) blendet private Aufgaben anderer samt Verlauf aus; Delta über `vis_ids()`. Wird eine bekannte Aufgabe privat gestellt, bekommen Geräte mit `seit > 0` einen Grabstein (`delta_of(..., weg)`), damit die alte Kopie verschwindet. Schreiben: Familie über `restrict()` (sieht sie nicht), Admins über `drop_hidden()`; die Antwort korrigiert das Gerät (Grabstein).
- App: neue Aufgabe für sich selbst ist **standardmäßig privat** (`newTask`), auch über die Schnelleingabe. Detailblatt: Schalter „Privat – nur du siehst diese Aufgabe, auch Admins nicht“ unter „Für“ (nur bei eigenen Aufgaben); Wechsel auf andere Person schaltet ihn ab, zurück auf „mich“ (neue Aufgabe) wieder an. Liste: Schloss „privat“. Kalender „Alle Aufgaben“ ohne private, persönliche Kalender nur mit den eigenen privaten.
- Bestehende Aufgaben haben kein `privat` → bleiben sichtbar wie bisher.

## 3. Tests (Chromium; WebKit und Firefox ließen sich in der Umgebung nicht installieren)

- `tests/test_familie_http.py <url> <datenordner>`: 56 Prüfungen – eigene Daten (Ablage, Trennung, 403 auf fremde Keys auch für Admins, Kacheln je Person, Health gesperrt, `__PI_MAP`, an/aus/an), private Aufgaben (Familie Sicht alle/eigene, Admin sieht sie nicht, Änderungsversuche von Admin und Familie werden verworfen und korrigiert, öffentlich→privat→öffentlich per Delta, Abwechseln hebt privat auf, ganzer PUT ohne private löscht nichts).
- `tests/test_familie_browser.py <url> <datenordner>`: 58 Prüfungen – Alex am iPhone (Schnelleingabe privat, Schalter, Personenwechsel), Sam sieht Alexs private nicht und umgekehrt, privat/öffentlich kommt auf Sams Gerät an bzw. verschwindet, Sam startet Ernährung leer, getrennte Dateien und Kacheln, **geteiltes Gerät** Alex → Sam → Alex ohne Datenvermischung, Verwaltung (Schalter, Speichern), Blatt und Verwaltung bei 375/768/1280 hell/dunkel ohne Querscrollen und ohne Skriptfehler.
- `tests/test_sync_http.py` unverändert grün. `server.py selbsttest` um private Aufgaben und `base_key` ergänzt.
- Nicht erneut gelaufen: die übrigen Browser-Suiten (`test_schritt1–3`, `test_sync_browser`, `test_rework`), weil die echten Seiten `dashboard.html`/`anmelden.html`/`system.html` hier nur als Platzhalter vorlagen. Die geänderten Codepfade sind durch die neuen Tests abgedeckt.

## 4. Offen / Hinweise

- Pi 3 mit 1 GB: für ein paar Personen unkritisch; laut Abschnitt 11 bei vielen Personen Pi 4/5 vormerken.
- Dashboard selbst ist unverändert: jede Person sieht dort nur ihre freigegebenen Tools mit ihren eigenen Kacheln.
- Entscheidungsdokument (Abschnitt 3 „eingefroren“) ist durch diese Runde überholt.
