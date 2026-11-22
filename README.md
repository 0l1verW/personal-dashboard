# Personal Dashboard

Selbst gebautes Dashboard für den Raspberry Pi im Heimnetz. Ein kleiner Python-Server (nur Standardbibliothek) liefert die Tools aus, synchronisiert ihre Daten zwischen iPad, iPhone und PC und zeigt auf der Startseite Kacheln mit Kurzinfos.

## Tools

| Tool | Datei | seit |
|---|---|---|
| Semesterplaner | `dashboard/www/Semesterplaner.html` | Okt. 2026 |
| Notencockpit | `dashboard/www/Notencockpit.html` | Okt. 2026 |
| Aufgaben (Familie) | `dashboard/www/Aufgaben.html` | 08.11.2026 |
| Ernährung | `dashboard/www/Ernaehrung.html` | 09.11.2026 |
| Haushaltsbuch | `dashboard/www/Haushaltsbuch.html` | 12.11.2026 |
| Training | `dashboard/www/Training.html` | 20.11.2026 |
| Einkaufsliste | `dashboard/www/Einkauf.html` | 22.11.2026 |

Jedes Tool ist eine eigenständige HTML-Datei. Sie läuft lokal, als Artefakt oder über den Pi (nur dort mit Sync). Welche Tools es gibt, steht in `dashboard/apps.json`.

## Aufbau

```
dashboard/
  server.py          Server: Auslieferung, Sync, Anmeldung, Rechte, Sicherung, /system
  sync.js            wird in jede Tool-Seite eingefügt (localStorage <-> Pi)
  apps.json          Register der Tools
  dashboard.html     Startseite mit Kacheln
  anmelden.html, verwaltung.html, system.html
  dashboard.service, install.sh, umzug.sh
  www/               Tools, Icons, Schriften, Addons
  www/shared/        gemeinsame Schicht (shell.js, shell.css), wird in jede Tool-Seite eingefügt
quellcode/<tool>/    Quellen der neueren Tools; build.py baut daraus die eine HTML-Datei
docs/                Verlauf und Übergabe-Notizen je Runde
```

Ein Tool neu bauen, z. B.: `python3 quellcode/haushalt/build.py dashboard/www/Haushaltsbuch.html`

Daten (`data/`) gehören nicht ins Repo.

## Stand des Repos

Die Historie ist nachträglich aus echten Zwischenständen gebaut (Dateien vom PC, Datum = Änderungszeit der Dateien):

- 30.10.2026: erster Sync-Server
- 02.11.2026: Ordner `pi-uni` mit Planer, Cockpit, lokalen Schriften
- 05./06.11.2026: neue Fassungen von Cockpit und Planer
- 08./09.11.2026: Umbau zum Personal Dashboard (aus `dashboard-ohne-daten.zip`)
- 11.11.–22.11.2026: Rework und Runden 2 bis 8, je Runde ein Commit mit dem Code

Die Commits ab dem Rework haben als Autor-Datum den Tag der Runde und als Commit-Datum den Tag, an dem sie ins Repo kamen (22.11.2026).

Hinweise zu diesen Commits:
- Die Dateien stammen aus dem Claude-Projekt „Alex Dashboard“ (jeweils die neueste Fassung) und wurden abgeschrieben, nicht kopiert. Geprüft wurde mit `python3 server.py selbsttest`, `node --check` und einem Lade-Test jeder Tool-Seite. Wo es einen älteren Stand gab, wurde dagegen verglichen; die Unterschiede sind nur die beschriebenen Änderungen.
- In `server.py` (`zahl_summe`) stehen für schmale Leerzeichen `\u00a0` und `\u202f` als Escape-Folgen. Welche Zeichen im Original standen, ließ sich nicht sicher feststellen.
- Jede Datei liegt im Commit der Runde, in der sie zuletzt geändert wurde. Zwischenstände einzelner Dateien gibt es nicht.
- Für das Haushaltsbuch fehlen die Icons (`haushalt-*.png`). Es gab kein `mkicons.py` dafür; der Pi zeigt dann das allgemeine Icon.
- Die Tests (`tests/`) liegen nur im Claude-Projekt und sind nicht im Repo.
