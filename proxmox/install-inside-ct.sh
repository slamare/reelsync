#!/usr/bin/env bash
set -e

apt-get update
apt-get install -y curl git ca-certificates

curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

git clone https://github.com/slamare/reelsync.git /opt/reelsync
cd /opt/reelsync
npm ci --omit=dev

cat > /etc/systemd/system/reelsync.service << 'EOF'
[Unit]
Description=reelsync
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/reelsync
ExecStart=/usr/bin/node server/index.js
Environment=PORT=8080
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now reelsync
