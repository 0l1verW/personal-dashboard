# Sicherheit

## Einsatzbereich

Das Personal Dashboard ist für ein **privates Heimnetz** gebaut:

- Der Server spricht nur **HTTP**, kein HTTPS. Passwörter, PINs und Daten gehen im WLAN unverschlüsselt über die Leitung.
- Port 8080 **nicht** im Router freigeben. Für Zugriff von unterwegs ein VPN nutzen (Tailscale, WireGuard), siehe [Anleitung](docs/ANLEITUNG.md#8-zugriff-von-unterwegs).
- Bis der Besitzer ein Passwort setzt, darf jedes Gerät im Netz alles („offener Modus“).
- Kalender-Abos (`*.ics`) und die Import-Adresse für Apple Health sind im Heimnetz ohne Anmeldung erreichbar, wer die Adresse kennt.
- Sicherungen (`data/sicherungen/`, heruntergeladene ZIPs) enthalten alle Daten im Klartext.

Was der Server schützt: Passwörter und PINs liegen nur gesalzen und gehasht in `data/auth.json` (Dateirechte 600); falsche Eingaben werden gebremst. Rechte prüft der Server bei jedem Zugriff selbst, nicht nur die Oberfläche. Private Aufgaben und eigene Daten einer Person liefert er niemand anderem aus. Update-ZIPs werden vor dem Einspielen geprüft.

## Eine Lücke melden

Bitte **kein öffentliches Issue** öffnen. Stattdessen über GitHub → *Security* → *Report a vulnerability* (private Meldung) mit kurzer Beschreibung, betroffener Datei und, wenn möglich, Schritten zum Nachstellen. Es ist ein privates Projekt ohne feste Reaktionszeit; Meldungen werden aber ernst genommen.
