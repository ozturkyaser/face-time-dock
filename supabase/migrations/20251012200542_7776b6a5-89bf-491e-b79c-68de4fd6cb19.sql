-- Füge Standard-Pausenzeit zu Mitarbeitern hinzu
ALTER TABLE employees 
ADD COLUMN default_break_minutes INTEGER DEFAULT 45;

-- Kommentar für bessere Dokumentation
COMMENT ON COLUMN employees.default_break_minutes IS 'Standard-Pausenzeit in Minuten, die automatisch bei Zeiterfassungen verwendet wird';
