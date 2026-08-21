#!/usr/bin/env bash
set -e

CTID=$(pvesh get /cluster/nextid)
HOSTNAME="reelsync"
STORAGE="local-lvm"
TEMPLATE_STORAGE="local"
TEMPLATE="debian-12-standard_12.7-1_amd64.tar.zst"
DISK_SIZE="4"
RAM="2048"
CORES="2"
BRIDGE="vmbr0"

if ! pveam list "$TEMPLATE_STORAGE" | grep -q "$TEMPLATE"; then
  pveam update
  pveam download "$TEMPLATE_STORAGE" "$TEMPLATE"
fi

pct create "$CTID" "$TEMPLATE_STORAGE:vztmpl/$TEMPLATE" \
  --hostname "$HOSTNAME" \
  --cores "$CORES" \
  --memory "$RAM" \
  --swap 512 \
  --rootfs "$STORAGE:$DISK_SIZE" \
  --net0 "name=eth0,bridge=$BRIDGE,ip=dhcp" \
  --features nesting=1 \
  --unprivileged 1 \
  --onboot 1

pct start "$CTID"
sleep 5

pct exec "$CTID" -- bash -c "$(curl -fsSL https://raw.githubusercontent.com/slamare/reelsync/main/proxmox/install-inside-ct.sh)"

IP=$(pct exec "$CTID" -- hostname -I | awk '{print $1}')
echo "CT $CTID запущен, IP: $IP, порт 8080"
