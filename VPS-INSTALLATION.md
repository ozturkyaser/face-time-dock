# VPS Installation Anleitung

## Voraussetzungen
- Ein VPS mit Ubuntu 22.04 oder 24.04 (andere Linux-Distributionen funktionieren ähnlich)
- SSH-Zugang zum VPS
- Root-Rechte oder sudo-Zugang

## Schritt 1: VPS vorbereiten und Docker installieren

### Mit SSH verbinden:
```bash
ssh root@ihre-vps-ip
# oder mit Benutzer:
ssh benutzername@ihre-vps-ip
```

### System aktualisieren:
```bash
sudo apt update && sudo apt upgrade -y
```

### Docker installieren:
```bash
# Docker Repository hinzufügen
sudo apt install -y ca-certificates curl gnupg lsb-release
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker installieren
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### Docker ohne sudo verwenden (optional):
```bash
sudo usermod -aG docker $USER
# Neu einloggen damit die Änderung wirksam wird
```

## Schritt 2: Code auf VPS übertragen

### Option A: Mit Git (empfohlen)
```bash
# Auf dem VPS:
cd ~
git clone https://github.com/ihr-username/ihr-repo.git
cd ihr-repo
```

### Option B: Mit SCP (von lokalem Computer aus)
```bash
# Von Ihrem lokalen Computer:
scp -r /pfad/zum/projekt root@ihre-vps-ip:/root/zeiterfassung
```

### Option C: Mit rsync (von lokalem Computer aus)
```bash
# Von Ihrem lokalen Computer:
rsync -avz --exclude 'node_modules' /pfad/zum/projekt/ root@ihre-vps-ip:/root/zeiterfassung/
```

## Schritt 3: App auf VPS starten

```bash
# Im Projekt-Verzeichnis:
cd /root/zeiterfassung  # oder Ihr gewählter Pfad

# App bauen und starten:
docker compose up -d --build
```

### Status prüfen:
```bash
docker compose ps
docker compose logs -f
```

## Schritt 4: Firewall konfigurieren

```bash
# UFW Firewall einrichten (wenn noch nicht aktiv):
sudo apt install -y ufw
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS (für später)
sudo ufw enable
```

## Schritt 5: Zugriff testen

Öffnen Sie im Browser:
```
http://ihre-vps-ip
```

## Optional: Domain und HTTPS einrichten

### 1. Domain auf VPS zeigen lassen:
- A-Record in Ihrer Domain-Verwaltung anlegen
- Hostname: `@` oder Subdomain (z.B. `app`)
- Wert: Ihre VPS-IP-Adresse

### 2. Nginx Proxy Manager installieren (empfohlen für einfaches SSL):

Erstellen Sie eine neue Datei `docker-compose-proxy.yml`:
```yaml
version: '3.8'

services:
  nginx-proxy-manager:
    image: jc21/nginx-proxy-manager:latest
    container_name: nginx-proxy-manager
    ports:
      - "80:80"
      - "443:443"
      - "81:81"  # Admin Interface
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
    restart: unless-stopped

  zeiterfassung:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    container_name: zeiterfassung-app
    expose:
      - "80"
```

Starten:
```bash
docker compose -f docker-compose-proxy.yml up -d --build
```

Dann:
1. Öffnen Sie `http://ihre-vps-ip:81`
2. Standard-Login: `admin@example.com` / `changeme`
3. Proxy Host hinzufügen für Ihre Domain
4. SSL-Zertifikat mit Let's Encrypt einrichten

### 3. Alternative: Certbot (manuell):
```bash
# Certbot installieren
sudo apt install -y certbot python3-certbot-nginx

# SSL-Zertifikat beantragen
sudo certbot --nginx -d ihre-domain.de -d www.ihre-domain.de
```

## Nützliche Docker-Befehle

```bash
# App neu starten:
docker compose restart

# Logs anzeigen:
docker compose logs -f

# App stoppen:
docker compose down

# App updaten (nach Code-Änderungen):
git pull  # falls Git verwendet
docker compose down
docker compose up -d --build

# Container entfernen und neu bauen:
docker compose down -v
docker compose up -d --build

# Speicherplatz freigeben:
docker system prune -a
```

## Automatische Updates einrichten

### Watchtower für automatische Docker-Updates:
```bash
docker run -d \
  --name watchtower \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower \
  --cleanup --interval 300
```

## Backup einrichten

### Einfaches Backup-Script erstellen:
```bash
nano /root/backup.sh
```

Inhalt:
```bash
#!/bin/bash
BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# App stoppen
cd /root/zeiterfassung
docker compose down

# Backup erstellen
tar -czf $BACKUP_DIR/zeiterfassung_$DATE.tar.gz /root/zeiterfassung

# App starten
docker compose up -d

# Alte Backups löschen (älter als 7 Tage)
find $BACKUP_DIR -name "zeiterfassung_*.tar.gz" -mtime +7 -delete

echo "Backup completed: zeiterfassung_$DATE.tar.gz"
```

Ausführbar machen:
```bash
chmod +x /root/backup.sh
```

### Cronjob einrichten (täglich um 3 Uhr):
```bash
crontab -e
```

Hinzufügen:
```
0 3 * * * /root/backup.sh >> /var/log/backup.log 2>&1
```

## Monitoring

### Ressourcen überwachen:
```bash
# Container-Ressourcen anzeigen:
docker stats

# System-Ressourcen:
htop  # Installation: sudo apt install htop
```

## Troubleshooting

### Port bereits belegt:
```bash
# Prüfen welcher Prozess Port 80 verwendet:
sudo lsof -i :80
sudo netstat -tulpn | grep :80

# Prozess beenden oder anderen Port in docker-compose.yml verwenden:
ports:
  - "8080:80"
```

### Container startet nicht:
```bash
# Detaillierte Logs:
docker compose logs zeiterfassung

# Container-Status:
docker compose ps -a

# Neu bauen ohne Cache:
docker compose build --no-cache
docker compose up -d
```

### Wenig Speicherplatz:
```bash
# Docker-Speicher bereinigen:
docker system prune -a --volumes

# Festplattenspeicher prüfen:
df -h
```

## Sicherheits-Empfehlungen

1. **SSH absichern:**
   ```bash
   # SSH-Port ändern (optional)
   sudo nano /etc/ssh/sshd_config
   # Port 22 zu Port 2222 ändern
   sudo systemctl restart sshd
   
   # Firewall anpassen
   sudo ufw allow 2222/tcp
   sudo ufw delete allow 22/tcp
   ```

2. **Fail2ban installieren:**
   ```bash
   sudo apt install -y fail2ban
   sudo systemctl enable fail2ban
   ```

3. **Regelmäßig Updates:**
   ```bash
   # Automatische Sicherheitsupdates:
   sudo apt install -y unattended-upgrades
   sudo dpkg-reconfigure --priority=low unattended-upgrades
   ```

4. **Docker-Container als non-root User:**
   Bereits in der aktuellen Konfiguration implementiert (nginx läuft als non-root).
