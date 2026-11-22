# Personal Dashboard

[![CI](https://github.com/0l1verW/personal-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/0l1verW/personal-dashboard/actions/workflows/ci.yml)
[![Lizenz: GPL-3.0](https://img.shields.io/badge/Lizenz-GPL--3.0-blue.svg)](LICENSE)

Ein selbst gehostetes Dashboard für den Raspberry Pi im Heimnetz. Ein kleiner Python-Server (nur Standardbibliothek, keine Abhängigkeiten) liefert eine Reihe von Alltags-Tools aus, gleicht ihre Daten zwischen allen Geräten im WLAN ab und zeigt auf der Startseite Kacheln mit dem Wichtigsten. Nichts geht ins Internet.

## Tools

| Tool | Wofür |
|---|---|
| **Semesterplaner** | Kurse, Termine, Übungsblätter, Zulassung und Klausuren eines Semesters |
| **Notencockpit** | Noten, ECTS und Schnitt im Studium (Beispiel-Studiengang: BSc Informatik, Uni Tübingen, PO 2021) |
| **Aufgaben** | gemeinsame Aufgaben der Familie mit Wiederholungen, Wünschen, privaten Aufgaben und Kalender-Abo |
| **Ernährung** | Essen, Wasser, Gewicht, Bedarf und Ziele; optional mit dem Bundeslebensmittelschlüssel |
| **Haushaltsbuch** | Ausgaben per Schnellzeile, Budgets, Fixkosten, Auswertung |
| **Training** | Krafttraining mit Vorlagen, Satz- und Pausen-Timer, Fortschritt |
| **Einkaufsliste** | gemeinsame Liste nach Laden-Bereichen, „Oft gekauft“, CSV-Export |

Jedes Tool ist **eine** HTML-Datei. Sie läuft auch ohne Pi direkt im Browser (dann nur lokal, ohne Abgleich).

## Funktionen

- **Abgleich** zwischen iPhone, iPad und PC; offline weiterarbeiten, später gleicht der Pi ab (Delta-Sync pro Eintrag).
- **Personen und Rechte**: Besitzer mit Passwort, weitere Personen mit PIN; je Tool „kein Zugriff / ansehen / bearbeiten“, wahlweise gemeinsame oder eigene Daten.
- **Sicherung**: täglich automatisch (SD-Karte oder USB-Stick), Download als ZIP, Wiederherstellen über die Systemseite.
- **Updates** als ZIP über die Systemseite, mit Selbsttest und Rückweg.
- Als **Home-Bildschirm-App** auf iPhone und iPad nutzbar, hell und dunkel.

## Schnellstart

```bash
# auf dem Raspberry Pi (Raspberry Pi OS, Python 3.9 oder neuer)
git clone https://github.com/0l1verW/personal-dashboard.git
cd personal-dashboard
bash dashboard/install.sh
```

Danach im Browser `http://<name-des-pi>.local:8080` öffnen. Zum Ausprobieren auf dem eigenen Rechner reicht `python3 dashboard/server.py 8080` und dann `http://localhost:8080`.

Die ausführliche Anleitung (erste Einrichtung, Personen, Sicherung, Updates, Zugriff von unterwegs, Fehlersuche) steht in **[docs/ANLEITUNG.md](docs/ANLEITUNG.md)**.

## Aufbau

```
dashboard/              Programm, das auf dem Pi läuft
  server.py             Server: Auslieferung, Sync, Anmeldung, Rechte, Sicherung, /system
  sync.js               wird in jede Tool-Seite eingefügt (localStorage <-> Pi)
  apps.json             Register der Tools
  dashboard.html        Startseite mit Kacheln
  anmelden.html, verwaltung.html, system.html
  install.sh, dashboard.service
  www/                  Tools (gebaut), Icons, Schriften, gemeinsame Schicht, Addons
  data/                 entsteht beim ersten Start: alle Daten (nicht im Repo)
quellcode/<tool>/       Quellen der neueren Tools; build.py baut daraus die HTML-Datei
scripts/                build_all.py, make_update_zip.py
docs/                   Anleitung, Entwickler-Doku, Notizen je Entwicklungsrunde
```

Wie man ein Tool ändert oder ein neues hinzufügt: **[docs/ENTWICKLUNG.md](docs/ENTWICKLUNG.md)**.

## Sicherheit

Gedacht für das **Heimnetz**: kein HTTPS, Port 8080 nicht im Router freigeben. Für unterwegs ein VPN wie Tailscale oder WireGuard nutzen. Details und Meldewege: [SECURITY.md](SECURITY.md).

## Mitmachen

Fehler und Ideen gern als Issue. Wie Pull Requests aussehen sollten: [CONTRIBUTING.md](CONTRIBUTING.md). Änderungen je Runde: [CHANGELOG.md](CHANGELOG.md).

## Lizenz

Der Code steht unter der [GNU General Public License v3.0](LICENSE). Mitgelieferte Schriften und Bibliotheken haben eigene Lizenzen, siehe [THIRD_PARTY.md](THIRD_PARTY.md).

## Entstehung

Das Projekt ist im Herbst 2026 entstanden, weitgehend mit Claude (Anthropic) als Programmier-Partner. Die Git-Historie wurde nachträglich aus Zwischenständen aufgebaut. Ab dem Rework (11.11.2026) gilt: Das Autor-Datum ist der Tag der jeweiligen Runde, das Commit-Datum der Tag, an dem der Code ins Repo kam. Beispiel- und Personendaten in der Historie sind durch neutrale ersetzt.
