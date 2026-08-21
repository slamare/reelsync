#!/usr/bin/env bash
set -e

apt-get update
apt-get install -y curl git ca-certificates

curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

git clone https://github.com/slamare/watchtogether.git /opt/watchtogether
cd /opt/watchtogether
npm ci --omit=dev

cat > /etc/systemd/system/watchtogether.service << 'EOF'
[Unit]
Description=watchtogether
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/watchtogether
ExecStart=/usr/bin/node server/index.js
Environment=PORT=8080
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now watchtogether
