# Uni-Apps auf dem Raspberry Pi

Semesterplaner und Notencockpit laufen auf dem Pi. Alle Geräte im WLAN (iPad, Desktop, Handy)
sehen und bearbeiten **denselben Stand**.

## Einrichten (einmalig)
```bash
# vom Desktop/WSL auf den Pi kopieren (Benutzer/Hostname anpassen):
scp pi-uni.zip pi@raspberrypi.local:~/
ssh pi@raspberrypi.local
unzip pi-uni.zip && cd pi-uni && bash install.sh
```
Voraussetzung: Python 3, auf Raspberry Pi OS schon dabei. Der Dienst startet nach jedem Neustart von selbst.

## Öffnen
- `http://raspberrypi.local:8080`, oder die IP, die install.sh ausgibt, z. B. `http://192.168.178.42:8080`
- **iPad:** in Safari öffnen → Teilen → *Zum Home-Bildschirm*. Dann startet sie wie eine App.
- **Desktop:** als Lesezeichen speichern.

## So bleibt alles gleich
- Jede Änderung geht nach etwa 1 s an den Pi. Andere Geräte holen sie beim Öffnen,
  beim Zurückwechseln in den Tab und alle 20 s.
- Unten links zeigt ein kleines Etikett den Status: **Pi ✓** gespeichert · **Pi ↓** von anderem Gerät
  aktualisiert · **rot** = Pi nicht erreichbar.
- Offline-Änderungen bleiben im Browser. Beim nächsten Kontakt lädt das Gerät sie hoch, wenn sie neuer sind.
- Regel: **Der neueste Stand gewinnt.** Bearbeite deshalb nicht gleichzeitig auf zwei Geräten.

## Sicherungen
- `~/pi-uni/data/*.json`: aktueller Stand
- `~/pi-uni/data/backups/`: eine Kopie pro Tag, die letzten 60 Tage
- Wiederherstellen: Backup-JSON in der App über *Backup importieren* laden.

## Neue App-Version einspielen
Die HTML-Datei in `~/pi-uni/www/` ersetzen, mit gleichem Namen. Ein Neustart ist nicht nötig, deine Daten bleiben.
Weitere HTML-Dateien dort erscheinen automatisch auf der Startseite.

## Sicherheit
Ohne Passwort, nur fürs Heimnetz gedacht. **Port 8080 nicht im Router freigeben.**
Für Zugriff von unterwegs: Tailscale auf Pi und Geräten installieren.
