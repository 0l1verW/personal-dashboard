# Personal Dashboard

Selbst gebautes Dashboard für den Raspberry Pi im Heimnetz. Ein kleiner Python-Server (nur Standardbibliothek) liefert die Tools aus, synchronisiert ihre Daten zwischen iPad, iPhone und PC und zeigt auf der Startseite Kacheln mit Kurzinfos.

## Tools

| Tool | Datei | seit |
|---|---|---|
| Semesterplaner | `dashboard/www/Semesterplaner.html` | Okt. 2026 |
| Notencockpit | `dashboard/www/Notencockpit.html` | Okt. 2026 |
| Aufgaben (Familie) | `dashboard/www/Aufgaben.html` | 08.11.2026 |
| Ernährung | `dashboard/www/Ernaehrung.html` | 09.11.2026 |
| Haushaltsbuch | – (siehe Verlauf) | 12.11.2026 |
| Training | – (siehe Verlauf) | 20.11.2026 |
| Einkaufsliste | – (siehe Verlauf) | 22.11.2026 |

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
```

Daten (`data/`) gehören nicht ins Repo.

## Stand des Repos

Die Historie ist nachträglich aus echten Zwischenständen gebaut (Dateien vom PC, Datum = Änderungszeit der Dateien):

- 30.10.2026: erster Sync-Server
- 02.11.2026: Ordner `pi-uni` mit Planer, Cockpit, lokalen Schriften
- 05./06.11.2026: neue Fassungen von Cockpit und Planer
- 08./09.11.2026: Umbau zum Personal Dashboard (aus `dashboard-ohne-daten.zip`)

Ab dem 11.11.2026 (Rework bis Runde 8) sind die Änderungen nur in `docs/VERLAUF.md` beschrieben. Der zugehörige Code fehlt noch. Er kommt mit einem aktuellen Programmstand vom Pi (ZIP ohne Daten) als nächster Commit.
