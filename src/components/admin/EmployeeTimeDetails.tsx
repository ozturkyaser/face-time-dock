import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInMinutes, startOfMonth, endOfMonth } from "date-fns";
import { de } from "date-fns/locale";
import { ArrowLeft, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  department: string;
  position: string;
}

const EmployeeTimeDetails = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [totalMinutes, setTotalMinutes] = useState<number>(0);

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      loadEmployeeEntries();
    }
  }, [selectedEmployee, selectedMonth]);

  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("id, employee_number, first_name, last_name, department, position")
      .eq("is_active", true)
      .order("last_name");
    
    if (error) {
      console.error("Error loading employees:", error);
      return;
    }
    setEmployees(data || []);
  };

  const loadEmployeeEntries = async () => {
    if (!selectedEmployee) return;

    const monthStart = startOfMonth(new Date(selectedMonth + "-01"));
    const monthEnd = endOfMonth(new Date(selectedMonth + "-01"));

    const { data, error } = await supabase
      .from("time_entries")
      .select("*")
      .eq("employee_id", selectedEmployee.id)
      .gte("check_in", monthStart.toISOString())
      .lte("check_in", monthEnd.toISOString())
      .order("check_in", { ascending: false });
    
    if (error) {
      console.error("Error loading entries:", error);
      return;
    }

    setEntries(data || []);
    
    // Calculate total minutes
    const total = (data || []).reduce((sum, entry) => {
      if (entry.check_out) {
        const minutes = differenceInMinutes(new Date(entry.check_out), new Date(entry.check_in));
        const breakMinutes = entry.break_duration_minutes || 0;
        return sum + minutes - breakMinutes;
      }
      return sum;
    }, 0);
    
    setTotalMinutes(total);
  };

  const calculateDuration = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return "Aktiv";
    const minutes = differenceInMinutes(new Date(checkOut), new Date(checkIn));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatTotalTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Generate month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return format(date, "yyyy-MM");
  });

  if (!selectedEmployee) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Mitarbeiter Arbeitszeiten</CardTitle>
          <CardDescription>
            Wählen Sie einen Mitarbeiter aus, um dessen Arbeitszeiten anzuzeigen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {employees.map((employee) => (
              <Card
                key={employee.id}
                className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary"
                onClick={() => setSelectedEmployee(employee)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">
                    {employee.first_name} {employee.last_name}
                  </CardTitle>
                  <CardDescription>
                    {employee.employee_number}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1">
                    {employee.position && (
                      <div className="text-muted-foreground">{employee.position}</div>
                    )}
                    {employee.department && (
                      <div className="text-muted-foreground">{employee.department}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedEmployee(null)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <CardTitle>
                {selectedEmployee.first_name} {selectedEmployee.last_name}
              </CardTitle>
              <CardDescription>
                {selectedEmployee.employee_number} • {selectedEmployee.position}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((month) => (
                    <SelectItem key={month} value={month}>
                      {format(new Date(month + "-01"), "MMMM yyyy", { locale: de })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Gesamtarbeitszeit</div>
              <div className="text-3xl font-bold text-primary">
                {formatTotalTime(totalMinutes)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Einträge</div>
              <div className="text-2xl font-semibold">{entries.length}</div>
            </div>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Keine Zeiterfassungen für diesen Monat vorhanden
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Pause</TableHead>
                <TableHead>Dauer</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">
                    {format(new Date(entry.check_in), "dd.MM.yyyy", { locale: de })}
                  </TableCell>
                  <TableCell>
                    {format(new Date(entry.check_in), "HH:mm", { locale: de })}
                  </TableCell>
                  <TableCell>
                    {entry.check_out ? (
                      format(new Date(entry.check_out), "HH:mm", { locale: de })
                    ) : (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        Nicht ausgestempelt
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {entry.break_duration_minutes || 0} min
                  </TableCell>
                  <TableCell className="font-semibold">
                    {calculateDuration(entry.check_in, entry.check_out)}
                  </TableCell>
                  <TableCell>
                    {entry.check_out ? (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                        Abgeschlossen
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                        Aktiv
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default EmployeeTimeDetails;
