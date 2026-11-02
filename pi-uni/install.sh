#!/bin/bash
# Auf dem Pi im Ordner pi-uni ausführen:  bash install.sh
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
sed -e "s#__USER__#$USER#" -e "s#__DIR__#$DIR#g" "$DIR/uni-apps.service" | sudo tee /etc/systemd/system/uni-apps.service >/dev/null
sudo systemctl daemon-reload
sudo systemctl enable --now uni-apps
sleep 1; systemctl --no-pager status uni-apps | head -5
echo; echo "Fertig. Öffne:  http://$(hostname).local:8080   oder   http://$(hostname -I | awk '{print $1}'):8080"
