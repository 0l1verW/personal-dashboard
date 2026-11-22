# Anleitung

Diese Anleitung führt von einem leeren Raspberry Pi bis zum laufenden Dashboard mit mehreren Personen, Sicherung und Updates.

**Inhalt**
1. [Was du brauchst](#1-was-du-brauchst)
2. [Installation](#2-installation)
3. [Erste Einrichtung](#3-erste-einrichtung)
4. [Geräte verbinden](#4-geräte-verbinden)
5. [Personen und Rechte](#5-personen-und-rechte)
6. [Sicherung und Wiederherstellung](#6-sicherung-und-wiederherstellung)
7. [Updates](#7-updates)
8. [Zugriff von unterwegs](#8-zugriff-von-unterwegs)
9. [Extras](#9-extras): Lebensmitteldatenbank, Kalender-Abo, Health-Import
10. [Umzug auf einen neuen Pi](#10-umzug-auf-einen-neuen-pi)
11. [Fehlersuche](#11-fehlersuche)

---

## 1. Was du brauchst

- Einen **Raspberry Pi** (ab Pi 3; für viele Personen eher Pi 4/5) mit Raspberry Pi OS. Jeder andere Linux-Rechner, der dauerhaft läuft, geht auch.
- **Python 3.9 oder neuer** (bei Raspberry Pi OS dabei). Weitere Pakete sind nicht nötig.
- Ein WLAN, in dem Pi und Geräte sind.
- Optional: ein **USB-Stick** für die Sicherungen.

Die Uhr des Pi sollte per NTP stimmen (Standard bei Raspberry Pi OS). Geht sie nach, zeigt das Dashboard einen roten Hinweis und löscht vorsichtshalber nichts.

## 2. Installation

Auf dem Pi (per Tastatur oder `ssh pi@<name-des-pi>.local`):

```bash
sudo apt install -y git            # falls noch nicht vorhanden
git clone https://github.com/0l1verW/personal-dashboard.git
cd personal-dashboard
bash dashboard/install.sh
```

`install.sh` richtet den systemd-Dienst **dashboard** ein (Port 8080), startet ihn und zeigt die Adresse an. Der Dienst startet nach jedem Neustart von selbst. Die Daten landen in `dashboard/data/`.

Ohne Git: Repo als ZIP herunterladen (GitHub → *Code* → *Download ZIP*), auf den Pi kopieren, entpacken und `bash dashboard/install.sh` ausführen.

Anderer Port: in `/etc/systemd/system/dashboard.service` die Zahl hinter `server.py` ändern, dann `sudo systemctl daemon-reload && sudo systemctl restart dashboard`.

Nützliche Befehle:

```bash
systemctl status dashboard          # läuft er?
journalctl -u dashboard -n 50       # letzte Meldungen
sudo systemctl restart dashboard    # neu starten
```

**Nur ausprobieren** (ohne Pi, auf dem eigenen Rechner): `python3 dashboard/server.py 8080` und `http://localhost:8080` öffnen. Die Daten liegen dann in `dashboard/data/` neben dem Programm.

## 3. Erste Einrichtung

1. Im Browser `http://<name-des-pi>.local:8080` öffnen (oder die IP, die `install.sh` angezeigt hat).
2. Am Anfang ist das Dashboard **offen**: Jedes Gerät im WLAN darf alles. Das ist praktisch zum Einrichten, aber nicht auf Dauer.
3. Oben rechts auf die eigene Person tippen → **Familie & Rechte verwalten** (`/verwaltung`):
   - Personen anlegen, umbenennen, Farben wählen. Eine Person hat die Rolle **Besitzer**: Sie darf alles, auch Updates und Wiederherstellung.
   - Dem **Besitzer ein Passwort** geben. Ab dann ist das Dashboard geschützt: Wer nicht angemeldet ist, sieht nur die Anmeldeseite.
   - Weiteren Personen eine **PIN** (4–8 Ziffern) geben oder sie ohne PIN lassen (dann reicht Antippen des Namens).
4. Im selben Menü → **System & Sicherung** (`/system`) das Sicherungsziel wählen (siehe Abschnitt 6).

Passwort vergessen? Auf dem Pi im Ordner `dashboard/`:

```bash
python3 server.py passwort          # setzt ein neues Besitzer-Passwort, alle seine Geräte werden abgemeldet
```

## 4. Geräte verbinden

- **iPhone/iPad:** Seite in Safari öffnen → Teilen → *Zum Home-Bildschirm*. Das Dashboard startet dann wie eine App. Achtung: Jede Home-Bildschirm-App hat auf iOS ihren eigenen Speicher und ihre eigene Anmeldung.
- **Einzelne Tools** lassen sich ebenso auf den Home-Bildschirm legen (eigenes Icon je Tool).
- **PC:** als Lesezeichen speichern.

So funktioniert der Abgleich:
- Jede Änderung geht nach etwa einer Sekunde an den Pi. Andere Geräte holen sie beim Öffnen, beim Zurückwechseln in den Tab und regelmäßig im Hintergrund.
- Ohne Verbindung arbeitest du normal weiter; beim nächsten Kontakt gleicht das Gerät ab.
- Aufgaben, Ernährung, Haushaltsbuch, Training und Einkaufsliste gleichen **pro Eintrag** ab: Zwei Geräte können gleichzeitig eintragen, ohne sich zu überschreiben. Bei Planer und Notencockpit gilt der neueste Stand – dort nicht gleichzeitig auf zwei Geräten bearbeiten.

## 5. Personen und Rechte

In `/verwaltung` (nur Besitzer und Admins):

| Einstellung | Bedeutung |
|---|---|
| Recht je Tool | **Kein** (Tool unsichtbar), **Ansehen**, **Bearbeiten**. Familien-Tools (Aufgaben, Einkaufsliste) sind ohne Eintrag bearbeitbar. |
| Admin | darf alles und die Verwaltung öffnen (braucht eine PIN). |
| Aufgaben-Sicht | **eigene** (nur was für die Person ist oder von ihr kommt) oder **alle**. |
| Daten: Gemeinsam / Eigene (leer) | Bei „Eigene“ bekommt die Person für dieses Tool eine eigene, leere Ablage auf dem Pi, z. B. ein eigenes Haushaltsbuch. Niemand sonst sieht sie, auch kein Admin. |

Weitere Regeln:
- **Private Aufgaben:** Was jemand für sich selbst einträgt, ist standardmäßig privat und nur für diese Person sichtbar.
- **Wünsche:** Trägt eine Person ohne Admin-Recht eine Aufgabe für einen Admin ein, kommt sie als Wunsch an, der angenommen oder abgelehnt wird.
- **Geteiltes Gerät:** Beim Personenwechsel verwirft das Gerät die lokale Kopie der vorherigen Person.

## 6. Sicherung und Wiederherstellung

Der Pi sichert auf drei Ebenen:

1. **Tageskopien** je Tool in `dashboard/data/backups/`. Vor der ersten Änderung des Tages entsteht eine Kopie; die letzten 60 bleiben.
2. **Komplettsicherung** (ZIP mit allen Daten) einmal täglich, standardmäßig um 03:30. Ziel ist die SD-Karte (`data/sicherungen/`) oder ein USB-Stick. Den Stick unter `/system` → *Wohin und wann* wählen; er muss unter `/media/…` oder `/mnt/…` eingehängt sein. Fehlt er, sichert der Pi auf die SD-Karte und sagt Bescheid.
3. **Download auf den PC:** `/system` → *Herunterladen*. Diese Datei selbst aufheben (z. B. in einem Cloud-Ordner), denn sie schützt auch bei Defekt oder Diebstahl des Pi. Das Dashboard erinnert nach 35 Tagen daran.

**Wiederherstellen** (nur Besitzer): `/system` → *Vorhandene Sicherungen* → *Zurückspielen*, oder *Aus Datei zurückspielen …* mit einer heruntergeladenen ZIP. Vorher sichert der Pi den aktuellen Stand. Die Geräte verwerfen danach ihre lokale Kopie und laden den wiederhergestellten Stand.

Einzelne Tools haben zusätzlich *Backup speichern / einlesen* (JSON) in ihrem Daten-Menü. Beim Einlesen wird zusammengeführt, es geht nichts verloren.

Die Sicherungen enthalten alle persönlichen Daten im Klartext. Behandle sie entsprechend.

## 7. Updates

**Über die Systemseite (empfohlen):**

1. Auf dem PC im Repo `git pull` (oder neue Version herunterladen) und ein Update-ZIP bauen:
   ```bash
   python3 scripts/make_update_zip.py                       # ganzes Programm
   python3 scripts/make_update_zip.py www/Einkauf.html      # oder nur einzelne Dateien
   ```
2. Auf dem Dashboard `/system` → *Programm aktualisieren* → *Update-Datei wählen …* → `pi-update.zip`.
3. Der Pi zeigt, welche Dateien neu oder geändert sind. Nach *Einspielen* sichert er Daten und alte Programmdateien und prüft ein neues `server.py` mit einem Selbsttest. Dann startet er sich selbst neu, falls nötig.
4. Ging etwas schief: unter *Frühere Programmstände* den vorherigen Stand zurückholen.

**Per Git direkt auf dem Pi:**

```bash
cd ~/personal-dashboard
git pull
python3 dashboard/server.py selbsttest && sudo systemctl restart dashboard
```

Die Daten in `dashboard/data/` bleiben bei beiden Wegen unberührt.

## 8. Zugriff von unterwegs

Den Port **nicht** im Router freigeben: Der Server hat kein HTTPS und ist nicht für das offene Internet gebaut. Stattdessen ein VPN nutzen:

- **Tailscale** (am einfachsten): auf Pi und Geräten installieren und anmelden. Danach ist das Dashboard unter `http://<pi-name>:8080` auch unterwegs erreichbar.
- **WireGuard** über den eigenen Router (z. B. FRITZ!Box), wenn kein Dienst eines Anbieters gewünscht ist.

## 9. Extras

### Lebensmitteldatenbank (BLS 4.0)

Die Ernährung kennt ohne Zusatz rund 90 Grundlebensmittel. Mit dem **Bundeslebensmittelschlüssel 4.0** des Max Rubner-Instituts kommen rund 7.000 Lebensmittel mit Vitaminen und Mineralstoffen dazu. Die Datenbank ist kostenlos, liegt aber nicht im Repo:

1. Excel-Datei des BLS 4.0 von [blsdb.de](https://www.blsdb.de) herunterladen.
2. Auf dem PC:
   ```bash
   pip install openpyxl
   python3 quellcode/ernaehrung/mkbls.py BLS_4_0.xlsx dashboard/www/bls.json
   ```
3. `dashboard/www/bls.json.gz` auf den Pi bringen, z. B. per `python3 scripts/make_update_zip.py www/bls.json.gz` und `/system`.

### Kalender-Abo (Aufgaben)

Aufgaben → Einstellungen → *Kalender-Abo*. Die Adresse (`…/aufgaben.ics` oder je Person) in iOS unter *Einstellungen → Apps → Kalender → Kalender-Accounts → Account hinzufügen → Andere → Kalenderabo hinzufügen* eintragen. Offene Aufgaben mit Datum erscheinen mit Erinnerung. Das funktioniert nur im Heimnetz bzw. über das VPN. Private Aufgaben erscheinen nur im eigenen Kalender.

### Aktive Kalorien von Garmin / Apple Health

Ernährung → Ziele → Sport → *Garmin / Apple Health automatisch übernehmen*. Dort steht eine Adresse und die Anleitung für einen iOS-Kurzbefehl. Der Kurzbefehl liest die aktiven Kalorien des Tages aus Apple Health und schickt sie an den Pi. Der Pi braucht dafür kein Internet und kein Garmin-Konto. Wer die Adresse kennt, kann im Heimnetz Sport-Kalorien eintragen; bei Bedarf unter dem gleichen Menü eine neue Adresse erzeugen.

### Einkaufsliste online bestellen

Die Einkaufsliste exportiert die gewählten Artikel als CSV (*Export für Online-Bestellung*). Die Datei lässt sich von einem Assistenten oder von Hand in einen Online-Warenkorb übertragen. Danach hakst du im selben Blatt nur ab, was wirklich bestellt wurde.

## 10. Umzug auf einen neuen Pi

1. Auf dem alten Pi unter `/system` eine Komplettsicherung herunterladen.
2. Auf dem neuen Pi installieren (Abschnitt 2) und das Dashboard öffnen.
3. Unter `/system` → *Aus Datei zurückspielen …* die Sicherung hochladen. Danach Passwort und PINs wie zuvor verwenden.

Wer lieber auf der Kommandozeile arbeitet: Dienst auf beiden Pis stoppen und den Ordner `dashboard/data/` kopieren (z. B. mit `rsync -a`).

## 11. Fehlersuche

| Problem | Lösung |
|---|---|
| Seite lädt nicht | `systemctl status dashboard`; läuft der Dienst? Gleiches WLAN? Statt `.local`-Name die IP versuchen (`hostname -I` auf dem Pi). |
| Unten links ist das Etikett rot (Pi nicht erreichbar) | Änderungen bleiben auf dem Gerät und werden nachgereicht, sobald der Pi wieder da ist. |
| Roter Hinweis „Die Uhr des Pi geht nach“ | `timedatectl` prüfen; NTP aktivieren (`sudo timedatectl set-ntp true`). |
| Passwort des Besitzers vergessen | `python3 server.py passwort` im Ordner `dashboard/` auf dem Pi. |
| Ein Gerät zeigt alte Daten | Seite neu laden. Hilft das nicht: die Website-Daten der Seite im Browser löschen und neu anmelden; der Pi hat den Stand. Vorher prüfen, dass auf dem Gerät nichts Ungesendetes liegt (Etikett unten links). |
| Update lässt sich nicht einspielen | Die Systemseite nennt den Grund (z. B. Dateien außerhalb von `dashboard/`, Selbsttest fehlgeschlagen). Mit `make_update_zip.py` gebaute ZIPs haben die richtige Form. |
| Ernährung findet keine BLS-Lebensmittel | `dashboard/www/bls.json.gz` fehlt, siehe Abschnitt 9. |
