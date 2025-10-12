import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Clock, LogIn, LogOut, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const ManualTimeTracking = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [activeEntries, setActiveEntries] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEmployees();
    loadActiveEntries();
  }, []);

  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("id, employee_number, first_name, last_name")
      .eq("is_active", true)
      .order("employee_number");
    
    if (error) {
      console.error("Error loading employees:", error);
      return;
    }
    setEmployees(data || []);
  };

  const loadActiveEntries = async () => {
    const { data, error } = await supabase
      .from("time_entries")
      .select("*, employees!time_entries_employee_id_fkey(first_name, last_name, employee_number)")
      .is("check_out", null);
    
    if (error) {
      console.error("Error loading active entries:", error);
      return;
    }

    const entriesMap = new Map();
    data?.forEach(entry => {
      entriesMap.set(entry.employee_id, entry);
    });
    setActiveEntries(entriesMap);
  };

  const handleCheckIn = async () => {
    if (!selectedEmployeeId) {
      toast.error("Bitte Mitarbeiter auswählen");
      return;
    }

    // Check if already checked in
    if (activeEntries.has(selectedEmployeeId)) {
      toast.error("Mitarbeiter ist bereits angemeldet");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("time_entries")
        .insert({
          employee_id: selectedEmployeeId,
          check_in: new Date().toISOString(),
          notes: "Manuell vom Admin eingetragen"
        });

      if (error) throw error;

      toast.success("Mitarbeiter erfolgreich angemeldet");
      await loadActiveEntries();
    } catch (error) {
      console.error("Error checking in:", error);
      toast.error("Fehler beim Anmelden");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!selectedEmployeeId) {
      toast.error("Bitte Mitarbeiter auswählen");
      return;
    }

    const activeEntry = activeEntries.get(selectedEmployeeId);
    if (!activeEntry) {
      toast.error("Mitarbeiter ist nicht angemeldet");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("time_entries")
        .update({
          check_out: new Date().toISOString()
        })
        .eq("id", activeEntry.id);

      if (error) throw error;

      toast.success("Mitarbeiter erfolgreich abgemeldet");
      await loadActiveEntries();
    } catch (error) {
      console.error("Error checking out:", error);
      toast.error("Fehler beim Abmelden");
    } finally {
      setLoading(false);
    }
  };

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  const isCheckedIn = selectedEmployeeId ? activeEntries.has(selectedEmployeeId) : false;
  const activeEntry = selectedEmployeeId ? activeEntries.get(selectedEmployeeId) : null;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Manuelle Zeiterfassung</CardTitle>
            <CardDescription>
              Mitarbeiter manuell an- und abmelden
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Mitarbeiter auswählen</label>
          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger>
              <SelectValue placeholder="Mitarbeiter auswählen..." />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {emp.employee_number} - {emp.first_name} {emp.last_name}
                    {activeEntries.has(emp.id) && (
                      <span className="ml-2 text-xs text-success">● Angemeldet</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedEmployee && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {selectedEmployee.first_name} {selectedEmployee.last_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Nr. {selectedEmployee.employee_number}
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                isCheckedIn 
                  ? "bg-success/10 text-success" 
                  : "bg-muted text-muted-foreground"
              }`}>
                {isCheckedIn ? "Angemeldet" : "Abgemeldet"}
              </div>
            </div>

            {activeEntry && (
              <div className="text-sm text-muted-foreground">
                Angemeldet seit: {format(new Date(activeEntry.check_in), "HH:mm", { locale: de })} Uhr
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleCheckIn}
            disabled={loading || !selectedEmployeeId || isCheckedIn}
            className="flex-1 gap-2"
            variant={isCheckedIn ? "outline" : "default"}
          >
            <LogIn className="h-4 w-4" />
            Anmelden
          </Button>
          <Button
            onClick={handleCheckOut}
            disabled={loading || !selectedEmployeeId || !isCheckedIn}
            className="flex-1 gap-2"
            variant={!isCheckedIn ? "outline" : "default"}
          >
            <LogOut className="h-4 w-4" />
            Abmelden
          </Button>
        </div>

        {activeEntries.size > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">
              Aktuell angemeldete Mitarbeiter ({activeEntries.size})
            </h4>
            <div className="space-y-2">
              {Array.from(activeEntries.values()).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between text-sm p-2 rounded bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-success rounded-full animate-pulse" />
                    <span>
                      {entry.employees.first_name} {entry.employees.last_name}
                    </span>
                    <span className="text-muted-foreground">
                      ({entry.employees.employee_number})
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    seit {format(new Date(entry.check_in), "HH:mm", { locale: de })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ManualTimeTracking;