#!/bin/bash

# Zeiterfassung System - Automatische VPS Installation
# Für Ubuntu 22.04 / 24.04

set -e  # Bei Fehler abbrechen

echo "=========================================="
echo "Zeiterfassung System - VPS Installation"
echo "=========================================="
echo ""

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funktionen
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Prüfen ob root
if [ "$EUID" -ne 0 ]; then 
    print_error "Bitte als root ausführen: sudo bash install-vps.sh"
    exit 1
fi

# Schritt 1: System aktualisieren
print_info "Aktualisiere System..."
apt update && apt upgrade -y
print_success "System aktualisiert"

# Schritt 2: Docker installieren
print_info "Installiere Docker..."

# Alte Docker-Versionen entfernen
apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Abhängigkeiten installieren
apt install -y ca-certificates curl gnupg lsb-release

# Docker GPG Key hinzufügen
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Docker Repository hinzufügen
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker installieren
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Docker starten
systemctl enable docker
systemctl start docker

print_success "Docker installiert"

# Schritt 3: Firewall konfigurieren
print_info "Konfiguriere Firewall..."
apt install -y ufw

# Ports öffnen
ufw --force enable
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS

print_success "Firewall konfiguriert"

# Schritt 4: Installation-Verzeichnis wählen
echo ""
read -p "Installationsverzeichnis [/opt/zeiterfassung]: " INSTALL_DIR
INSTALL_DIR=${INSTALL_DIR:-/opt/zeiterfassung}

mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

print_success "Verzeichnis erstellt: $INSTALL_DIR"

# Schritt 5: Code-Quelle wählen
echo ""
echo "Wie möchten Sie den Code bereitstellen?"
echo "1) Git Repository klonen"
echo "2) Code manuell hochladen (später)"
read -p "Auswahl [1]: " CODE_SOURCE
CODE_SOURCE=${CODE_SOURCE:-1}

if [ "$CODE_SOURCE" = "1" ]; then
    echo ""
    read -p "Git Repository URL: " GIT_URL
    
    if [ -n "$GIT_URL" ]; then
        print_info "Clone Repository..."
        
        # Git installieren falls nicht vorhanden
        if ! command -v git &> /dev/null; then
            apt install -y git
        fi
        
        # Repository klonen
        git clone $GIT_URL $INSTALL_DIR/app
        cd $INSTALL_DIR/app
        
        print_success "Repository geklont"
    else
        print_error "Keine URL angegeben"
        exit 1
    fi
else
    print_info "Bitte laden Sie Ihren Code manuell nach $INSTALL_DIR/app hoch"
    mkdir -p $INSTALL_DIR/app
    echo ""
    echo "Verwenden Sie z.B.:"
    echo "  scp -r /lokaler/pfad/* root@ihre-ip:$INSTALL_DIR/app/"
    echo ""
    read -p "Drücken Sie Enter wenn der Code hochgeladen wurde..."
    
    if [ ! -f "$INSTALL_DIR/app/docker-compose.yml" ]; then
        print_error "docker-compose.yml nicht gefunden in $INSTALL_DIR/app"
        exit 1
    fi
fi

# Schritt 6: Port konfigurieren
echo ""
read -p "Auf welchem Port soll die App laufen? [80]: " APP_PORT
APP_PORT=${APP_PORT:-80}

# Schritt 7: Docker Container starten
print_info "Starte Docker Container..."
cd $INSTALL_DIR/app

# docker-compose.yml anpassen falls anderer Port
if [ "$APP_PORT" != "80" ]; then
    sed -i "s/\"80:80\"/\"$APP_PORT:80\"/g" docker-compose.yml
    print_info "Port auf $APP_PORT geändert"
fi

# Container bauen und starten
docker compose up -d --build

print_success "Container gestartet"

# Schritt 8: Status prüfen
sleep 5
print_info "Prüfe Container-Status..."
docker compose ps

# Schritt 9: Systemd Service erstellen (optional)
echo ""
read -p "Systemd Service für automatischen Start erstellen? [j/N]: " CREATE_SERVICE
if [[ "$CREATE_SERVICE" =~ ^[Jj]$ ]]; then
    cat > /etc/systemd/system/zeiterfassung.service <<EOF
[Unit]
Description=Zeiterfassung Docker Container
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$INSTALL_DIR/app
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable zeiterfassung.service
    print_success "Systemd Service erstellt"
fi

# Schritt 10: Backup-Script erstellen
echo ""
read -p "Backup-Script erstellen? [j/N]: " CREATE_BACKUP
if [[ "$CREATE_BACKUP" =~ ^[Jj]$ ]]; then
    mkdir -p /root/backups
    
    cat > /root/backup-zeiterfassung.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/root/backups"
APP_DIR="$INSTALL_DIR/app"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

echo "Starting backup..."
cd $APP_DIR
docker compose down

tar -czf $BACKUP_DIR/zeiterfassung_$DATE.tar.gz $APP_DIR

docker compose up -d

# Alte Backups löschen (älter als 7 Tage)
find $BACKUP_DIR -name "zeiterfassung_*.tar.gz" -mtime +7 -delete

echo "Backup completed: zeiterfassung_$DATE.tar.gz"
EOF

    # INSTALL_DIR in Script einfügen
    sed -i "s|\$INSTALL_DIR|$INSTALL_DIR|g" /root/backup-zeiterfassung.sh
    chmod +x /root/backup-zeiterfassung.sh
    
    print_success "Backup-Script erstellt: /root/backup-zeiterfassung.sh"
    
    # Cronjob anbieten
    read -p "Tägliches automatisches Backup einrichten (3 Uhr nachts)? [j/N]: " CREATE_CRON
    if [[ "$CREATE_CRON" =~ ^[Jj]$ ]]; then
        (crontab -l 2>/dev/null; echo "0 3 * * * /root/backup-zeiterfassung.sh >> /var/log/zeiterfassung-backup.log 2>&1") | crontab -
        print_success "Cronjob erstellt"
    fi
fi

# Abschluss
echo ""
echo "=========================================="
echo -e "${GREEN}Installation abgeschlossen!${NC}"
echo "=========================================="
echo ""
echo "Die App läuft jetzt auf:"
echo "  http://$(curl -s ifconfig.me):$APP_PORT"
echo ""
echo "Nützliche Befehle:"
echo "  cd $INSTALL_DIR/app"
echo "  docker compose ps              # Status anzeigen"
echo "  docker compose logs -f         # Logs anzeigen"
echo "  docker compose restart         # Neu starten"
echo "  docker compose down            # Stoppen"
echo "  docker compose up -d --build   # Neu bauen"
echo ""
echo "Weitere Informationen:"
echo "  - VPS-INSTALLATION.md"
echo "  - DEPLOYMENT.md"
echo ""

# Server-IP anzeigen
SERVER_IP=$(curl -s ifconfig.me)
echo -e "${GREEN}Ihre Server-IP: $SERVER_IP${NC}"
echo ""
