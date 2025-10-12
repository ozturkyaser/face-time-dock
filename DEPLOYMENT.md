# Docker Deployment Anleitung

## Voraussetzungen
- Docker installiert
- Docker Compose installiert (optional, aber empfohlen)

## Deployment Schritte

### Option 1: Mit Docker Compose (empfohlen)

1. **App bauen und starten:**
   ```bash
   docker-compose up -d --build
   ```

2. **App ist nun erreichbar unter:**
   ```
   http://localhost
   ```

3. **Logs anzeigen:**
   ```bash
   docker-compose logs -f
   ```

4. **App stoppen:**
   ```bash
   docker-compose down
   ```

### Option 2: Nur mit Docker

1. **Image bauen:**
   ```bash
   docker build -t zeiterfassung-app .
   ```

2. **Container starten:**
   ```bash
   docker run -d -p 80:80 --name zeiterfassung zeiterfassung-app
   ```

3. **Container stoppen:**
   ```bash
   docker stop zeiterfassung
   docker rm zeiterfassung
   ```

## Produktions-Deployment

### Mit benutzerdefinierten Port:
```bash
docker run -d -p 8080:80 --name zeiterfassung zeiterfassung-app
```

### Mit Umgebungsvariablen:
Die Supabase-Konfiguration ist bereits in der `.env` Datei enthalten und wird während des Build-Prozesses eingebunden.

## Wichtige Hinweise

- Die App verwendet Nginx als Webserver
- Alle Routen werden korrekt zu React Router weitergeleitet
- Statische Assets werden für 1 Jahr gecacht
- Gzip-Kompression ist aktiviert
- Security Headers sind konfiguriert

## Troubleshooting

### Port bereits belegt:
```bash
# Anderen Port verwenden
docker run -d -p 3000:80 --name zeiterfassung zeiterfassung-app
```

### Container-Logs prüfen:
```bash
docker logs zeiterfassung
```

### Container neu starten:
```bash
docker restart zeiterfassung
```
