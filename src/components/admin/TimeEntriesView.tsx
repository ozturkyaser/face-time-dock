import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInMinutes, subDays, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { de } from "date-fns/locale";
import { Download, Calendar, Edit } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const TimeEntriesView = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [timeFilter, setTimeFilter] = useState<string>("month");
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
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
    loadEmployees();
  }, []);

  useEffect(() => {
    loadEntries();
  }, [timeFilter, selectedEmployee]);

  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("id, first_name, last_name, employee_number")
      .eq("is_active", true)
      .order("last_name");
    
    if (error) {
      console.error("Error loading employees:", error);
      return;
    }
    setEmployees(data || []);
  };

  const getDateRange = () => {
    const now = new Date();
    switch (timeFilter) {
      case "week":
        return {
          start: startOfWeek(now, { locale: de }),
          end: endOfWeek(now, { locale: de })
        };
      case "month":
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      case "90days":
        return {
          start: subDays(now, 90),
          end: now
        };
      case "year":
        return {
          start: startOfYear(now),
          end: endOfYear(now)
        };
      default:
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
    }
  };

  const loadEntries = async () => {
    const { start, end } = getDateRange();
    
    let query = supabase
      .from("time_entries")
      .select(`
        *,
        employees (
          employee_number,
          first_name,
          last_name,
          department,
          position,
          locations (
            name
          )
        )
      `)
      .gte("check_in", start.toISOString())
      .lte("check_in", end.toISOString())
      .order("check_in", { ascending: false });
    
    // Filter by employee if selected
    if (selectedEmployee !== "all") {
      query = query.eq("employee_id", selectedEmployee);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error("Error loading entries:", error);
      return;
    }
    setEntries(data || []);
  };

  const calculateDuration = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return "Aktiv";
    const minutes = differenceInMinutes(new Date(checkOut), new Date(checkIn));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const calculateTotalMinutes = () => {
    return entries.reduce((total, entry) => {
      if (entry.check_out) {
        const minutes = differenceInMinutes(new Date(entry.check_out), new Date(entry.check_in));
        const breakMinutes = entry.break_duration_minutes || 0;
        return total + minutes - breakMinutes;
      }
      return total;
    }, 0);
  };

  const formatTotalTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getFilterLabel = () => {
    switch (timeFilter) {
      case "week":
        return "Woche";
      case "month":
        return "Monat";
      case "90days":
        return "90-Tage";
      case "year":
        return "Jahr";
      default:
        return "Monat";
    }
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
    loadEntries();
  };

  const exportToCSV = () => {
    const csvHeaders = [
      "Mitarbeiternummer",
      "Vorname",
      "Nachname",
      "Abteilung",
      "Position",
      "Standort",
      "Check-in Datum",
      "Check-in Uhrzeit",
      "Check-out Datum",
      "Check-out Uhrzeit",
      "Dauer (Minuten)",
      "Pause (Minuten)",
      "Notizen",
      "Status"
    ].join(",");

    const csvRows = entries.map(entry => {
      const checkIn = new Date(entry.check_in);
      const checkOut = entry.check_out ? new Date(entry.check_out) : null;
      const durationMinutes = checkOut ? differenceInMinutes(checkOut, checkIn) : 0;
      const status = checkOut ? "Abgeschlossen" : "Aktiv";

      return [
        entry.employees?.employee_number || "",
        entry.employees?.first_name || "",
        entry.employees?.last_name || "",
        entry.employees?.department || "",
        entry.employees?.position || "",
        entry.employees?.locations?.name || "",
        format(checkIn, "dd.MM.yyyy", { locale: de }),
        format(checkIn, "HH:mm", { locale: de }),
        checkOut ? format(checkOut, "dd.MM.yyyy", { locale: de }) : "",
        checkOut ? format(checkOut, "HH:mm", { locale: de }) : "",
        durationMinutes.toString(),
        (entry.break_duration_minutes || 0).toString(),
        (entry.notes || "").replace(/,/g, ";"),
        status
      ].join(",");
    });

    const csv = [csvHeaders, ...csvRows].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    const filterLabel = getFilterLabel();
    link.setAttribute("href", url);
    link.setAttribute("download", `zeiterfassungen_${filterLabel}_${format(new Date(), "yyyy-MM-dd_HH-mm")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Zeiterfassungen</CardTitle>
            <CardDescription>
              Übersicht aller Check-in und Check-out Aktivitäten
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Diese Woche</SelectItem>
                  <SelectItem value="month">Dieser Monat</SelectItem>
                  <SelectItem value="90days">Letzte 90 Tage</SelectItem>
                  <SelectItem value="year">Dieses Jahr</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Alle Mitarbeiter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Mitarbeiter</SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.first_name} {employee.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={exportToCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              CSV Exportieren
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mitarbeiter</TableHead>
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
                  {entry.employees ? (
                    <>
                      {entry.employees.first_name} {entry.employees.last_name}
                      <div className="text-sm text-muted-foreground">
                        {entry.employees.employee_number}
                      </div>
                    </>
                  ) : (
                    "Unbekannt"
                  )}
                </TableCell>
                <TableCell>
                  {format(new Date(entry.check_in), "dd.MM.yyyy HH:mm", { locale: de })}
                </TableCell>
                <TableCell>
                  {entry.check_out ? (
                    format(new Date(entry.check_out), "dd.MM.yyyy HH:mm", { locale: de })
                  ) : (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      Nicht ausgestempelt
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {entry.break_duration_minutes || 0} min
                </TableCell>
                <TableCell>
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
        
        {entries.length > 0 && (
          <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Gesamtarbeitszeit (ohne Pausen)</div>
                <div className="text-2xl font-bold text-primary">
                  {formatTotalTime(calculateTotalMinutes())}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Einträge</div>
                <div className="text-xl font-semibold">{entries.length}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>

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
    </Card>
  );
};

export default TimeEntriesView;
