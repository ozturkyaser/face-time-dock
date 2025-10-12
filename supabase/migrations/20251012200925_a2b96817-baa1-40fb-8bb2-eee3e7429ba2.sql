-- Füge Standard-Arbeitszeit pro Tag zu Mitarbeitern hinzu
ALTER TABLE employees 
ADD COLUMN expected_daily_hours NUMERIC(4,2) DEFAULT 8.00;

-- Kommentar für bessere Dokumentation
COMMENT ON COLUMN employees.expected_daily_hours IS 'Erwartete tägliche Arbeitszeit in Stunden (ohne Pause), Standard: 8 Stunden';
