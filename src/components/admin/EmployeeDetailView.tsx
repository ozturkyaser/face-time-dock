import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInMinutes, startOfMonth, endOfMonth } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, Edit } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface EmployeeDetailViewProps {
  employeeId: string;
  employeeName: string;
}

interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  department: string;
  position: string;
  expected_daily_hours: number;
  hourly_rate: number | null;
  default_break_minutes: number;
}

const EmployeeDetailView = ({ employeeId, employeeName }: EmployeeDetailViewProps) => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [totalMinutes, setTotalMinutes] = useState<number>(0);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    check_in_date: "",
    check_in_time: "",
    check_out_date: "",
    check_out_time: "",
    break_duration_minutes: "0"
  });

  useEffect(() => {
    loadEmployee();
  }, [employeeId]);

  useEffect(() => {
    if (employee) {
      loadEmployeeEntries();
    }
  }, [employee, selectedMonth]);

  const loadEmployee = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("id, employee_number, first_name, last_name, department, position, expected_daily_hours, hourly_rate, default_break_minutes")
      .eq("id", employeeId)
      .single();
    
    if (error) {
      console.error("Error loading employee:", error);
      return;
    }
    setEmployee(data);
  };

  const loadEmployeeEntries = async () => {
    if (!employee) return;

    const monthStart = startOfMonth(new Date(selectedMonth + "-01"));
    const monthEnd = endOfMonth(new Date(selectedMonth + "-01"));

    const { data, error } = await supabase
      .from("time_entries")
      .select("*")
      .eq("employee_id", employee.id)
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

  const handleEditEntry = (entry: any) => {
    setEditingEntry(entry);
    const checkIn = new Date(entry.check_in);
    const checkOut = entry.check_out ? new Date(entry.check_out) : null;
    
    setEditFormData({
      check_in_date: format(checkIn, "yyyy-MM-dd"),
      check_in_time: format(checkIn, "HH:mm"),
      check_out_date: checkOut ? format(checkOut, "yyyy-MM-dd") : "",
      check_out_time: checkOut ? format(checkOut, "HH:mm") : "",
      break_duration_minutes: (entry.break_duration_minutes || 0).toString()
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;

    const checkInDateTime = new Date(`${editFormData.check_in_date}T${editFormData.check_in_time}`);
    const checkOutDateTime = editFormData.check_out_date && editFormData.check_out_time
      ? new Date(`${editFormData.check_out_date}T${editFormData.check_out_time}`)
      : null;

    const { error } = await supabase
      .from("time_entries")
      .update({
        check_in: checkInDateTime.toISOString(),
        check_out: checkOutDateTime?.toISOString() || null,
        break_duration_minutes: parseInt(editFormData.break_duration_minutes)
      })
      .eq("id", editingEntry.id);

    if (error) {
      toast.error("Fehler beim Aktualisieren");
      console.error(error);
      return;
    }

    toast.success("Zeiteintrag aktualisiert");
    setEditDialogOpen(false);
    setEditingEntry(null);
    loadEmployeeEntries();
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

  const calculateExpectedHours = () => {
    if (!employee) return 0;
    // Count working days in month (excluding weekends)
    const monthStart = startOfMonth(new Date(selectedMonth + "-01"));
    const monthEnd = endOfMonth(new Date(selectedMonth + "-01"));
    
    let workingDays = 0;
    const current = new Date(monthStart);
    
    while (current <= monthEnd) {
      const dayOfWeek = current.getDay();
      // 0 = Sunday, 6 = Saturday
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    const expectedDailyHours = employee.expected_daily_hours || 8;
    return workingDays * expectedDailyHours * 60; // Return in minutes
  };

  const getTimeDifference = () => {
    const expected = calculateExpectedHours();
    return totalMinutes - expected;
  };

  // Generate month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return format(date, "yyyy-MM");
  });

  if (!employee) {
    return <div>Lade Mitarbeiterdaten...</div>;
  }

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {employee.first_name} {employee.last_name}
              </CardTitle>
              <CardDescription>
                {employee.employee_number} • {employee.position}
              </CardDescription>
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
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="text-sm text-muted-foreground">Personalnummer</div>
                <div className="text-xl font-bold text-primary">
                  {employee.employee_number}
                </div>
              </div>
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="text-sm text-muted-foreground">Soll-Arbeitszeit</div>
                <div className="text-xl font-bold text-primary">
                  {formatTotalTime(calculateExpectedHours())}
                </div>
              </div>
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="text-sm text-muted-foreground">Ist-Arbeitszeit</div>
                <div className="text-xl font-bold text-primary">
                  {formatTotalTime(totalMinutes)}
                </div>
              </div>
              <div className={`p-4 rounded-lg border ${
                getTimeDifference() >= 0 
                  ? 'bg-success/5 border-success/20' 
                  : 'bg-destructive/5 border-destructive/20'
              }`}>
                <div className="text-sm text-muted-foreground">
                  {getTimeDifference() >= 0 ? 'Überstunden' : 'Fehlstunden'}
                </div>
                <div className={`text-xl font-bold ${
                  getTimeDifference() >= 0 ? 'text-success' : 'text-destructive'
                }`}>
                  {getTimeDifference() >= 0 ? '+' : ''}{formatTotalTime(Math.abs(getTimeDifference()))}
                </div>
              </div>
            </div>

            {employee.hourly_rate && (
              <div className="p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Stundenlohn</div>
                    <div className="text-2xl font-bold">
                      {new Intl.NumberFormat("de-DE", {
                        style: "currency",
                        currency: "EUR"
                      }).format(employee.hourly_rate)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Standard-Pause</div>
                    <div className="text-2xl font-bold">
                      {employee.default_break_minutes} Min
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Einträge im Monat</div>
                    <div className="text-2xl font-bold">{entries.length}</div>
                  </div>
                </div>
              </div>
            )}
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
                  <TableHead>Aktionen</TableHead>
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
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditEntry(entry)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zeiteintrag bearbeiten</DialogTitle>
            <DialogDescription>
              An- und Abmeldezeiten sowie Pausenzeit korrigieren
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="check_in_date">Check-in Datum</Label>
                <Input
                  id="check_in_date"
                  type="date"
                  value={editFormData.check_in_date}
                  onChange={(e) => setEditFormData({ ...editFormData, check_in_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="check_in_time">Check-in Uhrzeit</Label>
                <Input
                  id="check_in_time"
                  type="time"
                  value={editFormData.check_in_time}
                  onChange={(e) => setEditFormData({ ...editFormData, check_in_time: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="check_out_date">Check-out Datum</Label>
                <Input
                  id="check_out_date"
                  type="date"
                  value={editFormData.check_out_date}
                  onChange={(e) => setEditFormData({ ...editFormData, check_out_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="check_out_time">Check-out Uhrzeit</Label>
                <Input
                  id="check_out_time"
                  type="time"
                  value={editFormData.check_out_time}
                  onChange={(e) => setEditFormData({ ...editFormData, check_out_time: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="break_duration">Pausenzeit (Minuten)</Label>
              <Input
                id="break_duration"
                type="number"
                value={editFormData.break_duration_minutes}
                onChange={(e) => setEditFormData({ ...editFormData, break_duration_minutes: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleSaveEdit}>
                Speichern
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EmployeeDetailView;
