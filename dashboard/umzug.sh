#!/bin/bash
# Einmaliger Umzug:  ~/pi-uni  →  ~/dashboard   und Dienst  uni-apps  →  dashboard
# Danach werden die Dateien dieses Updates eingespielt. data/ (alle Stände, Kalender, Backups) bleibt erhalten.
set -e
SRC="$(cd "$(dirname "$0")" && pwd)"            # entpacktes Update
ALT="$HOME/pi-uni"; NEU="$HOME/dashboard"
if [ -d "$ALT" ] && [ -d "$NEU" ]; then
  echo "Abbruch: ~/pi-uni und ~/dashboard gibt es beide. Bitte erst klären, welcher Ordner gilt."; exit 1
fi
if [ -d "$ALT" ]; then
  sudo systemctl stop uni-apps 2>/dev/null || true
  sudo systemctl disable uni-apps 2>/dev/null || true
  sudo rm -f /etc/systemd/system/uni-apps.service
  mv "$ALT" "$NEU"
  rm -f "$NEU/uni-apps.service"
  echo "Umbenannt: ~/pi-uni → ~/dashboard (Dienst uni-apps entfernt)"
fi
mkdir -p "$NEU"
cp -r "$SRC"/. "$NEU"/                          # Update einspielen (ohne data/)
rm -f "$NEU/umzug.sh"
bash "$NEU/install.sh"
