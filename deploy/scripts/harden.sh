#!/bin/bash
# Chạy bằng root trên Ubuntu 24.04.1. Idempotent: phần harden cơ bản có thể đã làm trên máy.
# Không đổi cổng SSH, không đụng agent OneDash của iNET.
#
#   sudo bash deploy/scripts/harden.sh /path/to/deploy.pub
#   sudo bash deploy/scripts/harden.sh /path/to/deploy.pub 24700
#
# Đối số 2 là cổng SSH đang lắng nghe. Mặc định 24700. Khóa là khóa công khai.
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
    echo "harden: phải chạy bằng root." >&2
    exit 1
fi

PUBKEY_FILE="${1:-}"
if [[ -z "$PUBKEY_FILE" || ! -f "$PUBKEY_FILE" ]]; then
    echo "Cách dùng: sudo bash deploy/scripts/harden.sh /đường/dẫn/deploy.pub [cổng-ssh]" >&2
    echo "Cổng mặc định là 24700." >&2
    exit 1
fi

SSH_PORT="${2:-24700}"
if ! [[ "$SSH_PORT" =~ ^[0-9]+$ ]] || (( SSH_PORT < 1 || SSH_PORT > 65535 )); then
    echo "harden: cổng SSH không hợp lệ: ${SSH_PORT}" >&2
    exit 1
fi

if ! ssh-keygen -l -f "$PUBKEY_FILE" >/dev/null; then
    echo "harden: file không phải khóa công khai SSH." >&2
    exit 1
fi

echo "harden: swap 2 GB nếu máy chưa có swap"
if [[ -z "$(swapon --show --noheadings)" ]]; then
    if [[ ! -f /swapfile ]]; then
        fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
        chmod 600 /swapfile
        mkswap /swapfile >/dev/null
    fi
    swapon /swapfile
fi
grep -qE '^/swapfile\s' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab

echo "harden: user deploy"
if ! id deploy >/dev/null 2>&1; then
    useradd --create-home --shell /bin/bash deploy
fi
usermod -aG sudo deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
touch /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
PUBKEY="$(tr -d '\r' < "$PUBKEY_FILE")"
if ! grep -qxF "$PUBKEY" /home/deploy/.ssh/authorized_keys; then
    printf '%s\n' "$PUBKEY" >> /home/deploy/.ssh/authorized_keys
fi
chown deploy:deploy /home/deploy/.ssh/authorized_keys

echo "harden: gói hệ thống"
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y unattended-upgrades ufw fail2ban docker.io docker-compose-v2 postgresql-client ca-certificates
systemctl enable --now docker
usermod -aG docker deploy

install -d -m 1777 /var/log/caddy
cat > /etc/logrotate.d/quanlihocau-proxy <<'EOF'
/var/log/caddy/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
EOF

cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
systemctl enable --now unattended-upgrades || true

python3 - <<'PY'
import json
from pathlib import Path
path = Path("/etc/docker/daemon.json")
current = {}
if path.exists() and path.read_text().strip():
    current = json.loads(path.read_text())
desired = dict(current)
desired["log-driver"] = "json-file"
desired["log-opts"] = {"max-size": "10m", "max-file": "3"}
text = json.dumps(desired, indent=2) + "\n"
if not path.exists() or path.read_text() != text:
    path.write_text(text)
    Path("/tmp/qlhc-docker-restart").write_text("1")
else:
    Path("/tmp/qlhc-docker-restart").write_text("0")
PY
if [[ "$(cat /tmp/qlhc-docker-restart)" == "1" ]]; then
    systemctl restart docker
fi
rm -f /tmp/qlhc-docker-restart

echo "harden: giữ nguyên agent OneDash của iNET, không stop hay disable unit giám sát."

echo "harden: tường lửa. Mở SSH ${SSH_PORT} trước, rồi mới bật UFW."
ufw default deny incoming
ufw default allow outgoing
ufw allow "${SSH_PORT}/tcp"
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

cat > /etc/fail2ban/jail.d/sshd.local <<EOF
[sshd]
enabled = true
port = ${SSH_PORT}
backend = systemd
maxretry = 5
findtime = 10m
bantime = 1h
EOF
systemctl enable --now fail2ban
systemctl restart fail2ban

password_auth="$(sshd -T | awk '/^passwordauthentication / { print $2; exit }')"
root_login="$(sshd -T | awk '/^permitrootlogin / { print $2; exit }')"
if [[ "$password_auth" == "no" && "$root_login" == "no" ]]; then
    echo "harden: SSH đã tắt mật khẩu và root. Bỏ qua bước chờ đăng nhập."
else
    echo "harden: mở một terminal KHÁC và đăng nhập: ssh -p ${SSH_PORT} deploy@<ip-may>"
    echo "harden: đang chờ 'Accepted publickey for deploy' trong 180 giây."
    start_epoch="$(date +%s)"
    seen=0
    for _ in $(seq 1 90); do
        if journalctl -u ssh -u sshd --since "@${start_epoch}" --no-pager | grep -q "Accepted publickey for deploy"; then
            seen=1
            break
        fi
        sleep 2
    done
    if [[ "$seen" != "1" ]]; then
        echo "harden: chưa thấy đăng nhập khóa của deploy. KHÔNG tắt mật khẩu SSH và KHÔNG tắt root." >&2
        exit 1
    fi
    install -d /etc/ssh/sshd_config.d
    cat > /etc/ssh/sshd_config.d/99-quanlihocau-harden.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
EOF
    sshd -t
    systemctl reload ssh || systemctl reload sshd
    echo "harden: đã tắt đăng nhập mật khẩu và root sau khi thấy khóa của deploy."
fi

echo "harden: xong. Đăng nhập lại bằng user deploy để nhóm docker có hiệu lực."
