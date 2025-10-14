# Zeiterfassungssystem - Vollständige Anleitung

## Inhaltsverzeichnis
1. [Übersicht](#übersicht)
2. [System-Zugänge](#system-zugänge)
3. [Terminal-Nutzung](#terminal-nutzung)
4. [Mitarbeiter-Portal](#mitarbeiter-portal)
5. [Admin-Bereich](#admin-bereich)
6. [Geofencing](#geofencing)
7. [Gesichtserkennung](#gesichtserkennung)
8. [Troubleshooting](#troubleshooting)

---

## Übersicht

Das Zeiterfassungssystem ist eine umfassende Lösung für:
- Zeiterfassung mit Check-in/Check-out
- Urlaubsverwaltung
- Gehaltsvorschuss-Verwaltung
- Mitarbeiterverwaltung
- Standortverwaltung mit Geofencing
- Gesichtserkennung und PIN-Login

---

## System-Zugänge

### 1. Terminal (für Mitarbeiter zum Ein-/Ausstempeln)
**URL:** `/terminal`

**Verwendung:**
- Für Zeiterfassung durch Mitarbeiter
- Keine Benutzerregistrierung notwendig
- Terminal muss von Admin konfiguriert werden

### 2. Mitarbeiter-Portal
**URL:** `/employee`

**Verwendung:**
- Persönlicher Bereich für jeden Mitarbeiter
- Login mit Mitarbeiter-Nummer und PIN
- Zugriff auf eigene Daten

### 3. Admin-Bereich
**URL:** `/admin`

**Verwendung:**
- Vollständige Systemverwaltung
- Erfordert Admin-Login (Supabase Auth)

---

## Terminal-Nutzung

### Terminal-Login (Einmalig)

1. Terminal öffnen (`/terminal`)
2. Terminal-Zugangsdaten eingeben:
   - **Benutzername:** Von Admin vergeben
   - **Passwort:** Von Admin vergeben
3. Nach erfolgreichem Login bleibt Terminal aktiv

### Zeiterfassung - Zwei Methoden

#### Methode 1: PIN-Login

1. **"PIN-Login"** auswählen
2. **Mitarbeiter aus Liste wählen**
   - Dropdown zeigt alle aktiven Mitarbeiter am Standort
3. **PIN eingeben** (4-stellig)
4. **"Anmelden"** klicken
5. System erfasst automatisch:
   - Check-in (wenn noch nicht eingestempelt)
   - Check-out (wenn bereits eingestempelt)

#### Methode 2: Gesichtserkennung

1. **"Gesichtserkennung"** auswählen
2. **Kamera-Zugriff erlauben** (Browser-Popup)
3. **Gesicht in den Kamera-Bereich halten**
4. **"Check-in" oder "Check-out"** klicken
5. System:
   - Erfasst Gesicht über Kamera
   - Vergleicht mit registrierten Gesichtsprofilen
   - Erfasst Zeit automatisch bei Übereinstimmung

### Geofencing-Prüfung

**Wichtig:** Das System prüft automatisch den Standort bei jeder Zeiterfassung!

- Mitarbeiter müssen sich innerhalb des definierten Radius befinden
- Bei außerhalb: Fehlermeldung "Sie befinden sich außerhalb des zulässigen Bereichs"
- Browser fragt nach Standort-Berechtigung (muss erlaubt werden)

### Urlaubsantrag vom Terminal

1. **"Urlaub beantragen"** klicken
2. Formular ausfüllen:
   - Mitarbeiter auswählen
   - Urlaubsart wählen (Urlaub/Krankmeldung)
   - Startdatum
   - Enddatum
   - Optional: Notizen
3. **Unterschrift leisten** (Touchscreen/Maus)
4. **"Antrag einreichen"** klicken
5. Bestätigung: "Urlaubsantrag erfolgreich eingereicht"

### Gesicht registrieren

1. **"Gesicht registrieren"** klicken
2. **Mitarbeiter-Nummer eingeben**
3. **Kamera-Zugriff erlauben**
4. **Gesicht zentrieren und gut beleuchten**
5. **"Gesicht erfassen"** klicken
6. System speichert Gesichtsprofil für zukünftige Erkennungen

---

## Mitarbeiter-Portal

### Login

1. Zur URL `/employee` navigieren
2. Zugangsdaten eingeben:
   - **Mitarbeiter-Nummer:** (z.B. "MA001")
   - **PIN:** 4-stelliger PIN
3. **"Anmelden"** klicken

### Dashboard-Übersicht

Nach Login sieht Mitarbeiter:

#### Persönliche Informationen
- Name
- Mitarbeiter-Nummer
- Abteilung
- Stundenlohn
- Beschäftigungsstatus

#### Zeiteinträge
- Liste aller eigenen Check-ins/Check-outs
- Anzeige von:
  - Datum
  - Check-in Zeit
  - Check-out Zeit
  - Pausendauer
  - Gesamt-Arbeitsstunden
  - Notizen

#### Urlaubsverwaltung

**Urlaubsantrag stellen:**
1. Formular ausfüllen:
   - Urlaubsart (Urlaub/Krankmeldung)
   - Startdatum
   - Enddatum
   - Optional: Notizen
2. **Unterschrift leisten**
3. **"Antrag einreichen"**

**Urlaubsübersicht:**
- Status: Ausstehend/Genehmigt/Abgelehnt
- Zeitraum
- Anzahl Tage
- Verbleibende Urlaubstage
- PDF herunterladen (nach Genehmigung)

#### Gehaltsvorschüsse

**Vorschuss beantragen:**
1. **Betrag eingeben**
2. **Optional: Notizen hinzufügen**
3. **Unterschrift leisten**
4. **"Antrag einreichen"**

**Vorschuss-Übersicht:**
- Status: Ausstehend/Genehmigt/Abgelehnt/Ausgezahlt
- Betrag
- Antragsdatum
- Genehmigungsdatum
- PDF herunterladen (nach Genehmigung)

---

## Admin-Bereich

### Login

1. Zur URL `/admin` navigieren
2. Admin-Zugangsdaten eingeben (Supabase Auth)
3. **"Anmelden"** klicken

### 1. Mitarbeiterverwaltung

#### Mitarbeiter anlegen

1. Tab **"Mitarbeiter"** öffnen
2. **"Mitarbeiter hinzufügen"** klicken
3. Formular ausfüllen:
   - **Vorname** (Pflicht)
   - **Nachname** (Pflicht)
   - **Mitarbeiter-Nummer** (Pflicht, eindeutig, z.B. "MA001")
   - **E-Mail** (Pflicht)
   - **Telefon**
   - **Position**
   - **Abteilung**
   - **Stundenlohn** (in €)
   - **Gehalt** (Monatsgehalt)
   - **Beschäftigungsbeginn** (Pflicht)
   - **Urlaubstage gesamt** (Standard: 30)
   - **Erwartete tägliche Arbeitsstunden** (Standard: 8)
   - **Standard-Pausendauer** (in Minuten, Standard: 45)
   - **Standort** (auswählen)
4. **PIN festlegen** (4-stellig, für Login)
5. **"Mitarbeiter erstellen"** klicken

#### Mitarbeiter bearbeiten

1. Mitarbeiter in Liste finden
2. **"Bearbeiten"** klicken
3. Daten ändern
4. **"Änderungen speichern"**

#### Mitarbeiter deaktivieren

1. Mitarbeiter auswählen
2. **Status auf "Inaktiv"** setzen
3. Mitarbeiter kann sich nicht mehr anmelden

### 2. Standortverwaltung

#### Standort erstellen

1. Tab **"Standorte"** öffnen
2. **"Standort hinzufügen"** klicken
3. Formular ausfüllen:
   - **Name** (z.B. "Hauptbüro Berlin")
   - **Adresse**
   - **Firmenname**
   - **Firmen-E-Mail**
   - **Firmen-Telefon**
   - **Firmen-Adresse**
   - **Firmen-Website**
   - **Geofencing aktivieren:**
     - Breitengrad (z.B. 52.520008)
     - Längengrad (z.B. 13.404954)
     - Radius in Metern (z.B. 100)
4. **Firmenlogo hochladen** (optional)
5. **"Standort erstellen"**

**Geofencing-Koordinaten finden:**
- Google Maps öffnen
- Rechtsklick auf gewünschten Punkt
- Koordinaten kopieren (erste Zahl = Breitengrad, zweite = Längengrad)

### 3. Terminal-Verwaltung

#### Terminal erstellen

1. Tab **"Terminals"** öffnen
2. **"Terminal hinzufügen"** klicken
3. Daten eingeben:
   - **Terminal-Name** (z.B. "Empfang Terminal 1")
   - **Benutzername** (für Terminal-Login)
   - **Passwort** (für Terminal-Login)
   - **Standort** (auswählen)
   - **Status:** Aktiv/Inaktiv
4. **"Terminal erstellen"**

**Terminal-Zugangsdaten notieren für Terminal-Login!**

### 4. Zeiteinträge verwalten

#### Zeiteinträge anzeigen

1. Tab **"Zeiteinträge"** öffnen
2. Filteroptionen:
   - Nach Mitarbeiter filtern
   - Nach Datum filtern
   - Nach Standort filtern

#### Manuelle Zeiterfassung

1. **"Manuelle Zeiterfassung"** klicken
2. Formular ausfüllen:
   - Mitarbeiter auswählen
   - Check-in Datum & Uhrzeit
   - Check-out Datum & Uhrzeit
   - Pausendauer (Minuten)
   - Notizen
3. **"Zeiteintrag erstellen"**

**Verwendung:** Für nachträgliche Korrekturen oder vergessene Stempelungen

#### Zeiteinträge exportieren

1. Gewünschte Zeiteinträge filtern
2. **"Exportieren"** klicken
3. CSV-Datei wird heruntergeladen

### 5. Urlaubsverwaltung

#### Urlaubsanträge prüfen

1. Tab **"Urlaub"** öffnen
2. Liste zeigt alle Anträge mit Status:
   - 🟡 Ausstehend
   - 🟢 Genehmigt
   - 🔴 Abgelehnt

#### Urlaubsantrag genehmigen

1. Antrag auswählen
2. **"Details"** klicken
3. Antrag prüfen:
   - Mitarbeiter
   - Zeitraum
   - Anzahl Tage
   - Verbleibende Urlaubstage
   - Mitarbeiter-Unterschrift
4. Optional: **Alternative Daten vorschlagen**
   - Alternatives Startdatum
   - Alternatives Enddatum
   - Alternative Notizen
5. **Admin-Unterschrift leisten**
6. **"Genehmigen"** klicken

#### Urlaubsantrag ablehnen

1. Antrag auswählen
2. **"Ablehnen"** klicken
3. Optional: Grund angeben
4. Mitarbeiter sieht Status "Abgelehnt"

#### Urlaub vom Admin erstellen

1. **"Urlaub erstellen"** klicken
2. Formular ausfüllen:
   - Mitarbeiter auswählen
   - Urlaubsart
   - Startdatum
   - Enddatum
   - Notizen
3. **"Urlaub erstellen"**

**Verwendung:** Für direkte Urlaubseintragungen ohne Antragsprozess

### 6. Gehaltsvorschuss-Verwaltung

#### Vorschuss-Anträge prüfen

1. Tab **"Vorschüsse"** öffnen
2. Liste zeigt alle Anträge

#### Vorschuss genehmigen

1. Antrag auswählen
2. **"Genehmigen"** klicken
3. Admin-Unterschrift leisten
4. **"Genehmigung bestätigen"**
5. Status ändert sich zu "Genehmigt"

#### Vorschuss als ausgezahlt markieren

1. Genehmigten Antrag auswählen
2. **"Als ausgezahlt markieren"** klicken
3. Status ändert sich zu "Ausgezahlt"

#### Vorschuss ablehnen

1. Antrag auswählen
2. **"Ablehnen"** klicken
3. Optional: Grund angeben

### 7. Gesichtsprofile verwalten

#### Gesichtsprofil erneut registrieren

1. Tab **"Gesichtsprofile"** öffnen
2. Mitarbeiter auswählen
3. **"Erneut registrieren"** klicken
4. Kamera-Zugriff erlauben
5. Mitarbeiter-Gesicht erfassen
6. **"Gesicht erfassen"**

**Verwendung:** Wenn Gesichtserkennung nicht funktioniert oder Mitarbeiter-Aussehen sich stark geändert hat

#### Gesichtsprofil löschen

1. Mitarbeiter auswählen
2. **"Profil löschen"** klicken
3. Bestätigen

### 8. Benutzerverwaltung

#### Admin-Benutzer erstellen

1. Tab **"Benutzer"** öffnen
2. **"Benutzer hinzufügen"** klicken
3. Daten eingeben:
   - E-Mail
   - Passwort
   - Name
   - Rolle: Admin
4. **"Benutzer erstellen"**

#### Rollen zuweisen

- **Admin:** Vollzugriff auf alle Funktionen
- Weitere Rollen können in der Datenbank konfiguriert werden

---

## Geofencing

### Was ist Geofencing?

Geofencing stellt sicher, dass Mitarbeiter nur am festgelegten Standort ein-/ausstempeln können.

### Geofencing einrichten

1. **Admin-Bereich** → **"Standorte"**
2. Standort bearbeiten
3. **Geofencing aktivieren:**
   - Breitengrad eingeben
   - Längengrad eingeben
   - Radius festlegen (in Metern)
4. **"Speichern"**

### Wie funktioniert es?

1. Mitarbeiter versucht Check-in/out
2. System fragt Browser nach GPS-Position
3. System berechnet Entfernung zum Standort
4. **Innerhalb Radius:** Zeiterfassung erfolgreich
5. **Außerhalb Radius:** Fehlermeldung

### Radius-Empfehlungen

- **Kleines Büro:** 50-100 Meter
- **Großes Gebäude:** 150-300 Meter
- **Baustelle/Außenbereich:** 500-1000 Meter

### Geofencing deaktivieren

1. Standort bearbeiten
2. Breitengrad und Längengrad **leer lassen**
3. Speichern → Geofencing ist deaktiviert

---

## Gesichtserkennung

### Technologie

Das System verwendet **KI-basierte Gesichtserkennung** über Lovable AI (Gemini Vision):
- Vergleicht Live-Kamerabild mit gespeicherten Gesichtsprofilen
- Mindestens 90% Übereinstimmung erforderlich
- Berücksichtigt verschiedene Winkel, Beleuchtung, Accessoires

### Gesicht registrieren

#### Vom Terminal:
1. **"Gesicht registrieren"** klicken
2. Mitarbeiter-Nummer eingeben
3. Gesicht vor Kamera halten
4. **"Gesicht erfassen"**

#### Vom Admin-Bereich:
1. **"Gesichtsprofile"** → **"Erneut registrieren"**
2. Mitarbeiter auswählen
3. Gesicht vor Kamera halten
4. **"Gesicht erfassen"**

### Best Practices für Gesichtserkennung

✅ **Empfohlen:**
- Gute Beleuchtung (Tageslicht oder helle Lampen)
- Gesicht direkt zur Kamera
- Neutraler Gesichtsausdruck
- Keine Sonnenbrille oder Maske
- Saubere Kameralinse

❌ **Vermeiden:**
- Gegenlicht (Fenster im Rücken)
- Extrem dunkle Räume
- Seitliche Winkel
- Verdecktes Gesicht (Schal, Maske, Sonnenbrille)

### Fehlerbehebung Gesichtserkennung

**Problem:** "Kein Gesicht erkannt"
- ✔ Gesicht vollständig im Kamerabild
- ✔ Bessere Beleuchtung
- ✔ Näher an Kamera
- ✔ Gesicht nicht verdeckt

**Problem:** "Keine Übereinstimmung gefunden"
- ✔ Gesichtsprofil erneut registrieren
- ✔ Andere Beleuchtung beim Registrieren
- ✔ Accessoires entfernen (Brille, Mütze)

**Problem:** "Kamera-Zugriff verweigert"
- ✔ Browser-Einstellungen → Kamera-Berechtigung erlauben
- ✔ Browser neu laden
- ✔ HTTPS verwenden (erforderlich für Kamera-Zugriff)

---

## PDF-Dokumente

### Urlaubs-PDF

**Inhalt:**
- Mitarbeiter-Daten
- Urlaubszeitraum
- Anzahl Urlaubstage
- Verbleibende Urlaubstage
- Urlaubsart (Urlaub/Krankmeldung)
- Mitarbeiter-Unterschrift
- Admin-Unterschrift (wenn genehmigt)
- Firmenlogo und -daten
- Alternative Daten (falls vorgeschlagen)

**Download:**
- Mitarbeiter-Portal: Nach Genehmigung
- Admin-Bereich: Jederzeit
- Terminal: Nach Antragstellung (Bestätigung)

### Gehaltsvorschuss-PDF

**Inhalt:**
- Mitarbeiter-Daten
- Vorschuss-Betrag
- Antragsdatum
- Genehmigungsdatum
- Status
- Mitarbeiter-Unterschrift
- Admin-Unterschrift (wenn genehmigt)
- Firmenlogo und -daten

**Download:**
- Mitarbeiter-Portal: Nach Genehmigung
- Admin-Bereich: Jederzeit

---

## Troubleshooting

### Terminal-Probleme

**Terminal akzeptiert Zugangsdaten nicht:**
- ✔ Benutzername und Passwort im Admin-Bereich prüfen
- ✔ Terminal-Status muss "Aktiv" sein
- ✔ Groß-/Kleinschreibung beachten

**Mitarbeiter erscheint nicht in Terminal-Liste:**
- ✔ Mitarbeiter muss "Aktiv" sein
- ✔ Mitarbeiter muss demselben Standort zugeordnet sein wie Terminal
- ✔ PIN muss gesetzt sein

**Geofencing funktioniert nicht:**
- ✔ Browser-Standortberechtigung erlauben
- ✔ GPS-Signal vorhanden (funktioniert nicht in Gebäuden ohne GPS)
- ✔ Koordinaten im Admin-Bereich korrekt eingegeben
- ✔ Radius realistisch (nicht zu klein)

### PIN-Login Probleme

**PIN wird nicht akzeptiert:**
- ✔ PIN muss im Admin-Bereich gesetzt sein
- ✔ 4-stellige Zahl eingeben
- ✔ Mitarbeiter muss "Aktiv" sein
- ✔ Admin-Bereich → Mitarbeiter bearbeiten → Neuen PIN setzen

### Gesichtserkennung-Probleme

**Gesicht wird nicht erkannt:**
- ✔ Gesichtsprofil registriert?
- ✔ Gute Beleuchtung
- ✔ Gesicht nicht verdeckt
- ✔ Kamera-Qualität ausreichend
- ✔ Gesichtsprofil erneut registrieren

**Kamera startet nicht:**
- ✔ Browser-Berechtigungen prüfen
- ✔ Andere Anwendung verwendet Kamera?
- ✔ Browser neu starten
- ✔ HTTPS verwenden (Chrome/Firefox erfordern dies)

### Urlaubs-Probleme

**Urlaubstage falsch:**
- ✔ Admin-Bereich → Mitarbeiter bearbeiten
- ✔ "Urlaubstage gesamt" und "Urlaubstage verwendet" prüfen
- ✔ System berechnet: Verbleibend = Gesamt - Verwendet

**PDF wird nicht generiert:**
- ✔ Browser-Popup-Blocker deaktivieren
- ✔ JavaScript aktiviert
- ✔ Seite neu laden

### Admin-Login Probleme

**Login funktioniert nicht:**
- ✔ Korrekte E-Mail und Passwort
- ✔ Benutzer muss Admin-Rolle haben
- ✔ E-Mail bestätigt (je nach Supabase-Konfiguration)

---

## Systemanforderungen

### Browser-Anforderungen

**Unterstützte Browser:**
- ✅ Google Chrome (empfohlen)
- ✅ Mozilla Firefox
- ✅ Microsoft Edge
- ✅ Safari (macOS/iOS)

**Mindestversionen:**
- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+

**Erforderliche Browser-Features:**
- JavaScript aktiviert
- Cookies aktiviert
- Kamera-Zugriff (für Gesichtserkennung)
- Standort-Zugriff (für Geofencing)
- WebRTC (für Kamera)

### Hardware-Anforderungen

**Terminal/Desktop:**
- ⚙️ Prozessor: Dual-Core 2 GHz+
- 💾 RAM: 4 GB+
- 📹 Webcam: 720p+ (für Gesichtserkennung)
- 🌐 Internet: Mindestens 5 Mbit/s

**Mobile Geräte:**
- 📱 iOS 14+ oder Android 9+
- 📹 Frontkamera (für Gesichtserkennung)
- 📍 GPS-Sensor (für Geofencing)

---

## Datenschutz & Sicherheit

### Datenspeicherung

- ✔ Alle Daten werden verschlüsselt in Supabase gespeichert
- ✔ Gesichtsbilder werden sicher in Supabase Storage gespeichert
- ✔ PINs werden gehasht gespeichert (nicht im Klartext)
- ✔ Standortdaten werden nur bei Zeiterfassung temporär verwendet

### Zugriffsrechte

**Terminal:**
- Kann nur Zeiterfassung durchführen
- Kein Zugriff auf andere Mitarbeiter-Daten
- Kein Zugriff auf Admin-Funktionen

**Mitarbeiter-Portal:**
- Zugriff nur auf eigene Daten
- Kann eigene Anträge stellen
- Kann eigene Zeiteinträge sehen

**Admin-Bereich:**
- Vollzugriff auf alle Funktionen
- Kann alle Daten einsehen und ändern
- Verantwortlich für Datenpflege

### DSGVO-Hinweise

- ✔ Mitarbeiter müssen über Datenverarbeitung informiert werden
- ✔ Einwilligung für Gesichtserkennung einholen
- ✔ Einwilligung für Standorterfassung einholen
- ✔ Löschung von Mitarbeiter-Daten nach Beschäftigungsende möglich
- ✔ Auskunftsrecht: Mitarbeiter können eigene Daten einsehen

---

## Support & Wartung

### Regelmäßige Aufgaben

**Täglich:**
- ✔ Zeiteinträge ohne Check-out prüfen (automatisches Check-out bei Mitternacht)

**Wöchentlich:**
- ✔ Urlaubsanträge bearbeiten
- ✔ Gehaltsvorschuss-Anträge bearbeiten
- ✔ Zeiteinträge auf Auffälligkeiten prüfen

**Monatlich:**
- ✔ Zeiteinträge exportieren (für Lohnabrechnung)
- ✔ Urlaubstage aktualisieren (Jahreswechsel)
- ✔ Inaktive Mitarbeiter archivieren

**Jährlich:**
- ✔ Urlaubstage zurücksetzen (neues Jahr)
- ✔ Mitarbeiter-Daten aktualisieren
- ✔ Gesichtsprofile bei Bedarf erneuern

### Daten-Export

**Zeiteinträge exportieren:**
1. Admin-Bereich → Zeiteinträge
2. Zeitraum auswählen
3. "Exportieren" → CSV-Datei

**CSV-Format:**
```
Mitarbeiter-Nr, Name, Check-in, Check-out, Pause (Min), Stunden, Datum
MA001, Max Mustermann, 08:00, 17:00, 45, 8.25, 2025-01-15
```

### Backup

**Wichtig:** Regelmäßige Backups werden empfohlen!

**Backup-Umfang:**
- Mitarbeiter-Daten
- Zeiteinträge
- Urlaubs-Anträge
- Gehaltsvorschuss-Daten
- Gesichtsprofile (Bilder)

**Backup über Supabase:**
- Supabase Dashboard → Projekt → Backups
- Automatische tägliche Backups (je nach Plan)

---

## Häufig gestellte Fragen (FAQ)

### Allgemein

**Q: Kann ein Mitarbeiter mehrmals am Tag ein-/ausstempeln?**
A: Ja, das System unterstützt multiple Check-ins pro Tag. Jeder Check-in/out wird als separater Zeiteintrag gespeichert.

**Q: Was passiert, wenn ein Mitarbeiter vergisst auszustempeln?**
A: Um Mitternacht erfolgt automatisch ein Check-out durch die Supabase Edge Function "auto-checkout". Admin kann nachträglich manuell korrigieren.

**Q: Können Mitarbeiter ihre PIN ändern?**
A: Nein, nur Admins können PINs ändern (aus Sicherheitsgründen).

**Q: Kann ich mehrere Standorte verwalten?**
A: Ja, das System unterstützt unbegrenzt viele Standorte mit jeweils eigenen Terminals und Mitarbeitern.

### Zeiterfassung

**Q: Wie funktioniert die Pausenberechnung?**
A: Die Standard-Pausendauer wird automatisch bei Check-out hinzugefügt. Admin kann diese nachträglich anpassen.

**Q: Kann ich vergangene Zeiteinträge korrigieren?**
A: Ja, im Admin-Bereich unter "Zeiteinträge" können alle Einträge bearbeitet werden.

**Q: Wie werden Überstunden berechnet?**
A: Das System zeigt die Gesamtstunden an. Überstunden-Berechnung basiert auf "Erwartete tägliche Arbeitsstunden" (einstellbar pro Mitarbeiter).

### Urlaub

**Q: Werden Wochenenden als Urlaubstage gezählt?**
A: Ja, das System zählt alle Tage zwischen Start- und Enddatum (inklusive Wochenenden).

**Q: Kann ein Mitarbeiter einen Urlaubsantrag zurückziehen?**
A: Nein, nur Admin kann Anträge ablehnen. Mitarbeiter sollte Admin kontaktieren.

**Q: Was passiert bei Ablehnung mit alternativen Daten?**
A: Admin kann alternative Zeiträume vorschlagen. Mitarbeiter sieht diese Vorschläge im Portal und muss neuen Antrag stellen.

### Gesichtserkennung

**Q: Wie sicher ist die Gesichtserkennung?**
A: Das System verwendet KI mit 90%+ Genauigkeit. Zusätzlich wird Geofencing empfohlen für erhöhte Sicherheit.

**Q: Kann jemand mit einem Foto täuschen?**
A: Nein, das System erkennt Live-Kamera-Input. Fotos werden als "kein Gesicht" erkannt.

**Q: Funktioniert es mit Brille/Bart?**
A: Ja, die KI berücksichtigt Accessoires. Bei Problemen: Gesichtsprofil neu registrieren.

---

## Glossar

**Check-in:** Arbeitsbeginn / Einstempeln  
**Check-out:** Arbeitsende / Ausstempeln  
**Geofencing:** GPS-basierte Standortprüfung  
**PIN:** 4-stelliger persönlicher Code  
**RLS:** Row Level Security (Datenbank-Sicherheit)  
**Terminal:** Zeiterfassungs-Gerät/Kiosk  
**Edge Function:** Serverlose Funktion (Backend-Logik)  
**Gesichtsprofil:** Gespeichertes Referenzbild für Gesichtserkennung  
**Admin:** Administrator mit Vollzugriff  
**Mitarbeiter-Portal:** Persönlicher Bereich für Mitarbeiter  

---

## Kontakt & Support

Bei Fragen oder Problemen:

1. **Dokumentation prüfen** (diese Datei)
2. **Admin kontaktieren** (interner Support)
3. **Technischer Support** (IT-Abteilung/Entwickler)

---

**Version:** 1.0  
**Stand:** Januar 2025  
**System:** Zeiterfassungssystem mit Lovable Cloud & Supabase
