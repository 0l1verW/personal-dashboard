#!/bin/bash
# Auf dem Pi im Ordner ~/dashboard ausführen:  bash install.sh
# Richtet den Dienst „dashboard“ ein (Port 8080). Die Daten in data/ bleiben unberührt.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
sed -e "s#__USER__#$USER#" -e "s#__DIR__#$DIR#g" "$DIR/dashboard.service" | sudo tee /etc/systemd/system/dashboard.service >/dev/null
sudo systemctl daemon-reload
sudo systemctl enable dashboard >/dev/null 2>&1
sudo systemctl restart dashboard
sleep 1; systemctl --no-pager status dashboard | head -5 || true
echo; echo "Fertig. Öffne:  http://$(hostname).local:8080   oder   http://$(hostname -I | awk '{print $1}'):8080"
